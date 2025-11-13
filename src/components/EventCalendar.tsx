
import React, { useState } from 'react';
import { useEvents } from '@/context/EventContext';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay, parseISO } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import EventCard from './EventCard';

const EventCalendar: React.FC = () => {
  const { events } = useEvents();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Filter upcoming events (from today onwards)
  const upcomingEvents = events.filter(event => 
    new Date(event.start_time) >= new Date(new Date().setHours(0, 0, 0, 0))
  );
  
  // Get events for the selected date
  const eventsOnSelectedDate = selectedDate 
    ? upcomingEvents.filter(event => 
        isSameDay(parseISO(event.start_time), selectedDate)
      )
    : [];
  
  // Create a map of dates to event counts for highlighting in calendar
  const eventDates = upcomingEvents.map(event => parseISO(event.start_time));
  
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <Card className="lg:w-96 h-fit">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <CalendarDays className="h-5 w-5 mr-2" />
            Event Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar 
            mode="single" 
            selected={selectedDate} 
            onSelect={setSelectedDate}
            modifiers={{
              hasEvent: eventDates
            }}
            modifiersClassNames={{
              hasEvent: "has-events"
            }}
            className="pointer-events-auto"
          />
          
          <style dangerouslySetInnerHTML={{ __html: `
            .has-events::after {
              content: '';
              display: block;
              width: 4px;
              height: 4px;
              border-radius: 50%;
              background-color: hsl(var(--primary));
              position: absolute;
              bottom: 2px;
              left: 50%;
              transform: translateX(-50%);
            }
          `}} />
          
          <div className="mt-4 text-sm text-gray-500 flex items-center">
            <div className="mr-2">
              <Badge className="h-2 w-2 p-0 rounded-full bg-primary" />
            </div>
            Events scheduled
          </div>
        </CardContent>
      </Card>
      
      <div className="flex-grow">
        <div className="mb-4">
          <h3 className="text-lg font-medium">
            {selectedDate 
              ? `Events on ${format(selectedDate, 'MMMM d, yyyy')}` 
              : 'Select a date to see events'}
          </h3>
        </div>
        
        {eventsOnSelectedDate.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {eventsOnSelectedDate.map(event => (
              <EventCard key={event.id} event={event} showRegisterButton={false} />
            ))}
          </div>
        ) : (
          <Card className="bg-gray-50 border-dashed">
            <CardContent className="p-6 text-center text-gray-500">
              No events scheduled for this date
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EventCalendar;
