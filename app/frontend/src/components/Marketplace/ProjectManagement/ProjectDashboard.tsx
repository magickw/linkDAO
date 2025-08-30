import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  FileText, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  DollarSign,
  Users,
  Activity,
  Download,
  Upload,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { ProjectDashboardData as ProjectDashboardType, EnhancedServiceBooking } from '../../../types/service';
import { projectManagementService } from '../../../services/projectManagementService';
import TimeTracker from './TimeTracker';
// TODO: Create these components
// import DeliverablesList from './DeliverablesList';
// import ProjectCommunication from './ProjectCommunication';
// import MilestonePayments from './MilestonePayments';
// import ProjectTimeline from './ProjectTimeline';
// import FileManager from './FileManager';

interface ProjectDashboardProps {
  bookingId: string;
  userRole: 'client' | 'provider';
}

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ bookingId, userRole }) => {
  const [dashboard, setDashboard] = useState<ProjectDashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboard();
  }, [bookingId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await projectManagementService.getProjectDashboard(bookingId);
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboard = () => {
    loadDashboard();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No dashboard data available</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'time', label: 'Time Tracking', icon: Clock },
    { id: 'deliverables', label: 'Deliverables', icon: FileText },
    { id: 'communication', label: 'Communication', icon: MessageSquare },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'files', label: 'Files', icon: Upload },
    { id: 'timeline', label: 'Timeline', icon: Calendar }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Project Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {dashboard.booking.status === 'in_progress' ? 'Active Project' : 
               dashboard.booking.status === 'completed' ? 'Completed Project' : 
               'Project Status: ' + dashboard.booking.status}
            </p>
          </div>
          <button
            onClick={refreshDashboard}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboard.timeTrackingSummary.totalHours}h
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Deliverables</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboard.deliverablesSummary.approved}/{dashboard.deliverablesSummary.total}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <MessageSquare className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Messages</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboard.communicationSummary.totalMessages}
              </p>
              {dashboard.communicationSummary.unreadMessages > 0 && (
                <p className="text-sm text-red-600">
                  {dashboard.communicationSummary.unreadMessages} unread
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Earnings</p>
              <p className="text-2xl font-bold text-gray-900">
                ${dashboard.timeTrackingSummary.totalAmount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'overview' && (
          <OverviewTab dashboard={dashboard} userRole={userRole} />
        )}
        
        {activeTab === 'time' && (
          <TimeTracker 
            bookingId={bookingId} 
            userRole={userRole}
            onUpdate={refreshDashboard}
          />
        )}
        
        {activeTab === 'deliverables' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Deliverables</h3>
            <p className="text-gray-500">Deliverables component coming soon...</p>
          </div>
        )}
        
        {activeTab === 'communication' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Communication</h3>
            <p className="text-gray-500">Communication component coming soon...</p>
          </div>
        )}
        
        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payments</h3>
            <p className="text-gray-500">Payments component coming soon...</p>
          </div>
        )}
        
        {activeTab === 'files' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Files</h3>
            <p className="text-gray-500">File manager component coming soon...</p>
          </div>
        )}
        
        {activeTab === 'timeline' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
            <p className="text-gray-500">Timeline component coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{
  dashboard: ProjectDashboardType;
  userRole: 'client' | 'provider';
}> = ({ dashboard, userRole }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activities</h3>
        <div className="space-y-4">
          {dashboard.recentActivities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="flex items-start">
              <div className="flex-shrink-0">
                <Activity className="h-5 w-5 text-gray-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500">
                  {new Date(activity.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Deadlines</h3>
        <div className="space-y-4">
          {dashboard.upcomingDeadlines.length > 0 ? (
            dashboard.upcomingDeadlines.map((deadline) => (
              <div key={deadline.milestoneId} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{deadline.title}</p>
                  <p className="text-xs text-gray-500">
                    Due: {new Date(deadline.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  deadline.status === 'completed' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {deadline.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No upcoming deadlines</p>
          )}
        </div>
      </div>

      {/* Progress Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Progress Summary</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm">
              <span>Deliverables Completed</span>
              <span>{dashboard.deliverablesSummary.approved}/{dashboard.deliverablesSummary.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ 
                  width: `${(dashboard.deliverablesSummary.approved / dashboard.deliverablesSummary.total) * 100}%` 
                }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm">
              <span>Time This Week</span>
              <span>{dashboard.timeTrackingSummary.thisWeekHours}h</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ 
                  width: `${Math.min((dashboard.timeTrackingSummary.thisWeekHours / 40) * 100, 100)}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {userRole === 'provider' && (
            <>
              <button className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Play className="h-4 w-4 mr-2" />
                Start Timer
              </button>
              <button className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </button>
            </>
          )}
          <button className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Message
          </button>
          <button className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" />
            Download Files
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboard;