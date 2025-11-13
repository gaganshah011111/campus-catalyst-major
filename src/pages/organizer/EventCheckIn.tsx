import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, UserCheck, Clock } from 'lucide-react';
import QRScanner from '@/components/QRScanner';
import { toast } from 'sonner';

interface EventStats {
  total_registrations: number;
  checked_in: number;
  pending: number;
}

const EventCheckIn: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [stats, setStats] = useState<EventStats>({
    total_registrations: 0,
    checked_in: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    loadEventAndStats();
  }, [id, user]);

  const loadEventAndStats = async () => {
    if (!id) return;

    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', parseInt(id))
        .single();

      if (eventError) {
        console.error('Error fetching event:', eventError);
        toast.error('Failed to load event');
        return;
      }

      setEvent(eventData);

      // Fetch check-in stats
      const { data: registrations, error: regError } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('event_id', parseInt(id));

      const { data: checkins, error: checkinError } = await supabase
        .from('event_checkins')
        .select('id')
        .eq('event_id', parseInt(id))
        .eq('is_checked_in', true);

      if (!regError && !checkinError) {
        const totalReg = registrations?.length || 0;
        const checkedIn = checkins?.length || 0;
        setStats({
          total_registrations: totalReg,
          checked_in: checkedIn,
          pending: totalReg - checkedIn,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="mb-4">Event not found</p>
          <Button onClick={() => navigate('/organizer/events')}>
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/organizer/events/${id}/attendees`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Event Check-In</h1>
            <p className="text-muted-foreground">{event.title}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registered</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_registrations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.checked_in}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total_registrations > 0
                ? Math.round((stats.checked_in / stats.total_registrations) * 100)
                : 0}% attendance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* QR Scanner */}
      <QRScanner />

      {/* Event Info */}
      <Card>
        <CardHeader>
          <CardTitle>Event Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Date:</span>{' '}
              {new Date(event.start_time).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Time:</span>{' '}
              {new Date(event.start_time).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div>
              <span className="font-medium">Location:</span> {event.location}
            </div>
            <div>
              <span className="font-medium">Capacity:</span> {event.max_capacity}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventCheckIn;
