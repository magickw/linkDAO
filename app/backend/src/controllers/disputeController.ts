import { Request, Response } from "express";
import { disputeService } from "../services/disputeService";
import { databaseService } from "../services/databaseService";
import { eq, desc } from "drizzle-orm";
import { disputes } from "../db/schema";

export class DisputeController {
  // Get disputes
  async getDisputes(req: Request, res: Response) {
    try {
      const { status, type, priority, assignedTo, page = 1, limit = 10 } = req.query;
      
      const db = databaseService.getDatabase();
      
      // Build conditions
      const conditions = [];
      if (status) {
        conditions.push(eq(disputes.status, status as string));
      }
      
      // Get disputes
      const disputeList = await db.select()
        .from(disputes)
        .where(conditions.length > 0 ? conditions[0] : undefined) // Simplified for now
        .orderBy(desc(disputes.createdAt))
        .limit(parseInt(limit as string))
        .offset((parseInt(page as string) - 1) * parseInt(limit as string));
      
      // Get total count
      const totalCountResult = await db.select({ count: disputes.id })
        .from(disputes)
        .where(conditions.length > 0 ? conditions[0] : undefined);
      const totalCount = totalCountResult.length > 0 ? totalCountResult[0].count : 0;
      
      res.json({
        disputes: disputeList,
        total: totalCount,
        page: parseInt(page as string),
        totalPages: Math.ceil(totalCount / parseInt(limit as string))
      });
    } catch (error) {
      console.error("Error fetching disputes:", error);
      res.status(500).json({ error: "Failed to fetch disputes" });
    }
  }

  // Get specific dispute
  async getDispute(req: Request, res: Response) {
    try {
      const { disputeId } = req.params;
      
      const disputeDetails = await disputeService.getDisputeDetails(parseInt(disputeId));
      
      if (!disputeDetails) {
        return res.status(404).json({ error: "Dispute not found" });
      }
      
      res.json(disputeDetails);
    } catch (error) {
      console.error("Error fetching dispute:", error);
      res.status(500).json({ error: "Failed to fetch dispute" });
    }
  }

  // Assign dispute
  async assignDispute(req: Request, res: Response) {
    try {
      const { disputeId } = req.params;
      const { assigneeId } = req.body;
      
      const db = databaseService.getDatabase();
      const [updatedDispute] = await db.update(disputes)
        .set({ 
          status: 'in_review',
          updatedAt: new Date()
        })
        .where(eq(disputes.id, parseInt(disputeId)))
        .returning();
      
      if (!updatedDispute) {
        return res.status(404).json({ error: "Dispute not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error assigning dispute:", error);
      res.status(500).json({ error: "Failed to assign dispute" });
    }
  }

  // Resolve dispute
  async resolveDispute(req: Request, res: Response) {
    try {
      const { disputeId } = req.params;
      const { outcome, refundAmount, reasoning, adminNotes } = req.body;
      
      // Map outcome to verdict type
      let verdict;
      switch (outcome) {
        case 'buyer_favor':
          verdict = 'favor_buyer';
          break;
        case 'seller_favor':
          verdict = 'favor_seller';
          break;
        case 'partial_refund':
          verdict = 'partial_refund';
          break;
        default:
          verdict = 'no_fault';
      }
      
      // Resolve dispute using dispute service
      await disputeService.resolveAsArbitrator({
        disputeId: parseInt(disputeId),
        arbitratorId: 'admin', // In a real implementation, this would be the actual admin ID
        verdict: verdict,
        refundAmount: refundAmount,
        reasoning: reasoning
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error resolving dispute:", error);
      res.status(500).json({ error: "Failed to resolve dispute" });
    }
  }

  // Add dispute note
  async addDisputeNote(req: Request, res: Response) {
    try {
      const { disputeId } = req.params;
      const { note } = req.body;
      
      // In a real implementation, we would store notes in a separate table
      // For now, we'll just log it
      console.log(`Note added to dispute ${disputeId}: ${note}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error adding dispute note:", error);
      res.status(500).json({ error: "Failed to add dispute note" });
    }
  }
}

export const disputeController = new DisputeController();