import React, { useState, useEffect } from 'react';
import { Button } from '@/design-system/components/Button';

interface PolicyConfiguration {
  id?: number;
  name: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidenceThreshold: number;
  action: 'allow' | 'limit' | 'block' | 'review';
  reputationModifier: number;
  description?: string;
  isActive: boolean;
}

interface PolicyConfigurationPanelProps {
  onPolicyChange?: () => void;
}

export const PolicyConfigurationPanel: React.FC<PolicyConfigurationPanelProps> = ({ onPolicyChange }) => {
  const [policies, setPolicies] = useState<PolicyConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyConfiguration | null>(null);
  const [formData, setFormData] = useState<Partial<PolicyConfiguration>>({
    name: '',
    category: 'harassment',
    severity: 'medium',
    confidenceThreshold: 0.7,
    action: 'review',
    reputationModifier: 0,
    description: '',
    isActive: true
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const response = await fetch('/api/admin/policies');
      const data = await response.json();
      if (data.success) {
        setPolicies(data.data);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePolicy = async () => {
    try {
      const response = await fetch('/api/admin/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchPolicies();
        setShowCreateModal(false);
        resetForm();
        onPolicyChange?.();
      }
    } catch (error) {
      console.error('Error creating policy:', error);
    }
  };

  const handleUpdatePolicy = async () => {
    if (!editingPolicy?.id) return;
    
    try {
      const response = await fetch(`/api/admin/policies/${editingPolicy.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchPolicies();
        setEditingPolicy(null);
        resetForm();
        onPolicyChange?.();
      }
    } catch (error) {
      console.error('Error updating policy:', error);
    }
  };

  const handleDeletePolicy = async (id: number) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    
    try {
      const response = await fetch(`/api/admin/policies/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchPolicies();
        onPolicyChange?.();
      }
    } catch (error) {
      console.error('Error deleting policy:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'harassment',
      severity: 'medium',
      confidenceThreshold: 0.7,
      action: 'review',
      reputationModifier: 0,
      description: '',
      isActive: true
    });
  };

  const startEdit = (policy: PolicyConfiguration) => {
    setEditingPolicy(policy);
    setFormData(policy);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'allow': return 'text-green-600 bg-green-100';
      case 'limit': return 'text-yellow-600 bg-yellow-100';
      case 'review': return 'text-blue-600 bg-blue-100';
      case 'block': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Policy Configuration</h3>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create Policy
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Policy Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Severity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Threshold
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {policies.map((policy) => (
              <tr key={policy.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{policy.name}</div>
                  {policy.description && (
                    <div className="text-sm text-gray-500">{policy.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {policy.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(policy.severity)}`}>
                    {policy.severity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(policy.confidenceThreshold * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(policy.action)}`}>
                    {policy.action}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    policy.isActive ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                  }`}>
                    {policy.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => startEdit(policy)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePolicy(policy.id!)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPolicy) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingPolicy ? 'Edit Policy' : 'Create New Policy'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={formData.category || 'harassment'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="harassment">Harassment</option>
                    <option value="spam">Spam</option>
                    <option value="hate_speech">Hate Speech</option>
                    <option value="violence">Violence</option>
                    <option value="nsfw">NSFW</option>
                    <option value="scam">Scam</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Severity</label>
                  <select
                    value={formData.severity || 'medium'}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confidence Threshold ({((formData.confidenceThreshold || 0.7) * 100).toFixed(0)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={formData.confidenceThreshold || 0.7}
                    onChange={(e) => setFormData({ ...formData, confidenceThreshold: parseFloat(e.target.value) })}
                    className="mt-1 block w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <select
                    value={formData.action || 'review'}
                    onChange={(e) => setFormData({ ...formData, action: e.target.value as any })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="allow">Allow</option>
                    <option value="limit">Limit</option>
                    <option value="review">Review</option>
                    <option value="block">Block</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reputation Modifier</label>
                  <input
                    type="number"
                    value={formData.reputationModifier || 0}
                    onChange={(e) => setFormData({ ...formData, reputationModifier: parseInt(e.target.value) })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive || false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">Active</label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingPolicy(null);
                    resetForm();
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingPolicy ? handleUpdatePolicy : handleCreatePolicy}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingPolicy ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};