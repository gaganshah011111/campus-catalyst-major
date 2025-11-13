
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Award, Download, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAuth } from '@/context/AuthContext';

interface Certificate {
  id: string;
  event_id: string;
  student_id: string;
  issued_by: string;
  issued_at: string;
  event: {
    title: string;
    date: string;
    location: string;
  };
  student: {
    name: string;
  };
  issuer: {
    name: string;
  };
  registration?: {
    winner_position: number | null;
    participant_name: string | null;
  };
}

const CertificateView: React.FC = () => {
  const { certificateId } = useParams<{ certificateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      if (!certificateId) return;
      
      try {
        setLoading(true);
        
        // Fetch certificate with related data
        const { data, error } = await supabase
          .from('certificates')
          .select(`
            *,
            event:event_id (title, date, location),
            student:student_id (name),
            issuer:issued_by (name)
          `)
          .eq('id', certificateId)
          .single();
          
        if (error) throw error;
        
        // Fetch registration data for position and participant
        if (data) {
          const { data: registrationData, error: regError } = await supabase
            .from('event_registrations')
            .select('winner_position, participant_name')
            .eq('event_id', data.event_id)
            .eq('user_id', data.student_id)
            .maybeSingle();
            
          if (!regError && registrationData) {
            data.registration = {
              winner_position: registrationData.winner_position,
              participant_name: registrationData.participant_name
            };
          }
        }
        
        if (!data) {
          toast.error('Certificate not found');
          navigate('/');
          return;
        }
        
        // Check if current user is the student or issuer
        if (
          user?.id !== data.student_id && 
          user?.id !== data.issued_by && 
          user?.role !== 'admin'
        ) {
          toast.error('You do not have permission to view this certificate');
          navigate('/');
          return;
        }
        
        setCertificate(data as Certificate);
      } catch (error) {
        console.error('Error fetching certificate:', error);
        toast.error('Failed to load certificate');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCertificate();
  }, [certificateId, navigate, user]);

  const downloadCertificate = async () => {
    if (!certificateRef.current) return;
    
    try {
      toast.info('Preparing your certificate for download...');
      
      // Wait for fonts and styles to apply
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: false,
        scrollX: 0,
        scrollY: 0,
        width: certificateRef.current.scrollWidth,
        height: certificateRef.current.scrollHeight,
      });
      
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = image;
      link.download = `certificate-${certificate?.event.title.replace(/\s+/g, '-').toLowerCase() || 'event'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Certificate downloaded successfully');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Failed to download certificate');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">Certificate not found or you don't have permission to view it.</p>
        <Link to="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6 flex justify-between items-center">
        <Link to={user?.role === 'student' ? "/student/certificates" : "/"} className="flex items-center text-primary hover:underline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
        <Button onClick={downloadCertificate} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download Certificate
        </Button>
      </div>
      
      <div 
        ref={certificateRef}
        className="border-8 border-blue-700 rounded-lg bg-white p-10 shadow-lg"
      >
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Award className="h-16 w-16 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-blue-800 mb-4">
            {certificate.registration?.winner_position 
              ? `Certificate of Achievement - ${certificate.registration.winner_position === 1 ? '1st Place' : certificate.registration.winner_position === 2 ? '2nd Place' : '3rd Place'}`
              : 'Certificate of Completion'}
          </h1>
          <p className="text-lg text-gray-600 mb-8">This certifies that</p>
          <h2 className="text-3xl font-semibold mb-8 text-blue-900">{certificate.student.name}</h2>
          {certificate.registration?.participant_name && (
            <p className="text-lg text-gray-600 mb-2">Participant: <span className="font-semibold">{certificate.registration.participant_name}</span></p>
          )}
          {certificate.registration?.winner_position ? (
            <div className="mb-6 p-4 bg-gradient-to-r from-yellow-100 to-yellow-50 rounded-lg border-2 border-yellow-300">
              <p className="text-2xl font-bold text-yellow-800 text-center">
                🏆 {certificate.registration.winner_position === 1 ? '1st Place Winner' : 
                     certificate.registration.winner_position === 2 ? '2nd Place Winner' : 
                     '3rd Place Winner'} 🏆
              </p>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <p className="text-xl font-semibold text-blue-800 text-center">Participant</p>
            </div>
          )}
          <p className="text-lg text-gray-600 mb-2">has successfully participated in</p>
          <h3 className="text-2xl font-bold mb-8 text-blue-800">{certificate.event.title}</h3>
          <p className="text-lg text-gray-600 mb-8">
            held on <span className="font-semibold">{formatDate(certificate.event.date)}</span>
            {certificate.event.location && ` at ${certificate.event.location}`}
          </p>
          
          <div className="flex justify-center pt-10 border-t border-gray-200 mt-10">
            <div className="text-center">
              <p className="mb-2 font-semibold">{certificate.issuer.name}</p>
              <p className="text-gray-500 text-sm">Event Organizer</p>
            </div>
          </div>
          
          <div className="mt-8 text-gray-400 text-sm">
            <p>Certificate ID: {certificate.id}</p>
            <p>Issued on {formatDate(certificate.issued_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateView;
