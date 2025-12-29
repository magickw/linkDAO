import { DatabaseService } from "./databaseService";
import * as schema from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { safeLogger } from "../utils/safeLogger";

export class VerificationService {
  private dbService: DatabaseService;

  constructor() {
    this.dbService = new DatabaseService();
  }

  // --- Verification Requests ---

  async submitVerificationRequest(
    userId: string,
    entityType: "individual" | "organization",
    data: {
      category?: string;
      description?: string;
      website?: string;
      socialProof?: any;
    }
  ) {
    const db = this.dbService.getDatabase();

    // Check if there is already a pending request
    const existing = await db
      .select()
      .from(schema.verificationRequests)
      .where(
        and(
          eq(schema.verificationRequests.userId, userId),
          eq(schema.verificationRequests.entityType, entityType),
          eq(schema.verificationRequests.status, "pending")
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error("You already have a pending verification request.");
    }

    try {
      const result = await db
        .insert(schema.verificationRequests)
        .values({
          userId: userId,
          entityType: entityType,
          status: "pending",
          category: data.category,
          description: data.description,
          website: data.website,
          socialProof: data.socialProof,
        })
        .returning();

      // Log history
      await this.logHistory(userId, entityType, userId, "applied", null, "pending", "User submitted application");

      return result[0];
    } catch (error) {
      safeLogger.error("Error submitting verification request:", error);
      throw error;
    }
  }

  async getMyRequests(userId: string) {
    const db = this.dbService.getDatabase();
    return await db
      .select()
      .from(schema.verificationRequests)
      .where(eq(schema.verificationRequests.userId, userId))
      .orderBy(desc(schema.verificationRequests.createdAt));
  }

  // --- Admin Review ---

  async getAllPendingRequests(limit = 50, offset = 0) {
    const db = this.dbService.getDatabase();
    return await db
      .select({
        request: schema.verificationRequests,
        user: {
          id: schema.users.id,
          handle: schema.users.handle,
          displayName: schema.users.displayName,
          avatarCid: schema.users.avatarCid,
          email: schema.users.email,
        }
      })
      .from(schema.verificationRequests)
      .leftJoin(schema.users, eq(schema.verificationRequests.userId, schema.users.id))
      .where(eq(schema.verificationRequests.status, "pending"))
      .orderBy(desc(schema.verificationRequests.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async reviewRequest(
    requestId: string,
    reviewerId: string,
    status: "approved" | "rejected" | "more_info_needed",
    notes?: string,
    rejectionReason?: string
  ) {
    const db = this.dbService.getDatabase();

    // Get the request first
    const request = await db
      .select()
      .from(schema.verificationRequests)
      .where(eq(schema.verificationRequests.id, requestId))
      .limit(1);

    if (request.length === 0) {
      throw new Error("Request not found");
    }
    const currentRequest = request[0];

    try {
      // Update request status
      await db
        .update(schema.verificationRequests)
        .set({
          status: status,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          adminNotes: notes,
          rejectionReason: rejectionReason,
          updatedAt: new Date()
        })
        .where(eq(schema.verificationRequests.id, requestId));

      // Handle Approval
      if (status === "approved") {
        if (currentRequest.entityType === "individual") {
          await this.approveUserVerification(currentRequest.userId, "manual_review");
        } else if (currentRequest.entityType === "organization") {
          // TODO: Implement Org Verification Logic
          // await this.approveOrgVerification(currentRequest.entityId, ...);
        }
      }

      // Log history
      await this.logHistory(
        currentRequest.entityId || currentRequest.userId,
        currentRequest.entityType,
        reviewerId,
        status,
        "pending",
        status,
        notes || rejectionReason
      );

      return { success: true };
    } catch (error) {
      safeLogger.error("Error reviewing verification request:", error);
      throw error;
    }
  }

  // --- Status Management ---

  private async approveUserVerification(userId: string, method: string) {
    const db = this.dbService.getDatabase();

    await db.transaction(async (tx) => {
      // 1. Create/Update user_verification entry
      await tx
        .insert(schema.userVerification)
        .values({
          userId: userId,
          status: "verified",
          badgeType: "blue_check", // Default for now
          verifiedAt: new Date(),
          verificationMethod: method,
        })
        .onConflictDoUpdate({
          target: schema.userVerification.userId,
          set: {
            status: "verified",
            verifiedAt: new Date(),
            updatedAt: new Date()
          }
        });

      // 2. Update users table for fast lookup
      await tx
        .update(schema.users)
        .set({ isVerified: true })
        .where(eq(schema.users.id, userId));
    });
  }

  async revokeVerification(entityId: string, entityType: "user" | "org", adminId: string, reason: string) {
    const db = this.dbService.getDatabase();

    if (entityType === "user") {
      await db.transaction(async (tx) => {
        await tx
          .update(schema.userVerification)
          .set({ status: "revoked", updatedAt: new Date() })
          .where(eq(schema.userVerification.userId, entityId));

        await tx
          .update(schema.users)
          .set({ isVerified: false })
          .where(eq(schema.users.id, entityId));
      });
    }

    await this.logHistory(entityId, entityType, adminId, "revoked", "verified", "revoked", reason);
  }

  // --- Helpers ---

  private async logHistory(
    entityId: string,
    entityType: string,
    actorId: string,
    action: string,
    prevStatus: string | null,
    newStatus: string | null,
    reason?: string | null
  ) {
    try {
      const db = this.dbService.getDatabase();
      await db.insert(schema.verificationHistory).values({
        entityId: entityId,
        entityType: entityType,
        action: action,
        actorId: actorId,
        prevStatus: prevStatus,
        newStatus: newStatus,
        reason: reason
      });
    } catch (e) {
      safeLogger.error("Failed to log verification history", e);
      // Don't fail the main operation just because logging failed
    }
  }
}
