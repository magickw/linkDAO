import Stripe from 'stripe';
import { ethers } from 'ethers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-11-20.acacia' });

export class RefundPaymentService {
  async processStripeRefund(paymentIntentId: string, amount: number): Promise<{
    success: boolean;
    refundId?: string;
    error?: string;
  }> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(amount * 100)
      });
      
      return { success: true, refundId: refund.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async processBlockchainRefund(recipientAddress: string, amount: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
      const wallet = new ethers.Wallet(process.env.REFUND_WALLET_PRIVATE_KEY || '', provider);
      
      const tx = await wallet.sendTransaction({
        to: recipientAddress,
        value: ethers.utils.parseEther(amount)
      });
      
      await tx.wait();
      return { success: true, transactionHash: tx.hash };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const refundPaymentService = new RefundPaymentService();
