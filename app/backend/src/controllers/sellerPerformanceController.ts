import { Request, Response } from 'express';
import { sellerScorecardService } from '../services/sellerScorecardService';
import { sellerRiskAssessmentService } from '../services/sellerRiskAssessmentService';
import { marketplaceHealthService } from '../services/marketplaceHealthService';
import { sellerGrowthProjectionService } from '../services/sellerGrowthProjectionService';

export class SellerPerformanceController {

  // Seller Scorecard endpoints
  async getSellerScorecard(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
      }

      const scorecard = await sellerScorecardService.getSellerScorecard(walletAddress);
      
      if (!scorecard) {
        return res.status(404).json({
          success: false,
          message: 'Seller scorecard not found'
        });
      }

      res.json({
        success: true,
        data: scorecard
      });
    } catch (error) {
      console.error('Error getting seller scorecard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get seller scorecard'
      });
    }
  }

  async calculateSellerScorecard(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
      }

      const scorecard = await sellerScorecardService.calculateSellerScorecard(walletAddress);

      res.json({
        success: true,
        data: scorecard
      });
    } catch (error) {
      console.error('Error calculating seller scorecard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate seller scorecard'
      });
    }
  }

  async getSellerPerformanceAlerts(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
      }

      const alerts = await sellerScorecardService.getPerformanceAlerts(walletAddress, limit);

      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('Error getting performance alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get performance alerts'
      });
    }
  }

  // Seller Risk Assessment endpoints
  async getSellerRiskAssessment(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
      }

      const riskAssessment = await sellerRiskAssessmentService.getSellerRiskAssessment(walletAddress);
      
      if (!riskAssessment) {
        return res.status(404).json({
          success: false,
          message: 'Seller risk assessment not found'
        });
      }

      res.json({
        success: true,
        data: riskAssessment
      });
    } catch (error) {
      console.error('Error getting seller risk assessment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get seller risk assessment'
      });
    }
  }

  async assessSellerRisk(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
      }

      const riskAssessment = await sellerRiskAssessmentService.assessSellerRisk(walletAddress);

      res.json({
        success: true,
        data: riskAssessment
      });
    } catch (error) {
      console.error('Error assessing seller risk:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assess seller risk'
      });
    }
  }

  async getSellerRiskTrend(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
      }

      const riskTrend = await sellerRiskAssessmentService.getRiskTrendAnalysis(walletAddress);

      res.json({
        success: true,
        data: riskTrend
      });
    } catch (error) {
      console.error('Error getting seller risk trend:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get seller risk trend'
      });
    }
  }

  // Marketplace Health endpoints
  async getMarketplaceHealthDashboard(req: Request, res: Response) {
    try {
      const dashboard = await marketplaceHealthService.getMarketplaceHealthDashboard();

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('Error getting marketplace health dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get marketplace health dashboard'
      });
    }
  }

  async recordHealthMetric(req: Request, res: Response) {
    try {
      const { metricName, metricValue, category, metricUnit, metadata } = req.body;
      
      if (!metricName || metricValue === undefined || !category) {
        return res.status(400).json({
          success: false,
          message: 'Metric name, value, and category are required'
        });
      }

      await marketplaceHealthService.recordHealthMetric(
        metricName,
        metricValue,
        category,
        metricUnit,
        metadata
      );

      res.json({
        success: true,
        message: 'Health metric recorded successfully'
      });
    } catch (error) {
      console.error('Error recording health metric:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record health metric'
      });
    }
  }

  // Seller Growth Projection endpoints
  async getSellerGrowthProjections(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
      }

      const projections = await sellerGrowthProjectionService.getSellerGrowthProjections(walletAddress);
      
      if (!projections) {
        return res.status(404).json({
          success: false,
          message: 'Seller growth projections not found'
        });
      }

      res.json({
        success: true,
        data: projections
      });
    } catch (error) {
      console.error('Error getting seller growth projections:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get seller growth projections'
      });
    }
  }

  async generateSellerGrowthProjections(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
      }

      const projections = await sellerGrowthProjectionService.generateSellerGrowthProjections(walletAddress);

      res.json({
        success: true,
        data: projections
      });
    } catch (error) {
      console.error('Error generating seller growth projections:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate seller growth projections'
      });
    }
  }

  // Combined dashboard endpoint
  async getSellerPerformanceDashboard(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          message: 'Wallet address is required'
        });
      }

      // Get all performance data in parallel
      const [scorecard, riskAssessment, growthProjections, alerts] = await Promise.all([
        sellerScorecardService.getSellerScorecard(walletAddress),
        sellerRiskAssessmentService.getSellerRiskAssessment(walletAddress),
        sellerGrowthProjectionService.getSellerGrowthProjections(walletAddress),
        sellerScorecardService.getPerformanceAlerts(walletAddress, 5)
      ]);

      const dashboard = {
        scorecard,
        riskAssessment,
        growthProjections,
        alerts,
        summary: {
          overallPerformance: scorecard?.overallScore || 0,
          riskLevel: riskAssessment?.riskLevel || 'unknown',
          projectedGrowth: growthProjections?.projections.revenue.growthRate || 0,
          activeAlerts: alerts.filter(alert => !alert.isAcknowledged).length
        }
      };

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('Error getting seller performance dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get seller performance dashboard'
      });
    }
  }

  // Bulk operations for admin
  async getBulkSellerPerformance(req: Request, res: Response) {
    try {
      const { walletAddresses } = req.body;
      
      if (!Array.isArray(walletAddresses) || walletAddresses.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Array of wallet addresses is required'
        });
      }

      if (walletAddresses.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 50 wallet addresses allowed per request'
        });
      }

      const results = await Promise.allSettled(
        walletAddresses.map(async (walletAddress: string) => {
          const [scorecard, riskAssessment] = await Promise.all([
            sellerScorecardService.getSellerScorecard(walletAddress),
            sellerRiskAssessmentService.getSellerRiskAssessment(walletAddress)
          ]);

          return {
            walletAddress,
            scorecard,
            riskAssessment
          };
        })
      );

      const successfulResults = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);

      const failedResults = results
        .filter(result => result.status === 'rejected')
        .map((result, index) => ({
          walletAddress: walletAddresses[index],
          error: (result as PromiseRejectedResult).reason.message
        }));

      res.json({
        success: true,
        data: {
          successful: successfulResults,
          failed: failedResults,
          summary: {
            total: walletAddresses.length,
            successful: successfulResults.length,
            failed: failedResults.length
          }
        }
      });
    } catch (error) {
      console.error('Error getting bulk seller performance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get bulk seller performance'
      });
    }
  }

  // Performance comparison endpoint
  async compareSellerPerformance(req: Request, res: Response) {
    try {
      const { walletAddresses } = req.body;
      
      if (!Array.isArray(walletAddresses) || walletAddresses.length < 2 || walletAddresses.length > 10) {
        return res.status(400).json({
          success: false,
          message: 'Between 2 and 10 wallet addresses are required for comparison'
        });
      }

      const comparisons = await Promise.all(
        walletAddresses.map(async (walletAddress: string) => {
          const scorecard = await sellerScorecardService.getSellerScorecard(walletAddress);
          return {
            walletAddress,
            overallScore: scorecard?.overallScore || 0,
            dimensions: scorecard?.dimensions || {
              customerSatisfaction: 0,
              orderFulfillment: 0,
              responseTime: 0,
              disputeRate: 0,
              growthRate: 0
            },
            performanceTier: scorecard?.performanceTier || 'bronze'
          };
        })
      );

      // Calculate comparison metrics
      const averageScore = comparisons.reduce((sum, comp) => sum + comp.overallScore, 0) / comparisons.length;
      const topPerformer = comparisons.reduce((top, current) => 
        current.overallScore > top.overallScore ? current : top
      );
      const bottomPerformer = comparisons.reduce((bottom, current) => 
        current.overallScore < bottom.overallScore ? current : bottom
      );

      res.json({
        success: true,
        data: {
          comparisons,
          summary: {
            averageScore: Math.round(averageScore * 100) / 100,
            topPerformer: topPerformer.walletAddress,
            bottomPerformer: bottomPerformer.walletAddress,
            scoreRange: topPerformer.overallScore - bottomPerformer.overallScore
          }
        }
      });
    } catch (error) {
      console.error('Error comparing seller performance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to compare seller performance'
      });
    }
  }
}

export const sellerPerformanceController = new SellerPerformanceController();