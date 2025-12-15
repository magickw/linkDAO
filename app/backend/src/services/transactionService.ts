import { eq, and, desc, sql, gte, lte, count } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { 
  sellerTransactions,
  paymentTransactions,
  orders,
  marketplaceListings,
  users,
  sellers,
  userReputation
} from '../db/schema';

export interface TransactionRecord {
  id: string;
  type: 'sale' | 'purchase' | 'escrow_deposit' | 'escrow_release' | 'fee_payment' | 'withdrawal';
  amount: string;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  counterpartyAddress?: string;
  counterpartyName?: string;
  orderId?: string;
  orderTitle?: string;
  transactionHash?: string;
  paymentMethod: 'crypto' | 'fiat' | 'escrow';
  description: string;
  metadata?: any;
  createdAt: string;
  confirmedAt?: string;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalVolume: string;
  totalSales: string;
  totalPurchases: string;
  totalFees: string;
  averageTransactionValue: string;
  successRate: number;
  pendingTransactions: number;
  recentTransactions: TransactionRecord[];
}

export interface TransactionAnalytics {
  dailyVolume: Array<{ date: string; volume: string; count: number }>;
  monthlyVolume: Array<{ month: string; volume: string; count: number }>;
  transactionsByType: Array<{ type: string; count: number; volume: string }>;
  transactionsByStatus: Array<{ status: string; count: number; percentage: number }>;
  topCounterparties: Array<{ address: string; name?: string; volume: string; count: number }>;
  averageTransactionSize: string;
  peakTransactionHours: Array<{ hour: number; count: number }>;
}

class TransactionService {
  
