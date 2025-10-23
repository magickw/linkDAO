import React, { useState, useEffect } from 'react';
import { ShoppingBag, Check, X, Eye, Clock, AlertTriangle } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { SellerApplication } from '@/types/auth';

export const MobileSellerApplications: React.FC = () => {
  const [filter, setFilter] = useState('pending');
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getSellerApplications({});
      setApplications(response.applications);
    } catch (err) {
      console.error('Failed to load applications:', err);
      setError('Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filters = [
    { id: 'pending', label: 'Pending', count: applications.filter(app => app.applicationStatus === 'pending').length },
    { id: 'under_review', label: 'Under Review', count: applications.filter(app => app.applicationStatus === 'under_review').length },
    { id: 'approved', label: 'Approved', count: applications.filter(app => app.applicationStatus === 'approved').length },
    { id: 'rejected', label: 'Rejected', count: applications.filter(app => app.applicationStatus === 'rejected').length }
  ];

  const handleAction = async (applicationId: string, action: 'approve' | 'reject' | 'review') => {
    try {
      switch (action) {
        case 'review':
          console.log(`Reviewing application ${applicationId}`);
          break;
        case 'approve':
          await adminService.reviewSellerApplication(applicationId, {
            status: 'approved',
            notes: 'Approved by admin'
          });
          // Update local state
          setApplications(prev => prev.map(app => 
            app.id === applicationId ? { ...app, applicationStatus: 'approved' } : app
          ));
          break;
        case 'reject':
          await adminService.reviewSellerApplication(applicationId, {
            status: 'rejected',
            notes: 'Rejected by admin'
          });
          // Update local state
          setApplications(prev => prev.map(app => 
            app.id === applicationId ? { ...app, applicationStatus: 'rejected' } : app
          ));
          break;
      }
    } catch (err) {
      console.error(`Failed to perform action ${action} on application ${applicationId}:`, err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Filter Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-3 py-1.5 rounded-full bg-white/10 animate-pulse"></div>
          ))}
        </div>

        {/* Applications List */}
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md rounded-lg p-4 animate-pulse">
              <div className="h-32 bg-white/20 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadApplications}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {filters.map((filterItem) => (
          <button
            key={filterItem.id}
            onClick={() => setFilter(filterItem.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === filterItem.id
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {filterItem.label} ({filterItem.count})
          </button>
        ))}
      </div>

      {/* Applications List */}
      <div className="space-y-3">
        {applications.map((application) => (
          <div key={application.id} className="bg-white/10 backdrop-blur-md rounded-lg p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-white font-medium">{application.businessName}</h3>
                <p className="text-white/70 text-sm">by {application.applicantName}</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.applicationStatus)}`}>
                {application.applicationStatus.replace('_', ' ').toUpperCase()}
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-white/50 text-xs">Category</p>
                <p className="text-white text-sm">{application.businessCategory}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs">Submitted</p>
                <p className="text-white text-sm">{new Date(application.submittedAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Documents */}
            <div className="mb-3">
              <p className="text-white/50 text-xs mb-2">Documents ({application.requiredDocuments?.length || 0})</p>
              <div className="flex flex-wrap gap-2">
                {application.requiredDocuments?.map((doc, index) => (
                  <span key={index} className="px-2 py-1 bg-white/10 text-white text-xs rounded">
                    {doc}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleAction(application.id, 'review')}
                className="flex-1 flex items-center justify-center space-x-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>Review</span>
              </button>
              <button
                onClick={() => handleAction(application.id, 'approve')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleAction(application.id, 'reject')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {applications.length === 0 && (
        <div className="text-center py-12">
          <ShoppingBag className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No applications</h3>
          <p className="text-white/70 text-sm">
            No seller applications in this category.
          </p>
        </div>
      )}
    </div>
  );
};