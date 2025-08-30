import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Download,
  Check,
  X,
  Clock,
  AlertCircle,
  MessageSquare,
  Edit,
  Trash2
} from 'lucide-react';
import { ProjectDeliverable, CreateDeliverableRequest } from '../../types/service';
import { projectManagementService } from '../../services/projectManagementService';

interface DeliverablesListProps {
  bookingId: string;
  userRole: 'client' | 'provider';
  onUpdate?: () => void;
}

const DeliverablesList: React.FC<DeliverablesListProps> = ({
  bookingId,
  userRole,
  onUpdate
}) => {
  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateDeliverableRequest>({
    bookingId,
    title: '',
    description: ''
  });
  const [selectedDeliverable, setSelectedDeliverable] = useState<ProjectDeliverable | null>(null);

  useEffect(() => {
    loadDeliverables();
  }, [bookingId]);

  const loadDeliverables = async () => {
    try {
      setLoading(true);
      const data = await projectManagementService.getDeliverablesByBooking(bookingId);
      setDeliverables(data);
    } catch (error) {
      console.error('Failed to load deliverables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await projectManagementService.createDeliverable(createForm);
      await loadDeliverables();
      setShowCreateModal(false);
      setCreateForm({
        bookingId,
        title: '',
        description: ''
      });
      onUpdate?.();
    } catch (error) {
      console.error('Failed to create deliverable:', error);
    }
  };

  const handleStatusUpdate = async (deliverableId: string, status: ProjectDeliverable['status']) => {
    try {
      await projectManagementService.updateDeliverable(deliverableId, { status });
      await loadDeliverables();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update deliverable status:', error);
    }
  };

  const getStatusColor = (status: ProjectDeliverable['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'revision_requested':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ProjectDeliverable['status']) => {
    switch (status) {
      case 'approved':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'submitted':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'rejected':
        return <X className="h-4 w-4 text-red-600" />;
      case 'revision_requested':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Deliverables</h2>
        {userRole === 'provider' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Upload className="h-4 w-4 mr-2" />
            Add Deliverable
          </button>
        )}
      </div>

      {/* Deliverables List */}
      {deliverables.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No deliverables yet</p>
          <p className="text-gray-400 text-sm">
            {userRole === 'provider'
              ? 'Upload your first deliverable to get started'
              : 'Waiting for the provider to submit deliverables'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliverables.map((deliverable) => (
            <div key={deliverable.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(deliverable.status)}
                    <h3 className="text-lg font-medium text-gray-900">
                      {deliverable.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(deliverable.status)}`}>
                      {deliverable.status.replace('_', ' ')}
                    </span>
                  </div>

                  {deliverable.description && (
                    <p className="text-gray-600 mb-3">{deliverable.description}</p>
                  )}

                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <span>
                      Created: {new Date(deliverable.createdAt).toLocaleDateString()}
                    </span>
                    {deliverable.submittedAt && (
                      <span>
                        Submitted: {new Date(deliverable.submittedAt).toLocaleDateString()}
                      </span>
                    )}
                    {deliverable.approvedAt && (
                      <span>
                        Approved: {new Date(deliverable.approvedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {deliverable.clientFeedback && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center mb-1">
                        <MessageSquare className="h-4 w-4 text-gray-500 mr-1" />
                        <span className="text-sm font-medium text-gray-700">Client Feedback:</span>
                      </div>
                      <p className="text-sm text-gray-600">{deliverable.clientFeedback}</p>
                    </div>
                  )}

                  {deliverable.providerNotes && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center mb-1">
                        <MessageSquare className="h-4 w-4 text-blue-500 mr-1" />
                        <span className="text-sm font-medium text-blue-700">Provider Notes:</span>
                      </div>
                      <p className="text-sm text-blue-600">{deliverable.providerNotes}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  {deliverable.fileHash && (
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <Download className="h-4 w-4" />
                    </button>
                  )}

                  {userRole === 'client' && deliverable.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(deliverable.id, 'approved')}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(deliverable.id, 'revision_requested')}
                        className="px-3 py-1 bg-yellow-600 text-white text-xs rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        Request Revision
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(deliverable.id, 'rejected')}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {userRole === 'provider' && deliverable.status === 'draft' && (
                    <button
                      onClick={() => handleStatusUpdate(deliverable.id, 'submitted')}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Submit
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Deliverable</h3>

            <form onSubmit={handleCreateDeliverable} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={createForm.description || ''}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Deliverable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliverablesList;