import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, CheckCircle2, XCircle, AlertTriangle, Loader2, ShieldCheck, User, Mail, Hash, Building2, Calendar, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ParticipantDetails {
  name: string;
  email: string;
  roll_number?: string;
  department?: string;
  year?: string;
  class?: string;
  profile_photo_url?: string;
}

interface ValidationResponse {
  valid: boolean;
  success?: boolean;
  message?: string;
  error?: string;
  validationError?: string;
  already_checked_in?: boolean;
  checked_in_at?: string;
  participant?: ParticipantDetails;
  event?: {
    title: string;
    start_time?: string;
  };
  qrData?: any;
}

const QRScanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile photo from registration if we have registration ID
  useEffect(() => {
    const fetchProfilePhoto = async () => {
      if (!validationResult?.participant || !validationResult.qrData) {
        console.log('No validation result or qrData, skipping profile photo fetch');
        return;
      }
      
      try {
        // Try to get registration ID from QR data - check multiple possible locations
        const registrationId = validationResult.qrData.registration_id || 
                              validationResult.qrData.rid ||
                              validationResult.qrData.registrationId ||
                              validationResult.qrData.event?.registration_id ||
                              validationResult.qrData.event?.rid;
        
        console.log('Looking for registration ID:', {
          registration_id: validationResult.qrData.registration_id,
          rid: validationResult.qrData.rid,
          registrationId: validationResult.qrData.registrationId,
          event_registration_id: validationResult.qrData.event?.registration_id,
          event_rid: validationResult.qrData.event?.rid,
          found: registrationId
        });
        
        if (registrationId) {
          console.log('Fetching profile photo for registration ID:', registrationId);
          const { data, error } = await supabase
            .from('event_registrations')
            .select('profile_photo_url')
            .eq('id', parseInt(registrationId)) // Ensure it's a number
            .single();
          
          console.log('Profile photo fetch result:', { data, error });
          
          if (!error && data?.profile_photo_url) {
            console.log('Setting profile photo URL:', data.profile_photo_url);
            setProfilePhotoUrl(data.profile_photo_url);
          } else if (error) {
            console.error('Error fetching profile photo:', error);
          }
        } else {
          console.log('No registration ID found in QR data');
        }
      } catch (error) {
        console.error('Error fetching profile photo:', error);
      }
    };

    fetchProfilePhoto();
  }, [validationResult]);

  const parseQRData = (qrToken: string) => {
    try {
      // First, check if it's plain text format (human-readable)
      // Check for compact format (N:, E:, T:, etc.) or full format
      if (qrToken.includes('EVENT TICKET') || qrToken.includes('PARTICIPANT:') || 
          qrToken.includes('EVENT REGISTRATION TICKET') || qrToken.includes('PARTICIPANT INFORMATION') ||
          qrToken.includes('|') && (qrToken.includes('N:') || qrToken.includes('E:') || qrToken.includes('T:'))) {
        return parseTextFormat(qrToken);
      }
      
      let tokenToDecode = qrToken;
      
      // Check if it's a URL format
      if (qrToken.startsWith('http://') || qrToken.startsWith('https://')) {
        // Extract token from URL (e.g., /qr/TOKEN)
        const urlParts = qrToken.split('/qr/');
        if (urlParts.length > 1) {
          tokenToDecode = urlParts[1];
        } else {
          // Try to extract from full URL
          const match = qrToken.match(/\/qr\/([^/?]+)/);
          if (match && match[1]) {
            tokenToDecode = match[1];
          } else {
            return null;
          }
        }
      }
      
      // Try to decode the QR token to get embedded data
      const decoded = JSON.parse(atob(tokenToDecode));
      
      // Check if it contains participant and event data
      if (decoded.participant && decoded.event) {
        return {
          participant: decoded.participant,
          event: decoded.event,
          tokenData: decoded,
          originalToken: tokenToDecode,
        };
      }
      return null;
    } catch (e) {
      // QR token might be in a different format, try parsing as text
      console.log('Could not parse QR data as JSON, trying text format:', e);
      return parseTextFormat(qrToken);
    }
  };

  const parseTextFormat = (text: string) => {
    try {
      console.log('Parsing QR text:', text);
      const participant: any = {};
      const event: any = {};
      
      // Handle both pipe-separated (compact) and newline-separated (old format)
      const parts = text.includes('|') ? text.split('|') : text.split('\n');
      
      console.log('Split parts:', parts);
      
      let currentSection = '';
      
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        
        console.log('Processing part:', trimmed);
        
        // Detect sections
        if (trimmed === 'PARTICIPANT:' || trimmed.includes('PARTICIPANT INFORMATION')) {
          currentSection = 'participant';
          continue;
        }
        
        if (trimmed === 'EVENT:' || trimmed.includes('EVENT INFORMATION')) {
          currentSection = 'event';
          continue;
        }
        
        // Parse compact format (N:, E:, R:, etc.) or full format
        // Check compact format first (single letter prefix)
        if (trimmed.startsWith('N:')) {
          participant.name = trimmed.substring(2).trim();
          console.log('Found name:', participant.name);
        } else if (trimmed.startsWith('E:')) {
          participant.email = trimmed.substring(2).trim();
          console.log('Found email:', participant.email);
        } else if (trimmed.startsWith('R:')) {
          participant.roll_number = trimmed.substring(2).trim();
          console.log('Found roll:', participant.roll_number);
        } else if (trimmed.startsWith('D:')) {
          participant.department = trimmed.substring(2).trim();
          console.log('Found department:', participant.department);
        } else if (trimmed.startsWith('Y:')) {
          participant.year = trimmed.substring(2).trim();
          console.log('Found year:', participant.year);
        } else if (trimmed.startsWith('S:')) {
          participant.class = trimmed.substring(2).trim();
          console.log('Found semester:', participant.class);
        } else if (trimmed.startsWith('T:')) {
          event.title = trimmed.substring(2).trim();
          console.log('Found title:', event.title);
        } else if (trimmed.startsWith('L:')) {
          event.location = trimmed.substring(2).trim();
          console.log('Found location:', event.location);
        } else if (trimmed.startsWith('DT:')) {
          // Compact date format: YYYYMMDD
          const dateStr = trimmed.substring(3).trim();
          console.log('Found date string:', dateStr);
          if (dateStr.length === 8) {
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            try {
              const date = new Date(`${year}-${month}-${day}`);
              event.start_time = date.toISOString();
              console.log('Parsed date:', event.start_time);
            } catch (e) {
              console.error('Date parse error:', e);
              event.start_time = `${year}-${month}-${day}`;
            }
          }
        } else if (trimmed.startsWith('TM:')) {
          // Compact time format: HHMM
          const timeStr = trimmed.substring(3).trim();
          console.log('Found time string:', timeStr);
          if (timeStr.length === 4) {
            const hours = parseInt(timeStr.substring(0, 2));
            const minutes = parseInt(timeStr.substring(2, 4));
            if (event.start_time) {
              try {
                const date = new Date(event.start_time);
                date.setHours(hours, minutes);
                event.start_time = date.toISOString();
                console.log('Updated time:', event.start_time);
              } catch (e) {
                console.error('Time parse error:', e);
              }
            } else {
              // Create new date with today's date and the time
              try {
                const today = new Date();
                today.setHours(hours, minutes, 0, 0);
                event.start_time = today.toISOString();
                console.log('Created date with time:', event.start_time);
              } catch (e) {
                console.error('Time creation error:', e);
              }
            }
          }
        } else if (trimmed.startsWith('EID:')) {
          event.id = trimmed.substring(4).trim();
          console.log('Found event ID:', event.id);
        } else if (trimmed.startsWith('RID:')) {
          // Registration ID - store it for fetching profile photo
          const rid = trimmed.substring(4).trim();
          console.log('Found registration ID:', rid);
          // Store in event object for now, we'll extract it later
          event.registration_id = rid;
        } else if (trimmed.startsWith('Name:')) {
          participant.name = trimmed.substring(5).trim();
        } else if (trimmed.startsWith('Email:')) {
          participant.email = trimmed.substring(6).trim();
        } else if (trimmed.startsWith('Roll:') || trimmed.startsWith('Roll Number:')) {
          participant.roll_number = trimmed.replace(/^Roll( Number)?:/, '').trim();
        } else if (trimmed.startsWith('Dept:') || trimmed.startsWith('Department:')) {
          participant.department = trimmed.replace(/^Dept(artment)?:/, '').trim();
        } else if (trimmed.startsWith('Year:')) {
          participant.year = trimmed.substring(5).trim();
        } else if (trimmed.startsWith('Sem:') || trimmed.startsWith('Semester:')) {
          participant.class = trimmed.replace(/^Sem(ester)?:/, '').trim();
        } else if (trimmed.startsWith('Title:') || trimmed.startsWith('Event:')) {
          event.title = trimmed.replace(/^(Title|Event):/, '').trim();
        } else if (trimmed.startsWith('Loc:') || trimmed.startsWith('Location:')) {
          event.location = trimmed.replace(/^Loc(ation)?:/, '').trim();
        } else if (trimmed.startsWith('Date:')) {
          const dateStr = trimmed.substring(5).trim();
          try {
            event.start_time = new Date(dateStr).toISOString();
          } catch (e) {
            event.start_time = dateStr;
          }
        } else if (trimmed.startsWith('Time:')) {
          const timeStr = trimmed.substring(5).trim();
          if (event.start_time) {
            try {
              const date = new Date(event.start_time);
              const [hours, minutes] = timeStr.split(':');
              if (hours && minutes) {
                date.setHours(parseInt(hours), parseInt(minutes));
                event.start_time = date.toISOString();
              }
            } catch (e) {
              // Keep original
            }
          }
        } else if (trimmed.startsWith('Date & Time:')) {
          const dateTimeStr = trimmed.substring(12).trim();
          try {
            event.start_time = new Date(dateTimeStr).toISOString();
          } catch (e) {
            event.start_time = dateTimeStr;
          }
        } else if (trimmed.startsWith('End Time:')) {
          const endTimeStr = trimmed.substring(9).trim();
          try {
            event.end_time = new Date(endTimeStr).toISOString();
          } catch (e) {
            event.end_time = endTimeStr;
          }
        } else if (trimmed.startsWith('Description:')) {
          event.description = trimmed.substring(12).trim();
        } else if (trimmed.startsWith('ID:')) {
          const ids = trimmed.substring(3).trim().split('-');
          if (ids.length >= 2) {
            event.id = ids[0];
          }
        }
      }
      
      console.log('Parsed participant:', participant);
      console.log('Parsed event:', event);
      
      // Return data even if name or title is missing - we'll show what we have
      if (Object.keys(participant).length > 0 || Object.keys(event).length > 0) {
        return {
          participant,
          event,
          tokenData: { 
            participant, 
            event,
            registration_id: event.registration_id || event.rid || null,
            rid: event.registration_id || event.rid || null,
          },
          originalToken: text,
          isTextFormat: true,
        };
      }
      
      return null;
    } catch (e) {
      console.error('Error parsing text format:', e, text);
      return null;
    }
  };

  const validateQRToken = async (qrToken: string) => {
    setIsValidating(true);
    setValidationResult(null);
    setProfilePhotoUrl(null); // Reset profile photo for new scan

    // First, try to parse and display data directly from QR code
    const qrData = parseQRData(qrToken);
    
    if (qrData) {
      // Display the data immediately from QR code
      console.log('Setting validation result with qrData:', qrData);
      console.log('TokenData:', qrData.tokenData);
      console.log('Participant data:', qrData.participant);
      console.log('Event data:', qrData.event);
      
      const participantData = qrData.participant || {};
      const eventData = qrData.event || {};
      
      setValidationResult({
        valid: true,
        success: false, // Not checked in yet, just displaying info
        message: 'QR Code scanned successfully. All details displayed below.',
        participant: participantData,
        event: {
          title: eventData.title || '',
          location: eventData.location || '',
          start_time: eventData.start_time || '',
          end_time: eventData.end_time || '',
        },
        qrData: qrData.tokenData || { 
          participant: participantData, 
          event: eventData,
          registration_id: eventData.registration_id || eventData.rid || null,
          rid: eventData.registration_id || eventData.rid || null,
        }, // Store for validation and profile photo fetching
      });
      
      console.log('Validation result set with participant keys:', Object.keys(participantData));
      console.log('Validation result set with event keys:', Object.keys(eventData));
      
      // Still validate with server for check-in, but don't wait for it to show data
      // Use the original token for server validation (only if it's not text format)
      if (!qrData.isTextFormat && qrData.originalToken) {
        validateWithServer(qrData.originalToken, qrData);
      } else {
        // For text format, we can't validate with server, but we can still show the data
        setIsValidating(false);
        toast.info('QR code scanned. Details displayed. Use app scanner for check-in functionality.');
      }
    } else {
      // If QR code doesn't contain embedded data, validate with server
      await validateWithServer(qrToken, null);
    }
  };

  const validateWithServer = async (qrToken: string, qrData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-qr-checkin', {
        body: { qr_token: qrToken },
      });

      if (error) {
        console.error('Validation error:', error);
        // If we already have data from QR code, keep showing it but mark as validation failed
        if (qrData) {
          setValidationResult(prev => prev ? {
            ...prev,
            validationError: error.message || 'Server validation failed',
          } : {
            valid: false,
            error: error.message || 'Validation failed',
          });
        } else {
          setValidationResult({
            valid: false,
            error: error.message || 'Validation failed',
          });
          toast.error('Validation failed');
        }
        return;
      }

      // Update with server response (which may have more accurate data)
      setValidationResult(data);
      
      if (data.success) {
        toast.success(data.message || 'Check-in successful!');
      } else if (data.already_checked_in) {
        toast.info('Participant already checked in');
      } else {
        toast.error(data.error || 'Invalid QR code');
      }
    } catch (err: any) {
      console.error('Error validating QR:', err);
      // If we have QR data, keep showing it
      if (!qrData) {
        setValidationResult({
          valid: false,
          error: 'Network error, please try again',
        });
        toast.error('Network error');
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    try {
      // Use jsQR library to decode QR from image
      const image = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        image.onload = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.drawImage(image, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Dynamic import jsQR
          const jsQR = (await import('jsqr')).default;
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code) {
            await validateQRToken(code.data);
          } else {
            toast.error('No QR code found in image');
            setValidationResult({
              valid: false,
              error: 'No QR code detected in image',
            });
          }
          setIsScanning(false);
        };
        image.src = e.target?.result as string;
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error scanning QR:', error);
      toast.error('Failed to scan QR code');
      setIsScanning(false);
    }
  };

  const handleManualValidation = () => {
    if (!manualToken.trim()) {
      toast.error('Please enter a QR token');
      return;
    }
    validateQRToken(manualToken.trim());
  };

  const renderValidationResult = () => {
    if (!validationResult) return null;

    console.log('Rendering validation result:', validationResult);
    console.log('Profile photo URL:', profilePhotoUrl);

    // Handle already_checked_in case first (has its own UI)
    if (validationResult.already_checked_in) {
      return (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold text-orange-900 dark:text-orange-100">
                {validationResult.error}
              </p>
              <p className="text-sm">
                Checked in at: {new Date(validationResult.checked_in_at!).toLocaleString()}
              </p>
              {validationResult.participant && (
                <p className="text-sm">
                  Participant: {validationResult.participant.name}
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    // Handle clear error case (no data at all)
    if (validationResult.error && !validationResult.valid && !validationResult.participant && !validationResult.event && !validationResult.qrData) {
      return (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <p className="font-semibold text-red-900 dark:text-red-100">
              {validationResult.error || 'Invalid QR code'}
            </p>
          </AlertDescription>
        </Alert>
      );
    }

    // For all other cases (valid QR codes with data), show the new UI card
    // Check if we have any participant or event data to display
    const hasParticipantData = validationResult.participant && Object.keys(validationResult.participant).length > 0;
    const hasEventData = validationResult.event && (
      validationResult.event.title || 
      validationResult.event.location || 
      validationResult.event.start_time
    );
    const hasData = hasParticipantData || hasEventData;

    // Show new UI card - this will catch all valid QR scans with data
    if (true) { // Always show new UI for any validation result that reaches here
      const participant = validationResult.participant || {};
      const event = validationResult.event || {};
      const photoUrl = profilePhotoUrl || participant.profile_photo_url;
      const initials = participant.name 
        ? participant.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';
      
      console.log('Rendering new UI with participant:', participant, 'event:', event, 'photoUrl:', photoUrl);
      console.log('Has participant data:', hasParticipantData, 'Has event data:', hasEventData);
      
      return (
        <Card className="border-2 border-green-500 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-full">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg text-green-900 dark:text-green-100">
                    {validationResult.success ? 'Verified & Checked In' : 'QR Code Verified'}
                  </CardTitle>
                  <CardDescription className="text-green-700 dark:text-green-300">
                    {validationResult.message || 'Participant information verified'}
                  </CardDescription>
                </div>
              </div>
              {validationResult.success && (
                <Badge className="bg-green-500 text-white px-3 py-1">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Checked In
                </Badge>
              )}
            </div>
            {validationResult.validationError && (
              <Alert className="mt-3 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-900 dark:text-yellow-100 text-sm">
                  {validationResult.validationError}
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent className="p-6">
            {(hasParticipantData || hasEventData) ? (
              <div className="space-y-6">
                {/* Profile Section - Show if we have participant data */}
                {hasParticipantData && (
                  <div className="flex flex-col items-center text-center pb-6 border-b">
                    <div className="relative mb-4">
                      <Avatar className="w-32 h-32 border-4 border-green-500 shadow-lg">
                        <AvatarImage 
                          src={photoUrl || undefined} 
                          alt={participant.name || 'Participant'}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-green-500 text-white text-2xl font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1.5 border-4 border-white shadow-md">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                      {participant.name || 'Unknown Participant'}
                    </h3>
                    {participant.email && (
                      <p className="text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
                        <Mail className="h-4 w-4" />
                        {participant.email}
                      </p>
                    )}
                  </div>
                )}

                {/* Participant Details - Show if we have participant data */}
                {hasParticipantData && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Participant Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {participant.roll_number && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Hash className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Roll Number</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{participant.roll_number}</p>
                        </div>
                      </div>
                    )}
                    {participant.department && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Building2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Department</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{participant.department}</p>
                        </div>
                      </div>
                    )}
                    {participant.year && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Year</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{participant.year}</p>
                        </div>
                      </div>
                    )}
                    {participant.class && (
                      <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Hash className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Class/Semester</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{participant.class}</p>
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                )}

                {/* Event Details */}
                {(event.title || event.location || event.start_time) && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Event Information
                    </h4>
                    <div className="space-y-3">
                      {event.title && (
                        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <Calendar className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Event Title</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{event.title}</p>
                          </div>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Location</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{event.location}</p>
                          </div>
                        </div>
                      )}
                      {event.start_time && (
                        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Date & Time</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {new Date(event.start_time).toLocaleString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Check-in Status */}
                {validationResult.checked_in_at && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Checked In At</p>
                        <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                          {new Date(validationResult.checked_in_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Notice */}
                <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900 dark:text-amber-100 text-sm">
                    <strong>Security Notice:</strong> Please verify the participant's identity with their college ID card before allowing entry.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-900 dark:text-yellow-100">
                    Participant details not found in QR code, but QR code was scanned successfully.
                  </AlertDescription>
                </Alert>
                {validationResult.qrData && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-semibold mb-2">Raw QR Data:</p>
                    <pre className="text-xs overflow-auto p-2 bg-white dark:bg-gray-900 rounded border">
                      {JSON.stringify(validationResult.qrData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    // Fallback - should never reach here, but just in case
    return (
      <Alert className="border-gray-500 bg-gray-50 dark:bg-gray-950">
        <AlertTriangle className="h-4 w-4 text-gray-600" />
        <AlertDescription>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            QR code scanned but unable to display data
          </p>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            QR Code Scanner
          </CardTitle>
          <CardDescription>
            Scan participant QR codes to verify and check them in to the event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Scanner */}
          <div className="space-y-4">
            <div className="text-center p-8 border-2 border-dashed rounded-lg">
              <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Upload a QR code image or take a photo
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning || isValidating}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Scan QR Code
                  </>
                )}
              </Button>
            </div>

            {/* Manual Token Input */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Or enter QR token manually:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste QR token here..."
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                  disabled={isValidating}
                />
                <Button
                  onClick={handleManualValidation}
                  disabled={isValidating || !manualToken.trim()}
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Validate'
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Validation Result */}
          {isValidating && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Validating QR code...</span>
            </div>
          )}

          {renderValidationResult()}

          {/* Security Tips */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm">Security Guidelines:</h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>✓ Always verify participant's college ID card</li>
              <li>✓ Check that photo on ID matches the person</li>
              <li>✓ Verify email domain matches institution</li>
              <li>✓ Each QR code can only be used once</li>
              <li>✓ QR codes expire 2 hours after event ends</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QRScanner;
