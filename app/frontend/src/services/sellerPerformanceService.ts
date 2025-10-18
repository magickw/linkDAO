import { 
  SellerScorecard, 
  SellerRiskProfile, 
  MarketplaceHealthDashboard, 
  SellerGrowthProjection,
  SellerPerformanceDashboard,
  PerformanceAlert
} from '../types/sellerPerformance';

class SellerPerformanceService {
  private baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

  // Helper method to determine the correct base URL
  private getApiBaseUrl(): string {
    if (typeof window === 'undefined') {
      return this.baseUrl;
    } else {
      return '';
    }
  }

  // Seller Scorecard methods
  async getSellerScorecard(walletAddress: string): Promise<SellerScorecard | null> {
    try {
      const baseUrl = this.getApiBaseUrl();
      const endpoint = `${baseUrl}/api/seller-performance/scorecard/${walletAddress}`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch seller scorecard: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching seller scorecard:', error);
      return null;
    }
  }

  async calculateSellerScorecard(walletAddress: string): Promise<SellerScorecard> {
    try {
      const baseUrl = this.getApiBaseUrl();
      const endpoint = `${baseUrl}/api/seller-performance/scorecard/${walletAddress}/calculate`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to calculate seller scorecard: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to calculate seller scorecard');
      }

      return result.data;
    } catch (error) {
      console.error('Error calculating seller scorecard:', error);
      throw error;
    }
  }

  async getPerformanceAlerts(walletAddress: string, limit: number = 10): Promise<PerformanceAlert[]> {
    try {
      const baseUrl = this.getApiBaseUrl();
      const endpoint = `${baseUrl}/api/seller-performance/alerts/${walletAddress}?limit=${limit}`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch performance alerts: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Error fetching performance alerts:', error);
      return [];
    }
  }

  // Seller Risk Assessment methods
  async getSellerRiskAssessment(walletAddress: string): Promise<SellerRiskProfile | null> {
    try {
      const baseUrl = this.getApiBaseUrl();
      const endpoint = `${baseUrl}/api/seller-performance/risk/${walletAddress}`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch seller risk assessment: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching seller risk assessment:', error);
      return null;
    }
  }

  async assessSellerRisk(walletAddress: string): Promise<SellerRiskProfile> {
    try {
      const baseUrl = this.getApiBaseUrl();
      const endpoint = `${baseUrl}/api/seller-performance/risk/${walletAddress}/assess`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to assess seller risk: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to assess seller risk');
      }

      return result.data;
    } catch (error) {
      console.error('Error assessing seller risk:', error);
      throw error;
    }
  }

  async getSellerRiskTrend(walletAddress: string): Promise<{
    currentRisk: number;
    previousRisk: number;
    trend: 'improving' | 'stable' | 'deteriorating';
    changePercent: number;
  }> {
    try {
      const baseUrl = this.getApiBaseUrl();
      const endpoint = `${baseUrl}/api/seller-performance/risk/${walletAddress}/trend`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch seller risk trend: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : {
        currentRisk: 0,
        previousRisk: 0,
        trend: 'stable' as const,
        changePercent: 0
      };
    } catch (error) {
      console.error('Error fetching seller risk trend:', error);
      return {
        currentRisk: 0,
        previousRisk: 0,
        trend: 'stable' as const,
        changePercent: 0
      };
    }
  }

  // Marketplace Health methods
  async getMarketplaceHealthDashboard(): Promise<MarketplaceHealthDashboard | null> {
    try {
      const baseUrl = this.getApiBaseUrl();
      const endpoint = `${baseUrl}/api/seller-performance/marketplace/health`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch marketplace health dashboard: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching marketplace health dashboard:', error);
      return null;
    }
  }

  // Seller Growth Projection methods
  async getSellerGrowthProjections(walletAddress: string): Promise<SellerGrowthProjection | null> {
    try {
      const baseUrl = this.getApiBaseUrl();
      const endpoint = `${baseUrl}/api/seller-performance/projections/${walletAddress}`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch seller growth projections: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching seller growth projections:', error);
      return null;
    }
  }

  async generateSellerGrowthProjections(walletAddress: string): Promise<SellerGrowthProjection> {
    try {
      const baseUrl = this.getApiBaseUrl();
      const endpoint = `${baseUrl}/api/seller-performance/projections/${walletAddress}/generate`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to generate seller growth projections: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to generate seller growth projections');
      }

      return result.data;
    } catch (error) {
      console.error('Error generating seller growth projections:', error);
      throw error;
    }
  }

  // Combined dashboard method
  async getSellerPerformanceDashboard(walletAddress: string): Promise<SellerPerformanceDashboard | null> {
    try {
      const baseUrl = this.getApiBaseUrl();
      const endpoint = `${baseUrl}/api/seller-performance/dashboard/${walletAddress}`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch seller performance dashboard: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching seller performance dashboard:', error);
      return null;
    }
  }

  // Bulk operations
  async getBulkSellerPerformance(walletAddresses: string[]): Promise<{
    successful: Array<{
      walletAddress: string;
      scorecard: SellerScorecard | null;
      riskAssessment: SellerRiskProfile | null;
    }>;
    failed: Array<{
      walletAddress: string;
      error: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> {
    try {
      const baseUrl = this.getApiBaseUrl();
      const endpoint = `${baseUrl}/api/seller-performance/bulk/performance`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddresses }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bulk seller performance: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : {
        successful: [],
        failed: [],
        summary: { total: 0, successful: 0, failed: 0 }
      };
    } catch (error) {
      console.error('Error fetching bulk seller performance:', error);
      return {
        successful: [],
        failed: [],
        summary: { total: 0, successful: 0, failed: 0 }
      };
    }
  }

  async compareSellerPerformance(walletAddresses: string[]): Promise<{
    comparisons: Array<{
      walletAddress: string;
      overallScore: number;
      dimensions: SellerScorecard['dimensions'];
      performanceTier: string;
    }>;
    summary: {
      averageScore: number;
      topPerformer: string;
      bottomPerformer: string;
      scoreRange: number;
    };
  }> {
    try {
      const baseUrl = this.getApiBaseUrl();
      const endpoint = `${baseUrl}/api/seller-performance/compare`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddresses }),
      });

      if (!response.ok) {
        throw new Error(`Failed to compare seller performance: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data : {
        comparisons: [],
        summary: {
          averageScore: 0,
          topPerformer: '',
          bottomPerformer: '',
          scoreRange: 0
        }
      };
    } catch (error) {
      console.error('Error comparing seller performance:', error);
      return {
        comparisons: [],
        summary: {
          averageScore: 0,
          topPerformer: '',
          bottomPerformer: '',
          scoreRange: 0
        }
      };
    }
  }

  // Utility methods
  getPerformanceTierColor(tier: string): string {
    switch (tier) {
      case 'platinum': return '#E5E7EB';
      case 'gold': return '#FCD34D';
      case 'silver': return '#9CA3AF';
      case 'bronze': return '#CD7C2F';
      default: return '#6B7280';
    }
  }

  getRiskLevelColor(level: string): string {
    switch (level) {
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#EF4444';
      case 'critical': return '#DC2626';
      default: return '#6B7280';
    }
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'low': return '#10B981';
      case 'medium': return '#F59E0B';
      case 'high': return '#EF4444';
      case 'critical': return '#DC2626';
      default: return '#6B7280';
    }
  }

  formatScore(score: number): string {
    return Math.round(score * 10) / 10;
  }

  formatPercentage(value: number): string {
    return `${Math.round(value * 10) / 10}%`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  getTrendIcon(direction: 'up' | 'down' | 'stable'): string {
    switch (direction) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'stable': return '→';
      default: return '→';
    }
  }

  getTrendColor(direction: 'up' | 'down' | 'stable'): string {
    switch (direction) {
      case 'up': return '#10B981';
      case 'down': return '#EF4444';
      case 'stable': return '#6B7280';
      default: return '#6B7280';
    }
  }
}

export const sellerPerformanceService = new SellerPerformanceService();