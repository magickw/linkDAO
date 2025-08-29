import React from 'react';
import Link from 'next/link';

interface DAOTreasuryHeaderProps {
  communityName: string;
  members: number;
  online: number;
  description: string;
  userJoined: boolean;
  onJoinToggle: () => void;
}

export default function DAOTreasuryHeader({ 
  communityName, 
  members, 
  online, 
  description, 
  userJoined, 
  onJoinToggle 
}: DAOTreasuryHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 overflow-hidden">
      {/* Banner */}
      <div className="h-24 bg-gradient-to-r from-primary-500 to-purple-600"></div>
      
      {/* Community Info */}
      <div className="px-4 pb-4">
        <div className="flex items-end -mt-8">
          <div className="bg-gray-200 border-4 border-white dark:border-gray-800 rounded-full w-16 h-16" />
          <div className="ml-4 flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">/dao/{communityName}</h1>
            <p className="text-gray-600 dark:text-gray-300">{communityName} Community</p>
          </div>
          <button
            onClick={onJoinToggle}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              userJoined
                ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {userJoined ? 'Joined' : 'Join'}
          </button>
        </div>
        
        <div className="mt-4 flex space-x-4 text-sm">
          <div>
            <span className="font-medium text-gray-900 dark:text-white">{members.toLocaleString()}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">Members</span>
          </div>
          <div>
            <span className="font-medium text-gray-900 dark:text-white">{online.toLocaleString()}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">Online</span>
          </div>
        </div>
        
        <p className="mt-3 text-gray-700 dark:text-gray-300">{description}</p>
        
        <div className="mt-4 flex space-x-2">
          <Link href={`/dao/${communityName}`} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full text-sm font-medium text-gray-800 dark:text-white">
            Posts
          </Link>
          <Link href={`/dao/${communityName}/proposals`} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full text-sm font-medium text-gray-800 dark:text-white">
            Proposals
          </Link>
          <Link href={`/dao/${communityName}/governance`} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full text-sm font-medium text-gray-800 dark:text-white">
            Governance
          </Link>
          <Link href={`/dao/${communityName}/marketplace`} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full text-sm font-medium text-gray-800 dark:text-white">
            Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}