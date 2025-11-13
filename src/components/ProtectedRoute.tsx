
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type AllowedRole = 'student' | 'organizer' | 'admin' | 'any';

interface ProtectedRouteProps {
  allowedRoles: AllowedRole[];
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, refreshUserData } = useAuth();
  
  useEffect(() => {
    // Always check approval status for organizers on route change
    const checkApprovalStatus = async () => {
      if (user?.role === 'organizer') {
        try {
          // Force refresh from the database to get the latest status
          const { data, error } = await supabase
            .from('profiles')
            .select('is_approved')
            .eq('id', user.id)
            .single();
            
          if (error) throw error;
          
          // If database state differs from user state, refresh user data
          if (data && data.is_approved !== user.isApproved) {
            console.log('Approval status changed, refreshing user data');
            const refreshedUser = await refreshUserData();
            
            if (data.is_approved && !user.isApproved) {
              toast.success('Your account has been approved!');
              // Force page refresh to ensure all components re-render
              window.location.href = '/organizer/dashboard';
            }
          }
        } catch (err) {
          console.error('Error checking approval status:', err);
        }
      }
    };
    
    if (user) {
      checkApprovalStatus();
    }
  }, [user, refreshUserData]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.includes('any') || allowedRoles.includes(user.role)) {
    // If user is an organizer and not approved, redirect to pending page
    if (user.role === 'organizer' && !user.isApproved) {
      return <Navigate to="/pending-approval" replace />;
    }
    return <>{children}</>;
  }

  return <Navigate to="/" replace />;
};

export default ProtectedRoute;
