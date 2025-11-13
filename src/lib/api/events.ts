import { supabase } from '../supabase';
import type { Database } from '@/integrations/supabase/types';

type Event = Database['public']['Tables']['events']['Row'];
type EventRegistration = Database['public']['Tables']['event_registrations']['Row'];

// Get all approved events
export const getApprovedEvents = async (): Promise<Event[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_approved', true)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Get event by ID
export const getEventById = async (id: string | number): Promise<Event | null> => {
  // Convert string ID to number if needed (database uses number IDs)
  const eventId = typeof id === 'string' ? parseInt(id, 10) : id;
  
  if (isNaN(eventId)) {
    throw new Error('Invalid event ID');
  }
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    console.error('Error fetching event:', error);
    throw error;
  }
  return data;
};

// Get events by organizer
export const getEventsByOrganizer = async (organizerId: string): Promise<Event[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('organizer_id', organizerId)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
};

// Create a new event
export const createEvent = async (event: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> => {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Update an event
export const updateEvent = async (id: string, event: Partial<Event>): Promise<Event> => {
  const { data, error } = await supabase
    .from('events')
    .update(event)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Delete an event
export const deleteEvent = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Get event registrations
export const getEventRegistrations = async (eventId: string): Promise<EventRegistration[]> => {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('event_id', eventId);

  if (error) throw error;
  return data || [];
};

// Register for an event
export const registerForEvent = async (eventId: string, userId: string): Promise<EventRegistration> => {
  const { data, error } = await supabase
    .from('event_registrations')
    .insert({
      event_id: eventId,
      user_id: userId,
      status: 'registered'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Cancel event registration
export const cancelEventRegistration = async (eventId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('event_registrations')
    .update({ status: 'cancelled' })
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) throw error;
};

// Mark attendance for an event
export const markAttendance = async (eventId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('event_registrations')
    .update({ status: 'attended' })
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) throw error;
};

// Get user's registered events
export const getUserRegisteredEvents = async (userId: string): Promise<Event[]> => {
  // Step 1: Get all event_registrations for the user
  const { data: registrations, error } = await supabase
    .from('event_registrations')
    .select('event_id')
    .eq('user_id', userId)
    .eq('status', 'registered');

  if (error) throw error;

  const eventIds = (registrations || []).map(r => r.event_id);

  let events: Event[] = [];
  if (eventIds.length > 0) {
    // Step 2: Fetch all events with those IDs
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .in('id', eventIds);

    if (eventsError) throw eventsError;
    events = eventsData || [];
  }

  return events;
};

// Get event capacity and current registrations
export const getEventCapacityInfo = async (eventId: string): Promise<{ capacity: number; registered: number }> => {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('max_capacity')
    .eq('id', eventId)
    .single();

  if (eventError) throw eventError;

  const { count, error: countError } = await supabase
    .from('event_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'registered');

  if (countError) throw countError;

  return {
    capacity: event.max_capacity || 0,
    registered: count || 0
  };
};

// Get all events with registration counts
export const getEventsWithRegistrationCounts = async (): Promise<any[]> => {
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .eq('is_approved', true)
    .order('start_time', { ascending: true });

  if (eventsError) throw eventsError;

  // Get registration counts for all events
  if (events && events.length > 0) {
    const eventIds = events.map(e => e.id);
    const { data: registrations, error: regError } = await supabase
      .from('event_registrations')
      .select('event_id')
      .in('event_id', eventIds)
      .eq('status', 'registered');

    if (!regError && registrations) {
      // Count registrations per event (handle both string and number IDs)
      const regCounts: Record<string | number, number> = {};
      registrations.forEach(reg => {
        const eventId = reg.event_id;
        regCounts[eventId] = (regCounts[eventId] || 0) + 1;
      });

      // Add registration counts to events
      return events.map(event => ({
        ...event,
        registration_count: regCounts[event.id] || 0
      }));
    }
  }

  return events || [];
}; 