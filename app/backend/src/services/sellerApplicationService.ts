import { eq } from 'drizzle-orm';
import { db } from '../db';
import { sellers, users } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
import { notificationService } from './notificationService';

interface ReviewApplicationRequest {
  status: 'approved' | 'rejected' | 'under_review';
  rejectionReason?: string;
  adminNotes?: string;
  reviewedByUserId?: string;
}

export class SellerApplicationService {
  /**
   * Submit application for review (when seller completes onboarding)
   */
  async submitApplicationForReview(sellerId: number): Promise<void> {
    try {
      await db.update(sellers)
        .set({
          applicationStatus: 'pending',
          applicationSubmittedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(sellers.id, sellerId));

      safeLogger.info(`Application submitted for review: seller ${sellerId}`);
    } catch (error) {
      safeLogger.error('Error submitting application for review:', error);
      throw error;
    }
  }

  /**
   * Review seller application (admin only)
   */
  async reviewApplication(
    sellerId: number,
    request: ReviewApplicationRequest
  ): Promise<typeof sellers.$inferSelect | null> {
    try {
      // Validate seller exists and get seller info
      const [seller] = await db.select({
        id: sellers.id,
        walletAddress: sellers.walletAddress,
        storeName: sellers.storeName
      })
        .from(sellers)
        .where(eq(sellers.id, sellerId));

      if (!seller) {
        safeLogger.warn(`Seller not found for application review: ${sellerId}`);
        return null;
      }

      // Get seller's user email if available
      const [userRecord] = await db.select({
        email: users.email,
        walletAddress: users.walletAddress
      })
        .from(users)
        .where(eq(users.walletAddress, seller.walletAddress));

      // Update application status
      const updateData: any = {
        applicationStatus: request.status,
        applicationReviewedAt: new Date(),
        updatedAt: new Date()
      };

      // If reviewed by admin, record it
      if (request.reviewedByUserId) {
        updateData.applicationReviewedBy = request.reviewedByUserId;
      }

      // If rejecting, store reason and notes
      if (request.status === 'rejected') {
        if (!request.rejectionReason) {
          throw new Error('Rejection reason is required when rejecting application');
        }
        updateData.applicationRejectionReason = request.rejectionReason;
      }

      // Always save admin notes if provided
      if (request.adminNotes) {
        updateData.applicationAdminNotes = request.adminNotes;
      }

      const [updated] = await db.update(sellers)
        .set(updateData)
        .where(eq(sellers.id, sellerId))
        .returning();

      safeLogger.info(`Application review completed for seller ${sellerId}: status=${request.status}`);

      // Send notifications based on decision
      const sellerEmail = userRecord?.email || 'support@linkdao.io';
      const sellerName = seller.storeName || 'Seller';

      if (request.status === 'approved') {
        await notificationService.notifyApproval(sellerId, sellerEmail, sellerName);
      } else if (request.status === 'rejected') {
        await notificationService.notifyRejection(
          sellerId,
          sellerEmail,
          sellerName,
          request.rejectionReason || 'Application did not meet requirements',
          request.adminNotes
        );
      }

      return updated;
    } catch (error) {
      safeLogger.error('Error reviewing application:', error);
      throw error;
    }
  }

  /**
   * Get application review status for a seller
   */
  async getApplicationStatus(sellerId: number): Promise<{
    status: string;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    rejectionReason: string | null;
    notes: string | null;
  } | null> {
    try {
      const [seller] = await db.select({
        status: sellers.applicationStatus,
        submittedAt: sellers.applicationSubmittedAt,
        reviewedAt: sellers.applicationReviewedAt,
        rejectionReason: sellers.applicationRejectionReason,
        notes: sellers.applicationAdminNotes
      })
        .from(sellers)
        .where(eq(sellers.id, sellerId));

      return seller || null;
    } catch (error) {
      safeLogger.error('Error fetching application status:', error);
      throw error;
    }
  }

  /**
   * Update onboarding steps completion status
   * This syncs frontend step progress to database
   */
  async updateOnboardingStep(
    sellerId: number,
    stepId: string,
    completed: boolean
  ): Promise<void> {
    try {
      const [seller] = await db.select()
        .from(sellers)
        .where(eq(sellers.id, sellerId));

      if (!seller) {
        throw new Error(`Seller not found: ${sellerId}`);
      }

      // Get current steps
      const currentSteps = (seller.onboardingSteps as Record<string, boolean>) || {
        profile_setup: false,
        verification: false,
        payout_setup: false,
        first_listing: false
      };

      // Validate stepId
      if (!currentSteps.hasOwnProperty(stepId)) {
        throw new Error(`Invalid step ID: ${stepId}`);
      }

      // Update the specific step
      const updatedSteps = {
        ...currentSteps,
        [stepId]: completed
      };

      // Check if all required steps are complete
      const allRequiredStepsComplete =
        updatedSteps.profile_setup &&
        updatedSteps.verification &&
        updatedSteps.payout_setup;

      await db.update(sellers)
        .set({
          onboardingSteps: updatedSteps,
          onboardingCompleted: allRequiredStepsComplete,
          updatedAt: new Date()
        })
        .where(eq(sellers.id, sellerId));

      safeLogger.info(`Updated onboarding step for seller ${sellerId}: ${stepId}=${completed}`, {
        steps: updatedSteps,
        allComplete: allRequiredStepsComplete
      });
    } catch (error) {
      safeLogger.error('Error updating onboarding step:', error);
      throw error;
    }
  }

  /**
   * Get current onboarding progress for a seller
   */
  async getOnboardingProgress(sellerId: number): Promise<{
    steps: Record<string, boolean>;
    allRequiredComplete: boolean;
    completionPercentage: number;
  } | null> {
    try {
      const [seller] = await db.select({
        steps: sellers.onboardingSteps,
        completed: sellers.onboardingCompleted
      })
        .from(sellers)
        .where(eq(sellers.id, sellerId));

      if (!seller) {
        return null;
      }

      const steps = (seller.steps as Record<string, boolean>) || {
        profile_setup: false,
        verification: false,
        payout_setup: false,
        first_listing: false
      };

      const completedCount = Object.values(steps).filter(v => v === true).length;
      const totalSteps = Object.keys(steps).length;

      return {
        steps,
        allRequiredComplete: steps.profile_setup && steps.verification && steps.payout_setup,
        completionPercentage: Math.round((completedCount / totalSteps) * 100)
      };
    } catch (error) {
      safeLogger.error('Error fetching onboarding progress:', error);
      throw error;
    }
  }

  /**
   * Get all pending applications (admin view)
   */
  async getPendingApplications(limit = 20, offset = 0): Promise<Array<typeof sellers.$inferSelect>> {
    try {
      const applications = await db.select()
        .from(sellers)
        .where(eq(sellers.applicationStatus, 'pending'))
        .orderBy(sellers.applicationSubmittedAt)
        .limit(limit)
        .offset(offset);

      return applications;
    } catch (error) {
      safeLogger.error('Error fetching pending applications:', error);
      throw error;
    }
  }

  /**
   * Get rejected applications for re-submission tracking
   */
  async getRejectedApplications(sellerId: number): Promise<{
    status: string;
    rejectionReason: string | null;
    rejectedAt: Date | null;
  } | null> {
    try {
      const [application] = await db.select({
        status: sellers.applicationStatus,
        rejectionReason: sellers.applicationRejectionReason,
        rejectedAt: sellers.applicationReviewedAt
      })
        .from(sellers)
        .where(eq(sellers.id, sellerId));

      return application || null;
    } catch (error) {
      safeLogger.error('Error fetching rejected application:', error);
      throw error;
    }
  }
}

export const sellerApplicationService = new SellerApplicationService();
