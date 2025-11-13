import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Banner } from '@/types/banner';
import { toast } from 'sonner';

interface Event {
  id: number;
  title: string;
}

const BannerManagement: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    button_text: 'Learn More',
    is_active: true,
    display_order: 0,
    event_id: null as number | null
  });

  useEffect(() => {
    fetchBanners();
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title')
        .eq('is_approved', true)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to fetch events');
    }
  };

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        // Check if it's a network/blocking error
        const blocked = error.message?.includes('Failed to fetch') || 
                       error.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
                       error.message?.includes('ERR_CONNECTION_REFUSED') ||
                       error.message?.includes('NetworkError');
        
        if (blocked) {
          console.error('Banner requests are blocked by browser extension');
          setIsBlocked(true);
          setBanners([]);
          toast.error('Banner requests are blocked. Please disable ad blockers or privacy extensions for this site to manage banners.');
        } else {
          throw error;
        }
      } else {
        setBanners(data || []);
        setIsBlocked(false);
      }
    } catch (error: any) {
      console.error('Error fetching banners:', error);
      
      // Check if it's a network/blocking error
      const blocked = error?.message?.includes('Failed to fetch') || 
                     error?.message?.includes('ERR_BLOCKED_BY_CLIENT') ||
                     error?.message?.includes('ERR_CONNECTION_REFUSED') ||
                     error?.message?.includes('NetworkError') ||
                     error?.code === 'ERR_BLOCKED_BY_CLIENT';
      
      if (blocked) {
        setIsBlocked(true);
        setBanners([]);
        toast.error('Banner requests are blocked. Please disable ad blockers or privacy extensions for this site.');
      } else {
        setIsBlocked(false);
        setBanners([]);
        toast.error(`Failed to fetch banners: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) {
      return; // Prevent double submission
    }

    if (isBlocked) {
      toast.error('Cannot save banners while requests are blocked. Please disable ad blockers or privacy extensions for this site.');
      return;
    }

    // Validate required fields
    if (!formData.title || !formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!formData.image_url || !formData.image_url.trim()) {
      toast.error('Image URL is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user for created_by field
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload: any = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        image_url: formData.image_url.trim(),
        link_url: formData.link_url?.trim() || null,
        button_text: formData.button_text?.trim() || 'Learn More',
        is_active: formData.is_active,
        display_order: Number.isFinite(formData.display_order) ? formData.display_order : 0,
        event_id: formData.event_id || null,
      };

      // Add created_by if user is available and it's a new banner
      if (!editingBanner && user) {
        payload.created_by = user.id;
      }

      console.log('Submitting banner:', { editingBanner: !!editingBanner, payload });

      if (editingBanner) {
        console.log('Updating banner with ID:', editingBanner.id);
        const { data, error } = await supabase
          .from('banners')
          .update(payload)
          .eq('id', editingBanner.id)
          .select();

        if (error) {
          console.error('Update error:', error);
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        console.log('Banner updated successfully:', data);
        toast.success('Banner updated successfully');
      } else {
        const { data, error } = await supabase
          .from('banners')
          .insert([payload])
          .select();

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        console.log('Banner created:', data);
        toast.success('Banner created successfully');
      }

      setIsDialogOpen(false);
      setEditingBanner(null);
      resetForm();
      await fetchBanners();
    } catch (error: any) {
      console.error('Error saving banner:', error);
      const errorMessage = error?.message || 'Unknown error';
      const errorDetails = error?.details || error?.hint || '';
      
      const blocked = errorMessage.includes('Failed to fetch') || 
                     errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
                     errorMessage.includes('NetworkError') ||
                     error?.code === 'ERR_BLOCKED_BY_CLIENT';
      
      if (blocked) {
        setIsBlocked(true);
        toast.error('Cannot save banner: requests are blocked. Please disable ad blockers or privacy extensions for this site.');
      } else {
        const fullError = errorDetails ? `${errorMessage} (${errorDetails})` : errorMessage;
        toast.error(`Failed to save banner: ${fullError}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    if (isBlocked) {
      toast.error('Cannot delete banners while requests are blocked. Please disable ad blockers or privacy extensions for this site.');
      setDeleteTarget(null);
      return;
    }

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;
      toast.success('Banner deleted successfully');
      fetchBanners();
    } catch (error: any) {
      console.error('Error deleting banner:', error);
      const errorMessage = error?.message || 'Unknown error';
      
      const blocked = errorMessage.includes('Failed to fetch') || 
                     errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
                     errorMessage.includes('NetworkError');
      
      if (blocked) {
        setIsBlocked(true);
        toast.error('Cannot delete banner: requests are blocked. Please disable ad blockers or privacy extensions for this site.');
      } else {
        toast.error(`Failed to delete banner: ${errorMessage}`);
      }
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    if (isBlocked) {
      toast.error('Cannot update banner status while requests are blocked. Please disable ad blockers or privacy extensions for this site.');
      return;
    }

    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      toast.success('Banner status updated');
      fetchBanners();
    } catch (error: any) {
      console.error('Error updating banner status:', error);
      const errorMessage = error?.message || 'Unknown error';
      
      const blocked = errorMessage.includes('Failed to fetch') || 
                     errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
                     errorMessage.includes('NetworkError');
      
      if (blocked) {
        setIsBlocked(true);
        toast.error('Cannot update banner: requests are blocked. Please disable ad blockers or privacy extensions for this site.');
      } else {
        toast.error(`Failed to update banner status: ${errorMessage}`);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      link_url: '',
      button_text: 'Learn More',
      is_active: true,
      display_order: 0,
      event_id: null
    });
  };

  const openEditDialog = (banner: Banner) => {
    console.log('Opening edit dialog for banner:', banner);
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      description: banner.description || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      button_text: banner.button_text || 'Learn More',
      is_active: banner.is_active ?? true,
      display_order: banner.display_order ?? 0,
      event_id: banner.event_id || null
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingBanner(null);
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading banners...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Banner Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage home page slider banners and announcements
          </p>
          {isBlocked && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-dashed border-red-400 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="mt-[2px] h-4 w-4 flex-shrink-0" />
              <span>
                Banner requests are blocked by browser extensions. Please disable ad blockers or privacy extensions for this site to manage banners.
              </span>
            </div>
          )}
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            // Reset form when dialog closes
            setEditingBanner(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} disabled={isBlocked}>
              <Plus className="h-4 w-4 mr-2" />
              Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-2xl sm:w-full max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? 'Edit Banner' : 'Create New Banner'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="event_id">Link to Event (optional)</Label>
                  <select
                    id="event_id"
                    value={formData.event_id || ''}
                    onChange={(e) => setFormData({ ...formData, event_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">No event link</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    When set, clicking the banner will redirect to this event
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="link_url">External Link URL (optional)</Label>
                  <Input
                    id="link_url"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://example.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    External link will be ignored if event link is set
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="button_text">Button Text</Label>
                  <Input
                    id="button_text"
                    value={formData.button_text}
                    onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="sm:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="sm:w-auto"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" className="sm:w-auto" disabled={isBlocked || isSubmitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Saving...' : editingBanner ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.map((banner) => (
          <Card key={banner.id} className="overflow-hidden">
            <div className="relative h-48 bg-cover bg-center" style={{ backgroundImage: `url(${banner.image_url})` }}>
              <div className="absolute inset-0 bg-black/50 flex items-end p-4">
                <div className="text-white">
                  <h3 className="font-bold text-lg mb-1">{banner.title}</h3>
                  <p className="text-sm opacity-90">{banner.description}</p>
                </div>
              </div>
            </div>
            
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={banner.is_active}
                    onCheckedChange={() => handleToggleActive(banner.id, banner.is_active)}
                    disabled={isBlocked}
                  />
                  <span className="text-sm">
                    {banner.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Order: {banner.display_order}
                </span>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(banner)}
                  disabled={isBlocked}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteTarget(banner)}
                  disabled={isBlocked}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete banner?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will permanently remove "${deleteTarget.title}" from the homepage. This action cannot be undone.`
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {banners.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No banners found</p>
          <Button onClick={openCreateDialog} disabled={isBlocked}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Banner
          </Button>
        </div>
      )}
    </div>
  );
};

export default BannerManagement;