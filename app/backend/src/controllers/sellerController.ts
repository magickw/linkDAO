import { Request, Response } from "express";
import { databaseService } from "../services/databaseService";
import { eq, desc } from "drizzle-orm";
import { marketplaceUsers, sellerVerifications } from "../db/marketplaceSchema";
import { users } from "../db/schema";

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

  // Marketplace seller profile methods
  async getProfile(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      const db = databaseService.getDatabase();

      const [seller] = await db.select()
        .from(marketplaceUsers)
        .leftJoin(users, eq(marketplaceUsers.userId, users.id))
        .where(eq(users.walletAddress, walletAddress));

      if (!seller) {
        return res.status(404).json({ error: "Seller profile not found" });
      }

      res.json({ ...seller.marketplace_users, ...seller.users });
    } catch (error) {
      console.error("Error fetching seller profile:", error);
      res.status(500).json({ error: "Failed to fetch seller profile" });
    }
  }

  async createProfile(req: Request, res: Response) {
    try {
      const profileData = req.body;
      const db = databaseService.getDatabase();

      // First, find or create the user by wallet address
      let [user] = await db.select()
        .from(users)
        .where(eq(users.walletAddress, profileData.walletAddress));

      if (!user) {
        // Create user if doesn't exist
        [user] = await db.insert(users)
          .values({
            walletAddress: profileData.walletAddress,
            handle: profileData.handle || null,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
      }

      // Create marketplace user profile
      const [newProfile] = await db.insert(marketplaceUsers)
        .values({
          userId: user.id,
          role: 'seller',
          legalName: profileData.legalName,
          email: profileData.email,
          country: profileData.country,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      res.json({ success: true, profile: { ...newProfile, walletAddress: user.walletAddress } });
    } catch (error) {
      console.error("Error creating seller profile:", error);
      res.status(500).json({ error: "Failed to create seller profile" });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      const updateData = req.body;
      const db = databaseService.getDatabase();

      // Find user by wallet address
      const [user] = await db.select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress));

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const [updatedProfile] = await db.update(marketplaceUsers)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(marketplaceUsers.userId, user.id))
        .returning();

      if (!updatedProfile) {
        return res.status(404).json({ error: "Seller profile not found" });
      }

      res.json({ success: true, profile: { ...updatedProfile, walletAddress } });
    } catch (error) {
      console.error("Error updating seller profile:", error);
      res.status(500).json({ error: "Failed to update seller profile" });
    }
  }

  async updateProfileEnhanced(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      const updateData = req.body;
      // Handle file uploads if present
      const files = req.files as any;

      const db = databaseService.getDatabase();

      // Find user by wallet address
      const [user] = await db.select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress));

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const profileUpdate: any = { ...updateData, updatedAt: new Date() };

      if (files?.profileImage) {
        // In production, upload to IPFS or S3 and get URL
        profileUpdate.profileImageUrl = `/uploads/profile-${Date.now()}.jpg`;
      }

      if (files?.coverImage) {
        profileUpdate.coverImageUrl = `/uploads/cover-${Date.now()}.jpg`;
      }

      const [updatedProfile] = await db.update(marketplaceUsers)
        .set(profileUpdate)
        .where(eq(marketplaceUsers.userId, user.id))
        .returning();

      if (!updatedProfile) {
        return res.status(404).json({ error: "Seller profile not found" });
      }

      res.json({ success: true, profile: { ...updatedProfile, walletAddress } });
    } catch (error) {
      console.error("Error updating seller profile (enhanced):", error);
      res.status(500).json({ error: "Failed to update seller profile" });
    }
  }

  async getProfileCompleteness(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      const db = databaseService.getDatabase();

      const [result] = await db.select()
        .from(marketplaceUsers)
        .leftJoin(users, eq(marketplaceUsers.userId, users.id))
        .where(eq(users.walletAddress, walletAddress));

      if (!result) {
        return res.status(404).json({ error: "Seller profile not found" });
      }

      const seller = result.marketplace_users;

      // Calculate profile completeness
      const fields = ['legalName', 'email', 'country', 'shippingAddress', 'billingAddress'];
      const completedFields = fields.filter(field => seller[field as keyof typeof seller]);
      const completeness = (completedFields.length / fields.length) * 100;

      res.json({
        completeness,
        missingFields: fields.filter(field => !seller[field as keyof typeof seller])
      });
    } catch (error) {
      console.error("Error calculating profile completeness:", error);
      res.status(500).json({ error: "Failed to calculate profile completeness" });
    }
  }

  async validateProfile(req: Request, res: Response) {
    try {
      const profileData = req.body;

      // Basic validation
      const errors = [];
      if (!profileData.walletAddress) errors.push("Wallet address is required");
      if (!profileData.legalName) errors.push("Legal name is required");
      if (!profileData.email) errors.push("Email is required");

      if (errors.length > 0) {
        return res.status(400).json({ valid: false, errors });
      }

      res.json({ valid: true, errors: [] });
    } catch (error) {
      console.error("Error validating profile:", error);
      res.status(500).json({ error: "Failed to validate profile" });
    }
  }

  async getSellerStats(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;
      const db = databaseService.getDatabase();

      const [verification] = await db.select()
        .from(sellerVerifications)
        .leftJoin(marketplaceUsers, eq(sellerVerifications.userId, marketplaceUsers.userId))
        .leftJoin(users, eq(marketplaceUsers.userId, users.id))
        .where(eq(users.walletAddress, walletAddress));

      if (!verification) {
        return res.json({
          totalSales: 0,
          totalRevenue: 0,
          averageRating: 0,
          totalReviews: 0
        });
      }

      res.json({
        totalSales: verification.seller_verifications.successfulTransactions || 0,
        totalRevenue: parseFloat(verification.seller_verifications.totalVolume || '0'),
        averageRating: (verification.seller_verifications.reputationScore || 0) / 20,
        totalReviews: Math.floor((verification.seller_verifications.successfulTransactions || 0) * 0.7)
      });
    } catch (error) {
      console.error("Error fetching seller stats:", error);
      res.status(500).json({ error: "Failed to fetch seller stats" });
    }
  }

  async validateENS(req: Request, res: Response) {
    try {
      const { ensName } = req.body;

      // Mock ENS validation - in production, validate against ENS
      const isValid = ensName && ensName.endsWith('.eth');

      res.json({ valid: isValid, ensName });
    } catch (error) {
      console.error("Error validating ENS:", error);
      res.status(500).json({ error: "Failed to validate ENS" });
    }
  }

  async verifyENSOwnership(req: Request, res: Response) {
    try {
      const { ensName, walletAddress } = req.body;

      // Mock ownership verification - in production, verify on-chain
      const isOwner = ensName && walletAddress;

      res.json({ verified: isOwner, ensName, walletAddress });
    } catch (error) {
      console.error("Error verifying ENS ownership:", error);
      res.status(500).json({ error: "Failed to verify ENS ownership" });
    }
  }

  async forceSyncProfile(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;

      // Mock sync - in production, sync with blockchain/IPFS
      res.json({ success: true, message: "Profile synced successfully", walletAddress });
    } catch (error) {
      console.error("Error syncing profile:", error);
      res.status(500).json({ error: "Failed to sync profile" });
    }
  }

  async validateProfileSync(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;

      // Mock validation - in production, check sync status
      res.json({ inSync: true, lastSync: new Date(), walletAddress });
    } catch (error) {
      console.error("Error validating profile sync:", error);
      res.status(500).json({ error: "Failed to validate profile sync" });
    }
  }

  async getProfileHistory(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;

      // Mock history - in production, fetch from audit log
      res.json({
        history: [
          {
            timestamp: new Date(),
            action: 'profile_updated',
            field: 'legalName',
            oldValue: 'Old Name',
            newValue: 'New Name'
          }
        ],
        walletAddress
      });
    } catch (error) {
      console.error("Error fetching profile history:", error);
      res.status(500).json({ error: "Failed to fetch profile history" });
    }
  }
}

export const sellerController = new SellerController();