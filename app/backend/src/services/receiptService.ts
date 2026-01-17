import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { v4 as uuidv4 } from 'uuid';

const databaseService = new DatabaseService();

export interface ReceiptData {
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: string;
  currency: string;
  taxAmount: string;
  platformFee: string;
  processingFee: string;
  paymentMethod: string;
  items: any[];
  shippingAddress?: any;
}

export class ReceiptService {
  /**
   * Generate and store a receipt for a completed checkout
   */
  async generateReceipt(data: ReceiptData): Promise<any> {
    try {
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      
      const receiptRecord = {
        id: uuidv4(),
        orderId: data.orderId,
        receiptNumber,
        buyerInfo: {
          buyerId: data.buyerId,
          shippingAddress: data.shippingAddress
        },
        items: data.items,
        pricing: {
          subtotal: (parseFloat(data.amount) - parseFloat(data.taxAmount) - parseFloat(data.platformFee) - parseFloat(data.processingFee)).toString(),
          tax: data.taxAmount,
          platformFee: data.platformFee,
          processingFee: data.processingFee,
          total: data.amount,
          currency: data.currency
        },
        paymentDetails: {
          method: data.paymentMethod,
          timestamp: new Date()
        },
        createdAt: new Date()
      };

      // Store in database
      const savedReceipt = await databaseService.createReceipt(receiptRecord);
      
      safeLogger.info(`Receipt generated: ${receiptNumber} for order ${data.orderId}`);
      
      return savedReceipt;
    } catch (error) {
      safeLogger.error('Error generating receipt:', error);
      throw error;
    }
  }

  /**
   * Get a receipt by order ID
   */
  async getReceiptByOrderId(orderId: string): Promise<any> {
    try {
      const receipts = await databaseService.getReceiptsByOrderId(orderId);
      return receipts[0] || null;
    } catch (error) {
      safeLogger.error('Error fetching receipt:', error);
      return null;
    }
  }
}

export const receiptService = new ReceiptService();
