import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { databaseService } from '@/utils/databaseService';
import { Award } from 'lucide-react';

const EventAttendees: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events } = useEvents();

  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [exporting, setExporting] = useState(false);
  const [certificates, setCertificates] = useState<Record<string, string>>({});

  const event = events.find(e => String(e.id) === String(id));
  const isCreator = user && event && event.organizer_id === user.id;
  const isAdmin = user && user.role === 'admin';

  const fetchAttendees = async () => {
    if (!id) return;
    setLoading(true);
    const res = await databaseService.searchParticipants({
      eventId: id,
      q: q || undefined,
      department: department || undefined,
      page,
      pageSize,
    });
    if (!res.success) {
      toast.error(res.message || 'Failed to load attendees');
      setAttendees([]);
      setTotal(null);
    } else {
      setAttendees(res.data.items);
      setTotal(res.data.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAttendees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, page]);

  // Fetch certificates for attendees
  useEffect(() => {
    const fetchCertificates = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase
          .from('certificates')
          .select('id, student_id')
          .eq('event_id', id);
        
        if (!error && data) {
          const certMap: Record<string, string> = {};
          data.forEach(cert => {
            certMap[cert.student_id] = cert.id;
          });
          setCertificates(certMap);
        }
      } catch (err) {
        console.error('Error fetching certificates:', err);
      }
    };
    fetchCertificates();
  }, [id]);

  const markAttendance = async (registrationId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'attended' ? 'registered' : 'attended';
      const { error } = await supabase
        .from('event_registrations')
        .update({ 
          status: newStatus,
          check_in_time: newStatus === 'attended' ? new Date().toISOString() : null
        })
        .eq('id', registrationId);
      if (error) throw error;
      toast.success(newStatus === 'attended' ? 'Attendance marked!' : 'Attendance unmarked');
      // Refresh attendees
      fetchAttendees();
    } catch (err) {
      console.error('Error marking attendance:', err);
      toast.error('Failed to mark attendance');
    }
  };

  if (!event) {
    return (
      <div className="text-center py-12">
        <div className="text-lg mb-4">Event not found</div>
        <Button onClick={() => navigate('/events')}>Back to Events</Button>
      </div>
    );
  }

  if (!isCreator && !isAdmin) {
    return (
      <div className="text-center py-12">
        <div className="text-lg mb-4">
          You don't have permission to view the attendees for this event.
        </div>
        <Button onClick={() => navigate(`/events/${id}`)}>Back to Event</Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link to={`/events/${id}`} className="text-primary hover:underline">
          &larr; Back to Event
        </Link>
      </div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Event Attendees</h1>
        <p className="text-gray-600">{event.title}</p>
      </header>
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Input 
            placeholder="Search name, roll no, department, class" 
            value={q} 
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                fetchAttendees();
              }
            }}
          />
        </div>
        <Input 
          placeholder="Department" 
          value={department} 
          onChange={(e) => {
            setDepartment(e.target.value);
            setPage(1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              fetchAttendees();
            }
          }}
        />
        <div className="md:col-span-3 flex items-center gap-2">
          <Button onClick={() => { setPage(1); fetchAttendees(); }}>Apply Filters</Button>
          <Button variant="secondary" onClick={() => { setQ(''); setDepartment(''); setPage(1); fetchAttendees(); }}>Reset</Button>
          <Button variant="outline" onClick={async () => {
            try {
              setExporting(true);
              const perPage = 1000;
              let currentPage = 1;
              let allItems: any[] = [];
              // fetch first page to get total
              const first = await databaseService.searchParticipants({
                eventId: id,
                q: q || undefined,
                department: department || undefined,
                page: currentPage,
                pageSize: perPage,
              });
              if (!first.success) {
                toast.error(first.message || 'Failed to export');
                setExporting(false);
                return;
              }
              allItems = first.data.items || [];
              const total = first.data.total || allItems.length;
              const totalPages = Math.ceil(total / perPage);
              while (currentPage < totalPages) {
                currentPage += 1;
                const res = await databaseService.searchParticipants({
                  eventId: id,
                  q: q || undefined,
                  department: department || undefined,
                  page: currentPage,
                  pageSize: perPage,
                });
                if (!res.success) break;
                allItems = allItems.concat(res.data.items || []);
              }

              const headers = [
                'Event ID','Event Title','Venue','Start Time',
                'Participant Name','Email','Role','Roll Number','Department','Class','Year',
                'Status','Registered At','Check-in Time','Winner','Remarks'
              ];
              const escapeCsv = (val: any) => {
                if (val === null || val === undefined) return '';
                const s = String(val);
                if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
                return s;
              };
              const rows = allItems.map(it => [
                it.events?.id ?? '',
                it.events?.title ?? it.events?.event_name ?? '',
                it.events?.venue ?? '',
                it.events?.start_time ? new Date(it.events.start_time).toISOString() : '',
                it.profile?.name ?? it.participant_name ?? '',
                it.profile?.email ?? '',
                it.profile?.role ?? '',
                it.roll_number ?? '',
                it.department ?? '',
                it.class ?? '',
                it.year ?? '',
                it.status ?? '',
                it.registration_time ? new Date(it.registration_time).toISOString() : '',
                it.check_in_time ? new Date(it.check_in_time).toISOString() : '',
                typeof it.is_winner === 'boolean' ? (it.is_winner ? 'true' : 'false') : '',
                it.remarks ?? ''
              ]);
              const csv = [headers, ...rows].map(r => r.map(escapeCsv).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              const filenameBase = (event?.title || 'event').toString().replace(/[^a-z0-9-_]+/gi,'_');
              a.download = `${filenameBase}_participants.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              toast.success('CSV exported');
            } catch (e) {
              toast.error('Failed to export CSV');
            } finally {
              setExporting(false);
            }
          }} disabled={exporting}>{exporting ? 'Exporting…' : 'Export CSV'}</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Attendees</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading attendees...</div>
          ) : attendees.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No attendees registered yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-lg shadow border border-border bg-card dark:bg-gray-800">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted dark:bg-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Registration Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Profile Created</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Attendance</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((entry, idx) => (
                    <tr
                      key={entry.id}
                      className={
                        idx % 2 === 0
                          ? 'bg-card dark:bg-gray-800 hover:bg-muted dark:hover:bg-gray-700 transition-colors'
                          : 'bg-muted dark:bg-gray-700 hover:bg-muted/80 dark:hover:bg-gray-600 transition-colors'
                      }
                    >
                      <td className="px-6 py-3 font-bold">{entry.profile?.name || entry.participant_name || 'Unknown'}</td>
                      <td className="px-6 py-3 text-muted-foreground">{entry.profile?.email || 'No email'}</td>
                      <td className="px-6 py-3">
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700 border border-blue-100">
                          {entry.profile?.role || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-700 whitespace-nowrap">{entry.registration_time ? new Date(entry.registration_time).toLocaleString() : 'N/A'}</td>
                      <td className="px-6 py-3 text-gray-700 whitespace-nowrap">{entry.profile?.created_at ? new Date(entry.profile.created_at).toLocaleString() : 'N/A'}</td>
                      <td className="px-6 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={entry.status === 'attended'}
                          onChange={() => markAttendance(entry.id, entry.status)}
                          className="h-4 w-4 accent-green-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-3">
                        {certificates[entry.user_id] ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/certificate/${certificates[entry.user_id]}`)}
                            className="flex items-center gap-1"
                          >
                            <Award size={14} />
                            View Certificate
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-sm">Not issued</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-sm text-gray-600">
                  {total !== null ? `Total: ${total}` : ''}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="secondary" onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventAttendees;
