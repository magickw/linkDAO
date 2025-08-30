import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, DollarSign, Calendar } from 'lucide-react';
import { TimeTracking } from '../../../types/service';
import { projectManagementService } from '../../../services/projectManagementService';

interface TimeTrackerProps {
  bookingId: string;
  userRole: 'client' | 'provider';
  onUpdate?: () => void;
}

const TimeTracker: React.FC<TimeTrackerProps> = ({ bookingId, userRole, onUpdate }) => {
  const [activeSession, setActiveSession] = useState<TimeTracking | null>(null);
  const [timeRecords, setTimeRecords] = useState<TimeTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('00:00:00');
  const [showStartModal, setShowStartModal] = useState(false);
  const [startForm, setStartForm] = useState({
    description: '',
    hourlyRate: '',
    milestoneId: ''
  });

  useEffect(() => {
    loadTimeTracking();
    loadActiveSession();
  }, [bookingId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession) {
      interval = setInterval(() => {
        const startTime = new Date(activeSession.startTime);
        const now = new Date();
        const diff = now.getTime() - startTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCurrentTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession]);

  const loadTimeTracking = async () => {
    try {
      const records = await projectManagementService.getTimeTrackingByBooking(bookingId);
      setTimeRecords(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load time tracking');
    }
  };

  const loadActiveSession = async () => {
    try {
      setLoading(true);
      const session = await projectManagementService.getActiveTimeTracking();
      setActiveSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load active session');
    } finally {
      setLoading(false);
    }
  };

  const startTimeTracking = async () => {
    try {
      const session = await projectManagementService.startTimeTracking({
        bookingId,
        description: startForm.description,
        hourlyRate: startForm.hourlyRate || undefined,
        milestoneId: startForm.milestoneId || undefined
      });
      setActiveSession(session);
      setShowStartModal(false);
      setStartForm({ description: '', hourlyRate: '', milestoneId: '' });
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start time tracking');
    }
  };

  const stopTimeTracking = async () => {
    if (!activeSession) return;
    
    try {
      await projectManagementService.stopTimeTracking({
        timeTrackingId: activeSession.id,
        description: activeSession.description
      });
      setActiveSession(null);
      setCurrentTime('00:00:00');
      loadTimeTracking();
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop time tracking');
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateTotalHours = () => {
    return timeRecords.reduce((total, record) => total + (record.durationMinutes || 0), 0) / 60;
  };

  const calculateTotalEarnings = () => {
    return timeRecords.reduce((total, record) => total + parseFloat(record.totalAmount || '0'), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (userRole === 'client') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Time Tracking Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{calculateTotalHours().toFixed(1)}h</div>
              <div className="text-sm text-gray-500">Total Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${calculateTotalEarnings().toFixed(2)}</div>
              <div className="text-sm text-gray-500">Total Cost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{timeRecords.length}</div>
              <div className="text-sm text-gray-500">Sessions</div>
            </div>
          </div>
        </div>
        
        <TimeRecordsList records={timeRecords} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Active Timer */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Time Tracker</h3>
          {activeSession && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              Active
            </span>
          )}
        </div>

        <div className="text-center mb-6">
          <div className="text-4xl font-mono font-bold text-gray-900 mb-2">
            {currentTime}
          </div>
          {activeSession && (
            <p className="text-gray-600">{activeSession.description || 'Working on project'}</p>
          )}
        </div>

        <div className="flex justify-center space-x-4">
          {!activeSession ? (
            <button
              onClick={() => setShowStartModal(true)}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Timer
            </button>
          ) : (
            <button
              onClick={stopTimeTracking}
              className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Square className="h-5 w-5 mr-2" />
              Stop Timer
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">{calculateTotalHours().toFixed(1)}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">${calculateTotalEarnings().toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{timeRecords.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Records */}
      <TimeRecordsList records={timeRecords} />

      {/* Start Timer Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Start Time Tracking</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={startForm.description}
                  onChange={(e) => setStartForm({ ...startForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What are you working on?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate (optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={startForm.hourlyRate}
                  onChange={(e) => setStartForm({ ...startForm, hourlyRate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50.00"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowStartModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={startTimeTracking}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Start Timer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Time Records List Component
const TimeRecordsList: React.FC<{ records: TimeTracking[] }> = ({ records }) => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Time Records</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((record) => (
              <tr key={record.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(record.startTime).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {record.description || 'No description'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.durationMinutes ? formatDuration(record.durationMinutes) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.hourlyRate ? `$${record.hourlyRate}/hr` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.totalAmount ? `$${parseFloat(record.totalAmount).toFixed(2)}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    record.status === 'completed' 
                      ? 'bg-green-100 text-green-800'
                      : record.status === 'active'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {records.length === 0 && (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No time records yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export default TimeTracker;