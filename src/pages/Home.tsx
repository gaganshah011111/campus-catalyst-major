import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { Button } from '@/components/ui/button';
import { ArrowRight, CalendarDays, Users, User, ScrollText, PenLine } from 'lucide-react';
import EventCard from '@/components/EventCard';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { supabase } from '@/lib/supabase';
import { Banner } from '@/types/banner';

const Home: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { events } = useEvents();
  const navigate = useNavigate();
  const [banners, setBanners] = useState<Banner[]>([]);

  // Get ALL upcoming events instead of limiting to 3
  const upcomingEvents = events
    .filter(event => {
      const start = event.start_time ? new Date(event.start_time) : null;
      return start !== null && start > new Date();
    })
    .sort((a, b) => {
      const aStart = a.start_time ? new Date(a.start_time).getTime() : 0;
      const bStart = b.start_time ? new Date(b.start_time).getTime() : 0;
      return aStart - bStart;
    });

  // Fetch banners from database
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.warn('Error fetching banners:', error);
          setBanners([]);
          return;
        }

        setBanners(data || []);
      } catch (error) {
        console.warn('Error fetching banners:', error);
        setBanners([]);
      }
    };

    fetchBanners();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Hero Section with Dynamic Carousel */}
      <section className="relative mb-16 flex justify-center items-center">
        {banners.length > 0 ? (
          <Carousel className="w-full max-w-6xl" autoPlay={true} delayMs={5000}>
            <CarouselContent>
              {banners.map((banner) => (
                <CarouselItem key={banner.id}>
                  <div 
                    className="relative h-[70vh] w-full overflow-hidden rounded-2xl flex justify-center items-center"
                  >
                    <div 
                      className="absolute inset-0 bg-cover bg-center" 
                      style={{ backgroundImage: `url(${banner.image_url})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent"></div>
                    </div>
                    <div className="absolute inset-0 flex flex-col justify-center items-center p-8 md:p-16 text-white z-10 max-w-3xl mx-auto text-center">
                      <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 text-center max-w-2xl">
                        {banner.title}
                      </h1>
                      {banner.description && (
                        <p className="text-lg md:text-xl opacity-90 mb-8 text-center max-w-2xl">
                          {banner.description}
                        </p>
                      )}
                      <div className="flex justify-center gap-4">
                        {isAuthenticated ? (
                          <>
                            {banner.event_id && (
                              <Button 
                                variant="secondary" 
                                size="lg" 
                                className="bg-white text-primary hover:bg-gray-100"
                                onClick={() => navigate(`/events/${banner.event_id}`)}
                              >
                                View Details
                              </Button>
                            )}
                            <Button 
                              variant="secondary" 
                              size="lg" 
                              className="bg-white text-primary hover:bg-gray-100"
                              onClick={() => {
                                if (user) {
                                  switch (user.role) {
                                    case 'student':
                                      navigate('/student');
                                      break;
                                    case 'organizer':
                                      navigate('/organizer');
                                      break;
                                    case 'admin':
                                      navigate('/admin');
                                      break;
                                    default:
                                      navigate('/');
                                  }
                                }
                              }}
                            >
                              Go to Dashboard
                            </Button>
                          </>
                        ) : (
                          <>
                            {banner.event_id && (
                              <Button 
                                variant="secondary" 
                                size="lg" 
                                className="bg-white text-primary hover:bg-gray-100"
                                onClick={() => navigate(`/events/${banner.event_id}`)}
                              >
                                View Details
                              </Button>
                            )}
                            <Button 
                              variant="secondary" 
                              size="lg" 
                              className="bg-white text-primary hover:bg-gray-100"
                              onClick={() => navigate('/register')}
                            >
                              Sign Up
                            </Button>
                            <Button 
                              variant="secondary" 
                              size="lg" 
                              className="bg-white text-primary hover:bg-gray-100"
                              onClick={() => navigate('/login')}
                            >
                              Log In
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="absolute bottom-4 right-4 z-20 flex gap-2">
              <CarouselPrevious className="bg-white/30 hover:bg-white/50 z-20 bottom-0 right-16 left-auto top-auto translate-y-0" />
              <CarouselNext className="bg-white/30 hover:bg-white/50 z-20 bottom-0 right-4 left-auto top-auto translate-y-0" />
            </div>
          </Carousel>
        ) : (
          <div className="w-full max-w-6xl h-[70vh] bg-gradient-to-r from-primary to-primary-foreground rounded-2xl flex items-center justify-center">
            <div className="text-center text-white p-8">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">Welcome to Advanced Campus Catalyst</h1>
              <p className="text-lg md:text-xl mb-8">Your hub for campus events and activities</p>
              <div className="flex justify-center gap-4">
                {isAuthenticated ? (
                  <Button 
                    variant="secondary" 
                    size="lg" 
                    className="bg-white text-primary hover:bg-gray-100"
                    onClick={() => {
                      if (user) {
                        switch (user.role) {
                          case 'student':
                            navigate('/student');
                            break;
                          case 'organizer':
                            navigate('/organizer');
                            break;
                          case 'admin':
                            navigate('/admin');
                            break;
                          default:
                            navigate('/');
                        }
                      }
                    }}
                  >
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="secondary" 
                      size="lg" 
                      className="bg-white text-primary hover:bg-gray-100"
                      onClick={() => navigate('/register')}
                    >
                      Sign Up
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="lg" 
                      className="bg-white text-primary hover:bg-gray-100"
                      onClick={() => navigate('/login')}
                    >
                      Log In
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
      
      {/* Quick Navigation Buttons */}
      <section className="mb-16 mx-auto text-center">
        <h2 className="text-2xl font-bold mb-8">Ignite Your Campus Life with Events That Matter!</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col items-center hover:shadow-lg transition-all transform hover:-translate-y-1 border border-border">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <CalendarDays size={32} className="text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">View Upcoming Events</h3>
            <p className="text-muted-foreground mb-4 text-center">Discover the latest events happening around campus</p>
            <Button 
              variant="outline"
              className="mt-auto"
              onClick={() => navigate('/events')}
            >
              Browse Events
            </Button>
          </div>
          
          <div className="bg-card dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col items-center hover:shadow-lg transition-all transform hover:-translate-y-1 border border-border">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <ScrollText size={32} className="text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Register for Event</h3>
            <p className="text-muted-foreground mb-4 text-center">Quick access to registration for upcoming campus events</p>
            <Button 
              variant="outline"
              className="mt-auto"
              onClick={() => isAuthenticated ? navigate('/student/registered') : navigate('/login')}
            >
              Register Now
            </Button>
          </div>
          
          <div className="bg-card dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col items-center hover:shadow-lg transition-all transform hover:-translate-y-1 border border-border">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <PenLine size={32} className="text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Organize an Event</h3>
            <p className="text-muted-foreground mb-4 text-center">Create and manage your own events on campus</p>
            <Button 
              variant="outline"
              className="mt-auto"
              onClick={() => isAuthenticated ? navigate('/organizer/events/create') : navigate('/login')}
            >
              Get Started
            </Button>
          </div>
        </div>
      </section>
      
      {/* Featured Events - Updated to show all upcoming events */}
      <section className="mb-16 mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Upcoming Events</h2>
          <Link to="/events" className="text-primary flex items-center hover:underline">
            View all events <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        
        {upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-muted dark:bg-gray-800 rounded-lg border border-border">
            <CalendarDays size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No upcoming events available</p>
          </div>
        )}
      </section>

      {/* Features with Images */}
      <section className="mb-12 mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Explore Campus Activities</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card dark:bg-gray-800 overflow-hidden rounded-xl shadow-sm border border-border transition-all hover:shadow-md hover:translate-y-[-5px]">
            <div 
              className="h-48 bg-cover bg-center" 
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1580237072617-771c3ecc4a24?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80')" }}
            ></div>
            <div className="p-6">
              <CalendarDays size={32} className="text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Athletic Events</h3>
              <p className="text-muted-foreground">
                From competitive tournaments to casual intramurals, find sports events for all skill levels.
              </p>
            </div>
          </div>
          
          <div className="bg-card dark:bg-gray-800 overflow-hidden rounded-xl shadow-sm border border-border transition-all hover:shadow-md hover:translate-y-[-5px]">
            <div 
              className="h-48 bg-cover bg-center" 
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1511795409834-ef04bbd61622?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80')" }}
            ></div>
            <div className="p-6">
              <User size={32} className="text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Workshops & Training</h3>
              <p className="text-muted-foreground">
                Enhance your skills with hands-on workshops and professional development sessions.
              </p>
            </div>
          </div>
          
          <div className="bg-card dark:bg-gray-800 overflow-hidden rounded-xl shadow-sm border border-border transition-all hover:shadow-md hover:translate-y-[-5px]">
            <div 
              className="h-48 bg-cover bg-center" 
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1492538368677-f6e0afe31dcc?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80')" }}
            ></div>
            <div className="p-6">
              <Users size={32} className="text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Cultural Celebrations</h3>
              <p className="text-muted-foreground">
                Experience diverse cultural performances, art exhibitions, and campus-wide festivals.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Process Flow */}
      <section className="py-16 bg-primary/5 rounded-3xl px-8 mb-8 mx-auto">
        <h2 className="text-3xl font-bold mb-4 text-center">How This Project Works</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          From event creation to verification - a seamless process for organizers, admins, and students
        </p>
        
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1: Organizer Creates Event */}
            <div className="relative">
              <div className="bg-card dark:bg-gray-800 p-8 rounded-xl shadow-sm hover:shadow-lg transition-all group border border-border">
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <PenLine size={32} className="text-primary" />
                  </div>
                  <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Organizer Creates Event</h3>
                  <p className="text-muted-foreground text-sm">
                    Event organizer submits event details including date, time, location, and capacity
                  </p>
                </div>
              </div>
              {/* Arrow */}
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                <ArrowRight size={32} className="text-primary/40" />
              </div>
            </div>

            {/* Step 2: Admin Approval */}
            <div className="relative">
              <div className="bg-card dark:bg-gray-800 p-8 rounded-xl shadow-sm hover:shadow-lg transition-all group border border-border">
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <User size={32} className="text-primary" />
                  </div>
                  <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Admin Approval</h3>
                  <p className="text-muted-foreground text-sm">
                    Admin reviews and approves the event to ensure quality and compliance
                  </p>
                </div>
              </div>
              {/* Arrow */}
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                <ArrowRight size={32} className="text-primary/40" />
              </div>
            </div>

            {/* Step 3: Students Register */}
            <div className="relative">
              <div className="bg-card dark:bg-gray-800 p-8 rounded-xl shadow-sm hover:shadow-lg transition-all group border border-border">
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users size={32} className="text-primary" />
                  </div>
                  <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Students Register</h3>
                  <p className="text-muted-foreground text-sm">
                    Students browse approved events and register for ones they're interested in
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 relative">
            {/* Step 4: Confirmation Email */}
            <div className="relative">
              <div className="bg-card dark:bg-gray-800 p-8 rounded-xl shadow-sm hover:shadow-lg transition-all group border border-border">
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  </div>
                  <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Confirmation Email</h3>
                  <p className="text-muted-foreground text-sm">
                    Automated email sent with registration confirmation and event details
                  </p>
                </div>
              </div>
              {/* Arrow */}
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                <ArrowRight size={32} className="text-primary/40" />
              </div>
            </div>

            {/* Step 5: QR Code Generated */}
            <div className="relative">
              <div className="bg-card dark:bg-gray-800 p-8 rounded-xl shadow-sm hover:shadow-lg transition-all group border border-border">
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
                  </div>
                  <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    5
                  </div>
                  <h3 className="text-lg font-semibold mb-2">QR Code Generated</h3>
                  <p className="text-muted-foreground text-sm">
                    Unique QR ticket generated for secure event check-in and attendance tracking
                  </p>
                </div>
              </div>
              {/* Arrow */}
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                <ArrowRight size={32} className="text-primary/40" />
              </div>
            </div>

            {/* Step 6: Organizer Scans & Verifies */}
            <div className="relative">
              <div className="bg-card dark:bg-gray-800 p-8 rounded-xl shadow-sm hover:shadow-lg transition-all group border border-border">
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
                  </div>
                  <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    6
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Organizer Scans & Verifies</h3>
                  <p className="text-muted-foreground text-sm">
                    Organizer scans QR codes at event entrance for instant verification and attendance
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-campus-500 to-campus-700 text-white mx-auto mt-16">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80')" }}
        ></div>
        <div className="relative z-10 px-8 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Join the Campus Community?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Sign up today and start exploring events that match your interests or create your own!
          </p>
          <div className="flex justify-center gap-4">
            {!isAuthenticated && (
              <Button 
                variant="secondary"
                size="lg"
                className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 shadow-lg font-semibold"
                onClick={() => navigate('/register')}
              >
                Get Started
              </Button>
            )}
            <Button 
              variant="outline" 
              size="lg" 
              className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-gray-900 font-semibold transition-colors"
              onClick={() => navigate('/events')}
            >
              Browse Events
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
