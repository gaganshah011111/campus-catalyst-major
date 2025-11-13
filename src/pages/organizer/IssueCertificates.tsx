import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Search, CheckCircle, User } from 'lucide-react';

interface Attendee {
  id: string;
  name: string;
  email: string;
  hasCertificate: boolean;
  position: number | null;
  participant: string | null;
}

const IssueCertificates: React.FC = () => {
  const { eventId: eventIdParam } = useParams<{ eventId: string }>();
  const eventId = Number(eventIdParam);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<any>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [issuingCertificate, setIssuingCertificate] = useState<string | null>(null);
  const [positionSelections, setPositionSelections] = useState<Record<string, number | null>>({});

  useEffect(() => {
    const fetchEventAndAttendees = async () => {
      if (!eventId || isNaN(eventId)) {
        toast.error('Invalid event ID');
        navigate('/organizer/events');
        return;
      }

      try {
        setLoading(true);

        // Fetch event details
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (eventError) throw eventError;

        if (!eventData) {
          toast.error('Event not found');
          navigate('/organizer/events');
          return;
        }

        if (user?.id !== eventData.organizer_id && user?.role !== 'admin') {
          toast.error('You do not have permission to issue certificates for this event');
          navigate('/organizer/events');
          return;
        }

        setEvent(eventData);

        // Get existing certificates
        const { data: certificates, error: certError } = await supabase
          .from('certificates')
          .select('student_id')
          .eq('event_id', eventId);

        if (certError) throw certError;

        const certifiedStudents = new Set((certificates || []).map(cert => cert.student_id));

        // Get event attendees with position and participant info
        const { data: registrations, error: regError } = await supabase
          .from('event_registrations')
          .select('user_id, winner_position, participant_name')
          .eq('event_id', eventId)
          .eq('status', 'attended');

        if (regError) throw regError;

        const attendeeIds = (registrations || []).map(r => r.user_id);
        
        // Create a map of user_id to registration data for position and participant
        const registrationMap = new Map(
          (registrations || []).map(reg => [
            reg.user_id,
            {
              position: reg.winner_position,
              participant: reg.participant_name
            }
          ])
        );

        if (attendeeIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', attendeeIds);

          if (profilesError) throw profilesError;

          const attendeeData = (profiles || []).map(profile => {
            const regData = registrationMap.get(profile.id) || { position: null, participant: null };
            return {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              hasCertificate: certifiedStudents.has(profile.id),
              position: regData.position,
              participant: regData.participant
            };
          });

          setAttendees(attendeeData);
        } else {
          setAttendees([]);
        }
      } catch (error) {
        console.error('Error fetching event and attendees:', error);
        toast.error('Failed to load event information');
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndAttendees();
  }, [eventId, user, navigate]);

  const handleIssueCertificate = async (attendeeId: string) => {
    if (!eventId || !attendeeId) {
      toast.error("Missing event or attendee ID");
      return;
    }

    try {
      setIssuingCertificate(attendeeId);

      // Get selected position for this attendee (1, 2, 3, or null for participant)
      const selectedPosition = positionSelections[attendeeId] ?? null;

      // Update the registration with winner_position if a position is selected
      if (selectedPosition !== null) {
        const { error: regUpdateError } = await supabase
          .from('event_registrations')
          .update({ 
            winner_position: selectedPosition,
            is_winner: selectedPosition !== null
          })
          .eq('event_id', eventId)
          .eq('user_id', attendeeId);

        if (regUpdateError) {
          console.warn('Error updating registration position:', regUpdateError);
          // Continue even if position update fails
        }
      }

      // Check if certificate already exists
      const { data: existingCert, error: checkError } = await supabase
        .from('certificates')
        .select('id')
        .eq('event_id', eventId)
        .eq('student_id', attendeeId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingCert) {
        // Update position in registration if changed
        if (selectedPosition !== null) {
          const { error: regUpdateError } = await supabase
            .from('event_registrations')
            .update({ 
              winner_position: selectedPosition,
              is_winner: selectedPosition !== null
            })
            .eq('event_id', eventId)
            .eq('user_id', attendeeId);

          if (regUpdateError) {
            console.warn('Error updating registration position:', regUpdateError);
          }
        } else {
          // If setting to participant, clear winner position
          const { error: regUpdateError } = await supabase
            .from('event_registrations')
            .update({ 
              winner_position: null,
              is_winner: false
            })
            .eq('event_id', eventId)
            .eq('user_id', attendeeId);

          if (regUpdateError) {
            console.warn('Error updating registration position:', regUpdateError);
          }
        }

        // Refresh position data
        const { data: regData } = await supabase
          .from('event_registrations')
          .select('winner_position')
          .eq('event_id', eventId)
          .eq('user_id', attendeeId)
          .maybeSingle();

        setAttendees(prev =>
          prev.map(att =>
            att.id === attendeeId 
              ? { ...att, hasCertificate: true, position: regData?.winner_position ?? selectedPosition } 
              : att
          )
        );

        // Clear position selection for this attendee
        setPositionSelections(prev => {
          const newSelections = { ...prev };
          delete newSelections[attendeeId];
          return newSelections;
        });

        toast.success('Certificate position updated successfully');
        return;
      }

      // Insert new certificate
      const { data, error } = await supabase
        .from('certificates')
        .insert([
          {
            event_id: eventId,
            student_id: attendeeId,
            issued_by: user?.id,
            issued_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;

      setAttendees(prev =>
        prev.map(att =>
          att.id === attendeeId 
            ? { ...att, hasCertificate: true, position: selectedPosition } 
            : att
        )
      );

      // Clear position selection for this attendee
      setPositionSelections(prev => {
        const newSelections = { ...prev };
        delete newSelections[attendeeId];
        return newSelections;
      });

      toast.success('Certificate issued successfully');
    } catch (error) {
      console.error('Error issuing certificate:', error);
      toast.error('Failed to issue certificate');
    } finally {
      setIssuingCertificate(null);
    }
  };

  const filteredAttendees = attendees.filter(att =>
    att.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    att.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Event not found or you don't have permission to view it.</p>
          <Button
            className="mt-4"
            onClick={() => navigate('/organizer/events')}
          >
            Back to Events
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Issue Certificates</h1>
        <p className="text-gray-600">
          Event: {event.title} ({new Date(event.date).toLocaleDateString()})
        </p>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="mr-2 h-5 w-5" />
            Attendee Certificates
          </CardTitle>
          <CardDescription>
            Issue certificates to attendees who completed this event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search attendees..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {attendees.length === 0 ? (
            <div className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No attendees found for this event.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendees.map(attendee => (
                  <TableRow key={attendee.id}>
                    <TableCell>{attendee.name}</TableCell>
                    <TableCell>{attendee.email}</TableCell>
                    <TableCell>
                      {attendee.position ? (
                        <span className="font-semibold">{attendee.position}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {attendee.participant || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      {attendee.hasCertificate ? (
                        <span className="inline-flex items-center text-green-600">
                          <CheckCircle className="mr-1 h-4 w-4" /> Issued
                        </span>
                      ) : (
                        <span className="text-gray-500">Not issued</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Select
                          value={positionSelections[attendee.id]?.toString() ?? attendee.position?.toString() ?? 'participant'}
                          onValueChange={(value) => {
                            setPositionSelections(prev => ({
                              ...prev,
                              [attendee.id]: value === 'participant' ? null : parseInt(value)
                            }));
                          }}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Position" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="participant">Participant</SelectItem>
                            <SelectItem value="1">1st Place</SelectItem>
                            <SelectItem value="2">2nd Place</SelectItem>
                            <SelectItem value="3">3rd Place</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant={attendee.hasCertificate ? "outline" : "default"}
                          size="sm"
                          disabled={issuingCertificate === attendee.id}
                          onClick={() => handleIssueCertificate(attendee.id)}
                        >
                          {issuingCertificate === attendee.id ? (
                            <span className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Processing...
                            </span>
                          ) : attendee.hasCertificate ? (
                            'Update'
                          ) : (
                            'Issue Certificate'
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default IssueCertificates;
