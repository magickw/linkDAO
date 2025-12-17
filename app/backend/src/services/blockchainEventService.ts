import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { DatabaseService } from './databaseService';
import { NotificationService } from './notificationService';
import { BlockchainEvent, EscrowEvent } from '../models/Order';
import { trackingService } from './trackingService';

const databaseService = new DatabaseService();
const notificationService = new NotificationService();

export class BlockchainEventService {
  private provider: ethers.JsonRpcProvider | null = null;
  private escrowContract: ethers.Contract | null = null;
  private marketplaceContract: ethers.Contract | null = null;
  private ldaoContract: ethers.Contract | null = null;
  private eventListeners: Map<string, any> = new Map();
  private initialized: boolean = false;
  private initializationAttempted: boolean = false;
  private retryCount: number = 0;
  private maxRetries: number = 5;
  private retryDelay: number = 5000; // Start with 5 seconds
  private circuitBreakerOpen: boolean = false;
  private circuitBreakerTimeout: number = 30000; // 30 seconds
  private lastFailureTime: number | null = null;

  constructor() {
    // Lazy initialization - don't connect on startup
    // Provider will be initialized on first use
  }

  /**
   * Check if circuit breaker is currently open
   */
  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreakerOpen || !this.lastFailureTime) return false;
    
    // Check if enough time has passed to close the circuit breaker
    const now = Date.now();
    if (now - this.lastFailureTime > this.circuitBreakerTimeout) {
      this.circuitBreakerOpen = false;
      this.lastFailureTime = null;
      safeLogger.info('Circuit breaker closed - attempting to reconnect to blockchain');
      return false;
    }
    
    return true;
  }

  /**
   * Open the circuit breaker
   */
  private openCircuitBreaker(): void {
    this.circuitBreakerOpen = true;
    this.lastFailureTime = Date.now();
    safeLogger.warn('Circuit breaker opened - blockchain connection temporarily disabled');
  }

  /**
   * Initialize the provider and contracts lazily
   * Returns true if initialization succeeded, false otherwise
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) return true;
    
    // Check if circuit breaker is open
    if (this.isCircuitBreakerOpen()) {
      return false;
    }
    
    if (this.initializationAttempted) {
      // If we've already tried and failed, check if we should retry
      if (this.retryCount >= this.maxRetries) {
        return false;
      }
    }

    this.initializationAttempted = true;

    try {
      const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || process.env.RPC_URL || 
                    process.env.ETHEREUM_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
      
      // Validate that we have a proper RPC URL
      if (!rpcUrl || rpcUrl.includes('your-api-key') || rpcUrl.includes('YOUR_API_KEY')) {
        throw new Error('Invalid RPC URL configuration - API key not set');
      }

      // Create provider with explicit network config to prevent detection issues
      this.provider = new ethers.JsonRpcProvider(rpcUrl, {
        chainId: 84532, // Base Sepolia
        name: 'base-sepolia'
      }, {
        staticNetwork: true, // Prevents network detection retries
        batchMaxCount: 1, // Reduce batching to avoid timeouts
      });

      // Test the connection with a timeout - try a simple call to verify connection
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('RPC connection timeout after 10 seconds')), 10000);
      });

      // Try to get network information or a simple call to check connectivity
      const networkPromise = Promise.race([
        this.provider.getNetwork(),
        this.provider.getBlockNumber()  // Alternative check that doesn't require network detection
      ]);
      
      await Promise.race([networkPromise, timeoutPromise]);

      // Initialize contracts only if provider is working
      this.initializeContracts();

      this.initialized = true;
      this.retryCount = 0; // Reset retry count on success
      safeLogger.info('BlockchainEventService initialized successfully');
      return true;
    } catch (error) {
      this.retryCount++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      safeLogger.warn(`BlockchainEventService initialization attempt ${this.retryCount}/${this.maxRetries} failed:`, errorMessage);
      
      // Close provider to free resources
      if (this.provider) {
        try {
          (this.provider as any).destroy?.();
        } catch (e) {
          // Ignore cleanup errors
        }
        this.provider = null;
      }
      
      // If we've reached max retries, open the circuit breaker
      if (this.retryCount >= this.maxRetries) {
        this.openCircuitBreaker();
      } else {
        // Add a delay before next retry using exponential backoff
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1); // 5s, 10s, 20s, 40s, 80s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Clean up contracts
      this.escrowContract = null;
      this.marketplaceContract = null;
      this.ldaoContract = null;
      
      return false;
    }
  }

  /**
   * Check if the service is available
   */
  async isAvailable(): Promise<boolean> {
    return await this.ensureInitialized();
  }

  /**
   * Get current block number with proper error handling
   */
  async getCurrentBlock(): Promise<number> {
    try {
      if (!await this.ensureInitialized() || !this.provider) {
        safeLogger.debug('Blockchain service not available, returning 0 for current block');
        return 0;
      }
      
      const blockNumber = await this.provider.getBlockNumber();
      return blockNumber;
    } catch (error) {
      safeLogger.error('Error getting current block:', error);
      return 0;
    }
  }

  private initializeContracts(): void {
    if (!this.provider) return;

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

      const ldaoAddress = process.env.LDAO_TOKEN_ADDRESS;
      if (ldaoAddress && ethers.isAddress(ldaoAddress)) {
        const LDAO_ABI = [
          "event Transfer(address indexed from, address indexed to, uint256 value)"
        ];
        this.ldaoContract = new ethers.Contract(ldaoAddress, LDAO_ABI, this.provider);
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
      // Check if blockchain service is available
      if (!await this.ensureInitialized() || !this.escrowContract) {
        safeLogger.debug('Escrow contract not initialized, skipping event monitoring for order:', orderId);
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

      // Remove any existing listeners for this order first to prevent duplicates
      Object.keys(escrowEventHandlers).forEach(eventName => {
        const filter = this.escrowContract!.filters[eventName](escrowId);
        this.escrowContract!.removeAllListeners(filter);
      });

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
          // Use the specific filter to avoid removing all listeners for the event type
          const filter = this.escrowContract!.filters[eventName]();
          this.escrowContract!.removeAllListeners(filter);
        });

        this.eventListeners.delete(listenerKey);
        safeLogger.info(`Stopped monitoring blockchain events for order ${orderId}`);
      } else {
        safeLogger.debug(`No active monitoring found for order ${orderId}`);
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
      // Check if blockchain service is available
      if (!await this.ensureInitialized() || !this.escrowContract || !this.provider) {
        safeLogger.debug('Blockchain service not available, returning empty events for order:', orderId);
        return [];
      }

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
      // Check if blockchain service is available
      if (!await this.ensureInitialized() || !this.escrowContract || !this.provider) {
        safeLogger.debug('Blockchain service not available, skipping event sync');
        return;
      }

      const lastSyncedBlock = await databaseService.getLastSyncedBlock();
      const currentBlock = await this.getCurrentBlock(); // Use the new method that handles errors gracefully

      if (currentBlock === 0 || lastSyncedBlock >= currentBlock) return;

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
        notificationService.sendOrderNotification(buyer, 'ESCROW_CREATED', String(orderId)),
        notificationService.sendOrderNotification(seller, 'ESCROW_CREATED', String(orderId))
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
      const order = await databaseService.getOrderById(orderId);
      if (order) {
        const [buyer, seller] = await Promise.all([
          databaseService.getUserById(order.buyerId || ''),
          databaseService.getUserById(order.sellerId || '')
        ]);

        if (buyer && seller) {
          await notificationService.sendOrderNotification(seller.walletAddress, 'PAYMENT_RECEIVED', String(orderId));
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
      const order = await databaseService.getOrderById(orderId);
      if (order) {
        const [buyer, seller] = await Promise.all([
          databaseService.getUserById(order.buyerId || ''),
          databaseService.getUserById(order.sellerId || '')
        ]);

        if (buyer && seller) {
          await Promise.all([
            notificationService.sendOrderNotification(buyer.walletAddress, 'DELIVERY_CONFIRMED', String(orderId)),
            notificationService.sendOrderNotification(seller.walletAddress, 'DELIVERY_CONFIRMED', String(orderId))
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
      await notificationService.sendOrderNotification(approver, 'ESCROW_APPROVED', String(orderId));
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
      const order = await databaseService.getOrderById(orderId);
      if (order) {
        const [buyer, seller] = await Promise.all([
          databaseService.getUserById(order.buyerId || ''),
          databaseService.getUserById(order.sellerId || '')
        ]);

        if (buyer && seller) {
          const otherParty = initiator === buyer.walletAddress ? seller.walletAddress : buyer.walletAddress;
          await notificationService.sendOrderNotification(otherParty, 'DISPUTE_OPENED', String(orderId), { reason });
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
      const order = await databaseService.getOrderById(orderId);
      if (order) {
        const [buyer, seller] = await Promise.all([
          databaseService.getUserById(order.buyerId || ''),
          databaseService.getUserById(order.sellerId || '')
        ]);

        if (buyer && seller) {
          await Promise.all([
            notificationService.sendOrderNotification(buyer.walletAddress, 'DISPUTE_RESOLVED', String(orderId), { favorBuyer, resolution }),
            notificationService.sendOrderNotification(seller.walletAddress, 'DISPUTE_RESOLVED', String(orderId), { favorBuyer, resolution })
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
      await notificationService.sendOrderNotification(recipient, 'PAYMENT_RELEASED', String(orderId), { amount });
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
      await databaseService.updateOrder(orderId, { status: status.toLowerCase() });
    } catch (error) {
      safeLogger.error('Error updating order status:', error);
    }
  }

  /**
   * Start periodic event synchronization
   */
  startEventSync(): void {
    // Sync events every 60 seconds (reduced frequency to reduce load)
    setInterval(() => {
      this.syncEvents().catch(error => {
        safeLogger.error('Error in periodic event sync:', error);
      });
    }, 60000);

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
  /**
   * Start global monitoring for LDAO token events
   */
  async startGlobalMonitoring(): Promise<void> {
    // Set up a periodic check to attempt reconnection if the circuit breaker was opened
    setInterval(async () => {
      if (this.circuitBreakerOpen && this.isCircuitBreakerOpen()) {
        // Try to reinitialize
        const success = await this.ensureInitialized();
        if (success) {
          safeLogger.info('BlockchainEventService reconnected successfully');
        }
      }
    }, 60000); // Check every minute if we can reconnect

    // Start monitoring with proper error handling
    const attemptMonitoring = async () => {
      try {
        // Check if blockchain service is available
        if (!await this.ensureInitialized()) {
          safeLogger.warn('BlockchainEventService not initialized, will retry global monitoring later');
          return;
        }

        // Only set up listeners if we have a working contract
        if (this.ldaoContract && this.provider) {
          // Remove any existing listeners to prevent duplicates
          this.ldaoContract.removeAllListeners('Transfer');
          
          this.ldaoContract.on('Transfer', async (from, to, value, event) => {
            try {
              const amount = ethers.formatEther(value);

              // Track for sender
              await trackingService.trackTransaction({
                userId: from,
                txHash: event.transactionHash,
                eventType: 'LDAO_TRANSFER_SENT',
                amount,
                token: 'LDAO',
                blockNumber: event.blockNumber,
                status: 'confirmed'
              });

              // Track for receiver
              await trackingService.trackTransaction({
                userId: to,
                txHash: event.transactionHash,
                eventType: 'LDAO_TRANSFER_RECEIVED',
                amount,
                token: 'LDAO',
                blockNumber: event.blockNumber,
                status: 'confirmed'
              });

              safeLogger.info(`Tracked LDAO Transfer: ${from} -> ${to} (${amount} LDAO)`);
            } catch (error) {
              safeLogger.error('Error handling LDAO Transfer event:', error);
            }
          });
          safeLogger.info('Started global monitoring for LDAO events');
        }
      } catch (error) {
        safeLogger.error('Error in global monitoring attempt:', error);
      }
    };

    // Try initial setup
    await attemptMonitoring();

    // Set up periodic reconnection attempts if needed
    setInterval(async () => {
      if (!this.initialized) {
        await attemptMonitoring();
      }
    }, 30000); // Retry every 30 seconds if not initialized
  }
}

export const blockchainEventService = new BlockchainEventService();
