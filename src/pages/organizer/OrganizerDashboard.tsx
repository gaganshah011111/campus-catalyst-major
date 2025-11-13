
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Users, Layers, ArrowRight } from 'lucide-react';
import EventCard from '@/components/EventCard';
import { supabase } from '@/lib/supabase';

const OrganizerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { events, loading } = useEvents();
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [loadingAttendees, setLoadingAttendees] = useState(true);
  
  // Organizer's events - use organizer_id instead of createdBy
  const myEvents = useMemo(() => {
    return events.filter(
      event => user && event.organizer_id === user.id
    );
  }, [events, user]);
  
  // Upcoming events created by this organizer - use start_time instead of date
  const upcomingMyEvents = useMemo(() => {
    return myEvents
      .filter(event => {
        if (!event.start_time) return false;
        return new Date(event.start_time) > new Date();
      })
      .sort((a, b) => {
        const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
        return aTime - bTime;
      });
  }, [myEvents]);
  
  // Past events created by this organizer
  const pastMyEvents = useMemo(() => {
    return myEvents
      .filter(event => {
        if (!event.start_time) return false;
        return new Date(event.start_time) < new Date();
      })
      .sort((a, b) => {
        const aTime = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bTime = b.start_time ? new Date(b.start_time).getTime() : 0;
        return bTime - aTime;
      });
  }, [myEvents]);
  
  // Fetch total attendees from database
  useEffect(() => {
    const fetchTotalAttendees = async () => {
      if (!user || myEvents.length === 0) {
        setTotalAttendees(0);
        setLoadingAttendees(false);
        return;
      }
      
      try {
        const eventIds = myEvents.map(e => e.id).filter(id => id != null);
        if (eventIds.length === 0) {
          setTotalAttendees(0);
          setLoadingAttendees(false);
          return;
        }
        
        const { count, error } = await supabase
          .from('event_registrations')
          .select('*', { count: 'exact', head: true })
          .in('event_id', eventIds)
          .in('status', ['registered', 'attended']);
        
        if (error) {
          console.error('Error fetching total attendees:', error);
          setTotalAttendees(0);
        } else {
          setTotalAttendees(count || 0);
        }
      } catch (error) {
        console.error('Error fetching total attendees:', error);
        setTotalAttendees(0);
      } finally {
        setLoadingAttendees(false);
      }
    };
    
    fetchTotalAttendees();
  }, [user, myEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Organizer Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}</p>
        </div>
        <Link to="/organizer/events/create">
          <Button>Create New Event</Button>
        </Link>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="mr-4">
                <div className="text-3xl font-bold">{myEvents.length}</div>
              </div>
              <CalendarDays size={24} className="text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="mr-4">
                <div className="text-3xl font-bold">{upcomingMyEvents.length}</div>
              </div>
              <Layers size={24} className="text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Attendees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="mr-4">
                <div className="text-3xl font-bold">
                  {loadingAttendees ? '...' : totalAttendees}
                </div>
              </div>
              <Users size={24} className="text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Upcoming Events */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upcoming Events</h2>
          <Link to="/organizer/events" className="text-primary flex items-center hover:underline text-sm">
            View all <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        
        {upcomingMyEvents.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-6">
            {upcomingMyEvents.slice(0, 3).map(event => (
              <EventCard key={event.id} event={event} showRegisterButton={false} />
            ))}
          </div>
        ) : (
          <Card className="bg-gray-50 border border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-gray-500 mb-4">You don't have any upcoming events</p>
              <Link to="/organizer/events/create">
                <Button>Create New Event</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>
      
      {/* Past Events */}
      {pastMyEvents.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Past Events</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-6">
            {pastMyEvents.slice(0, 3).map(event => (
              <EventCard key={event.id} event={event} showRegisterButton={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default OrganizerDashboard;
