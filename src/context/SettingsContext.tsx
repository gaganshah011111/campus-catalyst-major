import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SiteSettings {
  id: string;
  maintenance_mode: boolean;
  support_email: string;
  updated_at: string;
}

interface SettingsContextValue {
  settings: SiteSettings | null;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (changes: Partial<Pick<SiteSettings, 'maintenance_mode' | 'support_email'>>) => Promise<SiteSettings | null>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data as SiteSettings);
      } else {
        setSettings(null);
      }
    } catch (error: any) {
      console.error('Error fetching site settings:', error);
      toast.error(`Unable to load site settings: ${error?.message || 'Unknown error'}`);
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (
    changes: Partial<Pick<SiteSettings, 'maintenance_mode' | 'support_email'>>
  ): Promise<SiteSettings | null> => {
    try {
      if (!settings?.id) {
        throw new Error('Settings record missing. Please seed the database.');
      }

      const { data, error } = await supabase
        .from('site_settings')
        .update(changes)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const updated = data as SiteSettings;
      setSettings(updated);
      return updated;
    } catch (error: any) {
      console.error('Error updating site settings:', error);
      toast.error(`Unable to update settings: ${error?.message || 'Unknown error'}`);
      throw error;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      isLoading,
      refreshSettings: fetchSettings,
      updateSettings,
    }),
    [settings, isLoading]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

