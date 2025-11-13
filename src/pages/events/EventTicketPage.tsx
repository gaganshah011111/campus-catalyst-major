
import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { Button } from '@/components/ui/button';
import EventTicket from '@/components/EventTicket';
import { getEventById } from '@/lib/api/events';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

const EventTicketPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events } = useEvents();
  
  const [event, setEvent] = React.useState<any>(null);
  const [registration, setRegistration] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    loadEventAndRegistration();
  }, [id, user]);

  const loadEventAndRegistration = async () => {
    if (!id || !user) return;

    setLoading(true);
    setError(null);

    try {
      // Convert event ID to number for database queries
      const eventIdNum = typeof id === 'string' ? parseInt(id, 10) : id;
      
      if (isNaN(eventIdNum)) {
        setError('Invalid event ID');
        setLoading(false);
        return;
      }

      // Try to get event from context first, then fetch from API if not found
      let eventData = events.find((e: any) => {
        const eId = typeof e.id === 'string' ? parseInt(e.id, 10) : e.id;
        return eId === eventIdNum;
      });

      if (!eventData) {
        // Fetch from API if not in context
        try {
          eventData = await getEventById(id);
        } catch (err) {
          console.error('Error fetching event from API:', err);
        }
      }

      if (!eventData) {
        setError('Event not found');
        setLoading(false);
        return;
      }

      setEvent(eventData);

      // Fetch registration details from Supabase
      // Try to find registration with status 'registered' first, then any status
      let regData = null;
      let regError = null;

      // First try with status 'registered'
      const { data: regData1, error: error1 } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventIdNum)
        .eq('user_id', user.id)
        .eq('status', 'registered')
        .maybeSingle();

      if (error1) {
        console.error('Error fetching registration (registered status):', error1);
      } else if (regData1) {
        regData = regData1;
      } else {
        // If not found with 'registered' status, try any status
        const { data: regData2, error: error2 } = await supabase
          .from('event_registrations')
          .select('*')
          .eq('event_id', eventIdNum)
          .eq('user_id', user.id)
          .order('registration_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error2) {
          console.error('Error fetching registration (any status):', error2);
          regError = error2;
        } else {
          regData = regData2;
        }
      }

      if (regData) {
        setRegistration(regData);
      } else {
        console.warn('No registration found for event:', eventIdNum, 'user:', user.id);
        // Don't set error here, let the component handle it
      }
    } catch (error) {
      console.error('Error loading event data:', error);
      setError('Failed to load ticket information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
              <div className="flex justify-center py-8">
                <Skeleton className="h-64 w-64 rounded-lg" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <Card>
          <CardContent className="p-6">
            <div className="text-lg mb-4 text-red-600">{error || 'Event not found'}</div>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate('/events')}>Back to Events</Button>
              <Button variant="outline" onClick={loadEventAndRegistration}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!registration) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <Card>
          <CardContent className="p-6">
            <div className="text-lg mb-4">Registration not found</div>
            <p className="text-gray-600 mb-4">
              We couldn't find your registration for this event. This might happen if you just registered. Please wait a moment and try again.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate(`/events/${id}`)}>Go to Event Page</Button>
              <Button variant="outline" onClick={loadEventAndRegistration}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="ticket-container">
      <div className="mb-6 print:hidden">
        <Link to={`/events/${id}`} className="text-primary hover:underline">
          &larr; Back to Event
        </Link>
      </div>
      
      <EventTicket
        eventId={typeof event.id === 'number' ? event.id.toString() : event.id}
        eventTitle={event.title}
        eventDate={event.start_time || event.date}
        eventLocation={event.location}
        eventDescription={event.description}
        eventEndTime={event.end_time}
        userName={user.name}
        userEmail={user.email}
        registrationId={registration.id.toString()}
        participantName={registration.participant_name || user.name}
        rollNumber={registration.roll_number}
        department={registration.department}
        year={registration.year}
        semester={registration.class}
        profilePhotoUrl={registration.profile_photo_url}
      />
    </div>
  );
};

export default EventTicketPage;
