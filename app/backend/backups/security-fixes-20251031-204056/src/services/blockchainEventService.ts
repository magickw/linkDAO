import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { NotificationService } from './notificationService';
import { safeLogger } from '../utils/safeLogger';
import { BlockchainEvent, EscrowEvent } from '../models/Order';
import { safeLogger } from '../utils/safeLogger';

const databaseService = new DatabaseService();
const notificationService = new NotificationService();

export class BlockchainEventService {
  private provider: ethers.JsonRpcProvider;
  private escrowContract: ethers.Contract | null = null;
  private marketplaceContract: ethers.Contract | null = null;
  private eventListeners: Map<string, any> = new Map();

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
    this.initializeContracts();
  }

  private initializeContracts(): void {
    try {
      const escrowAddress = process.env.ENHANCED_ESCROW_CONTRACT_ADDRESS;
      const marketplaceAddress = process.env.MARKETPLACE_CONTRACT_ADDRESS;

      if (escrowAddress && ethers.isAddress(escrowAddress)) {
        const ESCROW_ABI = [
          "event EscrowCreated(uint256 indexed escrowId, uint256 indexed listingId, address indexed buyer, address seller, uint256 amount)",
          "event FundsLocked(uint256 indexed escrowId, uint256 amount)",
          "event DeliveryConfirmed(uint256 indexed escrowId, string deliveryInfo)",
          "event EscrowApproved(uint256 indexed escrowId, address approver)",
          "event DisputeOpened(uint256 indexed escrowId, address initiator, string reason)",
          "event DisputeResolved(uint256 indexed escrowId, bool favorBuyer, string resolution)",
          "event PaymentReleased(uint256 indexed escrowId, address recipient, uint256 amount)",
          "event EvidenceSubmitted(uint256 indexed escrowId, address submitter, string evidence)",
          "event VoteCast(uint256 indexed escrowId, address voter, bool voteForBuyer)"
        ];

        this.escrowContract = new ethers.Contract(escrowAddress, ESCROW_ABI, this.provider);
      }

      if (marketplaceAddress && ethers.isAddress(marketplaceAddress)) {
        const MARKETPLACE_ABI = [
          "event ListingCreated(uint256 indexed listingId, address indexed seller, uint256 price)",
          "event ListingUpdated(uint256 indexed listingId, uint256 newPrice)",
          "event ListingCancelled(uint256 indexed listingId)",
          "event BidPlaced(uint256 indexed listingId, address indexed bidder, uint256 amount)",
          "event OfferMade(uint256 indexed listingId, address indexed buyer, uint256 amount)",
          "event OfferAccepted(uint256 indexed listingId, uint256 indexed offerId)"
        ];

        this.marketplaceContract = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, this.provider);
      }
    } catch (error) {
      safeLogger.error('Error initializing contracts:', error);
    }
  }

  /**
   * Start monitoring blockchain events for a specific order
   */
  async monitorOrderEvents(orderId: string, escrowId: string): Promise<void> {
    try {
      if (!this.escrowContract) {
        safeLogger.warn('Escrow contract not initialized, skipping event monitoring');
        return;
      }

      const listenerKey = `order_${orderId}`;

      // Listen for escrow events
      const escrowEventHandlers = {
        EscrowCreated: this.handleEscrowCreated.bind(this, orderId),
        FundsLocked: this.handleFundsLocked.bind(this, orderId),
        DeliveryConfirmed: this.handleDeliveryConfirmed.bind(this, orderId),
        EscrowApproved: this.handleEscrowApproved.bind(this, orderId),
        DisputeOpened: this.handleDisputeOpened.bind(this, orderId),
        DisputeResolved: this.handleDisputeResolved.bind(this, orderId),
        PaymentReleased: this.handlePaymentReleased.bind(this, orderId),
        EvidenceSubmitted: this.handleEvidenceSubmitted.bind(this, orderId),
        VoteCast: this.handleVoteCast.bind(this, orderId)
      };

      // Set up event listeners
      Object.entries(escrowEventHandlers).forEach(([eventName, handler]) => {
        const filter = this.escrowContract!.filters[eventName](escrowId);
        this.escrowContract!.on(filter, handler);
      });

      this.eventListeners.set(listenerKey, escrowEventHandlers);

      safeLogger.info(`Started monitoring blockchain events for order ${orderId}`);
    } catch (error) {
      safeLogger.error('Error setting up blockchain event monitoring:', error);
    }
  }

  /**
   * Stop monitoring events for an order
   */
  async stopMonitoringOrder(orderId: string): Promise<void> {
    try {
      const listenerKey = `order_${orderId}`;
      const handlers = this.eventListeners.get(listenerKey);

      if (handlers && this.escrowContract) {
        // Remove all event listeners for this order
        Object.keys(handlers).forEach(eventName => {
          this.escrowContract!.removeAllListeners(eventName);
        });

        this.eventListeners.delete(listenerKey);
        safeLogger.info(`Stopped monitoring blockchain events for order ${orderId}`);
      }
    } catch (error) {
      safeLogger.error('Error stopping blockchain event monitoring:', error);
    }
  }

  /**
   * Get historical events for an order
   */
  async getOrderEvents(orderId: string, escrowId: string, fromBlock: number = 0): Promise<BlockchainEvent[]> {
    try {
      if (!this.escrowContract) return [];

      const events: BlockchainEvent[] = [];
      const currentBlock = await this.provider.getBlockNumber();

      // Get all escrow events
      const escrowEvents = await this.escrowContract.queryFilter(
        this.escrowContract.filters.EscrowCreated(escrowId),
        fromBlock,
        currentBlock
      );

      for (const event of escrowEvents) {
        // Type guard to check if event is EventLog
        if ('fragment' in event && 'args' in event && 'logIndex' in event) {
          const block = await event.getBlock();
          events.push({
            id: `${event.transactionHash}_${event.logIndex}`,
            orderId,
            escrowId,
            eventType: event.fragment.name,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: new Date(block.timestamp * 1000).toISOString(),
            data: event.args
          });
        }
      }

      return events.sort((a, b) => a.blockNumber - b.blockNumber);
    } catch (error) {
      safeLogger.error('Error getting order events:', error);
      return [];
    }
  }

  /**
   * Sync blockchain events with database
   */
  async syncEvents(): Promise<void> {
    try {
      if (!this.escrowContract) return;

      const lastSyncedBlock = await databaseService.getLastSyncedBlock();
      const currentBlock = await this.provider.getBlockNumber();

      if (lastSyncedBlock >= currentBlock) return;

      safeLogger.info(`Syncing events from block ${lastSyncedBlock} to ${currentBlock}`);

      // Get all events since last sync
      const events = await this.escrowContract.queryFilter(
        '*', // Use '*' to get all events
        lastSyncedBlock + 1,
        currentBlock
      );

      for (const event of events) {
        await this.processEvent(event);
      }

      // Update last synced block
      await databaseService.updateLastSyncedBlock(currentBlock);

      safeLogger.info(`Synced ${events.length} events up to block ${currentBlock}`);
    } catch (error) {
      safeLogger.error('Error syncing blockchain events:', error);
    }
  }

  // Event handlers

  private async handleEscrowCreated(orderId: string, escrowId: any, listingId: any, buyer: string, seller: string, amount: any, event: any): Promise<void> {
    try {
      const blockchainEvent: BlockchainEvent = {
        id: `${event.transactionHash}_${event.logIndex}`,
        orderId,
        escrowId: escrowId.toString(),
        eventType: 'ESCROW_CREATED',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date().toISOString(),
        data: { escrowId, listingId, buyer, seller, amount }
      };

      await this.storeEvent(blockchainEvent);
      await this.updateOrderStatus(orderId, 'ESCROW_CREATED');

      // Send notifications
      await Promise.all([
        notificationService.sendOrderNotification(buyer, 'ESCROW_CREATED', orderId),
        notificationService.sendOrderNotification(seller, 'ESCROW_CREATED', orderId)
      ]);
    } catch (error) {
      safeLogger.error('Error handling EscrowCreated event:', error);
    }
  }

  private async handleFundsLocked(orderId: string, escrowId: any, amount: any, event: any): Promise<void> {
    try {
      const blockchainEvent: BlockchainEvent = {
        id: `${event.transactionHash}_${event.logIndex}`,
        orderId,
        escrowId: escrowId.toString(),
        eventType: 'FUNDS_LOCKED',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date().toISOString(),
        data: { escrowId, amount }
      };

      await this.storeEvent(blockchainEvent);
      await this.updateOrderStatus(orderId, 'PAID');

      // Get order details for notifications
      const order = await databaseService.getOrderById(parseInt(orderId));
      if (order) {
        const [buyer, seller] = await Promise.all([
          databaseService.getUserById(order.buyerId || ''),
          databaseService.getUserById(order.sellerId || '')
        ]);

        if (buyer && seller) {
          await notificationService.sendOrderNotification(seller.walletAddress, 'PAYMENT_RECEIVED', orderId);
        }
      }
    } catch (error) {
      safeLogger.error('Error handling FundsLocked event:', error);
    }
  }

  private async handleDeliveryConfirmed(orderId: string, escrowId: any, deliveryInfo: string, event: any): Promise<void> {
    try {
      const blockchainEvent: BlockchainEvent = {
        id: `${event.transactionHash}_${event.logIndex}`,
        orderId,
        escrowId: escrowId.toString(),
        eventType: 'DELIVERY_CONFIRMED',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date().toISOString(),
        data: { escrowId, deliveryInfo }
      };

      await this.storeEvent(blockchainEvent);
      await this.updateOrderStatus(orderId, 'DELIVERED');

      // Get order details for notifications
      const order = await databaseService.getOrderById(parseInt(orderId));
      if (order) {
        const [buyer, seller] = await Promise.all([
          databaseService.getUserById(order.buyerId || ''),
          databaseService.getUserById(order.sellerId || '')
        ]);

        if (buyer && seller) {
          await Promise.all([
            notificationService.sendOrderNotification(buyer.walletAddress, 'DELIVERY_CONFIRMED', orderId),
            notificationService.sendOrderNotification(seller.walletAddress, 'DELIVERY_CONFIRMED', orderId)
          ]);
        }
      }
    } catch (error) {
      safeLogger.error('Error handling DeliveryConfirmed event:', error);
    }
  }

  private async handleEscrowApproved(orderId: string, escrowId: any, approver: string, event: any): Promise<void> {
    try {
      const blockchainEvent: BlockchainEvent = {
        id: `${event.transactionHash}_${event.logIndex}`,
        orderId,
        escrowId: escrowId.toString(),
        eventType: 'ESCROW_APPROVED',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date().toISOString(),
        data: { escrowId, approver }
      };

      await this.storeEvent(blockchainEvent);

      // Send notification
      await notificationService.sendOrderNotification(approver, 'ESCROW_APPROVED', orderId);
    } catch (error) {
      safeLogger.error('Error handling EscrowApproved event:', error);
    }
  }

  private async handleDisputeOpened(orderId: string, escrowId: any, initiator: string, reason: string, event: any): Promise<void> {
    try {
      const blockchainEvent: BlockchainEvent = {
        id: `${event.transactionHash}_${event.logIndex}`,
        orderId,
        escrowId: escrowId.toString(),
        eventType: 'DISPUTE_OPENED',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date().toISOString(),
        data: { escrowId, initiator, reason }
      };

      await this.storeEvent(blockchainEvent);
      await this.updateOrderStatus(orderId, 'DISPUTED');

      // Get order details for notifications
      const order = await databaseService.getOrderById(parseInt(orderId));
      if (order) {
        const [buyer, seller] = await Promise.all([
          databaseService.getUserById(order.buyerId || ''),
          databaseService.getUserById(order.sellerId || '')
        ]);

        if (buyer && seller) {
          const otherParty = initiator === buyer.walletAddress ? seller.walletAddress : buyer.walletAddress;
          await notificationService.sendOrderNotification(otherParty, 'DISPUTE_OPENED', orderId, { reason });
        }
      }
    } catch (error) {
      safeLogger.error('Error handling DisputeOpened event:', error);
    }
  }

  private async handleDisputeResolved(orderId: string, escrowId: any, favorBuyer: boolean, resolution: string, event: any): Promise<void> {
    try {
      const blockchainEvent: BlockchainEvent = {
        id: `${event.transactionHash}_${event.logIndex}`,
        orderId,
        escrowId: escrowId.toString(),
        eventType: 'DISPUTE_RESOLVED',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date().toISOString(),
        data: { escrowId, favorBuyer, resolution }
      };

      await this.storeEvent(blockchainEvent);
      await this.updateOrderStatus(orderId, favorBuyer ? 'REFUNDED' : 'COMPLETED');

      // Get order details for notifications
      const order = await databaseService.getOrderById(parseInt(orderId));
      if (order) {
        const [buyer, seller] = await Promise.all([
          databaseService.getUserById(order.buyerId || ''),
          databaseService.getUserById(order.sellerId || '')
        ]);

        if (buyer && seller) {
          await Promise.all([
            notificationService.sendOrderNotification(buyer.walletAddress, 'DISPUTE_RESOLVED', orderId, { favorBuyer, resolution }),
            notificationService.sendOrderNotification(seller.walletAddress, 'DISPUTE_RESOLVED', orderId, { favorBuyer, resolution })
          ]);
        }
      }
    } catch (error) {
      safeLogger.error('Error handling DisputeResolved event:', error);
    }
  }

  private async handlePaymentReleased(orderId: string, escrowId: any, recipient: string, amount: any, event: any): Promise<void> {
    try {
      const blockchainEvent: BlockchainEvent = {
        id: `${event.transactionHash}_${event.logIndex}`,
        orderId,
        escrowId: escrowId.toString(),
        eventType: 'PAYMENT_RELEASED',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date().toISOString(),
        data: { escrowId, recipient, amount }
      };

      await this.storeEvent(blockchainEvent);
      await this.updateOrderStatus(orderId, 'COMPLETED');

      // Send notification
      await notificationService.sendOrderNotification(recipient, 'PAYMENT_RELEASED', orderId, { amount });
    } catch (error) {
      safeLogger.error('Error handling PaymentReleased event:', error);
    }
  }

  private async handleEvidenceSubmitted(orderId: string, escrowId: any, submitter: string, evidence: string, event: any): Promise<void> {
    try {
      const blockchainEvent: BlockchainEvent = {
        id: `${event.transactionHash}_${event.logIndex}`,
        orderId,
        escrowId: escrowId.toString(),
        eventType: 'EVIDENCE_SUBMITTED',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date().toISOString(),
        data: { escrowId, submitter, evidence }
      };

      await this.storeEvent(blockchainEvent);

      // Send notification
      await notificationService.sendOrderNotification(submitter, 'EVIDENCE_SUBMITTED', orderId);
    } catch (error) {
      safeLogger.error('Error handling EvidenceSubmitted event:', error);
    }
  }

  private async handleVoteCast(orderId: string, escrowId: any, voter: string, voteForBuyer: boolean, event: any): Promise<void> {
    try {
      const blockchainEvent: BlockchainEvent = {
        id: `${event.transactionHash}_${event.logIndex}`,
        orderId,
        escrowId: escrowId.toString(),
        eventType: 'VOTE_CAST',
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date().toISOString(),
        data: { escrowId, voter, voteForBuyer }
      };

      await this.storeEvent(blockchainEvent);

      // Send notification
      await notificationService.sendOrderNotification(voter, 'VOTE_CAST', orderId, { voteForBuyer });
    } catch (error) {
      safeLogger.error('Error handling VoteCast event:', error);
    }
  }

  // Helper methods

  private async processEvent(event: any): Promise<void> {
    try {
      // Process different types of events
      const eventName = event.fragment.name;
      
      // Store the event in database
      await databaseService.storeBlockchainEvent({
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        eventType: eventName,
        data: JSON.stringify(event.args),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error processing event:', error);
    }
  }

  private async storeEvent(event: BlockchainEvent): Promise<void> {
    try {
      await databaseService.storeBlockchainEvent(event);
    } catch (error) {
      safeLogger.error('Error storing blockchain event:', error);
    }
  }

  private async updateOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      await databaseService.updateOrder(parseInt(orderId), { status: status.toLowerCase() });
    } catch (error) {
      safeLogger.error('Error updating order status:', error);
    }
  }

  /**
   * Start periodic event synchronization
   */
  startEventSync(): void {
    // Sync events every 30 seconds
    setInterval(() => {
      this.syncEvents().catch(error => {
        safeLogger.error('Error in periodic event sync:', error);
      });
    }, 30000);

    safeLogger.info('Started periodic blockchain event synchronization');
  }

  /**
   * Stop all event monitoring
   */
  stopAllMonitoring(): void {
    try {
      if (this.escrowContract) {
        this.escrowContract.removeAllListeners();
      }
      if (this.marketplaceContract) {
        this.marketplaceContract.removeAllListeners();
      }
      this.eventListeners.clear();
      safeLogger.info('Stopped all blockchain event monitoring');
    } catch (error) {
      safeLogger.error('Error stopping event monitoring:', error);
    }
  }
}