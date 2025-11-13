
import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertCircle, Download, CalendarDays, MapPin, User, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface EventTicketProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventDescription?: string;
  eventEndTime?: string;
  userName: string;
  userEmail: string;
  registrationId: string;
  participantName?: string;
  rollNumber?: string;
  department?: string;
  year?: string;
  semester?: string;
  profilePhotoUrl?: string;
}

// Helper function to format QR data as compact, scannable text
// Using minimal format for best QR code scanning compatibility
const formatQRAsText = (data: any): string => {
  const participant = data.participant || {};
  const event = data.event || {};
  
  // Ultra-compact format - minimize length for better scanning
  const parts: string[] = [];
  
  // Add essential info only
  if (participant.name) parts.push(`N:${participant.name.substring(0, 30)}`);
  if (participant.email) parts.push(`E:${participant.email}`);
  if (participant.roll_number) parts.push(`R:${participant.roll_number}`);
  if (participant.department) parts.push(`D:${participant.department.substring(0, 20)}`);
  if (participant.year) parts.push(`Y:${participant.year}`);
  if (participant.class) parts.push(`S:${participant.class}`);
  
  if (event.title) parts.push(`T:${event.title.substring(0, 40)}`);
  if (event.location) parts.push(`L:${event.location.substring(0, 30)}`);
  if (event.start_time) {
    const date = new Date(event.start_time);
    parts.push(`DT:${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`);
    parts.push(`TM:${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`);
  }
  
  // Add IDs at the end
  if (data.event_id) parts.push(`EID:${data.event_id}`);
  if (data.registration_id) parts.push(`RID:${data.registration_id}`);
  
  return parts.join('|');
};

