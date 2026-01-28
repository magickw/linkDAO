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
  ChevronUp,
  ChevronRight,
  Store,
  Calendar,
  Info
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { useAuth } from '@/context/AuthContext';
import { Button, GlassPanel } from '@/design-system';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

// Use the new SellerApplication interface that matches the database
interface SellerApplication {
  id: number;
  walletAddress: string;
  storeName: string | null;
  email: string | null;
  applicationStatus: 'pending' | 'under_review' | 'approved' | 'rejected' | 'resubmitted';
  applicationSubmittedAt: string | null;
  applicationReviewedAt: string | null;
  applicationRejectionReason: string | null;
  applicationAdminNotes: string | null;
  isVerified: boolean;
  createdAt: string;
  // Legacy fields for backward compatibility/UI if needed
  applicantHandle?: string;
  businessType?: string;
  description?: string;
  categories?: string[];
  contactInfo?: { email: string; phone?: string };
  socialLinks?: { website?: string };
  documents?: Record<string, string>;
}

export function SellerApplications() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<SellerApplication | null>(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [selectedApplications, setSelectedApplications] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  const [reviewData, setReviewData] = useState({
    status: 'approved' as 'approved' | 'rejected' | 'under_review',
    adminNotes: '',
    rejectionReason: '',
  });
  
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0
  });

  useEffect(() => {
    loadApplications();
  }, [filters.status, pagination.page]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      // Use the new backend endpoint for seller applications
      const token = localStorage.getItem('token') || localStorage.getItem('linkdao_access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/sellers/admin/applications?status=${filters.status}&page=${pagination.page}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        setApplications(result.data.applications);
        setPagination({
          page: result.data.pagination.page,
          totalPages: result.data.pagination.totalPages,
          total: result.data.pagination.total
        });
      } else {
        addToast('Failed to fetch applications', 'error');
      }
    } catch (error) {
      console.error('Failed to load seller applications:', error);
      addToast('Error connecting to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedApplication) return;

    try {
      setBulkActionLoading(true);
      const token = localStorage.getItem('token') || localStorage.getItem('linkdao_access_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/sellers/${selectedApplication.id}/application/review`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(reviewData)
        }
      );

      if (response.ok) {
        addToast(`Application ${reviewData.status} successfully`, 'success');
        setReviewModal(false);
        setSelectedApplication(null);
        loadApplications();
      } else {
        const error = await response.json();
        addToast(error.message || 'Failed to submit review', 'error');
      }
    } catch (error) {
      console.error('Failed to review application:', error);
      addToast('Error connecting to server', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk action handlers
  const toggleApplicationSelection = (applicationId: number) => {
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

  const handleBulkAction = async (action: 'approved' | 'rejected') => {
    if (selectedApplications.size === 0) return;

    setBulkActionLoading(true);
    try {
      const applicationIds = Array.from(selectedApplications);
      const token = localStorage.getItem('token') || localStorage.getItem('linkdao_access_token');
      
      await Promise.all(
        applicationIds.map(appId =>
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sellers/${appId}/application/review`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: action,
              adminNotes: `Bulk ${action} by admin`,
              rejectionReason: action === 'rejected' ? 'Bulk rejection' : '',
            })
          })
        )
      );

      addToast(`Successfully processed ${selectedApplications.size} applications`, 'success');
      setSelectedApplications(new Set());
      setShowBulkActions(false);
      loadApplications();
    } catch (error) {
      console.error(`Failed to execute bulk ${action}:`, error);
      addToast(`Error during bulk ${action}`, 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400 bg-green-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/20';
      case 'under_review': return 'text-yellow-400 bg-yellow-500/20';
      case 'pending': return 'text-blue-400 bg-blue-500/20';
      case 'resubmitted': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Bulk Actions Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Seller Applications</h2>
          <p className="text-gray-400 text-sm">Review and manage seller onboarding applications</p>
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
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="resubmitted">Resubmitted</option>
          </select>

          <div className="flex items-center gap-2 flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by store name or wallet..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white flex-1 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </GlassPanel>

      {/* Bulk Actions Toolbar */}
      <AnimatePresence>
        {showBulkActions && selectedApplications.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
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
                    onClick={() => handleBulkAction('approved')}
                    disabled={bulkActionLoading}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-green-500/10 border-green-500/50 text-green-400 hover:bg-green-500/20"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Selected
                  </Button>
                  <Button
                    onClick={() => handleBulkAction('rejected')}
                    disabled={bulkActionLoading}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Selected
                  </Button>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Applications Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Applications ({pagination.total})</h2>
            {showBulkActions && applications.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
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
                  <div className="h-20 bg-white/5 rounded"></div>
                </GlassPanel>
              ))}
            </div>
          ) : applications.length === 0 ? (
            <GlassPanel className="p-12 text-center">
              <div className="max-w-xs mx-auto">
                <Info className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-1">No Applications Found</h3>
                <p className="text-gray-400 text-sm">There are no seller applications matching your current filters.</p>
              </div>
            </GlassPanel>
          ) : (
            <div className="space-y-4">
              {applications
                .filter(app => 
                  (app.storeName?.toLowerCase() || '').includes(filters.search.toLowerCase()) ||
                  app.walletAddress.toLowerCase().includes(filters.search.toLowerCase())
                )
                .map((application) => {
                const isSelected = selectedApplications.has(application.id);
                const isReviewable = application.applicationStatus === 'pending' || application.applicationStatus === 'resubmitted' || application.applicationStatus === 'under_review';
                
                return (
                  <GlassPanel
                    key={application.id}
                    className={`p-4 cursor-pointer transition-all duration-200 ${
                      selectedApplication?.id === application.id ? 'ring-2 ring-purple-500 bg-white/5' :
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-500/10' :
                      'hover:bg-white/5 border-transparent'
                    }`}
                    onClick={() => setSelectedApplication(application)}
                  >
                    <div className="flex items-start gap-3">
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
                            <Square className="w-5 h-5 text-gray-500 hover:text-gray-300" />
                          )}
                        </button>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                              {application.storeName ? application.storeName.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-white font-bold truncate">
                                {application.storeName || 'Unnamed Store'}
                              </h3>
                              <p className="text-gray-400 text-xs font-mono truncate">
                                {application.walletAddress}
                              </p>
                              <div className="flex items-center gap-3 mt-2 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {application.applicationSubmittedAt 
                                    ? new Date(application.applicationSubmittedAt).toLocaleDateString()
                                    : new Date(application.createdAt).toLocaleDateString()}
                                </span>
                                {application.isVerified && (
                                  <span className="flex items-center gap-1 text-green-500">
                                    <Shield className="w-3 h-3" />
                                    KYC Verified
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${getStatusColor(application.applicationStatus)}`}>
                              {application.applicationStatus.replace('_', ' ')}
                            </span>
                            {isReviewable && selectedApplication?.id !== application.id && (
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
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
            <div className="flex justify-center items-center gap-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                Previous
              </Button>
              <span className="text-gray-400 text-sm">
                Page <span className="text-white font-bold">{pagination.page}</span> of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div className="relative">
          {selectedApplication ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-4"
            >
              <GlassPanel className="p-0 overflow-hidden border-purple-500/30">
                {/* Panel Header */}
                <div className="p-6 border-b border-white/10 bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Application Details</h3>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setReviewData({
                            status: selectedApplication.applicationStatus === 'rejected' ? 'rejected' : 'approved',
                            rejectionReason: selectedApplication.applicationRejectionReason || '',
                            adminNotes: selectedApplication.applicationAdminNotes || ''
                          });
                          setReviewModal(true);
                        }}
                        variant="primary"
                        size="sm"
                        className="shadow-lg shadow-purple-500/20"
                      >
                        Action
                      </Button>
                      <button 
                        onClick={() => setSelectedApplication(null)}
                        className="p-2 text-gray-500 hover:text-white transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl text-white font-bold shadow-xl">
                      {selectedApplication.storeName ? selectedApplication.storeName.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">{selectedApplication.storeName || 'Unnamed Store'}</h4>
                      <p className="text-purple-400 text-sm font-medium">#{selectedApplication.id}</p>
                    </div>
                  </div>
                </div>

                {/* Panel Body */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Status</label>
                      <div className="flex">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(selectedApplication.applicationStatus)}`}>
                          {selectedApplication.applicationStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">KYC Status</label>
                      <div className="flex items-center gap-1.5">
                        {selectedApplication.isVerified ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className={`text-xs font-bold ${selectedApplication.isVerified ? 'text-green-500' : 'text-yellow-500'}`}>
                          {selectedApplication.isVerified ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block mb-1">Store Email</label>
                      <div className="flex items-center gap-2 text-white">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{selectedApplication.email || 'Not provided'}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block mb-1">Wallet Address</label>
                      <div className="p-2 bg-black/20 rounded border border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-gray-300 truncate mr-2">{selectedApplication.walletAddress}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(selectedApplication.walletAddress);
                            addToast('Address copied', 'success');
                          }}
                          className="text-[10px] text-purple-400 hover:text-purple-300 font-bold"
                        >
                          COPY
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block mb-1">Public Profile</label>
                      <a 
                        href={`/u/${selectedApplication.walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors group"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>View public store page</span>
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                      </a>
                    </div>
                  </div>

                  {selectedApplication.applicationStatus === 'rejected' && selectedApplication.applicationRejectionReason && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <label className="text-[10px] uppercase tracking-widest text-red-400 font-bold block mb-2">Rejection Reason</label>
                      <p className="text-sm text-red-200">{selectedApplication.applicationRejectionReason}</p>
                    </div>
                  )}

                  {selectedApplication.applicationAdminNotes && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <label className="text-[10px] uppercase tracking-widest text-blue-400 font-bold block mb-2">Internal Admin Notes</label>
                      <p className="text-sm text-blue-200">{selectedApplication.applicationAdminNotes}</p>
                    </div>
                  )}
                </div>
              </GlassPanel>
            </motion.div>
          ) : (
            <GlassPanel className="p-12 text-center flex flex-col items-center justify-center h-[400px]">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <ShoppingBag className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Review Applications</h3>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">
                Select an application from the list to view detailed information and take action.
              </p>
            </GlassPanel>
          )}
        </div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModal && selectedApplication && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full"
            >
              <GlassPanel className="p-6 border-purple-500/50">
                <h3 className="text-xl font-bold text-white mb-1">Submit Decision</h3>
                <p className="text-gray-400 text-xs mb-6">Application #{selectedApplication.id} - {selectedApplication.storeName}</p>
                
                <form onSubmit={handleReview} className="space-y-6">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">Decision</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewData({ ...reviewData, status: 'approved' })}
                        className={`py-2 rounded-lg border-2 text-[10px] font-bold transition-all ${
                          reviewData.status === 'approved' 
                            ? 'border-green-500 bg-green-500/10 text-green-400' 
                            : 'border-white/5 text-gray-500 hover:bg-white/5'
                        }`}
                      >
                        APPROVE
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewData({ ...reviewData, status: 'rejected' })}
                        className={`py-2 rounded-lg border-2 text-[10px] font-bold transition-all ${
                          reviewData.status === 'rejected' 
                            ? 'border-red-500 bg-red-500/10 text-red-400' 
                            : 'border-white/5 text-gray-500 hover:bg-white/5'
                        }`}
                      >
                        REJECT
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewData({ ...reviewData, status: 'under_review' })}
                        className={`py-2 rounded-lg border-2 text-[10px] font-bold transition-all ${
                          reviewData.status === 'under_review' 
                            ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' 
                            : 'border-white/5 text-gray-500 hover:bg-white/5'
                        }`}
                      >
                        HOLD
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Internal Notes (Admins only)</label>
                    <textarea
                      value={reviewData.adminNotes}
                      onChange={(e) => setReviewData({ ...reviewData, adminNotes: e.target.value })}
                      rows={3}
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g. Verified social links, background check clear..."
                    />
                  </div>
                  
                  {reviewData.status === 'rejected' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <label className="block text-[10px] uppercase tracking-widest text-red-400 font-bold mb-2">Rejection Reason (Visible to Seller)</label>
                      <textarea
                        required
                        value={reviewData.rejectionReason}
                        onChange={(e) => setReviewData({ ...reviewData, rejectionReason: e.target.value })}
                        rows={3}
                        className="w-full bg-black/20 border border-red-500/20 rounded-lg p-3 text-white text-sm outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Please explain why the application was rejected..."
                      />
                    </motion.div>
                  )}
                  
                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button" 
                      onClick={() => setReviewModal(false)} 
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      variant="primary"
                      disabled={bulkActionLoading}
                      className="flex-1"
                    >
                      {bulkActionLoading ? <Clock className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm'}
                    </Button>
                  </div>
                </form>
              </GlassPanel>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
