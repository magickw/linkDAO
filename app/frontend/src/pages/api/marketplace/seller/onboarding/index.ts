import { NextApiRequest, NextApiResponse } from 'next';
import { sellerService } from '@/services/sellerService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { walletAddress } = req.query;

  switch (method) {
    case 'GET':
      try {
        // Redirect to the seller onboarding page
        res.redirect(307, '/marketplace/seller/onboarding');
      } catch (error) {
        console.error('Error redirecting to onboarding:', error);
        res.status(500).json({ error: 'Failed to redirect to onboarding' });
      }
      break;

    case 'POST':
      try {
        if (!walletAddress || typeof walletAddress !== 'string') {
          return res.status(400).json({ error: 'Wallet address is required' });
        }

        const { stepId, data } = req.body;
        if (!stepId) {
          return res.status(400).json({ error: 'Step ID is required' });
        }

        await sellerService.updateOnboardingStep(walletAddress, stepId, data);
        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error updating onboarding step:', error);
        res.status(500).json({ error: 'Failed to update onboarding step' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}