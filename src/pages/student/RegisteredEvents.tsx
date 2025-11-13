import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarDays, CalendarIcon, MapPin, Users, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getEventsWithRegistrationCounts } from '@/lib/api/events';

interface EventWithRegCount {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  max_capacity: number;
  image_url?: string;
  registration_count: number;
  registration_deadline?: string | null;
}

const RegisteredEvents: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allEvents, setAllEvents] = useState<EventWithRegCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const events = await getEventsWithRegistrationCounts();
        setAllEvents(events);
      } catch (err) {
        console.error('Error fetching events:', err);
        toast.error('Failed to load events');
        setAllEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Split events into upcoming and past
  const currentDate = new Date();
  const upcomingEvents = allEvents.filter(event => new Date(event.end_time || event.start_time) >= currentDate)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const pastEvents = allEvents.filter(event => new Date(event.end_time || event.start_time) < currentDate)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  // Filter events by search query
  const filterEvents = (events: EventWithRegCount[]) => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(event =>
      event.title.toLowerCase().includes(query) ||
      event.description.toLowerCase().includes(query) ||
      event.location.toLowerCase().includes(query)
    );
  };

  const filteredUpcoming = filterEvents(upcomingEvents);
  const filteredPast = filterEvents(pastEvents);

  const handleRegister = async (eventId: string) => {
    if (!user) {
      toast.error('Please login to register for events');
      navigate('/login');
      return;
    }

    if (user.role !== 'student') {
      toast.error('Only students can register for events');
      return;
    }

    // Find the event to check deadline
    const event = allEvents.find(e => e.id === eventId);
    if (event && event.registration_deadline) {
      const deadline = new Date(event.registration_deadline);
      const now = new Date();
      if (deadline < now) {
        toast.error('Registration deadline has passed. You can no longer register for this event.');
        return;
      }
    }

    // Navigate to registration form page instead of directly registering
    navigate(`/events/${eventId}/register`);
  };

  const renderEventCard = (event: EventWithRegCount) => {
    const startDate = new Date(event.start_time);
    const isFull = event.max_capacity > 0 && event.registration_count >= event.max_capacity;

    return (
      <Card key={event.id} className="overflow-hidden flex flex-col h-full">
        {/* Event Image */}
        <div className="h-48 bg-gray-200 overflow-hidden relative">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
              <CalendarIcon size={48} />
            </div>
          )}
        </div>

        <CardContent className="p-4 flex-grow flex flex-col">
          {/* Event Title */}
          <h3 className="text-xl font-bold mb-2 line-clamp-2">{event.title}</h3>

          {/* Date and Time */}
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <CalendarIcon size={16} className="mr-2" />
            <span>{format(startDate, 'MMMM do, yyyy')} at {format(startDate, 'h:mm a')}</span>
          </div>

          {/* Location */}
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <MapPin size={16} className="mr-2" />
            <span>{event.location}</span>
          </div>

          {/* Registration Count */}
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <Users size={16} className="mr-2" />
            <span>{event.registration_count} / {event.max_capacity} registered</span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 mb-4 line-clamp-2 flex-grow">{event.description}</p>

          {/* Buttons */}
          <div className="flex flex-col gap-2 mt-auto">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/events/${event.id}`)}
            >
              View Details
            </Button>
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={() => handleRegister(event.id)}
              disabled={isFull}
            >
              {isFull ? 'Full' : 'Register'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEventList = (eventList: EventWithRegCount[]) => {
    if (loading) {
      return <div className="p-8 text-center">Loading...</div>;
    }
    if (eventList.length === 0) {
      return (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <CalendarDays className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">No events found</h3>
            <p className="text-gray-500 mt-1">
              {searchQuery ? 'No events match your search.' : 'No events in this category.'}
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {eventList.map(event => renderEventCard(event))}
      </div>
    );
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Events</h1>
        <p className="text-gray-600">Browse and register for campus events</p>
      </header>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({filteredUpcoming.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({filteredPast.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4">
          {renderEventList(filteredUpcoming)}
        </TabsContent>
        <TabsContent value="past" className="mt-4">
          {renderEventList(filteredPast)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RegisteredEvents;
