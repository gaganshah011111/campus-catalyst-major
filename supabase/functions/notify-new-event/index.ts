
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Initialize Gmail SMTP client
const gmailUser = Deno.env.get('GMAIL_USER')!;
const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD')!;

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://lutstmiitytmvxmaorkh.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EventPayload {
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
    // Parse the request body
    const { event } = await req.json() as { event: EventPayload };
    
    if (!event || !event.id || !event.title) {
      return new Response(
        JSON.stringify({ error: "Invalid request: Missing event data" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create a Supabase client to fetch users
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Format the event date for the email
    const eventDate = new Date(event.start_time);
    const formattedDate = new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(eventDate);

    // Create in-app notifications for users
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, name, role")
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

    // Create in-app notifications
    const notifications = [];
    const title = `New Event: ${event.title}`;
    const message = `A new event "${event.title}" has been created. Location: ${event.location}. Date: ${formattedDate}`;
    
    // Add notifications for all approved users
    if (users && users.length > 0) {
      for (const user of users) {
        notifications.push({
          event_id: parseInt(event.id),
          user_id: user.id,
          title,
          message,
          type: 'info'
        });
      }
      
      // Insert notifications
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);
        
      if (notificationError) {
        console.error('Error creating in-app notifications:', notificationError);
      } else {
        console.log(`Created ${notifications.length} in-app notifications`);
      }
    }

    // Create a formatted description (truncated if too long)
    const shortDescription = event.description.length > 150
      ? event.description.substring(0, 147) + "..."
      : event.description;

    // Build the event URL
    const eventUrl = `${req.headers.get("origin") || "https://campus-catalyst-app.com"}/events/${event.id}`;
    
    // Batch process emails
    console.log(`Sending notification emails to ${users.length} users about new event: ${event.title}`);
    
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
          subject: `🎉 New Event: ${event.title} - Register Now!`,
          html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin: 0; padding: 0; background-color: #f9fafb;"><div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;"><h2 style="color: #4f46e5; margin-bottom: 20px;">New Event Added: ${event.title}</h2>${event.image_url ? `<img src="${event.image_url}" alt="${event.title}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px; display: block;">` : ''}<p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">${shortDescription}</p><div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 24px;"><p style="margin: 8px 0; color: #1f2937;"><strong>Date &amp; Time:</strong> ${formattedDate}</p><p style="margin: 8px 0; color: #1f2937;"><strong>Location:</strong> ${event.location}</p><p style="margin: 8px 0; color: #1f2937;"><strong>Capacity:</strong> ${event.max_capacity} attendees</p></div><div style="text-align: center; margin: 32px 0;"><a href="${eventUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">View Event Details</a></div><p style="color: #6b7280; font-size: 14px; margin-top: 32px; line-height: 1.5; text-align: center;">If you're no longer interested in receiving these notifications, please update your preferences in your account settings.</p></div></body></html>`,
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

    // Start processing emails in the background using Deno's waitUntil 
    // so we can return a response quickly while emails continue sending
    const processEmailsInBackground = async () => {
      try {
        // Wait for all emails to be sent
        const results = await Promise.all(emailPromises);
        
        // Count successful and failed emails
        const successful = results.filter(r => r && r.success).length;
        const failed = results.filter(r => r && !r.success).length;
        
        console.log(`Successfully sent ${successful} emails, ${failed} failed`);
      } catch (error) {
        console.error("Background email processing error:", error);
      }
    };
    
    // Use waitUntil if available in this Deno runtime
    if (typeof Deno.env.get("DENO_DEPLOYMENT_ID") !== "undefined" && 
        typeof (self as any).EdgeRuntime !== "undefined") {
      (self as any).EdgeRuntime.waitUntil(processEmailsInBackground());
    } else {
      // Fallback to standard promise for local development
      processEmailsInBackground().catch(console.error);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notification process started for users`,
        event: event // Return the event data
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error in notify-new-event function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
