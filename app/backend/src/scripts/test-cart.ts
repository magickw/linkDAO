import { cartService } from '../services/cartService';
import { safeLogger } from '../utils/safeLogger';
import { AuthenticatedUser } from '../middleware/authMiddleware';

async function testCartService() {
  safeLogger.info('Testing Cart Service...');

  // Mock authenticated user
  const mockUser: AuthenticatedUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    address: '0x1234567890123456789012345678901234567890',
    walletAddress: '0x1234567890123456789012345678901234567890',
  };

  try {
    // Test getting or creating a cart
    safeLogger.info('1. Testing getOrCreateCart...');
    const cart = await cartService.getOrCreateCart(mockUser);
    safeLogger.info('✅ Cart created/retrieved:', {
      id: cart.id,
      userId: cart.userId,
      status: cart.status,
      totalItems: cart.totalItems,
      totalAmount: cart.totalAmount,
    });

    safeLogger.info('✅ Cart service test completed successfully!');
  } catch (error) {
    safeLogger.error('❌ Cart service test failed:', error);
  }
}

testCartService();
