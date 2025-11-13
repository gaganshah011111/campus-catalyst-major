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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user (organizer/admin)
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

    const { qr_token } = await req.json();

    if (!qr_token) {
      return new Response(
        JSON.stringify({ error: 'Missing QR token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode the QR token
    let tokenData;
    try {
      tokenData = JSON.parse(atob(qr_token));
    } catch (e) {
      console.error('Invalid QR token format:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid QR format or signature mismatch',
          valid: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate token structure
    if (!tokenData.user_id || !tokenData.event_id || !tokenData.exp) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid QR token structure',
          valid: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token has expired
    const now = Date.now();
    if (now > tokenData.exp) {
      return new Response(
        JSON.stringify({ 
          error: 'QR code has expired',
          valid: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the check-in record
    const { data: checkin, error: checkinError } = await supabaseClient
      .from('event_checkins')
      .select(`
        *,
        events:event_id (
          id,
          title,
          start_time,
          end_time,
          organizer_id
        )
      `)
      .eq('qr_token', qr_token)
      .eq('user_id', tokenData.user_id)
      .eq('event_id', tokenData.event_id)
      .single();

    if (checkinError || !checkin) {
      console.error('Check-in record not found:', checkinError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or unregistered QR code',
          valid: false 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify organizer has permission for this event
    const eventData = checkin.events as any;
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    const isOrganizer = eventData.organizer_id === user.id;

    if (!isAdmin && !isOrganizer) {
      return new Response(
        JSON.stringify({ 
          error: 'You do not have permission to check in participants for this event',
          valid: false 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already checked in
    if (checkin.is_checked_in) {
      // Fetch participant details for display
      const { data: participant } = await supabaseClient
        .from('event_registrations')
        .select(`
          *,
          profiles:user_id (
            name,
            email
          )
        `)
        .eq('id', checkin.registration_id)
        .single();

      return new Response(
        JSON.stringify({ 
          error: 'QR already used or participant already checked in',
          valid: false,
          already_checked_in: true,
          checked_in_at: checkin.checked_in_at,
          participant: participant
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if QR has expired (24 hours before event check)
    const expiryDate = new Date(checkin.expires_at);
    if (now > expiryDate.getTime()) {
      return new Response(
        JSON.stringify({ 
          error: 'QR code has expired',
          valid: false 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch participant details
    const { data: registration, error: regError } = await supabaseClient
      .from('event_registrations')
      .select(`
        *,
        profiles:user_id (
          name,
          email
        )
      `)
      .eq('id', checkin.registration_id)
      .single();

    if (regError || !registration) {
      console.error('Registration not found:', regError);
      return new Response(
        JSON.stringify({ 
          error: 'User not registered for this event',
          valid: false 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update check-in status
    const { error: updateError } = await supabaseClient
      .from('event_checkins')
      .update({
        is_checked_in: true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id,
      })
      .eq('id', checkin.id);

    if (updateError) {
      console.error('Failed to update check-in:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to process check-in' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Check-in successful for user:', tokenData.user_id);

    // Return success with participant details
    return new Response(
      JSON.stringify({
        valid: true,
        success: true,
        message: `✅ Check-in successful for ${registration.participant_name || (registration.profiles as any)?.name}`,
        participant: {
          name: registration.participant_name || (registration.profiles as any)?.name,
          email: (registration.profiles as any)?.email,
          roll_number: registration.roll_number,
          department: registration.department,
          year: registration.year,
          class: registration.class,
          profile_photo_url: registration.profile_photo_url,
        },
        event: {
          title: eventData.title,
          start_time: eventData.start_time,
        },
        checked_in_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in validate-qr-checkin:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Network error, try again',
        valid: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
