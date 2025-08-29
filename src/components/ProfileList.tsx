import React from 'react';
import ProfileCard from '@/components/ProfileCard';
import { useWeb3 } from '@/context/Web3Context';

interface ProfileListProps {
  profiles: any[]; // In a real implementation, this would be typed as UserProfile[]
  title?: string;
  className?: string;
}

export default function ProfileList({ profiles, title, className = '' }: ProfileListProps) {
  const { address: currentUserAddress } = useWeb3();

  if (profiles.length === 0) {
    return (
      <div className={className}>
        {title && <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>}
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500">No profiles found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {title && <h2 className="text-lg font-medium text-gray-900 mb-4">{title}</h2>}
      <div className="space-y-4">
        {profiles.map((profile) => (
          <ProfileCard 
            key={profile.address || profile.id} 
            profile={profile} 
            currentUserAddress={currentUserAddress}
          />
        ))}
      </div>
    </div>
  );
}