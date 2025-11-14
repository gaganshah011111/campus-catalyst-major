
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Users, Bookmark, Award } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      {/* Hero Section */}
      <section className="py-16 px-4 md:py-24 max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Campus <span className="text-primary">Catalyst</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Discover, join, and create campus events that spark connections and opportunities.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/login">
              <Button size="lg" className="text-base">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="outline" className="text-base">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 px-4 bg-background">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-semibold text-center mb-12">Everything You Need for Campus Events</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-none shadow-md">
              <CardContent className="pt-6">
                <div className="rounded-full bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <CalendarDays className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Discover Events</h3>
                <p className="text-muted-foreground">
                  Browse and filter through campus events based on your interests and schedule.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-none shadow-md">
              <CardContent className="pt-6">
                <div className="rounded-full bg-green-600/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Register & Attend</h3>
                <p className="text-muted-foreground">
                  Sign up for events with one click and receive digital tickets for easy check-in.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20 border-none shadow-md">
              <CardContent className="pt-6">
                <div className="rounded-full bg-amber-600/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Bookmark className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Organize Events</h3>
                <p className="text-muted-foreground">
                  Create and manage your own events with powerful tools for organizers.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-none shadow-md">
              <CardContent className="pt-6">
                <div className="rounded-full bg-purple-600/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Earn Certificates</h3>
                <p className="text-muted-foreground">
                  Get digital certificates for attending workshops and educational events.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4 text-center bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Ready to Join the Community?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Sign up today and never miss another campus opportunity again.
          </p>
          <Link to="/register">
            <Button size="lg" className="text-base">
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-muted/30 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © {new Date().getFullYear()} Advanced Campus Catalyst. All rights reserved.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
              <Link 
                to="/about" 
                className="px-4 py-2 rounded-lg border border-primary/30 hover:border-primary hover:bg-primary/5 text-sm font-medium text-foreground transition-all duration-200 hover:shadow-sm"
              >
                About
              </Link>
              <Link 
                to="/developers" 
                className="px-4 py-2 rounded-lg border border-primary/30 hover:border-primary hover:bg-primary/5 text-sm font-medium text-foreground transition-all duration-200 hover:shadow-sm"
              >
                Developers
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
