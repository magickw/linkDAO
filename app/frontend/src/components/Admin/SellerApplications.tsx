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
  Building,
  Download,
  AlertCircle,
  TrendingUp,
  Shield,
  Star,
  CheckSquare,
  Square,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { SellerApplication } from '@/types/auth';
import { Button, GlassPanel } from '@/design-system';

export function SellerApplications() {
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<SellerApplication | null>(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showRiskAssessment, setShowRiskAssessment] = useState(true);
  const [showDocumentVerification, setShowDocumentVerification] = useState(true);
  const [riskScore, setRiskScore] = useState<any>(null);
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

  useEffect(() => {
    if (selectedApplication) {
      loadRiskAssessment(selectedApplication.id);
    }
  }, [selectedApplication]);

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

  const loadRiskAssessment = async (applicationId: string) => {
    try {
      const response = await adminService.getSellerRiskAssessment(applicationId);
      setRiskScore(response.assessment);
    } catch (error) {
      console.error('Failed to load risk assessment:', error);
      setRiskScore(null);
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

  // Bulk action handlers
  const toggleApplicationSelection = (applicationId: string) => {
    const newSelection = new Set(selectedApplications);
    if (newSelection.has(applicationId)) {
      newSelection.delete(applicationId);
    } else {
      newSelection.add(applicationId);
    }
    setSelectedApplications(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedApplications.size === applications.length) {
      setSelectedApplications(new Set());
    } else {
      setSelectedApplications(new Set(applications.map(app => app.id)));
    }
  };

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedApplications.size === 0) return;

    setBulkActionLoading(true);
    try {
      const applicationIds = Array.from(selectedApplications);
      await Promise.all(
        applicationIds.map(appId =>
          adminService.reviewSellerApplication(appId, {
            status: action === 'approve' ? 'approved' : 'rejected',
            notes: `Bulk ${action} by admin`,
            rejectionReason: action === 'reject' ? 'Bulk rejection' : '',
            requiredInfo: []
          })
        )
      );

      setSelectedApplications(new Set());
      setShowBulkActions(false);
      loadApplications();
    } catch (error) {
      console.error(`Failed to execute bulk ${action}:`, error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-500/20';
    if (score >= 60) return 'text-yellow-400 bg-yellow-500/20';
    if (score >= 40) return 'text-orange-400 bg-orange-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const getRiskLevel = (score: number) => {
    if (score >= 80) return 'Low Risk';
    if (score >= 60) return 'Medium Risk';
    if (score >= 40) return 'High Risk';
    return 'Very High Risk';
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
      {/* Header with Bulk Actions Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Seller Applications</h2>
          <p className="text-gray-400 text-sm">Review and manage seller applications</p>
        </div>
        <Button
          variant={showBulkActions ? "primary" : "outline"}
          onClick={() => setShowBulkActions(!showBulkActions)}
          className="flex items-center gap-2"
        >
          <CheckSquare className="w-4 h-4" />
          Bulk Actions
        </Button>
      </div>

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

      {/* Bulk Actions Toolbar */}
      {showBulkActions && selectedApplications.size > 0 && (
        <GlassPanel className="p-4 bg-purple-500/20 border-purple-500/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-purple-400" />
              <span className="text-white font-medium">
                {selectedApplications.size} application{selectedApplications.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleBulkAction('approve')}
                disabled={bulkActionLoading}
                variant="outline"
                size="small"
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Approve All
              </Button>
              <Button
                onClick={() => handleBulkAction('reject')}
                disabled={bulkActionLoading}
                variant="outline"
                size="small"
                className="flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject All
              </Button>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Applications List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Seller Applications ({pagination.total})</h2>
            {showBulkActions && applications.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
              >
                {selectedApplications.size === applications.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Select All
              </button>
            )}
          </div>

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
              {applications.map((application) => {
                const isSelected = selectedApplications.has(application.id);
                return (
                  <GlassPanel
                    key={application.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedApplication?.id === application.id ? 'ring-2 ring-purple-500' :
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-500/10' :
                      'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Selection Checkbox */}
                      {showBulkActions && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleApplicationSelection(application.id);
                          }}
                          className="mt-1 flex-shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-blue-400" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 hover:text-gray-300" />
                          )}
                        </button>
                      )}

                      {/* Application Content */}
                      <div className="flex-1 min-w-0" onClick={() => setSelectedApplication(application)}>
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
                      </div>
                    </div>
                  </GlassPanel>
                );
              })}
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

              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {/* Risk Assessment Section */}
                {riskScore && (
                  <div className="border-b border-gray-700 pb-4">
                    <button
                      onClick={() => setShowRiskAssessment(!showRiskAssessment)}
                      className="flex items-center justify-between w-full text-left mb-3"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-400" />
                        <span className="text-white font-medium text-sm">Risk Assessment</span>
                      </div>
                      {showRiskAssessment ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {showRiskAssessment && (
                      <div className="space-y-3">
                        {/* Overall Risk Score */}
                        <div className="p-4 bg-white/5 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Overall Risk Score</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${getRiskScoreColor(riskScore.overallScore)}`}>
                              {riskScore.overallScore}/100
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getRiskScoreColor(riskScore.overallScore).replace('text-', 'bg-').replace('/20', '')}`}
                                style={{ width: `${riskScore.overallScore}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${getRiskScoreColor(riskScore.overallScore)}`}>
                              {getRiskLevel(riskScore.overallScore)}
                            </span>
                          </div>
                        </div>

                        {/* Risk Factors Breakdown */}
                        {riskScore.factors && (
                          <div className="space-y-2">
                            <label className="text-gray-400 text-xs">Risk Factors</label>
                            {Object.entries(riskScore.factors).map(([factor, score]: [string, any]) => (
                              <div key={factor} className="p-2 bg-white/5 rounded">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-white text-xs capitalize">{factor.replace(/_/g, ' ')}</span>
                                  <span className={`text-xs font-medium ${getRiskScoreColor(score)}`}>
                                    {score}/100
                                  </span>
                                </div>
                                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${getRiskScoreColor(score).replace('text-', 'bg-').replace('/20', '')}`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Risk Notes */}
                        {riskScore.notes && riskScore.notes.length > 0 && (
                          <div>
                            <label className="text-gray-400 text-xs mb-2 block">Risk Notes</label>
                            <div className="space-y-1">
                              {riskScore.notes.map((note: string, index: number) => (
                                <div key={index} className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded">
                                  <AlertCircle className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                                  <span className="text-yellow-200 text-xs">{note}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

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

                {/* Enhanced Document Verification Section */}
                <div className="border-t border-gray-700 pt-4">
                  <button
                    onClick={() => setShowDocumentVerification(!showDocumentVerification)}
                    className="flex items-center justify-between w-full text-left mb-3"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-medium text-sm">Document Verification</span>
                    </div>
                    {showDocumentVerification ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {showDocumentVerification && (
                    <div className="space-y-3">
                      {Object.entries(selectedApplication.documents).map(([key, value]) => {
                        if (!value) return null;

                        const documentName = key.replace(/([A-Z])/g, ' $1').trim();
                        const isVerified = Math.random() > 0.5; // Mock verification status

                        return (
                          <div key={key} className="p-3 bg-white/5 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                            <div className="flex items-start gap-3">
                              <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-1" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-white text-sm font-medium capitalize">{documentName}</span>
                                  {isVerified ? (
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" />
                                      Verified
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      Pending
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                  <span>PDF Document</span>
                                  <span>•</span>
                                  <span>256 KB</span>
                                  <span>•</span>
                                  <span>Uploaded {new Date(selectedApplication.submittedAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="small"
                                    className="flex items-center gap-1 text-xs"
                                  >
                                    <Eye className="w-3 h-3" />
                                    Preview
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="small"
                                    className="flex items-center gap-1 text-xs"
                                  >
                                    <Download className="w-3 h-3" />
                                    Download
                                  </Button>
                                  {!isVerified && (
                                    <Button
                                      variant="primary"
                                      size="small"
                                      className="flex items-center gap-1 text-xs ml-auto"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      Verify
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {Object.values(selectedApplication.documents).every(v => !v) && (
                        <div className="text-center py-8">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm">No documents uploaded</p>
                        </div>
                      )}
                    </div>
                  )}
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