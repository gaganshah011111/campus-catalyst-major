import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CalendarDays, MapPin, User, Mail, Hash, Building, GraduationCap, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface QRData {
  participant: {
    name: string;
    email: string;
    roll_number?: string;
    department?: string;
    year?: string;
    class?: string;
    profile_photo_url?: string;
  };
  event: {
    id: number;
    title: string;
    description?: string;
    location: string;
    start_time: string;
    end_time?: string;
  };
  user_id?: string;
  event_id?: number;
  registration_id?: number;
  issued_at?: string;
  exp?: number;
}

const QRDetailsView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid QR code');
      setLoading(false);
      return;
    }

    try {
      // Decode the base64 token
      const decoded = JSON.parse(atob(token));
      
      // Check if it has the required structure
      if (decoded.participant && decoded.event) {
        setQrData(decoded);
      } else {
        setError('Invalid QR code format');
      }
    } catch (e) {
      console.error('Error decoding QR token:', e);
      setError('Invalid QR code format');
    } finally {
      setLoading(false);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
              <div className="flex justify-center py-8">
                <Skeleton className="h-32 w-32 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !qrData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="p-6 text-center">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || 'QR code data not found'}</AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/')} className="mt-4">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { participant, event } = qrData;
  const isExpired = qrData.exp && Date.now() > qrData.exp;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Event Registration Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isExpired && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>This QR code has expired</AlertDescription>
              </Alert>
            )}

            {/* Participant Photo */}
            {participant.profile_photo_url && (
              <div className="flex justify-center">
                <img
                  src={participant.profile_photo_url}
                  alt={participant.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Participant Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Participant Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{participant.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{participant.email}</p>
                  </div>
                </div>

                {participant.roll_number && (
                  <div className="flex items-start gap-3">
                    <Hash className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Roll Number</p>
                      <p className="font-medium">{participant.roll_number}</p>
                    </div>
                  </div>
                )}

                {participant.department && (
                  <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Department</p>
                      <p className="font-medium">{participant.department}</p>
                    </div>
                  </div>
                )}

                {participant.year && (
                  <div className="flex items-start gap-3">
                    <GraduationCap className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Year</p>
                      <p className="font-medium">{participant.year}</p>
                    </div>
                  </div>
                )}

                {participant.class && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Semester</p>
                      <p className="font-medium">{participant.class}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Event Details */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold border-b pb-2">Event Information</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Event Title</p>
                  <p className="font-semibold text-lg">{event.title}</p>
                </div>

                {event.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{event.description}</p>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <CalendarDays className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date & Time</p>
                    <p className="font-medium">
                      {format(new Date(event.start_time), 'EEEE, MMMM d, yyyy • h:mm a')}
                      {event.end_time && ` - ${format(new Date(event.end_time), 'h:mm a')}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{event.location}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                <p className="font-semibold mb-1">Security Notice</p>
                <p className="text-sm">
                  Please verify the participant's identity with their college ID card before allowing entry.
                </p>
                <p className="text-sm mt-2">
                  <strong>For Organizers:</strong> Use the app's QR scanner to check in participants and mark attendance.
                </p>
              </AlertDescription>
            </Alert>

            <div className="flex justify-center pt-4">
              <Button onClick={() => navigate('/')} variant="outline">
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QRDetailsView;

