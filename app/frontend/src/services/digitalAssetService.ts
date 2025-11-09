import { AssetType, LicenseType, AccessType } from '../types/digitalAsset';

export interface CreateDigitalAssetRequest {
  title: string;
  description?: string;
  assetType: AssetType;
  licenseType: LicenseType;
  licenseTerms?: string;
  copyrightNotice?: string;
  downloadLimit?: number;
  streamingEnabled?: boolean;
  watermarkEnabled?: boolean;
  file: File;
}

export interface CreateLicenseRequest {
  assetId: string;
  licenseName: string;
  licenseType: LicenseType;
  price: string;
  currency: string;
  usageRights: {
    personalUse: boolean;
    commercialUse: boolean;
    modification: boolean;
    redistribution: boolean;
    printRights: boolean;
    digitalRights: boolean;
    exclusiveRights: boolean;
    resaleRights: boolean;
    sublicensingRights: boolean;
  };
  durationDays?: number;
  maxDownloads?: number;
  maxUsers?: number;
}

export interface PurchaseLicenseRequest {
  assetId: string;
  licenseId: string;
  transactionHash: string;
  pricePaid: string;
  currency: string;
}

export interface AccessAssetRequest {
  licenseKey: string;
  accessType: AccessType;
}

export interface SubmitDMCARequest {
  assetId: string;
  reporterName: string;
  reporterEmail: string;
  reporterOrganization?: string;
  copyrightHolderName: string;
  originalWorkDescription: string;
  infringementDescription: string;
  evidenceUrls?: string[];
  swornStatement: string;
  contactInformation: string;
}

export interface AnalyticsQuery {
  startDate: string;
  endDate: string;
  assetId?: string;
  groupBy?: 'day' | 'week' | 'month';
}

