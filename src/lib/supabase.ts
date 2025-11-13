
import { createClient } from '@supabase/supabase-js';

// Use the main Supabase URL and anon key from the project
export const SUPABASE_URL = 'https://lutstmiitytmvxmaorkh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1dHN0bWlpdHl0bXZ4bWFvcmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzNzE3NDUsImV4cCI6MjA1OTk0Nzc0NX0.T0EHIzWMvsxmS2bJEh3G9A9seyb8gNnHzSS8GgLRUGU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'campus-catalyst-auth',
    storage: localStorage,
    // Tell Supabase to look for the session in the URL, which is important for email confirmation
    detectSessionInUrl: true
  }
});

// Add the isSupabaseConfigured function
export const isSupabaseConfigured = (): boolean => {
  return true; // Since we have default values now, Supabase should always be configured
};

// Simplified function to check if event approval column exists
export const ensureEventApprovalColumn = async (): Promise<void> => {
  try {
    // Simple query to check if isApproved column is present
    const { error: checkError } = await supabase
      .from('events')
      .select('id, is_approved')
      .limit(1);
    
    if (checkError) {
      console.error('Error checking events table:', checkError);
    }
    
    // Update any null isApproved values to true
    const { error: updateError } = await supabase
      .from('events')
      .update({ is_approved: true })
      .is('is_approved', null);
      
    if (updateError) {
      console.error('Error updating null approval values:', updateError);
    } else {
      console.log('Updated any null isApproved values to true');
    }
  } catch (err) {
    console.error('Failed to ensure event approval column:', err);
  }
};
