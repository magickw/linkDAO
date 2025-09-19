import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Filter,
  Search,
  FileText,
  Mail,
  Phone,
  Globe,
  Building
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { SellerApplication } from '@/types/auth';
import { Button, GlassPanel } from '@/design-system';

export function SellerApplications() {
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<SellerApplication | null>(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    status: 'approved' as 'approved' | 'rejected' | 'requires_info',
    notes: '',
    rejectionReason: '',
    requiredInfo: [] as string[]
  });
  const [filters, setFilters] = useState({
    status: 'pending',
    businessType: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  useEffect(() => {
    loadApplications();
  }, [filters, pagination.page]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const response = await adminService.getSellerApplications({
        ...filters,
        page: pagination.page,
        limit: 20
      });
      
      setApplications(response.applications);
      setPagination({
        page: response.page,
        totalPages: response.totalPages,
        total: response.total
      });
    } catch (error) {
      console.error('Failed to load seller applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async () => {
    if (!selectedApplication) return;
    
    try {
      await adminService.reviewSellerApplication(selectedApplication.id, reviewData);
      setReviewModal(false);
      setSelectedApplication(null);
      loadApplications();
    } catch (error) {
      console.error('Failed to review application:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400 bg-green-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/20';
      case 'requires_info': return 'text-yellow-400 bg-yellow-500/20';
      case 'under_review': return 'text-blue-400 bg-blue-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <GlassPanel className="p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-white font-medium">Filters:</span>
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="requires_info">Requires Info</option>
          </select>

          <select
            value={filters.businessType}
            onChange={(e) => setFilters({ ...filters, businessType: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
          >
            <option value="">All Business Types</option>
            <option value="individual">Individual</option>
            <option value="business">Business</option>
            <option value="corporation">Corporation</option>
          </select>

          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search applications..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white flex-1"
            />
          </div>
        </div>
      </GlassPanel>

      {/* Applications List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Seller Applications ({pagination.total})</h2>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <GlassPanel key={i} className="p-4 animate-pulse">
                  <div className="h-24 bg-white/10 rounded"></div>
                </GlassPanel>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <GlassPanel
                  key={application.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedApplication?.id === application.id ? 'ring-2 ring-purple-500' : 'hover:bg-white/5'
                  }`}
                  onClick={() => setSelectedApplication(application)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <ShoppingBag className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">
                            {application.businessName || application.applicantHandle}
                          </span>
                          <span className="text-gray-400 text-sm">
                            ({application.businessType})
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mb-2 line-clamp-2">
                          {application.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>Applied {new Date(application.submittedAt).toLocaleDateString()}</span>
                          <span>{application.categories.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                      {application.status.replace('_', ' ')}
                    </span>
                  </div>
                </GlassPanel>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                Previous
              </Button>
              <span className="text-white px-4 py-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Application Details */}
        <div>
          {selectedApplication ? (
            <GlassPanel className="p-6 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Application Details</h3>
                <Button
                  onClick={() => setReviewModal(true)}
                  variant="primary"
                  disabled={selectedApplication.status !== 'pending'}
                >
                  Review
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm">Applicant</label>
                  <p className="text-white">{selectedApplication.applicantHandle}</p>
                  <p className="text-gray-400 text-sm">{selectedApplication.applicantAddress}</p>
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm">Business Name</label>
                  <p className="text-white">{selectedApplication.businessName || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm">Business Type</label>
                  <p className="text-white capitalize">{selectedApplication.businessType}</p>
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm">Description</label>
                  <p className="text-white">{selectedApplication.description}</p>
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm">Categories</label>
                  <p className="text-white">{selectedApplication.categories.join(', ')}</p>
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm">Contact Information</label>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-white">{selectedApplication.contactInfo.email}</span>
                    </div>
                    {selectedApplication.contactInfo.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{selectedApplication.contactInfo.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedApplication.socialLinks && (
                  <div>
                    <label className="text-gray-400 text-sm">Social Links</label>
                    <div className="space-y-1">
                      {selectedApplication.socialLinks.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <a 
                            href={selectedApplication.socialLinks.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            {selectedApplication.socialLinks.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-gray-400 text-sm">Documents</label>
                  <div className="space-y-1">
                    {Object.entries(selectedApplication.documents).map(([key, value]) => (
                      value && (
                        <div key={key} className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-white capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm">Status</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedApplication.status)}`}>
                    {selectedApplication.status.replace('_', ' ')}
                  </span>
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm">Submitted</label>
                  <p className="text-white">{new Date(selectedApplication.submittedAt).toLocaleString()}</p>
                </div>
              </div>
            </GlassPanel>
          ) : (
            <GlassPanel className="p-6 text-center">
              <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Select an application to review</p>
            </GlassPanel>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewModal && selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <GlassPanel className="max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">Review Application</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Decision</label>
                <select
                  value={reviewData.status}
                  onChange={(e) => setReviewData({ ...reviewData, status: e.target.value as any })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="approved">Approve</option>
                  <option value="rejected">Reject</option>
                  <option value="requires_info">Requires More Information</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm mb-1">Notes</label>
                <textarea
                  value={reviewData.notes}
                  onChange={(e) => setReviewData({ ...reviewData, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Add review notes..."
                />
              </div>
              
              {reviewData.status === 'rejected' && (
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Rejection Reason</label>
                  <textarea
                    value={reviewData.rejectionReason}
                    onChange={(e) => setReviewData({ ...reviewData, rejectionReason: e.target.value })}
                    rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="Explain why the application was rejected..."
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button onClick={handleReview} variant="primary">
                Submit Review
              </Button>
              <Button onClick={() => setReviewModal(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}