
# Advanced Campus Catalyst - Campus Event Management System

A comprehensive platform designed to enhance campus life through simplified event management and discovery.

## Project Overview

Advanced Campus Catalyst is a web application that helps students, organizers, and administrators manage campus events effectively. The platform enables:

- Students to discover and register for events, view their registrations, and provide feedback
- Organizers to create, manage, and track attendance for their events
- Admins to oversee all platform activities, approve organizer accounts, and moderate content

## Tech Stack

### Frontend
- React.js with TypeScript
- React Router v6 for routing
- Tailwind CSS for styling
- shadcn/ui for UI components
- Context API for state management
- Sonner for toast notifications

### Backend (to be implemented)
- FastAPI (Python)
- MongoDB with Motor or Beanie ODM

## Features

### User Authentication
- Three user roles: Student, Organizer, Admin
- Registration and login system
- Role-based access controls

### Student Features
- Browse upcoming events
- Register for and cancel registration for events
- View personal event registrations
- Submit feedback for attended events

### Organizer Features
- Create, edit, and delete events
- View attendees for each event
- Track registration numbers
- Manage their own events

### Admin Features
- Approve or reject organizer role requests
- View and manage all users
- Access all events (with edit/delete capabilities)
- Moderate submitted feedback

## Folder Structure

```
src/
├── components/        # Reusable UI components
├── context/           # Context providers for global state
├── lib/               # Utility functions
├── pages/             # Page components
│   ├── admin/         # Admin-specific pages
│   ├── events/        # Event-related pages
│   ├── organizer/     # Organizer-specific pages
│   └── student/       # Student-specific pages
└── App.tsx            # Main application component with routing
```

## Setup Instructions

1. Clone the repository
```
git clone https://github.com/yourusername/campus-catalyst.git
cd campus-catalyst
```

2. Install dependencies
```
npm install
```

3. Start the development server
```
npm run dev
```

4. Open your browser and navigate to `http://localhost:8080`

## Demo Accounts

For testing purposes, the following accounts are available:

- **Student**: 
  - Email: student@example.com
  - Password: password

- **Organizer**: 
  - Email: organizer@example.com
  - Password: password

- **Admin**: 
  - Email: admin@example.com
  - Password: password

## Future Improvements

- JWT or OAuth authentication for enhanced security
- Image uploads for event banners and user profiles
- Email notifications for event reminders and registration confirmations
- Calendar integration
- Mobile app version
- Real-time notifications
- Advanced search and filtering options
- Event categories and tags
- Social features (share events, follow organizers)
- Analytics dashboard for organizers and admins
