import React from 'react';
import ParticipantSearch from '@/components/ParticipantSearch';

const OrganizerParticipantSearchPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Event Participants</h1>
        <p className="text-muted-foreground mt-2">
          Search and manage participants from your events
        </p>
      </div>
      <ParticipantSearch />
    </div>
  );
};

export default OrganizerParticipantSearchPage;