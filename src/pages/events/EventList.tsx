
import React, { useState, useEffect } from 'react';
import { useEvents } from '@/context/EventContext';
import { useAuth } from '@/context/AuthContext';
import EventCard from '@/components/EventCard';
import EventCalendar from '@/components/EventCalendar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, X, List, CalendarDays, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const EventList: React.FC = () => {
  const { user } = useAuth();
  const { events, loading, refreshEvents, feedback } = useEvents();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('date-asc'); // 'date-asc', 'date-desc', 'title-asc', 'rating-desc'
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  const [showApprovalStatus, setShowApprovalStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [lastEventCount, setLastEventCount] = useState(0);
  const [newEvent, setNewEvent] = useState<any>(null);
  const { toast } = useToast();
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);
  
  // Events returned from context already include admin-specific visibility
  const displayEvents = events ?? [];
  
  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('event_categories')
          .select('id, name')
          .order('name');
        
        if (error) {
          console.error('Error fetching categories:', error);
          return;
        }
        
        if (data) {
          setCategories(data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    
    fetchCategories();
  }, []);

  // Track new events
  useEffect(() => {
    // Skip first render
    if (lastEventCount > 0 && !loading && displayEvents.length > lastEventCount) {
      // Find the newest event (assuming events are ordered by creation date)
      const latestEvent = [...displayEvents].sort((a, b) => {
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      })[0];
      
      setNewEvent(latestEvent);
      toast({
        title: "New Event Added!",
        description: `"${latestEvent.title}" has been added to the events list.`,
        action: (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowNewEventDialog(true)}
          >
            View Details
          </Button>
        ),
      });
    }
    setLastEventCount(displayEvents.length);
  }, [displayEvents.length, loading]);
  
  // Extract unique tags from all events
  const allTags = Array.from(
    new Set(
      displayEvents.flatMap((event) =>
        Array.isArray(event.tags) ? event.tags : []
      )
    )
  ).sort();
  
  // Filter events based on search query, selected tags, category, and approval status
  const filteredEvents = displayEvents.filter(event => {
    const matchesSearch = 
      (event.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.location || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesTags = 
      selectedTags.length === 0 || 
      selectedTags.some((tag) =>
        (Array.isArray(event.tags) ? event.tags : []).includes(tag)
      );
      
    const matchesCategory =
      selectedCategory === 'all' || 
      (event.category_id !== undefined && event.category_id.toString() === selectedCategory);
    
    // Filter by approval status (for admin only)
    const approvalValue = 
      event.isApproved !== undefined ? event.isApproved :
      event.is_approved !== undefined ? event.is_approved :
      undefined;
    
    const matchesApprovalStatus = 
      showApprovalStatus === 'all' || 
      (showApprovalStatus === 'approved' && approvalValue === true) ||
      (showApprovalStatus === 'pending' && (approvalValue === false || approvalValue === null || approvalValue === undefined));
      
    return matchesSearch && matchesTags && matchesCategory && matchesApprovalStatus;
  });
  
  // Calculate feedback stats for events
  const eventsWithFeedback = filteredEvents.map(event => {
    const eventId = String(event.id);
    const eventFeedback = feedback.filter(f => String(f.eventId) === eventId);
    
    if (eventFeedback.length === 0) {
      return { ...event, averageRating: undefined, feedbackCount: 0 };
    }
    
    const totalRating = eventFeedback.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = totalRating / eventFeedback.length;
    
    return {
      ...event,
      averageRating,
      feedbackCount: eventFeedback.length
    };
  });
  
  // Sort filtered events
  const sortedEvents = [...eventsWithFeedback].sort((a, b) => {
    switch (sortBy) {
      case 'date-asc':
        return new Date(a.date || a.start_time).getTime() - new Date(b.date || b.start_time).getTime();
      case 'date-desc':
        return new Date(b.date || b.start_time).getTime() - new Date(a.date || a.start_time).getTime();
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'rating-desc':
        return (b.averageRating || 0) - (a.averageRating || 0);
      default:
        return 0;
    }
  });
  
  // Handle tag selection toggle
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSortBy('date-asc');
    setSelectedCategory('all');
    if (user?.role === 'admin') {
      setShowApprovalStatus('all');
    }
  };
  
  // Manual refresh of events
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshEvents();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(date);
  };

  return (
    <div>
      <header className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold">
            {user?.role === 'admin' ? 'All Campus Events' : 'Campus Events'}
          </h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={refreshing || loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <p className="text-gray-600">
          {user?.role === 'admin' 
            ? 'Manage and review all events in the system' 
            : 'Browse and register for upcoming events from our database'}
        </p>
      </header>
      
      {/* View Toggle */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-md shadow-sm">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-r-none"
          >
            <List className="mr-1 h-4 w-4" />
            List
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="rounded-l-none"
          >
            <CalendarDays className="mr-1 h-4 w-4" />
            Calendar
          </Button>
        </div>
      </div>
      
      {/* Admin-only Approval Filter */}
      {user?.role === 'admin' && (
        <div className="mb-4">
          <Tabs defaultValue="all" value={showApprovalStatus} onValueChange={(val: 'all' | 'approved' | 'pending') => setShowApprovalStatus(val)}>
            <TabsList className="w-full max-w-full overflow-x-auto flex-wrap">
              <TabsTrigger value="all">All Status</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="pending">Pending Approval</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
      
      {/* Category Tabs */}
      <div className="mb-4">
        <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full max-w-full overflow-x-auto flex-wrap">
            <TabsTrigger value="all">All Categories</TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id.toString()}>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      
      {/* Filters */}
      <div className="bg-card dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-border mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
          
          <div className="w-full md:w-48">
            <Select 
              value={sortBy} 
              onValueChange={setSortBy}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-asc">Soonest First</SelectItem>
                <SelectItem value="date-desc">Latest First</SelectItem>
                <SelectItem value="title-asc">A-Z</SelectItem>
                <SelectItem value="rating-desc">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {(searchQuery || selectedTags.length > 0 || selectedCategory !== 'all' || (user?.role === 'admin' && showApprovalStatus !== 'all')) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters} 
              className="hidden md:flex"
              disabled={loading}
            >
              <X size={16} className="mr-1" />
              Clear filters
            </Button>
          )}
        </div>
        
        {/* Tags */}
        {allTags.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-gray-500 mb-2">Filter by tags:</div>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <Badge 
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className={`cursor-pointer ${loading ? 'opacity-50' : ''}`}
                  onClick={() => !loading && toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Mobile clear button */}
        <div className="md:hidden mt-4">
          {(searchQuery || selectedTags.length > 0 || selectedCategory !== 'all' || (user?.role === 'admin' && showApprovalStatus !== 'all')) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters} 
              className="w-full"
              disabled={loading}
            >
              <X size={16} className="mr-1" />
              Clear filters
            </Button>
          )}
        </div>
      </div>
      
      {/* Results Count */}
      <div className="text-sm text-gray-500 mb-4">
        {loading ? 'Loading events...' : `${sortedEvents.length} event${sortedEvents.length !== 1 ? 's' : ''} found`}
      </div>
      
      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="border rounded-lg overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* View Mode: Calendar or List */}
      {!loading && viewMode === 'calendar' && (
        <EventCalendar />
      )}
      
      {!loading && viewMode === 'list' && (
        <div>
          {sortedEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedEvents.map(event => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  showApprovalStatus={user?.role === 'admin'}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 p-8 rounded-lg border border-dashed text-center">
              <p className="text-gray-600 mb-2">No events match your search</p>
              <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
            </div>
          )}
        </div>
      )}

      {/* New Event Dialog */}
      {newEvent && (
        <Dialog open={showNewEventDialog} onOpenChange={setShowNewEventDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">New Event Added!</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {newEvent.image_url && (
                <div className="relative aspect-video overflow-hidden rounded-lg">
                  <img
                    src={newEvent.image_url}
                    alt={newEvent.title}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
              <h3 className="text-lg font-bold">{newEvent.title}</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Date & Time:</strong> {formatDate(newEvent.start_time)}</p>
                <p><strong>Location:</strong> {newEvent.location}</p>
                <p><strong>Available Spots:</strong> {newEvent.max_capacity}</p>
              </div>
              <p className="text-gray-600">{newEvent.description}</p>
              <div className="pt-4 flex justify-end">
                <Button asChild>
                  <a href={`/events/${newEvent.id}`}>View Event Details</a>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default EventList;
