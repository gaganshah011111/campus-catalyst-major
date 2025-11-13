
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <h1 className="text-9xl font-bold text-gray-200">404</h1>
      <h2 className="text-3xl font-bold mt-6 mb-4">Page Not Found</h2>
      <p className="text-lg text-gray-600 mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link to="/">
          <Button>Go Home</Button>
        </Link>
        <Link to="/events">
          <Button variant="outline">Browse Events</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
