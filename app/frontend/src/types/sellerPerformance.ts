export interface SellerScorecard {
  id: number;
  sellerWalletAddress: string;
  overallScore: number;
  dimensions: {
    customerSatisfaction: number;
    orderFulfillment: number;
    responseTime: number;
    disputeRate: number;
    growthRate: number;
  };
  performanceTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  trends: PerformanceTrend[];
  recommendations: string[];
  lastCalculatedAt: Date;
}

export interface PerformanceTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  period: string;
}

export interface SellerRiskProfile {
  id: number;
  sellerWalletAddress: string;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskDimensions: {
    financialRisk: number;
    operationalRisk: number;
    reputationRisk: number;
    complianceRisk: number;
  };
  riskFactors: RiskFactor[];
  mitigationRecommendations: string[];
  lastAssessedAt: Date;
}

export interface RiskFactor {
  category: string;
  factor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number;
  description: string;
}

export interface MarketplaceHealthDashboard {
  overallHealth: {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    trend: 'improving' | 'stable' | 'declining';
  };
  sellerMetrics: {
    totalSellers: number;
    activeSellers: number;
    newSellers: number;
    sellerDistribution: SellerDistribution;
    averageSellerScore: number;
    topPerformers: number;
  };
  marketTrends: {
    totalVolume: number;
    averageOrderValue: number;
    orderGrowthRate: number;
    categoryPerformance: CategoryPerformance[];
    seasonalTrends: SeasonalTrend[];
  };
  qualityMetrics: {
    averageRating: number;
    disputeRate: number;
    resolutionTime: number;
    customerSatisfaction: number;
  };
  recommendations: MarketplaceRecommendation[];
}

export interface SellerDistribution {
  byTier: { tier: string; count: number; percentage: number }[];
  byRegion: { region: string; count: number; percentage: number }[];
  concentration: {
    top10Percentage: number;
    herfindahlIndex: number;
    concentrationLevel: 'low' | 'medium' | 'high';
  };
}

export interface CategoryPerformance {
  category: string;
  volume: number;
  growth: number;
  averagePrice: number;
  sellerCount: number;
  competitiveness: number;
}

export interface SeasonalTrend {
  period: string;
  volume: number;
  orders: number;
  averageValue: number;
  growthRate: number;
}

export interface MarketplaceRecommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  actionItems: string[];
}

export interface SellerGrowthProjection {
  id: number;
  sellerWalletAddress: string;
  projections: {
    revenue: ProjectionData;
    orders: ProjectionData;
    customerBase: ProjectionData;
    marketShare: ProjectionData;
  };
  successFactors: SuccessFactor[];
  improvementRecommendations: ImprovementRecommendation[];
  confidenceLevel: number;
  modelVersion: string;
  createdAt: Date;
}

export interface ProjectionData {
  projectionType: string;
  currentValue: number;
  projectedValue: number;
  confidenceInterval: number;
  projectionPeriodMonths: number;
  growthRate: number;
  trajectory: 'exponential' | 'linear' | 'logarithmic' | 'declining';
  milestones: ProjectionMilestone[];
}

export interface ProjectionMilestone {
  month: number;
  projectedValue: number;
  probability: number;
  keyFactors: string[];
}

export interface SuccessFactor {
  factor: string;
  impact: number;
  category: 'performance' | 'market' | 'operational' | 'external';
  description: string;
  currentStatus: 'strong' | 'moderate' | 'weak';
}

export interface ImprovementRecommendation {
  area: string;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  expectedImpact: number;
  timeframe: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  resources: string[];
}

export interface PerformanceAlert {
  id: number;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  thresholdValue?: number;
  currentValue?: number;
  recommendations: string[];
  isAcknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  createdAt: Date;
}

export interface SellerPerformanceDashboard {
  scorecard: SellerScorecard | null;
  riskAssessment: SellerRiskProfile | null;
  growthProjections: SellerGrowthProjection | null;
  alerts: PerformanceAlert[];
  summary: {
    overallPerformance: number;
    riskLevel: string;
    projectedGrowth: number;
    activeAlerts: number;
  };
}