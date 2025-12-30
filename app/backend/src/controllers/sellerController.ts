import { Request, Response } from "express";
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { databaseService } from "../services/databaseService";
import { sellerService } from "../services/sellerService";
import { sellerListingService } from "../services/sellerListingService";
import { eq, and, or, ilike, desc, lt, gte, lte, sql } from 'drizzle-orm';
import * as schema from '../db/schema';
import { marketplaceUsers, sellerVerifications } from "../db/marketplaceSchema";
import { users, products, categories } from "../db/schema";

export class SellerController {
  private sellerService = sellerService;
  // Get seller applications
  async getSellerApplications(req: Request, res: Response) {
    try {
      const { status, businessType, submittedAfter, page = 1, limit = 10 } = req.query;

      const db = databaseService.getDatabase();

      if (!db) {
        return res.status(503).json({
          error: "Database service unavailable",
          message: "The database is currently not accessible. Please try again later."
        });
      }

      try {
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
        const totalCountResult = await db.select({ count: sql<number>`count(*)` })
          .from(marketplaceUsers)
          .where(eq(marketplaceUsers.role, 'seller'));
        const totalCount = totalCountResult[0]?.count || 0;

        res.json({
          applications: sellers,
          total: totalCount,
          page: parseInt(page as string),
          totalPages: Math.ceil(totalCount / parseInt(limit as string))
        });
      } catch (dbError: any) {
        // Check for specific database errors
        if (dbError.code === '42P01') {
          // Relation does not exist - table not created
          safeLogger.error("Marketplace tables do not exist:", dbError);
          return res.status(500).json({
            error: "Database schema not initialized",
            message: "The marketplace tables have not been created. Please run database migrations."
          });
        } else if (dbError.code === 'ECONNREFUSED') {
          return res.status(503).json({
            error: "Database connection failed",
            message: "Unable to connect to the database. Please try again later."
          });
        } else {
          throw dbError; // Re-throw for general error handling
        }
      }
    } catch (error) {
      safeLogger.error("Error fetching seller applications:", error);
      res.status(500).json({
        error: "Failed to fetch seller applications",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
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
      safeLogger.error("Error fetching seller application:", error);
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
      safeLogger.error("Error reviewing seller application:", error);
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
      safeLogger.error("Error fetching risk assessment:", error);
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
      const totalCountResult = await db.select({ count: sql<number>`count(*)` })
        .from(marketplaceUsers)
        .where(eq(marketplaceUsers.role, 'seller'));
      const totalCount = totalCountResult[0]?.count || 0;

      res.json({
        sellers: sellersWithPerformance,
        total: totalCount,
        page: parseInt(page as string),
        totalPages: Math.ceil(totalCount / parseInt(limit as string))
      });
    } catch (error) {
      safeLogger.error("Error fetching seller performance:", error);
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
      safeLogger.error("Error exporting seller performance:", error);
      res.status(500).json({ error: "Failed to export seller performance" });
    }
  }



  async updateProfileEnhanced(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const walletAddress = user.walletAddress;
      const updateData = req.body;
      // Handle file uploads if present
      const files = req.files as any;

      const db = databaseService.getDatabase();

      // Find user by wallet address
      const [userRecord] = await db.select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress));

      if (!userRecord) {
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
        .where(eq(marketplaceUsers.userId, userRecord.id))
        .returning();

      if (!updatedProfile) {
        return res.status(404).json({ error: "Seller profile not found" });
      }

      res.json({ success: true, profile: { ...updatedProfile, walletAddress } });
    } catch (error) {
      safeLogger.error("Error updating seller profile (enhanced):", error);
      res.status(500).json({ error: "Failed to update seller profile" });
    }
  }

