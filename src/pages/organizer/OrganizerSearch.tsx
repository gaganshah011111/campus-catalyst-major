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
import { Download, Search, Calendar, Users, Trophy, Medal, Award } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { databaseService } from '@/utils/databaseService';

interface Event {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  organizer_id: string;
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
  };
  profile?: {
    name: string;
    email: string;
  };
}

const OrganizerSearch: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'events' | 'participants' | 'winners'>('events');
  
  // View 1: Search by Events (Event name, start date, end date, venue)
  const [eventFilters, setEventFilters] = useState({
    eventName: '',
    startDate: '',
    endDate: '',
    venue: ''
  });
  const [eventResults, setEventResults] = useState<Participant[]>([]);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventExportLoading, setEventExportLoading] = useState(false);

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
  
  // View 3: Search Winners
  const [winnerFilters, setWinnerFilters] = useState({
    eventId: '',
    position: 'all' // '1', '2', '3', or 'all' for all
  });
  const [winnerResults, setWinnerResults] = useState<Participant[]>([]);
  const [winnerLoading, setWinnerLoading] = useState(false);
  const [winnerExportLoading, setWinnerExportLoading] = useState(false);
  
  const [organizerEvents, setOrganizerEvents] = useState<Event[]>([]);
  const [participantEventQuery, setParticipantEventQuery] = useState('');
  const [winnerEventQuery, setWinnerEventQuery] = useState('');
  const [participantDeptQuery, setParticipantDeptQuery] = useState('');

  // Fetch organizer's events
  useEffect(() => {
    const fetchOrganizerEvents = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, start_time, end_time, location, organizer_id')
          .eq('organizer_id', user.id)
          .order('start_time', { ascending: false });

        if (error) throw error;
        setOrganizerEvents(data || []);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      }
    };

    fetchOrganizerEvents();
  }, [user]);

  // View 1: Search by Events
  const handleEventSearch = async () => {
    if (!user) return;

    setEventLoading(true);
    try {
      // Get all organizer's events first
      let filteredEvents = [...organizerEvents];

      // Filter by event name if provided
      if (eventFilters.eventName) {
        filteredEvents = filteredEvents.filter(e => 
          e.title.toLowerCase().includes(eventFilters.eventName.toLowerCase())
        );
      }

      // Filter by venue if provided
      if (eventFilters.venue) {
        filteredEvents = filteredEvents.filter(e => 
          e.location.toLowerCase().includes(eventFilters.venue.toLowerCase())
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

      if (eventIds.length === 0) {
        setEventResults([]);
        toast.info('No events found matching the criteria');
        return;
      }

      // Search participants for these events
      // Use databaseService for more reliable results
      let participants: any[] = [];
      
      try {
        // If single event, use direct search
        if (eventIds.length === 1) {
          const response = await databaseService.searchParticipants({
            eventId: eventIds[0],
            page: 1,
            pageSize: 1000
          });

          if (response.success && response.data) {
            participants = response.data.items || [];
          }
        } else {
          // For multiple events, search each one and combine results
          const allParticipants: any[] = [];
          for (const eventId of eventIds) {
            try {
              const response = await databaseService.searchParticipants({
                eventId: eventId,
                page: 1,
                pageSize: 1000
              });

              if (response.success && response.data?.items) {
                allParticipants.push(...response.data.items);
              }
            } catch (err) {
              console.warn(`Error searching event ${eventId}:`, err);
              // Continue with other events
            }
          }
          participants = allParticipants;
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

        // Apply additional filters client-side for name and roll number
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

        // Ensure participants is an array
        if (!Array.isArray(participants)) {
          participants = [];
        }

        // Filter by winner position if specified
        if (winnerFilters.position && winnerFilters.position !== 'all') {
          const position = parseInt(winnerFilters.position);
          if (!isNaN(position)) {
            participants = participants.filter((p: any) => {
              const winnerPos = p.winner_position ?? null;
              return winnerPos !== null && winnerPos === position;
            });
          }
        } else {
          // If no position specified or "all" selected, show all winners (1st, 2nd, 3rd)
          participants = participants.filter((p: any) => {
            const winnerPos = p.winner_position ?? null;
            return winnerPos !== null && winnerPos !== undefined;
          });
        }

        // Sort by position (1st, 2nd, 3rd)
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
        const errorMsg = response.message || 'Failed to search winners';
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Winner search error:', error);
      toast.error('Failed to search winners');
      setWinnerResults([]);
    } finally {
      setWinnerLoading(false);
    }
  };

  // Export CSV for View 1
  const handleEventExportCSV = () => {
    if (eventResults.length === 0) {
      toast.error('No data to export');
      return;
    }

    setEventExportLoading(true);
    try {
      const headers = [
        'Event ID', 'Event Title', 'Event Start', 'Event End', 'Location',
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
        p.events?.location || '',
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
      a.download = `event-participants-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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

  // Export CSV for View 3 (Winners)
  const handleWinnerExportCSV = () => {
    if (winnerResults.length === 0) {
      toast.error('No data to export');
      return;
    }

    setWinnerExportLoading(true);
    try {
      const headers = [
        'Position', 'Participant Name', 'Email', 'Roll Number', 'Department', 'Class', 'Year',
        'Status', 'Registration Time', 'Event Title'
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
      a.download = `event-winners-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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

  // Export CSV for View 2
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
      a.download = `participants-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center py-16">
          <p className="text-gray-500">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-6 sm:py-8 max-w-7xl">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Deep Search</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2">
          Search and manage participants from your events
        </p>
      </div>

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'events' | 'participants' | 'winners')} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 gap-0 h-auto">
          <TabsTrigger value="events" className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-1 sm:px-3 text-xs sm:text-sm">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Search by Events</span>
            <span className="sm:hidden">Events</span>
          </TabsTrigger>
          <TabsTrigger value="participants" className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-1 sm:px-3 text-xs sm:text-sm">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Search in Event</span>
            <span className="sm:hidden">Participants</span>
          </TabsTrigger>
          <TabsTrigger value="winners" className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-1 sm:px-3 text-xs sm:text-sm">
            <Trophy className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Search Winners</span>
            <span className="sm:hidden">Winners</span>
          </TabsTrigger>
        </TabsList>

        {/* View 1: Search by Events */}
        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-sm sm:text-base">Search by Event</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Event Name</label>
                  <Input
                    placeholder="Search event name..."
                    value={eventFilters.eventName}
                    onChange={(e) => setEventFilters({ ...eventFilters, eventName: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Venue</label>
                  <Input
                    placeholder="Search venue..."
                    value={eventFilters.venue}
                    onChange={(e) => setEventFilters({ ...eventFilters, venue: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Venue</label>
                  <Input
                    placeholder="Search venue..."
                    value={eventFilters.venue}
                    onChange={(e) => setEventFilters({ ...eventFilters, venue: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={eventFilters.startDate}
                    onChange={(e) => setEventFilters({ ...eventFilters, startDate: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={eventFilters.endDate}
                    onChange={(e) => setEventFilters({ ...eventFilters, endDate: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleEventSearch} disabled={eventLoading} className="w-full sm:w-auto text-xs sm:text-sm">
                  {eventLoading ? 'Searching...' : 'Search'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEventFilters({ eventName: '', startDate: '', endDate: '', venue: '' });
                    setEventResults([]);
                  }}
                  className="text-xs sm:text-sm"
                >
                  Clear
                </Button>
                <Button
                  variant="outline"
                  onClick={handleEventExportCSV}
                  disabled={eventExportLoading || eventResults.length === 0}
                  className="sm:ml-auto w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Download className="h-4 w-4 mr-1 sm:mr-2" />
                  <span>Export</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {eventResults.length > 0 && (
            <>
              <Card className="hidden md:block">
                <CardHeader>
                  <CardTitle>Search Results ({eventResults.length} participants found)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event Title</TableHead>
                          <TableHead>Event Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Venue</TableHead>
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
                        {eventResults.map((participant: any) => (
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
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="md:hidden space-y-3">
                <div className="text-sm font-semibold mb-3">Search Results ({eventResults.length} participants found)</div>
                {eventResults.map((participant: any) => (
                  <Card key={`evt-${participant.id}`}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-sm">{participant.events?.title || ''}</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {participant.events?.start_time ? format(new Date(participant.events.start_time), 'MMM dd, HH:mm') : ''}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          participant.status === 'attended' ? 'bg-green-100 text-green-800' :
                          participant.status === 'registered' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {participant.status}
                        </span>
                      </div>
                      <div className="text-xs space-y-1 pt-2 border-t">
                        <div><strong>Participant:</strong> {participant.participant_name || participant.profile?.name || ''}</div>
                        <div><strong>Roll:</strong> {participant.roll_number || '-'}</div>
                        <div><strong>Dept:</strong> {participant.department || '-'} | <strong>Class:</strong> {participant.class || '-'}</div>
                        <div><strong>Venue:</strong> {participant.events?.location || '-'}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* View 2: Search within specific event */}
        <TabsContent value="participants" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-sm sm:text-base">Search Participants</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Select Event *</label>
                  <Select
                    value={participantFilters.eventId}
                    onValueChange={(value) => setParticipantFilters({ ...participantFilters, eventId: value })}
                  >
                    <SelectTrigger className="text-sm h-9 sm:h-10 w-full">
                      <SelectValue placeholder="Select an event..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Search event..."
                          value={participantEventQuery}
                          onChange={(e) => setParticipantEventQuery(e.target.value)}
                          className="mb-2 text-xs"
                          onKeyDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="max-h-64 overflow-y-auto">
                          {organizerEvents
                            .filter((ev) => ev.title.toLowerCase().includes(participantEventQuery.toLowerCase()))
                            .map((event) => (
                              <SelectItem key={event.id} value={event.id.toString()}>
                                <span className="truncate">{event.title}</span>
                              </SelectItem>
                            ))}
                        </div>
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Name</label>
                  <Input
                    placeholder="Search by name..."
                    value={participantFilters.name}
                    onChange={(e) => setParticipantFilters({ ...participantFilters, name: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-sm font-medium">Roll Number</label>
                  <Input
                    placeholder="Search by roll number..."
                    value={participantFilters.rollNumber}
                    onChange={(e) => setParticipantFilters({ ...participantFilters, rollNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Department</label>
                  <Select
                    value={participantFilters.department || undefined}
                    onValueChange={(value) => {
                      setParticipantFilters({ ...participantFilters, department: value || '' });
                      setParticipantDeptQuery('');
                    }}
                  >
                    <SelectTrigger className="text-xs sm:text-sm h-9 sm:h-10 w-full">
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
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Class</label>
                  <Input
                    placeholder="Search by class..."
                    value={participantFilters.class}
                    onChange={(e) => setParticipantFilters({ ...participantFilters, class: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Year</label>
                  <Input
                    placeholder="Search by year..."
                    value={participantFilters.year}
                    onChange={(e) => setParticipantFilters({ ...participantFilters, year: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleParticipantSearch} disabled={participantLoading || !participantFilters.eventId} className="w-full sm:w-auto text-xs sm:text-sm">
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
                >
                  Clear
                </Button>
                <Button
                  variant="outline"
                  onClick={handleParticipantExportCSV}
                  disabled={participantExportLoading || participantResults.length === 0}
                  className="sm:ml-auto w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {participantExportLoading ? 'Exporting...' : 'Export CSV'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {participantResults.length > 0 && (
            <>
              <Card className="hidden md:block">
                <CardHeader>
                  <CardTitle>Search Results ({participantResults.length} participants found)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
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
                </CardContent>
              </Card>

              <div className="md:hidden space-y-3">
                <div className="text-sm font-semibold mb-3">Search Results ({participantResults.length} participants found)</div>
                {participantResults.map((participant: any) => (
                  <Card key={`p-${participant.id}`}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-sm">{participant.participant_name || participant.profile?.name || ''}</h3>
                          <p className="text-xs text-gray-500 mt-1">{participant.roll_number || '-'}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          participant.status === 'attended' ? 'bg-green-100 text-green-800' :
                          participant.status === 'registered' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {participant.status}
                        </span>
                      </div>
                      <div className="text-xs space-y-1 pt-2 border-t">
                        <div><strong>Dept:</strong> {participant.department || '-'} | <strong>Class:</strong> {participant.class || '-'}</div>
                        <div><strong>Year:</strong> {participant.year || '-'}</div>
                        <div><strong>Registered:</strong> {participant.registration_time ? format(new Date(participant.registration_time), 'MMM dd, HH:mm') : '-'}</div>
                        <div><strong>Check-in:</strong> {participant.check_in_time ? format(new Date(participant.check_in_time), 'MMM dd, HH:mm') : '-'}</div>
                        <div><strong>Winner:</strong> {participant.is_winner ? '✓ Yes' : 'No'}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* View 3: Search Winners */}
        <TabsContent value="winners" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="text-sm sm:text-base">Search Winners</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Search for winners (1st, 2nd, 3rd place) in a specific event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {winnerLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-xs sm:text-sm text-gray-500">Searching for winners...</p>
                </div>
              )}
              
              {!winnerLoading && (
              <>
              {/* Quick Winner Filters */}
              <div className="flex flex-wrap gap-1 sm:gap-2 mb-4">
                <Button
                  variant={winnerFilters.position === '1' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWinnerFilters({ ...winnerFilters, position: winnerFilters.position === '1' ? 'all' : '1' })}
                  className="flex items-center gap-1 text-xs sm:text-sm"
                >
                  <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />
                  <span className="hidden sm:inline">1st Place</span>
                  <span className="sm:hidden">1st</span>
                </Button>
                <Button
                  variant={winnerFilters.position === '2' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWinnerFilters({ ...winnerFilters, position: winnerFilters.position === '2' ? 'all' : '2' })}
                  className="flex items-center gap-1 text-xs sm:text-sm"
                >
                  <Medal className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                  <span className="hidden sm:inline">2nd Place</span>
                  <span className="sm:hidden">2nd</span>
                </Button>
                <Button
                  variant={winnerFilters.position === '3' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWinnerFilters({ ...winnerFilters, position: winnerFilters.position === '3' ? 'all' : '3' })}
                  className="flex items-center gap-1 text-xs sm:text-sm"
                >
                  <Award className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
                  <span className="hidden sm:inline">3rd Place</span>
                  <span className="sm:hidden">3rd</span>
                </Button>
                <Button
                  variant={winnerFilters.position === 'all' || !winnerFilters.position ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setWinnerFilters({ ...winnerFilters, position: 'all' })}
                  className="text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">All Winners</span>
                  <span className="sm:hidden">All</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Select Event *</label>
                  <Select
                    value={winnerFilters.eventId || undefined}
                    onValueChange={(value) => setWinnerFilters({ ...winnerFilters, eventId: value })}
                  >
                    <SelectTrigger className="text-sm h-9 sm:h-10 w-full">
                      <SelectValue placeholder="Select an event..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Search event..."
                          value={winnerEventQuery}
                          onChange={(e) => setWinnerEventQuery(e.target.value)}
                          className="mb-2 text-xs"
                          onKeyDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="max-h-64 overflow-y-auto">
                          {organizerEvents.length > 0 ? (
                            organizerEvents
                              .filter((ev) => ev.title.toLowerCase().includes(winnerEventQuery.toLowerCase()))
                              .map((event) => (
                                <SelectItem key={event.id} value={event.id.toString()}>
                                  <span className="truncate">{event.title}</span>
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
                <div className="space-y-1 sm:space-y-2">
                  <label className="text-xs sm:text-sm font-medium">Winner Position</label>
                  <Select
                    value={winnerFilters.position || undefined}
                    onValueChange={(value) => setWinnerFilters({ ...winnerFilters, position: value || '' })}
                  >
                    <SelectTrigger className="text-xs sm:text-sm">
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
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleWinnerSearch} disabled={winnerLoading || !winnerFilters.eventId} className="w-full sm:w-auto text-xs sm:text-sm">
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
                  className="text-xs sm:text-sm"
                >
                  Clear
                </Button>
                <Button
                  variant="outline"
                  onClick={handleWinnerExportCSV}
                  disabled={winnerExportLoading || winnerResults.length === 0}
                  className="sm:ml-auto w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {winnerExportLoading ? 'Exporting...' : 'Export CSV'}
                </Button>
              </div>
              </>
              )}
            </CardContent>
          </Card>

          {!winnerLoading && winnerResults.length > 0 && (
            <>
              <Card className="hidden md:block">
                <CardHeader>
                  <CardTitle>Winner Results ({winnerResults.length} winner(s) found)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {winnerResults.map((participant: any) => {
                          if (!participant || !participant.id) return null;
                          
                          const winnerPos = participant.winner_position ?? null;
                          const participantName = participant.participant_name || participant.profile?.name || '';
                          const email = participant.profile?.email || '';
                          const status = participant.status || '';
                          const regTime = participant.registration_time || '';
                          
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
                                {participantName}
                              </TableCell>
                              <TableCell>{participant.roll_number || ''}</TableCell>
                              <TableCell>{participant.department || ''}</TableCell>
                              <TableCell>{participant.class || ''}</TableCell>
                              <TableCell>{participant.year || ''}</TableCell>
                              <TableCell>{email}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  status === 'attended' ? 'bg-green-100 text-green-800' :
                                  status === 'registered' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {status || 'N/A'}
                                </span>
                              </TableCell>
                              <TableCell>
                                {regTime
                                  ? format(new Date(regTime), 'MMM dd, yyyy HH:mm')
                                  : ''}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="md:hidden space-y-3">
                <div className="text-sm font-semibold mb-3">Winner Results ({winnerResults.length} winner(s) found)</div>
                {winnerResults.map((participant: any) => {
                  if (!participant || !participant.id) return null;
                  
                  const winnerPos = participant.winner_position ?? null;
                  const participantName = participant.participant_name || participant.profile?.name || '';
                  const email = participant.profile?.email || '';
                  const status = participant.status || '';
                  const regTime = participant.registration_time || '';
                  
                  return (
                    <Card key={`w-${participant.id}`}>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-sm">{participantName}</h3>
                            <p className="text-xs text-gray-500 mt-1">{email || '-'}</p>
                          </div>
                          {winnerPos ? (
                            <span className={`px-2 py-1 rounded text-sm font-bold ${
                              winnerPos === 1 ? 'bg-yellow-500 text-white' :
                              winnerPos === 2 ? 'bg-gray-400 text-white' :
                              'bg-orange-600 text-white'
                            }`}>
                              {winnerPos === 1 ? '🥇' : winnerPos === 2 ? '🥈' : '🥉'}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs space-y-1 pt-2 border-t">
                          <div><strong>Roll:</strong> {participant.roll_number || '-'}</div>
                          <div><strong>Dept:</strong> {participant.department || '-'} | <strong>Class:</strong> {participant.class || '-'}</div>
                          <div><strong>Status:</strong> <span className={status === 'attended' ? 'text-green-600' : status === 'registered' ? 'text-blue-600' : 'text-gray-600'}>{status || 'N/A'}</span></div>
                          <div><strong>Registered:</strong> {regTime ? format(new Date(regTime), 'MMM dd, HH:mm') : '-'}</div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
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

export default OrganizerSearch;

