import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { databaseService, Event, EventInsert, EventUpdate } from '../utils/databaseService';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Feedback {
  id: string;
  eventId: string;
  userId: string;
  rating: number;
  comment: string;
  submittedAt: string;
}

interface EventContextType {
  events: Event[];
  pendingEvents: Event[];
  feedback: Feedback[];
  loading: boolean;
  pendingLoading: boolean;
  createEvent: (event: EventInsert) => Promise<void>;
  updateEvent: (id: string, event: EventUpdate) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  approveEvent: (id: string, isApproved: boolean) => Promise<void>;
  registerForEvent: (eventId: string, userId: string, details?: {
    participant_name?: string;
    roll_number?: string;
    class?: string;
    department?: string;
    year?: string;
    remarks?: string;
  }) => Promise<boolean>;
  unregisterFromEvent: (eventId: string, userId: string) => Promise<void>;
  submitFeedback: (feedback: Omit<Feedback, 'id' | 'submittedAt'>) => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshPendingEvents: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const useEvents = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
};

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingLoading, setPendingLoading] = useState<boolean>(true);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await databaseService.getEvents(user?.role === 'admin');
      
      if (response.success) {
        setEvents(response.data);
      } else {
        console.error('Error loading events:', response.message);
        toast.error('Failed to load events: ' + response.message);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('An error occurred while loading events');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingEvents = async () => {
    if (!user || user.role !== 'admin') return;
    
    setPendingLoading(true);
    try {
      const response = await databaseService.getPendingEvents();
      
      if (response.success) {
        setPendingEvents(response.data);
      } else {
        console.error('Error loading pending events:', response.message);
      }
    } catch (error) {
      console.error('Error fetching pending events:', error);
    } finally {
      setPendingLoading(false);
    }
  };

  const fetchFeedback = async () => {
    if (!user) {
      setFeedback([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('event_feedback')
        .select('*')
        .order('submitted_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching feedback:', error);
        return;
      }
      
      // Map database feedback to our Feedback interface
      const mappedFeedback: Feedback[] = (data || []).map(item => ({
        id: item.id,
        eventId: String(item.event_id),
        userId: item.user_id,
        rating: item.rating,
        comment: item.comment || '',
        submittedAt: item.submitted_at
      }));
      
      setFeedback(mappedFeedback);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchFeedback();
    
    if (user?.role === 'admin') {
      fetchPendingEvents();
    }
  }, [user]);

  const createEvent = async (eventData: EventInsert) => {
    if (!user) return;
    
    try {
      const response = await databaseService.createEvent(eventData);
      
      if (response.success) {
        toast.success('Event created successfully');
        await fetchEvents();
      } else {
        toast.error('Failed to create event: ' + response.message);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('An error occurred while creating the event');
    }
  };

  const updateEvent = async (id: string, eventUpdate: EventUpdate) => {
    if (!user) return;
    
    try {
      const response = await databaseService.updateEvent(id, eventUpdate);
      
      if (response.success) {
        toast.success('Event updated successfully');
        await fetchEvents();
        if (user.role === 'admin') {
          await fetchPendingEvents();
        }
      } else {
        toast.error('Failed to update event: ' + response.message);
      }
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('An error occurred while updating the event');
    }
  };

  const approveEvent = async (id: string | number, isApproved: boolean): Promise<boolean> => {
    if (!user || user.role !== 'admin') {
      toast.error('Only admins can approve or reject events');
      return false;
    }
    
    try {
      console.log('EventContext: Approving/rejecting event', { id, isApproved });
      const response = await databaseService.approveEvent(id, isApproved);
      
      if (response.success) {
        toast.success(isApproved ? 'Event approved successfully' : 'Event rejected successfully');
        await fetchEvents();
        await fetchPendingEvents();
        return true;
      } else {
        console.error('Failed to approve/reject event:', response.message);
        toast.error(`Failed to ${isApproved ? 'approve' : 'reject'} event: ${response.message}`);
        return false;
      }
    } catch (error) {
      console.error('Error approving/rejecting event:', error);
      toast.error(`An error occurred while ${isApproved ? 'approving' : 'rejecting'} the event`);
      return false;
    }
  };

  const deleteEvent = async (id: string) => {
    if (!user) return;
    
    try {
      const response = await databaseService.deleteEvent(id);
      
      if (response.success) {
        toast.success('Event deleted successfully');
        await fetchEvents();
        if (user.role === 'admin') {
          await fetchPendingEvents();
        }
      } else {
        toast.error('Failed to delete event: ' + response.message);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('An error occurred while deleting the event');
    }
  };

  const registerForEvent = async (
    eventId: string,
    userId: string,
    details?: {
      participant_name?: string;
      roll_number?: string;
      class?: string;
      department?: string;
      year?: string;
      remarks?: string;
      profile_photo_url?: string;
      semester?: string;
    }
  ): Promise<boolean> => {
    try {
      const response = await databaseService.registerAttendee(eventId, userId, details);
      
      if (response.success) {
        toast.success('Successfully registered for event');
        await fetchEvents();
        return true;
      } else {
        toast.error('Registration failed: ' + response.message);
        return false;
      }
    } catch (error) {
      console.error('Error registering for event:', error);
      toast.error('An error occurred during registration');
      return false;
    }
  };

  const unregisterFromEvent = async (eventId: string, userId: string) => {
    try {
      const response = await databaseService.unregisterAttendee(eventId, userId);
      
      if (response.success) {
        toast.success('Successfully unregistered from event');
        await fetchEvents();
      } else {
        toast.error('Failed to unregister: ' + response.message);
      }
    } catch (error) {
      console.error('Error unregistering from event:', error);
      toast.error('An error occurred while unregistering');
    }
  };

  const submitFeedback = async (feedbackData: Omit<Feedback, 'id' | 'submittedAt'>) => {
    if (!user) {
      toast.error('Please login to submit feedback');
      return;
    }
    
    try {
      // Convert eventId to number (database uses number IDs)
      const eventId = typeof feedbackData.eventId === 'string' 
        ? parseInt(feedbackData.eventId, 10) 
        : feedbackData.eventId;
      
      if (isNaN(eventId)) {
        toast.error('Invalid event ID');
        return;
      }
      
      // Check if user has already submitted feedback for this event
      const { data: existingFeedback, error: checkError } = await supabase
        .from('event_feedback')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing feedback:', checkError);
        // Don't block submission if check fails, let the insert handle it
      }
      
      if (existingFeedback) {
        toast.error('You have already submitted feedback for this event');
        return;
      }
      
      // Verify user is registered for this event (for debugging)
      const { data: registration } = await supabase
        .from('event_registrations')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .in('status', ['registered', 'attended'])
        .maybeSingle();
      
      if (!registration) {
        toast.error('You must be registered or have attended this event to submit feedback.');
        return;
      }
      
      console.log('Registration found:', registration);
      
      // Insert feedback into database
      const { data, error } = await supabase
        .from('event_feedback')
        .insert({
          event_id: eventId,
          user_id: user.id,
          rating: feedbackData.rating,
          comment: feedbackData.comment || null
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error submitting feedback:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        // Check if it's an RLS policy error
        if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('permission') || error.message?.includes('new row violates row-level security')) {
          toast.error('You do not have permission to submit feedback. Please ensure you are registered or have attended this event. If you have already attended, the database policy may need to be updated.');
        } else if (error.code === '23505') {
          toast.error('You have already submitted feedback for this event.');
        } else if (error.code === '23503') {
          toast.error('Invalid event ID. The event may not exist.');
        } else {
          toast.error(`Failed to submit feedback: ${error.message || error.code || 'Unknown error'}`);
        }
        throw error; // Re-throw to let the form handle it
      }
      
      // Refresh feedback list
      await fetchFeedback();
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('An error occurred while submitting feedback');
    }
  };

  const refreshEvents = async () => {
    await fetchEvents();
  };

  const refreshPendingEvents = async () => {
    if (user?.role === 'admin') {
      await fetchPendingEvents();
    }
  };

  return (
    <EventContext.Provider value={{
      events,
      pendingEvents,
      feedback,
      loading,
      pendingLoading,
      createEvent,
      updateEvent,
      deleteEvent,
      approveEvent,
      registerForEvent,
      unregisterFromEvent,
      submitFeedback,
      refreshEvents,
      refreshPendingEvents
    }}>
      {children}
    </EventContext.Provider>
  );
};
