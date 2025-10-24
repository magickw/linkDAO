import { marketplaceController } from '../controllers/marketplaceController';
import { ProductService } from '../services/productService';
import { sellerService } from '../services/sellerService';

async function testMarketplaceController() {
  console.log('Testing Marketplace Controller...');
  
  try {
    // Test getting listings (should return empty since no products exist)
    console.log('Testing getListings...');
    const mockReq = {
      query: {
        page: '1',
        limit: '10'
      }
    };
    
    const mockRes = {
      json: (data: any) => {
        console.log('getListings response:', JSON.stringify(data, null, 2));
      },
      status: function(code: number) {
        console.log('Response status:', code);
        return this;
      }
    };
    
    // @ts-ignore - Mock request/response objects
    await marketplaceController.getListings(mockReq, mockRes);
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testMarketplaceController();