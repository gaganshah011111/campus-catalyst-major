import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Initialize Gmail SMTP credentials
const gmailUser = Deno.env.get('GMAIL_USER')!;
const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD')!;

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://lutstmiitytmvxmaorkh.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EventData {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  max_capacity: number;
  image_url?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eventData }: { eventData: EventData } = await req.json();
    
    if (!eventData || !eventData.id || !eventData.title) {
      return new Response(
        JSON.stringify({ error: "Invalid request: Missing event data" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Supabase client to fetch all users
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all approved users from profiles table
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, name")
      .eq("is_approved", true);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch users" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No users to notify" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Format the event date for the email
    const eventDate = new Date(eventData.start_time);
    const formattedDate = new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(eventDate);

    // Build the event URL
    const eventUrl = `${req.headers.get("origin") || "https://campus-catalyst-app.com"}/events/${eventData.id}`;
    
    // Create a formatted description (truncated if too long)
    const shortDescription = eventData.description.length > 150
      ? eventData.description.substring(0, 147) + "..."
      : eventData.description;

    console.log(`Sending notification emails to ${users.length} users about new event: ${eventData.title}`);

    // Create in-app notifications for all users
    const notifications = users.map(user => ({
      event_id: parseInt(eventData.id),
      user_id: user.id,
      title: `New Event: ${eventData.title}`,
      message: `A new event "${eventData.title}" has been created. Location: ${eventData.location}. Date: ${formattedDate}`,
      type: 'info'
    }));
    
    // Insert in-app notifications
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);
      
    if (notificationError) {
      console.error('Error creating in-app notifications:', notificationError);
    } else {
      console.log(`Created ${notifications.length} in-app notifications`);
    }

    // Send emails with rate limiting (1 second between emails for Gmail)
    const sendEmailWithDelay = async (user: any, delay: number) => {
      if (!user.email) return { success: false, email: user.email, error: "No email address" };
      
      // Wait for the specified delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        const client = new SMTPClient({
          connection: {
            hostname: "smtp.gmail.com",
            port: 465,
            tls: true,
            auth: {
              username: gmailUser,
              password: gmailPassword,
            },
          },
        });

        await client.send({
          from: `Campus Catalyst <${gmailUser}>`,
          to: user.email,
          subject: `🎉 New Event: ${eventData.title} - Register Now!`,
          content: "auto",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4f46e5;">New Event Added: ${eventData.title}</h2>
              
              ${eventData.image_url ? `<img src="${eventData.image_url}" alt="${eventData.title}" style="max-width: 100%; border-radius: 8px; margin-bottom: 20px;">` : ''}
              
              <p style="color: #374151; font-size: 16px; margin-bottom: 24px;">${shortDescription}</p>
              
              <div style="margin-bottom: 24px;">
                <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${formattedDate}</p>
                <p style="margin: 4px 0;"><strong>Location:</strong> ${eventData.location}</p>
                <p style="margin: 4px 0;"><strong>Capacity:</strong> ${eventData.max_capacity} attendees</p>
              </div>
              
              <a href="${eventUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Event & Register</a>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
                If you're no longer interested in receiving these notifications, please update your preferences in your account settings.
              </p>
            </div>
          `,
        });

        await client.close();

        console.log(`Email sent successfully to ${user.email}`);
        return { success: true, email: user.email };
      } catch (emailError) {
        console.error(`Error sending email to ${user.email}:`, emailError);
        return { success: false, email: user.email, error: emailError };
      }
    };

    // Create email promises with staggered delays (1000ms between each to respect Gmail limits)
    const emailPromises = users.map((user, index) => 
      sendEmailWithDelay(user, index * 1000)
    );

    // Process emails in background
    const processEmailsInBackground = async () => {
      try {
        const results = await Promise.all(emailPromises);
        
        const successful = results.filter(r => r && r.success).length;
        const failed = results.filter(r => r && !r.success).length;
        
        console.log(`Email notification complete: ${successful} successful, ${failed} failed`);
      } catch (error) {
        console.error("Background email processing error:", error);
      }
    };

    // Start background email processing
    processEmailsInBackground().catch(console.error);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notification process started for ${users.length} users`,
        event: eventData
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error) {
    console.error("Error in send-event-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});