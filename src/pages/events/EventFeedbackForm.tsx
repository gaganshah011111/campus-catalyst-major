
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { supabase } from '@/lib/supabase';
import { getEventById } from '@/lib/api/events';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const EventFeedbackForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events, submitFeedback, feedback } = useEvents();
  
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch event if not found in context
  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      
      // First try to find in context (handle both string and number IDs)
      const foundEvent = events.find(e => String(e.id) === String(id));
      if (foundEvent) {
        setEvent(foundEvent);
        setLoading(false);
        return;
      }
      
      // If not found in context, fetch from database
      try {
        const eventData = await getEventById(id);
        if (eventData) {
          setEvent(eventData);
        }
      } catch (error) {
        console.error('Error fetching event:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvent();
  }, [id, events]);
  
  // Check if user is registered for this event (registered or attended status)
  useEffect(() => {
    const checkRegistration = async () => {
      if (!user || !id || !event) {
        setIsRegistered(false);
        setCheckingRegistration(false);
        return;
      }
      
      try {
        const eventId = typeof id === 'string' ? parseInt(id, 10) : id;
        if (isNaN(eventId)) {
          setIsRegistered(false);
          setCheckingRegistration(false);
          return;
        }
        
        const { data } = await supabase
          .from('event_registrations')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .in('status', ['registered', 'attended'])
          .maybeSingle();
        
        setIsRegistered(!!data);
      } catch (error) {
        console.error('Error checking registration:', error);
        setIsRegistered(false);
      } finally {
        setCheckingRegistration(false);
      }
    };
    
    checkRegistration();
  }, [user, id, event]);
  
  // Check if user has already submitted feedback
  const hasSubmittedFeedback = user && feedback.some(
    f => f.eventId === id && f.userId === user.id
  );
  
  // Show loading state
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-lg mb-4">Loading event...</div>
      </div>
    );
  }
  
  // Redirect if event not found
  if (!event) {
    return (
      <div className="text-center py-12">
        <div className="text-lg mb-4">Event not found</div>
        <Button onClick={() => navigate('/events')}>Back to Events</Button>
      </div>
    );
  }
  
  if (checkingRegistration) {
    return (
      <div className="text-center py-12">
        <div className="text-lg mb-4">Checking registration...</div>
      </div>
    );
  }
  
  if (!user || !isRegistered) {
    return (
      <div className="text-center py-12">
        <div className="text-lg mb-4">
          You must be registered for this event to provide feedback.
        </div>
        <Button onClick={() => navigate(`/events/${id}`)}>Back to Event</Button>
      </div>
    );
  }
  
  if (hasSubmittedFeedback) {
    return (
      <div className="text-center py-12">
        <div className="text-lg mb-4">
          You have already provided feedback for this event.
        </div>
        <Button onClick={() => navigate(`/events/${id}`)}>Back to Event</Button>
      </div>
    );
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await submitFeedback({
        eventId: id!,
        userId: user.id,
        rating,
        comment
      });
      
      // Only navigate if submission was successful (submitFeedback handles errors)
      // Wait a moment to show success message, then navigate to student feedback page
      setTimeout(() => {
        navigate('/student/feedback');
      }, 1000);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      // Error is already handled in submitFeedback
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Provide Feedback</h1>
      <h2 className="text-lg font-medium mb-6">Event: {event.title}</h2>
      
      <Card className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Your Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium leading-none">
                How would you rate this event? *
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={rating === value ? "default" : "outline"}
                    className="w-12 h-12"
                    onClick={() => setRating(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
              <div className="text-xs text-gray-500 flex justify-between">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="comment" className="text-sm font-medium leading-none">
                Comments (optional)
              </label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts on the event..."
                className="min-h-32"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate(`/events/${id}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default EventFeedbackForm;
