import { Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { client } from '../db';

export class CharityController {
    /**
     * Get all charity proposals with optional filtering
     */
    async getCharities(req: Request, res: Response) {
        try {
            const { status, limit = '50' } = req.query;

            let query = `
        SELECT 
          id,
          title,
          description,
          charity_name as "charityName",
          charity_description as "charityDescription",
          ein,
          donation_amount as "donationAmount",
          charity_navigator_rating as "charityNavigatorRating",
          document_ipfs_hashes as "documentIPFSHashes",
          proof_of_verification as "proofOfVerification",
          impact_metrics as "impactMetrics",
          status,
          is_verified_charity as "isVerifiedCharity",
          verified_by as "verifiedBy",
          verified_at as "verifiedAt",
          verification_notes as "verificationNotes",
          end_time as "endTime",
          created_at as "createdAt"
        FROM governance_proposals
        WHERE type = 'charity'
      `;

            const params: any[] = [];

            if (status) {
                query += ` AND status = $${params.length + 1}`;
                params.push(status);
            }

            query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
            params.push(parseInt(limit as string));

            if (!client) {
                throw new Error('Database connection not available');
            }

            const result = await client.unsafe(query, params);

            // Transform the data
            const charities = result.map(row => ({
                ...row,
                endTime: new Date(row.endTime),
                createdAt: new Date(row.createdAt),
                verifiedAt: row.verifiedAt ? new Date(row.verifiedAt) : null,
            }));

            res.json(charities);
        } catch (error) {
            safeLogger.error('Error fetching charities:', error);
            res.status(500).json({ error: 'Failed to fetch charities' });
        }
    }

    /**
     * Get charity statistics for admin dashboard
     */
    async getCharityStats(req: Request, res: Response) {
        try {
            const statsQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE status IN ('pending', 'active') AND is_verified_charity = false) as pending,
          COUNT(*) FILTER (WHERE is_verified_charity = true) as verified,
          COUNT(*) FILTER (WHERE status = 'defeated') as rejected,
          COUNT(*) as total
        FROM governance_proposals
        WHERE type = 'charity'
      `;

            if (!client) {
                throw new Error('Database connection not available');
            }

            const result = await client.unsafe(statsQuery);
            const stats = result[0];

            res.json({
                pendingCharityProposals: parseInt(stats.pending) || 0,
                verifiedCharities: parseInt(stats.verified) || 0,
                rejectedCharities: parseInt(stats.rejected) || 0,
                totalCharities: parseInt(stats.total) || 0,
            });
        } catch (error) {
            safeLogger.error('Error fetching charity stats:', error);
            res.status(500).json({ error: 'Failed to fetch charity stats' });
        }
    }

    /**
     * Get a single charity proposal by ID
     */
    async getCharity(req: Request, res: Response) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({ error: 'Charity ID is required' });
            }

            const query = `
        SELECT 
          id,
          title,
          description,
          charity_name as "charityName",
          charity_description as "charityDescription",
          ein,
          donation_amount as "donationAmount",
          charity_navigator_rating as "charityNavigatorRating",
          document_ipfs_hashes as "documentIPFSHashes",
          proof_of_verification as "proofOfVerification",
          impact_metrics as "impactMetrics",
          status,
          is_verified_charity as "isVerifiedCharity",
          verified_by as "verifiedBy",
          verified_at as "verifiedAt",
          verification_notes as "verificationNotes",
          end_time as "endTime",
          created_at as "createdAt"
        FROM governance_proposals
        WHERE id = $1 AND type = 'charity'
      `;

            if (!client) {
                throw new Error('Database connection not available');
            }

            const result = await client.unsafe(query, [id]);

            if (result.length === 0) {
                return res.status(404).json({ error: 'Charity not found' });
            }

            const charity = {
                ...result[0],
                endTime: new Date(result[0].endTime),
                createdAt: new Date(result[0].createdAt),
                verifiedAt: result[0].verifiedAt ? new Date(result[0].verifiedAt) : null,
            };

            res.json(charity);
        } catch (error) {
            safeLogger.error('Error fetching charity:', error);
            res.status(500).json({ error: 'Failed to fetch charity' });
        }
    }

    /**
     * Approve a charity proposal
     */
    async approveCharity(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const adminId = (req as any).user?.id;

            if (!id) {
                return res.status(400).json({ error: 'Charity ID is required' });
            }

            if (!adminId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Update the charity proposal
            const updateQuery = `
        UPDATE governance_proposals
        SET 
          is_verified_charity = true,
          verified_by = $1,
          verified_at = NOW(),
          verification_notes = $2,
          status = 'active'
        WHERE id = $3 AND type = 'charity'
        RETURNING id, title, charity_name as "charityName"
      `;

            if (!client) {
                throw new Error('Database connection not available');
            }

            const result = await client.unsafe(updateQuery, [adminId, notes || '', id]);

            if (result.length === 0) {
                return res.status(404).json({ error: 'Charity not found' });
            }

            // Log the admin action
            const logQuery = `
        INSERT INTO admin_actions (admin_id, action, target_type, target_id, reason, timestamp)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `;

            await client.unsafe(logQuery, [
                adminId,
                'approved_charity',
                'charity_proposal',
                id,
                notes || 'Charity verified and approved'
            ]).catch(err => {
                safeLogger.warn('Failed to log admin action:', err);
            });

            safeLogger.info(`Charity ${id} approved by admin ${adminId}`);

            res.json({
                success: true,
                message: 'Charity approved successfully',
                charity: result[0]
            });
        } catch (error) {
            safeLogger.error('Error approving charity:', error);
            res.status(500).json({ error: 'Failed to approve charity' });
        }
    }

    /**
     * Reject a charity proposal
     */
    async rejectCharity(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const adminId = (req as any).user?.id;

            if (!id) {
                return res.status(400).json({ error: 'Charity ID is required' });
            }

            if (!notes || !notes.trim()) {
                return res.status(400).json({ error: 'Rejection reason is required' });
            }

            if (!adminId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Update the charity proposal
            const updateQuery = `
        UPDATE governance_proposals
        SET 
          is_verified_charity = false,
          verified_by = $1,
          verified_at = NOW(),
          verification_notes = $2,
          status = 'defeated'
        WHERE id = $3 AND type = 'charity'
        RETURNING id, title, charity_name as "charityName"
      `;

            if (!client) {
                throw new Error('Database connection not available');
            }

            const result = await client.unsafe(updateQuery, [adminId, notes, id]);

            if (result.length === 0) {
                return res.status(404).json({ error: 'Charity not found' });
            }

            // Log the admin action
            const logQuery = `
        INSERT INTO admin_actions (admin_id, action, target_type, target_id, reason, timestamp)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `;

            await client.unsafe(logQuery, [
                adminId,
                'rejected_charity',
                'charity_proposal',
                id,
                notes
            ]).catch(err => {
                safeLogger.warn('Failed to log admin action:', err);
            });

            safeLogger.info(`Charity ${id} rejected by admin ${adminId}`);

            res.json({
                success: true,
                message: 'Charity rejected',
                charity: result[0]
            });
        } catch (error) {
            safeLogger.error('Error rejecting charity:', error);
            res.status(500).json({ error: 'Failed to reject charity' });
        }
    }
}

export const charityController = new CharityController();
