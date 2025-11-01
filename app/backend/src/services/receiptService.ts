import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { ethers } from 'ethers';
import { 
  PaymentReceipt, 
  LDAOPurchaseReceipt, 
  MarketplaceReceipt,
  ReceiptType,
  ReceiptStatus
} from '../types/receipt';

export interface ReceiptData {
  id: string;
  orderId?: string;
  transactionId?: string;
  purchaseType: 'marketplace' | 'ldao_token';
  buyerAddress: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  transactionHash?: string;
  status: ReceiptStatus;
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
  fees?: {
    processing: string;
    platform: string;
    gas?: string;
    total: string;
  };
  sellerAddress?: string;
  sellerName?: string;
  createdAt: Date;
  completedAt?: Date;
  metadata?: any;
}

export class ReceiptService {
  private databaseService: DatabaseService;
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.databaseService = new DatabaseService();
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
  }

  /**
   * Generate a marketplace purchase receipt
   */
  async generateMarketplaceReceipt(receiptData: Omit<ReceiptData, 'id' | 'purchaseType'>): Promise<MarketplaceReceipt> {
    try {
      const receiptId = `mkt_rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const marketplaceReceipt: MarketplaceReceipt = {
        id: receiptId,
        type: ReceiptType.MARKETPLACE,
        orderId: receiptData.orderId,
        transactionId: receiptData.transactionId,
        buyerAddress: receiptData.buyerAddress,
        amount: receiptData.amount,
        currency: receiptData.currency,
        paymentMethod: receiptData.paymentMethod,
        transactionHash: receiptData.transactionHash,
        status: receiptData.status,
        items: receiptData.items || [],
        fees: receiptData.fees,
        sellerAddress: receiptData.sellerAddress,
        sellerName: receiptData.sellerName,
        createdAt: receiptData.createdAt,
        completedAt: receiptData.completedAt,
        metadata: receiptData.metadata,
        receiptNumber: this.generateReceiptNumber('MKT'),
        downloadUrl: await this.generateReceiptDownloadUrl(receiptId, 'marketplace')
      };

      // Store receipt in database
      await this.storeReceipt(marketplaceReceipt);

      safeLogger.info(`🧾 Marketplace receipt ${marketplaceReceipt.receiptNumber} generated for order ${receiptData.orderId}`);
      return marketplaceReceipt;

    } catch (error) {
      safeLogger.error('Error generating marketplace receipt:', error);
      throw error;
    }
  }

  /**
   * Generate an LDAO token purchase receipt
   */
  async generateLDAOPurchaseReceipt(receiptData: Omit<ReceiptData, 'id' | 'purchaseType' | 'items' | 'sellerAddress' | 'sellerName'>): Promise<LDAOPurchaseReceipt> {
    try {
      const receiptId = `ldao_rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const ldaoReceipt: LDAOPurchaseReceipt = {
        id: receiptId,
        type: ReceiptType.LDAO_TOKEN,
        transactionId: receiptData.transactionId,
        buyerAddress: receiptData.buyerAddress,
        amount: receiptData.amount,
        currency: receiptData.currency,
        paymentMethod: receiptData.paymentMethod,
        transactionHash: receiptData.transactionHash,
        status: receiptData.status,
        fees: receiptData.fees,
        createdAt: receiptData.createdAt,
        completedAt: receiptData.completedAt,
        metadata: receiptData.metadata,
        receiptNumber: this.generateReceiptNumber('LDAO'),
        tokensPurchased: receiptData.metadata?.tokensPurchased || '0',
        pricePerToken: receiptData.metadata?.pricePerToken || '0',
        downloadUrl: await this.generateReceiptDownloadUrl(receiptId, 'ldao_token')
      };

      // Store receipt in database
      await this.storeReceipt(ldaoReceipt);

      safeLogger.info(`🧾 LDAO receipt ${ldaoReceipt.receiptNumber} generated for transaction ${receiptData.transactionId}`);
      return ldaoReceipt;

    } catch (error) {
      safeLogger.error('Error generating LDAO purchase receipt:', error);
      throw error;
    }
  }

  /**
   * Get receipt by ID
   */
  async getReceiptById(receiptId: string): Promise<PaymentReceipt | null> {
    try {
      const dbReceipt = await this.databaseService.getReceiptById(receiptId);
      if (!dbReceipt) return null;

      return this.formatReceipt(dbReceipt);
    } catch (error) {
      safeLogger.error('Error getting receipt by ID:', error);
      throw error;
    }
  }

  /**
   * Get receipts by user address
   */
  async getReceiptsByUser(userAddress: string, limit: number = 50, offset: number = 0): Promise<PaymentReceipt[]> {
    try {
      const dbReceipts = await this.databaseService.getReceiptsByUser(userAddress, limit, offset);
      return dbReceipts.map(receipt => this.formatReceipt(receipt));
    } catch (error) {
      safeLogger.error('Error getting receipts by user:', error);
      throw error;
    }
  }

  /**
   * Get receipts by order ID
   */
  async getReceiptsByOrderId(orderId: string): Promise<MarketplaceReceipt[]> {
    try {
      const dbReceipts = await this.databaseService.getReceiptsByOrderId(orderId);
      return dbReceipts
        .map(receipt => this.formatReceipt(receipt))
        .filter(receipt => receipt.type === ReceiptType.MARKETPLACE) as MarketplaceReceipt[];
    } catch (error) {
      safeLogger.error('Error getting receipts by order ID:', error);
      throw error;
    }
  }

  /**
   * Update receipt status
   */
  async updateReceiptStatus(receiptId: string, status: ReceiptStatus, metadata?: any): Promise<boolean> {
    try {
      const success = await this.databaseService.updateReceiptStatus(receiptId, status, metadata);
      
      if (success) {
        safeLogger.info(`✅ Receipt ${receiptId} status updated to ${status}`);
      }
      
      return success;
    } catch (error) {
      safeLogger.error('Error updating receipt status:', error);
      throw error;
    }
  }

  /**
   * Generate receipt PDF (placeholder - would integrate with PDF generation service)
   */
  async generateReceiptPDF(receiptId: string): Promise<string> {
    try {
      const receipt = await this.getReceiptById(receiptId);
      if (!receipt) {
        throw new Error('Receipt not found');
      }

      // In a real implementation, this would generate a PDF and return a download URL
      // For now, we'll return a mock URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return `${baseUrl}/api/receipts/${receiptId}/pdf`;
    } catch (error) {
      safeLogger.error('Error generating receipt PDF:', error);
      throw error;
    }
  }

  // Private helper methods

  private generateReceiptNumber(prefix: string): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private async generateReceiptDownloadUrl(receiptId: string, type: string): Promise<string> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/receipts/${type}/${receiptId}`;
  }

  private async storeReceipt(receipt: PaymentReceipt): Promise<void> {
    try {
      await this.databaseService.createReceipt({
        id: receipt.id,
        type: receipt.type,
        orderId: 'orderId' in receipt ? receipt.orderId : undefined,
        transactionId: receipt.transactionId,
        buyerAddress: receipt.buyerAddress,
        amount: receipt.amount,
        currency: receipt.currency,
        paymentMethod: receipt.paymentMethod,
        transactionHash: receipt.transactionHash,
        status: receipt.status,
        items: 'items' in receipt ? JSON.stringify(receipt.items) : undefined,
        fees: receipt.fees ? JSON.stringify(receipt.fees) : undefined,
        sellerAddress: 'sellerAddress' in receipt ? receipt.sellerAddress : undefined,
        sellerName: 'sellerName' in receipt ? receipt.sellerName : undefined,
        receiptNumber: receipt.receiptNumber,
        downloadUrl: receipt.downloadUrl,
        createdAt: receipt.createdAt,
        completedAt: receipt.completedAt,
        metadata: receipt.metadata ? JSON.stringify(receipt.metadata) : undefined
      });
    } catch (error) {
      safeLogger.error('Error storing receipt:', error);
      throw error;
    }
  }

  private formatReceipt(dbReceipt: any): PaymentReceipt {
    const baseReceipt = {
      id: dbReceipt.id,
      type: dbReceipt.type as ReceiptType,
      transactionId: dbReceipt.transactionId,
      buyerAddress: dbReceipt.buyerAddress,
      amount: dbReceipt.amount,
      currency: dbReceipt.currency,
      paymentMethod: dbReceipt.paymentMethod,
      transactionHash: dbReceipt.transactionHash,
      status: dbReceipt.status as ReceiptStatus,
      receiptNumber: dbReceipt.receiptNumber,
      downloadUrl: dbReceipt.downloadUrl,
      createdAt: dbReceipt.createdAt,
      completedAt: dbReceipt.completedAt,
      metadata: dbReceipt.metadata ? JSON.parse(dbReceipt.metadata) : undefined
    };

    if (dbReceipt.type === ReceiptType.MARKETPLACE) {
      return {
        ...baseReceipt,
        orderId: dbReceipt.orderId,
        items: dbReceipt.items ? JSON.parse(dbReceipt.items) : [],
        fees: dbReceipt.fees ? JSON.parse(dbReceipt.fees) : undefined,
        sellerAddress: dbReceipt.sellerAddress,
        sellerName: dbReceipt.sellerName
      } as MarketplaceReceipt;
    } else {
      return {
        ...baseReceipt,
        fees: dbReceipt.fees ? JSON.parse(dbReceipt.fees) : undefined,
        tokensPurchased: dbReceipt.metadata ? JSON.parse(dbReceipt.metadata)?.tokensPurchased : '0',
        pricePerToken: dbReceipt.metadata ? JSON.parse(dbReceipt.metadata)?.pricePerToken : '0'
      } as LDAOPurchaseReceipt;
    }
  }
}