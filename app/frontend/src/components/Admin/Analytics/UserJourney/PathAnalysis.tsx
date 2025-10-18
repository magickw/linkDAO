import React, { useState } from 'react';
import { 
  ArrowRightIcon, 
  ExclamationTriangleIcon,
  LightBulbIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface DropOffPoint {
  stepName: string;
  stepOrder: number;
  dropoffRate: number;
  usersLost: number;
  commonExitPages: string[];
  suggestedImprovements: string[];
}

interface UserJourneyStep {
  step: string;
  stepOrder: number;
  users: number;
  dropoffRate: number;
  conversionRate: number;
  averageTimeSpent: number;
  timestamp: Date;
}

interface JourneyMap {
  pathId: string;
  pathName: string;
  steps: UserJourneyStep[];
  totalUsers: number;
  overallConversionRate: number;
  averageDuration: number;
  dropOffPoints: DropOffPoint[];
}

interface PathAnalysisProps {
  journeyMaps: JourneyMap[];
  className?: string;
  onPathSelect?: (path: JourneyMap) => void;
}

export const PathAnalysis: React.FC<PathAnalysisProps> = ({
  journeyMaps,
  className = '',
  onPathSelect
}) => {
  const [selectedPath, setSelectedPath] = useState<JourneyMap | null>(null);
  const [sortBy, setSortBy] = useState<'users' | 'conversion' | 'duration'>('users');
  const [filterMinUsers, setFilterMinUsers] = useState<number>(10);

  const sortedPaths = [...journeyMaps]
    .filter(path => path.totalUsers >= filterMinUsers)
    .sort((a, b) => {
      switch (sortBy) {
        case 'users':
          return b.totalUsers - a.totalUsers;
        case 'conversion':
          return b.overallConversionRate - a.overallConversionRate;
        case 'duration':
          return b.averageDuration - a.averageDuration;
        default:
          return 0;
      }
    });

  const handlePathClick = (path: JourneyMap) => {
    setSelectedPath(path);
    if (onPathSelect) onPathSelect(path);
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getConversionColor = (rate: number): string => {
    if (rate > 70) return 'text-green-600';
    if (rate > 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDropoffSeverity = (rate: number): 'low' | 'medium' | 'high' => {
    if (rate > 50) return 'high';
    if (rate > 25) return 'medium';
    return 'low';
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header and Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">User Journey Path Analysis</h3>
            <p className="text-sm text-gray-500 mt-1">
              Analyze user navigation patterns and identify optimization opportunities
            </p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="users">Users</option>
                <option value="conversion">Conversion Rate</option>
                <option value="duration">Duration</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Min Users:</label>
              <input
                type="number"
                value={filterMinUsers}
                onChange={(e) => setFilterMinUsers(Number(e.target.value))}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 w-20"
                min="1"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Path List */}
        <div className="w-1/2 border-r border-gray-200">
          <div className="p-4">
            <h4 className="font-medium text-gray-900 mb-4">
              Journey Paths ({sortedPaths.length})
            </h4>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sortedPaths.map((path) => (
                <div
                  key={path.pathId}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPath?.pathId === path.pathId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handlePathClick(path)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-900 truncate">
                        {path.pathName}
                      </h5>
                      <p className="text-sm text-gray-500">
                        {path.steps.length} steps
                      </p>
                    </div>
                    
                    {path.dropOffPoints.length > 0 && (
                      <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500">Users</div>
                      <div className="font-medium">{path.totalUsers.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Conversion</div>
                      <div className={`font-medium ${getConversionColor(path.overallConversionRate)}`}>
                        {path.overallConversionRate.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Duration</div>
                      <div className="font-medium">{formatDuration(path.averageDuration)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Path Details */}
        <div className="w-1/2">
          {selectedPath ? (
            <div className="p-4">
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  {selectedPath.pathName}
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="text-blue-600 font-medium">Total Users</div>
                    <div className="text-lg font-bold text-blue-900">
                      {selectedPath.totalUsers.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="text-green-600 font-medium">Conversion Rate</div>
                    <div className={`text-lg font-bold ${getConversionColor(selectedPath.overallConversionRate)}`}>
                      {selectedPath.overallConversionRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <div className="text-purple-600 font-medium">Avg Duration</div>
                    <div className="text-lg font-bold text-purple-900">
                      {formatDuration(selectedPath.averageDuration)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Journey Steps */}
              <div className="mb-6">
                <h5 className="font-medium text-gray-900 mb-3">Journey Steps</h5>
                <div className="space-y-2">
                  {selectedPath.steps.map((step, index) => (
                    <div key={step.stepOrder} className="flex items-center">
                      <div className="flex-1 bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{step.step}</div>
                            <div className="text-sm text-gray-500">
                              {step.users.toLocaleString()} users • {formatDuration(step.averageTimeSpent)} avg time
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${getConversionColor(step.conversionRate)}`}>
                              {step.conversionRate.toFixed(1)}%
                            </div>
                            {step.dropoffRate > 0 && (
                              <div className="text-sm text-red-600">
                                -{step.dropoffRate.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {index < selectedPath.steps.length - 1 && (
                        <ArrowRightIcon className="w-4 h-4 text-gray-400 mx-2" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Drop-off Points */}
              {selectedPath.dropOffPoints.length > 0 && (
                <div className="mb-6">
                  <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 mr-2" />
                    Drop-off Points ({selectedPath.dropOffPoints.length})
                  </h5>
                  
                  <div className="space-y-3">
                    {selectedPath.dropOffPoints.map((dropOff) => {
                      const severity = getDropoffSeverity(dropOff.dropoffRate);
                      
                      return (
                        <div
                          key={dropOff.stepOrder}
                          className={`p-3 rounded-lg border-l-4 ${
                            severity === 'high' ? 'border-red-500 bg-red-50' :
                            severity === 'medium' ? 'border-orange-500 bg-orange-50' :
                            'border-yellow-500 bg-yellow-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="font-medium text-gray-900">
                                {dropOff.stepName}
                              </div>
                              <div className="text-sm text-gray-600">
                                {dropOff.usersLost.toLocaleString()} users lost ({dropOff.dropoffRate.toFixed(1)}% drop-off)
                              </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              severity === 'high' ? 'bg-red-100 text-red-800' :
                              severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {severity.toUpperCase()}
                            </div>
                          </div>
                          
                          {dropOff.commonExitPages.length > 0 && (
                            <div className="mb-2">
                              <div className="text-sm font-medium text-gray-700 mb-1">
                                Common Exit Pages:
                              </div>
                              <div className="text-sm text-gray-600">
                                {dropOff.commonExitPages.slice(0, 3).join(', ')}
                              </div>
                            </div>
                          )}
                          
                          {dropOff.suggestedImprovements.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-1 flex items-center">
                                <LightBulbIcon className="w-4 h-4 mr-1" />
                                Suggestions:
                              </div>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {dropOff.suggestedImprovements.map((suggestion, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>{suggestion}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a journey path to view detailed analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PathAnalysis;