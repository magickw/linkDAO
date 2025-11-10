import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface RevenueStream {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  fee: string;
  description: string;
  flows: {
    destination: string;
    percentage: number;
    color: string;
  }[];
}

interface RevenueDestination {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  position: { x: number; y: number };
}

const MonetizationFlowDiagram: React.FC = () => {
  const [expandedStreams, setExpandedStreams] = useState<Set<string>>(new Set());
  const [selectedStream, setSelectedStream] = useState<string | null>(null);

  const revenueStreams: RevenueStream[] = [
    {
      id: 'tipping',
      name: 'Tipping & Awards',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
      color: '#4CAF50',
      fee: '5%',
      description: 'Revenue from tips and awards on posts/comments',
      flows: [
        { destination: 'dao-treasury', percentage: 40, color: '#FF9800' },
        { destination: 'community-pool', percentage: 30, color: '#2196F3' },
        { destination: 'subdaos', percentage: 15, color: '#9C27B0' },
        { destination: 'rewards', percentage: 10, color: '#F44336' },
        { destination: 'development', percentage: 3, color: '#00BCD4' },
        { destination: 'reserves', percentage: 2, color: '#607D8B' }
      ]
    },
    {
      id: 'marketplace',
      name: 'Marketplace Fees',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
      color: '#FF9800',
      fee: '3.5%',
      description: 'Transaction fees from marketplace activities',
      flows: [
        { destination: 'dao-treasury', percentage: 35, color: '#FF9800' },
        { destination: 'community-pool', percentage: 25, color: '#2196F3' },
        { destination: 'subdaos', percentage: 20, color: '#9C27B0' },
        { destination: 'rewards', percentage: 10, color: '#F44336' },
        { destination: 'development', percentage: 5, color: '#00BCD4' },
        { destination: 'reserves', percentage: 5, color: '#607D8B' }
      ]
    },
    {
      id: 'boosting',
      name: 'Post Boosting',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
      color: '#E91E63',
      fee: '10%',
      description: 'Revenue from promoted posts and content boosting',
      flows: [
        { destination: 'dao-treasury', percentage: 30, color: '#FF9800' },
        { destination: 'community-pool', percentage: 30, color: '#2196F3' },
        { destination: 'subdaos', percentage: 20, color: '#9C27B0' },
        { destination: 'rewards', percentage: 10, color: '#F44336' },
        { destination: 'development', percentage: 5, color: '#00BCD4' },
        { destination: 'reserves', percentage: 5, color: '#607D8B' }
      ]
    },
    {
      id: 'governance',
      name: 'Governance Rewards',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>,
      color: '#9C27B0',
      fee: '2%',
      description: 'Fees from governance participation and rewards',
      flows: [
        { destination: 'dao-treasury', percentage: 20, color: '#FF9800' },
        { destination: 'community-pool', percentage: 20, color: '#2196F3' },
        { destination: 'subdaos', percentage: 30, color: '#9C27B0' },
        { destination: 'rewards', percentage: 20, color: '#F44336' },
        { destination: 'development', percentage: 5, color: '#00BCD4' },
        { destination: 'reserves', percentage: 5, color: '#607D8B' }
      ]
    },
    {
      id: 'api-access',
      name: 'API Access',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>,
      color: '#00BCD4',
      fee: '15%',
      description: 'Revenue from API subscriptions and usage fees',
      flows: [
        { destination: 'dao-treasury', percentage: 50, color: '#FF9800' },
        { destination: 'community-pool', percentage: 15, color: '#2196F3' },
        { destination: 'subdaos', percentage: 10, color: '#9C27B0' },
        { destination: 'rewards', percentage: 10, color: '#F44336' },
        { destination: 'development', percentage: 10, color: '#00BCD4' },
        { destination: 'reserves', percentage: 5, color: '#607D8B' }
      ]
    },
    {
      id: 'subdao-economy',
      name: 'SubDAO Economy',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
      color: '#795548',
      fee: 'Varies',
      description: 'Revenue from SubDAO operations and staking',
      flows: [
        { destination: 'dao-treasury', percentage: 20, color: '#FF9800' },
        { destination: 'community-pool', percentage: 15, color: '#2196F3' },
        { destination: 'subdaos', percentage: 40, color: '#9C27B0' },
        { destination: 'rewards', percentage: 15, color: '#F44336' },
        { destination: 'development', percentage: 5, color: '#00BCD4' },
        { destination: 'reserves', percentage: 5, color: '#607D8B' }
      ]
    }
  ];

  const destinations: RevenueDestination[] = [
    {
      id: 'dao-treasury',
      name: 'DAO Treasury',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
      color: '#FF9800',
      description: 'Main treasury for DAO operations and strategic initiatives',
      position: { x: 50, y: 20 }
    },
    {
      id: 'community-pool',
      name: 'Community Pool',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
      color: '#2196F3',
      description: 'Funds for community rewards, events, and initiatives',
      position: { x: 20, y: 50 }
    },
    {
      id: 'subdaos',
      name: 'SubDAOs',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>,
      color: '#9C27B0',
      description: 'Revenue distribution to community SubDAOs',
      position: { x: 80, y: 50 }
    },
    {
      id: 'rewards',
      name: 'Rewards',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
      color: '#F44336',
      description: 'Staking, governance, and participation rewards',
      position: { x: 20, y: 80 }
    },
    {
      id: 'development',
      name: 'Development',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
      color: '#00BCD4',
      description: 'Platform development and maintenance',
      position: { x: 50, y: 80 }
    },
    {
      id: 'reserves',
      name: 'Reserves',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      color: '#607D8B',
      description: 'Emergency reserves and long-term sustainability',
      position: { x: 80, y: 80 }
    }
  ];

  const toggleStream = (streamId: string) => {
    const newExpanded = new Set(expandedStreams);
    if (newExpanded.has(streamId)) {
      newExpanded.delete(streamId);
    } else {
      newExpanded.add(streamId);
    }
    setExpandedStreams(newExpanded);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-2">
        LinkDAO Monetization Flow
      </h1>
      
      <p className="text-center text-gray-600 mb-8">
        Comprehensive revenue distribution across the LinkDAO ecosystem
      </p>

      {/* Revenue Sources */}
      <div className="flex flex-wrap gap-4 mb-8 justify-center">
        {revenueStreams.map((stream) => (
          <div
            key={stream.id}
            id={`stream-${stream.id}`}
            className={`p-4 min-w-[200px] cursor-pointer transition-all duration-300 ${
              selectedStream === stream.id ? 'scale-105 shadow-lg' : 'shadow-md'
            }`}
            style={{ backgroundColor: stream.color, color: 'white' }}
            onClick={() => setSelectedStream(stream.id === selectedStream ? null : stream.id)}
          >
            <div className="flex items-center mb-2">
              {stream.icon}
              <h3 className="text-lg font-semibold ml-2">
                {stream.name}
              </h3>
            </div>
            <span className="inline-block px-2 py-1 text-xs rounded mb-2" 
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
              {stream.fee} fee
            </span>
            <div className="flex items-center justify-between">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStream(stream.id);
                }}
                className="text-white"
              >
                {expandedStreams.has(stream.id) ? 
                  <ChevronUpIcon className="w-5 h-5" /> : 
                  <ChevronDownIcon className="w-5 h-5" />
                }
              </button>
              <div className="relative group">
                <InformationCircleIcon className="w-5 h-5 text-white" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {stream.description}
                </div>
              </div>
            </div>
            {expandedStreams.has(stream.id) && (
              <div className="mt-2">
                <p className="text-sm mb-2">Revenue Distribution:</p>
                {stream.flows.map((flow, idx) => (
                  <div key={idx} className="flex justify-between mb-1">
                    <span className="text-xs">
                      {destinations.find(d => d.id === flow.destination)?.name}
                    </span>
                    <span className="text-xs font-bold">
                      {flow.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Revenue Destinations */}
      <div className="flex flex-wrap gap-4 justify-center mt-8">
        {destinations.map((dest) => (
          <div
            key={dest.id}
            id={`dest-${dest.id}`}
            className={`p-4 min-w-[180px] transition-all duration-300 ${
              selectedStream && 
              !revenueStreams.find(s => s.id === selectedStream)?.flows.find(f => f.destination === dest.id)
                ? 'opacity-30' : 'opacity-100'
            }`}
            style={{ backgroundColor: dest.color, color: 'white' }}
          >
            <div className="flex items-center mb-2">
              {dest.icon}
              <h3 className="text-lg font-semibold ml-2">
                {dest.name}
              </h3>
            </div>
            <p className="text-xs">
              {dest.description}
            </p>
          </div>
        ))}
      </div>

      {/* Summary Statistics */}
      <div className="bg-white p-6 mt-8 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">
          Revenue Distribution Summary
        </h2>
        <div className="flex flex-wrap gap-4">
          {destinations.map((dest) => {
            const totalPercentage = revenueStreams.reduce((sum, stream) => {
              const flow = stream.flows.find(f => f.destination === dest.id);
              return sum + (flow ? flow.percentage : 0);
            }, 0);
            
            return (
              <div key={dest.id} className="min-w-[150px]">
                <div className="flex items-center mb-2">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: dest.color }}
                  />
                  <span className="text-sm font-semibold">
                    {dest.name}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  Average: {(totalPercentage / revenueStreams.length).toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white p-4 mt-4 rounded-lg shadow">
        <h3 className="text-sm font-semibold mb-2">
          How it works:
        </h3>
        <p className="text-xs text-gray-600">
          1. Revenue is generated from various streams across the ecosystem<br/>
          2. Each stream has a specific fee structure<br/>
          3. Revenue is automatically distributed according to predefined rules<br/>
          4. Funds flow to different destinations based on community needs and strategic priorities<br/>
          5. SubDAOs receive a portion to fund their local economies<br/>
          6. Rewards fund staking and participation incentives<br/>
          7. Development fund ensures platform growth and maintenance<br/>
          8. Reserves provide long-term sustainability and emergency funds
        </p>
      </div>
    </div>
  );
};

export default MonetizationFlowDiagram;