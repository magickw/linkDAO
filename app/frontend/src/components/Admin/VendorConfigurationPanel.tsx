import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface VendorConfiguration {
  id?: number;
  vendorName: string;
  serviceType: string;
  apiEndpoint?: string;
  apiKeyRef?: string;
  isEnabled: boolean;
  priority: number;
  timeoutMs: number;
  retryAttempts: number;
  rateLimitPerMinute: number;
  costPerRequest: number;
  fallbackVendorId?: number;
  healthCheckUrl?: string;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
}

interface VendorConfigurationPanelProps {
  onVendorChange?: () => void;
}

export const VendorConfigurationPanel: React.FC<VendorConfigurationPanelProps> = ({ onVendorChange }) => {
  const [vendors, setVendors] = useState<VendorConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorConfiguration | null>(null);
  const [formData, setFormData] = useState<Partial<VendorConfiguration>>({
    vendorName: '',
    serviceType: 'text_moderation',
    apiEndpoint: '',
    apiKeyRef: '',
    isEnabled: true,
    priority: 1,
    timeoutMs: 30000,
    retryAttempts: 3,
    rateLimitPerMinute: 100,
    costPerRequest: 0.001,
    healthCheckUrl: '',
    healthStatus: 'unknown'
  });

  const serviceTypes = [
    'text_moderation',
    'image_moderation',
    'video_moderation',
    'link_safety',
    'custom_detection'
  ];

  const vendorPresets = {
    'OpenAI': {
      serviceType: 'text_moderation',
      apiEndpoint: 'https://api.openai.com/v1/moderations',
      healthCheckUrl: 'https://api.openai.com/v1/models',
      costPerRequest: 0.002,
      rateLimitPerMinute: 60
    },
    'Google Vision': {
      serviceType: 'image_moderation',
      apiEndpoint: 'https://vision.googleapis.com/v1/images:annotate',
      healthCheckUrl: 'https://vision.googleapis.com/v1/images:annotate',
      costPerRequest: 0.0015,
      rateLimitPerMinute: 1800
    },
    'Perspective API': {
      serviceType: 'text_moderation',
      apiEndpoint: 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze',
      healthCheckUrl: 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze',
      costPerRequest: 0.001,
      rateLimitPerMinute: 1000
    },
    'AWS Rekognition': {
      serviceType: 'image_moderation',
      apiEndpoint: 'https://rekognition.us-east-1.amazonaws.com/',
      healthCheckUrl: 'https://rekognition.us-east-1.amazonaws.com/',
      costPerRequest: 0.001,
      rateLimitPerMinute: 5000
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/admin/vendors');
      const data = await response.json();
      if (data.success) {
        setVendors(data.data);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVendor = async () => {
    try {
      const response = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchVendors();
        setShowCreateModal(false);
        resetForm();
        onVendorChange?.();
      }
    } catch (error) {
      console.error('Error creating vendor:', error);
    }
  };

  const handleUpdateVendor = async () => {
    if (!editingVendor?.id) return;
    
    try {
      const response = await fetch(`/api/admin/vendors/${editingVendor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchVendors();
        setEditingVendor(null);
        resetForm();
        onVendorChange?.();
      }
    } catch (error) {
      console.error('Error updating vendor:', error);
    }
  };

  const handleHealthCheck = async (vendorId: number) => {
    try {
      // This would trigger a health check for the vendor
      const response = await fetch(`/api/admin/vendors/${vendorId}/health-check`, {
        method: 'POST'
      });
      
      if (response.ok) {
        await fetchVendors();
      }
    } catch (error) {
      console.error('Error performing health check:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      vendorName: '',
      serviceType: 'text_moderation',
      apiEndpoint: '',
      apiKeyRef: '',
      isEnabled: true,
      priority: 1,
      timeoutMs: 30000,
      retryAttempts: 3,
      rateLimitPerMinute: 100,
      costPerRequest: 0.001,
      healthCheckUrl: '',
      healthStatus: 'unknown'
    });
  };

  const startEdit = (vendor: VendorConfiguration) => {
    setEditingVendor(vendor);
    setFormData(vendor);
  };

  const applyPreset = (presetName: string) => {
    const preset = vendorPresets[presetName as keyof typeof vendorPresets];
    if (preset) {
      setFormData({
        ...formData,
        vendorName: presetName,
        ...preset
      });
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      case 'unknown': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getServiceTypeColor = (serviceType: string) => {
    switch (serviceType) {
      case 'text_moderation': return 'text-blue-600 bg-blue-100';
      case 'image_moderation': return 'text-purple-600 bg-purple-100';
      case 'video_moderation': return 'text-indigo-600 bg-indigo-100';
      case 'link_safety': return 'text-orange-600 bg-orange-100';
      case 'custom_detection': return 'text-pink-600 bg-pink-100';
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
          <h3 className="text-lg font-medium text-gray-900">Vendor Configuration</h3>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Add Vendor
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rate Limit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost/Request
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Health Status
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
            {vendors.map((vendor) => (
              <tr key={vendor.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{vendor.vendorName}</div>
                  <div className="text-sm text-gray-500">Timeout: {vendor.timeoutMs}ms</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getServiceTypeColor(vendor.serviceType)}`}>
                    {vendor.serviceType.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {vendor.priority}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {vendor.rateLimitPerMinute}/min
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${vendor.costPerRequest.toFixed(4)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getHealthStatusColor(vendor.healthStatus)}`}>
                    {vendor.healthStatus}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    vendor.isEnabled ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                  }`}>
                    {vendor.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => startEdit(vendor)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleHealthCheck(vendor.id!)}
                    className="text-green-600 hover:text-green-900"
                  >
                    Test
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingVendor) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-[700px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingVendor ? 'Edit Vendor Configuration' : 'Add New Vendor'}
              </h3>
              
              {/* Preset Selection */}
              {!editingVendor && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quick Setup</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(vendorPresets).map(preset => (
                      <button
                        key={preset}
                        onClick={() => applyPreset(preset)}
                        className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="font-medium text-sm">{preset}</div>
                        <div className="text-xs text-gray-500">
                          {vendorPresets[preset as keyof typeof vendorPresets].serviceType.replace('_', ' ')}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vendor Name</label>
                    <input
                      type="text"
                      value={formData.vendorName || ''}
                      onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Service Type</label>
                    <select
                      value={formData.serviceType || 'text_moderation'}
                      onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      {serviceTypes.map(type => (
                        <option key={type} value={type}>{type.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">API Endpoint</label>
                  <input
                    type="url"
                    value={formData.apiEndpoint || ''}
                    onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="https://api.vendor.com/v1/endpoint"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">API Key Reference</label>
                  <input
                    type="text"
                    value={formData.apiKeyRef || ''}
                    onChange={(e) => setFormData({ ...formData, apiKeyRef: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="VENDOR_API_KEY"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Health Check URL</label>
                  <input
                    type="url"
                    value={formData.healthCheckUrl || ''}
                    onChange={(e) => setFormData({ ...formData, healthCheckUrl: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="https://api.vendor.com/health"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.priority || 1}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timeout (ms)</label>
                    <input
                      type="number"
                      value={formData.timeoutMs || 30000}
                      onChange={(e) => setFormData({ ...formData, timeoutMs: parseInt(e.target.value) })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Retry Attempts</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.retryAttempts || 3}
                      onChange={(e) => setFormData({ ...formData, retryAttempts: parseInt(e.target.value) })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rate Limit (per minute)</label>
                    <input
                      type="number"
                      value={formData.rateLimitPerMinute || 100}
                      onChange={(e) => setFormData({ ...formData, rateLimitPerMinute: parseInt(e.target.value) })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cost per Request ($)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.costPerRequest || 0.001}
                      onChange={(e) => setFormData({ ...formData, costPerRequest: parseFloat(e.target.value) })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled || false}
                    onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">Enabled</label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingVendor(null);
                    resetForm();
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingVendor ? handleUpdateVendor : handleCreateVendor}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingVendor ? 'Update' : 'Add Vendor'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};