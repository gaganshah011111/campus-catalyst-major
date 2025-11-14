
import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { toast } from 'sonner';
import { useFirstLogin } from '@/hooks/use-first-login';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { settings, isLoading: settingsLoading } = useSettings();
  const { FirstLoginDialog } = useFirstLogin();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Provide feedback when user logs in
  useEffect(() => {
    if (isAuthenticated && user) {
      toast.success(`Welcome back, ${user.name}!`);
    }
  }, [isAuthenticated, user]);

  const maintenanceActive = settings?.maintenance_mode ?? false;
  const supportEmail = settings?.support_email ?? 'support@example.com';
  const isAdmin = user?.role === 'admin';
  const shouldShowMaintenanceOverlay = maintenanceActive && !isAdmin;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col">
      <Navbar toggleSidebar={toggleSidebar} />
      {/* Mobile overlay to close sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <FirstLoginDialog />
      <div className="flex">
        {isAuthenticated && <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />}
        <div 
          className={`flex-1 transition-all duration-300 ease-in-out ${isAuthenticated ? 'md:ml-64' : ''}`}
          onClick={() => sidebarOpen && setSidebarOpen(false)}
        >
          <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {settingsLoading ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                <p className="mt-4 text-muted-foreground">Loading site settings...</p>
              </div>
            ) : shouldShowMaintenanceOverlay ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-center space-y-4">
                <h2 className="text-3xl font-semibold">We'll be right back</h2>
                <p className="max-w-xl text-muted-foreground">
                  Advanced Campus Catalyst is currently in maintenance mode. Administrators are applying updates to improve your experience.
                  Please check back soon or contact us at <span className="font-medium text-primary">{supportEmail}</span> if you need immediate assistance.
                </p>
              </div>
            ) : (
              <>
                {maintenanceActive && isAdmin && (
                  <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Maintenance mode is active. Regular users see a maintenance notice until you disable it in Admin Settings.
                  </div>
                )}
                <Outlet />
              </>
            )}
          </main>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="mt-auto py-3 px-4 border-t border-border bg-background relative z-10 md:ml-64">
        <div className="max-w-7xl mx-auto px-0">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2 md:gap-4">
            <p className="text-xs md:text-sm text-muted-foreground text-center md:text-left">
              © {new Date().getFullYear()} Advanced Campus Catalyst. All rights reserved.
            </p>
            <div className="flex flex-row gap-2 sm:gap-3 items-center">
              <Link
                to="/about"
                className="px-3 py-1 rounded-md border border-primary/30 hover:border-primary hover:bg-primary/5 text-xs font-medium text-foreground transition-all duration-200 hover:shadow-sm"
              >
                About
              </Link>
              <Link
                to="/developers"
                className="px-3 py-1 rounded-md border border-primary/30 hover:border-primary hover:bg-primary/5 text-xs font-medium text-foreground transition-all duration-200 hover:shadow-sm"
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

export default Layout;
