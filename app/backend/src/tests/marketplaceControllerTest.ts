import { marketplaceController } from '../controllers/marketplaceController';
import { safeLogger } from '../utils/safeLogger';
import { ProductService } from '../services/productService';
import { sellerService } from '../services/sellerService';

async function testMarketplaceController() {
  safeLogger.info('Testing Marketplace Controller...');
  
  try {
    // Test getting listings (should return empty since no products exist)
    safeLogger.info('Testing getListings...');
    const mockReq = {
      query: {
        page: '1',
        limit: '10'
      }
    };
    
    const mockRes = {
      json: (data: any) => {
        safeLogger.info('getListings response:', JSON.stringify(data, null, 2));
      },
      status: function(code: number) {
        safeLogger.info('Response status:', code);
        return this;
      }
    };
    
    // @ts-ignore - Mock request/response objects
    await marketplaceController.getListings(mockReq, mockRes);
    
    safeLogger.info('Test completed successfully');
  } catch (error) {
    safeLogger.error('Test failed:', error);
  }
}

testMarketplaceController();
