
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Plus, CalendarIcon, MapPin, Users, Edit, UserCheck, Award } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface Category {
  id: number;
  name: string;
}

// Event Card Component with Action Buttons
const EventCardWithActions: React.FC<{ event: any }> = ({ event }) => {
  const navigate = useNavigate();
  const [registrationCount, setRegistrationCount] = useState(0);

  useEffect(() => {
    const fetchRegCount = async () => {
      try {
        const { count } = await supabase
          .from('event_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('status', 'registered');
        setRegistrationCount(count || 0);
      } catch (err) {
        console.error('Error fetching registration count:', err);
      }
    };
    fetchRegCount();
  }, [event.id]);

  const startDate = new Date(event.start_time);

  return (
    <Card className="overflow-hidden flex flex-col h-full">
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
          <span>{registrationCount} / {event.max_capacity} registered</span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-700 mb-4 line-clamp-2 flex-grow">{event.description}</p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-auto">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/events/${event.id}/edit`)}
          >
            <Edit size={16} className="mr-2" />
            Edit Event
          </Button>
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={() => navigate(`/events/${event.id}/attendees`)}
          >
            <UserCheck size={16} className="mr-2" />
            Take Attendance
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate(`/organizer/events/${event.id}/certificates`)}
          >
            <Award size={16} className="mr-2" />
            Issue Certificates
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const OrganizerEvents: React.FC = () => {
  const { user } = useAuth();
  const { events, loading } = useEvents();
  const [categories, setCategories] = useState<Record<number, string>>({});
  
  // Load categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('event_categories')
          .select('id, name');
        
        if (error) throw error;
        
        if (data) {
          // Create a lookup object for categories
          const categoryMap: Record<number, string> = {};
          data.forEach((cat: Category) => {
            categoryMap[cat.id] = cat.name;
          });
          setCategories(categoryMap);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    fetchCategories();
  }, []);
  
  if (!user) return null;
  
  // Determine if user is admin
  const isAdmin = user.role === 'admin';
  
  // Get events created by this organizer (or all events for admin)
  const myEvents = isAdmin 
    ? events 
    : events.filter(event => event.organizer_id === user.id);
  
  // Split events into upcoming and past
  const currentDate = new Date();
  const upcomingEvents = myEvents.filter(event => new Date(event.start_time) >= currentDate)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    
  const pastEvents = myEvents.filter(event => new Date(event.start_time) < currentDate)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  
  return (
    <div>
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">My Events</h1>
          <p className="text-gray-600">Manage events you've created</p>
        </div>
        <Link to={isAdmin ? "/admin/events/create" : "/organizer/events/create"}>
          <Button>
            <Plus size={16} className="mr-1" />
            Create Event
          </Button>
        </Link>
      </header>
      
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastEvents.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-4">
          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <CalendarDays className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium">No upcoming events</h3>
                <p className="text-gray-500 mt-1 mb-4">
                  You haven't created any upcoming events yet.
                </p>
                <Link to={isAdmin ? "/admin/events/create" : "/organizer/events/create"}>
                  <Button>
                    <Plus size={16} className="mr-1" />
                    Create Your First Event
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map(event => (
                <EventCardWithActions key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="past" className="mt-4">
          {pastEvents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <CalendarDays className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium">No past events</h3>
                <p className="text-gray-500 mt-1">
                  You haven't created any past events.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastEvents.map(event => (
                <EventCardWithActions key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrganizerEvents;
