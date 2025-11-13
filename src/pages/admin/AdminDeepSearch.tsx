import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import departments from '@/constants/departments';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Download, Search, Calendar, Users, Trophy, Medal, Award, Building2, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { databaseService } from '@/utils/databaseService';

interface Event {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  venue: string | null;
  organizer_id: string;
  organizer_name?: string;
  organizer_email?: string;
}

interface Participant {
  id: number;
  participant_name: string;
  roll_number: string;
  class: string;
  department: string;
  year: string;
  status: string;
  registration_time: string;
  check_in_time: string | null;
  is_winner: boolean | null;
  winner_position: number | null;
  remarks: string | null;
  events: {
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    location: string;
    venue: string | null;
  };
  profile?: {
    name: string;
    email: string;
    role: string;
  };
}

const AdminDeepSearch: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'events' | 'participants' | 'winners'>('events');
  
  // View 1: Search by Events (Event name, start date, end date, venue, organizer)
  const [eventFilters, setEventFilters] = useState({
    eventName: '',
    startDate: '',
    endDate: '',
    venue: '',
    organizerId: ''
  });
  const [eventResults, setEventResults] = useState<Participant[]>([]);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventExportLoading, setEventExportLoading] = useState(false);
  const [filteredEventsCount, setFilteredEventsCount] = useState<number>(0);
  const [selectedOrganizerInfo, setSelectedOrganizerInfo] = useState<{ name: string; totalEvents: number } | null>(null);
  const [participantDeptQuery, setParticipantDeptQuery] = useState('');

  // View 2: Search within specific event
  const [participantFilters, setParticipantFilters] = useState({
    eventId: '',
    name: '',
    rollNumber: '',
    department: '',
    class: '',
    year: ''
  });
  const [participantResults, setParticipantResults] = useState<Participant[]>([]);
  const [participantLoading, setParticipantLoading] = useState(false);
  const [participantExportLoading, setParticipantExportLoading] = useState(false);
  const [participantEventOpen, setParticipantEventOpen] = useState(false);
  
  // View 3: Search Winners
  const [winnerFilters, setWinnerFilters] = useState({
    eventId: '',
    position: 'all'
  });
  const [winnerResults, setWinnerResults] = useState<Participant[]>([]);
  const [winnerLoading, setWinnerLoading] = useState(false);
  const [winnerExportLoading, setWinnerExportLoading] = useState(false);
  const [winnerEventOpen, setWinnerEventOpen] = useState(false);
  
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [organizers, setOrganizers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [organizersQuery, setOrganizersQuery] = useState('');
  const [winnerEventQuery, setWinnerEventQuery] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  const getEventLabel = (eventId?: string | null) => {
    if (!eventId) return '';
    const numericId = parseInt(eventId, 10);
    const target = allEvents.find(event => event.id === numericId);
    if (!target) return '';
    return `${target.title}${target.organizer_name ? ` - ${target.organizer_name}` : ''}`;
  };

  // Fetch all events and organizers (admin has access to all)
  useEffect(() => {
    const fetchAllData = async () => {
      if (!user || user.role !== 'admin') {
        setInitialLoading(false);
        return;
      }

      setInitialLoading(true);
      try {
        // Fetch all events
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('id, title, start_time, end_time, location, venue, organizer_id')
          .order('start_time', { ascending: false });

        if (eventsError) throw eventsError;

        // Fetch all organizers
        const { data: organizersData, error: organizersError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('role', 'organizer')
          .eq('is_approved', true)
          .order('name');

        if (organizersError) throw organizersError;

        // Create a map of organizer IDs to organizer info
        const organizerMap = new Map(
          (organizersData || []).map(org => [org.id, org])
        );

        // Transform events with organizer info
        const transformedEvents: Event[] = (eventsData || []).map((e: any) => {
          const organizer = organizerMap.get(e.organizer_id);
          return {
            id: e.id,
            title: e.title,
            start_time: e.start_time,
            end_time: e.end_time,
            location: e.location,
            venue: e.venue,
            organizer_id: e.organizer_id,
            organizer_name: organizer?.name || 'Unknown',
            organizer_email: organizer?.email || ''
          };
        });

        setAllEvents(transformedEvents);
        setOrganizers(organizersData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load events and organizers');
        setAllEvents([]);
        setOrganizers([]);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchAllData();
  }, [user]);

  // View 1: Search by Events (across all organizers)
  const handleEventSearch = async () => {
    if (!user) return;

    setEventLoading(true);
    try {
      let filteredEvents = [...allEvents];

      // Filter by event name if provided
      if (eventFilters.eventName) {
        filteredEvents = filteredEvents.filter(e => 
          e.title.toLowerCase().includes(eventFilters.eventName.toLowerCase())
        );
      }

      // Filter by venue if provided
      if (eventFilters.venue) {
        filteredEvents = filteredEvents.filter(e => 
          (e.location?.toLowerCase().includes(eventFilters.venue.toLowerCase()) || 
           e.venue?.toLowerCase().includes(eventFilters.venue.toLowerCase()))
        );
      }

      // Filter by organizer if provided
      if (eventFilters.organizerId) {
        filteredEvents = filteredEvents.filter(e => 
          e.organizer_id === eventFilters.organizerId
        );
      }

      // Filter by date range if provided
      if (eventFilters.startDate || eventFilters.endDate) {
        filteredEvents = filteredEvents.filter(e => {
          const eventStart = new Date(e.start_time);
          const startDate = eventFilters.startDate ? new Date(eventFilters.startDate + 'T00:00:00') : null;
          const endDate = eventFilters.endDate ? new Date(eventFilters.endDate + 'T23:59:59') : null;

          if (startDate && eventStart < startDate) return false;
          if (endDate && eventStart > endDate) return false;
          return true;
        });
      }

      const eventIds = filteredEvents.map(e => e.id);
      setFilteredEventsCount(filteredEvents.length);

      // Set organizer info if organizer filter is applied
      if (eventFilters.organizerId) {
        const organizer = organizers.find(org => org.id === eventFilters.organizerId);
        // Count only events that exist in the database (query directly to ensure accuracy)
        const fetchOrganizerEventCount = async () => {
          try {
            const { count, error } = await supabase
              .from('events')
              .select('*', { count: 'exact', head: true })
              .eq('organizer_id', eventFilters.organizerId);
            
            if (error) throw error;
            
            setSelectedOrganizerInfo({
              name: organizer?.name || 'Unknown',
              totalEvents: count || 0
            });
          } catch (error) {
            console.error('Error fetching organizer event count:', error);
            // Fallback to counting from allEvents if query fails
            const totalEventsByOrganizer = allEvents.filter(e => e.organizer_id === eventFilters.organizerId).length;
            setSelectedOrganizerInfo({
              name: organizer?.name || 'Unknown',
              totalEvents: totalEventsByOrganizer
            });
          }
        };
        
        fetchOrganizerEventCount();
      } else {
        setSelectedOrganizerInfo(null);
      }

      if (eventIds.length === 0) {
        setEventResults([]);
        setFilteredEventsCount(0);
        toast.info('No events found matching the criteria');
        return;
      }

      // Search participants for these events in a single batched query
      let participants: any[] = [];
      try {
        const response = await databaseService.searchParticipants({
          eventIds: eventIds as any,
          page: 1,
          pageSize: 500
        });
        if (response.success && response.data?.items) {
          participants = response.data.items;
        }

        // Filter by date range on registration time if needed
        if (eventFilters.startDate || eventFilters.endDate) {
          const startDate = eventFilters.startDate ? new Date(eventFilters.startDate + 'T00:00:00') : null;
          const endDate = eventFilters.endDate ? new Date(eventFilters.endDate + 'T23:59:59') : null;
          
          participants = participants.filter((p: any) => {
            const regTime = new Date(p.registration_time || p.events?.start_time || 0);
            if (startDate && regTime < startDate) return false;
            if (endDate && regTime > endDate) return false;
            return true;
          });
        }

        setEventResults(participants);
        if (participants.length > 0) {
          toast.success(`Found ${participants.length} participants`);
        } else {
          toast.info('No participants found matching the criteria');
        }
      } catch (error) {
        console.error('Search error:', error);
        setEventResults([]);
        toast.error('Failed to search participants. Please try again.');
      }
    } catch (error) {
      console.error('Event search error:', error);
      toast.error('Failed to search events');
    } finally {
      setEventLoading(false);
    }
  };

  // View 2: Search within specific event
  const handleParticipantSearch = async () => {
    if (!user || !participantFilters.eventId) {
      toast.error('Please select an event');
      return;
    }

    setParticipantLoading(true);
    try {
      const filters: any = {
        eventId: parseInt(participantFilters.eventId),
        page: 1,
        pageSize: 1000
      };

      if (participantFilters.name) filters.q = participantFilters.name;
      if (participantFilters.rollNumber) filters.q = participantFilters.rollNumber;
      if (participantFilters.department) filters.department = participantFilters.department;
      if (participantFilters.class) filters.class = participantFilters.class;
      if (participantFilters.year) filters.year = participantFilters.year;

      const response = await databaseService.searchParticipants(filters);

      if (response.success && response.data) {
        let participants = response.data.items || [];

        // Apply additional filters client-side
        if (participantFilters.name) {
          participants = participants.filter((p: any) =>
            (p.participant_name || '').toLowerCase().includes(participantFilters.name.toLowerCase()) ||
            (p.profile?.name || '').toLowerCase().includes(participantFilters.name.toLowerCase())
          );
        }

        if (participantFilters.rollNumber) {
          participants = participants.filter((p: any) =>
            (p.roll_number || '').toLowerCase().includes(participantFilters.rollNumber.toLowerCase())
          );
        }

        setParticipantResults(participants);
        toast.success(`Found ${participants.length} participants`);
      } else {
        setParticipantResults([]);
        toast.error('Failed to search participants');
      }
    } catch (error) {
      console.error('Participant search error:', error);
      toast.error('Failed to search participants');
    } finally {
      setParticipantLoading(false);
    }
  };

  // View 3: Search Winners
  const handleWinnerSearch = async () => {
    if (!user || !winnerFilters.eventId) {
      toast.error('Please select an event');
      return;
    }

    setWinnerLoading(true);
    try {
      const filters: any = {
        eventId: parseInt(winnerFilters.eventId),
        page: 1,
        pageSize: 1000
      };

      const response = await databaseService.searchParticipants(filters);

      if (response.success && response.data) {
        let participants = response.data.items || [];

        if (!Array.isArray(participants)) {
          participants = [];
        }

        if (winnerFilters.position && winnerFilters.position !== 'all') {
          const position = parseInt(winnerFilters.position);
          if (!isNaN(position)) {
            participants = participants.filter((p: any) => {
              const winnerPos = p.winner_position ?? null;
              return winnerPos !== null && winnerPos === position;
            });
          }
        } else {
          participants = participants.filter((p: any) => {
            const winnerPos = p.winner_position ?? null;
            return winnerPos !== null && winnerPos !== undefined;
          });
        }

        participants.sort((a: any, b: any) => {
          const posA = a.winner_position ?? 999;
          const posB = b.winner_position ?? 999;
          return posA - posB;
        });

        setWinnerResults(participants);
        if (participants.length > 0) {
          toast.success(`Found ${participants.length} winner(s)`);
        } else {
          toast.info('No winners found for this event');
        }
      } else {
        setWinnerResults([]);
        toast.error(response.message || 'Failed to search winners');
      }
    } catch (error) {
      console.error('Winner search error:', error);
      toast.error('Failed to search winners');
      setWinnerResults([]);
    } finally {
      setWinnerLoading(false);
    }
  };

  // Export CSV functions
  const handleEventExportCSV = () => {
    if (eventResults.length === 0) {
      toast.error('No data to export');
      return;
    }

    setEventExportLoading(true);
    try {
      const headers = [
        'Event ID', 'Event Title', 'Event Start', 'Event End', 'Venue', 'Location', 'Organizer',
        'Participant Name', 'Email', 'Roll Number', 'Department', 'Class', 'Year',
        'Status', 'Registration Time', 'Check-in Time', 'Winner', 'Remarks'
      ];

      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '';
        const s = String(val);
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      };

      const rows = eventResults.map((p: any) => [
        p.events?.id || p.event_id || '',
        p.events?.title || '',
        p.events?.start_time ? format(new Date(p.events.start_time), 'yyyy-MM-dd HH:mm') : '',
        p.events?.end_time ? format(new Date(p.events.end_time), 'yyyy-MM-dd HH:mm') : '',
        p.events?.venue || '',
        p.events?.location || '',
        allEvents.find(e => e.id === p.events?.id)?.organizer_name || '',
        p.participant_name || p.profile?.name || '',
        p.profile?.email || '',
        p.roll_number || '',
        p.department || '',
        p.class || '',
        p.year || '',
        p.status || '',
        p.registration_time ? format(new Date(p.registration_time), 'yyyy-MM-dd HH:mm') : '',
        p.check_in_time ? format(new Date(p.check_in_time), 'yyyy-MM-dd HH:mm') : '',
        p.is_winner ? 'Yes' : 'No',
        p.remarks || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsv).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-event-participants-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV');
    } finally {
      setEventExportLoading(false);
    }
  };

  const handleParticipantExportCSV = () => {
    if (participantResults.length === 0) {
      toast.error('No data to export');
      return;
    }

    setParticipantExportLoading(true);
    try {
      const headers = [
        'Participant Name', 'Email', 'Roll Number', 'Department', 'Class', 'Year',
        'Status', 'Registration Time', 'Check-in Time', 'Winner', 'Remarks', 'Event Title'
      ];

      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '';
        const s = String(val);
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      };

      const rows = participantResults.map((p: any) => [
        p.participant_name || p.profile?.name || '',
        p.profile?.email || '',
        p.roll_number || '',
        p.department || '',
        p.class || '',
        p.year || '',
        p.status || '',
        p.registration_time ? format(new Date(p.registration_time), 'yyyy-MM-dd HH:mm') : '',
        p.check_in_time ? format(new Date(p.check_in_time), 'yyyy-MM-dd HH:mm') : '',
        p.is_winner ? 'Yes' : 'No',
        p.remarks || '',
        p.events?.title || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsv).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-participants-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV');
    } finally {
      setParticipantExportLoading(false);
    }
  };

  const handleWinnerExportCSV = () => {
    if (winnerResults.length === 0) {
      toast.error('No data to export');
      return;
    }

    setWinnerExportLoading(true);
    try {
      const headers = [
        'Position', 'Participant Name', 'Email', 'Roll Number', 'Department', 'Class', 'Year',
        'Status', 'Registration Time', 'Event Title', 'Organizer'
      ];

      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '';
        const s = String(val);
        if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
      };

      const rows = winnerResults.map((p: any) => [
        p.winner_position ? `${p.winner_position === 1 ? '1st' : p.winner_position === 2 ? '2nd' : '3rd'} Place` : '',
        p.participant_name || p.profile?.name || '',
        p.profile?.email || '',
        p.roll_number || '',
        p.department || '',
        p.class || '',
        p.year || '',
        p.status || '',
        p.registration_time ? format(new Date(p.registration_time), 'yyyy-MM-dd HH:mm') : '',
        p.events?.title || '',
        allEvents.find(e => e.id === p.events?.id)?.organizer_name || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsv).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-event-winners-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV');
    } finally {
      setWinnerExportLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center py-16">
          <p className="text-gray-500">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading events and organizers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Master Deep Search</h1>
        <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
          Search and manage participants across all events from all organizers
        </p>
      </div>

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'events' | 'participants' | 'winners')} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 gap-1 sm:gap-0 h-auto p-1 sm:p-1">
          <TabsTrigger value="events" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-1 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Search by Events</span>
            <span className="sm:hidden">Events</span>
          </TabsTrigger>
          <TabsTrigger value="participants" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-1 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Search in Event</span>
            <span className="sm:hidden">Participant</span>
          </TabsTrigger>
          <TabsTrigger value="winners" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-1 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
            <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Search Winners</span>
            <span className="sm:hidden">Winners</span>
          </TabsTrigger>
        </TabsList>

        {/* View 1: Search by Events */}
        <TabsContent value="events" className="space-y-4 sm:space-y-6">
          <Card className="rounded-lg">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Search by Event Name, Venue, Organizer and Date Range</span>
                <span className="sm:hidden">Event Search</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Search across all events from all organizers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Event Name</label>
                  <Input
                    placeholder="Search event name..."
                    value={eventFilters.eventName}
                    onChange={(e) => setEventFilters({ ...eventFilters, eventName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Venue</label>
                  <Input
                    placeholder="Search venue..."
                    value={eventFilters.venue}
                    onChange={(e) => setEventFilters({ ...eventFilters, venue: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organizer</label>
                  <Select
                    value={eventFilters.organizerId || 'all'}
                    onValueChange={(value) => {
                      setEventFilters({ ...eventFilters, organizerId: value === 'all' ? '' : value });
                      setOrganizersQuery('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All organizers" />
                    </SelectTrigger>
                    <SelectContent className="w-full sm:max-w-xs">
                      <div className="p-2">
                        <Input
                          placeholder="Search organizer..."
                          value={organizersQuery}
                          onChange={(e) => setOrganizersQuery(e.target.value)}
                          className="mb-2 text-sm"
                          onKeyDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="max-h-56 overflow-y-auto">
                          <SelectItem value="all">All organizers</SelectItem>
                          {organizers
                            .filter((o) => o.name.toLowerCase().includes(organizersQuery.toLowerCase()))
                            .map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))}
                        </div>
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={eventFilters.startDate}
                    onChange={(e) => setEventFilters({ ...eventFilters, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={eventFilters.endDate}
                    onChange={(e) => setEventFilters({ ...eventFilters, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2 sm:pt-0">
                <Button onClick={handleEventSearch} disabled={eventLoading} className="w-full sm:w-auto text-sm h-9 sm:h-10">
                  {eventLoading ? 'Searching...' : 'Search'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEventFilters({ eventName: '', startDate: '', endDate: '', venue: '', organizerId: '' });
                    setEventResults([]);
                    setFilteredEventsCount(0);
                    setSelectedOrganizerInfo(null);
                  }}
                  className="w-full sm:w-auto text-sm h-9 sm:h-10"
                >
                  Clear
                </Button>
                <Button
                  variant="outline"
                  onClick={handleEventExportCSV}
                  disabled={eventExportLoading || eventResults.length === 0}
                  className="w-full sm:w-auto sm:ml-auto text-sm h-9 sm:h-10"
                >
                  <Download className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{eventExportLoading ? 'Exporting...' : 'Export CSV'}</span>
                  <span className="sm:hidden">{eventExportLoading ? 'Export...' : 'Export'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Organizer Statistics Card */}
          {selectedOrganizerInfo && (
            <Card className="bg-primary/5 border-primary/20 rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Organizer Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Organizer Name</p>
                    <p className="text-base sm:text-lg font-semibold truncate">{selectedOrganizerInfo.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Total Events Created</p>
                    <p className="text-base sm:text-lg font-semibold text-primary">{selectedOrganizerInfo.totalEvents}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-muted-foreground">Events in Current Search</p>
                    <p className="text-base sm:text-lg font-semibold text-primary">{filteredEventsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {eventResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results ({eventResults.length} participants found from {filteredEventsCount} event{filteredEventsCount !== 1 ? 's' : ''})</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event Title</TableHead>
                        <TableHead>Event Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Venue</TableHead>
                        <TableHead>Organizer</TableHead>
                        <TableHead>Participant Name</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registration Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventResults.map((participant: any) => {
                        const event = allEvents.find(e => e.id === participant.events?.id);
                        return (
                          <TableRow key={participant.id}>
                            <TableCell className="font-medium">{participant.events?.title || ''}</TableCell>
                            <TableCell>
                              {participant.events?.start_time
                                ? format(new Date(participant.events.start_time), 'MMM dd, yyyy HH:mm')
                                : ''}
                            </TableCell>
                            <TableCell>
                              {participant.events?.end_time
                                ? format(new Date(participant.events.end_time), 'MMM dd, yyyy HH:mm')
                                : ''}
                            </TableCell>
                            <TableCell>{participant.events?.location || participant.events?.venue || ''}</TableCell>
                            <TableCell>{event?.organizer_name || 'Unknown'}</TableCell>
                            <TableCell>{participant.participant_name || participant.profile?.name || ''}</TableCell>
                            <TableCell>{participant.roll_number || ''}</TableCell>
                            <TableCell>{participant.department || ''}</TableCell>
                            <TableCell>{participant.class || ''}</TableCell>
                            <TableCell>{participant.year || ''}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${
                                participant.status === 'attended' ? 'bg-green-100 text-green-800' :
                                participant.status === 'registered' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {participant.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              {participant.registration_time
                                ? format(new Date(participant.registration_time), 'MMM dd, yyyy HH:mm')
                                : ''}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                  {eventResults.map((participant: any) => {
                    const event = allEvents.find(e => e.id === participant.events?.id);
                    return (
                      <div key={participant.id} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{participant.events?.title || ''}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{event?.organizer_name || 'Unknown'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs whitespace-nowrap flex-shrink-0 ${
                            participant.status === 'attended' ? 'bg-green-100 text-green-800' :
                            participant.status === 'registered' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {participant.status}
                          </span>
                        </div>

                        <div className="text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2 space-y-1">
                          <div><span className="font-medium">Event Date:</span> {participant.events?.start_time ? format(new Date(participant.events.start_time), 'MMM dd, yyyy HH:mm') : ''}</div>
                          <div><span className="font-medium">Venue:</span> {participant.events?.location || participant.events?.venue || ''}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Name:</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{participant.participant_name || participant.profile?.name || ''}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Roll:</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{participant.roll_number || ''}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Dept:</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{participant.department || ''}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Year:</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{participant.year || ''}</p>
                          </div>
                        </div>

                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Registered:</span> {participant.registration_time ? format(new Date(participant.registration_time), 'MMM dd, yyyy HH:mm') : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* View 2: Search within specific event */}
        <TabsContent value="participants" className="space-y-4 sm:space-y-6">
          <Card className="rounded-lg">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Search Participants in Specific Event</span>
                <span className="sm:hidden">Participant Search</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Search participants across any event from any organizer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Select Event *</label>
                  <Popover open={participantEventOpen} onOpenChange={setParticipantEventOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={participantEventOpen}
                        className={cn(
                          "w-full justify-between text-sm h-9 sm:h-10",
                          !participantFilters.eventId && "text-muted-foreground"
                        )}
                      >
                        <span className="truncate">{participantFilters.eventId
                          ? getEventLabel(participantFilters.eventId)
                          : "Select an event..."}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] sm:w-[320px] p-0">
                      <Command>
                        <CommandInput placeholder="Search event..." />
                        <CommandList>
                          <CommandEmpty>No event found.</CommandEmpty>
                          <CommandGroup>
                            {allEvents.map((event) => (
                              <CommandItem
                                key={event.id}
                                value={`${event.title} ${event.organizer_name ?? ''}`}
                                onSelect={() => {
                                  setParticipantFilters((prev) => ({
                                    ...prev,
                                    eventId: event.id.toString(),
                                  }));
                                  setParticipantEventOpen(false);
                                }}
                              >
                                <span className="truncate">{event.title}</span>
                                {event.organizer_name && (
                                  <span className="ml-2 text-xs text-muted-foreground truncate">
                                    {event.organizer_name}
                                  </span>
                                )}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4 flex-shrink-0",
                                    participantFilters.eventId === event.id.toString()
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Name</label>
                  <Input
                    placeholder="Search by name..."
                    value={participantFilters.name}
                    onChange={(e) => setParticipantFilters({ ...participantFilters, name: e.target.value })}
                    className="text-sm h-9 sm:h-10"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Roll Number</label>
                  <Input
                    placeholder="Search by roll number..."
                    value={participantFilters.rollNumber}
                    onChange={(e) => setParticipantFilters({ ...participantFilters, rollNumber: e.target.value })}
                    className="text-sm h-9 sm:h-10"
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Department</label>
                  <Select
                    value={participantFilters.department || undefined}
                    onValueChange={(value) => {
                      setParticipantFilters({ ...participantFilters, department: value || '' });
                      setParticipantDeptQuery('');
                    }}
                  >
                    <SelectTrigger className="text-sm h-9 sm:h-10 w-full">
                      <SelectValue placeholder="Select department..." />
                    </SelectTrigger>
                    <SelectContent className="w-full sm:max-w-xs">
                      <div className="p-2">
                        <Input
                          placeholder="Search department..."
                          value={participantDeptQuery}
                          onChange={(e) => setParticipantDeptQuery(e.target.value)}
                          className="mb-2 text-xs"
                          onKeyDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="max-h-56 overflow-y-auto">
                          {departments
                            .filter((d) => d.toLowerCase().includes((participantDeptQuery || '').toLowerCase()))
                            .map((d) => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                          ))}
                        </div>
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Class</label>
                  <Input
                    placeholder="Search by class..."
                    value={participantFilters.class}
                    className="text-sm h-9 sm:h-10"
                    onChange={(e) => setParticipantFilters({ ...participantFilters, class: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Year</label>
                  <Input
                    placeholder="Search by year..."
                    value={participantFilters.year}
                    onChange={(e) => setParticipantFilters({ ...participantFilters, year: e.target.value })}
                    className="text-sm h-9 sm:h-10"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2 sm:pt-0">
                <Button onClick={handleParticipantSearch} disabled={participantLoading || !participantFilters.eventId} className="w-full sm:w-auto text-sm h-9 sm:h-10">
                  {participantLoading ? 'Searching...' : 'Search'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setParticipantFilters({
                      eventId: '',
                      name: '',
                      rollNumber: '',
                      department: '',
                      class: '',
                      year: ''
                    });
                    setParticipantResults([]);
                  }}
                  className="w-full sm:w-auto text-sm h-9 sm:h-10"
                >
                  Clear
                </Button>
                <Button
                  variant="outline"
                  onClick={handleParticipantExportCSV}
                  disabled={participantExportLoading || participantResults.length === 0}
                  className="w-full sm:w-auto sm:ml-auto text-sm h-9 sm:h-10"
                >
                  <Download className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{participantExportLoading ? 'Exporting...' : 'Export CSV'}</span>
                  <span className="sm:hidden">{participantExportLoading ? 'Export...' : 'Export'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {participantResults.length > 0 && (
            <Card className="rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Search Results ({participantResults.length} participants found)</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participant Name</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registration Time</TableHead>
                        <TableHead>Check-in Time</TableHead>
                        <TableHead>Winner</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participantResults.map((participant: any) => (
                        <TableRow key={participant.id}>
                          <TableCell className="font-medium">
                            {participant.participant_name || participant.profile?.name || ''}
                          </TableCell>
                          <TableCell>{participant.roll_number || ''}</TableCell>
                          <TableCell>{participant.department || ''}</TableCell>
                          <TableCell>{participant.class || ''}</TableCell>
                          <TableCell>{participant.year || ''}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${
                              participant.status === 'attended' ? 'bg-green-100 text-green-800' :
                              participant.status === 'registered' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {participant.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {participant.registration_time
                              ? format(new Date(participant.registration_time), 'MMM dd, yyyy HH:mm')
                              : ''}
                          </TableCell>
                          <TableCell>
                            {participant.check_in_time
                              ? format(new Date(participant.check_in_time), 'MMM dd, yyyy HH:mm')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {participant.is_winner ? (
                              <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Yes</span>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                  {participantResults.map((participant: any) => (
                    <div key={participant.id} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {participant.participant_name || participant.profile?.name || ''}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{participant.roll_number || ''}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs whitespace-nowrap flex-shrink-0 ${
                          participant.status === 'attended' ? 'bg-green-100 text-green-800' :
                          participant.status === 'registered' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {participant.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Department:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{participant.department || ''}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Class:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{participant.class || ''}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Year:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{participant.year || ''}</p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Winner:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {participant.is_winner ? 'Yes' : 'No'}
                          </p>
                        </div>
                      </div>

                      <div className="text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2 space-y-1">
                        <div>
                          <span className="font-medium">Registered:</span> {participant.registration_time ? format(new Date(participant.registration_time), 'MMM dd, yyyy HH:mm') : ''}
                        </div>
                        <div>
                          <span className="font-medium">Check-in:</span> {participant.check_in_time ? format(new Date(participant.check_in_time), 'MMM dd, yyyy HH:mm') : '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* View 3: Search Winners */}
        <TabsContent value="winners" className="space-y-4 sm:space-y-6">
          <Card className="rounded-lg">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Search Event Winners</span>
                <span className="sm:hidden">Winners</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Search for winners (1st, 2nd, 3rd place) across any event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                <Button
                  variant={winnerFilters.position === '1' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWinnerFilters({ ...winnerFilters, position: winnerFilters.position === '1' ? 'all' : '1' })}
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                >
                  <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                  <span className="hidden sm:inline">1st Place</span>
                  <span className="sm:hidden">1st</span>
                </Button>
                <Button
                  variant={winnerFilters.position === '2' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWinnerFilters({ ...winnerFilters, position: winnerFilters.position === '2' ? 'all' : '2' })}
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                >
                  <Medal className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <span className="hidden sm:inline">2nd Place</span>
                  <span className="sm:hidden">2nd</span>
                </Button>
                <Button
                  variant={winnerFilters.position === '3' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWinnerFilters({ ...winnerFilters, position: winnerFilters.position === '3' ? 'all' : '3' })}
                  className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                >
                  <Award className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                  <span className="hidden sm:inline">3rd Place</span>
                  <span className="sm:hidden">3rd</span>
                </Button>
                <Button
                  variant={winnerFilters.position === 'all' || !winnerFilters.position ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWinnerFilters({ ...winnerFilters, position: 'all' })}
                  className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                >
                  All Winners
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Select Event *</label>
                  <Select
                    value={winnerFilters.eventId || undefined}
                    onValueChange={(value) => {
                      setWinnerFilters({ ...winnerFilters, eventId: value });
                      setWinnerEventQuery('');
                    }}
                  >
                    <SelectTrigger className="text-sm h-9 sm:h-10 w-full">
                      <SelectValue placeholder="Select an event..." />
                    </SelectTrigger>
                    <SelectContent className="w-full sm:max-w-md">
                      <div className="p-2">
                        <Input
                          placeholder="Search event..."
                          value={winnerEventQuery}
                          onChange={(e) => setWinnerEventQuery(e.target.value)}
                          className="mb-2 text-sm"
                          onKeyDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="max-h-64 overflow-y-auto">
                          {allEvents.length > 0 ? (
                            allEvents
                              .filter(ev => ev.title.toLowerCase().includes(winnerEventQuery.toLowerCase()) || (ev.organizer_name || '').toLowerCase().includes(winnerEventQuery.toLowerCase()))
                              .map((event) => (
                                <SelectItem key={event.id} value={event.id.toString()}>
                                  <span className="truncate">{event.title}</span>
                                  {event.organizer_name && (
                                    <span className="text-xs text-muted-foreground ml-1">- {event.organizer_name}</span>
                                  )}
                                </SelectItem>
                              ))
                          ) : (
                            <SelectItem value="no-events" disabled>No events available</SelectItem>
                          )}
                        </div>
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Winner Position</label>
                  <Select
                    value={winnerFilters.position || undefined}
                    onValueChange={(value) => setWinnerFilters({ ...winnerFilters, position: value || '' })}
                  >
                    <SelectTrigger className="text-sm h-9 sm:h-10">
                      <SelectValue placeholder="All positions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Winners (1st, 2nd, 3rd)</SelectItem>
                      <SelectItem value="1">1st Place</SelectItem>
                      <SelectItem value="2">2nd Place</SelectItem>
                      <SelectItem value="3">3rd Place</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2 sm:pt-0">
                <Button onClick={handleWinnerSearch} disabled={winnerLoading || !winnerFilters.eventId} className="w-full sm:w-auto text-sm h-9 sm:h-10">
                  {winnerLoading ? 'Searching...' : 'Search Winners'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setWinnerFilters({
                      eventId: '',
                      position: 'all'
                    });
                    setWinnerResults([]);
                  }}
                  className="w-full sm:w-auto text-sm h-9 sm:h-10"
                >
                  Clear
                </Button>
                <Button
                  variant="outline"
                  onClick={handleWinnerExportCSV}
                  disabled={winnerExportLoading || winnerResults.length === 0}
                  className="w-full sm:w-auto sm:ml-auto text-sm h-9 sm:h-10"
                >
                  <Download className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{winnerExportLoading ? 'Exporting...' : 'Export CSV'}</span>
                  <span className="sm:hidden">{winnerExportLoading ? 'Export...' : 'Export'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {!winnerLoading && winnerResults.length > 0 && (
            <Card className="rounded-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Winner Results ({winnerResults.length} winner(s) found)</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Position</TableHead>
                        <TableHead>Participant Name</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registration Time</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Organizer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {winnerResults.map((participant: any) => {
                        if (!participant || !participant.id) return null;
                        const event = allEvents.find(e => e.id === participant.events?.id);
                        const winnerPos = participant.winner_position ?? null;
                        return (
                          <TableRow key={participant.id}>
                            <TableCell>
                              {winnerPos ? (
                                <span className={`px-3 py-1 rounded text-sm font-bold ${
                                  winnerPos === 1 ? 'bg-yellow-500 text-white' :
                                  winnerPos === 2 ? 'bg-gray-400 text-white' :
                                  'bg-orange-600 text-white'
                                }`}>
                                  {winnerPos === 1 ? '🥇 1st Place' :
                                   winnerPos === 2 ? '🥈 2nd Place' :
                                   '🥉 3rd Place'}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {participant.participant_name || participant.profile?.name || ''}
                            </TableCell>
                            <TableCell>{participant.roll_number || ''}</TableCell>
                            <TableCell>{participant.department || ''}</TableCell>
                            <TableCell>{participant.class || ''}</TableCell>
                            <TableCell>{participant.year || ''}</TableCell>
                            <TableCell>{participant.profile?.email || ''}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${
                                participant.status === 'attended' ? 'bg-green-100 text-green-800' :
                                participant.status === 'registered' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {participant.status || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {participant.registration_time
                                ? format(new Date(participant.registration_time), 'MMM dd, yyyy HH:mm')
                                : ''}
                            </TableCell>
                            <TableCell>{participant.events?.title || ''}</TableCell>
                            <TableCell>{event?.organizer_name || 'Unknown'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                  {winnerResults.map((participant: any) => {
                    if (!participant || !participant.id) return null;
                    const event = allEvents.find(e => e.id === participant.events?.id);
                    const winnerPos = participant.winner_position ?? null;
                    return (
                      <div key={participant.id} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                              {participant.participant_name || participant.profile?.name || ''}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{participant.roll_number || ''}</p>
                          </div>
                          {winnerPos ? (
                            <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap flex-shrink-0 ${
                              winnerPos === 1 ? 'bg-yellow-500 text-white' :
                              winnerPos === 2 ? 'bg-gray-400 text-white' :
                              'bg-orange-600 text-white'
                            }`}>
                              {winnerPos === 1 ? '🥇 1st' :
                               winnerPos === 2 ? '🥈 2nd' :
                               '🥉 3rd'}
                            </span>
                          ) : null}
                        </div>

                        <div className="text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
                          <p><span className="font-medium">Event:</span> {participant.events?.title || ''}</p>
                          <p><span className="font-medium">Organizer:</span> {event?.organizer_name || 'Unknown'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Department:</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{participant.department || ''}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Class:</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{participant.class || ''}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Year:</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{participant.year || ''}</p>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Status:</span>
                            <span className={`inline-flex text-xs font-semibold rounded px-1.5 py-0.5 mt-1 ${
                              participant.status === 'attended' ? 'bg-green-100 text-green-800' :
                              participant.status === 'registered' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {participant.status || 'N/A'}
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          <p><span className="font-medium">Email:</span> {participant.profile?.email || ''}</p>
                          <p><span className="font-medium">Registered:</span> {participant.registration_time ? format(new Date(participant.registration_time), 'MMM dd, yyyy HH:mm') : ''}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {!winnerLoading && winnerResults.length === 0 && winnerFilters.eventId && (
            <Card>
              <CardContent className="py-16 text-center">
                <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No winners found</h3>
                <p className="text-gray-500">
                  {winnerFilters.position && winnerFilters.position !== 'all'
                    ? `No ${winnerFilters.position === '1' ? '1st' : winnerFilters.position === '2' ? '2nd' : '3rd'} place winners found for this event.`
                    : 'No winners have been assigned for this event yet.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDeepSearch;