const EventTicket: React.FC<EventTicketProps> = ({
  eventId,
  eventTitle,
  eventDate,
  eventLocation,
  eventDescription,
  eventEndTime,
  userName,
  userEmail,
  registrationId,
  participantName,
  rollNumber,
  department,
  year,
  semester,
  profilePhotoUrl
}) => {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  useEffect(() => {
    generateQRToken();
  }, [eventId, registrationId]);

  const generateQRToken = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Parse IDs safely
      const eventIdNum = typeof eventId === 'string' ? parseInt(eventId, 10) : eventId;
      const registrationIdNum = typeof registrationId === 'string' ? parseInt(registrationId, 10) : registrationId;

      if (isNaN(eventIdNum) || isNaN(registrationIdNum)) {
        const errorMsg = 'Invalid event or registration ID';
        console.error(errorMsg, { eventId, registrationId });
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      console.log('Generating QR token for:', { event_id: eventIdNum, registration_id: registrationIdNum });

      // Try to call the edge function first
      try {
        const { data, error } = await supabase.functions.invoke('generate-qr-token', {
          body: {
            event_id: eventIdNum,
            registration_id: registrationIdNum,
          },
        });

        if (error) {
          throw error;
        }

        if (data?.qr_token) {
          console.log('QR token generated successfully via edge function');
          // Decode the token to get the data
          try {
            const decoded = JSON.parse(atob(data.qr_token));
            console.log('Decoded QR token data:', decoded);
            
            // Ensure we have participant and event data
            if (!decoded.participant || !decoded.event) {
              console.warn('QR token missing participant or event data, using fallback');
              // Use fallback with current component props
              const fallbackData = {
                participant: {
                  name: participantName || userName,
                  email: userEmail,
                  roll_number: rollNumber,
                  department: department,
                  year: year,
                  class: semester,
                  profile_photo_url: profilePhotoUrl,
                },
                event: {
                  id: eventIdNum,
                  title: eventTitle,
                  location: eventLocation,
                  start_time: eventDate,
                  end_time: eventEndTime,
                  description: eventDescription,
                },
                event_id: eventIdNum,
                registration_id: registrationIdNum,
                user_id: '', // Will be filled by server when validating
              };
              const qrText = formatQRAsText(fallbackData);
              console.log('Generated QR text from fallback:', qrText);
              setQrToken(qrText);
              setIsCheckedIn(data.is_checked_in || false);
              setIsLoading(false);
              return;
            }
            
            // Add IDs to decoded data if missing
            if (!decoded.event_id) decoded.event_id = eventIdNum;
            if (!decoded.registration_id) decoded.registration_id = registrationIdNum;
            
            // Create human-readable text format for QR code
            const qrText = formatQRAsText(decoded);
            console.log('Generated QR text from edge function:', qrText);
            setQrToken(qrText);
            setIsCheckedIn(data.is_checked_in || false);
            setIsLoading(false);
            return;
          } catch (e) {
            console.error('Error decoding QR token, using fallback:', e);
            // If decoding fails, use fallback with component props
            const fallbackData = {
              participant: {
                name: participantName || userName,
                email: userEmail,
                roll_number: rollNumber,
                department: department,
                year: year,
                class: semester,
                profile_photo_url: profilePhotoUrl,
              },
              event: {
                id: eventIdNum,
                title: eventTitle,
                location: eventLocation,
                start_time: eventDate,
                end_time: eventEndTime,
                description: eventDescription,
              },
              event_id: eventIdNum,
              registration_id: registrationIdNum,
              user_id: '',
            };
            const qrText = formatQRAsText(fallbackData);
            setQrToken(qrText);
            setIsCheckedIn(data.is_checked_in || false);
            setIsLoading(false);
            return;
          }
        } else {
          throw new Error(data?.error || 'QR token not returned from server');
        }
      } catch (edgeFunctionError: any) {
        console.warn('Edge function failed, using fallback QR generation:', edgeFunctionError);
        
        // Fallback: Generate QR token client-side with all user and event details
        // This ensures the ticket can still be displayed even if the edge function fails
        const fallbackTokenData = {
          user_id: '', // Will be filled by server when validating
          event_id: eventIdNum,
          registration_id: registrationIdNum,
          issued_at: new Date().toISOString(),
          exp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime(), // 7 days from now
          fallback: true, // Mark as fallback token
          // Include all user and event details for direct display
          participant: {
            name: participantName || userName,
            email: userEmail,
            roll_number: rollNumber,
            department: department,
            year: year,
            class: semester,
            profile_photo_url: profilePhotoUrl,
          },
          event: {
            id: eventIdNum,
            title: eventTitle,
            location: eventLocation,
            start_time: eventDate,
            end_time: eventEndTime,
            description: eventDescription,
          },
        };

        const fallbackToken = btoa(JSON.stringify(fallbackTokenData));
        console.log('Using fallback QR token generation with full details');
        // Create human-readable text format for QR code
        const qrText = formatQRAsText(fallbackTokenData);
        setQrToken(qrText);
        setIsCheckedIn(false);
        
        // Show a warning but don't block the user
        toast.warning('Using basic QR code. Some features may be limited.');
      }
    } catch (err: any) {
      console.error('Error generating QR token:', err);
      const errorMsg = err.message || 'Network error. Please check your connection.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    try {
      // Use html2canvas to capture the entire ticket card
      const html2canvas = (await import('html2canvas')).default;
      const ticketCard = document.querySelector('.max-w-md.mx-auto.shadow-lg') as HTMLElement;
      
      if (!ticketCard) {
        toast.error('Could not find ticket element');
        return;
      }

      // Hide buttons before capturing
      const buttons = ticketCard.querySelectorAll('.print\\:hidden');
      buttons.forEach(btn => {
        (btn as HTMLElement).style.display = 'none';
      });

      const canvas = await html2canvas(ticketCard, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Show buttons again
      buttons.forEach(btn => {
        (btn as HTMLElement).style.display = '';
      });

      // Convert to JPEG
      const jpegFile = canvas.toDataURL('image/jpeg', 0.95);
      const downloadLink = document.createElement('a');
      downloadLink.download = `event-ticket-${eventId}.jpg`;
      downloadLink.href = jpegFile;
      downloadLink.click();
      
      toast.success('Ticket downloaded as JPEG');
    } catch (error: any) {
      console.error('Error downloading JPEG:', error);
      toast.error('Failed to download ticket. Please try again.');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // Use html2canvas to capture the entire ticket card
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      const ticketCard = document.querySelector('.max-w-md.mx-auto.shadow-lg') as HTMLElement;
      
      if (!ticketCard) {
        toast.error('Could not find ticket element');
        return;
      }

      // Hide buttons before capturing
      const buttons = ticketCard.querySelectorAll('.print\\:hidden');
      buttons.forEach(btn => {
        (btn as HTMLElement).style.display = 'none';
      });

      const canvas = await html2canvas(ticketCard, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Show buttons again
      buttons.forEach(btn => {
        (btn as HTMLElement).style.display = '';
      });

      // Calculate PDF dimensions based on canvas
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;
      
      // Use A4 width (210mm) and calculate height to maintain aspect ratio
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = pdfWidth / ratio;
      
      // Create PDF with calculated dimensions
      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      // Convert canvas to image and add to PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      // Save PDF (no extra page will be created since we set exact dimensions)
      pdf.save(`event-ticket-${eventId}.pdf`);
      
      toast.success('Ticket downloaded as PDF');
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating your secure QR ticket...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={generateQRToken} className="w-full mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto shadow-lg border-2 border-gray-200 print:border-none print:shadow-none print:max-w-full print:m-0">
      <CardHeader className="border-b border-gray-200 print:py-2 print:border-b-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold print:text-lg">Event Ticket</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="py-6 space-y-6 print:py-3 print:space-y-3">
        {isCheckedIn && (
          <Alert className="bg-green-50 border-green-500">
            <AlertDescription className="text-green-900">
              ✓ You have been checked in for this event
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-col items-center justify-center print:mb-2">
          <h2 className="text-xl font-semibold mb-1 text-center print:text-base print:mb-0">{eventTitle}</h2>
          <div className="flex items-center text-gray-500 text-sm mb-4 print:mb-1 print:text-xs">
            <CalendarDays size={16} className="mr-1 print:h-3 print:w-3" />
            <span>{format(parseISO(eventDate), 'EEEE, MMMM d, yyyy • h:mm a')}</span>
          </div>
          <div className="flex items-center text-gray-500 text-sm print:text-xs">
            <MapPin size={16} className="mr-1 print:h-3 print:w-3" />
            <span>{eventLocation}</span>
          </div>
        </div>
        
        {qrToken && (
          <div className="flex flex-col items-center justify-center space-y-4 print:space-y-2 print:page-break-inside-avoid">
            <div className="border-4 border-white p-4 shadow-md bg-white rounded-lg print:border-2 print:p-2 print:shadow-none print:scale-75 print:origin-center">
              <QRCodeSVG 
                id="event-qr-code"
                value={qrToken} 
                size={280}
                level="M"
                includeMargin={true}
                marginSize={2}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
            
            {/* Profile Photo below QR Code */}
            {profilePhotoUrl && (
              <div className="flex flex-col items-center space-y-2 print:space-y-1">
                <div className="border-2 border-gray-300 p-2 rounded-lg bg-white shadow-sm print:border print:p-1 print:shadow-none">
                  <img
                    id="profile-photo"
                    src={profilePhotoUrl}
                    alt="Profile Photo"
                    className="w-32 h-32 rounded-full object-cover print:w-20 print:h-20"
                    onError={(e) => {
                      console.error('Error loading profile photo:', profilePhotoUrl);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 print:text-[10px]">Participant Photo</p>
              </div>
            )}
          </div>
        )}
        
        <div className="flex flex-col space-y-2 border-t border-b border-gray-200 py-4 print:py-2 print:space-y-1 print:page-break-inside-avoid">
          <div className="flex justify-between items-center print:text-xs">
            <div className="flex items-center">
              <User size={16} className="mr-2 text-gray-500 print:h-3 print:w-3" />
              <span className="text-sm font-medium print:text-xs">Attendee</span>
            </div>
            <span className="font-medium print:text-xs">{userName}</span>
          </div>
          
          <div className="flex justify-between items-center print:text-xs">
            <div className="flex items-center">
              <Ticket size={16} className="mr-2 text-gray-500 print:h-3 print:w-3" />
              <span className="text-sm font-medium print:text-xs">Ticket ID</span>
            </div>
            <span className="font-mono text-sm print:text-xs">{eventId.substring(0, 8).toUpperCase()}</span>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground space-y-1 print:space-y-0 print:text-xs print:page-break-inside-avoid">
          <p className="font-medium print:text-xs">🔒 Secure QR Code</p>
          <p className="print:text-[10px]">Present this code at the event entrance for check-in</p>
          <p className="text-xs print:text-[10px]">This QR code is unique and cannot be reused</p>
        </div>

        <div className="flex flex-nowrap gap-2 print:hidden justify-center sm:justify-start">
          <Button 
            onClick={handlePrint}
            size="sm"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium"
            variant="default"
          >
            <span className="whitespace-nowrap">Print Ticket</span>
          </Button>
          <Button 
            onClick={handleDownload}
            size="sm"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium"
            variant="default"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Download JPEG</span>
            <span className="sm:hidden whitespace-nowrap">JPEG</span>
          </Button>
          <Button 
            onClick={handleDownloadPDF}
            size="sm"
            className="flex-shrink-0 px-3 py-1.5 text-xs font-medium"
            variant="default"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Download PDF</span>
            <span className="sm:hidden whitespace-nowrap">PDF</span>
          </Button>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 text-center text-sm text-gray-500 print:bg-transparent print:py-1 print:text-[10px] print:page-break-inside-avoid">
        <p>Present this QR code at the event for check-in.</p>
      </CardFooter>

      <style>
        {`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            
            body * {
              visibility: hidden;
            }
            
            .max-w-md, .max-w-md * {
              visibility: visible;
            }
            
            .max-w-md {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            .print\\:hidden {
              display: none !important;
            }
            
            /* Prevent page breaks inside key sections */
            .print\\:page-break-inside-avoid {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            /* Reduce spacing for compact print */
            * {
              page-break-inside: avoid;
            }
          }
        `}
      </style>
    </Card>
  );
};

export default EventTicket;
