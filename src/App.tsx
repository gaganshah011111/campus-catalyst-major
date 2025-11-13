import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Contexts
import { AuthProvider } from "./context/AuthContext";
import { EventProvider } from "./context/EventContext";
import { UserProvider } from "./context/UserContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ThemeProvider } from "./hooks/use-theme";

// Components
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages - Public
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PendingApproval from "./pages/PendingApproval";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Developers from "./pages/Developers";

// Pages - Events
import EventList from "./pages/events/EventList";
import EventDetail from "./pages/events/EventDetail";
import EventForm from "./pages/events/EventForm";
import EventFeedbackForm from "./pages/events/EventFeedbackForm";
import EventTicketPage from './pages/events/EventTicketPage';
import EventRegistrationPage from "./pages/events/EventRegistrationPage";
import CertificateView from "./pages/CertificateView";
import QRDetailsView from "./pages/QRDetailsView";

// Pages - Student
import StudentDashboard from "./pages/student/StudentDashboard";
import RegisteredEvents from "./pages/student/RegisteredEvents";
import MyTickets from "./pages/student/MyTickets";
import StudentFeedback from "./pages/student/StudentFeedback";
import StudentProfile from "./pages/student/StudentProfile";
import StudentCertificates from "./pages/student/StudentCertificates";
import StudentAchievements from "./pages/student/StudentAchievements";

// Pages - Organizer
import OrganizerDashboard from "./pages/organizer/OrganizerDashboard";
import OrganizerEvents from "./pages/organizer/OrganizerEvents";
import EventAttendees from "./pages/organizer/EventAttendees";
import OrganizerProfile from "./pages/organizer/OrganizerProfile";
import OrganizerFeedback from "./pages/organizer/OrganizerFeedback";
import IssueCertificates from "./pages/organizer/IssueCertificates";
import OrganizerSearch from "./pages/organizer/OrganizerSearch";
import AssignWinners from "./pages/organizer/AssignWinners";

// Pages - Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUserManagement from "./pages/admin/AdminUserManagement";
import AdminApprovals from "./pages/admin/AdminApprovals";
import AdminFeedbackModeration from "./pages/admin/AdminFeedbackModeration";
import AdminEventApprovals from "./pages/admin/AdminEventApprovals";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminDeepSearch from "./pages/admin/AdminDeepSearch";
import BannerManagement from "./pages/admin/BannerManagement";
import AdminSettings from "./pages/admin/AdminSettings";

// Add CSS
import "./App.css";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <SettingsProvider>
            <EventProvider>
              <UserProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Auth Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/pending-approval" element={<PendingApproval />} />
                  
                  {/* Main Layout Routes */}
                  <Route element={<Layout />}>
                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/developers" element={<Developers />} />
                    <Route path="/events" element={<EventList />} />
                    {/* More specific route should come first */}
                    <Route 
                      path="/events/:id/register" 
                      element={
                        <ProtectedRoute allowedRoles={['student']}>
                          <EventRegistrationPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route path="/events/:id" element={<EventDetail />} />
                    
                    {/* Student Routes */}
                    <Route 
                      path="/student" 
                      element={<Navigate to="/student/dashboard" replace />} 
                    />
                    <Route 
                      path="/student/dashboard" 
                      element={
                        <ProtectedRoute allowedRoles={['student']}>
                          <StudentDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/student/registered" 
                      element={
                        <ProtectedRoute allowedRoles={['student']}>
                          <RegisteredEvents />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/student/tickets" 
                      element={
                        <ProtectedRoute allowedRoles={['student']}>
                          <MyTickets />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/student/feedback" 
                      element={
                        <ProtectedRoute allowedRoles={['student']}>
                          <StudentFeedback />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/student/certificates" 
                      element={
                        <ProtectedRoute allowedRoles={['student']}>
                          <StudentCertificates />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/student/achievements" 
                      element={
                        <ProtectedRoute allowedRoles={['student']}>
                          <StudentAchievements />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/student/profile" 
                      element={
                        <ProtectedRoute allowedRoles={['student']}>
                          <StudentProfile />
                        </ProtectedRoute>
                      } 
                    />
                    
                    {/* Organizer Routes */}
                    <Route 
                      path="/organizer" 
                      element={
                        <ProtectedRoute allowedRoles={['organizer']}>
                          <OrganizerDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/organizer/events" 
                      element={
                        <ProtectedRoute allowedRoles={['organizer']}>
                          <OrganizerEvents />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/organizer/events/create" 
                      element={
                        <ProtectedRoute allowedRoles={['organizer']}>
                          <EventForm />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/events/:id/attendees" 
                      element={
                        <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                          <EventAttendees />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/organizer/profile" 
                      element={
                        <ProtectedRoute allowedRoles={['organizer']}>
                          <OrganizerProfile />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/organizer/feedback" 
                      element={
                        <ProtectedRoute allowedRoles={['organizer']}>
                          <OrganizerFeedback />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/organizer/search" 
                      element={
                        <ProtectedRoute allowedRoles={['organizer']}>
                          <OrganizerSearch />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/organizer/winners" 
                      element={
                        <ProtectedRoute allowedRoles={['organizer']}>
                          <AssignWinners />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/organizer/events/:eventId/certificates" 
                      element={
                        <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                          <IssueCertificates />
                        </ProtectedRoute>
                      } 
                    />
                    
                    {/* Admin Routes */}
                    <Route 
                      path="/admin" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/users" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <AdminUserManagement />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/approvals" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <AdminApprovals />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/event-approvals" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <AdminEventApprovals />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/events" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <OrganizerEvents />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/events/create" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <EventForm />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/feedback" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <AdminFeedbackModeration />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/profile" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <AdminProfile />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/settings" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <AdminSettings />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/deep-search" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <AdminDeepSearch />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin/banners" 
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <BannerManagement />
                        </ProtectedRoute>
                      } 
                    />
                    
                    {/* Shared Protected Routes */}
                    <Route 
                      path="/events/:id/edit" 
                      element={
                        <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                          <EventForm />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/events/:id/feedback" 
                      element={
                        <ProtectedRoute allowedRoles={['student']}>
                          <EventFeedbackForm />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/events/:id/ticket" 
                      element={
                        <ProtectedRoute allowedRoles={['any']}>
                          <EventTicketPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/certificate/:certificateId" 
                      element={
                        <ProtectedRoute allowedRoles={['any']}>
                          <CertificateView />
                        </ProtectedRoute>
                      } 
                    />
                  </Route>
                  
                  {/* Public QR Details Route - No authentication required */}
                  <Route path="/qr/:token" element={<QRDetailsView />} />
                  
                  {/* Catch-all route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              </UserProvider>
            </EventProvider>
          </SettingsProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
