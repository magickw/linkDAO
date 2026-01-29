/**
 * Invoice Routes
 * REST API endpoints for invoice management and generation
 */

import { Router, Request, Response } from 'express';
import { invoiceService } from '../services/invoiceService';
import { pdfGenerationService } from '../services/pdfGenerationService';
import { emailService } from '../services/emailService';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

/**
 * POST /api/invoices/generate-tax
 * Generate a tax invoice
 */
router.post('/generate-tax', async (req: Request, res: Response) => {
  try {
    const {
      orderId,
      buyerId,
      sellerId,
      buyerTaxId,
      sellerTaxId,
      taxRate,
      taxJurisdiction,
      items,
      subtotal,
      taxAmount,
      totalAmount,
      currency,
      issueDate,
      dueDate,
    } = req.body;

    // Validate required fields
    if (!orderId || !taxRate || !items || !subtotal || !totalAmount) {
      return res.status(400).json({
        error: 'Missing required fields: orderId, taxRate, items, subtotal, totalAmount',
      });
    }

    // Create tax invoice
    const invoiceData = await invoiceService.createTaxInvoice({
      orderId,
      buyerId,
      sellerId,
      buyerTaxId,
      sellerTaxId,
      taxRate,
      taxJurisdiction: taxJurisdiction || 'Global',
      items,
      subtotal,
      taxAmount: taxAmount || (subtotal * (taxRate / 100)),
      totalAmount,
      currency: currency || 'USD',
      issueDate: issueDate ? new Date(issueDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    // Generate PDF
    const pdfResult = await invoiceService.generateTaxInvoicePDF(invoiceData);

    res.status(201).json({
      success: true,
      invoiceNumber: invoiceData.invoiceNumber,
      pdfUrl: pdfResult.s3Url,
      message: 'Tax invoice generated successfully',
    });
  } catch (error) {
    safeLogger.error('[InvoiceRoutes] Error generating tax invoice:', error);
    res.status(500).json({
      error: 'Failed to generate tax invoice',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/invoices/generate-seller
 * Generate a seller commission invoice
 */
router.post('/generate-seller', async (req: Request, res: Response) => {
  try {
    const {
      sellerId,
      sellerTaxId,
      items,
      subtotal,
      taxAmount,
      totalAmount,
      currency,
      issueDate,
      dueDate,
    } = req.body;

    // Validate required fields
    if (!sellerId || !items || !subtotal || !totalAmount) {
      return res.status(400).json({
        error: 'Missing required fields: sellerId, items, subtotal, totalAmount',
      });
    }

    // Create seller invoice
    const invoiceData = await invoiceService.createSellerInvoice({
      sellerId,
      sellerTaxId,
      items,
      subtotal,
      taxAmount: taxAmount || 0,
      totalAmount,
      currency: currency || 'USD',
      issueDate: issueDate ? new Date(issueDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    // Generate PDF
    const pdfResult = await invoiceService.generateSellerInvoicePDF(invoiceData);

    res.status(201).json({
      success: true,
      invoiceNumber: invoiceData.invoiceNumber,
      pdfUrl: pdfResult.s3Url,
      message: 'Seller invoice generated successfully',
    });
  } catch (error) {
    safeLogger.error('[InvoiceRoutes] Error generating seller invoice:', error);
    res.status(500).json({
      error: 'Failed to generate seller invoice',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/invoices/:invoiceNumber
 * Get invoice by number
 */
router.get('/:invoiceNumber', async (req: Request, res: Response) => {
  try {
    const { invoiceNumber } = req.params;

    const invoice = await invoiceService.getInvoiceByNumber(invoiceNumber);
    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
      });
    }

    res.json(invoice);
  } catch (error) {
    safeLogger.error('[InvoiceRoutes] Error fetching invoice:', error);
    res.status(500).json({
      error: 'Failed to fetch invoice',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/invoices/seller/:sellerId
 * Get all invoices for a seller (paginated)
 */
router.get('/seller/:sellerId', async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const invoices = await invoiceService.getSellerInvoices(sellerId, limit, offset);

    res.json({
      invoices,
      limit,
      offset,
      total: invoices.length,
    });
  } catch (error) {
    safeLogger.error('[InvoiceRoutes] Error fetching seller invoices:', error);
    res.status(500).json({
      error: 'Failed to fetch invoices',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/invoices/order/:orderId
 * Get all invoices for an order
 */
router.get('/order/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const invoices = await invoiceService.getOrderInvoices(orderId);

    res.json({
      invoices,
      total: invoices.length,
    });
  } catch (error) {
    safeLogger.error('[InvoiceRoutes] Error fetching order invoices:', error);
    res.status(500).json({
      error: 'Failed to fetch invoices',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PATCH /api/invoices/:invoiceNumber/status
 * Update invoice status
 */
router.patch('/:invoiceNumber/status', async (req: Request, res: Response) => {
  try {
    const { invoiceNumber } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['draft', 'issued', 'paid', 'archived'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: draft, issued, paid, archived',
      });
    }

    const success = await invoiceService.updateInvoiceStatus(invoiceNumber, status);
    if (!success) {
      return res.status(500).json({
        error: 'Failed to update invoice status',
      });
    }

    res.json({
      success: true,
      invoiceNumber,
      status,
      message: 'Invoice status updated successfully',
    });
  } catch (error) {
    safeLogger.error('[InvoiceRoutes] Error updating invoice status:', error);
    res.status(500).json({
      error: 'Failed to update invoice status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/invoices/:invoiceNumber/send
 * Send invoice email
 */
router.post('/:invoiceNumber/send', async (req: Request, res: Response) => {
  try {
    const { invoiceNumber } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email address is required',
      });
    }

    const invoice = await invoiceService.getInvoiceByNumber(invoiceNumber);
    if (!invoice) {
      return res.status(404).json({
        error: 'Invoice not found',
      });
    }

    // Check if PDF exists
    if (!invoice.pdf_url) {
      return res.status(400).json({
        error: 'Invoice PDF not available. Please generate PDF first.',
      });
    }

    // Send email with link to invoice
    const emailSent = await emailService.sendEmail({
      to: email,
      subject: `Invoice ${invoiceNumber} from LinkDAO`,
      html: `
        <p>Dear Customer,</p>
        <p>Please find attached your invoice <strong>${invoiceNumber}</strong>.</p>
        <p><a href="${invoice.pdf_url}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View Invoice PDF</a></p>
        <p>If you have any questions, please contact us at support@linkdao.io</p>
        <p>Best regards,<br>LinkDAO Team</p>
      `,
    });

    if (!emailSent) {
      return res.status(500).json({
        error: 'Failed to send email',
      });
    }

    res.json({
      success: true,
      invoiceNumber,
      message: 'Invoice email sent successfully',
    });
  } catch (error) {
    safeLogger.error('[InvoiceRoutes] Error sending invoice email:', error);
    res.status(500).json({
      error: 'Failed to send invoice email',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/invoices/:invoiceNumber/download
 * Download invoice PDF
 */
router.get('/:invoiceNumber/download', async (req: Request, res: Response) => {
  try {
    const { invoiceNumber } = req.params;

    const invoice = await invoiceService.getInvoiceByNumber(invoiceNumber);
    if (!invoice || !invoice.pdf_url) {
      return res.status(404).json({
        error: 'Invoice PDF not found',
      });
    }

    // Redirect to S3 URL
    res.redirect(invoice.pdf_url);
  } catch (error) {
    safeLogger.error('[InvoiceRoutes] Error downloading invoice:', error);
    res.status(500).json({
      error: 'Failed to download invoice',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
