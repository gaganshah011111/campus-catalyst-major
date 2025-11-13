import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Star, MessageSquare } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface FeedbackWithUser {
  id: string;
  eventId: string;
  userId: string;
  rating: number;
  comment: string;
  submittedAt: string;
  userName?: string;
}

const OrganizerFeedback: React.FC = () => {
  const { user } = useAuth();
  const { events, feedback } = useEvents();
  const [feedbackWithUsers, setFeedbackWithUsers] = useState<FeedbackWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  if (!user) {
    return (
      <div>
        <header className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Event Feedback</h1>
          <p className="text-muted-foreground">Please log in to view feedback</p>
        </header>
      </div>
    );
  }
  
  // Safety check for events and feedback
  if (!events || !feedback) {
    return (
      <div>
        <header className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Event Feedback</h1>
          <p className="text-muted-foreground">Loading...</p>
        </header>
      </div>
    );
  }
  
  // Get organizer's events
  const organizerEvents = useMemo(() => {
    return events.filter(e => e.organizer_id === user.id);
  }, [events, user.id]);
  
  // Convert event IDs to strings for comparison
  const organizerEventIds = useMemo(() => {
    return organizerEvents.map(e => String(e.id));
  }, [organizerEvents]);
  
  // Filter feedback for organizer's events - compare as strings
  const organizerFeedback = useMemo(() => {
    return feedback.filter(f => organizerEventIds.includes(String(f.eventId)));
  }, [feedback, organizerEventIds]);
  
  // Fetch user names for feedback
  useEffect(() => {
    const fetchUserNames = async () => {
      setLoading(true);
      if (!organizerFeedback || organizerFeedback.length === 0) {
        setFeedbackWithUsers([]);
        setLoading(false);
        return;
      }
      
      try {
        const userIds = [...new Set(organizerFeedback.map(f => f.userId).filter(Boolean))];
        
        if (userIds.length === 0) {
          setFeedbackWithUsers(organizerFeedback);
          setLoading(false);
          return;
        }
        
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        
        if (error) {
          console.error('Error fetching user names:', error);
          // Set feedback without user names if fetch fails
          setFeedbackWithUsers(organizerFeedback.map(f => ({
            ...f,
            userName: 'Unknown User'
          })));
          setLoading(false);
          return;
        }
        
        const userMap = new Map(profiles?.map(p => [p.id, p.name]) || []);
        const feedbackWithNames = organizerFeedback.map(f => ({
          ...f,
          userName: userMap.get(f.userId) || 'Unknown User'
        }));
        
        setFeedbackWithUsers(feedbackWithNames);
      } catch (error) {
        console.error('Error fetching user names:', error);
        // Set feedback without user names if error occurs
        setFeedbackWithUsers(organizerFeedback.map(f => ({
          ...f,
          userName: 'Unknown User'
        })));
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserNames();
  }, [organizerFeedback]);
  
  // Sort feedback by submission date (newest first)
  const sortedFeedback = [...feedbackWithUsers].sort(
    (a, b) => {
      const dateA = new Date(a.submittedAt).getTime();
      const dateB = new Date(b.submittedAt).getTime();
      return dateB - dateA;
    }
  );
  
  // Get event title from event ID - handle both string and number IDs
  const getEventTitle = (eventId: string) => {
    const event = events.find(e => String(e.id) === String(eventId));
    return event ? event.title : 'Unknown Event';
  };
  
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            size={16}
            className={index < rating ? "text-yellow-400 fill-yellow-400" : "text-muted"}
          />
        ))}
      </div>
    );
  };
  
  // Safe date formatting
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, 'MMM d, yyyy');
      }
      // Fallback for non-ISO dates
      const fallbackDate = new Date(dateString);
      if (!isNaN(fallbackDate.getTime())) {
        return format(fallbackDate, 'MMM d, yyyy');
      }
      return 'Invalid date';
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div>
        <header className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Event Feedback</h1>
          <p className="text-muted-foreground">Review feedback submissions from your event attendees</p>
        </header>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary mb-4" />
            <p className="text-muted-foreground">Loading feedback...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Event Feedback</h1>
        <p className="text-muted-foreground">Review feedback submissions from your event attendees</p>
      </header>
      
      {sortedFeedback.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No feedback submissions yet</h3>
            <p className="text-muted-foreground mt-1">
              Feedback from your event attendees will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedFeedback.map(item => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="text-lg">{getEventTitle(item.eventId)}</CardTitle>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar size={14} />
                    <span>{formatDate(item.submittedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span className="font-medium">By:</span>
                    <span>{item.userName || 'Unknown User'}</span>
                  </div>
                  {renderStars(item.rating)}
                </div>
              </CardHeader>
              <CardContent>
                {item.comment ? (
                  <p className="text-foreground">{item.comment}</p>
                ) : (
                  <p className="text-muted-foreground italic">No comment provided</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrganizerFeedback;
