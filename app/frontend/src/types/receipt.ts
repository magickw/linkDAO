export enum ReceiptType {
  MARKETPLACE = 'marketplace',
  LDAO_TOKEN = 'ldao_token'
}

export enum ReceiptStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface BaseReceipt {
  id: string;
  type: ReceiptType;
  transactionId?: string;
  buyerAddress: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  transactionHash?: string;
  status: ReceiptStatus;
  receiptNumber: string;
  downloadUrl: string;
  createdAt: Date;
  completedAt?: Date;
  metadata?: any;
}

export interface MarketplaceReceipt extends BaseReceipt {
  type: ReceiptType.MARKETPLACE;
  orderId?: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
  fees?: {
    processing: string;
    platform: string;
    gas?: string;
    total: string;
  };
  sellerAddress?: string;
  sellerName?: string;
}

export interface LDAOPurchaseReceipt extends BaseReceipt {
  type: ReceiptType.LDAO_TOKEN;
  fees?: {
    processing: string;
    platform: string;
    gas?: string;
    total: string;
  };
  tokensPurchased: string;
  pricePerToken: string;
}

export type PaymentReceipt = MarketplaceReceipt | LDAOPurchaseReceipt;