import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  ArrowPathIcon,
  ChartBarIcon,
  MapIcon,
  FunnelIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import SankeyDiagram from './SankeyDiagram';
import ConversionFunnel from './ConversionFunnel';
import PathAnalysis from './PathAnalysis';
import { useUserJourneyAnalytics } from '../../../../hooks/useUserJourneyAnalytics';

interface UserJourneyDashboardProps {
  className?: string;
}

export const UserJourneyDashboard: React.FC<UserJourneyDashboardProps> = ({
  className = ''
}) => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const [activeTab, setActiveTab] = useState<'overview' | 'paths' | 'funnel' | 'sessions'>('overview');
  const [selectedFunnelSteps, setSelectedFunnelSteps] = useState<string[]>([
    'landing', 'signup', 'onboarding', 'first-action', 'conversion'
  ]);

  const {
    journeyMaps,
    conversionFunnel,
    userSessions,
    journeySummary,
    realTimeMetrics,
    isLoading,
    error,
    refetch
  } = useUserJourneyAnalytics({
    startDate: new Date(dateRange.startDate),
    endDate: new Date(dateRange.endDate),
    funnelSteps: selectedFunnelSteps
  });

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRefresh = () => {
    refetch();
  };

  // Convert journey maps to Sankey data
  const sankeyData = React.useMemo(() => {
    if (!journeyMaps || journeyMaps.length === 0) {
      return { nodes: [], links: [] };
    }

    const nodes = new Map();
    const links: any[] = [];

    journeyMaps.forEach(journey => {
      journey.steps.forEach((step, index) => {
        const nodeId = `${step.step}_${index}`;
        
        if (!nodes.has(nodeId)) {
          nodes.set(nodeId, {
            id: nodeId,
            name: step.step,
            value: step.users,
            category: index === 0 ? 'entry' : index === journey.steps.length - 1 ? 'exit' : 'middle'
          });
        }

        // Create link to next step
        if (index < journey.steps.length - 1) {
          const nextStep = journey.steps[index + 1];
          const nextNodeId = `${nextStep.step}_${index + 1}`;
          
          links.push({
            source: nodeId,
            target: nextNodeId,
            value: Math.min(step.users, nextStep.users)
          });
        }
      });
    });

    return {
      nodes: Array.from(nodes.values()),
      links
    };
  }, [journeyMaps]);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'paths', name: 'Path Analysis', icon: MapIcon },
    { id: 'funnel', name: 'Conversion Funnel', icon: FunnelIcon },
    { id: 'sessions', name: 'User Sessions', icon: ClockIcon }
  ];

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center text-red-600">
          <p>Error loading user journey analytics: {error}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">User Journey Analytics</h2>
            <p className="text-gray-600 mt-1">
              Track user navigation patterns and optimize conversion paths
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {journeySummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {journeySummary.totalSessions.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <FunnelIcon className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {journeySummary.conversionRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <ClockIcon className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Session Duration</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(journeySummary.averageSessionDuration / 60)}m
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <MapIcon className="w-5 h-5 text-orange-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Journey Paths</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {journeySummary.totalJourneyPaths}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading analytics...</span>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      User Journey Flow
                    </h3>
                    <SankeyDiagram
                      data={sankeyData}
                      width={800}
                      height={400}
                      onNodeClick={(node) => console.log('Node clicked:', node)}
                      onLinkClick={(link) => console.log('Link clicked:', link)}
                    />
                  </div>
                  
                  {realTimeMetrics && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900">Active Users</h4>
                        <p className="text-2xl font-bold text-blue-600">
                          {realTimeMetrics.activeUsers}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-medium text-green-900">Page Views</h4>
                        <p className="text-2xl font-bold text-green-600">
                          {realTimeMetrics.pageViews}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h4 className="font-medium text-purple-900">Conversions</h4>
                        <p className="text-2xl font-bold text-purple-600">
                          {realTimeMetrics.conversionEvents}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'paths' && journeyMaps && (
                <PathAnalysis
                  journeyMaps={journeyMaps}
                  onPathSelect={(path) => console.log('Path selected:', path)}
                />
              )}

              {activeTab === 'funnel' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      Conversion Funnel Analysis
                    </h3>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-gray-600">Funnel Steps:</label>
                      <input
                        type="text"
                        value={selectedFunnelSteps.join(', ')}
                        onChange={(e) => setSelectedFunnelSteps(
                          e.target.value.split(',').map(s => s.trim())
                        )}
                        className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                        placeholder="landing, signup, conversion"
                      />
                    </div>
                  </div>
                  
                  {conversionFunnel && (
                    <ConversionFunnel
                      data={conversionFunnel}
                      onStepClick={(step) => console.log('Step clicked:', step)}
                    />
                  )}
                </div>
              )}

              {activeTab === 'sessions' && userSessions && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Recent User Sessions
                  </h3>
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Session
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Duration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Page Views
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Device
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Converted
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {userSessions.slice(0, 10).map((session) => (
                          <tr key={session.sessionId}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {session.sessionId.substring(0, 8)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {Math.round(session.totalDuration / 60)}m
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {session.pageViews}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {session.deviceType}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                session.converted
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {session.converted ? 'Yes' : 'No'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserJourneyDashboard;