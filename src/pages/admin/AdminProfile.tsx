
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { User, UserRound, Mail, Calendar, Shield } from 'lucide-react';
import EventCard from '@/components/EventCard';

const AdminProfile = () => {
  const { user, refreshUserData } = useAuth();
  const { events, loading: eventsLoading } = useEvents();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', user.id);
        
      if (error) throw error;
      
      await refreshUserData();
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>You must be logged in to view your profile.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Admin Profile</h1>
        <p className="text-gray-600">Manage your admin account information</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Admin Information</CardTitle>
            <CardDescription>Update your admin profile details</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Admin Name
                  </label>
                  <Input 
                    id="name"
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email Address
                  </label>
                  <Input 
                    id="email"
                    value={user.email} 
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setName(user.name);
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 py-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Admin Name</p>
                    <p className="font-medium">{user.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 py-2">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Email Address</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 py-2">
                  <Shield className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="font-medium capitalize">{user.role}</p>
                  </div>
                </div>
                <Button onClick={() => setIsEditing(true)} className="mt-4">
                  Edit Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 py-2">
                <Shield className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Account Type</p>
                  <p className="font-medium text-primary">Administrator</p>
                </div>
              </div>
              
              <div className="pt-4">
                <Button variant="outline" className="w-full" asChild>
                  <a href="/admin">Go to Admin Dashboard</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Events Section */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>All Events</CardTitle>
            <CardDescription>
              View and manage all events in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading events...
              </div>
            ) : events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(event => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    showApprovalStatus={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No events found in the system
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminProfile;
