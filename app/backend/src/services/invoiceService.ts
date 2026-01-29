/**
 * Invoice Service
 * Handles tax invoice and seller commission invoice generation
 */

import { randomUUID } from 'crypto';
import { safeLogger } from '../utils/safeLogger';
import { DatabaseService } from './databaseService';
import { pdfGenerationService } from './pdfGenerationService';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  commissionRate?: number;
  commissionAmount?: number;
  netAmount?: number;
  orderId?: string;
  grossSales?: number;
}

export interface TaxInvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  dueDate?: Date;
  orderId: string;
  buyerTaxId?: string;
  sellerTaxId?: string;
  taxRate: number;
  taxJurisdiction: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  items: InvoiceItem[];
}

export interface SellerInvoiceData {
  invoiceNumber: string;
  issueDate: Date;
  dueDate?: Date;
  sellerId: string;
  sellerTaxId?: string;
  subtotal: number; // Total gross sales
  taxAmount: number; // Commission deducted
  totalAmount: number; // Net amount for seller
  currency: string;
  items: InvoiceItem[];
}

export class InvoiceService {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  /**
   * Generate a unique invoice number
   */
  private generateInvoiceNumber(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Create a tax invoice
   */
  async createTaxInvoice(data: {
    orderId: string;
    buyerId?: string;
    sellerId?: string;
    buyerTaxId?: string;
    sellerTaxId?: string;
    taxRate: number;
    taxJurisdiction: string;
    items: InvoiceItem[];
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
    issueDate?: Date;
    dueDate?: Date;
  }): Promise<TaxInvoiceData> {
    try {
      const invoiceNumber = this.generateInvoiceNumber('TAX-INV');
      const issueDate = data.issueDate || new Date();
      const dueDate = data.dueDate || new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const invoiceData: TaxInvoiceData = {
        invoiceNumber,
        issueDate,
        dueDate,
        orderId: data.orderId,
        buyerTaxId: data.buyerTaxId,
        sellerTaxId: data.sellerTaxId,
        taxRate: data.taxRate,
        taxJurisdiction: data.taxJurisdiction,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        currency: data.currency,
        items: data.items,
      };

      // Store in database if available
      try {
        const invoiceRecord = {
          id: randomUUID(),
          invoiceNumber,
          invoiceType: 'tax',
          orderId: data.orderId,
          buyerId: data.buyerId,
          sellerId: data.sellerId,
          issueDate,
          dueDate,
          currency: data.currency,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          totalAmount: data.totalAmount,
          buyerTaxId: data.buyerTaxId,
          sellerTaxId: data.sellerTaxId,
          taxRate: data.taxRate,
          taxJurisdiction: data.taxJurisdiction,
          items: data.items,
          status: 'draft',
        };

        await this.databaseService.createInvoice(invoiceRecord);
        safeLogger.info(`Tax invoice created: ${invoiceNumber}`);
      } catch (dbError) {
        safeLogger.warn('Failed to store tax invoice in database:', dbError);
      }

      return invoiceData;
    } catch (error) {
      safeLogger.error('Error creating tax invoice:', error);
      throw error;
    }
  }

  /**
   * Create a seller invoice (commission statement)
   */
  async createSellerInvoice(data: {
    sellerId: string;
    sellerTaxId?: string;
    items: InvoiceItem[];
    subtotal: number; // Total gross sales
    taxAmount: number; // Commission deducted
    totalAmount: number; // Net amount for seller
    currency: string;
    issueDate?: Date;
    dueDate?: Date;
  }): Promise<SellerInvoiceData> {
    try {
      const invoiceNumber = this.generateInvoiceNumber('SELL-INV');
      const issueDate = data.issueDate || new Date();
      const dueDate = data.dueDate || new Date(issueDate.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days

      const invoiceData: SellerInvoiceData = {
        invoiceNumber,
        issueDate,
        dueDate,
        sellerId: data.sellerId,
        sellerTaxId: data.sellerTaxId,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        currency: data.currency,
        items: data.items,
      };

      // Store in database if available
      try {
        const invoiceRecord = {
          id: randomUUID(),
          invoiceNumber,
          invoiceType: 'seller',
          sellerId: data.sellerId,
          issueDate,
          dueDate,
          currency: data.currency,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          totalAmount: data.totalAmount,
          sellerTaxId: data.sellerTaxId,
          items: data.items,
          status: 'draft',
        };

        await this.databaseService.createInvoice(invoiceRecord);
        safeLogger.info(`Seller invoice created: ${invoiceNumber}`);
      } catch (dbError) {
        safeLogger.warn('Failed to store seller invoice in database:', dbError);
      }

      return invoiceData;
    } catch (error) {
      safeLogger.error('Error creating seller invoice:', error);
      throw error;
    }
  }

  /**
   * Generate and upload tax invoice PDF
   */
  async generateTaxInvoicePDF(invoiceData: TaxInvoiceData): Promise<{ s3Url: string; s3Key: string }> {
    try {
      // Ensure PDF generation service is initialized
      if (!pdfGenerationService) {
        await pdfGenerationService.initialize();
      }

      // Generate PDF and upload to S3
      const pdfResult = await pdfGenerationService.generateAndUploadPDF(
        'tax-invoice',
        invoiceData,
        `invoices/tax/${new Date(invoiceData.issueDate).getFullYear()}/${String(new Date(invoiceData.issueDate).getMonth() + 1).padStart(2, '0')}`
      );

      // Update invoice PDF URL in database
      try {
        await this.databaseService.updateInvoice(invoiceData.invoiceNumber, {
          pdfUrl: pdfResult.s3Url,
          pdfS3Key: pdfResult.s3Key,
        });
      } catch (dbError) {
        safeLogger.warn('Failed to update tax invoice PDF URL in database:', dbError);
      }

      safeLogger.info(`Tax invoice PDF generated: ${invoiceData.invoiceNumber}`);
      return pdfResult;
    } catch (error) {
      safeLogger.error('Error generating tax invoice PDF:', error);
      throw error;
    }
  }

  /**
   * Generate and upload seller invoice PDF
   */
  async generateSellerInvoicePDF(invoiceData: SellerInvoiceData): Promise<{ s3Url: string; s3Key: string }> {
    try {
      // Ensure PDF generation service is initialized
      if (!pdfGenerationService) {
        await pdfGenerationService.initialize();
      }

      // Generate PDF and upload to S3
      const pdfResult = await pdfGenerationService.generateAndUploadPDF(
        'seller-invoice',
        invoiceData,
        `invoices/seller/${new Date(invoiceData.issueDate).getFullYear()}/${String(new Date(invoiceData.issueDate).getMonth() + 1).padStart(2, '0')}`
      );

      // Update invoice PDF URL in database
      try {
        await this.databaseService.updateInvoice(invoiceData.invoiceNumber, {
          pdfUrl: pdfResult.s3Url,
          pdfS3Key: pdfResult.s3Key,
        });
      } catch (dbError) {
        safeLogger.warn('Failed to update seller invoice PDF URL in database:', dbError);
      }

      safeLogger.info(`Seller invoice PDF generated: ${invoiceData.invoiceNumber}`);
      return pdfResult;
    } catch (error) {
      safeLogger.error('Error generating seller invoice PDF:', error);
      throw error;
    }
  }

  /**
   * Get invoice by number
   */
  async getInvoiceByNumber(invoiceNumber: string): Promise<any> {
    try {
      return await this.databaseService.getInvoiceByNumber(invoiceNumber);
    } catch (error) {
      safeLogger.error('Error fetching invoice:', error);
      throw error;
    }
  }

  /**
   * Get invoices by seller ID
   */
  async getSellerInvoices(sellerId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      return await this.databaseService.getSellerInvoices(sellerId, limit, offset);
    } catch (error) {
      safeLogger.error('Error fetching seller invoices:', error);
      return [];
    }
  }

  /**
   * Get invoices by order ID
   */
  async getOrderInvoices(orderId: string): Promise<any[]> {
    try {
      return await this.databaseService.getOrderInvoices(orderId);
    } catch (error) {
      safeLogger.error('Error fetching order invoices:', error);
      return [];
    }
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(invoiceNumber: string, status: 'draft' | 'issued' | 'paid' | 'archived'): Promise<boolean> {
    try {
      await this.databaseService.updateInvoice(invoiceNumber, { status });
      safeLogger.info(`Invoice status updated: ${invoiceNumber} -> ${status}`);
      return true;
    } catch (error) {
      safeLogger.error('Error updating invoice status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const invoiceService = new InvoiceService();
