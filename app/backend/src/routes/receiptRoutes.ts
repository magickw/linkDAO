import { Router, Request, Response } from 'express';
import { ReceiptService } from '../services/receiptService';
import { safeLogger } from '../utils/safeLogger';

const router = Router();
const receiptService = new ReceiptService();

// Get receipt by ID
router.get('/receipts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Receipt ID is required' });
    }

    const receipt = await receiptService.getReceiptById(id);
    
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json({ receipt });
  } catch (error) {
    safeLogger.error('Error getting receipt by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get receipts by user address
router.get('/receipts', async (req: Request, res: Response) => {
  try {
    const { userAddress, limit = '50', offset = '0' } = req.query;
    
    if (!userAddress || typeof userAddress !== 'string') {
      return res.status(400).json({ error: 'User address is required' });
    }

    const receipts = await receiptService.getReceiptsByUser(
      userAddress, 
      parseInt(limit as string), 
      parseInt(offset as string)
    );
    
    res.json({ receipts });
  } catch (error) {
    safeLogger.error('Error getting receipts by user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get receipts by order ID
router.get('/receipts/order/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const receipts = await receiptService.getReceiptsByOrderId(orderId);
    
    res.json({ receipts });
  } catch (error) {
    safeLogger.error('Error getting receipts by order ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate receipt PDF
router.get('/receipts/:id/pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Receipt ID is required' });
    }

    // In a real implementation, this would generate and return a PDF
    // For now, we'll return a mock PDF download URL
    const pdfUrl = await receiptService.generateReceiptPDF(id);
    
    res.redirect(pdfUrl);
  } catch (error) {
    safeLogger.error('Error generating receipt PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send receipt email
router.post('/receipts/send-email', async (req: Request, res: Response) => {
  try {
    const { email, orderId, goldAmount, totalCost, paymentMethod, network, transactionHash } = req.body;
    
    if (!email || !orderId || !goldAmount || !totalCost || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { emailService } = await import('../services/emailService');
    
    const success = await emailService.sendPurchaseReceiptEmail(email, {
      orderId,
      goldAmount,
      totalCost,
      paymentMethod,
      network,
      transactionHash,
      timestamp: new Date()
    });
    
    if (success) {
      res.json({ success: true, message: 'Receipt sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send receipt' });
    }
  } catch (error) {
    safeLogger.error('Error sending receipt email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;