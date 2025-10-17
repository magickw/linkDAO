import { Request, Response } from "express";
import { databaseService } from "../services/databaseService";
import { eq, desc } from "drizzle-orm";
import { marketplaceUsers, sellerVerifications } from "../db/marketplaceSchema";

export class SellerController {
  // Get seller applications
  async getSellerApplications(req: Request, res: Response) {
    try {
      const { status, businessType, submittedAfter, page = 1, limit = 10 } = req.query;
      
      const db = databaseService.getDatabase();
      
      // Get marketplace users with seller role
      const sellers = await db.select({
        id: marketplaceUsers.userId,
        legalName: marketplaceUsers.legalName,
        email: marketplaceUsers.email,
        country: marketplaceUsers.country,
        kycVerified: marketplaceUsers.kycVerified,
        createdAt: marketplaceUsers.createdAt,
        currentTier: sellerVerifications.currentTier,
        reputationScore: sellerVerifications.reputationScore,
        totalVolume: sellerVerifications.totalVolume
      })
      .from(marketplaceUsers)
      .leftJoin(sellerVerifications, eq(marketplaceUsers.userId, sellerVerifications.userId))
      .where(eq(marketplaceUsers.role, 'seller'))
      .orderBy(desc(marketplaceUsers.createdAt))
      .limit(parseInt(limit as string))
      .offset((parseInt(page as string) - 1) * parseInt(limit as string));
      
      // Get total count
      const totalCountResult = await db.select({ count: marketplaceUsers.userId })
        .from(marketplaceUsers)
        .where(eq(marketplaceUsers.role, 'seller'));
      const totalCount = totalCountResult.length > 0 ? totalCountResult[0].count : 0;
      
      res.json({
        applications: sellers,
        total: totalCount,
        page: parseInt(page as string),
        totalPages: Math.ceil(totalCount / parseInt(limit as string))
      });
    } catch (error) {
      console.error("Error fetching seller applications:", error);
      res.status(500).json({ error: "Failed to fetch seller applications" });
    }
  }

  // Get specific seller application
  async getSellerApplication(req: Request, res: Response) {
    try {
      const { applicationId } = req.params;
      
      const db = databaseService.getDatabase();
      
      // Get marketplace user with seller verification details
      const sellers = await db.select({
        id: marketplaceUsers.userId,
        legalName: marketplaceUsers.legalName,
        email: marketplaceUsers.email,
        country: marketplaceUsers.country,
        shippingAddress: marketplaceUsers.shippingAddress,
        billingAddress: marketplaceUsers.billingAddress,
        kycVerified: marketplaceUsers.kycVerified,
        kycVerificationDate: marketplaceUsers.kycVerificationDate,
        kycProvider: marketplaceUsers.kycProvider,
        createdAt: marketplaceUsers.createdAt,
        currentTier: sellerVerifications.currentTier,
        reputationScore: sellerVerifications.reputationScore,
        totalVolume: sellerVerifications.totalVolume,
        successfulTransactions: sellerVerifications.successfulTransactions,
        disputeRate: sellerVerifications.disputeRate
      })
      .from(marketplaceUsers)
      .leftJoin(sellerVerifications, eq(marketplaceUsers.userId, sellerVerifications.userId))
      .where(eq(marketplaceUsers.userId, applicationId));
      
      if (sellers.length === 0) {
        return res.status(404).json({ error: "Seller application not found" });
      }
      
      res.json(sellers[0]);
    } catch (error) {
      console.error("Error fetching seller application:", error);
      res.status(500).json({ error: "Failed to fetch seller application" });
    }
  }

