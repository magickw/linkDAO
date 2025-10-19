import { cartService } from '../services/cartService';
import { AuthenticatedUser } from '../middleware/authMiddleware';

async function testCartService() {
  console.log('Testing Cart Service...');

  // Mock authenticated user
  const mockUser: AuthenticatedUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    address: '0x1234567890123456789012345678901234567890',
    walletAddress: '0x1234567890123456789012345678901234567890',
  };

  try {
    // Test getting or creating a cart
    console.log('1. Testing getOrCreateCart...');
    const cart = await cartService.getOrCreateCart(mockUser);
    console.log('✅ Cart created/retrieved:', {
      id: cart.id,
      userId: cart.userId,
      status: cart.status,
      totalItems: cart.totalItems,
      totalAmount: cart.totalAmount,
    });

    console.log('✅ Cart service test completed successfully!');
  } catch (error) {
    console.error('❌ Cart service test failed:', error);
  }
}

testCartService();