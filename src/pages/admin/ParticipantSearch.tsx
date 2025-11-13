import React from 'react';
import ParticipantSearch from '@/components/ParticipantSearch';

const ParticipantSearchPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Participant Search</h1>
        <p className="text-muted-foreground mt-2">
          Search and manage event participants with advanced filtering options
        </p>
      </div>
      <ParticipantSearch />
    </div>
  );
};

export default ParticipantSearchPage;