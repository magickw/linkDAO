import { ReceiptService } from '../services/receiptService';
import { ReceiptType, ReceiptStatus } from '../types/receipt';

describe('ReceiptService', () => {
  let receiptService: ReceiptService;

  beforeEach(() => {
    receiptService = new ReceiptService();
  });

  describe('generateMarketplaceReceipt', () => {
    it('should generate a marketplace receipt successfully', async () => {
      const receiptData = {
        orderId: 'order_123',
        transactionId: 'txn_456',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        amount: '100.00',
        currency: 'USDC',
        paymentMethod: 'crypto',
        transactionHash: '0xabcdef1234567890',
        status: ReceiptStatus.COMPLETED,
        items: [
          {
            id: 'item_1',
            name: 'Test Product',
            quantity: 2,
            unitPrice: '50.00',
            totalPrice: '100.00'
          }
        ],
        fees: {
          processing: '1.00',
          platform: '2.00',
          gas: '0.50',
          total: '3.50'
        },
        sellerAddress: '0x0987654321098765432109876543210987654321',
        sellerName: 'Test Seller',
        createdAt: new Date(),
        completedAt: new Date()
      };

      const receipt = await receiptService.generateMarketplaceReceipt(receiptData);
      
      expect(receipt).toBeDefined();
      expect(receipt.type).toBe(ReceiptType.MARKETPLACE);
      expect(receipt.orderId).toBe(receiptData.orderId);
      expect(receipt.receiptNumber).toMatch(/^MKT-/);
      expect(receipt.downloadUrl).toContain('/receipts/marketplace/');
    });
  });

  describe('generateLDAOPurchaseReceipt', () => {
    it('should generate an LDAO purchase receipt successfully', async () => {
      const receiptData = {
        transactionId: 'txn_789',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        amount: '50.00',
        currency: 'USDC',
        paymentMethod: 'crypto',
        transactionHash: '0x9876543210abcdef',
        status: ReceiptStatus.COMPLETED,
        fees: {
          processing: '0.50',
          platform: '1.00',
          gas: '0.25',
          total: '1.75'
        },
        createdAt: new Date(),
        completedAt: new Date(),
        metadata: {
          tokensPurchased: '1000',
          pricePerToken: '0.05'
        }
      };

      const receipt = await receiptService.generateLDAOPurchaseReceipt(receiptData);
      
      expect(receipt).toBeDefined();
      expect(receipt.type).toBe(ReceiptType.LDAO_TOKEN);
      expect(receipt.tokensPurchased).toBe('1000');
      expect(receipt.receiptNumber).toMatch(/^LDAO-/);
      expect(receipt.downloadUrl).toContain('/receipts/ldao_token/');
    });
  });
});