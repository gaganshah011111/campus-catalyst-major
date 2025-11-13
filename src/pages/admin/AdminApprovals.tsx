
import React from 'react';
import { useUsers } from '@/context/UserContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

const AdminApprovals: React.FC = () => {
  const { users, approveUser, rejectUser } = useUsers();
  
  // Filter users who are organizers and not approved yet
  const pendingApprovals = users.filter(
    user => user.role === 'organizer' && !user.isApproved
  );
  
  const handleApprove = (userId: string, userName: string) => {
    approveUser(userId);
    toast.success(`Approved organizer account for ${userName}`);
  };
  
  const handleReject = (userId: string, userName: string) => {
    rejectUser(userId);
    toast.success(`Rejected organizer account for ${userName}`);
  };
  
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Organizer Approvals</h1>
        <p className="text-gray-600">Review and approve organizer role requests</p>
      </header>
      
      {pendingApprovals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium">No pending approval requests</h3>
            <p className="text-gray-500 mt-1">
              All organizer account requests have been processed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {pendingApprovals.map(user => (
            <Card key={user.id} className="overflow-hidden">
              <div className="bg-amber-50 px-4 py-2 border-b border-amber-200">
                <span className="text-sm text-amber-600 font-medium">
                  Pending Approval
                </span>
              </div>
              <CardContent className="p-0">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-lg">{user.name}</h3>
                      <p className="text-gray-600">{user.email}</p>
                      <div className="flex items-center text-sm text-gray-500 mt-2">
                        <Calendar size={14} className="mr-1" />
                        <span>
                          Request submitted on {format(parseISO(user.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleReject(user.id, user.name)}
                        variant="outline"
                        className="border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <XCircle size={16} className="mr-1" />
                        Reject
                      </Button>
                      <Button 
                        onClick={() => handleApprove(user.id, user.name)}
                        variant="outline"
                        className="border-green-200 hover:bg-green-50 hover:text-green-600"
                      >
                        <CheckCircle size={16} className="mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;
