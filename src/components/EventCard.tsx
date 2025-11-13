
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarIcon, ClockIcon, MapPinIcon, UserIcon, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils';
import { Event } from '@/utils/databaseService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface EventCardProps {
  event: Event;
  showApprovalStatus?: boolean;
  showRegisterButton?: boolean;
}

const EventCard = ({ event, showApprovalStatus = false, showRegisterButton = true }: EventCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isRegistered, setIsRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(false);
  
  // Check if user is already registered for this event
  useEffect(() => {
    const checkRegistration = async () => {
      if (!user || !event.id) {
        setIsRegistered(false);
        return;
      }
      
      setCheckingRegistration(true);
      try {
        const eventId = typeof event.id === 'string' ? parseInt(event.id, 10) : event.id;
        if (isNaN(eventId)) {
          setIsRegistered(false);
          return;
        }
        
        // Check if user has any registration (registered or attended, but not cancelled)
        const { data } = await supabase
          .from('event_registrations')
          .select('id, status')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .in('status', ['registered', 'attended'])
          .maybeSingle();
        
        setIsRegistered(!!data);
      } catch (error) {
        console.error('Error checking registration:', error);
        setIsRegistered(false);
      } finally {
        setCheckingRegistration(false);
      }
    };
    
    checkRegistration();
  }, [user, event.id]);
  
  const handleRegisterClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const eventId = String(event.id);
    console.log('Register button clicked!', { eventId, user: user?.id, role: user?.role });
    
    if (!user) {
      console.log('No user found, redirecting to login');
      navigate('/login', { replace: false });
      return;
    }
    
    if (user.role !== 'student') {
      console.log('User is not a student, role:', user.role);
      toast.error('Only students can register for events');
      return;
    }
    
    // Check registration status before navigating
    if (isRegistered) {
      toast.info('You are already registered for this event. View your ticket in "My Tickets" section.');
      navigate(`/events/${eventId}`);
      return;
    }
    
    // Check registration deadline before navigating
    if (event.registration_deadline) {
      const deadline = new Date(event.registration_deadline);
      const now = new Date();
      if (deadline < now) {
        toast.error('Registration deadline has passed. You can no longer register for this event.');
        return;
      }
    }
    
    // Navigate to registration page (form page)
    const registrationPath = `/events/${eventId}/register`;
    console.log('Navigating to registration form page:', registrationPath);
    navigate(registrationPath, { replace: false });
  };
  
  const { 
    id, 
    title, 
    description, 
    start_time, 
    end_time, 
    location, 
    attendees, 
    max_capacity, 
    tags,
    isApproved
  } = event;

  const approvalState =
    isApproved ?? (event as any).is_approved ?? (event as any).approval_status ?? null;

  // Safely parse dates
  const startDate = start_time ? new Date(start_time) : new Date();
  const endDate = end_time ? new Date(end_time) : startDate;
  const isPastEvent = startDate < new Date();
  
  // Get feedback stats (for past events)
  const averageRating = (event as any).averageRating;
  const feedbackCount = (event as any).feedbackCount || 0;
  const hasFeedback = isPastEvent && feedbackCount > 0;
  
  // Calculate capacity percentage
  const attendeeCount = attendees?.length || 0;
  const capacityPercentage = max_capacity ? Math.min(100, Math.round((attendeeCount / max_capacity) * 100)) : 0;
  
  // Determine capacity status
  let capacityStatus = 'text-green-600';
  let capacityText = 'Available';
  
  if (max_capacity && attendeeCount >= max_capacity) {
    capacityStatus = 'text-red-600';
    capacityText = 'Fully Booked';
  } else if (max_capacity && attendeeCount / max_capacity > 0.7) {
    capacityStatus = 'text-yellow-600';
    capacityText = 'Filling Up';
  }

  // Trim description for card
  const descriptionText = description || '';
  const trimmedDescription = descriptionText.length > 120 
    ? `${descriptionText.slice(0, 120)}...` 
    : descriptionText;

  return (
    <Card className="overflow-hidden flex flex-col h-full transition-transform hover:-translate-y-1 hover:shadow-md">
      <div className="relative">
        {/* Image */}
        <div className="h-48 bg-muted dark:bg-gray-700 overflow-hidden">
          {event.image_url ? (
            <img 
              src={event.image_url} 
              alt={title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted dark:bg-gray-700 text-muted-foreground">
              <CalendarIcon size={48} />
            </div>
          )}
        </div>
        
        {/* Admin approval status badge */}
        {showApprovalStatus && (
          <div className="absolute top-2 right-2">
            {approvalState === true ? (
              <Badge className="bg-green-500">Approved</Badge>
            ) : approvalState === false ? (
              <Badge className="bg-orange-500">Pending</Badge>
            ) : (
              <Badge className="bg-blue-500">Unreviewed</Badge>
            )}
          </div>
        )}
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl line-clamp-2 flex-1">{title}</CardTitle>
          {event.feedbackCount && event.feedbackCount > 0 && (
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    size={14}
                    className={
                      index < Math.round(event.averageRating || 0)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300"
                    }
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {event.averageRating?.toFixed(1)} ({event.feedbackCount})
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center text-sm text-muted-foreground space-x-1">
          <CalendarIcon size={14} />
          <span>{formatDate(startDate)}</span>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2 flex-grow">
        <CardDescription className="mb-4 line-clamp-3">
          {trimmedDescription}
        </CardDescription>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-start space-x-2">
            <ClockIcon size={14} className="mt-1 flex-shrink-0 text-muted-foreground" />
            <span>
              {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              {end_time && ` - ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
            </span>
          </div>
          
          <div className="flex items-start space-x-2">
            <MapPinIcon size={14} className="mt-1 flex-shrink-0 text-muted-foreground" />
            <span>{location}</span>
          </div>
          
          <div className="flex items-start space-x-2">
            <UserIcon size={14} className="mt-1 flex-shrink-0 text-muted-foreground" />
            <span className={capacityStatus}>
              {max_capacity ? `${attendeeCount}/${max_capacity} (${capacityText})` : 'Unlimited capacity'}
            </span>
          </div>
        </div>
        
        {tags && tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        {/* Display ratings for past events with feedback */}
        {hasFeedback && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Rating:</span>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, index) => (
                    <Star
                      key={index}
                      size={16}
                      className={
                        index < Math.round(averageRating || 0)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                      }
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">
                  {averageRating?.toFixed(1)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                ({feedbackCount} {feedbackCount === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2 flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate(`/events/${id}`);
          }}
        >
          View Details
        </Button>
        {showRegisterButton && user?.role === 'student' && !isPastEvent && (
          max_capacity && attendeeCount >= max_capacity ? (
            <Button 
              className="flex-1" 
              disabled={true}
            >
              Full
            </Button>
          ) : isRegistered ? (
            <Button 
              className="flex-1" 
              variant="secondary"
              disabled={true}
            >
              Registered
            </Button>
          ) : (
            <Button 
              className="flex-1"
              onClick={handleRegisterClick}
              type="button"
              disabled={checkingRegistration}
            >
              {checkingRegistration ? 'Checking...' : 'Register'}
            </Button>
          )
        )}
      </CardFooter>
    </Card>
  );
};

export default EventCard;
