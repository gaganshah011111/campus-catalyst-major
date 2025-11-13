import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Trophy, Medal, Users, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Event {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  location: string;
}

interface Participant {
  id: number;
  participant_name: string;
  roll_number: string;
  class: string;
  department: string;
  year: string;
  status: string;
  is_winner: boolean | null;
  winner_position: number | null;
  registration_time: string;
  check_in_time: string | null;
  events: {
    id: number;
    title: string;
  };
  profile?: {
    name: string;
    email: string;
  };
}

const AssignWinners: React.FC = () => {
  const { user } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [organizerEvents, setOrganizerEvents] = useState<Event[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [assignEventQuery, setAssignEventQuery] = useState('');
  const [participantQuery, setParticipantQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [winners, setWinners] = useState<{
    first: number | null;
    second: number | null;
    third: number | null;
  }>({
    first: null,
    second: null,
    third: null
  });

  // Fetch organizer's events
  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, start_time, end_time, location')
          .eq('organizer_id', user.id)
          .order('start_time', { ascending: false });

        if (error) throw error;
        setOrganizerEvents(data || []);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      }
    };

    fetchEvents();
  }, [user]);

  // Fetch participants when event is selected
  useEffect(() => {
    if (selectedEventId) {
      fetchParticipants();
    } else {
      setParticipants([]);
      setWinners({ first: null, second: null, third: null });
    }
  }, [selectedEventId]);

  const fetchParticipants = async () => {
    if (!selectedEventId || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          participant_name,
          roll_number,
          class,
          department,
          year,
          status,
          is_winner,
          winner_position,
          registration_time,
          check_in_time,
          events:event_id (
            id,
            title
          ),
          profile:user_id (
            name,
            email
          )
        `)
        .eq('event_id', parseInt(selectedEventId))
        .order('registration_time', { ascending: false });

      if (error) {
        // If error is about missing column, try without winner_position
        if (error.message.includes('winner_position') || error.message.includes('column')) {
          console.warn('winner_position column may not exist yet, trying without it');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('event_registrations')
            .select(`
              id,
              participant_name,
              roll_number,
              class,
              department,
              year,
              status,
              is_winner,
              registration_time,
              check_in_time,
              events:event_id (
                id,
                title
              ),
              profile:user_id (
                name,
                email
              )
            `)
            .eq('event_id', parseInt(selectedEventId))
            .order('registration_time', { ascending: false });
          
          if (fallbackError) throw fallbackError;
          
          // Map data to include winner_position as null
          const mappedData = (fallbackData || []).map((p: any) => ({
            ...p,
            winner_position: null
          }));
          
          setParticipants(mappedData as Participant[]);
          setWinners({ first: null, second: null, third: null });
          toast.warning('Winner position feature requires database migration. Please run the migration first.');
          return;
        }
        throw error;
      }

      const participantsData = (data || []) as Participant[];
      setParticipants(participantsData);

      // Load existing winners
      const firstPlace = participantsData.find(p => p.winner_position === 1);
      const secondPlace = participantsData.find(p => p.winner_position === 2);
      const thirdPlace = participantsData.find(p => p.winner_position === 3);

      setWinners({
        first: firstPlace?.id ? Number(firstPlace.id) : null,
        second: secondPlace?.id ? Number(secondPlace.id) : null,
        third: thirdPlace?.id ? Number(thirdPlace.id) : null
      });
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Failed to load participants');
    } finally {
      setLoading(false);
    }
  };

  const handleWinnerSelect = (position: 'first' | 'second' | 'third', participantId: number | null) => {
    setWinners(prev => {
      const newWinners = { ...prev };
      
      // Remove from other positions if selected
      if (participantId) {
        if (position !== 'first' && prev.first === participantId) {
          newWinners.first = null;
        }
        if (position !== 'second' && prev.second === participantId) {
          newWinners.second = null;
        }
        if (position !== 'third' && prev.third === participantId) {
          newWinners.third = null;
        }
      }
      
      newWinners[position] = participantId;
      return newWinners;
    });
  };

  const handleSaveWinners = async () => {
    if (!selectedEventId) {
      toast.error('Please select an event');
      return;
    }

    setSaving(true);
    try {
      // First, clear all existing winner positions for this event
      const { error: clearError } = await supabase
        .from('event_registrations')
        .update({ 
          is_winner: false,
          winner_position: null 
        })
        .eq('event_id', parseInt(selectedEventId));

      if (clearError) {
        // If column doesn't exist, try without winner_position
        if (clearError.message.includes('winner_position') || clearError.message.includes('column')) {
          const { error: fallbackError } = await supabase
            .from('event_registrations')
            .update({ is_winner: false })
            .eq('event_id', parseInt(selectedEventId));
          
          if (fallbackError) throw fallbackError;
          toast.warning('Winner position feature requires database migration. Please run the migration first.');
          return;
        }
        throw clearError;
      }

      // Update winners
      const updates: Promise<any>[] = [];

      if (winners.first) {
        updates.push(
          supabase
            .from('event_registrations')
            .update({ 
              is_winner: true,
              winner_position: 1 
            })
            .eq('id', winners.first)
        );
      }

      if (winners.second) {
        updates.push(
          supabase
            .from('event_registrations')
            .update({ 
              is_winner: true,
              winner_position: 2 
            })
            .eq('id', winners.second)
        );
      }

      if (winners.third) {
        updates.push(
          supabase
            .from('event_registrations')
            .update({ 
              is_winner: true,
              winner_position: 3 
            })
            .eq('id', winners.third)
        );
      }

      // Execute all updates
      const results = await Promise.all(updates);
      
      // Check for errors
      for (const result of results) {
        if (result.error) {
          // If column doesn't exist, try without winner_position
          if (result.error.message.includes('winner_position') || result.error.message.includes('column')) {
            toast.warning('Winner position feature requires database migration. Please run the migration first.');
            // Fallback: update only is_winner
            const fallbackUpdates: Promise<any>[] = [];
            if (winners.first) {
              fallbackUpdates.push(
                supabase.from('event_registrations').update({ is_winner: true }).eq('id', winners.first)
              );
            }
            if (winners.second) {
              fallbackUpdates.push(
                supabase.from('event_registrations').update({ is_winner: true }).eq('id', winners.second)
              );
            }
            if (winners.third) {
              fallbackUpdates.push(
                supabase.from('event_registrations').update({ is_winner: true }).eq('id', winners.third)
              );
            }
            await Promise.all(fallbackUpdates);
            toast.info('Winners marked (without position). Please run migration to enable position tracking.');
            await fetchParticipants();
            return;
          }
          throw result.error;
        }
      }

      toast.success('Winners assigned successfully!');
      await fetchParticipants(); // Refresh data
    } catch (error) {
      console.error('Error saving winners:', error);
      toast.error('Failed to save winners');
    } finally {
      setSaving(false);
    }
  };

  const handleClearWinners = () => {
    setWinners({ first: null, second: null, third: null });
  };

  const getWinnerBadge = (participantId: number) => {
    if (winners.first === participantId) {
      return <Badge className="bg-yellow-500 text-white"><Trophy className="h-3 w-3 mr-1" />1st Place</Badge>;
    }
    if (winners.second === participantId) {
      return <Badge className="bg-gray-400 text-white"><Medal className="h-3 w-3 mr-1" />2nd Place</Badge>;
    }
    if (winners.third === participantId) {
      return <Badge className="bg-orange-600 text-white"><Award className="h-3 w-3 mr-1" />3rd Place</Badge>;
    }
    return null;
  };

  const winnersList = [
    { position: 'first' as const, label: '1st Place', icon: Trophy, color: 'bg-yellow-500' },
    { position: 'second' as const, label: '2nd Place', icon: Medal, color: 'bg-gray-400' },
    { position: 'third' as const, label: '3rd Place', icon: Award, color: 'bg-orange-600' }
  ];

  const normalParticipants = participants.filter(
    p => p.id !== winners.first && p.id !== winners.second && p.id !== winners.third
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Assign Winners</h1>
        <p className="text-muted-foreground mt-2">
          Select and assign winners (1st, 2nd, 3rd place) for your events
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Event</CardTitle>
          <CardDescription>Choose an event to assign winners</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="text-sm h-9 sm:h-10 w-full sm:max-w-md">
              <SelectValue placeholder="Select an event..." />
            </SelectTrigger>
            <SelectContent className="w-full sm:max-w-md">
              <div className="p-2">
                <Input
                  placeholder="Search event..."
                  value={assignEventQuery}
                  onChange={(e) => setAssignEventQuery(e.target.value)}
                  className="mb-2 text-xs"
                  onKeyDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="max-h-64 overflow-y-auto">
                  {organizerEvents
                    .filter(ev => ev.title.toLowerCase().includes(assignEventQuery.toLowerCase()))
                    .map((event) => (
                      <SelectItem key={event.id} value={event.id.toString()}>
                        {event.title} - {format(new Date(event.start_time), 'MMM dd, yyyy')}
                      </SelectItem>
                    ))}
                </div>
              </div>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedEventId && (
        <>
          {loading ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">Loading participants...</div>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="winners" className="space-y-6">
              <TabsList>
                <TabsTrigger value="winners" className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Winners
                </TabsTrigger>
                <TabsTrigger value="participants" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  All Participants
                </TabsTrigger>
              </TabsList>

            {/* Winners Tab */}
            <TabsContent value="winners" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Assign Winners</CardTitle>
                  <CardDescription>
                    Select participants for 1st, 2nd, and 3rd place
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {winnersList.map(({ position, label, icon: Icon, color }) => (
                    <div key={position} className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${color.replace('bg-', 'text-')}`} />
                        {label}
                      </label>
                          <Select
                            value={winners[position]?.toString() || 'none'}
                            onValueChange={(value) => handleWinnerSelect(position, value === 'none' ? null : parseInt(value))}
                          >
                            <SelectTrigger className="text-sm h-9 sm:h-10 w-full">
                              <SelectValue placeholder={`Select ${label} winner...`} />
                            </SelectTrigger>
                            <SelectContent className="w-full sm:max-w-md">
                              <div className="p-2">
                                <Input
                                  placeholder="Search participant..."
                                  value={participantQuery}
                                  onChange={(e) => setParticipantQuery(e.target.value)}
                                  className="mb-2 text-xs"
                                  onKeyDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="max-h-56 overflow-y-auto">
                                  <SelectItem value="none">None</SelectItem>
                                  {participants.length > 0 ? (
                                    participants
                                      .filter(p => {
                                        // Don't show if already selected in another position
                                        if (position === 'first' && (winners.second === p.id || winners.third === p.id)) return false;
                                        if (position === 'second' && (winners.first === p.id || winners.third === p.id)) return false;
                                        if (position === 'third' && (winners.first === p.id || winners.second === p.id)) return false;
                                        // Filter by participantQuery (name or roll)
                                        if (participantQuery && participantQuery.trim() !== '') {
                                          const q = participantQuery.toLowerCase();
                                          const name = (p.participant_name || p.profile?.name || '').toLowerCase();
                                          const roll = (p.roll_number || '').toLowerCase();
                                          return name.includes(q) || roll.includes(q);
                                        }
                                        return true;
                                      })
                                      .map((participant) => {
                                        const participantId = participant.id?.toString();
                                        if (!participantId || participantId === '') return null;
                                        return (
                                          <SelectItem key={participant.id} value={participantId}>
                                            {participant.participant_name || participant.profile?.name || 'Unknown'}
                                            {participant.roll_number && ` (${participant.roll_number})`}
                                          </SelectItem>
                                        );
                                      })
                                  ) : (
                                    <SelectItem value="no-participants" disabled>No participants available</SelectItem>
                                  )}
                                </div>
                              </div>
                            </SelectContent>
                          </Select>
                      {winners[position] && (
                        <div className="p-3 bg-muted rounded-md">
                          {(() => {
                            const winner = participants.find(p => p.id === winners[position]);
                            if (!winner) return null;
                            return (
                              <div className="text-sm">
                                <p className="font-medium">{winner.participant_name || winner.profile?.name}</p>
                                {winner.roll_number && <p className="text-muted-foreground">Roll: {winner.roll_number}</p>}
                                {winner.department && <p className="text-muted-foreground">Dept: {winner.department}</p>}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveWinners} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Winners'}
                    </Button>
                    <Button variant="outline" onClick={handleClearWinners}>
                      <X className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Display Current Winners */}
              {(winners.first || winners.second || winners.third) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Current Winners</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {winnersList.map(({ position, label, icon: Icon, color }) => {
                        const winner = winners[position] 
                          ? participants.find(p => p.id === winners[position])
                          : null;
                        
                        if (!winner) return null;

                        return (
                          <div key={position} className={`p-4 rounded-lg border-2 ${color} border-opacity-20 bg-gradient-to-r ${color} bg-opacity-10`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${color} text-white`}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-bold text-lg">{label}</p>
                                  <p className="text-sm font-medium">{winner.participant_name || winner.profile?.name}</p>
                                  {winner.roll_number && <p className="text-xs text-muted-foreground">Roll: {winner.roll_number}</p>}
                                  {winner.department && <p className="text-xs text-muted-foreground">{winner.department}</p>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* All Participants Tab */}
            <TabsContent value="participants" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Participants ({participants.length})</CardTitle>
                  <CardDescription>
                    View all registered participants for this event
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">Loading participants...</div>
                  ) : participants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No participants found for this event
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Roll Number</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Year</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Winner Position</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {participants.map((participant) => (
                            <TableRow key={participant.id}>
                              <TableCell className="font-medium">
                                {participant.participant_name || participant.profile?.name || 'Unknown'}
                              </TableCell>
                              <TableCell>{participant.roll_number || '-'}</TableCell>
                              <TableCell>{participant.department || '-'}</TableCell>
                              <TableCell>{participant.class || '-'}</TableCell>
                              <TableCell>{participant.year || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  participant.status === 'attended' ? 'default' :
                                  participant.status === 'registered' ? 'secondary' : 'outline'
                                }>
                                  {participant.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {getWinnerBadge(participant.id) || (
                                  <span className="text-muted-foreground">Normal Participant</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          )}
        </>
      )}
    </div>
  );
};

export default AssignWinners;

