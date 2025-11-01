import dotenv from 'dotenv';
import { safeLogger } from '../utils/safeLogger';
import { X402PaymentService } from '../services/x402PaymentService';
import { safeLogger } from '../utils/safeLogger';

// Load environment variables
dotenv.config();

async function testX402() {
  safeLogger.info('CDP_API_KEY_ID:', process.env.CDP_API_KEY_ID ? 'Loaded' : 'Not found');
  safeLogger.info('CDP_API_KEY_SECRET:', process.env.CDP_API_KEY_SECRET ? 'Loaded' : 'Not found');
  
  const x402Service = new X402PaymentService();
  
  safeLogger.info('Testing x402 Payment Service...');
  
  // Test processPayment
  const paymentRequest = {
    orderId: 'test_order_123',
    amount: '100',
    currency: 'USD',
    buyerAddress: '0x1234567890123456789012345678901234567890',
    sellerAddress: '0x0987654321098765432109876543210987654321',
    listingId: 'test_listing_123'
  };
  
  try {
    safeLogger.info('Processing payment...');
    const paymentResult = await x402Service.processPayment(paymentRequest);
    safeLogger.info('Payment Result:', paymentResult);
    
    if (paymentResult.success) {
      safeLogger.info('Payment processed successfully!');
      safeLogger.info('Payment URL:', paymentResult.paymentUrl);
      safeLogger.info('Transaction ID:', paymentResult.transactionId);
      
      // Test checkPaymentStatus
      safeLogger.info('Checking payment status...');
      const statusResult = await x402Service.checkPaymentStatus(paymentResult.transactionId!);
      safeLogger.info('Status Result:', statusResult);
      
      // Test refundPayment
      safeLogger.info('Processing refund...');
      const refundResult = await x402Service.refundPayment(paymentResult.transactionId!);
      safeLogger.info('Refund Result:', refundResult);
    } else {
      safeLogger.info('Payment processing failed:', paymentResult.error);
    }
  } catch (error) {
    safeLogger.error('Error testing x402 payment service:', error);
  }
}

testX402();