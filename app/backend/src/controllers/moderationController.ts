import { Request, Response } from "express";
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { databaseService } from "../services/databaseService";
import { eq, desc } from "drizzle-orm";
import { moderationCases } from "../db/schema";

export class ModerationController {
  // Get moderation queue
  async getModerationQueue(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const db = databaseService.getDatabase();
      
      // Get moderation cases
      const cases = await db.select()
        .from(moderationCases)
        .orderBy(desc(moderationCases.createdAt))
        .limit(parseInt(limit as string))
        .offset((parseInt(page as string) - 1) * parseInt(limit as string));
      
      // Get total count
      const totalCountResult = await db.select({ count: moderationCases.id })
        .from(moderationCases);
      const totalCount = totalCountResult.length > 0 ? totalCountResult[0].count : 0;
      
      res.json({
        items: cases,
        total: totalCount,
        page: parseInt(page as string),
        totalPages: Math.ceil(totalCount / parseInt(limit as string))
      });
    } catch (error) {
      safeLogger.error("Error fetching moderation queue:", error);
      res.status(500).json({ error: "Failed to fetch moderation queue" });
    }
  }

  // Assign moderation item
  async assignModerationItem(req: Request, res: Response) {
    try {
      const { itemId } = req.params;
      const { assigneeId } = req.body;
      
      const db = databaseService.getDatabase();
      const [updatedCase] = await db.update(moderationCases)
        .set({ 
          status: 'in_review',
          updatedAt: new Date()
        })
        .where(eq(moderationCases.id, parseInt(itemId)))
        .returning();
      
      if (!updatedCase) {
        return res.status(404).json({ error: "Moderation item not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
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
