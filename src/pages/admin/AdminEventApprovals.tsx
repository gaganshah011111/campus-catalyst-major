import React, { useEffect, useState } from 'react';
import { useEvents } from '@/context/EventContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CalendarCheck,
  CalendarX,
  CheckCircle,
  Clock,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const AdminEventApprovals: React.FC = () => {
  const navigate = useNavigate();
  const {
    pendingEvents,
    refreshPendingEvents,
    approveEvent,
    pendingLoading,
  } = useEvents();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [eventToReject, setEventToReject] = useState<{ id: string; title: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    refreshPendingEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApprove = async (eventId: string | number) => {
    try {
      setProcessing(true);
      console.log('Approving event:', eventId);
      
      const success = await approveEvent(eventId, true);
      
      if (success) {
        // Wait a bit for the database to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh the pending events list
        await refreshPendingEvents();
      } else {
        // Error message already shown by approveEvent
        console.error('Failed to approve event');
      }
    } catch (error) {
      console.error('Error in handleApprove:', error);
      toast.error('Error approving event. Please check the console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectClick = (event: any, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    console.log('Reject button clicked for event:', event);
    setEventToReject({ id: String(event.id), title: event.title });
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!eventToReject) return;
    
    try {
      setProcessing(true);
      console.log('Rejecting event:', eventToReject);
      
      // Call approveEvent with false to reject
      const success = await approveEvent(eventToReject.id, false);
      
      if (success) {
        // Wait a bit for the database to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh the pending events list
        await refreshPendingEvents();
        
        setRejectDialogOpen(false);
        setEventToReject(null);
      } else {
        // Error message already shown by approveEvent
        console.error('Failed to reject event');
      }
    } catch (error) {
      console.error('Error rejecting event:', error);
      toast.error('Error rejecting event. Please check the console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const handleView = (eventId: string | number, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    // Navigate to event detail page
    console.log('View button clicked for event:', eventId);
    navigate(`/events/${eventId}`);
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Event Approval Requests</h1>
        <p className="text-gray-600">Review and approve event submissions</p>
      </header>

      {pendingLoading ? (
        <Card>
          <CardContent className="flex justify-center p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 animate-spin" />
              <p>Loading pending events...</p>
            </div>
          </CardContent>
        </Card>
      ) : pendingEvents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium">No pending approval requests</h3>
            <p className="text-gray-500 mt-1">
              All event submissions have been processed.
            </p>
            <Button
              onClick={() => refreshPendingEvents()}
              variant="outline"
              className="mt-4"
            >
              <Clock size={14} className="mr-1" />
              Refresh List
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop View */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingEvents.map((event) => (
                        <TableRow 
                          key={event.id}
                          onClick={(e) => {
                            // Prevent row click from interfering with button clicks
                            if ((e.target as HTMLElement).closest('button')) {
                              e.stopPropagation();
                            }
                          }}
                        >
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell>
                            {event.created_at && !isNaN(Date.parse(event.created_at))
                              ? format(new Date(event.created_at), 'MMM d, yyyy, h:mm a')
                              : 'N/A'}
                          </TableCell>
                          <TableCell>{event.location || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-200"
                            >
                              <Clock size={14} className="mr-1" />
                              Pending Review
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm" 
                              className="mr-2"
                              onClick={(e) => handleView(event.id, e)}
                              disabled={processing}
                            >
                              <Eye size={14} className="mr-1" />
                              View
                            </Button>
                            <Button
                              type="button"
                              onClick={(e) => handleRejectClick(event, e)}
                              variant="outline"
                              size="sm"
                              className="border-red-200 hover:bg-red-50 hover:text-red-600 mr-2"
                              disabled={processing}
                            >
                              <CalendarX size={14} className="mr-1" />
                              Reject
                            </Button>
                            <Button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleApprove(event.id);
                              }}
                              variant="outline"
                              size="sm"
                              className="border-green-200 hover:bg-green-50 hover:text-green-600"
                              disabled={processing}
                            >
                              <CalendarCheck size={14} className="mr-1" />
                              Approve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {pendingEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">{event.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {event.location || 'N/A'}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap flex-shrink-0"
                    >
                      <Clock size={12} className="mr-1" />
                      Pending
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
                    {event.created_at && !isNaN(Date.parse(event.created_at))
                      ? format(new Date(event.created_at), 'MMM d, yyyy, h:mm a')
                      : 'N/A'}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      className="flex-1 min-w-[80px]"
                      onClick={(e) => handleView(event.id, e)}
                      disabled={processing}
                    >
                      <Eye size={14} className="mr-1" />
                      View
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => handleRejectClick(event, e)}
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-[80px] border-red-200 hover:bg-red-50 hover:text-red-600"
                      disabled={processing}
                    >
                      <CalendarX size={14} className="mr-1" />
                      Reject
                    </Button>
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleApprove(event.id);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-[80px] border-green-200 hover:bg-green-50 hover:text-green-600"
                      disabled={processing}
                    >
                      <CalendarCheck size={14} className="mr-1" />
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Reject Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject the event "{eventToReject?.title}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setEventToReject(null);
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={processing}
            >
              {processing ? 'Rejecting...' : 'Reject Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEventApprovals;
