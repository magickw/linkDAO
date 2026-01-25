import React, { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import {
  Upload,
  Download,
  Eye,
  Shield,
  BarChart3,
  AlertTriangle,
  FileText,
  Image,
  Video,
  Music,
  Package,
  Zap
} from 'lucide-react';
import { enhancedAuthService } from '@/services/enhancedAuthService';

interface DigitalAsset {
  id: string;
  title: string;
  description?: string;
  assetType: string;
  fileSize: number;
  fileFormat: string;
  drmEnabled: boolean;
  licenseType: string;
  downloadLimit: number;
  streamingEnabled: boolean;
  watermarkEnabled: boolean;
  createdAt: string;
  analytics?: {
    totalDownloads: number;
    totalStreams: number;
    totalPreviews: number;
    totalRevenue: string;
  };
}

interface License {
  id: string;
  licenseName: string;
  licenseType: string;
  price: string;
  currency: string;
  maxDownloads: number;
  maxUsers: number;
  isActive: boolean;
}

interface AnalyticsData {
  totalDownloads: number;
  totalStreams: number;
  totalPreviews: number;
  uniqueUsers: number;
  totalRevenue: string;
  bandwidthUsed: number;
  popularAssets: Array<{
    assetId: string;
    title: string;
    downloads: number;
    revenue: string;
  }>;
}

const DigitalAssetManager: React.FC = () => {
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<DigitalAsset | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<'assets' | 'licenses' | 'analytics' | 'dmca'>('assets');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Asset upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    assetType: 'image',
    licenseType: 'standard',
    downloadLimit: -1,
    streamingEnabled: false,
    watermarkEnabled: true
  });
  
  // License creation state
  const [licenseForm, setLicenseForm] = useState({
    licenseName: '',
    licenseType: 'standard',
    price: '',
    currency: 'ETH',
    maxDownloads: -1,
    maxUsers: 1,
    usageRights: {
      personalUse: true,
      commercialUse: false,
      modification: false,
      redistribution: false,
      printRights: true,
      digitalRights: true,
      exclusiveRights: false,
      resaleRights: false,
      sublicensingRights: false
    }
  });
  
  // DMCA form state
  const [dmcaForm, setDmcaForm] = useState({
    assetId: '',
    reporterName: '',
    reporterEmail: '',
    reporterOrganization: '',
    copyrightHolderName: '',
    originalWorkDescription: '',
    infringementDescription: '',
    swornStatement: '',
    contactInformation: ''
  });
  
  useEffect(() => {
    loadAssets();
    loadAnalytics();
  }, []);
  
  const loadAssets = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockAssets: DigitalAsset[] = [
        {
          id: 'asset-1',
          title: 'Digital Artwork Collection',
          description: 'High-resolution digital art pieces',
          assetType: 'image',
          fileSize: 15728640, // 15MB
          fileFormat: 'png',
          drmEnabled: true,
          licenseType: 'standard',
          downloadLimit: 100,
          streamingEnabled: false,
          watermarkEnabled: true,
          createdAt: '2024-01-15T10:30:00Z',
          analytics: {
            totalDownloads: 45,
            totalStreams: 0,
            totalPreviews: 120,
            totalRevenue: '2500000000000000000' // 2.5 ETH
          }
        },
        {
          id: 'asset-2',
          title: 'Music Album - Digital Edition',
          description: 'Complete album with bonus tracks',
          assetType: 'audio',
          fileSize: 104857600, // 100MB
          fileFormat: 'flac',
          drmEnabled: true,
          licenseType: 'commercial',
          downloadLimit: 50,
          streamingEnabled: true,
          watermarkEnabled: true,
          createdAt: '2024-01-10T14:20:00Z',
          analytics: {
            totalDownloads: 28,
            totalStreams: 156,
            totalPreviews: 89,
            totalRevenue: '1800000000000000000' // 1.8 ETH
          }
        }
      ];
      setAssets(mockAssets);
    } catch (err) {
      setError('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };
  
  const loadAnalytics = async () => {
    try {
      // Mock analytics data - replace with actual API call
      const mockAnalytics: AnalyticsData = {
        totalDownloads: 73,
        totalStreams: 156,
        totalPreviews: 209,
        uniqueUsers: 45,
        totalRevenue: '4300000000000000000', // 4.3 ETH
        bandwidthUsed: 2147483648, // 2GB
        popularAssets: [
          {
            assetId: 'asset-1',
            title: 'Digital Artwork Collection',
            downloads: 45,
            revenue: '2500000000000000000'
          },
          {
            assetId: 'asset-2',
            title: 'Music Album - Digital Edition',
            downloads: 28,
            revenue: '1800000000000000000'
          }
        ]
      };
      setAnalytics(mockAnalytics);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };
  
  const handleUploadAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('assetType', uploadForm.assetType);
      formData.append('licenseType', uploadForm.licenseType);
      formData.append('downloadLimit', uploadForm.downloadLimit.toString());
      formData.append('streamingEnabled', uploadForm.streamingEnabled.toString());
      formData.append('watermarkEnabled', uploadForm.watermarkEnabled.toString());

      const token = enhancedAuthService.getAuthToken();
      if (!token) {
        throw new Error('Please log in to upload assets');
      }

      const response = await fetch('/api/digital-assets', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload asset');
      }
      
      const result = await response.json();
      setAssets(prev => [...prev, result.data]);
      
      // Reset form
      setUploadFile(null);
      setUploadForm({
        title: '',
        description: '',
        assetType: 'image',
        licenseType: 'standard',
        downloadLimit: -1,
        streamingEnabled: false,
        watermarkEnabled: true
      });
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload asset');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    setLoading(true);
    try {
      const token = enhancedAuthService.getAuthToken();
      if (!token) {
        throw new Error('Please log in to create licenses');
      }

      const response = await fetch(`/api/digital-assets/${selectedAsset.id}/licenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assetId: selectedAsset.id,
          ...licenseForm
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create license');
      }
      
      const result = await response.json();
      setLicenses(prev => [...prev, result.data]);
      
      // Reset form
      setLicenseForm({
        licenseName: '',
        licenseType: 'standard',
        price: '',
        currency: 'ETH',
        maxDownloads: -1,
        maxUsers: 1,
        usageRights: {
          personalUse: true,
          commercialUse: false,
          modification: false,
          redistribution: false,
          printRights: true,
          digitalRights: true,
          exclusiveRights: false,
          resaleRights: false,
          sublicensingRights: false
        }
      });
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create license');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitDMCA = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const response = await fetch('/api/digital-assets/dmca-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dmcaForm)
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit DMCA request');
      }
      
      const result = await response.json();
      
      // Reset form
      setDmcaForm({
        assetId: '',
        reporterName: '',
        reporterEmail: '',
        reporterOrganization: '',
        copyrightHolderName: '',
        originalWorkDescription: '',
        infringementDescription: '',
        swornStatement: '',
        contactInformation: ''
      });
      
  setError(null);
  const { addToast } = useToast();
  addToast(`DMCA request submitted successfully. Request ID: ${result.data.requestId}`, 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit DMCA request');
    } finally {
      setLoading(false);
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };
  
  const formatEther = (wei: string): string => {
    const eth = parseFloat(wei) / 1e18;
    return eth.toFixed(4) + ' ETH';
  };
  
  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      case 'document': return <FileText className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Digital Asset Management</h1>
        <p className="text-gray-600">Manage your digital assets with DRM protection, licensing, and analytics</p>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'assets', label: 'Assets', icon: Package },
            { id: 'licenses', label: 'Licenses', icon: Shield },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'dmca', label: 'DMCA', icon: AlertTriangle }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Assets Tab */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
          {/* Upload Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Upload New Asset</h2>
            <form onSubmit={handleUploadAsset} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Type *
                  </label>
                  <select
                    value={uploadForm.assetType}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, assetType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                    <option value="document">Document</option>
                    <option value="software">Software</option>
                    <option value="ebook">E-book</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Type
                  </label>
                  <select
                    value={uploadForm.licenseType}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, licenseType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="standard">Standard</option>
                    <option value="personal">Personal</option>
                    <option value="commercial">Commercial</option>
                    <option value="extended">Extended</option>
                    <option value="exclusive">Exclusive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Download Limit
                  </label>
                  <input
                    type="number"
                    value={uploadForm.downloadLimit}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, downloadLimit: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="-1 for unlimited"
                  />
                </div>
                
                <div className="flex items-center space-x-4 pt-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={uploadForm.streamingEnabled}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, streamingEnabled: e.target.checked }))}
                      className="mr-2"
                    />
                    Streaming
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={uploadForm.watermarkEnabled}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, watermarkEnabled: e.target.checked }))}
                      className="mr-2"
                    />
                    Watermark
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading || !uploadFile}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                {loading ? 'Uploading...' : 'Upload Asset'}
              </button>
            </form>
          </div>
          
          {/* Assets List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Your Assets</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {assets.map((asset) => (
                <div key={asset.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getAssetTypeIcon(asset.assetType)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{asset.title}</h3>
                        {asset.description && (
                          <p className="text-gray-600 mt-1">{asset.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>{formatFileSize(asset.fileSize)}</span>
                          <span>{asset.fileFormat.toUpperCase()}</span>
                          <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          {asset.drmEnabled && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Shield className="w-3 h-3 mr-1" />
                              DRM Protected
                            </span>
                          )}
                          {asset.streamingEnabled && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Zap className="w-3 h-3 mr-1" />
                              Streaming
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {asset.analytics && (
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          <div>{asset.analytics.totalDownloads} downloads</div>
                          <div>{asset.analytics.totalStreams} streams</div>
                          <div className="font-medium text-gray-900">
                            {formatEther(asset.analytics.totalRevenue)}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedAsset(asset)}
                          className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Manage
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Download className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Downloads</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalDownloads}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Zap className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Streams</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalStreams}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Eye className="w-8 h-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Previews</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalPreviews}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatEther(analytics.totalRevenue)}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Popular Assets */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Popular Assets</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {analytics.popularAssets.map((asset, index) => (
                <div key={asset.assetId} className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{asset.title}</h3>
                      <p className="text-sm text-gray-500">{asset.downloads} downloads</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-gray-900">{formatEther(asset.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* DMCA Tab */}
      {activeTab === 'dmca' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Submit DMCA Takedown Request</h2>
          <form onSubmit={handleSubmitDMCA} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset ID *
                </label>
                <select
                  required
                  value={dmcaForm.assetId}
                  onChange={(e) => setDmcaForm(prev => ({ ...prev, assetId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an asset</option>
                  {assets.map(asset => (
                    <option key={asset.id} value={asset.id}>{asset.title}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reporter Name *
                </label>
                <input
                  type="text"
                  required
                  value={dmcaForm.reporterName}
                  onChange={(e) => setDmcaForm(prev => ({ ...prev, reporterName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reporter Email *
                </label>
                <input
                  type="email"
                  required
                  value={dmcaForm.reporterEmail}
                  onChange={(e) => setDmcaForm(prev => ({ ...prev, reporterEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Copyright Holder Name *
                </label>
                <input
                  type="text"
                  required
                  value={dmcaForm.copyrightHolderName}
                  onChange={(e) => setDmcaForm(prev => ({ ...prev, copyrightHolderName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Original Work Description *
              </label>
              <textarea
                required
                value={dmcaForm.originalWorkDescription}
                onChange={(e) => setDmcaForm(prev => ({ ...prev, originalWorkDescription: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your original work that is being infringed"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Infringement Description *
              </label>
              <textarea
                required
                value={dmcaForm.infringementDescription}
                onChange={(e) => setDmcaForm(prev => ({ ...prev, infringementDescription: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe how your work is being infringed"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sworn Statement *
              </label>
              <textarea
                required
                value={dmcaForm.swornStatement}
                onChange={(e) => setDmcaForm(prev => ({ ...prev, swornStatement: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="I swear under penalty of perjury that the information in this notification is accurate..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Information *
              </label>
              <textarea
                required
                value={dmcaForm.contactInformation}
                onChange={(e) => setDmcaForm(prev => ({ ...prev, contactInformation: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your full contact information including address and phone number"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              {loading ? 'Submitting...' : 'Submit DMCA Request'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default DigitalAssetManager;