/**
 * PDF Generation Service
 * Handles PDF generation from HTML templates using Puppeteer with browser pooling
 * Supports receipts, invoices, and other document generation
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import ejs from 'ejs';
import path from 'path';
import { safeLogger } from '../utils/safeLogger';
import { S3StorageService } from './s3StorageService';
import { randomUUID } from 'crypto';

export interface PDFGenerationOptions {
  format?: 'A4' | 'Letter';
  printBackground?: boolean;
  landscape?: boolean;
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

export interface PDFGenerationResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}

export class PdfGenerationService {
  private browser: Browser | null = null;
  private pagePool: Page[] = [];
  private maxConcurrentPages: number = 5;
  private isInitialized: boolean = false;
  private s3StorageService: S3StorageService;
  private templatesDir: string;
  private templateCache: Map<string, string> = new Map();

  constructor() {
    this.s3StorageService = new S3StorageService();
    this.templatesDir = path.join(__dirname, '../templates/pdf');
  }

  /**
   * Initialize the PDF generation service
   * Launches browser and creates page pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      safeLogger.info('[PDFService] Initializing PDF generation service...');

      const puppeteerTimeout = parseInt(process.env.PDF_GENERATION_TIMEOUT || '30000');
      const maxConcurrent = parseInt(process.env.PDF_MAX_CONCURRENT || '5');

      this.maxConcurrentPages = maxConcurrent;

      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-resources',
          '--disable-http2',
          '--single-process', // Use single process to reduce memory
        ],
        timeout: puppeteerTimeout,
      });

      // Pre-warm the page pool
      for (let i = 0; i < Math.min(2, this.maxConcurrentPages); i++) {
        const page = await this.browser.newPage();
        this.pagePool.push(page);
      }

      this.isInitialized = true;
      safeLogger.info(`[PDFService] Initialized successfully (max ${this.maxConcurrentPages} concurrent pages)`);
    } catch (error) {
      safeLogger.error('[PDFService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Get a page from the pool or create a new one
   */
  private async getPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('PDF generation service not initialized. Call initialize() first.');
    }

    if (this.pagePool.length > 0) {
      const page = this.pagePool.pop();
      if (page && !page.isClosed()) {
        return page;
      }
    }

    // Create a new page if pool is empty and we haven't hit max
    return await this.browser.newPage();
  }

  /**
   * Return a page to the pool
   */
  private releasePage(page: Page): void {
    if (this.pagePool.length < this.maxConcurrentPages && !page.isClosed()) {
      this.pagePool.push(page);
    } else {
      page.close().catch(err => safeLogger.warn('[PDFService] Error closing page:', err));
    }
  }

  /**
   * Load and cache EJS template
   */
  private async loadTemplate(templateName: string): Promise<string> {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.ejs`);
      const fs = await import('fs').then(m => m.promises);
      const template = await fs.readFile(templatePath, 'utf-8');
      this.templateCache.set(templateName, template);
      return template;
    } catch (error) {
      safeLogger.error(`[PDFService] Failed to load template ${templateName}:`, error);
      throw new Error(`Template not found: ${templateName}`);
    }
  }

  /**
   * Render an EJS template with data
   */
  private async renderTemplate(templateName: string, data: any): Promise<string> {
    try {
      const template = await this.loadTemplate(templateName);
      const html = ejs.render(template, data, {
        async: false,
        cache: true,
        filename: path.join(this.templatesDir, `${templateName}.ejs`),
      });
      return html;
    } catch (error) {
      safeLogger.error(`[PDFService] Failed to render template ${templateName}:`, error);
      throw error;
    }
  }

  /**
   * Generate a receipt PDF
   */
  async generateReceiptPDF(receiptData: any): Promise<PDFGenerationResult> {
    let page: Page | null = null;

    try {
      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      page = await this.getPage();

      // Render template
      const html = await this.renderTemplate('receipt', receiptData);

      // Set page content
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        landscape: false,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm',
        },
      });

      const filename = `Receipt-${receiptData.receiptNumber || Date.now()}.pdf`;
      const size = Buffer.byteLength(pdfBuffer);

      safeLogger.info(`[PDFService] Generated receipt PDF: ${filename} (${size} bytes)`);

      return {
        buffer: pdfBuffer,
        filename,
        mimeType: 'application/pdf',
        size,
      };
    } catch (error) {
      safeLogger.error('[PDFService] Error generating receipt PDF:', error);
      throw error;
    } finally {
      if (page) {
        this.releasePage(page);
      }
    }
  }

  /**
   * Generate a tax invoice PDF
   */
  async generateTaxInvoicePDF(invoiceData: any): Promise<PDFGenerationResult> {
    let page: Page | null = null;

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      page = await this.getPage();

      const html = await this.renderTemplate('tax-invoice', invoiceData);

      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        landscape: false,
        margin: {
          top: '15mm',
          bottom: '15mm',
          left: '10mm',
          right: '10mm',
        },
      });

      const filename = `TaxInvoice-${invoiceData.invoiceNumber || Date.now()}.pdf`;
      const size = Buffer.byteLength(pdfBuffer);

      safeLogger.info(`[PDFService] Generated tax invoice PDF: ${filename} (${size} bytes)`);

      return {
        buffer: pdfBuffer,
        filename,
        mimeType: 'application/pdf',
        size,
      };
    } catch (error) {
      safeLogger.error('[PDFService] Error generating tax invoice PDF:', error);
      throw error;
    } finally {
      if (page) {
        this.releasePage(page);
      }
    }
  }

  /**
   * Generate a seller invoice PDF
   */
  async generateSellerInvoicePDF(invoiceData: any): Promise<PDFGenerationResult> {
    let page: Page | null = null;

    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      page = await this.getPage();

      const html = await this.renderTemplate('seller-invoice', invoiceData);

      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        landscape: false,
        margin: {
          top: '15mm',
          bottom: '15mm',
          left: '10mm',
          right: '10mm',
        },
      });

      const filename = `SellerInvoice-${invoiceData.invoiceNumber || Date.now()}.pdf`;
      const size = Buffer.byteLength(pdfBuffer);

      safeLogger.info(`[PDFService] Generated seller invoice PDF: ${filename} (${size} bytes)`);

      return {
        buffer: pdfBuffer,
        filename,
        mimeType: 'application/pdf',
        size,
      };
    } catch (error) {
      safeLogger.error('[PDFService] Error generating seller invoice PDF:', error);
      throw error;
    } finally {
      if (page) {
        this.releasePage(page);
      }
    }
  }

  /**
   * Generate PDF and upload to S3
   */
  async generateAndUploadPDF(
    templateName: string,
    data: any,
    folderPath: string = 'documents'
  ): Promise<{ s3Url: string; s3Key: string; size: number }> {
    try {
      let pdfResult: PDFGenerationResult;

      // Generate appropriate PDF based on template
      switch (templateName) {
        case 'receipt':
          pdfResult = await this.generateReceiptPDF(data);
          break;
        case 'tax-invoice':
          pdfResult = await this.generateTaxInvoicePDF(data);
          break;
        case 'seller-invoice':
          pdfResult = await this.generateSellerInvoicePDF(data);
          break;
        default:
          throw new Error(`Unknown template: ${templateName}`);
      }

      // Upload to S3
      if (!this.s3StorageService.isAvailable()) {
        safeLogger.warn('[PDFService] S3 storage not available, returning buffer only');
        return {
          s3Url: '',
          s3Key: '',
          size: pdfResult.size,
        };
      }

      const uploadResult = await this.s3StorageService.uploadFile(
        pdfResult.buffer,
        {
          filename: pdfResult.filename,
          mimeType: pdfResult.mimeType,
          folder: folderPath,
        }
      );

      safeLogger.info(`[PDFService] Uploaded PDF to S3: ${uploadResult.s3Key}`);

      return {
        s3Url: uploadResult.cdnUrl || uploadResult.s3Url,
        s3Key: uploadResult.s3Key,
        size: pdfResult.size,
      };
    } catch (error) {
      safeLogger.error('[PDFService] Error generating and uploading PDF:', error);
      throw error;
    }
  }

  /**
   * Shutdown the service and clean up resources
   */
  async shutdown(): Promise<void> {
    try {
      // Close all pages in pool
      for (const page of this.pagePool) {
        if (!page.isClosed()) {
          await page.close();
        }
      }
      this.pagePool = [];

      // Close browser
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      this.isInitialized = false;
      safeLogger.info('[PDFService] Shutdown complete');
    } catch (error) {
      safeLogger.error('[PDFService] Error during shutdown:', error);
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    isInitialized: boolean;
    s3Available: boolean;
    poolSize: number;
    maxConcurrent: number;
  } {
    return {
      isInitialized: this.isInitialized,
      s3Available: this.s3StorageService.isAvailable(),
      poolSize: this.pagePool.length,
      maxConcurrent: this.maxConcurrentPages,
    };
  }
}

// Export singleton instance
export const pdfGenerationService = new PdfGenerationService();