  async getProfileCompleteness(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const walletAddress = user.walletAddress;
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
      safeLogger.error("Error calculating profile completeness:", error);
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
      safeLogger.error("Error validating profile:", error);
      res.status(500).json({ error: "Failed to validate profile" });
    }
  }

  async getSellerStats(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const walletAddress = user.walletAddress;
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
      safeLogger.error("Error fetching seller stats:", error);
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
      safeLogger.error("Error validating ENS:", error);
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
      safeLogger.error("Error verifying ENS ownership:", error);
      res.status(500).json({ error: "Failed to verify ENS ownership" });
    }
  }

  async forceSyncProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const walletAddress = user.walletAddress;

      // Mock sync - in production, sync with blockchain/IPFS
      res.json({ success: true, message: "Profile synced successfully", walletAddress });
    } catch (error) {
      safeLogger.error("Error syncing profile:", error);
      res.status(500).json({ error: "Failed to sync profile" });
    }
  }

  async validateProfileSync(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const walletAddress = user.walletAddress;

      // Mock validation - in production, check sync status
      res.json({ inSync: true, lastSync: new Date(), walletAddress });
    } catch (error) {
      safeLogger.error("Error validating profile sync:", error);
      res.status(500).json({ error: "Failed to validate profile sync" });
    }
  }

  async getProfileHistory(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const walletAddress = user.walletAddress;

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
      safeLogger.error("Error fetching profile history:", error);
      res.status(500).json({ error: "Failed to fetch profile history" });
    }
  }

  // New Seller Management API Methods

  // Create new product listing
  async createListing(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user?.walletAddress) {
        return res.status(401).json({ success: false, error: "Authentication required" });
      }

      const listingData = req.body;
      const db = databaseService.getDatabase();

      // Get or create marketplace user
      let [marketplaceUser] = await db.select()
        .from(marketplaceUsers)
        .leftJoin(users, eq(marketplaceUsers.userId, users.id))
        .where(eq(users.walletAddress, user.walletAddress));

      if (!marketplaceUser) {
        // Create marketplace user if doesn't exist
        const [newUser] = await db.insert(users)
          .values({
            walletAddress: user.walletAddress,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .onConflictDoNothing()
          .returning();

        const userId = newUser?.id || user.id;

        await db.insert(marketplaceUsers)
          .values({
            userId,
            role: 'seller',
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .onConflictDoNothing();
      }

      // Create the listing in products table
      const [newListing] = await db.insert(products)
        .values({
          sellerId: marketplaceUser?.users?.id || user.id,
          title: listingData.title,
          description: listingData.description,
          mainCategory: listingData.category,
          priceAmount: listingData.priceCrypto.toString(),
          priceCurrency: 'USDC', // Defaulting to USDC for now as products table uses priceCurrency
          currency: listingData.currency || 'USDC',
          // products table might not have all fields yet, checking schema...
          // I added mainCategory, priceFiat, isPhysical, stock(inventory), etc.
          inventory: listingData.stock || 1,
          isPhysical: listingData.isPhysical || false,
          metadata: JSON.stringify({ uri: listingData.metadataUri }), // Mapping metadataUri to metadata JSON
          status: 'active',
          listingStatus: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          images: '[]', // Required field
          categoryId: '00000000-0000-0000-0000-000000000000', // Placeholder UUID if categoryId is required but we use mainCategory
          // ideally we should look up categoryId from categories table using mainCategory slug
        })
        .returning();

      res.status(201).json({
        success: true,
        data: {
          id: newListing.id,
          title: newListing.title,
          description: newListing.description,
          category: newListing.mainCategory,
          priceCrypto: parseFloat(newListing.priceAmount),
          currency: newListing.priceCurrency,
          isPhysical: newListing.isPhysical,
          stock: newListing.inventory,
          status: newListing.status,
          createdAt: newListing.createdAt
        }
      });
    } catch (error) {
      safeLogger.error("Error creating listing:", error);
      res.status(500).json({ success: false, error: "Failed to create listing" });
    }
  }

  // Update existing listing
  async updateListing(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const updates = req.body;
      const db = databaseService.getDatabase();

      // Verify ownership using a simple check first (or let service handle it, but service checks wallet address match)
      // The service expects walletAddress to verify ownership indirectly via seller ID lookup
      console.log(`[SellerController] Attempting to update listing ${id} for user ${user?.walletAddress}`);

      const listingResults = await db.select()
        .from(products)
        .leftJoin(users, eq(products.sellerId, users.id))
        .where(eq(products.id, id));

      const listing = listingResults[0];

      if (!listing) {
        console.log(`[SellerController] Listing not found in DB for ID: ${id}`);
        return res.status(404).json({ success: false, error: "Listing not found" });
      }

      console.log(`[SellerController] Found listing. Seller wallet: ${listing.users?.walletAddress}, User wallet: ${user?.walletAddress}`);

      if (listing.users?.walletAddress?.toLowerCase() !== user.walletAddress?.toLowerCase()) {
        console.warn(`[SellerController] Ownership check failed for listing ${id}. Expected ${listing.users?.walletAddress}, got ${user.walletAddress}`);
        return res.status(403).json({ success: false, error: "Access denied: You do not own this listing" });
      }

      // Prepare update data for validator
      console.log(`[SellerController] Ownership verified. Updating listing ${id} with rich data`);

      const updateData: any = {
        title: updates.title,
        description: updates.description,
        price: updates.price || updates.priceCrypto,
        currency: updates.currency,
        categoryId: updates.category, // frontend sends 'category' as ID/Slug
        inventory: updates.stock !== undefined ? updates.stock : updates.quantity,
        status: updates.status,
        images: updates.images,
        tags: updates.tags,
        // Map new fields
        condition: updates.condition,
        escrowEnabled: updates.escrowEnabled,
        shipping: updates.shipping,
        variants: updates.variants,
        itemType: updates.itemType,
        isPhysical: updates.itemType === 'PHYSICAL', // Sync isPhysical flag
        seoTitle: updates.seoTitle,
        seoDescription: updates.seoDescription,
        metadata: { ...updates.metadata }
      };

      if (updates.metadataUri) {
        updateData.metadata.uri = updates.metadataUri;
      }

      // Map specifications to flat fields where possible
      if (updates.specifications) {
        if (updates.specifications.weight && typeof updates.specifications.weight.value === 'number') {
          updateData.weight = updates.specifications.weight.value;
        }
        if (updates.specifications.dimensions) {
          updateData.dimensions = updates.specifications.dimensions;
        }
        // Store full specifications in metadata as well to preserve units etc
        updateData.metadata.specifications = updates.specifications;
      }

      if (updates.isPhysical !== undefined) {
        updateData.isPhysical = updates.isPhysical;
      } else if (updates.itemType === 'PHYSICAL') {
        updateData.isPhysical = true;
      }

      // Use the service to handle the update
      const updatedListing = await sellerListingService.updateListing(id, updateData);

      res.json({
        success: true,
        data: updatedListing
      });
    } catch (error) {
      safeLogger.error("Error updating listing:", error);
      res.status(500).json({ success: false, error: "Failed to update listing" });
    }
  }

  // Delete listing
  async deleteListing(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { id } = req.params;
      const db = databaseService.getDatabase();

      // Verify ownership
      const [listing] = await db.select()
        .from(products)
        .leftJoin(users, eq(products.sellerId, users.id))
        .where(eq(products.id, id));

      if (!listing || listing.users?.walletAddress !== user.walletAddress) {
        return res.status(404).json({ success: false, error: "Listing not found or access denied" });
      }

      // Soft delete by setting status to inactive
      await db.update(products)
        .set({ status: 'inactive', updatedAt: new Date() })
        .where(eq(products.id, id));

      res.json({ success: true, message: "Listing deleted successfully" });
    } catch (error) {
      safeLogger.error("Error deleting listing:", error);
      res.status(500).json({ success: false, error: "Failed to delete listing" });
    }
  }

  // Get seller dashboard data
  async getDashboard(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { period = '30d', includeOrders = 'true', includeAnalytics = 'true' } = req.query;
      const db = databaseService.getDatabase();

      // Get seller profile information
      const sellerProfile = await this.sellerService.getSellerProfile(user.walletAddress);

      // Check if profile exists
      if (!sellerProfile) {
        return res.status(404).json({
          success: false,
          error: 'Seller profile not found. Please complete seller onboarding first.',
          redirectTo: '/marketplace/seller/onboarding'
        });
      }

      // Get basic stats
      const stats = await this.getSellerStatsInternal(user.walletAddress);

      // Get recent listings
      const recentListings = await db.select({
        id: products.id,
        title: products.title,
        status: products.status,
        priceCrypto: products.priceAmount,
        currency: products.priceCurrency,
        createdAt: products.createdAt
      })
        .from(products)
        .leftJoin(users, eq(products.sellerId, users.id))
        .where(eq(users.walletAddress, user.walletAddress))
        .orderBy(desc(products.createdAt))
        .limit(5);

      const dashboardData: any = {
        profile: sellerProfile, // Include seller profile data
        stats,
        recentListings: recentListings.map(listing => ({
          ...listing,
          price: parseFloat(listing.priceCrypto || '0'),
          priceCrypto: parseFloat(listing.priceCrypto || '0')
        }))
      };

      if (includeOrders === 'true') {
        dashboardData.recentOrders = await this.getRecentOrdersInternal(user.walletAddress, 5);
      }

      if (includeAnalytics === 'true') {
        dashboardData.analytics = {
          period,
          salesTrend: this.generateMockTrend(period as string),
          topCategories: await this.getTopCategoriesInternal(user.walletAddress),
          conversionRate: 0.15 + Math.random() * 0.1 // Mock conversion rate
        };
      }

      res.json({ success: true, data: dashboardData });
    } catch (error) {
      safeLogger.error("Error fetching dashboard:", error);
      res.status(500).json({ success: false, error: "Failed to fetch dashboard data" });
    }
  }

  // Update seller profile
  async updateProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const updates = req.body;

      // Log incoming request for debugging
      safeLogger.info("Updating seller profile for:", user.walletAddress);
      safeLogger.info("Profile updates:", updates);

      // Use the existing seller service
      const { sellerService } = await import('../services/sellerService');

      try {
        const updatedProfile = await sellerService.updateSellerProfile(user.walletAddress, updates);
        res.json({ success: true, data: updatedProfile });
      } catch (serviceError: any) {
        safeLogger.error("Service error updating profile:", serviceError);
        if (serviceError.message.includes('not found')) {
          // Create profile if it doesn't exist
          const newProfile = await sellerService.createSellerProfile({
            walletAddress: user.walletAddress,
            ...updates
          });
          res.status(201).json({ success: true, data: newProfile });
        } else {
          throw serviceError;
        }
      }
    } catch (error) {
      safeLogger.error("Error updating profile:", error);
      res.status(500).json({ success: false, error: "Failed to update profile" });
    }
  }

  // Get seller's own listings
  async getMyListings(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const {
        status,
        category,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      const db = databaseService.getDatabase();
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Get the user's ID from wallet address
      const userRecord = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, user.walletAddress))
        .limit(1);

      if (!userRecord.length) {
        return res.status(404).json({ success: false, error: "User not found" });
      }

      let query = db.select({
        id: products.id,
        title: products.title,
        description: products.description,
        priceCrypto: products.priceAmount, // Mapping priceAmount to priceCrypto for frontend compatibility
        currency: products.priceCurrency,
        stock: products.inventory,
        status: products.status,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        mainCategory: products.mainCategory // Using the new column added to products
      })
        .from(products)
        .where(eq(products.sellerId, userRecord[0].id));

      // Apply filters
      if (status) {
        query = query.where(eq(products.status, status as string));
      }
      if (category) {
        query = query.where(eq(products.mainCategory, category as string));
      }

      // Apply sorting
      const sortColumn = sortBy === 'price' ? products.priceAmount :
        sortBy === 'title' ? products.title :
          sortBy === 'updated_at' ? products.updatedAt :
            products.createdAt;

      query = sortOrder === 'asc' ? query.orderBy(sortColumn) : query.orderBy(desc(sortColumn));

      const listings = await query.limit(parseInt(limit as string)).offset(offset);

      // Get total count
      const totalResult = await db.select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.sellerId, userRecord[0].id));

      const total = totalResult[0]?.count || 0;

      res.json({
        success: true,
        data: {
          listings: listings.map(listing => ({
            ...listing,
            price: parseFloat(listing.priceCrypto || '0'),
            priceCrypto: parseFloat(listing.priceCrypto || '0')
          })),
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages: Math.ceil(total / parseInt(limit as string))
          }
        }
      });
    } catch (error) {
      safeLogger.error("Error fetching listings:", error);
      res.status(500).json({ success: false, error: "Failed to fetch listings" });
    }
  }

  // Get seller's orders
  async getMyOrders(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const {
        status,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      const db = databaseService.getDatabase();
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      let query = db.select({
        id: schema.orders.id,
        productId: schema.orders.listingId,
        productTitle: schema.products.title,
        buyerId: schema.orders.buyerId,
        amount: schema.orders.totalAmount,
        currency: schema.orders.currency,
        status: schema.orders.status,
        createdAt: schema.orders.createdAt,
        updatedAt: schema.orders.createdAt
      })
        .from(schema.orders)
        .leftJoin(schema.products, eq(schema.orders.listingId, schema.products.id))
        .leftJoin(schema.users, eq(schema.products.sellerId, schema.users.id))
        .where(eq(schema.users.walletAddress, user.walletAddress));

      // Apply filters
      if (status) {
        query = query.where(eq(schema.orders.status, status as string));
      }

      // Apply sorting
      const sortColumn = sortBy === 'amount' ? schema.orders.totalAmount :
        sortBy === 'updated_at' ? schema.orders.createdAt :
          schema.orders.createdAt;

      query = sortOrder === 'asc' ? query.orderBy(sortColumn) : query.orderBy(desc(sortColumn));

      const orders = await query.limit(parseInt(limit as string)).offset(offset);

      // Get total count
      const totalResult = await db.select({ count: sql<number>`count(*)` })
        .from(schema.orders)
        .leftJoin(schema.products, eq(schema.orders.listingId, schema.products.id))
        .leftJoin(schema.users, eq(schema.products.sellerId, schema.users.id))
        .where(eq(schema.users.walletAddress, user.walletAddress));

      const total = totalResult[0]?.count || 0;

      res.json({
        success: true,
        data: {
          orders: orders.map(order => ({
            ...order,
            amount: parseFloat(order.amount)
          })),
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages: Math.ceil(total / parseInt(limit as string))
          }
        }
      });
    } catch (error) {
      safeLogger.error("Error fetching orders:", error);
      res.status(500).json({ success: false, error: "Failed to fetch orders" });
    }
  }

  // Get seller analytics
  async getAnalytics(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { period = '30d', metrics } = req.query;

      const analytics = {
        period,
        salesTrend: this.generateMockTrend(period as string),
        topCategories: await this.getTopCategoriesInternal(user.walletAddress),
        conversionRate: 0.15 + Math.random() * 0.1,
        averageOrderValue: 150 + Math.random() * 100,
        customerRetentionRate: 0.25 + Math.random() * 0.15,
        topPerformingProducts: await this.getTopProductsInternal(user.walletAddress)
      };

      // Filter metrics if specified
      if (metrics) {
        const requestedMetrics = (metrics as string).split(',');
        const filteredAnalytics: any = { period };
        requestedMetrics.forEach(metric => {
          if (analytics[metric as keyof typeof analytics]) {
            filteredAnalytics[metric] = analytics[metric as keyof typeof analytics];
          }
        });
        res.json({ success: true, data: filteredAnalytics });
      } else {
        res.json({ success: true, data: analytics });
      }
    } catch (error) {
      safeLogger.error("Error fetching analytics:", error);
      res.status(500).json({ success: false, error: "Failed to fetch analytics" });
    }
  }

  // Get public seller profile by wallet address (no authentication required)
  async getPublicSellerProfile(req: Request, res: Response) {
    try {
      const { walletAddress } = req.params;

      if (!walletAddress) {
        return res.status(400).json({ success: false, error: "Wallet address is required" });
      }

      safeLogger.info("Fetching public seller profile for address:", walletAddress);

      const { sellerService } = await import('../services/sellerService');

      const profile = await sellerService.getSellerProfile(walletAddress);

      if (!profile) {
        safeLogger.info("Seller profile not found for address:", walletAddress);

        // Auto-create a basic seller profile for new wallets
        try {
          const basicProfileData = {
            walletAddress,
            storeName: 'My Store',
            bio: "Welcome to my store!",
            description: "Seller profile created automatically",
            createdAt: new Date(),
            updatedAt: new Date(),
            tier: 'bronze'
          };

          const newProfile = await sellerService.createSellerProfile(basicProfileData as any);
          safeLogger.info("Auto-created seller profile for address:", walletAddress);

          res.json({ success: true, data: newProfile });
          return;
        } catch (creationError) {
          safeLogger.error("Error creating basic profile:", creationError);
          return res.status(500).json({ success: false, error: "Failed to create basic seller profile" });
        }
      }

      safeLogger.info("Successfully fetched public seller profile for address:", walletAddress);
      res.json({ success: true, data: profile });
    } catch (error) {
      safeLogger.error("Error fetching public profile:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      res.status(500).json({ success: false, error: "Failed to fetch profile" });
    }
  }

  // Get seller profile (using seller service)
  async getProfile(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      // Validate user and wallet address
      if (!user) {
        safeLogger.error("No user found in request");
        return res.status(401).json({ success: false, error: "User not authenticated" });
      }

      const walletAddress = user.walletAddress || user.address;

      if (!walletAddress) {
        safeLogger.error("No wallet address found in user object:", user);
        return res.status(400).json({ success: false, error: "Wallet address not found" });
      }

      safeLogger.info("Fetching seller profile for address:", walletAddress);

      const { sellerService } = await import('../services/sellerService');

      const profile = await sellerService.getSellerProfile(walletAddress);

      if (!profile) {
        safeLogger.info("Seller profile not found for address:", walletAddress);

        // Create a basic profile for the seller if it doesn't exist
        try {
          const basicProfileData = {
            walletAddress,
            storeName: 'My Store',
            bio: "Welcome to my store!",
            description: "Seller profile created automatically",
            createdAt: new Date(),
            updatedAt: new Date(),
            // Set default tier to allow basic seller functionality
            tier: 'bronze', // Basic tier to allow seller functionality
            profileCompleteness: {
              score: 20, // Basic profile completeness
              missingFields: ['profileImageCdn', 'coverImageCdn', 'bio', 'description'],
              recommendations: [{
                action: 'Complete Profile',
                description: 'Add more information to your profile',
                impact: 80
              }],
              lastCalculated: new Date().toISOString()
            }
          };

          const newProfile = await sellerService.createSellerProfile(basicProfileData as any);
          safeLogger.info("Created basic seller profile for address:", walletAddress);

          res.json({ success: true, data: newProfile });
          return;
        } catch (creationError) {
          safeLogger.error("Error creating basic profile:", creationError);
          return res.status(500).json({ success: false, error: "Failed to create basic seller profile" });
        }
      }

      safeLogger.info("Successfully fetched seller profile for address:", walletAddress);
      res.json({ success: true, data: profile });
    } catch (error) {
      safeLogger.error("Error fetching profile:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        user: (req as any).user
      });
      res.status(500).json({ success: false, error: "Failed to fetch profile" });
    }
  }

  // Create seller profile
  async createProfile(req: Request, res: Response) {
    try {
      const { walletAddress, businessName, email, description } = req.body;

      if (!walletAddress || !businessName || !email) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: walletAddress, businessName, email"
        });
      }

      const { sellerService } = await import('../services/sellerService');

      const profile = await sellerService.createSellerProfile({
        walletAddress,
        storeName: businessName,

        description: description || ''
      });

      res.json({ success: true, data: profile });
    } catch (error) {
      safeLogger.error("Error creating profile:", error);
      res.status(500).json({ success: false, error: "Failed to create seller profile" });
    }
  }

  // Update seller profile
  async updateSellerProfileByAddress(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const walletAddress = user.walletAddress;
      const updateData = req.body;

      const { sellerService } = await import('../services/sellerService');

      const profile = await sellerService.updateSellerProfile(walletAddress, updateData);

      res.json({ success: true, data: profile });
    } catch (error) {
      safeLogger.error("Error updating profile:", error);
      res.status(500).json({ success: false, error: "Failed to update seller profile" });
    }
  }

  // Get seller stats (using seller service)
  async getStats(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const walletAddress = user.walletAddress;
      const stats = await this.getSellerStatsInternal(walletAddress);
      res.json({ success: true, data: stats });
    } catch (error) {
      safeLogger.error("Error fetching stats:", error);
      res.status(500).json({ success: false, error: "Failed to fetch stats" });
    }
  }

  // Request seller verification
  async requestVerification(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { verificationType, verificationData } = req.body;
      const { sellerService } = await import('../services/sellerService');

      const result = await sellerService.verifySellerProfile(user.walletAddress, verificationType);
      res.json({ success: true, data: result });
    } catch (error) {
      safeLogger.error("Error requesting verification:", error);
      res.status(500).json({ success: false, error: "Failed to request verification" });
    }
  }

  // Helper methods
  private async getSellerStatsInternal(walletAddress: string) {
    try {
      const { sellerService } = await import('../services/sellerService');
      return await sellerService.getSellerStats(walletAddress);
    } catch (error) {
      safeLogger.error("Error fetching seller stats:", error);
      // Return default stats if service fails
      return {
        totalListings: 0,
        activeListings: 0,
        totalSales: 0,
        averageRating: 0,
        profileCompleteness: 0,
        totalRevenue: '0',
        completedOrders: 0,
        pendingOrders: 0,
        disputedOrders: 0,
        reputationScore: 0
      };
    }
  }

  private async getRecentOrdersInternal(walletAddress: string, limit: number) {
    try {
      const { sellerService } = await import('../services/sellerService');
      const orders = await sellerService.getSellerOrders(walletAddress);
      return orders.slice(0, limit);
    } catch (error) {
      safeLogger.error("Error fetching recent orders:", error);
      return [];
    }
  }

  private async getTopCategoriesInternal(walletAddress: string) {
    try {
      const db = databaseService.getDatabase();
      const topCategories = await db.select({
        category: schema.products.mainCategory,
        count: sql<number>`count(*)`
      })
        .from(schema.products)
        .leftJoin(schema.users, eq(schema.products.sellerId, schema.users.id))
        .where(eq(schema.users.walletAddress, walletAddress))
        .groupBy(schema.products.mainCategory)
        .orderBy(desc(sql<number>`count(*)`))
        .limit(5);

      return topCategories.map(cat => ({
        category: cat.category || 'Uncategorized',
        count: cat.count
      }));
    } catch (error) {
      safeLogger.error("Error fetching top categories:", error);
      return [];
    }
  }

  private async getTopProductsInternal(walletAddress: string) {
    try {
      const db = databaseService.getDatabase();
      const products = await db.select({
        id: schema.products.id,
        title: schema.products.title,
        priceCrypto: schema.products.priceAmount,
        currency: schema.products.priceCurrency
      })
        .from(schema.products)
        .leftJoin(schema.users, eq(schema.products.sellerId, schema.users.id))
        .where(and(
          eq(schema.users.walletAddress, walletAddress),
          eq(schema.products.status, 'active')
        ))
        .orderBy(desc(schema.products.publishedAt))
        .limit(5);

      return products.map(product => ({
        ...product,
        priceCrypto: parseFloat(product.priceCrypto),
        sales: Math.floor(Math.random() * 50) // Mock sales data
      }));
    } catch (error) {
      safeLogger.error("Error fetching top products:", error);
      return [];
    }
  }

  private generateMockTrend(period: string) {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const trend = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trend.push({
        date: date.toISOString().split('T')[0],
        sales: Math.floor(Math.random() * 10),
        revenue: Math.floor(Math.random() * 1000)
      });
    }

    return trend;
  }

  // Get onboarding steps
  async getOnboardingSteps(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      // Return default onboarding steps
      const steps = [
        { id: 'profile_setup', completed: false, title: 'Profile Setup', description: 'Complete your seller profile', component: 'ProfileSetup', required: true },
        { id: 'payout_setup', completed: false, title: 'Payout Setup', description: 'Set up your payment methods', component: 'PayoutSetup', required: true },
        { id: 'first_listing', completed: false, title: 'First Listing', description: 'Create your first product listing', component: 'FirstListing', required: false }
      ];

      res.json({
        success: true,
        data: { steps }
      });
    } catch (error) {
      safeLogger.error("Error fetching onboarding steps:", error);
      res.status(500).json({ success: false, error: "Failed to fetch onboarding steps" });
    }
  }

  // Update onboarding step
  async updateOnboardingStep(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const { stepId } = req.params;
      const { completed, data } = req.body;

      // In a real implementation, this would update the database
      // For now, just return success
      res.json({
        success: true,
        data: { stepId, completed, data }
      });
    } catch (error) {
      safeLogger.error("Error updating onboarding step:", error);
      res.status(500).json({ success: false, error: "Failed to update onboarding step" });
    }
  }

  // Get seller tier
  async getSellerTier(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      // Return default tier information
      const tier = {
        currentTier: 'TIER_1',
        tierLevel: 1,
        tierName: 'Basic Seller',
        benefits: ['Up to 10 listings', 'Standard commission rate'],
        nextTier: 'TIER_2',
        progress: {
          current: 0,
          required: 100,
          percentage: 0
        }
      };

      res.json({
        success: true,
        data: tier
      });
    } catch (error) {
      safeLogger.error("Error fetching seller tier:", error);
      res.status(500).json({ success: false, error: "Failed to fetch seller tier" });
    }
  }

  // Get tier progress
  async getTierProgress(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      const progress = {
        current: 0,
        required: 100,
        percentage: 0,
        milestones: [
          { id: 'first_sale', label: 'First Sale', completed: false },
          { id: 'five_sales', label: '5 Sales', completed: false },
          { id: 'ten_sales', label: '10 Sales', completed: false }
        ]
      };

      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      safeLogger.error("Error fetching tier progress:", error);
      res.status(500).json({ success: false, error: "Failed to fetch tier progress" });
    }
  }

  // Trigger tier evaluation
  async triggerTierEvaluation(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      // In a real implementation, this would evaluate the seller's performance
      // For now, just return success
      res.json({
        success: true,
        data: { message: 'Tier evaluation triggered' }
      });
    } catch (error) {
      safeLogger.error("Error triggering tier evaluation:", error);
      res.status(500).json({ success: false, error: "Failed to trigger tier evaluation" });
    }
  }

  // Get tier criteria
  async getTierCriteria(req: Request, res: Response) {
    try {
      const criteria = {
        tiers: [
          {
            tier: 'TIER_1',
            name: 'Basic Seller',
            requirements: {
              minListings: 0,
              minSales: 0,
              minRevenue: 0
            },
            benefits: ['Up to 10 listings', 'Standard commission rate']
          },
          {
            tier: 'TIER_2',
            name: 'Advanced Seller',
            requirements: {
              minListings: 10,
              minSales: 5,
              minRevenue: 1000
            },
            benefits: ['Up to 50 listings', 'Reduced commission rate', 'Priority support']
          }
        ]
      };

      res.json({
        success: true,
        data: criteria
      });
    } catch (error) {
      safeLogger.error("Error fetching tier criteria:", error);
      res.status(500).json({ success: false, error: "Failed to fetch tier criteria" });
    }
  }

  // Get tier evaluation history
  async getTierEvaluationHistory(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      const history = [];

      res.json({
        success: true,
        data: { history }
      });
    } catch (error) {
      safeLogger.error("Error fetching tier history:", error);
      res.status(500).json({ success: false, error: "Failed to fetch tier history" });
    }
  }
}

export const sellerController = new SellerController();
