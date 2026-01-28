import { ReceiptService } from '../receiptService';
import { safeLogger } from '../../utils/safeLogger';
import { 
  LDAOPurchaseReceipt,
  ReceiptStatus
} from '../../types/receipt';

export interface LDAOPurchaseData {
  transactionId: string;
  buyerAddress: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  transactionHash?: string;
  tokensPurchased: string;
  pricePerToken: string;
  fees?: {
    processing: string;
    platform: string;
    gas?: string;
    total: string;
  };
  metadata?: any;
}

export class LDAOReceiptService {
  private receiptService: ReceiptService;

  constructor() {
    this.receiptService = new ReceiptService();
  }

  /**
   * Generate LDAO token purchase receipt
   */
  async generateLDAOPurchaseReceipt(purchaseData: LDAOPurchaseData): Promise<LDAOPurchaseReceipt> {
    try {
      const receipt = await this.receiptService.generateLDAOPurchaseReceipt({
        transactionId: purchaseData.transactionId,
        buyerAddress: purchaseData.buyerAddress,
        amount: purchaseData.amount,
        currency: purchaseData.currency,
        paymentMethod: purchaseData.paymentMethod,
        transactionHash: purchaseData.transactionHash,
        status: ReceiptStatus.COMPLETED,
        fees: purchaseData.fees,
        createdAt: new Date(),
        completedAt: new Date(),
        metadata: {
          ...purchaseData.metadata,
          tokensPurchased: purchaseData.tokensPurchased,
          pricePerToken: purchaseData.pricePerToken
        }
      });

      safeLogger.info(`🧾 LDAO purchase receipt ${receipt.receiptNumber} generated for transaction ${purchaseData.transactionId}`);
      return receipt;

    } catch (error) {
      safeLogger.error('Error generating LDAO purchase receipt:', error);
      throw error;
    }
  }

  /**
   * Get LDAO purchase receipt by transaction ID
   */
  async getLDAOPurchaseReceipt(transactionId: string): Promise<LDAOPurchaseReceipt | null> {
    try {
      // In a real implementation, we would query by transaction ID
      // For now, we'll return null as this requires database implementation
      return null;
    } catch (error) {
      safeLogger.error('Error getting LDAO purchase receipt:', error);
      return null;
    }
  }
}