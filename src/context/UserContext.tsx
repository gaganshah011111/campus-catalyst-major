import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'organizer' | 'admin';
  isApproved: boolean;
  createdAt: string;
}

interface UserContextType {
  users: User[];
  approveUser: (id: string) => Promise<void>;
  rejectUser: (id: string) => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUsers = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuth();
  const [isSupabaseReady] = useState(isSupabaseConfigured());

  // Load users when the component mounts and when the current user changes
  useEffect(() => {
    const loadUsers = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      // Skip if Supabase is not configured
      if (!isSupabaseReady) {
        console.warn('Supabase is not properly configured. Skipping user data loading.');
        setIsLoading(false);
        return;
      }
      
      if (user?.role === 'admin') {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (error) throw error;
          
          // Map the profile data to our User interface format
          const mappedUsers: User[] = data.map(profile => ({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            isApproved: profile.is_approved,
            createdAt: profile.created_at,
          }));
          
          setUsers(mappedUsers);
        } catch (error) {
          console.error('Error loading users:', error);
          toast.error('Failed to load users');
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    
    loadUsers();
    
    // Only set up subscription if Supabase is configured and user is admin
    if (!isSupabaseReady || user?.role !== 'admin') {
      return;
    }
    
    // Set up real-time subscription for profile changes
    const profileSubscription = supabase
      .channel('public:profiles')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        loadUsers
      )
      .subscribe();
      
    // Clean up subscription
    return () => {
      supabase.removeChannel(profileSubscription);
    };
  }, [user, isSupabaseReady]);

  const approveUser = async (id: string) => {
    try {
      // Skip if Supabase is not configured
      if (!isSupabaseReady) {
        toast.error('Supabase is not properly configured. Cannot approve user.');
        return;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', id);
        
      if (error) throw error;
      
      // Update users list
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === id ? { ...user, isApproved: true } : user
        )
      );
      
      toast.success('User approved successfully');
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  };

  const rejectUser = async (id: string) => {
    try {
      // Skip if Supabase is not configured
      if (!isSupabaseReady) {
        toast.error('Supabase is not properly configured. Cannot reject user.');
        return;
      }
      
      // Delete from profiles table - because of cascade delete this will
      // also delete the auth user entry
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setUsers(prevUsers => prevUsers.filter(user => user.id !== id));
      
      toast.success('User rejected and removed');
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    }
  };

  return (
    <UserContext.Provider value={{ users, approveUser, rejectUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};
