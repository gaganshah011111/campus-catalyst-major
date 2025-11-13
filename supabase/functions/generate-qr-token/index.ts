import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create client with user's auth token for verification
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Also create a service role client for database operations that need to bypass RLS
    // Fallback to regular client if service role key is not available
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseServiceClient = serviceRoleKey 
      ? createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey)
      : supabaseClient; // Fallback to regular client if service role not available

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { event_id, registration_id } = await req.json();

    if (!event_id || !registration_id) {
      return new Response(
        JSON.stringify({ error: 'Missing event_id or registration_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile for email
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    // Verify the registration exists and belongs to the user
    const { data: registration, error: regError } = await supabaseClient
      .from('event_registrations')
      .select('*')
      .eq('id', registration_id)
      .eq('user_id', user.id)
      .eq('event_id', event_id)
      .single();

    if (regError || !registration) {
      console.error('Registration verification error:', regError);
      return new Response(
        JSON.stringify({ error: 'Invalid registration' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if QR token already exists (use service client to bypass RLS)
    const { data: existingToken, error: existingError } = await supabaseServiceClient
      .from('event_checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_id', event_id)
      .maybeSingle();

    if (existingToken) {
      console.log('Returning existing QR token');
      return new Response(
        JSON.stringify({
          qr_token: existingToken.qr_token,
          issued_at: existingToken.issued_at,
          expires_at: existingToken.expires_at,
          is_checked_in: existingToken.is_checked_in,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get event details to set expiry and include in QR code
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('title, description, location, start_time, end_time')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      console.error('Event fetch error:', eventError);
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate secure token with JWT-like structure including all user and event details
    const tokenData = {
      user_id: user.id,
      event_id: event_id,
      registration_id: registration_id,
      issued_at: new Date().toISOString(),
      exp: new Date(event.end_time).getTime(),
      // Include participant details for direct display
      participant: {
        name: registration.participant_name || profile?.email || user.email,
        email: profile?.email || user.email,
        roll_number: registration.roll_number,
        department: registration.department,
        year: registration.year,
        class: registration.class,
        profile_photo_url: registration.profile_photo_url,
      },
      // Include event details for direct display
      event: {
        id: event_id,
        title: event.title,
        description: event.description,
        location: event.location,
        start_time: event.start_time,
        end_time: event.end_time,
      },
    };

    // Create a signed token (simple version - in production use proper JWT)
    const qr_token = btoa(JSON.stringify(tokenData));

    // Set expiry to 2 hours after event end time
    const expiresAt = new Date(event.end_time);
    expiresAt.setHours(expiresAt.getHours() + 2);

    // Insert QR check-in record (use service client to bypass RLS)
    const { data: checkin, error: checkinError } = await supabaseServiceClient
      .from('event_checkins')
      .insert({
        user_id: user.id,
        event_id: event_id,
        registration_id: registration_id,
        qr_token: qr_token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (checkinError) {
      console.error('Checkin creation error:', checkinError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate QR token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('QR token generated successfully');

    return new Response(
      JSON.stringify({
        qr_token: checkin.qr_token,
        issued_at: checkin.issued_at,
        expires_at: checkin.expires_at,
        is_checked_in: checkin.is_checked_in,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-qr-token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
