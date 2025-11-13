import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useSettings } from '@/context/SettingsContext';

const AdminSettings: React.FC = () => {
  const { settings, isLoading, updateSettings, refreshSettings } = useSettings();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [supportEmail, setSupportEmail] = useState('support@example.com');
  const [saving, setSaving] = useState(false);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSaving(true);
      await updateSettings({
        maintenance_mode: maintenanceMode,
        support_email: supportEmail,
      });
      toast.success('Settings updated successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(`Unable to save settings: ${error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (settings) {
      setMaintenanceMode(settings.maintenance_mode);
      setSupportEmail(settings.support_email);
    }
  }, [settings]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure global options for Campus Catalyst.
        </p>
      </div>

      {!isLoading && !settings && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Site settings could not be loaded. Ensure the database migration for <code>site_settings</code> has been applied,
          then use the Refresh button to try again.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Controls</CardTitle>
            <CardDescription>Toggle global options that affect the entire campus portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border border-border rounded-md p-4">
              <div>
                <p className="font-medium">Maintenance mode</p>
                <p className="text-sm text-muted-foreground">
                  Temporarily disables public access. Students and organizers will see a maintenance notice.
                </p>
              </div>
              <Switch
                checked={maintenanceMode}
                onCheckedChange={setMaintenanceMode}
                aria-label="Toggle maintenance mode"
              />
            </div>
            {settings?.maintenance_mode && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Maintenance mode is currently active. Only administrators can access the application while this is enabled.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support & Notifications</CardTitle>
            <CardDescription>
              Update contact information used in automated emails and help prompts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={supportEmail}
                onChange={(event) => setSupportEmail(event.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Students will see this address in confirmation emails and the help section.
              </p>
            </div>
            {settings?.support_email !== supportEmail && (
              <p className="text-xs text-muted-foreground">
                Updating the support email will immediately reflect across transactional emails.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col items-stretch justify-end gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={refreshSettings}
            disabled={saving || isLoading}
          >
            Refresh
          </Button>
          <Button type="submit" disabled={saving || isLoading}>
            {saving ? 'Saving...' : isLoading ? 'Loading...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminSettings;

