
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarDays, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export function useFirstLogin() {
  const { user, isAuthenticated } = useAuth();
  const { events } = useEvents();
  const [showFirstLoginDialog, setShowFirstLoginDialog] = useState(false);
  const [featuredEvent, setFeaturedEvent] = useState<any>(null);

  useEffect(() => {
    // Check if this is the first login
    if (isAuthenticated && user) {
      const hasSeenWelcome = localStorage.getItem(`user-${user.id}-welcomed`);
      
      if (!hasSeenWelcome) {
        // Find most recent event to feature
        const upcomingEvents = events
          .filter(event => new Date(event.date) > new Date())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (upcomingEvents.length > 0) {
          setFeaturedEvent(upcomingEvents[0]);
          setShowFirstLoginDialog(true);
          
          // Show toast notification
          toast.success('Welcome to Campus Catalyst!', {
            description: 'Check out the latest events on campus.',
            action: {
              label: 'View Events',
              onClick: () => window.location.href = '/events'
            }
          });
        }
        
        // Mark user as welcomed
        localStorage.setItem(`user-${user.id}-welcomed`, 'true');
      }
    }
  }, [isAuthenticated, user, events]);

  const FirstLoginDialog = () => (
    <Dialog open={showFirstLoginDialog} onOpenChange={setShowFirstLoginDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Bell className="h-5 w-5 text-primary mr-2" />
            Welcome to Campus Catalyst!
          </DialogTitle>
          <DialogDescription>
            We're excited to have you here. Discover and participate in campus events.
          </DialogDescription>
        </DialogHeader>
        {featuredEvent && (
          <div className="p-4 border rounded-lg bg-background/50 my-4">
            <div className="flex items-start gap-3">
              <CalendarDays className="h-10 w-10 text-primary mt-1" />
              <div>
                <h3 className="font-semibold text-lg">{featuredEvent.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(featuredEvent.date).toLocaleDateString()} at {featuredEvent.time}
                </p>
                <p className="text-sm mt-2 line-clamp-2">{featuredEvent.description}</p>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Link to={`/events/${featuredEvent.id}`}>
                <Button onClick={() => setShowFirstLoginDialog(false)}>
                  View Event
                </Button>
              </Link>
            </div>
          </div>
        )}
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={() => setShowFirstLoginDialog(false)}>
            Close
          </Button>
          <Link to="/events">
            <Button onClick={() => setShowFirstLoginDialog(false)}>
              Browse All Events
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );

  return { FirstLoginDialog };
}
