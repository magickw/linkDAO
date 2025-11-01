import { receiptService } from '../receiptService';
import { ReceiptType, ReceiptStatus } from '../../types/receipt';

// Mock fetch globally
global.fetch = jest.fn();

describe('receiptService', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('getReceiptById', () => {
    it('should fetch a receipt by ID successfully', async () => {
      const mockReceipt = {
        id: 'receipt_123',
        type: ReceiptType.MARKETPLACE,
        orderId: 'order_123',
        transactionId: 'txn_456',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        amount: '100.00',
        currency: 'USDC',
        paymentMethod: 'crypto',
        transactionHash: '0xabcdef1234567890',
        status: ReceiptStatus.COMPLETED,
        receiptNumber: 'MKT-123456-ABCD',
        downloadUrl: 'http://localhost:3000/receipts/marketplace/receipt_123',
        createdAt: '2023-01-01T00:00:00.000Z',
        completedAt: '2023-01-01T00:05:00.000Z',
        items: [
          {
            id: 'item_1',
            name: 'Test Product',
            quantity: 2,
            unitPrice: '50.00',
            totalPrice: '100.00'
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ receipt: mockReceipt })
      });

      const receipt = await receiptService.getReceiptById('receipt_123');
      
      expect(receipt).toEqual({
        ...mockReceipt,
        createdAt: new Date(mockReceipt.createdAt),
        completedAt: new Date(mockReceipt.completedAt)
      });
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/receipts/receipt_123',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        }
      );
    });

    it('should return null when receipt is not found', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const receipt = await receiptService.getReceiptById('nonexistent');
      
      expect(receipt).toBeNull();
    });
  });

  describe('getReceiptsByUser', () => {
    it('should fetch receipts by user address', async () => {
      const mockReceipts = [
        {
          id: 'receipt_123',
          type: ReceiptType.MARKETPLACE,
          orderId: 'order_123',
          transactionId: 'txn_456',
          buyerAddress: '0x1234567890123456789012345678901234567890',
          amount: '100.00',
          currency: 'USDC',
          paymentMethod: 'crypto',
          transactionHash: '0xabcdef1234567890',
          status: ReceiptStatus.COMPLETED,
          receiptNumber: 'MKT-123456-ABCD',
          downloadUrl: 'http://localhost:3000/receipts/marketplace/receipt_123',
          createdAt: '2023-01-01T00:00:00.000Z'
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ receipts: mockReceipts })
      });

      const receipts = await receiptService.getReceiptsByUser(
        '0x1234567890123456789012345678901234567890'
      );
      
      expect(receipts).toHaveLength(1);
      expect(receipts[0]).toEqual({
        ...mockReceipts[0],
        createdAt: new Date(mockReceipts[0].createdAt)
      });
    });
  });

  describe('printReceipt', () => {
    it('should open a print window for marketplace receipts', () => {
      const mockReceipt = {
        id: 'receipt_123',
        type: ReceiptType.MARKETPLACE,
        orderId: 'order_123',
        transactionId: 'txn_456',
        buyerAddress: '0x1234567890123456789012345678901234567890',
        amount: '100.00',
        currency: 'USDC',
        paymentMethod: 'crypto',
        transactionHash: '0xabcdef1234567890',
        status: ReceiptStatus.COMPLETED,
        receiptNumber: 'MKT-123456-ABCD',
        downloadUrl: 'http://localhost:3000/receipts/marketplace/receipt_123',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        items: [
          {
            id: 'item_1',
            name: 'Test Product',
            quantity: 2,
            unitPrice: '50.00',
            totalPrice: '100.00'
          }
        ]
      };

      // Mock window.open
      const mockPrintWindow = {
        document: {
          write: jest.fn(),
          close: jest.fn()
        },
        focus: jest.fn(),
        print: jest.fn()
      };
      
      global.open = jest.fn().mockReturnValue(mockPrintWindow);

      receiptService.printReceipt(mockReceipt);
      
      expect(global.open).toHaveBeenCalledWith('', '_blank');
      expect(mockPrintWindow.document.write).toHaveBeenCalled();
      expect(mockPrintWindow.focus).toHaveBeenCalled();
    });
  });
});