  /**
   * Record a new transaction
   */
  async recordTransaction(
    walletAddress: string,
    type: TransactionRecord['type'],
    amount: string,
    currency: string,
    counterpartyAddress?: string,
    orderId?: string,
    transactionHash?: string,
    metadata?: any
  ): Promise<TransactionRecord> {
    try {
      // Insert into seller_transactions table
      const result = await db.insert(sellerTransactions).values({
        sellerWalletAddress: walletAddress,
        transactionType: type,
        amount,
        currency,
        counterpartyAddress,
        transactionHash,
        createdAt: new Date(),
      }).returning();

      const transaction = result[0];

      // Get additional data for the response
      let counterpartyName: string | undefined;
      let orderTitle: string | undefined;

      if (counterpartyAddress) {
        const counterparty = await db
          .select({ storeName: sellers.storeName })
          .from(sellers)
          .where(eq(sellers.walletAddress, counterpartyAddress))
          .limit(1);
        
        if (counterparty.length > 0) {
          counterpartyName = counterparty[0].storeName || undefined;
        }
      }

      if (orderId) {
        const order = await db
          .select({ 
            title: marketplaceListings.title
          })
          .from(orders)
          .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
          .where(eq(orders.id, parseInt(orderId)))
          .limit(1);

        if (order.length > 0) {
          orderTitle = order[0].title || 'Unknown Item';
        }
      }

      return {
        id: transaction.id.toString(),
        type,
        amount,
        currency,
        status: 'completed', // Default status for recorded transactions
        counterpartyAddress,
        counterpartyName,
        orderId,
        orderTitle,
        transactionHash,
        paymentMethod: type.includes('escrow') ? 'escrow' : 'crypto',
        description: this.generateTransactionDescription(type, amount, currency, counterpartyName, orderTitle),
        metadata,
        createdAt: transaction.createdAt.toISOString(),
      };
    } catch (error) {
      safeLogger.error('Error recording transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a wallet address
   */
  async getTransactionHistory(
    walletAddress: string,
    limit: number = 50,
    offset: number = 0,
    type?: TransactionRecord['type'],
    startDate?: Date,
    endDate?: Date
  ): Promise<TransactionRecord[]> {
    try {
      let query = db
        .select({
          id: sellerTransactions.id,
          type: sellerTransactions.transactionType,
          amount: sellerTransactions.amount,
          currency: sellerTransactions.currency,
          counterpartyAddress: sellerTransactions.counterpartyAddress,
          transactionHash: sellerTransactions.transactionHash,
          createdAt: sellerTransactions.createdAt,
        })
        .from(sellerTransactions)
        .where(eq(sellerTransactions.sellerWalletAddress, walletAddress));

      // Add filters






      const transactions = await query
        .orderBy(desc(sellerTransactions.createdAt))
        .limit(limit)
        .offset(offset);

      // Enrich transactions with additional data
      const enrichedTransactions: TransactionRecord[] = [];

      for (const tx of transactions) {
        let counterpartyName: string | undefined;
        let orderId: string | undefined;
        let orderTitle: string | undefined;

        // Get counterparty name
        if (tx.counterpartyAddress) {
          const counterparty = await db
            .select({ storeName: sellers.storeName })
            .from(sellers)
            .where(eq(sellers.walletAddress, tx.counterpartyAddress))
            .limit(1);
          
          if (counterparty.length > 0) {
            counterpartyName = counterparty[0].storeName || undefined;
          }
        }

        // Try to find related order
        if (tx.transactionHash) {
          const relatedOrder = await db
            .select({ 
              orderId: orders.id,
              title: marketplaceListings.title
            })
            .from(orders)
            .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
            .where(eq(orders.paymentConfirmationHash, tx.transactionHash))
            .limit(1);

          if (relatedOrder.length > 0) {
            orderId = relatedOrder[0].orderId.toString();
            orderTitle = relatedOrder[0].title || 'Unknown Item';
          }
        }

        enrichedTransactions.push({
          id: tx.id.toString(),
          type: tx.type as TransactionRecord['type'],
          amount: tx.amount,
          currency: tx.currency,
          status: 'completed',
          counterpartyAddress: tx.counterpartyAddress || undefined,
          counterpartyName,
          orderId,
          orderTitle,
          transactionHash: tx.transactionHash || undefined,
          paymentMethod: tx.type.includes('escrow') ? 'escrow' : 'crypto',
          description: this.generateTransactionDescription(
            tx.type as TransactionRecord['type'], 
            tx.amount, 
            tx.currency, 
            counterpartyName, 
            orderTitle
          ),
          createdAt: tx.createdAt.toISOString(),
        });
      }

      return enrichedTransactions;
    } catch (error) {
      safeLogger.error('Error getting transaction history:', error);
      throw error;
    }
  }

  /**
   * Get transaction summary for a wallet address
   */
  async getTransactionSummary(walletAddress: string, days: number = 30): Promise<TransactionSummary> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get transaction statistics
      const stats = await db
        .select({
          totalTransactions: count(),
          totalVolume: sql<string>`coalesce(sum(cast(amount as decimal)), 0)`,
          totalSales: sql<string>`coalesce(sum(cast(amount as decimal)) filter (where transaction_type = 'sale'), 0)`,
          totalPurchases: sql<string>`coalesce(sum(cast(amount as decimal)) filter (where transaction_type = 'purchase'), 0)`,
          totalFees: sql<string>`coalesce(sum(cast(amount as decimal)) filter (where transaction_type = 'fee_payment'), 0)`,
          averageTransactionValue: sql<string>`coalesce(avg(cast(amount as decimal)), 0)`,
          pendingTransactions: sql<number>`count(*) filter (where created_at > current_timestamp - interval '1 hour')`,
        })
        .from(sellerTransactions)
        .where(and(
          eq(sellerTransactions.sellerWalletAddress, walletAddress),
          gte(sellerTransactions.createdAt, startDate)
        ));

      const summary = stats[0];

      // Calculate success rate (assuming all recorded transactions are successful for now)
      const successRate = summary.totalTransactions > 0 ? 100 : 0;

      // Get recent transactions
      const recentTransactions = await this.getTransactionHistory(walletAddress, 10);

      return {
        totalTransactions: summary.totalTransactions,
        totalVolume: summary.totalVolume,
        totalSales: summary.totalSales,
        totalPurchases: summary.totalPurchases,
        totalFees: summary.totalFees,
        averageTransactionValue: summary.averageTransactionValue,
        successRate,
        pendingTransactions: summary.pendingTransactions,
        recentTransactions,
      };
    } catch (error) {
      safeLogger.error('Error getting transaction summary:', error);
      throw error;
    }
  }

  /**
   * Get detailed transaction analytics
   */
  async getTransactionAnalytics(walletAddress: string, days: number = 90): Promise<TransactionAnalytics> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Daily volume
      const dailyVolume = await db
        .select({
          date: sql<string>`date(created_at)`,
          volume: sql<string>`coalesce(sum(cast(amount as decimal)), 0)`,
          count: count(),
        })
        .from(sellerTransactions)
        .where(and(
          eq(sellerTransactions.sellerWalletAddress, walletAddress),
          gte(sellerTransactions.createdAt, startDate)
        ))
        .groupBy(sql`date(created_at)`)
        .orderBy(sql`date(created_at)`);

      // Monthly volume
      const monthlyVolume = await db
        .select({
          month: sql<string>`to_char(created_at, 'YYYY-MM')`,
          volume: sql<string>`coalesce(sum(cast(amount as decimal)), 0)`,
          count: count(),
        })
        .from(sellerTransactions)
        .where(and(
          eq(sellerTransactions.sellerWalletAddress, walletAddress),
          gte(sellerTransactions.createdAt, startDate)
        ))
        .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
        .orderBy(sql`to_char(created_at, 'YYYY-MM')`);

      // Transactions by type
      const transactionsByType = await db
        .select({
          type: sellerTransactions.transactionType,
          count: count(),
          volume: sql<string>`coalesce(sum(cast(amount as decimal)), 0)`,
        })
        .from(sellerTransactions)
        .where(and(
          eq(sellerTransactions.sellerWalletAddress, walletAddress),
          gte(sellerTransactions.createdAt, startDate)
        ))
        .groupBy(sellerTransactions.transactionType);

      // Top counterparties
      const topCounterparties = await db
        .select({
          address: sellerTransactions.counterpartyAddress,
          volume: sql<string>`coalesce(sum(cast(amount as decimal)), 0)`,
          count: count(),
        })
        .from(sellerTransactions)
        .where(and(
          eq(sellerTransactions.sellerWalletAddress, walletAddress),
          gte(sellerTransactions.createdAt, startDate),
          sql`counterparty_address is not null`
        ))
        .groupBy(sellerTransactions.counterpartyAddress)
        .orderBy(sql`sum(cast(amount as decimal)) desc`)
        .limit(10);

      // Enrich counterparties with names
      const enrichedCounterparties = [];
      for (const cp of topCounterparties) {
        let name: string | undefined;
        if (cp.address) {
          const seller = await db
            .select({ storeName: sellers.storeName })
            .from(sellers)
            .where(eq(sellers.walletAddress, cp.address))
            .limit(1);
          
          if (seller.length > 0) {
            name = seller[0].storeName || undefined;
          }
        }

        enrichedCounterparties.push({
          address: cp.address || '',
          name,
          volume: cp.volume,
          count: cp.count,
        });
      }

      // Peak transaction hours
      const peakHours = await db
        .select({
          hour: sql<number>`extract(hour from created_at)`,
          count: count(),
        })
        .from(sellerTransactions)
        .where(and(
          eq(sellerTransactions.sellerWalletAddress, walletAddress),
          gte(sellerTransactions.createdAt, startDate)
        ))
        .groupBy(sql`extract(hour from created_at)`)
        .orderBy(sql`count(*) desc`);

      // Calculate average transaction size
      const avgSize = await db
        .select({
          averageTransactionSize: sql<string>`coalesce(avg(cast(amount as decimal)), 0)`,
        })
        .from(sellerTransactions)
        .where(and(
          eq(sellerTransactions.sellerWalletAddress, walletAddress),
          gte(sellerTransactions.createdAt, startDate)
        ));

      // Calculate transaction status percentages (all are completed for now)
      const totalTx = transactionsByType.reduce((sum, t) => sum + t.count, 0);
      const transactionsByStatus = [
        { status: 'completed', count: totalTx, percentage: 100 },
        { status: 'pending', count: 0, percentage: 0 },
        { status: 'failed', count: 0, percentage: 0 },
        { status: 'cancelled', count: 0, percentage: 0 },
      ];

      return {
        dailyVolume,
        monthlyVolume,
        transactionsByType,
        transactionsByStatus,
        topCounterparties: enrichedCounterparties,
        averageTransactionSize: avgSize[0]?.averageTransactionSize || '0',
        peakTransactionHours: peakHours,
      };
    } catch (error) {
      safeLogger.error('Error getting transaction analytics:', error);
      throw error;
    }
  }

  /**
   * Record order-related transactions automatically
   */
  async recordOrderTransaction(
    orderId: string,
    type: 'payment_received' | 'escrow_deposit' | 'escrow_release' | 'fee_deduction',
    amount: string,
    currency: string,
    transactionHash?: string
  ): Promise<void> {
    try {
      // Get order details
      const order = await db
        .select({
          buyerId: orders.buyerId,
          sellerId: orders.sellerId,
          buyerAddress: sql<string>`orders.buyer_id::text`,
          sellerAddress: sql<string>`orders.seller_id::text`,
          listingTitle: marketplaceListings.title
        })
        .from(orders)
        .innerJoin(marketplaceListings, eq(orders.listingId, marketplaceListings.id))
        .where(eq(orders.id, parseInt(orderId)))
        .limit(1);

      if (order.length === 0) {
        throw new Error('Order not found');
      }

      const orderData = order[0];
      
      // Determine transaction participants based on type
      let sellerAddress: string;
      let counterpartyAddress: string;
      let transactionType: TransactionRecord['type'];

      switch (type) {
        case 'payment_received':
          sellerAddress = orderData.sellerAddress;
          counterpartyAddress = orderData.buyerAddress;
          transactionType = 'sale';
          break;
        case 'escrow_deposit':
          sellerAddress = orderData.buyerAddress;
          counterpartyAddress = orderData.sellerAddress;
          transactionType = 'escrow_deposit';
          break;
        case 'escrow_release':
          sellerAddress = orderData.sellerAddress;
          counterpartyAddress = orderData.buyerAddress;
          transactionType = 'escrow_release';
          break;
        case 'fee_deduction':
          sellerAddress = orderData.sellerAddress;
          counterpartyAddress = 'platform';
          transactionType = 'fee_payment';
          break;
        default:
          throw new Error('Invalid transaction type');
      }

      // Record transaction for seller
      await this.recordTransaction(
        sellerAddress,
        transactionType,
        amount,
        currency,
        counterpartyAddress,
        orderId,
        transactionHash,
        { orderTitle: orderData.listingTitle, type }
      );

      // Record corresponding transaction for buyer if applicable
      if (type === 'payment_received' || type === 'escrow_deposit') {
        const buyerTransactionType = type === 'payment_received' ? 'purchase' : 'escrow_deposit';
        await this.recordTransaction(
          orderData.buyerAddress,
          buyerTransactionType,
          amount,
          currency,
          orderData.sellerAddress,
          orderId,
          transactionHash,
          { orderTitle: orderData.listingTitle, type }
        );
      }

    } catch (error) {
      safeLogger.error('Error recording order transaction:', error);
      throw error;
    }
  }

  /**
   * Generate human-readable transaction description
   */
  private generateTransactionDescription(
    type: TransactionRecord['type'],
    amount: string,
    currency: string,
    counterpartyName?: string,
    orderTitle?: string
  ): string {
    const formattedAmount = `${amount} ${currency}`;
    const counterparty = counterpartyName || 'Unknown User';

    switch (type) {
      case 'sale':
        return orderTitle 
          ? `Sale of "${orderTitle}" to ${counterparty} - ${formattedAmount}`
          : `Sale to ${counterparty} - ${formattedAmount}`;
      
      case 'purchase':
        return orderTitle
          ? `Purchase of "${orderTitle}" from ${counterparty} - ${formattedAmount}`
          : `Purchase from ${counterparty} - ${formattedAmount}`;
      
      case 'escrow_deposit':
        return `Escrow deposit for order - ${formattedAmount}`;
      
      case 'escrow_release':
        return `Escrow release for completed order - ${formattedAmount}`;
      
      case 'fee_payment':
        return `Platform fee payment - ${formattedAmount}`;
      
      case 'withdrawal':
        return `Withdrawal to external wallet - ${formattedAmount}`;
      
      default:
        return `Transaction - ${formattedAmount}`;
    }
  }
}

export const transactionService = new TransactionService();
