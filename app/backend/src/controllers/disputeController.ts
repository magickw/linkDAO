import { Request, Response } from "express";
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
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
      safeLogger.error("Error fetching disputes:", error);
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
      safeLogger.error("Error fetching dispute:", error);
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
      safeLogger.error("Error assigning dispute:", error);
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
      safeLogger.error("Error resolving dispute:", error);
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
      safeLogger.info(`Note added to dispute ${disputeId}: ${note}`);

      res.json({ success: true });
    } catch (error) {
      safeLogger.error("Error adding dispute note:", error);
      res.status(500).json({ error: "Failed to add dispute note" });
    }
  }

  // Evidence Management
  async uploadDisputeEvidence(req: Request, res: Response) {
    try {
      const { disputeId } = req.params;
      const files = req.files as Express.Multer.File[];
      const party = req.body.party; // 'buyer', 'seller', or 'admin'

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      // In production, upload files to cloud storage (S3, etc.)
      // For now, create mock evidence records
      const evidence = files.map((file, index) => ({
        id: `evidence_${Date.now()}_${index}`,
        disputeId,
        filename: file.originalname,
        type: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
        uploadedBy: party,
        uploadedAt: new Date().toISOString(),
        status: 'pending',
        description: ''
      }));

      res.json({
        success: true,
        evidence
      });
    } catch (error) {
      safeLogger.error("Error uploading evidence:", error);
      res.status(500).json({ error: "Failed to upload evidence" });
    }
  }

  async deleteDisputeEvidence(req: Request, res: Response) {
    try {
      const { disputeId, evidenceId } = req.params;

      // In production, delete from cloud storage and database
      safeLogger.info(`Deleting evidence ${evidenceId} from dispute ${disputeId}`);

      res.json({ success: true });
    } catch (error) {
      safeLogger.error("Error deleting evidence:", error);
      res.status(500).json({ error: "Failed to delete evidence" });
    }
  }

  async updateEvidenceStatus(req: Request, res: Response) {
    try {
      const { disputeId, evidenceId } = req.params;
      const { status } = req.body;

      // In production, update evidence status in database
      safeLogger.info(`Updating evidence ${evidenceId} status to ${status}`);

      res.json({ success: true });
    } catch (error) {
      safeLogger.error("Error updating evidence status:", error);
      res.status(500).json({ error: "Failed to update evidence status" });
    }
  }

  // Communication Thread
  async getDisputeMessages(req: Request, res: Response) {
    try {
      const { disputeId } = req.params;

      // In production, fetch from messages table
      // For now, return mock messages
      const messages = [
        {
          id: 'msg_1',
          disputeId,
          sender: 'buyer',
          message: 'I never received the product as described.',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          isInternal: false,
          attachments: []
        },
        {
          id: 'msg_2',
          disputeId,
          sender: 'seller',
          message: 'The product was shipped on time with tracking number.',
          timestamp: new Date(Date.now() - 43200000).toISOString(),
          isInternal: false,
          attachments: []
        },
        {
          id: 'msg_3',
          disputeId,
          sender: 'admin',
          message: 'I am reviewing the case and will provide a resolution soon.',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          isInternal: false,
          attachments: []
        }
      ];

      res.json({ messages });
    } catch (error) {
      safeLogger.error("Error fetching dispute messages:", error);
      res.status(500).json({ error: "Failed to fetch dispute messages" });
    }
  }

  async sendDisputeMessage(req: Request, res: Response) {
    try {
      const { disputeId } = req.params;
      const { message, sender, isInternal } = req.body;

      // In production, save to messages table
      const newMessage = {
        id: `msg_${Date.now()}`,
        disputeId,
        sender,
        message,
        timestamp: new Date().toISOString(),
        isInternal: isInternal || false,
        attachments: []
      };

      safeLogger.info(`Message sent to dispute ${disputeId}:`, newMessage);

      res.json({
        success: true,
        message: newMessage
      });
    } catch (error) {
      safeLogger.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  }
}

export const disputeController = new DisputeController();
