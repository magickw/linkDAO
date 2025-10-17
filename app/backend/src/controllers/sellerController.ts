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
}

export const sellerController = new SellerController();