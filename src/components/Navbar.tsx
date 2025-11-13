import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LogOut, 
  Menu, 
  LogIn, 
  UserPlus, 
  Home, 
  CalendarDays, 
  ClipboardList, 
  PenLine, 
  User, 
  Sun, 
  Moon,
  Ticket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { NotificationDropdown } from './NotificationDropdown';

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const renderDashboardLink = () => {
    if (!user) return null;
    
    switch (user.role) {
      case 'student':
        return <Link to="/student" className="text-primary font-medium">Student Dashboard</Link>;
      case 'organizer':
        return <Link to="/organizer" className="text-primary font-medium">Organizer Dashboard</Link>;
      case 'admin':
        return <Link to="/admin" className="text-primary font-medium">Admin Dashboard</Link>;
      default:
        return null;
    }
  };

  const renderProfileLink = () => {
    if (!user) return null;
    
    const profilePath = `/${user.role}/profile`;
    return profilePath;
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 dark:bg-gray-900 dark:border-gray-800 rounded-b-3xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar} 
              className="p-2 rounded-md text-gray-500 hover:text-gray-600 focus:outline-none md:hidden dark:text-gray-400 dark:hover:text-gray-300"
              aria-label="Toggle sidebar"
            >
              <Menu size={24} />
            </button>
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-primary dark:text-white">Campus Catalyst</span>
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-2">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link to="/">
                    <NavigationMenuLink className={cn(
                      navigationMenuTriggerStyle(),
                      isActive('/') && 'bg-accent text-accent-foreground'
                    )}>
                      <Home size={16} className="mr-1" />
                      Home
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
                
                <NavigationMenuItem>
                  <Link to="/events">
                    <NavigationMenuLink className={cn(
                      navigationMenuTriggerStyle(),
                      isActive('/events') && 'bg-accent text-accent-foreground'
                    )}>
                      <CalendarDays size={16} className="mr-1" />
                      Events
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                {user?.role === 'student' && (
                  <>
                    <NavigationMenuItem>
                      <Link to="/student/registered">
                        <NavigationMenuLink className={cn(
                          navigationMenuTriggerStyle(),
                          isActive('/student/registered') && 'bg-accent text-accent-foreground'
                        )}>
                          <ClipboardList size={16} className="mr-1" />
                          My Registrations
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <Link to="/student/tickets">
                        <NavigationMenuLink className={cn(
                          navigationMenuTriggerStyle(),
                          isActive('/student/tickets') && 'bg-accent text-accent-foreground'
                        )}>
                          <Ticket size={16} className="mr-1" />
                          My Tickets
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                  </>
                )}

                {user?.role === 'organizer' && (
                  <NavigationMenuItem>
                    <Link to="/organizer/events">
                      <NavigationMenuLink className={cn(
                        navigationMenuTriggerStyle(),
                        isActive('/organizer/events') && 'bg-accent text-accent-foreground'
                      )}>
                        <PenLine size={16} className="mr-1" />
                        Organize
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                )}

                {user && (
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>
                      <User size={16} className="mr-1" />
                      Profile
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[200px] gap-3 p-4">
                        <li className="row-span-1">
                          <NavigationMenuLink asChild>
                            <Link to={renderProfileLink()} className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-4 hover:bg-accent">
                              <div className="mb-2 mt-2 text-lg font-medium">
                                {user.name}
                              </div>
                              <p className="text-sm leading-tight text-muted-foreground">
                                View and edit your profile
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <div className="flex items-center space-x-4">
            {/* Theme toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              className="rounded-full"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            
            {user && <NotificationDropdown />}
            
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="bg-violet-100 dark:bg-violet-950/30 px-4 py-2 rounded-full border border-violet-200 dark:border-violet-800 hidden sm:inline-block">
                  <span className="text-sm text-violet-900 dark:text-violet-200 font-medium">Hi, {user.name}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="flex items-center gap-1"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline-block">Logout</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="flex items-center gap-1">
                    <LogIn size={16} />
                    <span>Login</span>
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="default" size="sm" className="flex items-center gap-1">
                    <UserPlus size={16} />
                    <span>Sign Up</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile menu - shown when hamburger menu is clicked */}
      <div className={cn(
        "md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity",
        mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}>
        <div className={cn(
          "fixed inset-y-0 right-0 w-3/4 max-w-xs bg-white dark:bg-gray-900 shadow-xl transform transition-transform ease-in-out duration-300",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="p-5">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Menu</h2>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            <div className="space-y-4">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                <div className="flex items-center">
                  <Home size={20} className="mr-3" />
                  <span>Home</span>
                </div>
              </Link>
              <Link to="/events" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                <div className="flex items-center">
                  <CalendarDays size={20} className="mr-3" />
                  <span>Events</span>
                </div>
              </Link>
              {user?.role === 'student' && (
                <>
                  <Link to="/student/registered" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div className="flex items-center">
                      <ClipboardList size={20} className="mr-3" />
                      <span>My Registrations</span>
                    </div>
                  </Link>
                  <Link to="/student/tickets" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                    <div className="flex items-center">
                      <Ticket size={20} className="mr-3" />
                      <span>My Tickets</span>
                    </div>
                  </Link>
                </>
              )}
              {user?.role === 'organizer' && (
                <Link to="/organizer/events" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                  <div className="flex items-center">
                    <PenLine size={20} className="mr-3" />
                    <span>Organize</span>
                  </div>
                </Link>
              )}
              {user && (
                <Link to={renderProfileLink()} onClick={() => setMobileMenuOpen(false)} className="block py-2 px-4 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                  <div className="flex items-center">
                    <User size={20} className="mr-3" />
                    <span>Profile</span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
