import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CalendarIcon, Info } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getEventById } from '@/lib/api/events';

// Category mapping
const CATEGORIES = {
  academic: 1,
  social: 2,
  sports: 3,
  cultural: 4,
  career: 5,
  other: 6
} as const;

const EventForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events, createEvent, updateEvent } = useEvents();
  
  // If id is present, we're editing an existing event
  const isEditing = !!id;
  const existingEvent = isEditing ? events.find(event => event.id === id) : null;
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('12:00');
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [endTime, setEndTime] = useState('13:00');
  const [location, setLocation] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(50);
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState<Date | undefined>(new Date());
  
  // Add loading state for edit mode
  const [formLoading, setFormLoading] = useState(isEditing);
  const [fetchedEvent, setFetchedEvent] = useState<any>(null);

  useEffect(() => {
    const fetchEventIfNeeded = async () => {
      if (isEditing && !existingEvent && id) {
        setFormLoading(true);
        try {
          const event = await getEventById(id);
          setFetchedEvent(event);
        } catch (err) {
          setFetchedEvent(null);
        } finally {
          setFormLoading(false);
        }
      } else {
        setFormLoading(false);
      }
    };
    fetchEventIfNeeded();
  }, [isEditing, existingEvent, id]);
  
  // Load existing event data if editing
  useEffect(() => {
    const eventToLoad = existingEvent || fetchedEvent;
    if (eventToLoad) {
      setTitle(eventToLoad.title);
      setDescription(eventToLoad.description);
      const startDateTime = new Date(eventToLoad.start_time);
      setStartDate(startDateTime);
      setStartTime(format(startDateTime, 'HH:mm'));
      const endDateTime = new Date(eventToLoad.end_time);
      setEndDate(endDateTime);
      setEndTime(format(endDateTime, 'HH:mm'));
      setLocation(eventToLoad.location);
      setMaxCapacity(eventToLoad.max_capacity);
      setCategory(eventToLoad.category?.name || '');
      setImageUrl(eventToLoad.image_url || '');
      if (eventToLoad.registration_deadline) {
        setRegistrationDeadline(new Date(eventToLoad.registration_deadline));
      }
    }
  }, [existingEvent, fetchedEvent]);
  
  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const todayStart = startOfDay(new Date());
    
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!startDate) newErrors.startDate = 'Start date is required';
    if (!startTime) newErrors.startTime = 'Start time is required';
    if (!endDate) newErrors.endDate = 'End date is required';
    if (!endTime) newErrors.endTime = 'End time is required';
    if (!location.trim()) newErrors.location = 'Location is required';
    if (maxCapacity <= 0) newErrors.maxCapacity = 'Maximum capacity must be greater than 0';
    if (!category.trim()) newErrors.category = 'Category is required';
    
    // Date cannot be in the past
    if (startDate && startOfDay(startDate) < todayStart) {
      newErrors.startDate = 'Start date cannot be in the past';
    }
    if (endDate && startOfDay(endDate) < todayStart) {
      newErrors.endDate = 'End date cannot be in the past';
    }
    
    // Check if end time is after start time
    const startDateTime = new Date(startDate!);
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    startDateTime.setHours(startHours, startMinutes);
    
    const endDateTime = new Date(endDate!);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    endDateTime.setHours(endHours, endMinutes);
    
    if (endDateTime <= startDateTime) {
      newErrors.endTime = 'End time must be after start time';
    }
    
    // Registration deadline checks (optional field)
    if (registrationDeadline) {
      if (startOfDay(registrationDeadline) < todayStart) {
        newErrors.registrationDeadline = 'Registration deadline cannot be in the past';
      }
      if (startDate && registrationDeadline > startDateTime) {
        newErrors.registrationDeadline = 'Registration deadline must be before the event start';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!user) {
      toast.error("You must be logged in to create or edit events");
      return;
    }
    // Combine dates and times
    const startDateTime = new Date(startDate!);
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    startDateTime.setHours(startHours, startMinutes);
    const endDateTime = new Date(endDate!);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    endDateTime.setHours(endHours, endMinutes);
    // Map category name to category_id
    const category_id = CATEGORIES[category as keyof typeof CATEGORIES];
    if (!category_id) {
      toast.error('Invalid category selected.');
      return;
    }
    // Create event object
    const eventData = {
      title,
      description,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      location,
      organizer_id: user.id,
      max_capacity: maxCapacity,
      category_id,
      image_url: imageUrl || null,
      registration_deadline: registrationDeadline?.toISOString() || null,
      is_approved: false
    };
    try {
      if (isEditing && (existingEvent || fetchedEvent)) {
        const eventId = existingEvent?.id || fetchedEvent?.id;
        await updateEvent(eventId, eventData);
        toast.success('Event updated successfully');
      } else {
        await createEvent(eventData);
        // Toast notification is handled in the EventContext
      }
      navigate('/events');
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event. Please try again.');
    }
  };
  
  // If editing, check if the user has permission to edit this event
  useEffect(() => {
    if (isEditing && existingEvent && user) {
      const isCreator = existingEvent.organizer_id === user.id; // Updated from createdBy to organizer_id
      const isAdmin = user.role === 'admin';
      
      if (!isCreator && !isAdmin) {
        toast.error("You don't have permission to edit this event");
        navigate(`/events/${id}`);
      }
    }
  }, [isEditing, existingEvent, user, id, navigate]);
  
  if (isEditing && formLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <span className="ml-4 text-gray-600">Loading event data...</span>
      </div>
    );
  }
  if (isEditing && !existingEvent && !fetchedEvent && !formLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-lg mb-4">Event not found</div>
        <Button onClick={() => navigate('/events')}>Back to Events</Button>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? 'Edit Event' : 'Create New Event'}
      </h1>
      
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Events need to be approved by an admin before they become visible.
        </AlertDescription>
      </Alert>
      
      <Card className="max-w-3xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-lg">Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isEditing && id && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(`/events/${id}/attendees`)}
                >
                  View Attendees
                </Button>
              </div>
            )}
            <div className="space-y-2 relative">
              <label htmlFor="title" className="text-sm font-medium leading-none">
                Event Title *
              </label>
              <div className="flex items-center">
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={errors.title ? "border-red-500" : ""}
                />
                {title && (
                  <button type="button" onClick={() => setTitle('')} className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none">
                    &#10005;
                  </button>
                )}
              </div>
              {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
            </div>
            
            <div className="space-y-2 relative">
              <label htmlFor="description" className="text-sm font-medium leading-none">
                Description *
              </label>
              <div className="flex items-center">
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={errors.description ? "border-red-500" : ""}
                />
                {description && (
                  <button type="button" onClick={() => setDescription('')} className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none">
                    &#10005;
                  </button>
                )}
              </div>
              {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  Start Date *
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground",
                        errors.startDate ? "border-red-500" : ""
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(date) => startOfDay(date) < startOfDay(new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.startDate && <p className="text-sm text-red-500">{errors.startDate}</p>}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="startTime" className="text-sm font-medium leading-none">
                  Start Time *
                </label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={errors.startTime ? "border-red-500" : ""}
                />
                {errors.startTime && <p className="text-sm text-red-500">{errors.startTime}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  End Date *
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground",
                        errors.endDate ? "border-red-500" : ""
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => {
                        const d = startOfDay(date);
                        const today = startOfDay(new Date());
                        const start = startDate ? startOfDay(startDate) : undefined;
                        return d < today || (start ? d < start : false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.endDate && <p className="text-sm text-red-500">{errors.endDate}</p>}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="endTime" className="text-sm font-medium leading-none">
                  End Time *
                </label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={errors.endTime ? "border-red-500" : ""}
                />
                {errors.endTime && <p className="text-sm text-red-500">{errors.endTime}</p>}
              </div>
            </div>
            
            <div className="space-y-2 relative">
              <label htmlFor="location" className="text-sm font-medium leading-none">
                Location *
              </label>
              <div className="flex items-center">
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={errors.location ? "border-red-500" : ""}
                />
                {location && (
                  <button type="button" onClick={() => setLocation('')} className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none">
                    &#10005;
                  </button>
                )}
              </div>
              {errors.location && <p className="text-sm text-red-500">{errors.location}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="maxCapacity" className="text-sm font-medium leading-none">
                  Maximum Capacity *
                </label>
                <Input
                  id="maxCapacity"
                  type="number"
                  min="1"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(parseInt(e.target.value))}
                  className={errors.maxCapacity ? "border-red-500" : ""}
                />
                {errors.maxCapacity && <p className="text-sm text-red-500">{errors.maxCapacity}</p>}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium leading-none">
                  Category *
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">Academic</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="career">Career</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
              </div>
            </div>
            
            <div className="space-y-2 relative">
              <label htmlFor="imageUrl" className="text-sm font-medium leading-none">
                Image URL
              </label>
              <div className="flex items-center">
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                {imageUrl && (
                  <button type="button" onClick={() => setImageUrl('')} className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none">
                    &#10005;
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Registration Deadline
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {registrationDeadline ? format(registrationDeadline, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={registrationDeadline}
                    onSelect={setRegistrationDeadline}
                    disabled={(date) => {
                      const d = startOfDay(date);
                      const today = startOfDay(new Date());
                      const start = startDate ? startOfDay(startDate) : undefined;
                      // deadline must be >= today and <= start date
                      if (d < today) return true;
                      if (start && d > start) return true;
                      return false;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.registrationDeadline && <p className="text-sm text-red-500">{errors.registrationDeadline}</p>}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Update Event' : 'Create Event'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default EventForm;
