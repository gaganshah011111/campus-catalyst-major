
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CalendarDays,
  Users,
  User,
  MessageSquare,
  ClipboardList,
  Bell
} from 'lucide-react';

const About: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div>
      <header className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">About Campus Catalyst</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          A comprehensive platform designed to enhance campus life through simplified event management and discovery.
        </p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div>
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-gray-700 mb-4">
            Campus Catalyst aims to create a more connected and engaged campus community by making it easy for students to discover events and for organizers to reach their audience.
          </p>
          <p className="text-gray-700 mb-4">
            We believe that campus events are a crucial part of the college experience, fostering connections, learning opportunities, and memorable experiences that extend beyond the classroom.
          </p>
          <Link to="/events">
            <Button className="mt-2">Browse Events</Button>
          </Link>
        </div>
        
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4">Platform Features</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <CalendarDays className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <span>Comprehensive event discovery and management</span>
              </li>
              <li className="flex items-start">
                <Users className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <span>Streamlined registration and attendance tracking</span>
              </li>
              <li className="flex items-start">
                <ClipboardList className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <span>Personal event calendars for registered events</span>
              </li>
              <li className="flex items-start">
                <MessageSquare className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <span>Post-event feedback collection and analytics</span>
              </li>
              <li className="flex items-start">
                <Bell className="h-5 w-5 text-primary mr-2 mt-0.5" />
                <span>Event reminders and notifications</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
      
      <h2 className="text-2xl font-bold mb-6">User Roles</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardContent className="p-6">
            <div className="bg-primary/10 p-3 rounded-full w-fit mb-4">
              <User className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Students</h3>
            <p className="text-gray-700 mb-4">
              Discover events happening on campus, register with a single click, manage your event calendar, and provide feedback on attended events.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="bg-primary/10 p-3 rounded-full w-fit mb-4">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Organizers</h3>
            <p className="text-gray-700 mb-4">
              Create and manage events, track registrations, communicate with attendees, and collect valuable feedback to improve future events.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="bg-primary/10 p-3 rounded-full w-fit mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Administrators</h3>
            <p className="text-gray-700 mb-4">
              Oversee all platform activities, approve organizer accounts, moderate content, and ensure the platform serves the campus community effectively.
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="text-center bg-gray-50 p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Get Started Today</h2>
        <p className="text-gray-700 mb-6 max-w-2xl mx-auto">
          Join Campus Catalyst to enhance your campus experience by discovering events that match your interests or creating events to share your passions with the community.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link to="/register">
            <Button size="lg">Create Account</Button>
          </Link>
          <Link to="/events">
            <Button size="lg" variant="outline">Browse Events</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default About;
