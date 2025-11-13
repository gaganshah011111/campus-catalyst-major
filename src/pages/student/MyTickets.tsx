import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Search, Ticket, Download, FileText, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface TicketData {
  id: number;
  event_id: number;
  registration_id: number;
  event: {
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    location: string;
    image_url?: string;
  };
  registration: {
    id: number;
    participant_name: string;
    profile_photo_url?: string;
    status: string;
  };
  is_checked_in: boolean;
  checked_in_at?: string;
}

const MyTickets: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // First, get all registrations for the user
      const { data: registrations, error: regError } = await supabase
        .from('event_registrations')
        .select(`
          id,
          event_id,
          participant_name,
          profile_photo_url,
          status,
          events:event_id (
            id,
            title,
            start_time,
            end_time,
            location,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'registered')
        .order('registration_time', { ascending: false });

      if (regError) throw regError;

      // Then get check-in info for each registration
      const ticketsData: TicketData[] = await Promise.all(
        (registrations || []).map(async (reg: any) => {
          // Try to get check-in info
          const { data: checkin } = await supabase
            .from('event_checkins')
            .select('is_checked_in, checked_in_at')
            .eq('registration_id', reg.id)
            .eq('user_id', user.id)
            .maybeSingle();

          return {
            id: reg.id,
            event_id: reg.event_id,
            registration_id: reg.id,
            event: reg.events,
            registration: {
              id: reg.id,
              participant_name: reg.participant_name,
              profile_photo_url: reg.profile_photo_url,
              status: reg.status,
            },
            is_checked_in: checkin?.is_checked_in || false,
            checked_in_at: checkin?.checked_in_at,
          };
        })
      );

      setTickets(ticketsData);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.event.title.toLowerCase().includes(query) ||
      ticket.event.location.toLowerCase().includes(query) ||
      ticket.registration.participant_name.toLowerCase().includes(query)
    );
  });

  const handleViewTicket = (eventId: number) => {
    navigate(`/events/${eventId}/ticket`);
  };

  if (loading) {
    return (
      <div>
        <header className="mb-6">
          <h1 className="text-2xl font-bold mb-2">My Tickets</h1>
          <p className="text-gray-600">View and download your event tickets</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">My Tickets</h1>
        <p className="text-gray-600">View and download your event tickets</p>
      </header>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search tickets by event name, location, or participant name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Ticket className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No tickets found</h3>
            <p className="text-gray-500 text-center">
              {searchQuery 
                ? 'No tickets match your search. Try a different search term.' 
                : "You don't have any tickets yet. Register for an event to get your ticket."}
            </p>
            {!searchQuery && (
              <Button 
                className="mt-4" 
                onClick={() => navigate('/events')}
              >
                Browse Events
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map((ticket) => {
            const eventDate = parseISO(ticket.event.start_time);
            const isPastEvent = eventDate < new Date();

            return (
              <Card key={ticket.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Event Image */}
                <div className="h-48 bg-gray-200 overflow-hidden relative">
                  {ticket.event.image_url ? (
                    <img
                      src={ticket.event.image_url}
                      alt={ticket.event.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                      <CalendarDays size={48} />
                    </div>
                  )}
                  {ticket.is_checked_in && (
                    <Badge className="absolute top-2 right-2 bg-green-500">
                      Checked In
                    </Badge>
                  )}
                </div>

                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">{ticket.event.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Event Date */}
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarDays size={16} className="mr-2" />
                    <span>{format(eventDate, 'MMM d, yyyy • h:mm a')}</span>
                  </div>

                  {/* Location */}
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin size={16} className="mr-2" />
                    <span className="line-clamp-1">{ticket.event.location}</span>
                  </div>

                  {/* Participant Name */}
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500">Participant: </span>
                    <span className="font-medium ml-1">{ticket.registration.participant_name}</span>
                  </div>

                  {/* Check-in Status */}
                  {ticket.is_checked_in && ticket.checked_in_at && (
                    <div className="text-xs text-green-600">
                      Checked in: {format(parseISO(ticket.checked_in_at), 'MMM d, h:mm a')}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleViewTicket(ticket.event.id)}
                    >
                      <Ticket className="mr-2 h-4 w-4" />
                      View Ticket
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleViewTicket(ticket.event.id)}
                      title="Download ticket"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyTickets;

