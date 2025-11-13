import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Participant {
  id: string;
  participant_name: string;
  roll_number: string;
  class: string;
  department: string;
  year: string;
  status: string;
  is_winner: boolean;
  remarks: string;
  events: {
    id: number;
    event_name: string;
    category: string;
    date: string;
    venue: string;
  };
}

interface SearchResult {
  data: Participant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ParticipantSearch: React.FC = () => {
  const { user } = useAuth();
  const [searchFilters, setSearchFilters] = useState({
    searchText: '',
    department: '',
    eventId: '',
    isWinner: '',
    status: '',
    year: '',
    class: ''
  });
  const [results, setResults] = useState<SearchResult | null>(null);
  const [events, setEvents] = useState<{ id: number; event_name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch available events for filter dropdown
  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title')
          .order('title');

        if (error) throw error;
        // Map title to event_name for consistency
        setEvents(data?.map(e => ({ id: e.id, event_name: e.title })) || []);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, [user]);

  const handleSearch = async (page = 1) => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-participants', {
        body: {
          searchText: searchFilters.searchText || undefined,
          department: searchFilters.department || undefined,
          eventId: searchFilters.eventId || undefined,
          isWinner: searchFilters.isWinner === 'true' ? true : searchFilters.isWinner === 'false' ? false : undefined,
          status: searchFilters.status || undefined,
          year: searchFilters.year || undefined,
          class: searchFilters.class || undefined,
          page,
          limit: 10
        }
      });

      if (error) throw error;
      setResults(data);
      setCurrentPage(page);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search participants');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!user) return;

    setExportLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-participants', {
        body: {
          searchText: searchFilters.searchText || undefined,
          department: searchFilters.department || undefined,
          eventId: searchFilters.eventId || undefined,
          isWinner: searchFilters.isWinner === 'true' ? true : searchFilters.isWinner === 'false' ? false : undefined,
          status: searchFilters.status || undefined,
          year: searchFilters.year || undefined,
          class: searchFilters.class || undefined,
          exportCsv: true
        }
      });

      if (error) throw error;

      // Convert to CSV
      const participants = data.data;
      if (!participants || participants.length === 0) {
        toast.error('No data to export');
        return;
      }

      const csvHeaders = [
        'ID', 'Participant Name', 'Roll Number', 'Class', 'Department', 'Year', 
        'Status', 'Is Winner', 'Remarks', 'Event Name', 'Category', 'Date', 'Venue'
      ];

      const csvRows = participants.map((p: Participant) => [
        p.id,
        p.participant_name,
        p.roll_number,
        p.class,
        p.department,
        p.year,
        p.status,
        p.is_winner ? 'Yes' : 'No',
        p.remarks || '',
        p.events.event_name,
        p.events.category,
        format(new Date(p.events.date), 'yyyy-MM-dd HH:mm'),
        p.events.venue
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
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
      setExportLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setSearchFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearchFilters({
      searchText: '',
      department: '',
      eventId: '',
      isWinner: '',
      status: '',
      year: '',
      class: ''
    });
    setResults(null);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Participants
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Input
              placeholder="Search participants, events, roll number..."
              value={searchFilters.searchText}
              onChange={(e) => handleFilterChange('searchText', e.target.value)}
              className="md:col-span-2"
            />
            <Input
              placeholder="Department"
              value={searchFilters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
            />
            <Input
              placeholder="Year"
              value={searchFilters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
            />
            <Input
              placeholder="Class"
              value={searchFilters.class}
              onChange={(e) => handleFilterChange('class', e.target.value)}
            />
            <Select 
              value={searchFilters.status} 
              onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="attended">Attended</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select 
              value={searchFilters.eventId} 
              onValueChange={(value) => handleFilterChange('eventId', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select specific event..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id.toString()}>
                    {event.event_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={searchFilters.isWinner} 
              onValueChange={(value) => handleFilterChange('isWinner', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Winner status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Participants</SelectItem>
                <SelectItem value="true">Winners Only</SelectItem>
                <SelectItem value="false">Non-Winners</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleSearch(1)} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportCSV} 
              disabled={exportLoading || !results?.data?.length}
              className="ml-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportLoading ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>
              Search Results ({results.total} participants found)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.data.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Participant Name</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Winner</TableHead>
                        <TableHead>Event Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.data.map((participant) => (
                        <TableRow key={participant.id}>
                          <TableCell className="font-medium">{participant.participant_name}</TableCell>
                          <TableCell>{participant.roll_number}</TableCell>
                          <TableCell>{participant.class}</TableCell>
                          <TableCell>{participant.department}</TableCell>
                          <TableCell>{participant.year}</TableCell>
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
                            {participant.is_winner ? (
                              <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">Winner</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{participant.events.event_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {participant.events.category} • {participant.events.venue}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(participant.events.date), 'MMM dd, yyyy')}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {results.totalPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        {currentPage > 1 && (
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => handleSearch(currentPage - 1)}
                              className="cursor-pointer"
                            />
                          </PaginationItem>
                        )}
                        
                        {Array.from({ length: Math.min(5, results.totalPages) }, (_, i) => {
                          const page = Math.max(1, currentPage - 2) + i;
                          if (page > results.totalPages) return null;
                          
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => handleSearch(page)}
                                isActive={page === currentPage}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}

                        {currentPage < results.totalPages && (
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => handleSearch(currentPage + 1)}
                              className="cursor-pointer"
                            />
                          </PaginationItem>
                        )}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No participants found matching your search criteria.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ParticipantSearch;