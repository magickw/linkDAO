import { Request, Response } from 'express';
import { VerificationService } from '../services/verificationService';
import { safeLogger } from '../utils/safeLogger';

export class VerificationController {
    private verificationService: VerificationService;

    constructor() {
        this.verificationService = new VerificationService();
    }

    submitRequest = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.userId; // Auth middleware populates this
            const { entityType, category, description, website, socialProof } = req.body;

            if (!entityType || !['individual', 'organization'].includes(entityType)) {
                return res.status(400).json({ error: 'Invalid entityType. Must be "individual" or "organization".' });
            }

            const result = await this.verificationService.submitVerificationRequest(userId, entityType, {
                category,
                description,
                website,
                socialProof
            });

            return res.status(201).json(result);
        } catch (error: any) {
            if (error.message === "You already have a pending verification request.") {
                return res.status(409).json({ error: error.message });
            }
            safeLogger.error('Error in submitRequest:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };

    getMyRequests = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.userId;
            const requests = await this.verificationService.getMyRequests(userId);
            return res.json(requests);
        } catch (error) {
            safeLogger.error('Error in getMyRequests:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };

    getAllPendingRequests = async (req: Request, res: Response) => {
        try {
            const { limit, offset } = req.query;
            const requests = await this.verificationService.getAllPendingRequests(
                limit ? parseInt(limit as string) : 50,
                offset ? parseInt(offset as string) : 0
            );
            return res.json(requests);
        } catch (error) {
            safeLogger.error('Error in getAllPendingRequests:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };

    reviewRequest = async (req: Request, res: Response) => {
        try {
            const adminId = (req as any).user.userId;
            const { requestId, status, notes, rejectionReason } = req.body;

            if (!requestId || !status || !['approved', 'rejected', 'more_info_needed'].includes(status)) {
                return res.status(400).json({ error: 'Invalid request parameters' });
            }

            await this.verificationService.reviewRequest(requestId, adminId, status, notes, rejectionReason);
            return res.json({ success: true, message: `Request ${status}` });
        } catch (error) {
            safeLogger.error('Error in reviewRequest:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };

    revokeVerification = async (req: Request, res: Response) => {
        try {
            const adminId = (req as any).user.userId;
            const { entityId, entityType, reason } = req.body;

            if (!entityId || !entityType || !reason) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            await this.verificationService.revokeVerification(entityId, entityType, adminId, reason);
            return res.json({ success: true, message: 'Verification revoked' });
        } catch (error) {
            safeLogger.error('Error in revokeVerification:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
}