  // Review seller application
  async reviewSellerApplication(req: Request, res: Response) {
    try {
      const { applicationId } = req.params;
      const { status, notes, rejectionReason, requiredInfo } = req.body;

      const db = databaseService.getDatabase();

      // Update seller verification tier based on review
      let newTier = 'standard';
      if (status === 'approved') {
        newTier = 'verified';
      } else if (status === 'rejected') {
        newTier = 'unverified';
      }

      const [updatedVerification] = await db.update(sellerVerifications)
        .set({
          currentTier: newTier,
          updatedAt: new Date()
        })
        .where(eq(sellerVerifications.userId, applicationId))
        .returning();

      if (!updatedVerification) {
        // If no verification record exists, create one
        const [newVerification] = await db.insert(sellerVerifications)
          .values({
            userId: applicationId,
            currentTier: newTier,
            kycVerified: false,
            reputationScore: 0,
            totalVolume: '0',
            successfulTransactions: 0,
            disputeRate: '0',
            lastTierUpdate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        if (!newVerification) {
          return res.status(404).json({ error: "Seller application not found" });
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error reviewing seller application:", error);
      res.status(500).json({ error: "Failed to review seller application" });
    }
  }

  // Get seller risk assessment
  async getSellerRiskAssessment(req: Request, res: Response) {
    try {
      const { applicationId } = req.params;

      const db = databaseService.getDatabase();

      // Get seller verification data
      const [seller] = await db.select({
        reputationScore: sellerVerifications.reputationScore,
        totalVolume: sellerVerifications.totalVolume,
        successfulTransactions: sellerVerifications.successfulTransactions,
        disputeRate: sellerVerifications.disputeRate,
        kycVerified: marketplaceUsers.kycVerified,
        createdAt: marketplaceUsers.createdAt
      })
      .from(sellerVerifications)
      .leftJoin(marketplaceUsers, eq(sellerVerifications.userId, marketplaceUsers.userId))
      .where(eq(sellerVerifications.userId, applicationId));

      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }

      // Calculate risk assessment scores
      const accountAge = Math.floor((Date.now() - new Date(seller.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const volumeFloat = parseFloat(seller.totalVolume || '0');
      const disputeRateFloat = parseFloat(seller.disputeRate || '0');

      const factors = {
        account_age: Math.min(100, (accountAge / 365) * 100),
        kyc_verification: seller.kycVerified ? 100 : 0,
        transaction_history: Math.min(100, (seller.successfulTransactions / 10) * 100),
        dispute_rate: Math.max(0, 100 - (disputeRateFloat * 20)),
        volume_score: Math.min(100, (volumeFloat / 10000) * 100)
      };

      const overallScore = Math.round(
        (factors.account_age * 0.2 +
         factors.kyc_verification * 0.3 +
         factors.transaction_history * 0.2 +
         factors.dispute_rate * 0.2 +
         factors.volume_score * 0.1)
      );

      const notes = [];
      if (!seller.kycVerified) notes.push("KYC verification not completed");
      if (disputeRateFloat > 5) notes.push("High dispute rate detected");
      if (seller.successfulTransactions < 5) notes.push("Limited transaction history");
      if (accountAge < 30) notes.push("New account - less than 30 days old");

      res.json({
        assessment: {
          overallScore,
          factors,
          notes
        }
      });
    } catch (error) {
      console.error("Error fetching risk assessment:", error);
      res.status(500).json({ error: "Failed to fetch risk assessment" });
    }
  }

  // Get seller performance
  async getSellerPerformance(req: Request, res: Response) {
    try {
      const {
        status,
        minRating,
        search,
        sortBy = 'revenue',
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      const db = databaseService.getDatabase();

      // Get verified sellers with performance metrics
      const sellers = await db.select({
        id: marketplaceUsers.userId,
        sellerHandle: marketplaceUsers.legalName,
        businessName: marketplaceUsers.legalName,
        currentTier: sellerVerifications.currentTier,
        reputationScore: sellerVerifications.reputationScore,
        totalVolume: sellerVerifications.totalVolume,
        successfulTransactions: sellerVerifications.successfulTransactions,
        disputeRate: sellerVerifications.disputeRate,
        createdAt: marketplaceUsers.createdAt,
        updatedAt: sellerVerifications.updatedAt
      })
      .from(marketplaceUsers)
      .leftJoin(sellerVerifications, eq(marketplaceUsers.userId, sellerVerifications.userId))
      .where(eq(marketplaceUsers.role, 'seller'))
      .orderBy(desc(sellerVerifications.totalVolume))
      .limit(parseInt(limit as string))
      .offset((parseInt(page as string) - 1) * parseInt(limit as string));

      // Calculate performance status for each seller
      const sellersWithPerformance = sellers.map(seller => {
        const volumeFloat = parseFloat(seller.totalVolume || '0');
        const disputeRateFloat = parseFloat(seller.disputeRate || '0');
        const reputationScore = seller.reputationScore || 0;

        // Determine performance status
        let performanceStatus = 'good';
        if (reputationScore >= 90 && disputeRateFloat < 2) {
          performanceStatus = 'excellent';
        } else if (reputationScore < 50 || disputeRateFloat > 10) {
          performanceStatus = 'critical';
        } else if (reputationScore < 70 || disputeRateFloat > 5) {
          performanceStatus = 'warning';
        }

        // Calculate mock trends (in production, compare with previous period)
        const salesGrowth = Math.random() * 40 - 10; // -10% to +30%
        const revenueGrowth = Math.random() * 40 - 10;
        const ratingTrend = Math.random() * 2 - 0.5; // -0.5 to +1.5

        return {
          id: seller.id,
          sellerId: seller.id,
          sellerHandle: seller.sellerHandle || 'Unknown',
          businessName: seller.businessName || 'Unknown Business',
          metrics: {
            totalSales: seller.successfulTransactions || 0,
            totalRevenue: volumeFloat,
            averageOrderValue: volumeFloat / Math.max(seller.successfulTransactions || 1, 1),
            totalOrders: seller.successfulTransactions || 0,
            completedOrders: seller.successfulTransactions || 0,
            cancelledOrders: 0,
            averageRating: reputationScore / 20, // Convert 0-100 to 0-5
            totalReviews: Math.floor(seller.successfulTransactions * 0.7) || 0,
            disputeRate: disputeRateFloat,
            responseTime: 2 + Math.random() * 6, // 2-8 hours
            fulfillmentRate: Math.min(100, 85 + Math.random() * 15)
          },
          trends: {
            salesGrowth,
            revenueGrowth,
            ratingTrend
          },
          status: performanceStatus,
          lastUpdated: seller.updatedAt || seller.createdAt
        };
      });

      // Get total count
      const totalCountResult = await db.select({ count: marketplaceUsers.userId })
        .from(marketplaceUsers)
        .where(eq(marketplaceUsers.role, 'seller'));
      const totalCount = totalCountResult.length || 0;

      res.json({
        sellers: sellersWithPerformance,
        total: totalCount,
        page: parseInt(page as string),
        totalPages: Math.ceil(totalCount / parseInt(limit as string))
      });
    } catch (error) {
      console.error("Error fetching seller performance:", error);
      res.status(500).json({ error: "Failed to fetch seller performance" });
    }
  }

  // Export seller performance
  async exportSellerPerformance(req: Request, res: Response) {
    try {
      // In production, this would generate a CSV/Excel file
      // For now, return success with a mock download URL
      res.json({
        success: true,
        downloadUrl: `/downloads/seller-performance-${Date.now()}.csv`
      });
    } catch (error) {
      console.error("Error exporting seller performance:", error);
      res.status(500).json({ error: "Failed to export seller performance" });
    }
  }
}

export const sellerController = new SellerController();