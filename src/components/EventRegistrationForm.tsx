import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, X, AlertCircle, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EventRegistrationFormProps {
  event: {
    id: string;
    title: string;
    location: string;
    start_time: string;
    end_time?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistrationSuccess?: () => void;
}

const EventRegistrationForm: React.FC<EventRegistrationFormProps> = ({
  event,
  open,
  onOpenChange,
  onRegistrationSuccess,
}) => {
  const { user } = useAuth();
  const { registerForEvent } = useEvents();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if event is valid (allow empty string for start_time)
  const isValidEvent = event && event.id && (event.start_time || event.title);
  
  // Helper function to format timing
  const formatTiming = (startTime?: string, endTime?: string) => {
    if (!startTime || startTime.trim() === '') return 'Not specified';
    try {
      const start = format(new Date(startTime), 'MMM dd, yyyy h:mm a');
      const end = endTime ? ` - ${format(new Date(endTime), 'h:mm a')}` : '';
      return `${start}${end}`;
    } catch (error) {
      return startTime || 'Not specified';
    }
  };
  
  // Initialize form data safely
  const getInitialFormData = () => {
    try {
      return {
        name: user?.name || '',
        email: user?.email || '',
        eventName: event?.title || '',
        location: event?.location || '',
        timing: event?.start_time ? formatTiming(event.start_time, event.end_time) : 'Not specified',
        department: '',
        year: '',
        rollNumber: '',
        semester: '',
      };
    } catch (error) {
      console.error('Error initializing form data:', error);
      return {
        name: user?.name || '',
        email: user?.email || '',
        eventName: event?.title || '',
        location: event?.location || '',
        timing: 'Not specified',
        department: '',
        year: '',
        rollNumber: '',
        semester: '',
      };
    }
  };
  
  const [formData, setFormData] = useState(getInitialFormData);
  
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

  // Update form data when event changes
  React.useEffect(() => {
    if (event) {
      try {
        setFormData(prev => ({
          ...prev,
          eventName: event.title || '',
          location: event.location || '',
          timing: event.start_time ? formatTiming(event.start_time, event.end_time) : 'Not specified',
        }));
      } catch (error) {
        console.error('Error updating form data:', error);
      }
    }
  }, [event]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setProfilePhoto(file);
    
    // Create preview
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
      // Create a unique filename
      const fileExt = profilePhoto.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      // Upload to Supabase Storage
      // Note: Make sure to create a storage bucket named 'event-registrations' in Supabase
      // with public access enabled for reading
      const { data, error } = await supabase.storage
        .from('event-registrations')
        .upload(filePath, profilePhoto, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        
        // If bucket doesn't exist or upload fails, use base64 data URL as fallback
        if (profilePhotoPreview && profilePhotoPreview.startsWith('data:')) {
          console.log('Storage upload failed, using base64 fallback for profile photo');
          // Return the base64 data URL directly
          return profilePhotoPreview;
        }
        
        // If no preview available, throw error
        throw new Error(`Failed to upload photo: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-registrations')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      
      // Fallback to base64 if available
      if (profilePhotoPreview && profilePhotoPreview.startsWith('data:')) {
        console.log('Using base64 fallback for profile photo');
        return profilePhotoPreview;
      }
      
      // Re-throw error so it can be handled by the caller
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

    if (!user) {
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

      // Register for event with all details
      const registrationDetails = {
        participant_name: formData.name,
        roll_number: formData.rollNumber,
        department: formData.department,
        year: formData.year,
        class: formData.semester, // Using 'class' field for semester
        remarks: `Email: ${formData.email}`,
        profile_photo_url: photoUrl,
      };

      if (!event?.id) {
        toast.error('Invalid event information');
        return;
      }
      
      const success = await registerForEvent(event.id, user.id, registrationDetails as any);

      if (success) {
        toast.success('Registration successful! Generating your QR ticket...');
        onOpenChange(false);
        
        // Reset form
        try {
          setFormData({
            name: user.name || '',
            email: user.email || '',
            eventName: event?.title || '',
            location: event?.location || '',
            timing: event?.start_time ? formatTiming(event.start_time, event.end_time) : 'Not specified',
            department: '',
            year: '',
            rollNumber: '',
            semester: '',
          });
        } catch (error) {
          console.error('Error resetting form:', error);
        }
        setDepartmentOther(false);
        setProfilePhoto(null);
        setProfilePhotoPreview(null);
        setErrors({});

        // Call success callback
        if (onRegistrationSuccess) {
          onRegistrationSuccess();
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Failed to register for event');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Debug logging
  React.useEffect(() => {
    console.log('EventRegistrationForm: open state =', open, 'event:', event?.id);
  }, [open, event]);

  // Always render Dialog component - Radix UI handles visibility with open prop
  // This ensures the Dialog is in the DOM and can properly show/hide
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Event Registration Form</DialogTitle>
          <DialogDescription>
            Please fill in all the required details to register for this event
          </DialogDescription>
        </DialogHeader>

        {!isValidEvent && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Some event information is missing. You can still proceed with registration.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Event Name (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="eventName">Event Name</Label>
            <Input
              id="eventName"
              value={formData.eventName}
              disabled
              className="bg-gray-50"
            />
          </div>

          {/* Location (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              disabled
              className="bg-gray-50"
            />
          </div>

          {/* Timing (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="timing">Timing</Label>
            <Input
              id="timing"
              value={formData.timing}
              disabled
              className="bg-gray-50"
            />
          </div>

          {/* Department and Year in one row */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Roll Number and Semester in one row */}
          <div className="grid grid-cols-2 gap-4">
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
                  <SelectItem value="4th Semester">4rd Semester</SelectItem>
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register for Event'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventRegistrationForm;

