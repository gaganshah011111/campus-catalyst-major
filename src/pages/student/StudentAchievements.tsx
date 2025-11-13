import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Award, Users, Calendar, Search, X } from 'lucide-react';
import { format } from 'date-fns';

interface Achievement {
  id: number;
  event_id: number;
  winner_position: number | null;
  participant_name: string | null;
  event: {
    id: number;
    title: string;
    start_time: string;
    end_time: string | null;
    location: string | null;
  } | null;
  certificate: {
    id: number;
    issued_at: string;
  } | null;
}

const StudentAchievements: React.FC = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Fetch all registrations for the student (including all statuses to show all participation)
        const { data: registrations, error } = await supabase
          .from('event_registrations')
          .select(`
            id,
            event_id,
            winner_position,
            participant_name,
            status,
            events:event_id (
              id,
              title,
              start_time,
              end_time,
              location
            )
          `)
          .eq('user_id', user.id)
          .order('registration_time', { ascending: false });

        if (error) {
          console.error('Error fetching registrations:', error);
          throw error;
        }

        console.log('Fetched registrations:', registrations);

        // Filter out cancelled registrations, but keep registered and attended
        const validRegistrations = (registrations || []).filter(
          reg => reg.status !== 'cancelled' && reg.events
        );

        // Fetch certificates for these events
        const eventIds = validRegistrations.map(r => r.event_id).filter(id => id != null);
        let certificatesMap = new Map();
        
        if (eventIds.length > 0) {
          const { data: certificates, error: certError } = await supabase
            .from('certificates')
            .select('id, event_id, issued_at')
            .eq('student_id', user.id)
            .in('event_id', eventIds);
          
          if (certError) {
            console.warn('Error fetching certificates:', certError);
          } else if (certificates) {
            certificatesMap = new Map(
              certificates.map(cert => [cert.event_id, cert])
            );
          }
        }

        // Map registrations to achievements
        const achievementsData: Achievement[] = validRegistrations
          .map(reg => {
            // Handle both single event object and array (Supabase can return either)
            const eventData = Array.isArray(reg.events) ? reg.events[0] : reg.events;
            
            return {
              id: reg.id,
              event_id: reg.event_id,
              winner_position: reg.winner_position ?? null,
              participant_name: reg.participant_name ?? null,
              event: eventData || null,
              certificate: certificatesMap.get(reg.event_id) || null
            };
          })
          .filter(achievement => achievement.event !== null) // Only keep achievements with valid events
          // Sort by event start_time descending (most recent first)
          .sort((a, b) => {
            const dateA = new Date(a.event?.start_time || 0).getTime();
            const dateB = new Date(b.event?.start_time || 0).getTime();
            return dateB - dateA;
          });

        console.log('Processed achievements:', achievementsData);
        setAchievements(achievementsData);
      } catch (error) {
        console.error('Error fetching achievements:', error);
        setAchievements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [user]);

  const getPositionBadge = (position: number | null) => {
    if (position === 1) {
      return (
        <Badge className="bg-yellow-500 text-white px-3 py-1 text-sm">
          <Trophy className="h-4 w-4 mr-1" />
          1st Place
        </Badge>
      );
    }
    if (position === 2) {
      return (
        <Badge className="bg-gray-400 text-white px-3 py-1 text-sm">
          <Medal className="h-4 w-4 mr-1" />
          2nd Place
        </Badge>
      );
    }
    if (position === 3) {
      return (
        <Badge className="bg-orange-600 text-white px-3 py-1 text-sm">
          <Award className="h-4 w-4 mr-1" />
          3rd Place
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="px-3 py-1 text-sm">
        <Users className="h-4 w-4 mr-1" />
        Participant
      </Badge>
    );
  };

  const getPositionIcon = (position: number | null) => {
    if (position === 1) return <Trophy className="h-8 w-8 text-yellow-500" />;
    if (position === 2) return <Medal className="h-8 w-8 text-gray-400" />;
    if (position === 3) return <Award className="h-8 w-8 text-orange-600" />;
    return <Users className="h-8 w-8 text-blue-500" />;
  };

  // Filter achievements based on search query
  const filteredAchievements = useMemo(() => {
    if (!searchQuery.trim()) {
      return achievements;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return achievements.filter((achievement) => {
      const eventTitle = achievement.event?.title?.toLowerCase() || '';
      const location = achievement.event?.location?.toLowerCase() || '';
      const eventDate = achievement.event?.start_time 
        ? format(new Date(achievement.event.start_time), 'MMM dd, yyyy').toLowerCase()
        : '';
      const positionText = achievement.winner_position 
        ? `${achievement.winner_position}${achievement.winner_position === 1 ? 'st' : achievement.winner_position === 2 ? 'nd' : 'rd'} place`.toLowerCase()
        : 'participant';
      
      return (
        eventTitle.includes(query) ||
        location.includes(query) ||
        eventDate.includes(query) ||
        positionText.includes(query) ||
        (query.includes('first') || query.includes('1st')) && achievement.winner_position === 1 ||
        (query.includes('second') || query.includes('2nd')) && achievement.winner_position === 2 ||
        (query.includes('third') || query.includes('3rd')) && achievement.winner_position === 3 ||
        query === '1' && achievement.winner_position === 1 ||
        query === '2' && achievement.winner_position === 2 ||
        query === '3' && achievement.winner_position === 3
      );
    });
  }, [achievements, searchQuery]);

  const winners = filteredAchievements.filter(a => a.winner_position !== null);
  const participants = filteredAchievements.filter(a => a.winner_position === null);

  if (loading) {
    return (
      <div>
        <header className="mb-6">
          <h1 className="text-2xl font-bold mb-2">My Achievements</h1>
          <p className="text-gray-600">Your positions and achievements in events</p>
        </header>
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">My Achievements</h1>
        <p className="text-gray-600">Your positions and achievements in events</p>
      </header>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">1st Place</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {winners.filter(a => a.winner_position === 1).length}
            </div>
            {searchQuery && (
              <div className="text-xs text-gray-500 mt-1">
                of {achievements.filter(a => a.winner_position === 1).length} total
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">2nd Place</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">
              {winners.filter(a => a.winner_position === 2).length}
            </div>
            {searchQuery && (
              <div className="text-xs text-gray-500 mt-1">
                of {achievements.filter(a => a.winner_position === 2).length} total
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">3rd Place</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {winners.filter(a => a.winner_position === 3).length}
            </div>
            {searchQuery && (
              <div className="text-xs text-gray-500 mt-1">
                of {achievements.filter(a => a.winner_position === 3).length} total
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {filteredAchievements.length}
            </div>
            {searchQuery && (
              <div className="text-xs text-gray-500 mt-1">
                of {achievements.length} total
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      {achievements.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search achievements by event name, location, date, or position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Winners Section */}
      {winners.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Winning Positions
            {searchQuery && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({winners.length} {winners.length === 1 ? 'result' : 'results'})
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {winners.map((achievement) => (
              <Card key={achievement.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{achievement.event?.title || 'Unknown Event'}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4" />
                        {achievement.event?.start_time 
                          ? format(new Date(achievement.event.start_time), 'MMM dd, yyyy')
                          : 'Date unknown'}
                      </CardDescription>
                    </div>
                    {getPositionIcon(achievement.winner_position)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {getPositionBadge(achievement.winner_position)}
                    {achievement.event?.location && (
                      <p className="text-sm text-gray-600">📍 {achievement.event.location}</p>
                    )}
                    {achievement.certificate && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        ✓ Certificate Issued
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Participants Section */}
      {participants.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Participated Events
            {searchQuery && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({participants.length} {participants.length === 1 ? 'result' : 'results'})
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map((achievement) => (
              <Card key={achievement.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{achievement.event?.title || 'Unknown Event'}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4" />
                        {achievement.event?.start_time 
                          ? format(new Date(achievement.event.start_time), 'MMM dd, yyyy')
                          : 'Date unknown'}
                      </CardDescription>
                    </div>
                    {getPositionIcon(achievement.winner_position)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {getPositionBadge(achievement.winner_position)}
                    {achievement.event?.location && (
                      <p className="text-sm text-gray-600">📍 {achievement.event.location}</p>
                    )}
                    {achievement.certificate && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        ✓ Certificate Issued
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Empty State - No achievements at all */}
      {achievements.length === 0 && !loading && (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="py-16 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No achievements yet</h3>
            <p className="text-gray-500">
              Start participating in events to earn achievements and positions!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State - No search results */}
      {achievements.length > 0 && filteredAchievements.length === 0 && searchQuery && (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="py-16 text-center">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No achievements found</h3>
            <p className="text-gray-500 mb-4">
              No achievements match your search query "{searchQuery}".
            </p>
            <Button
              variant="outline"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentAchievements;

