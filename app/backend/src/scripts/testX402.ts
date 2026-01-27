#!/usr/bin/env node

/**
 * Test script for x402 Payment Service
 * This script tests the x402 payment service functionality
 */

import { X402PaymentService } from '../services/x402PaymentService';

async function testX402Service() {
  console.log('🧪 Testing x402 Payment Service...\n');
  
  const x402Service = new X402PaymentService();
  
  // Test service status
  const status = x402Service.getStatus();
  console.log('📊 Service Status:', status);
  
  // Test payment processing
  console.log('\n💳 Testing Payment Processing...');
  const paymentRequest = {
    orderId: 'test_order_123',
    amount: '99.99',
    currency: 'USD',
    buyerAddress: '0x1234567890123456789012345678901234567890',
    sellerAddress: '0x0987654321098765432109876543210987654321',
    listingId: 'test_listing_123'
  };
  
  try {
    const paymentResult = await x402Service.processPayment(paymentRequest);
    console.log('✅ Payment Processing Result:', paymentResult);
    
    if (paymentResult.success && paymentResult.transactionId) {
      // Test payment status check
      console.log('\n🔍 Testing Payment Status Check...');
      const statusResult = await x402Service.checkPaymentStatus(paymentResult.transactionId);
      console.log('✅ Payment Status Result:', statusResult);
      
      // Test refund processing
      console.log('\n💰 Testing Refund Processing...');
      const refundResult = await x402Service.refundPayment(paymentResult.transactionId);
      console.log('✅ Refund Processing Result:', refundResult);
    }
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
  
  console.log('\n🏁 x402 Payment Service test completed.');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testX402Service().catch(console.error);
}

export { testX402Service };