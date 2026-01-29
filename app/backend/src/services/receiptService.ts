import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { randomUUID } from 'crypto';
import { pdfGenerationService } from './pdfGenerationService';
import { s3StorageService } from './s3StorageService';

const databaseService = new DatabaseService();

export interface ReceiptData {
  orderId: string;
  orderNumber?: string; // Friendly order number (e.g. ORD-12345)
  buyerId?: string;
  sellerId?: string;
  amount: string;
  currency: string;
  taxAmount?: string;
  platformFee?: string;
  processingFee?: string;
  paymentMethod: string;
  items: any[];
  shippingAddress?: any;
  // New fields
  transactionId?: string;
  buyerAddress?: string;
  sellerAddress?: string;
  transactionHash?: string;
  status?: string;
  createdAt?: Date;
  completedAt?: Date;
}

export class ReceiptService {
  /**
   * Generate and store a receipt for a marketplace order
   */
  async generateMarketplaceReceipt(data: any): Promise<any> {
    return this.generateReceipt({
      ...data,
      paymentMethod: data.paymentMethod || 'crypto'
    });
  }

  /**
   * Generate and store a receipt for an LDAO token purchase
   */
  async generateLDAOPurchaseReceipt(data: any): Promise<any> {
    return this.generateReceipt({
      ...data,
      orderId: data.transactionId || randomUUID(),
      paymentMethod: data.paymentMethod || 'crypto',
      items: [{
        description: 'LDAO Tokens',
        quantity: data.tokensPurchased || 1,
        price: data.amount,
        total: data.amount
      }]
    });
  }

  /**
   * Generate and store a receipt for a completed checkout
   */
  async generateReceipt(data: ReceiptData): Promise<any> {
    try {
      const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const receiptRecord = {
        id: randomUUID(),
        orderId: data.orderId,
        receiptNumber,
        buyerInfo: {
          buyerId: data.buyerId,
          startAddress: data.buyerAddress, // Store wallet address if ID is missing
          shippingAddress: data.shippingAddress
        },
        items: data.items,
        pricing: {
          subtotal: (
            parseFloat(data.amount) -
            (parseFloat(data.taxAmount || '0')) -
            (parseFloat(data.platformFee || '0')) -
            (parseFloat(data.processingFee || '0'))
          ).toString(),
          tax: data.taxAmount || '0',
          platformFee: data.platformFee || '0',
          processingFee: data.processingFee || '0',
          total: data.amount,
          currency: data.currency
        },
        paymentDetails: {
          method: data.paymentMethod,
          transactionId: data.transactionId,
          transactionHash: data.transactionHash,
          status: data.status,
          timestamp: data.completedAt || new Date(),
          displayOrderNumber: data.orderNumber // Store friendly order number for display
        },
        createdAt: data.createdAt || new Date()
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
      return receipts;
    } catch (error) {
      safeLogger.error('Error fetching receipt:', error);
      return [];
    }
  }

  /**
   * Get a receipt by ID
   */
  async getReceiptById(id: string): Promise<any> {
    try {
      const receipt = await databaseService.getReceiptById(id);
      return receipt;
    } catch (error) {
      safeLogger.error('Error fetching receipt by ID:', error);
      return null;
    }
  }

  /**
   * Get receipts by user address
   */
  async getReceiptsByUser(userAddress: string, limit: number, offset: number): Promise<any[]> {
    try {
      const receipts = await databaseService.getReceiptsByUser(userAddress, limit, offset);
      return receipts;
    } catch (error) {
      safeLogger.error('Error fetching receipts by user:', error);
      return [];
    }
  }

  /**
   * Generate receipt PDF and upload to S3
   */
  async generateReceiptPDF(receiptId: string): Promise<string> {
    try {
      // Fetch the receipt data
      const receipt = await databaseService.getReceiptById(receiptId);
      if (!receipt) {
        safeLogger.error(`Receipt not found: ${receiptId}`);
        throw new Error(`Receipt not found: ${receiptId}`);
      }

      // Ensure PDF generation service is initialized
      if (!pdfGenerationService) {
        await pdfGenerationService.initialize();
      }

      // Generate PDF from receipt data
      const pdfResult = await pdfGenerationService.generateAndUploadPDF(
        'receipt',
        receipt,
        `receipts/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`
      );

      // Update receipt with PDF URL in database
      await databaseService.updateReceipt(receiptId, {
        pdfUrl: pdfResult.s3Url,
        pdfS3Key: pdfResult.s3Key,
      });

      safeLogger.info(`Receipt PDF generated and uploaded: ${receiptId} -> ${pdfResult.s3Key}`);
      return pdfResult.s3Url;
    } catch (error) {
      safeLogger.error('Error generating receipt PDF:', error);
      // Return a fallback URL if PDF generation fails
      return `https://api.linkdao.io/receipts/download/${receiptId}.pdf`;
    }
  }

  /**
   * Generate receipt PDF from receipt data directly (for immediate generation)
   */
  async generateReceiptPDFFromData(receiptData: any): Promise<string> {
    try {
      // Ensure PDF generation service is initialized
      if (!pdfGenerationService) {
        await pdfGenerationService.initialize();
      }

      // Generate PDF from provided data
      const pdfResult = await pdfGenerationService.generateAndUploadPDF(
        'receipt',
        receiptData,
        `receipts/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`
      );

      safeLogger.info(`Receipt PDF generated from data: ${pdfResult.s3Key}`);
      return pdfResult.s3Url;
    } catch (error) {
      safeLogger.error('Error generating receipt PDF from data:', error);
      throw error;
    }
  }
}

export const receiptService = new ReceiptService();
