import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/databaseService';
import { safeLogger } from '../utils/safeLogger';
import { authMiddleware } from '../middleware/authMiddleware';
import * as schema from '../db/schema';
import { eq, or, and, desc } from 'drizzle-orm';

const router = Router();
const databaseService = new DatabaseService();

/**
 * @route GET /api/documents
 * @desc Get all user documents (receipts, purchase orders, invoices)
 * @access Private
 */
router.get('/documents', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const db = databaseService.getDatabase();

    // 1. Fetch Receipts
    const receipts = await db.select()
      .from(schema.orderReceipts)
      .innerJoin(schema.orders, eq(schema.orderReceipts.orderId, schema.orders.id))
      .where(or(
        eq(schema.orders.buyerId, userId),
        eq(schema.orders.sellerId, userId)
      ))
      .orderBy(desc(schema.orderReceipts.createdAt));

    // 2. Fetch Purchase Orders
    const purchaseOrders = await db.select()
      .from(schema.purchaseOrders)
      .where(or(
        eq(schema.purchaseOrders.buyerId, userId),
        eq(schema.purchaseOrders.sellerId, userId)
      ))
      .orderBy(desc(schema.purchaseOrders.createdAt));

    // 3. Fetch Invoices
    const invoices = await db.select()
      .from(schema.invoices)
      .where(or(
        eq(schema.invoices.buyerId, userId),
        eq(schema.invoices.sellerId, userId)
      ))
      .orderBy(desc(schema.invoices.createdAt));

    // Format combined response
    const documents = [
      ...receipts.map(r => ({
        id: r.order_receipts.id,
        type: 'RECEIPT',
        number: r.order_receipts.receiptNumber,
        date: r.order_receipts.createdAt,
        total: r.order_receipts.pricing ? (r.order_receipts.pricing as any).total : '0',
        pdfUrl: r.order_receipts.pdfUrl,
        orderId: r.order_receipts.orderId,
        status: 'completed'
      })),
      ...purchaseOrders.map(po => ({
        id: po.id,
        type: 'PURCHASE_ORDER',
        number: po.poNumber,
        date: po.issueDate,
        total: po.totalAmount,
        pdfUrl: po.pdfUrl,
        orderId: po.orderId,
        status: po.status
      })),
      ...invoices.map(inv => ({
        id: inv.id,
        type: inv.invoiceType === 'tax' ? 'TAX_INVOICE' : 'SELLER_INVOICE',
        number: inv.invoiceNumber,
        date: inv.issueDate,
        total: inv.totalAmount,
        pdfUrl: inv.pdfUrl,
        orderId: inv.orderId,
        status: inv.status
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    safeLogger.error('Error fetching user documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
