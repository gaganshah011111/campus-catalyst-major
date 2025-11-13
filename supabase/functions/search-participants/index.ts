import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        auth: { persistSession: false },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      searchText,
      department,
      eventId,
      isWinner,
      status,
      year,
      class: classFilter,
      page = 1,
      limit = 10,
      exportCsv = false
    } = await req.json();

    console.log('Search params:', { searchText, department, eventId, isWinner, status, year, classFilter, page, limit, exportCsv });

    // Get current user to check role
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile to check role
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query with joins from event_registrations to events
    let query = supabaseClient
      .from('event_registrations')
      .select(`
        id,
        participant_name,
        roll_number,
        class,
        department,
        year,
        status,
        is_winner,
        remarks,
        events:event_id (
          id,
          event_name,
          category,
          date,
          venue,
          organizer_id
        )
      `);

    // Apply role-based filtering (organizers can only see their own events' participants)
    if (profile.role === 'organizer') {
      const { data: organizerEvents } = await supabaseClient
        .from('events')
        .select('id')
        .eq('organizer_id', user.id);
      
      if (organizerEvents && organizerEvents.length > 0) {
        const eventIds = organizerEvents.map(e => e.id);
        query = query.in('event_id', eventIds);
      } else {
        // Organizer has no events, return empty result
        return new Response(JSON.stringify({
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Apply free text search with enhanced deep search
    if (searchText && searchText.trim()) {
      const searchTerm = `%${searchText.trim()}%`;
      // Create a complex OR query to search across multiple fields and joined tables
      const { data: eventSearchResults } = await supabaseClient
        .from('events')
        .select('id')
        .or(`event_name.ilike.${searchTerm},category.ilike.${searchTerm},venue.ilike.${searchTerm}`);
      
      const eventIds = eventSearchResults?.map(e => e.id) || [];
      
      // Build comprehensive search across participant fields and event IDs
      const searchConditions = [
        `participant_name.ilike.${searchTerm}`,
        `roll_number.ilike.${searchTerm}`,
        `class.ilike.${searchTerm}`,
        `department.ilike.${searchTerm}`,
        `year.ilike.${searchTerm}`,
        `remarks.ilike.${searchTerm}`
      ];
      
      if (eventIds.length > 0) {
        query = query.or(`${searchConditions.join(',')},event_id.in.(${eventIds.join(',')})`);
      } else {
        query = query.or(searchConditions.join(','));
      }
    }

    // Apply department filter
    if (department && department.trim()) {
      query = query.ilike('department', `%${department.trim()}%`);
    }

    // Apply event filter
    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    // Apply winner filter
    if (isWinner !== undefined && isWinner !== null) {
      query = query.eq('is_winner', isWinner);
    }

    // Apply status filter
    if (status && status.trim()) {
      query = query.eq('status', status.trim());
    }

    // Apply year filter
    if (year && year.trim()) {
      query = query.ilike('year', `%${year.trim()}%`);
    }

    // Apply class filter
    if (classFilter && classFilter.trim()) {
      query = query.ilike('class', `%${classFilter.trim()}%`);
    }

    // For CSV export, get all results
    if (exportCsv) {
      const { data, error } = await query.order('participant_name', { ascending: true });
      
      if (error) {
        console.error('Search error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data, total: data?.length || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For regular search, apply pagination
    const offset = (page - 1) * limit;
    
    // Get total count
    const { count } = await query.select('*', { count: 'exact', head: true });
    
    // Get paginated results
    const { data, error } = await query
      .order('participant_name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Search error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        data, 
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});