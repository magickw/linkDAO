import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { randomUUID } from 'crypto';
import { pdfGenerationService } from './pdfGenerationService';
import { s3StorageService } from './s3StorageService';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

const databaseService = new DatabaseService();

export interface PurchaseOrderData {
  orderId: string;
  poNumber: string;
  buyerId: string;
  sellerId: string;
  items: any[];
  subtotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  currency: string;
  sender: {
    name: string;
    address: any;
    walletAddress?: string;
  };
  recipient: {
    name: string;
    address: any;
    walletAddress?: string;
    phone?: string;
  };
  note?: string;
  terms?: string;
  status?: string;
  date?: Date;
}

export class PurchaseOrderService {
  private get db() {
    return databaseService.getDatabase();
  }

  /**
   * Generate and store a purchase order for an order
   */
  async createPurchaseOrder(data: PurchaseOrderData): Promise<any> {
    try {
      // 1. Create database record
      const poRecord = {
        id: randomUUID(),
        poNumber: data.poNumber,
        orderId: data.orderId,
        buyerId: data.buyerId,
        sellerId: data.sellerId,
        issueDate: data.date || new Date(),
        status: data.status || 'pending',
        currency: data.currency,
        totalAmount: data.total.toString(),
        metadata: {
          items: data.items,
          sender: data.sender,
          recipient: data.recipient,
          pricing: {
            subtotal: data.subtotal,
            taxTotal: data.taxTotal,
            shippingTotal: data.shippingTotal,
          },
          note: data.note,
          terms: data.terms
        }
      };

      const [savedPO] = await this.db.insert(schema.purchaseOrders).values(poRecord).returning();

      safeLogger.info(`Purchase Order created: ${data.poNumber} for order ${data.orderId}`);

      // 2. Generate PDF and upload to S3
      try {
        await this.generatePOPDF(savedPO.id);
      } catch (pdfError) {
        safeLogger.warn(`Failed to generate PDF for PO ${data.poNumber} immediately, will be generated on first download`, pdfError);
      }

      return savedPO;
    } catch (error) {
      safeLogger.error('Error creating purchase order:', error);
      throw error;
    }
  }

  /**
   * Get purchase order by ID
   */
  async getPOById(id: string): Promise<any> {
    try {
      const result = await this.db.select().from(schema.purchaseOrders).where(eq(schema.purchaseOrders.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      safeLogger.error('Error fetching PO by ID:', error);
      return null;
    }
  }

  /**
   * Get purchase order by order ID
   */
  async getPOByOrderId(orderId: string): Promise<any> {
    try {
      const result = await this.db.select().from(schema.purchaseOrders).where(eq(schema.purchaseOrders.orderId, orderId)).limit(1);
      return result[0] || null;
    } catch (error) {
      safeLogger.error('Error fetching PO by order ID:', error);
      return null;
    }
  }

  /**
   * Generate PO PDF and upload to S3
   */
  async generatePOPDF(poId: string): Promise<string> {
    try {
      const po = await this.getPOById(poId);
      if (!po) throw new Error(`Purchase Order not found: ${poId}`);

      // Map to template data
      const templateData = {
        documentNumber: po.poNumber,
        date: po.issueDate,
        status: po.status,
        currency: po.currency,
        ...(po.metadata as any)
      };

      if (!pdfGenerationService) {
        await pdfGenerationService.initialize();
      }

      const pdfResult = await pdfGenerationService.generateAndUploadPDF(
        'purchase-order',
        templateData,
        `pos/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`
      );

      await this.db.update(schema.purchaseOrders)
        .set({
          pdfUrl: pdfResult.s3Url,
          pdfS3Key: pdfResult.s3Key,
          updatedAt: new Date()
        })
        .where(eq(schema.purchaseOrders.id, poId));

      return pdfResult.s3Url;
    } catch (error) {
      safeLogger.error('Error generating PO PDF:', error);
      throw error;
    }
  }
}

export const purchaseOrderService = new PurchaseOrderService();