class DigitalAssetService {
  private baseUrl = '/api/digital-assets';
  
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token') || '';
    return {
      'Authorization': `Bearer ${token}`
    };
  }
  
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data || data;
  }
  
  /**
   * Create a new digital asset
   */
  async createAsset(request: CreateDigitalAssetRequest): Promise<any> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('title', request.title);
    
    if (request.description) {
      formData.append('description', request.description);
    }
    
    formData.append('assetType', request.assetType);
    formData.append('licenseType', request.licenseType);
    
    if (request.licenseTerms) {
      formData.append('licenseTerms', request.licenseTerms);
    }
    
    if (request.copyrightNotice) {
      formData.append('copyrightNotice', request.copyrightNotice);
    }
    
    if (request.downloadLimit !== undefined) {
      formData.append('downloadLimit', request.downloadLimit.toString());
    }
    
    if (request.streamingEnabled !== undefined) {
      formData.append('streamingEnabled', request.streamingEnabled.toString());
    }
    
    if (request.watermarkEnabled !== undefined) {
      formData.append('watermarkEnabled', request.watermarkEnabled.toString());
    }
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: formData
    });
    
    return this.handleResponse(response);
  }
  
  /**
   * Create a license for a digital asset
   */
  async createLicense(request: CreateLicenseRequest): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${request.assetId}/licenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await this.getAuthHeaders())
      },
      body: JSON.stringify(request)
    });
    
    return this.handleResponse(response);
  }
  
  /**
   * Purchase a license for a digital asset
   */
  async purchaseLicense(request: PurchaseLicenseRequest): Promise<any> {
    const response = await fetch(`${this.baseUrl}/purchase-license`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await this.getAuthHeaders())
      },
      body: JSON.stringify(request)
    });
    
    return this.handleResponse(response);
  }
  
  /**
   * Access digital asset content
   */
  async accessAsset(request: AccessAssetRequest): Promise<{ content?: Blob; streamUrl?: string }> {
    const response = await fetch(`${this.baseUrl}/access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await this.getAuthHeaders())
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Check if response is JSON (stream URL) or binary (file content)
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return { streamUrl: data.streamUrl };
    } else {
      const content = await response.blob();
      return { content };
    }
  }
  
  /**
   * Submit DMCA takedown request
   */
  async submitDMCARequest(request: SubmitDMCARequest): Promise<{ requestId: string }> {
    const response = await fetch(`${this.baseUrl}/dmca-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    return this.handleResponse(response);
  }
  
  /**
   * Get analytics for digital assets
   */
  async getAnalytics(query: AnalyticsQuery): Promise<any> {
    const params = new URLSearchParams({
      startDate: query.startDate,
      endDate: query.endDate
    });
    
    if (query.assetId) {
      params.append('assetId', query.assetId);
    }
    
    if (query.groupBy) {
      params.append('groupBy', query.groupBy);
    }
    
    const response = await fetch(`${this.baseUrl}/analytics?${params}`, {
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }
  
  /**
   * Get time series data for charts
   */
  async getTimeSeriesData(query: AnalyticsQuery): Promise<any[]> {
    const params = new URLSearchParams({
      startDate: query.startDate,
      endDate: query.endDate
    });
    
    if (query.assetId) {
      params.append('assetId', query.assetId);
    }
    
    if (query.groupBy) {
      params.append('groupBy', query.groupBy);
    }
    
    const response = await fetch(`${this.baseUrl}/analytics/time-series?${params}`, {
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }
  
  /**
   * Get real-time statistics
   */
  async getRealTimeStats(assetId?: string): Promise<any> {
    const params = new URLSearchParams();
    
    if (assetId) {
      params.append('assetId', assetId);
    }
    
    const response = await fetch(`${this.baseUrl}/analytics/real-time?${params}`, {
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }
  
  /**
   * Get geographic distribution of users
   */
  async getGeographicDistribution(query: AnalyticsQuery): Promise<any[]> {
    const params = new URLSearchParams({
      startDate: query.startDate,
      endDate: query.endDate
    });
    
    if (query.assetId) {
      params.append('assetId', query.assetId);
    }
    
    const response = await fetch(`${this.baseUrl}/analytics/geographic?${params}`, {
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }
  
  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(query: AnalyticsQuery): Promise<any> {
    const params = new URLSearchParams({
      startDate: query.startDate,
      endDate: query.endDate
    });
    
    const response = await fetch(`${this.baseUrl}/analytics/revenue?${params}`, {
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }
  
  /**
   * Create watermark template
   */
  async createWatermarkTemplate(template: {
    name: string;
    templateType: string;
    templateData: any;
    isDefault?: boolean;
  }): Promise<{ templateId: string }> {
    const response = await fetch(`${this.baseUrl}/watermark-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(await this.getAuthHeaders())
      },
      body: JSON.stringify(template)
    });
    
    return this.handleResponse(response);
  }
  
  /**
   * Get watermark templates
   */
  async getWatermarkTemplates(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/watermark-templates`, {
      headers: await this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }
  
  /**
   * Download asset content as file
   */
  async downloadAsset(licenseKey: string, filename?: string): Promise<void> {
    try {
      const result = await this.accessAsset({
        licenseKey,
        accessType: AccessType.DOWNLOAD
      });
      
      if (result.content) {
        // Create download link
        const url = URL.createObjectURL(result.content);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        throw new Error('No content received for download');
      }
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }
  
  /**
   * Preview asset content
   */
  async previewAsset(licenseKey: string): Promise<Blob | null> {
    try {
      const result = await this.accessAsset({
        licenseKey,
        accessType: AccessType.PREVIEW
      });
      
      return result.content || null;
    } catch (error) {
      console.error('Preview failed:', error);
      throw error;
    }
  }
  
  /**
   * Get streaming URL for asset
   */
  async getStreamingUrl(licenseKey: string): Promise<string | null> {
    try {
      const result = await this.accessAsset({
        licenseKey,
        accessType: AccessType.STREAM
      });
      
      return result.streamUrl || null;
    } catch (error) {
      console.error('Streaming URL request failed:', error);
      throw error;
    }
  }
  
  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    
    return `${Math.round(size * 100) / 100} ${sizes[i]}`;
  }
  
  /**
   * Format Ether amount for display
   */
  formatEther(wei: string): string {
    try {
      const eth = parseFloat(wei) / 1e18;
      return `${eth.toFixed(4)} ETH`;
    } catch (error) {
      return '0 ETH';
    }
  }
  
  /**
   * Validate file for upload
   */
  validateFile(file: File, maxSize: number = 500 * 1024 * 1024): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }
    
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `File size exceeds ${this.formatFileSize(maxSize)} limit` 
      };
    }
    
    // Check for potentially dangerous file types
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (dangerousExtensions.includes(fileExtension)) {
      return { 
        valid: false, 
        error: 'File type not allowed for security reasons' 
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Get asset type from file
   */
  getAssetTypeFromFile(file: File): AssetType {
    const mimeType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    if (mimeType.startsWith('image/')) {
      return AssetType.IMAGE;
    } else if (mimeType.startsWith('video/')) {
      return AssetType.VIDEO;
    } else if (mimeType.startsWith('audio/')) {
      return AssetType.AUDIO;
    } else if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return AssetType.DOCUMENT;
    } else if (fileName.includes('.zip') || fileName.includes('.rar') || fileName.includes('.exe')) {
      return AssetType.SOFTWARE;
    } else if (fileName.includes('.epub') || fileName.includes('.mobi')) {
      return AssetType.EBOOK;
    } else {
      return AssetType.OTHER;
    }
  }
}

export const digitalAssetService = new DigitalAssetService();