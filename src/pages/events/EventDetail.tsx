import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarIcon, Clock, MapPin, Users, Tag, AlertTriangle, Ticket } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { getEventById } from '@/lib/api/events';
import { getEventCapacityInfo } from '@/lib/api/events';

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events, registerForEvent, unregisterFromEvent, deleteEvent, approveEvent, loading } = useEvents();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [fetchedEvent, setFetchedEvent] = useState<any>(null);
  const [fetching, setFetching] = useState(false);
  const [capacityInfo, setCapacityInfo] = useState<{ capacity: number; registered: number } | null>(null);
  
  // Find event in context (handle both string and number IDs)
  const eventToShow = events.find(e => String(e.id) === String(id)) || fetchedEvent;
  
  useEffect(() => {
    const fetchEventAndCapacity = async () => {
      if (!id) return;
      
      // Always try to fetch event from database to ensure we have the latest data
      setFetching(true);
      try {
        const backendEvent = await getEventById(id);
        if (backendEvent) {
          setFetchedEvent(backendEvent);
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        // Don't set to null if we have it in context
        if (!events.find(e => String(e.id) === String(id))) {
          setFetchedEvent(null);
        }
      } finally {
        setFetching(false);
      }
      
      // Always fetch capacity info
      try {
        const cap = await getEventCapacityInfo(id);
        setCapacityInfo(cap);
      } catch (err) {
        console.error('Error fetching capacity info:', err);
        setCapacityInfo(null);
      }
    };
    fetchEventAndCapacity();
  }, [id, events]);
  
  if (loading || fetching) {
    return <EventDetailSkeleton />;
  }
  
  if (!eventToShow) {
    return (
      <div className="text-center py-12">
        <div className="text-lg mb-4">Event not found</div>
        <Button onClick={() => navigate('/events')}>Back to Events</Button>
      </div>
    );
  }
  
  const isRegistered = user && Array.isArray(eventToShow.attendees) && eventToShow.attendees.includes(user.id);
  const isCreator = !!(user && (
    (eventToShow && eventToShow.createdBy === user.id) ||
    (eventToShow && eventToShow.organizer_id === user.id)
  ));
  const isAdmin = user && user.role === 'admin';
  const canManageEvent = isCreator || isAdmin;
  
  const eventDate = eventToShow.date ? parseISO(eventToShow.date) : new Date(eventToShow.start_time);
  const isPastEvent = eventDate < new Date();
  
  // Safely calculate available spots
  const maxCapacity = eventToShow.max_capacity || eventToShow.maxCapacity || 0;
  const attendees = eventToShow.attendees || [];
  const attendeesCount = Array.isArray(attendees) ? attendees.length : 0;
  const availableSpots = maxCapacity > 0 ? maxCapacity - attendeesCount : 0;
  
  const registrationCount = typeof eventToShow.registration_count === 'number'
    ? eventToShow.registration_count
    : Array.isArray(eventToShow.attendees)
      ? eventToShow.attendees.length
      : 0;
  
  const handleRegistration = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    // If not registered, navigate to registration page
    if (!isRegistered) {
      // Check registration deadline before navigating
      if (eventToShow.registration_deadline) {
        const deadline = new Date(eventToShow.registration_deadline);
        const now = new Date();
        if (deadline < now) {
          toast.error('Registration deadline has passed. You can no longer register for this event.');
          return;
        }
      }
      
      // Ensure id is converted to string for navigation
      const eventId = String(eventToShow.id);
      console.log('Navigating to registration page:', `/events/${eventId}/register`);
      navigate(`/events/${eventId}/register`, { replace: false });
      return;
    }
    // If already registered, unregister
    setIsRegistering(true);
    try {
      await unregisterFromEvent(eventToShow.id, user.id);
      // Refetch event and capacity info after registration change
      const updatedEvent = await getEventById(eventToShow.id);
      setFetchedEvent(updatedEvent);
      const cap = await getEventCapacityInfo(eventToShow.id);
      setCapacityInfo(cap);
    } catch (error) {
      toast.error('Failed to update registration.');
    } finally {
      setIsRegistering(false);
    }
  };
  
  const handleDelete = async () => {
    try {
      // Use reject behavior instead of hard delete:
      // mark as not approved so it disappears from approval list and public views
      await approveEvent(eventToShow.id, false);
      setShowDeleteDialog(false);
      if (isAdmin) {
        navigate('/admin/event-approvals', { replace: true });
      } else if (isCreator) {
        navigate('/organizer/events', { replace: true });
      } else {
        navigate('/events', { replace: true });
      }
    } catch (e) {
      // Fallback to hard delete if reject fails
      await deleteEvent(eventToShow.id);
      setShowDeleteDialog(false);
      if (isAdmin) {
        navigate('/admin/event-approvals', { replace: true });
      } else if (isCreator) {
        navigate('/organizer/events', { replace: true });
      } else {
        navigate('/events', { replace: true });
      }
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Button asChild variant="link" className="p-0 h-auto min-h-0 text-primary">
          <Link to="/events">&larr; Back to Events</Link>
        </Button>
      </div>
      
      <div className="bg-card dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm border border-border">
        {/* Event Header */}
        <div className="p-6 border-b border-border">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-2">{eventToShow.title}</h1>
              <div className="flex flex-wrap gap-1 mb-2">
                {(eventToShow.tags || []).map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    <Tag size={14} className="mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            {isPastEvent && (
              <Badge variant="outline" className="bg-muted dark:bg-gray-700">Past Event</Badge>
            )}
          </div>
        </div>
        
        {/* Event Details */}
        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h2 className="text-lg font-medium mb-3">About This Event</h2>
              <p className="text-muted-foreground whitespace-pre-line mb-6">
                {eventToShow.description}
              </p>
              
              {canManageEvent && (
                <div className="flex gap-3 mb-6">
                  <Button asChild variant="secondary">
                    <Link to={`/events/${eventToShow.id}/attendees`}>View Attendees</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={`/events/${eventToShow.id}/edit`}>Edit Event</Link>
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    Delete Event
                  </Button>
                </div>
              )}
            </div>
            
            <div>
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="bg-primary/10 p-2 rounded-md">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Date</div>
                      <div className="font-medium">
                        {format(eventDate, 'EEEE, MMMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="bg-primary/10 p-2 rounded-md">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Time</div>
                      <div className="font-medium">
                        {format(eventDate, 'h:mm a')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="bg-primary/10 p-2 rounded-md">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Location</div>
                      <div className="font-medium">
                        {eventToShow.location}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="bg-primary/10 p-2 rounded-md">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Attendance</div>
                      <div className="font-medium">
                        {capacityInfo ? `${capacityInfo.registered} / ${capacityInfo.capacity}` : `${attendeesCount} / ${maxCapacity}`} registered
                        {availableSpots <= 5 && availableSpots > 0 && (
                          <div className="text-sm text-amber-600">
                            Only {availableSpots} spot{availableSpots !== 1 ? 's' : ''} left!
                          </div>
                        )}
                        {availableSpots === 0 && (
                          <div className="text-sm text-red-600">
                            This event is full
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {!canManageEvent && !isPastEvent && !isRegistered && (
                      <Button 
                        className="w-full" 
                        variant="default"
                        disabled={availableSpots === 0 || isRegistering}
                        onClick={handleRegistration}
                      >
                        {availableSpots === 0 ? "Event Full" : "Register for Event"}
                      </Button>
                    )}
                    {!canManageEvent && !isPastEvent && isRegistered && (
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={handleRegistration}
                        disabled={isRegistering}
                      >
                        {isRegistering ? "Processing..." : "Cancel Registration"}
                      </Button>
                    )}
                    
                    {isRegistered && !isPastEvent && (
                      <Button asChild className="w-full flex items-center justify-center gap-2" variant="secondary">
                        <Link to={`/events/${eventToShow.id}/ticket`}><Ticket className="h-4 w-4" />View Ticket</Link>
                      </Button>
                    )}
                    
                    {isRegistered && isPastEvent && (
                      <Button asChild className="w-full" variant="outline">
                        <Link to={`/events/${eventToShow.id}/feedback`}>Provide Feedback</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Skeleton loading state
const EventDetailSkeleton = () => {
  return (
    <div>
      <div className="mb-6">
        <div className="w-24 h-6"><Skeleton className="h-6 w-24" /></div>
      </div>
      
      <div className="bg-card dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm border border-border">
        <div className="p-6 border-b border-border">
          <div className="flex justify-between items-start">
            <div className="w-full">
              <Skeleton className="h-8 w-3/4 mb-2" />
              <div className="flex flex-wrap gap-1 mb-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-6 w-16 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <Skeleton className="h-6 w-40 mb-3" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            
            <div>
              <Card>
                <CardContent className="p-4 space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-3">
                      <div className="flex-shrink-0">
                        <Skeleton className="h-9 w-9 rounded-md" />
                      </div>
                      <div className="w-full">
                        <Skeleton className="h-4 w-20 mb-1" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-4 pt-2">
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
