import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Award, Download, Printer, Calendar, MapPin, Trophy, Star, Search, X } from 'lucide-react';
import { toast } from 'sonner';

const CERTIFICATE_FONT = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=Great+Vibes&display=swap';

const StudentCertificates: React.FC = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Inject Google Fonts for certificate
    if (!document.getElementById('certificate-font')) {
      const link = document.createElement('link');
      link.id = 'certificate-font';
      link.rel = 'stylesheet';
      link.href = CERTIFICATE_FONT;
      document.head.appendChild(link);
    }
    
    // Add certificate styles if not already added
    if (!document.getElementById('certificate-styles')) {
      const style = document.createElement('style');
      style.id = 'certificate-styles';
      style.textContent = `
        .certificate-bg {
          background: #fff;
          max-width: 100%;
          margin: 0;
          padding: 0;
        }
        .outer-border {
          background: linear-gradient(135deg, #1e3a8a 0%, #facc15 100%);
          padding: 18px;
          border-radius: 18px;
        }
        .middle-border {
          background: #fff;
          padding: 12px;
          border-radius: 12px;
        }
        .inner-border {
          background: linear-gradient(135deg, #fff 80%, #facc15 100%);
          padding: 0;
          border-radius: 8px;
        }
        .certificate-preview-container {
          transform: none !important;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
        /* Full certificate styles for print/download */
        .certificate-bg {
          background: #fff;
          max-width: 100%;
          margin: 0;
          padding: 0;
        }
        .outer-border {
          background: linear-gradient(135deg, #1e3a8a 0%, #facc15 100%);
          padding: 18px;
          border-radius: 18px;
        }
        .middle-border {
          background: #fff;
          padding: 12px;
          border-radius: 12px;
        }
        .inner-border {
          background: linear-gradient(135deg, #fff 80%, #facc15 100%);
          padding: 0;
          border-radius: 8px;
        }
        .certificate-content {
          background: #fff;
          padding: 48px 32px 32px 32px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .cert-title {
          font-family: 'Montserrat', sans-serif;
          font-size: 2.5rem;
          font-weight: 700;
          letter-spacing: 0.2rem;
          text-align: center;
          color: #222;
        }
        .cert-subtitle {
          font-family: 'Montserrat', sans-serif;
          font-size: 1.2rem;
          text-align: center;
          color: #444;
          margin-bottom: 1.5rem;
        }
        .cert-presented {
          font-size: 1.1rem;
          text-align: center;
          margin-bottom: 0.5rem;
          color: #666;
        }
        .cert-name {
          font-family: 'Great Vibes', cursive;
          font-size: 2.2rem;
          text-align: center;
          color: #1e3a8a;
          font-weight: 400;
          margin-bottom: 0.5rem;
        }
        .cert-desc {
          font-size: 1rem;
          text-align: center;
          color: #444;
          margin-bottom: 1.5rem;
        }
        .cert-event {
          font-size: 1.1rem;
          text-align: center;
          color: #222;
          margin-bottom: 0.5rem;
        }
        .cert-badge {
          display: flex;
          justify-content: center;
          margin: 1.5rem 0;
        }
        .badge-circle {
          background: #fff;
          border: 4px solid #facc15;
          border-radius: 50%;
          width: 90px;
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .badge-inner {
          background: #1e3a8a;
          color: #fff;
          border-radius: 50%;
          width: 70px;
          height: 70px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
        }
        .badge-ribbon {
          width: 0;
          height: 0;
          border-left: 18px solid transparent;
          border-right: 18px solid transparent;
          border-top: 28px solid #facc15;
          margin: -8px auto 0;
        }
        .cert-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 2.5rem;
        }
        .cert-signature {
          width: 180px;
          border-top: 2px solid #1e3a8a;
          text-align: center;
          font-size: 1rem;
          color: #222;
          font-family: 'Montserrat', sans-serif;
        }
        .cert-date {
          font-size: 1rem;
          color: #666;
          text-align: center;
        }
      `;
      document.head.appendChild(style);
    }
    const fetchCertificates = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('certificates')
          .select(`id, issued_at, event_id, events (title, start_time, end_time, location)`)
          .eq('student_id', user.id);
        if (error) throw error;
        
        // Fetch position data for each certificate
        const certificatesWithPosition = await Promise.all(
          (data || []).map(async (cert) => {
            const { data: regData } = await supabase
              .from('event_registrations')
              .select('winner_position, participant_name')
              .eq('event_id', cert.event_id)
              .eq('user_id', user.id)
              .maybeSingle();
            
            return {
              ...cert,
              position: regData?.winner_position ?? null,
              participant_name: regData?.participant_name ?? null
            };
          })
        );
        
        setCertificates(certificatesWithPosition);
      } catch (err) {
        setCertificates([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCertificates();
  }, [user]);

  const handlePrint = (certId: string) => {
    const certElem = document.getElementById(`certificate-${certId}`);
    if (certElem) {
      // Get the inner certificate content (skip the hidden wrapper)
      const certContent = certElem.querySelector('.certificate-bg');
      if (!certContent) return;
      
      const printWindow = window.open('', '', 'width=900,height=650');
      printWindow?.document.write('<html><head><title>Certificate</title>');
      printWindow?.document.write(`<link href='${CERTIFICATE_FONT}' rel='stylesheet'>`);
      printWindow?.document.write(`
        <style>
          body{margin:0;background:#888;}
          .certificate-bg{background:#fff;max-width:900px;margin:40px auto;padding:0;box-shadow:0 4px 32px rgba(0,0,0,0.1);}
          .outer-border{background:linear-gradient(135deg,#1e3a8a 0%,#facc15 100%);padding:18px;border-radius:18px;}
          .middle-border{background:#fff;padding:12px;border-radius:12px;}
          .inner-border{background:linear-gradient(135deg,#fff 80%,#facc15 100%);padding:0;border-radius:8px;}
          .certificate-content{background:#fff;padding:48px 32px 32px 32px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
          .cert-title{font-family:Montserrat,sans-serif;font-size:2.5rem;font-weight:700;letter-spacing:0.2rem;text-align:center;color:#222;}
          .cert-subtitle{font-family:Montserrat,sans-serif;font-size:1.2rem;text-align:center;color:#444;margin-bottom:1.5rem;}
          .cert-presented{font-size:1.1rem;text-align:center;margin-bottom:0.5rem;color:#666;}
          .cert-name{font-family:'Great Vibes',cursive;font-size:2.2rem;text-align:center;color:#1e3a8a;font-weight:400;margin-bottom:0.5rem;}
          .cert-desc{font-size:1rem;text-align:center;color:#444;margin-bottom:1.5rem;}
          .cert-event{font-size:1.1rem;text-align:center;color:#222;margin-bottom:0.5rem;}
          .cert-badge{display:flex;justify-content:center;margin:1.5rem 0;}
          .badge-circle{background:#fff;border:4px solid #facc15;border-radius:50%;width:90px;height:90px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
          .badge-inner{background:#1e3a8a;color:#fff;border-radius:50%;width:70px;height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Montserrat,sans-serif;font-size:0.9rem;font-weight:700;}
          .badge-ribbon{width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-top:28px solid #facc15;margin:-8px auto 0;}
          .cert-footer{display:flex;justify-content:space-between;align-items:center;margin-top:2.5rem;}
          .cert-signature{width:180px;border-top:2px solid #1e3a8a;text-align:center;font-size:1rem;color:#222;font-family:Montserrat,sans-serif;}
          .cert-date{font-size:1rem;color:#666;text-align:center;}
        </style>
      `);
      printWindow?.document.write('</head><body>');
      printWindow?.document.write(certContent.outerHTML);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
      printWindow?.focus();
      printWindow?.print();
      printWindow?.close();
    }
  };

  const handleDownload = async (certId: string) => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const certElem = document.getElementById(`certificate-${certId}`);
      if (!certElem) {
        toast.error('Certificate element not found');
        return;
      }

      toast.info('Generating certificate image...');

      // Create a temporary visible clone for capture
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-10000px'; // Off-screen but visible for measurement
      tempContainer.style.top = '0';
      tempContainer.style.zIndex = '99999';
      tempContainer.style.visibility = 'visible';
      tempContainer.style.pointerEvents = 'none';
      tempContainer.style.overflow = 'visible';
      
      // Deep clone the certificate element
      const clonedCert = certElem.cloneNode(true) as HTMLElement;
      clonedCert.id = `temp-cert-${certId}`;
      clonedCert.style.visibility = 'visible';
      clonedCert.style.position = 'relative';
      clonedCert.style.left = '0';
      clonedCert.style.top = '0';
      clonedCert.style.width = '900px';
      clonedCert.style.height = 'auto';
      clonedCert.style.maxHeight = 'none';
      clonedCert.style.overflow = 'visible';
      
      // Remove any constraints from cloned element
      const allClonedChildren = clonedCert.querySelectorAll('*');
      allClonedChildren.forEach((child: Element) => {
        const childEl = child as HTMLElement;
        childEl.style.visibility = 'visible';
        childEl.style.maxHeight = 'none';
        if (childEl.style.overflow === 'hidden') {
          childEl.style.overflow = 'visible';
        }
      });
      
      tempContainer.appendChild(clonedCert);
      document.body.appendChild(tempContainer);

      // Wait for fonts and styles to apply
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force a reflow
      void tempContainer.offsetHeight;
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get actual dimensions
      const actualWidth = Math.max(clonedCert.scrollWidth, clonedCert.offsetWidth, 900);
      const actualHeight = Math.max(clonedCert.scrollHeight, clonedCert.offsetHeight, 650);
      
      console.log('Certificate dimensions:', { width: actualWidth, height: actualHeight });

      // Capture the cloned element
      const canvas = await html2canvas(clonedCert, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: false,
        scrollX: 0,
        scrollY: 0,
        width: actualWidth,
        height: actualHeight,
        windowWidth: actualWidth,
        windowHeight: actualHeight,
      });

      // Clean up temporary element
      document.body.removeChild(tempContainer);

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const cert = certificates.find(c => c.id === certId);
      const fileName = `certificate-${cert?.events?.title?.replace(/\s+/g, '-').toLowerCase() || 'event'}-${certId}.png`;
      link.download = fileName;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      console.error('Error downloading certificate:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Full error details:', error);
      toast.error(`Failed to download certificate: ${errorMessage}`);
    }
  };

  // Filter certificates based on search query
  const filteredCertificates = useMemo(() => {
    if (!searchQuery.trim()) {
      return certificates;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return certificates.filter((cert) => {
      const eventTitle = cert.events?.title?.toLowerCase() || '';
      const location = cert.events?.location?.toLowerCase() || '';
      const eventDate = cert.events?.start_time 
        ? new Date(cert.events.start_time).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }).toLowerCase()
        : '';
      const issuedDate = cert.issued_at 
        ? new Date(cert.issued_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }).toLowerCase()
        : '';
      
      return (
        eventTitle.includes(query) ||
        location.includes(query) ||
        eventDate.includes(query) ||
        issuedDate.includes(query)
      );
    });
  }, [certificates, searchQuery]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-primary/10 via-purple-50/50 to-primary/5 rounded-2xl p-6 md:p-8 border border-primary/20 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <div className="p-4 bg-gradient-to-br from-primary to-purple-600 rounded-2xl shadow-lg">
            <Award className="h-8 w-8 md:h-10 md:w-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">My Certificates</h1>
            <p className="text-sm md:text-base text-gray-600">Your achievements and accomplishments</p>
            {certificates.length > 0 && (
              <p className="text-xs md:text-sm text-gray-500 mt-1">
                {searchQuery ? (
                  <>
                    {filteredCertificates.length} of {certificates.length} {certificates.length === 1 ? 'certificate' : 'certificates'} found
                  </>
                ) : (
                  <>
                    {certificates.length} {certificates.length === 1 ? 'certificate' : 'certificates'} earned
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {certificates.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search certificates by event name, location, or date..."
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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary mx-auto mb-4" />
            <p className="text-gray-500">Loading your certificates...</p>
          </div>
        </div>
      ) : certificates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <Award className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Certificates Yet</h3>
            <p className="text-gray-500 text-center max-w-md">
              You haven't received any certificates yet. Attend events and complete them to earn certificates!
            </p>
          </CardContent>
        </Card>
      ) : filteredCertificates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Certificates Found</h3>
            <p className="text-gray-500 text-center max-w-md mb-4">
              No certificates match your search query "{searchQuery}".
            </p>
            <Button
              variant="outline"
              onClick={() => setSearchQuery('')}
              className="mt-2"
            >
              Clear Search
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredCertificates.map((cert, index) => (
            <Card 
              key={cert.id} 
              className="group relative overflow-hidden border border-gray-200 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-white"
            >
              {/* Decorative Top Border */}
              <div className="h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary"></div>
              
              <CardContent className="p-4 md:p-5">
                {/* Hidden Full Certificate for Print/Download - Using visibility instead of hidden class */}
                <div 
                  id={`certificate-${cert.id}`} 
                  style={{ 
                    position: 'absolute', 
                    left: '-9999px', 
                    top: '0',
                    visibility: 'hidden',
                    width: '900px',
                    height: 'auto',
                    minHeight: '650px'
                  }}
                >
                  <div className="certificate-bg">
                    <div className="outer-border">
                      <div className="middle-border">
                        <div className="inner-border">
                          <div className="certificate-content">
                            <div className="cert-title">CERTIFICATE</div>
                            <div className="cert-subtitle">OF ACHIEVEMENT</div>
                            <div className="cert-presented">This certificate is proudly presented to</div>
                            <div className="cert-name">{user?.name}</div>
                            {cert.position ? (
                              <div className="cert-desc" style={{fontSize: '1.3rem', fontWeight: 'bold', color: '#d97706', marginBottom: '1rem'}}>
                                🏆 {cert.position === 1 ? '1st Place Winner' : cert.position === 2 ? '2nd Place Winner' : '3rd Place Winner'} 🏆
                              </div>
                            ) : (
                              <div className="cert-desc" style={{fontSize: '1.1rem', fontWeight: '600', color: '#1e40af', marginBottom: '1rem'}}>
                                Participant
                              </div>
                            )}
                            <div className="cert-desc">
                              For successfully participating in the event:
                            </div>
                            <div className="cert-event">{cert.events?.title || 'Event'}</div>
                            {cert.events?.location && (
                              <div className="cert-event">Location: {cert.events.location}</div>
                            )}
                            <div className="cert-event">
                              {cert.events?.start_time ? `Date: ${new Date(cert.events.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}` : ''}
                            </div>
                            <div className="cert-badge">
                              <div className="badge-circle">
                                <div className="badge-inner">
                                  <span style={{fontSize:'0.8rem'}}>TOP</span>
                                  <span style={{fontSize:'1.1rem'}}>BRAND</span>
                                  <span style={{fontSize:'0.8rem'}}>AWARD</span>
                                </div>
                              </div>
                            </div>
                            <div className="badge-ribbon" />
                            <div className="cert-footer">
                              <div className="cert-signature">Signature</div>
                              <div className="cert-date">Issued: {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</div>
                              <div className="cert-signature">Signature</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Certificate Preview - Clean Design */}
                <div className="relative mb-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                  <div className="certificate-preview-container">
                    {/* Simplified Certificate Preview */}
                    <div className="bg-white rounded-lg shadow-inner border-2 border-primary/20 p-4">
                      <div className="text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <div className="h-1 flex-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                          <Award className="h-5 w-5 text-primary" />
                          <div className="h-1 flex-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                        </div>
                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Certificate of Achievement</h4>
                        <p className="text-[10px] text-gray-600">This certificate is presented to</p>
                        <p className="text-sm font-semibold text-primary">{user?.name}</p>
                        {cert.position ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 border border-yellow-300 rounded-md mt-1">
                            <Trophy className="h-3 w-3 text-yellow-600" />
                            <span className="text-[10px] font-bold text-yellow-700">
                              {cert.position === 1 ? '1st Place' : cert.position === 2 ? '2nd Place' : '3rd Place'}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 border border-blue-300 rounded-md mt-1">
                            <Award className="h-3 w-3 text-blue-600" />
                            <span className="text-[10px] font-semibold text-blue-700">Participant</span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-gray-200 mt-2">
                          <p className="text-[10px] text-gray-500 mb-1">For participation in</p>
                          <p className="text-xs font-semibold text-gray-800 line-clamp-1">{cert.events?.title || 'Event'}</p>
                        </div>
                        <div className="flex items-center justify-center gap-3 pt-2 text-[9px] text-gray-500">
                          {cert.events?.start_time && (
                            <span>{new Date(cert.events.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          )}
                          {cert.events?.location && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[80px]">{cert.events.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Title */}
                <div className="mb-3">
                  <h3 className="font-semibold text-sm md:text-base text-gray-900 line-clamp-2 min-h-[2.5rem]">
                    {cert.events?.title || 'Event Certificate'}
                  </h3>
                </div>

                {/* Event Details Section */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                    <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
                    <span className="truncate">
                      {cert.events?.start_time 
                        ? new Date(cert.events.start_time).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })
                        : 'Date not available'}
                    </span>
                  </div>
                  {cert.events?.location && (
                    <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
                      <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary flex-shrink-0" />
                      <span className="truncate">{cert.events.location}</span>
                    </div>
                  )}
                  {cert.position && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-md border border-yellow-200">
                      <Trophy className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                      <span className="text-xs md:text-sm font-semibold text-yellow-700">
                        {cert.position === 1 ? '🥇 1st Place Winner' : cert.position === 2 ? '🥈 2nd Place Winner' : '🥉 3rd Place Winner'}
                      </span>
                    </div>
                  )}
                  {!cert.position && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-md border border-blue-200">
                      <Award className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span className="text-xs md:text-sm font-medium text-blue-700">Participant</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 print:hidden pt-3 border-t border-gray-100 mt-4">
                  <Button
                    onClick={() => handleDownload(cert.id)}
                    className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-md hover:shadow-lg transition-all h-9 sm:h-10 w-full flex items-center justify-center"
                    title="Download Certificate"
                  >
                    <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  <Button
                    onClick={() => handlePrint(cert.id)}
                    variant="outline"
                    className="flex-1 border-2 hover:bg-primary hover:text-white hover:border-primary transition-all h-9 sm:h-10 w-full flex items-center justify-center"
                    title="Print Certificate"
                  >
                    <Printer className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              </CardContent>

              {/* Decorative Badge for Winners */}
              {cert.position && (
                <div className="absolute top-3 right-3 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white rounded-full p-2 shadow-lg z-10">
                  <Star className="h-4 w-4 fill-white" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentCertificates; 