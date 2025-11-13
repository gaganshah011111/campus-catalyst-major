
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { User, UserRound, Mail, Calendar, Building } from 'lucide-react';

const OrganizerProfile = () => {
  const { user, refreshUserData } = useAuth();
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
  
  const loadOrganizerEvents = async (): Promise<number> => {
    if (!user) return 0;
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id')
        .eq('organizer_id', user.id);
        
      if (error) throw error;
      
      return data ? data.length : 0;
    } catch (error) {
      console.error('Error loading organizer events:', error);
      return 0;
    }
  };
  
  const [eventsCount, setEventsCount] = useState<number | null>(null);
  
  React.useEffect(() => {
    const getEventCount = async () => {
      const count = await loadOrganizerEvents();
      setEventsCount(count);
    };
    
    getEventCount();
  }, [user]);

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
        <h1 className="text-3xl font-bold">Organizer Profile</h1>
        <p className="text-gray-600">Manage your organizer information</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your organizer profile details</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Organization Name
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
                  <Building className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Organization Name</p>
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
                  <UserRound className="h-5 w-5 text-gray-500" />
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
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 py-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Account Type</p>
                  <p className="font-medium capitalize">{user.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 py-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Approval Status</p>
                  <p className={`font-medium ${user.isApproved ? 'text-green-600' : 'text-amber-600'}`}>
                    {user.isApproved ? 'Approved' : 'Pending Approval'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 py-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Events Created</p>
                  <p className="font-medium">
                    {eventsCount !== null ? eventsCount : 'Loading...'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrganizerProfile;
