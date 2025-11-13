import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, X, AlertCircle, User, ArrowLeft, CheckCircle2, Ticket } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getEventById } from '@/lib/api/events';
import { Skeleton } from '@/components/ui/skeleton';

const EventRegistrationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { registerForEvent } = useEvents();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: '',
    year: '',
    rollNumber: '',
    semester: '',
  });
  
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [departmentOther, setDepartmentOther] = useState(false);
  
  // Department options
  const departments = [
    'School of Architecture',
    'Applied Science',
    'Civil Engineering',
    'Electrical Engineering',
    'Mechanical & Production Engineering',
    'Electronics & Communication Engineering',
    'Computer Science & Engineering',
    'Information Technology',
    'Business Administration',
    'Computer Applications'
  ];

  // Fetch event details
  useEffect(() => {
    console.log('EventRegistrationPage: Component mounted, event ID:', id);
    
    const fetchEvent = async () => {
      if (!id) {
        console.error('EventRegistrationPage: No event ID provided');
        toast.error('Invalid event ID');
        navigate('/events');
        return;
      }

      console.log('EventRegistrationPage: Fetching event with ID:', id);
      setLoading(true);
      try {
        const eventData = await getEventById(id);
        console.log('EventRegistrationPage: Event fetched:', eventData);
        if (!eventData) {
          console.error('EventRegistrationPage: Event not found');
          toast.error('Event not found');
          navigate('/events');
          return;
        }
        
        // Check registration deadline before setting event
        if (eventData.registration_deadline) {
          const deadline = new Date(eventData.registration_deadline);
          const now = new Date();
          if (deadline < now) {
            toast.error('Registration deadline has passed. You can no longer register for this event.');
            navigate(`/events/${id}`);
            return;
          }
        }
        
        setEvent(eventData);
      } catch (error: any) {
        console.error('EventRegistrationPage: Error fetching event:', error);
        toast.error(error?.message || 'Failed to load event details');
        // Don't navigate away immediately, let user see the error
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, navigate]);

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  // Redirect if not authenticated (but wait for loading to complete)
  useEffect(() => {
    if (loading) return; // Don't redirect while loading
    
    if (!user) {
      toast.error('Please login to register for events');
      navigate('/login');
    } else if (user.role !== 'student') {
      toast.error('Only students can register for events');
      navigate('/events');
    }
  }, [user, navigate, loading]);

  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

  // Check if user is already registered (but wait for loading and event to load)
  useEffect(() => {
    const checkRegistration = async () => {
      if (!user || !id || loading || !event) return;

      try {
        const eventId = parseInt(id, 10);
        if (isNaN(eventId)) {
          console.error('Invalid event ID:', id);
          return;
        }
        // Check if user has any registration (registered or attended, but not cancelled)
        const { data } = await supabase
          .from('event_registrations')
          .select('id, status')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .in('status', ['registered', 'attended'])
          .maybeSingle();

        if (data) {
          setIsAlreadyRegistered(true);
          const statusMessage = data.status === 'attended' 
            ? 'You have already registered and attended this event.' 
            : 'You are already registered for this event';
          toast.info(statusMessage);
        }
      } catch (error) {
        console.error('Error checking registration:', error);
        // Don't block the page if check fails
      }
    };

    if (user && id && !loading && event) {
      checkRegistration();
    }
  }, [user, id, loading, event]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleDepartmentChange = (value: string) => {
    if (value === 'other') {
      setDepartmentOther(true);
      setFormData(prev => ({ ...prev, department: '' }));
    } else {
      setDepartmentOther(false);
      setFormData(prev => ({ ...prev, department: value }));
    }
    if (errors.department) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.department;
        return newErrors;
      });
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setProfilePhoto(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setProfilePhoto(null);
    setProfilePhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadProfilePhoto = async (): Promise<string | null> => {
    if (!profilePhoto || !user) return null;

    try {
      const fileExt = profilePhoto.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      const { data, error } = await supabase.storage
        .from('event-registrations')
        .upload(filePath, profilePhoto, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        
        // Fallback to base64 if available
        if (profilePhotoPreview && profilePhotoPreview.startsWith('data:')) {
          return profilePhotoPreview;
        }
        
        throw new Error(`Failed to upload photo: ${error.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('event-registrations')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      
      // Fallback to base64 if available
      if (profilePhotoPreview && profilePhotoPreview.startsWith('data:')) {
        return profilePhotoPreview;
      }
      
      throw error;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }
    if (!formData.year.trim()) {
      newErrors.year = 'Year is required';
    }
    if (!formData.rollNumber.trim()) {
      newErrors.rollNumber = 'Roll number is required';
    }
    if (!formData.semester.trim()) {
      newErrors.semester = 'Semester is required';
    }
    if (!profilePhoto) {
      newErrors.profilePhoto = 'Profile photo is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!user || !id) {
      toast.error('Please login to register');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload profile photo first (required)
      if (!profilePhoto) {
        toast.error('Profile photo is required');
        return;
      }

      let photoUrl: string | null = null;
      try {
        photoUrl = await uploadProfilePhoto();
        if (!photoUrl) {
          // If upload returns null and we have a preview, use base64
          if (profilePhotoPreview && profilePhotoPreview.startsWith('data:')) {
            photoUrl = profilePhotoPreview;
            console.log('Using base64 data URL as fallback');
          } else {
            toast.error('Failed to upload profile photo. Please try again.');
            return;
          }
        }
      } catch (uploadError: any) {
        console.error('Photo upload error:', uploadError);
        // Try base64 fallback
        if (profilePhotoPreview && profilePhotoPreview.startsWith('data:')) {
          photoUrl = profilePhotoPreview;
          toast.warning('Using image data directly (storage upload failed)');
        } else {
          toast.error(`Failed to upload profile photo: ${uploadError.message || 'Unknown error'}`);
          return;
        }
      }

      // Register for event
      const registrationDetails = {
        participant_name: formData.name,
        roll_number: formData.rollNumber,
        department: formData.department,
        year: formData.year,
        class: formData.semester,
        remarks: `Email: ${formData.email}`,
        profile_photo_url: photoUrl,
      };

      // Ensure id is a string (it should be from useParams)
      const eventId = id?.toString() || '';
      if (!eventId) {
        toast.error('Invalid event ID');
        return;
      }

      const success = await registerForEvent(eventId, user.id, registrationDetails as any);

      if (success) {
        toast.success('Registration successful! Redirecting to your ticket...');
        // Wait a bit longer to ensure registration is fully committed to database
        // This helps prevent race conditions when fetching the registration
        setTimeout(() => {
          navigate(`/events/${id}/ticket`);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register for event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTiming = (startTime?: string, endTime?: string) => {
    if (!startTime) return 'Not specified';
    try {
      const start = format(new Date(startTime), 'MMM dd, yyyy h:mm a');
      const end = endTime ? ` - ${format(new Date(endTime), 'h:mm a')}` : '';
      return `${start}${end}`;
    } catch (error) {
      return startTime || 'Not specified';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Event not found</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/events')}>Back to Events</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/events/${id}`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Event Details
        </Button>
      </div>

      {/* Event Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Event Information</CardTitle>
          <CardDescription>Review the event details before registering</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <span className="font-semibold">Event Name: </span>
              <span>{event.title}</span>
            </div>
            <div>
              <span className="font-semibold">Location: </span>
              <span>{event.location || 'TBA'}</span>
            </div>
            <div>
              <span className="font-semibold">Timing: </span>
              <span>{formatTiming(event.start_time, event.end_time)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Already Registered Message */}
      {isAlreadyRegistered && (
        <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                  You are already registered for this event!
                </h3>
                <p className="text-green-800 dark:text-green-200 mb-4">
                  Your registration has been confirmed. You can view and download your ticket from the "My Tickets" section or by clicking the button below.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate(`/events/${id}/ticket`)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Ticket className="mr-2 h-4 w-4" />
                    View My Ticket
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/student/tickets')}
                  >
                    My Tickets
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/events/${id}`)}
                  >
                    Back to Event
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registration Form Card - Hide if already registered */}
      {!isAlreadyRegistered && (
      <Card>
        <CardHeader>
          <CardTitle>Event Registration Form</CardTitle>
          <CardDescription>
            Please fill in all the required details to register for this event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Photo Upload */}
            <div className="space-y-2">
              <Label>
                Profile Photo <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-4">
                {profilePhotoPreview ? (
                  <div className="relative">
                    <img
                      src={profilePhotoPreview}
                      alt="Profile preview"
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className={`w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed flex items-center justify-center ${
                    errors.profilePhoto ? 'border-red-500' : 'border-gray-300'
                  }`}>
                    <User className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    className={errors.profilePhoto ? 'border-red-500' : ''}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {profilePhoto ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    Max size: 5MB. Supported formats: JPG, PNG
                  </p>
                  {errors.profilePhoto && (
                    <p className="text-sm text-red-500 mt-1">{errors.profilePhoto}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
                disabled={isSubmitting}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter your email"
                disabled={isSubmitting}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Department and Year */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">
                  Department <span className="text-red-500">*</span>
                </Label>
                {!departmentOther ? (
                  <Select
                    value={formData.department}
                    onValueChange={handleDepartmentChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className={errors.department ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      placeholder="Enter department name"
                      disabled={isSubmitting}
                      className={errors.department ? 'border-red-500' : ''}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDepartmentOther(false);
                        setFormData(prev => ({ ...prev, department: '' }));
                      }}
                      className="text-xs h-auto py-1"
                    >
                      ← Back to list
                    </Button>
                  </div>
                )}
                {errors.department && (
                  <p className="text-sm text-red-500">{errors.department}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">
                  Year <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.year}
                  onValueChange={(value) => handleInputChange('year', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={errors.year ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st Year">1st Year</SelectItem>
                    <SelectItem value="2nd Year">2nd Year</SelectItem>
                    <SelectItem value="3rd Year">3rd Year</SelectItem>
                    <SelectItem value="4th Year">4th Year</SelectItem>
                    <SelectItem value="Graduate">Graduate</SelectItem>
                  </SelectContent>
                </Select>
                {errors.year && (
                  <p className="text-sm text-red-500">{errors.year}</p>
                )}
              </div>
            </div>

            {/* Roll Number and Semester */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rollNumber">
                  Roll Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="rollNumber"
                  value={formData.rollNumber}
                  onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                  placeholder="Enter your roll number"
                  disabled={isSubmitting}
                  className={errors.rollNumber ? 'border-red-500' : ''}
                />
                {errors.rollNumber && (
                  <p className="text-sm text-red-500">{errors.rollNumber}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="semester">
                  Semester <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.semester}
                  onValueChange={(value) => handleInputChange('semester', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={errors.semester ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st Semester">1st Semester</SelectItem>
                    <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                    <SelectItem value="3rd Semester">3rd Semester</SelectItem>
                    <SelectItem value="4th Semester">4th Semester</SelectItem>
                    <SelectItem value="5th Semester">5th Semester</SelectItem>
                    <SelectItem value="6th Semester">6th Semester</SelectItem>
                    <SelectItem value="7th Semester">7th Semester</SelectItem>
                    <SelectItem value="8th Semester">8th Semester</SelectItem>
                  </SelectContent>
                </Select>
                {errors.semester && (
                  <p className="text-sm text-red-500">{errors.semester}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/events/${id}`)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Register for Event'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      )}
    </div>
  );
};

export default EventRegistrationPage;

