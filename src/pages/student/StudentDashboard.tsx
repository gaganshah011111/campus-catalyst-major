
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, ClipboardList, ArrowRight, Award, Trophy } from 'lucide-react';
import EventCard from '@/components/EventCard';
import { supabase } from '@/lib/supabase';
import { getUserRegisteredEvents, getApprovedEvents } from '@/lib/api/events';

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  
  const [registeredEventsCount, setRegisteredEventsCount] = useState(0);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState(0);
  const [certificatesCount, setCertificatesCount] = useState(0);
  const [upcomingRegisteredEvents, setUpcomingRegisteredEvents] = useState<any[]>([]);
  const [pastRegisteredEvents, setPastRegisteredEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Get registered events
        const registeredEvents = await getUserRegisteredEvents(user.id);
        setRegisteredEventsCount(registeredEvents.length);
        
        // Split into upcoming and past
        const currentDate = new Date();
        const upcoming = registeredEvents.filter(event => 
          new Date(event.end_time || event.start_time) >= currentDate
        ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        
        const past = registeredEvents.filter(event => 
          new Date(event.end_time || event.start_time) < currentDate
        ).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
        
        setUpcomingRegisteredEvents(upcoming.slice(0, 3));
        setPastRegisteredEvents(past.slice(0, 3));

        // Get upcoming events count
        const allEvents = await getApprovedEvents();
        const upcomingEvents = allEvents.filter(event => 
          new Date(event.end_time || event.start_time) >= currentDate
        );
        setUpcomingEventsCount(upcomingEvents.length);

        // Get certificates count
        const { count } = await supabase
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', user.id);
        
        setCertificatesCount(count || 0);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Student Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.name}</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Registrations</CardTitle>
            <CardDescription>Events you've signed up for</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold">{loading ? '...' : registeredEventsCount}</div>
                <div className="text-sm text-gray-500">Total registrations</div>
              </div>
              <ClipboardList className="text-gray-400" size={24} />
            </div>
            <Link to="/student/registered">
              <Button variant="outline" className="w-full mt-2">View All Registrations</Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Find events to attend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold">{loading ? '...' : upcomingEventsCount}</div>
                <div className="text-sm text-gray-500">Available events</div>
              </div>
              <CalendarDays className="text-gray-400" size={24} />
            </div>
            <Link to="/events">
              <Button variant="outline" className="w-full mt-2">Browse Events</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Certificates</CardTitle>
            <CardDescription>Achievements from completed events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold">{loading ? '...' : certificatesCount}</div>
                <div className="text-sm text-gray-500">Potential certificates</div>
              </div>
              <Award className="text-gray-400" size={24} />
            </div>
            <Link to="/student/certificates">
              <Button variant="outline" className="w-full mt-2">View Certificates</Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>My Achievements</CardTitle>
            <CardDescription>Positions and achievements in events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold">{loading ? '...' : 'View'}</div>
                <div className="text-sm text-gray-500">Your achievements</div>
              </div>
              <Trophy className="text-gray-400" size={24} />
            </div>
            <Link to="/student/achievements">
              <Button variant="outline" className="w-full mt-2">View Achievements</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      {/* My Upcoming Registrations */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">My Upcoming Registrations</h2>
          <Link to="/student/registered" className="text-primary flex items-center hover:underline text-sm">
            View all <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        
        {loading ? (
          <Card className="bg-gray-50 border border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-gray-500">Loading...</p>
            </CardContent>
          </Card>
        ) : upcomingRegisteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-6">
            {upcomingRegisteredEvents.map(event => (
              <EventCard key={event.id} event={event} showRegisterButton={false} />
            ))}
          </div>
        ) : (
          <Card className="bg-gray-50 border border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-gray-500 mb-4">You haven't registered for any upcoming events</p>
              <Link to="/events">
                <Button>Browse Events</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>
      
      {/* Past Events for Feedback */}
      {!loading && pastRegisteredEvents.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Feedback Opportunities</h2>
            <Link to="/student/feedback" className="text-primary flex items-center hover:underline text-sm">
              View all <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-6">
            {pastRegisteredEvents.map(event => (
              <Card key={event.id} className="bg-gray-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{event.title}</CardTitle>
                  <CardDescription className="text-xs">
                    Attended on {new Date(event.start_time).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to={`/events/${event.id}/feedback`}>
                    <Button size="sm" variant="outline" className="w-full">
                      Provide Feedback
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default StudentDashboard;
