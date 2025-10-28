import dotenv from 'dotenv';
import { X402PaymentService } from '../services/x402PaymentService';

// Load environment variables
dotenv.config();

async function testX402() {
  console.log('CDP_API_KEY_ID:', process.env.CDP_API_KEY_ID ? 'Loaded' : 'Not found');
  console.log('CDP_API_KEY_SECRET:', process.env.CDP_API_KEY_SECRET ? 'Loaded' : 'Not found');
  
  const x402Service = new X402PaymentService();
  
  console.log('Testing x402 Payment Service...');
  
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
    console.log('Processing payment...');
    const paymentResult = await x402Service.processPayment(paymentRequest);
    console.log('Payment Result:', paymentResult);
    
    if (paymentResult.success) {
      console.log('Payment processed successfully!');
      console.log('Payment URL:', paymentResult.paymentUrl);
      console.log('Transaction ID:', paymentResult.transactionId);
      
      // Test checkPaymentStatus
      console.log('Checking payment status...');
      const statusResult = await x402Service.checkPaymentStatus(paymentResult.transactionId!);
      console.log('Status Result:', statusResult);
      
      // Test refundPayment
      console.log('Processing refund...');
      const refundResult = await x402Service.refundPayment(paymentResult.transactionId!);
      console.log('Refund Result:', refundResult);
    } else {
      console.log('Payment processing failed:', paymentResult.error);
    }
  } catch (error) {
    console.error('Error testing x402 payment service:', error);
  }
}

testX402();