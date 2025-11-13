
import React from 'react';
import { useEvents } from '@/context/EventContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Star, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const AdminFeedbackModeration: React.FC = () => {
  const { events, feedback } = useEvents();
  
  // Filter to only show feedback (admins can see all via RLS)
  
  // Sort feedback by submission date (newest first)
  const sortedFeedback = [...feedback].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
  
  // Get event title from event ID
  const getEventTitle = (eventId: string) => {
    // event ids in events can be numeric; feedback.eventId is a string
    const numericId = parseInt(eventId, 10);
    const event = events.find(e => {
      const eId = typeof e.id === 'string' ? parseInt(e.id as any, 10) : (e.id as any);
      return eId === (isNaN(numericId) ? eventId : numericId);
    });
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
  
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Feedback Moderation</h1>
        <p className="text-muted-foreground">Review feedback submissions from event attendees</p>
      </header>
      
      {sortedFeedback.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No feedback submissions yet</h3>
            <p className="text-muted-foreground mt-1">
              Feedback from event attendees will appear here.
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
                    <span>{format(parseISO(item.submittedAt), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span className="font-medium">By:</span>
                    <span>{item.userName}</span>
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

export default AdminFeedbackModeration;
