import React from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  MessageSquare,
  DollarSign,
  User,
  Activity
} from 'lucide-react';
import { ProjectActivity, ServiceMilestone } from '../../types/service';

interface ProjectTimelineProps {
  bookingId: string;
  activities: ProjectActivity[];
  milestones: ServiceMilestone[];
}

const ProjectTimeline: React.FC<ProjectTimelineProps> = ({ 
  bookingId, 
  activities, 
  milestones 
}) => {
  // Combine activities and milestones into a single timeline
  const timelineItems = [
    // Convert activities to timeline items
    ...activities.map(activity => ({
      id: activity.id,
      type: 'activity' as const,
      date: new Date(activity.createdAt),
      title: activity.description,
      data: activity
    })),
    // Convert milestones to timeline items
    ...milestones.map(milestone => ({
      id: milestone.id,
      type: 'milestone' as const,
      date: milestone.dueDate || new Date(milestone.createdAt),
      title: milestone.title,
      data: milestone
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date, newest first

  const getActivityIcon = (activityType: ProjectActivity['type']) => {
    switch (activityType) {
      case 'time_start':
      case 'time_stop':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'deliverable_upload':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'message_sent':
        return <MessageSquare className="h-4 w-4 text-purple-600" />;
      case 'payment_made':
        return <DollarSign className="h-4 w-4 text-yellow-600" />;
      case 'milestone_completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMilestoneIcon = (status: ServiceMilestone['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'disputed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMilestoneColor = (status: ServiceMilestone['status']) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'disputed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActivityColor = (activityType: ProjectActivity['type']) => {
    switch (activityType) {
      case 'time_start':
      case 'time_stop':
        return 'bg-blue-50 border-blue-200';
      case 'deliverable_upload':
      case 'milestone_completed':
        return 'bg-green-50 border-green-200';
      case 'message_sent':
        return 'bg-purple-50 border-purple-200';
      case 'payment_made':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Project Timeline</h2>
        <div className="text-sm text-gray-500">
          {timelineItems.length} events
        </div>
      </div>

      {timelineItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No timeline events yet</p>
          <p className="text-gray-400 text-sm">Activity will appear here as the project progresses</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {timelineItems.map((item, index) => (
              <div key={`${item.type}-${item.id}`} className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    item.type === 'milestone' 
                      ? getMilestoneColor((item.data as ServiceMilestone).status).replace('text-', 'bg-').replace('-800', '-100').replace('border-', 'bg-').replace('-200', '-100')
                      : getActivityColor((item.data as ProjectActivity).type).replace('border-', 'bg-').replace('-200', '-100')
                  }`}>
                    {item.type === 'milestone' 
                      ? getMilestoneIcon((item.data as ServiceMilestone).status)
                      : getActivityIcon((item.data as ProjectActivity).type)
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.title}
                        </p>
                        
                        {/* Additional details based on type */}
                        {item.type === 'milestone' && (
                          <div className="mt-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getMilestoneColor((item.data as ServiceMilestone).status)}`}>
                              {(item.data as ServiceMilestone).status.replace('_', ' ')}
                            </span>
                            {(item.data as ServiceMilestone).description && (
                              <p className="text-sm text-gray-600 mt-2">
                                {(item.data as ServiceMilestone).description}
                              </p>
                            )}
                            <div className="flex items-center text-xs text-gray-500 mt-2 space-x-4">
                              <span>Amount: {(item.data as ServiceMilestone).amount} ETH</span>
                              {(item.data as ServiceMilestone).dueDate && (
                                <span>Due: {new Date((item.data as ServiceMilestone).dueDate!).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {item.type === 'activity' && (item.data as ProjectActivity).user && (
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <User className="h-3 w-3 mr-1" />
                            <span>{(item.data as ProjectActivity).user!.handle || 'User'}</span>
                          </div>
                        )}
                      </div>

                      {/* Date */}
                      <div className="text-xs text-gray-500 text-right">
                        <div>{formatDate(item.date)}</div>
                        <div className="text-gray-400">{formatDateTime(item.date)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline connector */}
                {index < timelineItems.length - 1 && (
                  <div className="ml-4 mt-4">
                    <div className="w-px h-6 bg-gray-200"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Timeline Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3 text-blue-600" />
            <span>Time Tracking</span>
          </div>
          <div className="flex items-center space-x-2">
            <FileText className="h-3 w-3 text-green-600" />
            <span>Deliverables</span>
          </div>
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-3 w-3 text-purple-600" />
            <span>Messages</span>
          </div>
          <div className="flex items-center space-x-2">
            <DollarSign className="h-3 w-3 text-yellow-600" />
            <span>Payments</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span>Milestones</span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-3 w-3 text-red-600" />
            <span>Issues</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-3 w-3 text-gray-600" />
            <span>Deadlines</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTimeline;