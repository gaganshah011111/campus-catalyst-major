
import { supabase } from '../lib/supabase';

export const migrateLocalEventsToSupabase = async () => {
  // Check if there are any events in localStorage
  const storedEvents = localStorage.getItem('events');
  
  if (!storedEvents) {
    console.log('No local events to migrate');
    return { success: true, message: 'No local events to migrate' };
  }
  
  try {
    const events = JSON.parse(storedEvents);
    if (!Array.isArray(events) || events.length === 0) {
      console.log('No valid events to migrate');
      return { success: true, message: 'No valid events to migrate' };
    }
    
    // Insert all events into Supabase
    const { data, error } = await supabase
      .from('events')
      .insert(events);
    
    if (error) throw error;
    
    // Clear localStorage after successful migration
    localStorage.removeItem('events');
    
    return {
      success: true,
      message: `Successfully migrated ${events.length} events to Supabase`,
    };
  } catch (error) {
    console.error('Error migrating events:', error);
    return {
      success: false,
      message: 'Error during migration. Check console for details.',
    };
  }
};
