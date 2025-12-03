import { Request, Response } from "express";
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { databaseService } from "../services/databaseService";
import { eq, desc, and, sql } from "drizzle-orm";
import { moderationCases } from "../db/schema";

export class ModerationController {
  // Get moderation queue
  async getModerationQueue(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, type, status } = req.query;

      // Check database connection first
      if (!databaseService.isDatabaseConnected()) {
        safeLogger.warn("Database not connected in moderation controller");
        return res.status(503).json({
          error: "Database service unavailable",
          message: "The database is currently not accessible. Please try again later."
        });
      }

      const db = databaseService.getDatabase();

      try {
        // Build query with filters
        let query = db.select()
          .from(moderationCases);

        // Apply filters if provided
        const conditions = [];
        if (type && type !== '') {
          conditions.push(eq(moderationCases.contentType, type as string));
        }
        if (status && status !== '') {
          conditions.push(eq(moderationCases.status, status as string));
        }

        // Apply conditions
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        // Get moderation cases
        const cases = await query
          .orderBy(desc(moderationCases.createdAt))
          .limit(parseInt(limit as string))
          .offset((parseInt(page as string) - 1) * parseInt(limit as string));

        // Get total count
        let countQuery = db.select({ count: sql<number>`count(*)` }).from(moderationCases);
        if (conditions.length > 0) {
          countQuery = countQuery.where(and(...conditions));
        }
        const totalCountResult = await countQuery;
        const totalCount = totalCountResult.length > 0 ? Number(totalCountResult[0].count) : 0;

        res.json({
          items: cases,
          total: totalCount,
          page: parseInt(page as string),
          totalPages: Math.ceil(totalCount / parseInt(limit as string))
        });
      } catch (dbError: any) {
        // Check for specific database errors
        if (dbError.code === '42P01') {
          // Relation does not exist - table not created
          safeLogger.error("Moderation cases table does not exist:", dbError);
          return res.status(500).json({
            error: "Database schema not initialized",
            message: "The moderation_cases table has not been created. Please run database migrations."
          });
        } else if (dbError.code === '42703') {
          // Column does not exist - schema mismatch
          safeLogger.error("Moderation cases table schema mismatch:", dbError);
          return res.status(500).json({
            error: "Database schema mismatch",
            message: "The moderation_cases table schema is outdated. Please run database migrations to update the schema."
          });
        } else if (dbError.code === 'ECONNREFUSED') {
          return res.status(503).json({
            error: "Database connection failed",
            message: "Unable to connect to the database. Please try again later."
          });
        } else {
          safeLogger.error("Database error in moderation queue:", dbError);
          throw dbError; // Re-throw for general error handling
        }
      }
    } catch (error) {
      safeLogger.error("Error fetching moderation queue:", error);
      res.status(500).json({
        error: "Failed to fetch moderation queue",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  }

  // Get moderation history
  async getModerationHistory(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, type } = req.query;

      const db = databaseService.getDatabase();

      // Build conditions array
      const conditions = [eq(moderationCases.status, 'resolved')];
      if (type && type !== '') {
        conditions.push(eq(moderationCases.contentType, type as string));
      }

      // Build query with all conditions at once
      let query = db.select()
        .from(moderationCases)
        .where(and(...conditions));

      // Get history cases
      const cases = await query
        .orderBy(desc(moderationCases.updatedAt))
        .limit(parseInt(limit as string))
        .offset((parseInt(page as string) - 1) * parseInt(limit as string));

      // Get total count
      let countQuery = db.select({ count: sql<number>`count(*)` })
        .from(moderationCases)
        .where(and(...conditions));

      const totalCountResult = await countQuery;
      const totalCount = totalCountResult.length > 0 ? Number(totalCountResult[0].count) : 0;

      res.json({
        items: cases,
        total: totalCount,
        page: parseInt(page as string),
        totalPages: Math.ceil(totalCount / parseInt(limit as string))
      });
    } catch (error: any) {
      // Check for specific database errors
      if (error.code === '42P01') {
        safeLogger.error("Moderation cases table does not exist:", error);
        return res.status(500).json({
          error: "Database schema not initialized",
          message: "The moderation_cases table has not been created. Please run database migrations."
        });
      } else if (error.code === '42703') {
        safeLogger.error("Moderation cases table schema mismatch:", error);
        return res.status(500).json({
          error: "Database schema mismatch",
          message: "The moderation_cases table schema is outdated. Please run database migrations to update the schema."
        });
      }
      safeLogger.error("Error fetching moderation history:", error);
      res.status(500).json({
        error: "Failed to fetch moderation history",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  }

  // Assign moderation item
  async assignModerationItem(req: Request, res: Response) {
    try {
      const { itemId } = req.params;
      const { assigneeId } = req.body;

      const db = databaseService.getDatabase();
      
      // Build update object
      const updateData: any = {
        status: 'in_review',
        updatedAt: new Date()
      };
      
      // Include assignedModeratorId if provided
      if (assigneeId) {
        updateData.assignedModeratorId = assigneeId;
      }
      
      const [updatedCase] = await db.update(moderationCases)
        .set(updateData)
        .where(eq(moderationCases.id, parseInt(itemId)))
        .returning();

      if (!updatedCase) {
        return res.status(404).json({ error: "Moderation item not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      // Handle column doesn't exist error gracefully
      if (error.code === '42703' || (error.message && error.message.includes('assigned_moderator_id'))) {
        safeLogger.warn("assignedModeratorId column does not exist, updating without it");
        try {
          const db = databaseService.getDatabase();
          const [updatedCase] = await db.update(moderationCases)
            .set({
              status: 'in_review',
              updatedAt: new Date()
            })
            .where(eq(moderationCases.id, parseInt(req.params.itemId)))
            .returning();
          
          if (!updatedCase) {
            return res.status(404).json({ error: "Moderation item not found" });
          }
          return res.json({ success: true });
        } catch (retryError) {
          safeLogger.error("Error assigning moderation item (retry):", retryError);
          return res.status(500).json({ error: "Failed to assign moderation item" });
        }
      }
      safeLogger.error("Error assigning moderation item:", error);
      res.status(500).json({ error: "Failed to assign moderation item" });
    }
  }

  // Resolve moderation item
  async resolveModerationItem(req: Request, res: Response) {
    try {
      const { itemId } = req.params;
      const { action, reason, details } = req.body;

      const db = databaseService.getDatabase();
      const [updatedCase] = await db.update(moderationCases)
        .set({
          status: 'resolved',
          decision: action,
          reasonCode: reason,
          updatedAt: new Date()
        })
        .where(eq(moderationCases.id, parseInt(itemId)))
        .returning();

      if (!updatedCase) {
        return res.status(404).json({ error: "Moderation item not found" });
      }

      res.json({ success: true });
    } catch (error) {
      safeLogger.error("Error resolving moderation item:", error);
      res.status(500).json({ error: "Failed to resolve moderation item" });
    }
  }
}

export const moderationController = new ModerationController();
