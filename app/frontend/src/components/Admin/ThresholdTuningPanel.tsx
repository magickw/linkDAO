import React, { useState, useEffect } from 'react';
import { Button } from '@/design-system/components/Button';

interface ThresholdConfiguration {
  id?: number;
  contentType: string;
  reputationTier: string;
  autoBlockThreshold: number;
  quarantineThreshold: number;
  publishThreshold: number;
  escalationThreshold: number;
  isActive: boolean;
}

interface ThresholdTuningPanelProps {
  onThresholdChange?: () => void;
}

export const ThresholdTuningPanel: React.FC<ThresholdTuningPanelProps> = ({ onThresholdChange }) => {
  const [thresholds, setThresholds] = useState<ThresholdConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<ThresholdConfiguration | null>(null);
  const [formData, setFormData] = useState<Partial<ThresholdConfiguration>>({
    contentType: 'post',
    reputationTier: 'new_user',
    autoBlockThreshold: 0.95,
    quarantineThreshold: 0.7,
    publishThreshold: 0.3,
    escalationThreshold: 0.5,
    isActive: true
  });

  const contentTypes = ['post', 'comment', 'listing', 'dm', 'username'];
  const reputationTiers = ['new_user', 'regular_user', 'trusted_user', 'verified_user', 'moderator'];

  useEffect(() => {
    fetchThresholds();
  }, []);

  const fetchThresholds = async () => {
    try {
      const response = await fetch('/api/admin/thresholds');
      const data = await response.json();
      if (data.success) {
        setThresholds(data.data);
      }
    } catch (error) {
      console.error('Error fetching thresholds:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateThreshold = async () => {
    try {
      const response = await fetch('/api/admin/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchThresholds();
        setShowCreateModal(false);
        resetForm();
        onThresholdChange?.();
      }
    } catch (error) {
      console.error('Error creating threshold:', error);
    }
  };

  const handleUpdateThreshold = async () => {
    if (!editingThreshold?.id) return;
    
    try {
      const response = await fetch(`/api/admin/thresholds/${editingThreshold.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchThresholds();
        setEditingThreshold(null);
        resetForm();
        onThresholdChange?.();
      }
    } catch (error) {
      console.error('Error updating threshold:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      contentType: 'post',
      reputationTier: 'new_user',
      autoBlockThreshold: 0.95,
      quarantineThreshold: 0.7,
      publishThreshold: 0.3,
      escalationThreshold: 0.5,
      isActive: true
    });
  };

  const startEdit = (threshold: ThresholdConfiguration) => {
    setEditingThreshold(threshold);
    setFormData(threshold);
  };

  const getReputationTierColor = (tier: string) => {
    switch (tier) {
      case 'new_user': return 'text-red-600 bg-red-100';
      case 'regular_user': return 'text-yellow-600 bg-yellow-100';
      case 'trusted_user': return 'text-green-600 bg-green-100';
      case 'verified_user': return 'text-blue-600 bg-blue-100';
      case 'moderator': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const ThresholdSlider: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
    color?: string;
  }> = ({ label, value, onChange, color = 'blue' }) => (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm text-gray-500">{(value * 100).toFixed(0)}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-${color}`}
      />
    </div>
  );

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
          <h3 className="text-lg font-medium text-gray-900">Threshold Configuration</h3>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create Threshold
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Content Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reputation Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Auto Block
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quarantine
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Publish
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Escalation
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
            {thresholds.map((threshold) => (
              <tr key={threshold.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {threshold.contentType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getReputationTierColor(threshold.reputationTier)}`}>
                    {threshold.reputationTier.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(threshold.autoBlockThreshold * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(threshold.quarantineThreshold * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(threshold.publishThreshold * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {(threshold.escalationThreshold * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    threshold.isActive ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                  }`}>
                    {threshold.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => startEdit(threshold)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingThreshold) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[600px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingThreshold ? 'Edit Threshold Configuration' : 'Create New Threshold Configuration'}
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Content Type</label>
                    <select
                      value={formData.contentType || 'post'}
                      onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      {contentTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reputation Tier</label>
                    <select
                      value={formData.reputationTier || 'new_user'}
                      onChange={(e) => setFormData({ ...formData, reputationTier: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      {reputationTiers.map(tier => (
                        <option key={tier} value={tier}>{tier.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <ThresholdSlider
                    label="Auto Block Threshold"
                    value={formData.autoBlockThreshold || 0.95}
                    onChange={(value) => setFormData({ ...formData, autoBlockThreshold: value })}
                    color="red"
                  />

                  <ThresholdSlider
                    label="Quarantine Threshold"
                    value={formData.quarantineThreshold || 0.7}
                    onChange={(value) => setFormData({ ...formData, quarantineThreshold: value })}
                    color="yellow"
                  />

                  <ThresholdSlider
                    label="Publish Threshold"
                    value={formData.publishThreshold || 0.3}
                    onChange={(value) => setFormData({ ...formData, publishThreshold: value })}
                    color="green"
                  />

                  <ThresholdSlider
                    label="Escalation Threshold"
                    value={formData.escalationThreshold || 0.5}
                    onChange={(value) => setFormData({ ...formData, escalationThreshold: value })}
                    color="blue"
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

                {/* Threshold Visualization */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Threshold Visualization</h4>
                  <div className="relative h-8 bg-gradient-to-r from-green-400 via-yellow-400 via-orange-400 to-red-400 rounded">
                    <div 
                      className="absolute top-0 w-1 h-full bg-gray-800"
                      style={{ left: `${(formData.publishThreshold || 0.3) * 100}%` }}
                    >
                      <div className="absolute -top-6 -left-8 text-xs text-gray-600">Publish</div>
                    </div>
                    <div 
                      className="absolute top-0 w-1 h-full bg-gray-800"
                      style={{ left: `${(formData.escalationThreshold || 0.5) * 100}%` }}
                    >
                      <div className="absolute -top-6 -left-10 text-xs text-gray-600">Escalation</div>
                    </div>
                    <div 
                      className="absolute top-0 w-1 h-full bg-gray-800"
                      style={{ left: `${(formData.quarantineThreshold || 0.7) * 100}%` }}
                    >
                      <div className="absolute -top-6 -left-10 text-xs text-gray-600">Quarantine</div>
                    </div>
                    <div 
                      className="absolute top-0 w-1 h-full bg-gray-800"
                      style={{ left: `${(formData.autoBlockThreshold || 0.95) * 100}%` }}
                    >
                      <div className="absolute -top-6 -left-8 text-xs text-gray-600">Auto Block</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>0% (Safe)</span>
                    <span>100% (Harmful)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingThreshold(null);
                    resetForm();
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingThreshold ? handleUpdateThreshold : handleCreateThreshold}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingThreshold ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};