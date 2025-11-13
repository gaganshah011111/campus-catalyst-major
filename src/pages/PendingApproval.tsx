
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClockIcon, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const PendingApproval: React.FC = () => {
  const { logout, user, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if the user status has been approved
  useEffect(() => {
    // Direct check on mount
    if (user?.isApproved) {
      navigate('/organizer/dashboard');
    }
    
    // Auto-check on load
    checkApprovalStatus(true);
    
    // Setup polling for approval status
    const intervalId = setInterval(() => {
      checkApprovalStatus(true);
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const checkApprovalStatus = async (silent = false) => {
    try {
      if (!silent) {
        setIsRefreshing(true);
      }
      
      // Direct database check to bypass any caching issues
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_approved')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        // If approved in database but not in state, refresh user data
        if (data && data.is_approved && !user.isApproved) {
          const userData = await refreshUserData();
          
          if (userData?.isApproved) {
            toast.success('Your account has been approved!');
            navigate('/organizer/dashboard');
            return;
          }
        }
      }
      
      // If explicit check (button click), show the status
      if (!silent) {
        const userData = await refreshUserData();
        
        if (userData?.isApproved) {
          toast.success('Your account has been approved!');
          navigate('/organizer/dashboard');
        } else {
          toast.info('Your account is still pending approval.');
        }
      }
    } catch (error) {
      console.error('Error checking approval status:', error);
      if (!silent) {
        toast.error('Failed to check approval status. Please try again.');
      }
    } finally {
      if (!silent) {
        setIsRefreshing(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="max-w-md w-full mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto bg-amber-100 p-3 rounded-full w-fit mb-4">
            <ClockIcon className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-xl">Account Approval Pending</CardTitle>
          <CardDescription>Your organizer account is awaiting admin approval</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4">
            <p>
              Thank you for registering as an event organizer with Campus Catalyst. 
              Before you can start creating and managing events, your account needs to be approved by an administrator.
            </p>
            <p>
              This process typically takes 1-2 business days. You'll receive an email notification once your account has been approved.
            </p>
            <p className="text-sm text-gray-500">
              If you have any questions, please contact campus support at support@campuscatalyst.edu.
            </p>
            
            <div className="pt-4 space-y-2">
              <Button 
                onClick={() => checkApprovalStatus()}
                variant="default" 
                disabled={isRefreshing}
                className="w-full"
              >
                {isRefreshing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Checking status...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check approval status
                  </>
                )}
              </Button>
              <Button 
                onClick={handleLogout} 
                variant="outline"
                className="w-full"
              >
                Log Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingApproval;
