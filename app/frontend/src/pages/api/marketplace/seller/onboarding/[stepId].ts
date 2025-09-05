import { NextApiRequest, NextApiResponse } from 'next';
import { sellerService } from '@/services/sellerService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { walletAddress, stepId } = req.query;

  switch (method) {
    case 'GET':
      try {
        if (!walletAddress || typeof walletAddress !== 'string') {
          return res.status(400).json({ error: 'Wallet address is required' });
        }

        if (!stepId || typeof stepId !== 'string') {
          return res.status(400).json({ error: 'Step ID is required' });
        }

        // This would typically fetch specific data for a step
        // For now, we'll return a simple response
        res.status(200).json({ 
          stepId,
          message: `Data for step ${stepId}`,
          walletAddress
        });
      } catch (error) {
        console.error('Error fetching step data:', error);
        res.status(500).json({ error: 'Failed to fetch step data' });
      }
      break;

    case 'PUT':
      try {
        if (!walletAddress || typeof walletAddress !== 'string') {
          return res.status(400).json({ error: 'Wallet address is required' });
        }

        if (!stepId || typeof stepId !== 'string') {
          return res.status(400).json({ error: 'Step ID is required' });
        }

        const data = req.body;
        await sellerService.updateOnboardingStep(walletAddress, stepId, data);
        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error updating step:', error);
        res.status(500).json({ error: 'Failed to update step' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}