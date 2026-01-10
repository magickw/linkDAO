/**
 * Escrow Event Listener Service
 * Watches for blockchain events and syncs state with the backend
 */

import { PublicClient, Address, Log, parseAbiItem } from 'viem';
import { getEscrowAddress } from '@/config/escrowConfig';

// Event signatures for escrow contract
const ESCROW_EVENTS = {
  EscrowCreated: parseAbiItem('event EscrowCreated(uint256 indexed escrowId, address indexed buyer, address indexed seller, uint256 amount)'),
  FundsLocked: parseAbiItem('event FundsLocked(uint256 indexed escrowId, uint256 amount)'),
  NFTDeposited: parseAbiItem('event NFTDeposited(uint256 indexed escrowId, address indexed nftContract, uint256 tokenId, uint8 standard)'),
  EscrowReadyForRelease: parseAbiItem('event EscrowReadyForRelease(uint256 indexed escrowId)'),
  DeliveryConfirmed: parseAbiItem('event DeliveryConfirmed(uint256 indexed escrowId, string deliveryInfo)'),
  DisputeOpened: parseAbiItem('event DisputeOpened(uint256 indexed escrowId, uint8 method)'),
  EscrowResolved: parseAbiItem('event EscrowResolved(uint256 indexed escrowId, uint8 resolution, address winner)'),
  DeadlineRefund: parseAbiItem('event DeadlineRefund(uint256 indexed escrowId, address indexed buyer, uint256 amount, string reason)'),
  NFTTransferred: parseAbiItem('event NFTTransferred(uint256 indexed escrowId, address indexed to, address nftContract, uint256 tokenId)'),
} as const;

// Map escrow status numbers to string status
const STATUS_MAP: Record<number, string> = {
  0: 'created',
  1: 'funds_locked',
  2: 'nft_deposited',
  3: 'ready_for_release',
  4: 'completed',
  5: 'disputed',
  6: 'resolved_buyer_wins',
  7: 'resolved_seller_wins',
  8: 'cancelled'
};

export interface EscrowEventData {
  escrowId: bigint;
  eventType: keyof typeof ESCROW_EVENTS;
  blockNumber: bigint;
  transactionHash: string;
  data: Record<string, any>;
}

export interface EventListenerCallbacks {
  onEscrowCreated?: (data: EscrowEventData) => void;
  onFundsLocked?: (data: EscrowEventData) => void;
  onNFTDeposited?: (data: EscrowEventData) => void;
  onReadyForRelease?: (data: EscrowEventData) => void;
  onDeliveryConfirmed?: (data: EscrowEventData) => void;
  onDisputeOpened?: (data: EscrowEventData) => void;
  onEscrowResolved?: (data: EscrowEventData) => void;
  onDeadlineRefund?: (data: EscrowEventData) => void;
  onNFTTransferred?: (data: EscrowEventData) => void;
  onAnyEvent?: (data: EscrowEventData) => void;
  onError?: (error: Error) => void;
}

export class EscrowEventListener {
  private publicClient: PublicClient;
  private escrowAddress: Address | null = null;
  private unwatchFunctions: (() => void)[] = [];
  private callbacks: EventListenerCallbacks;
  private isListening = false;
  private backendSyncEnabled = true;

  constructor(publicClient: PublicClient, callbacks: EventListenerCallbacks = {}) {
    this.publicClient = publicClient;
    this.callbacks = callbacks;
  }

  /**
   * Start listening to escrow events
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      console.warn('Event listener is already running');
      return;
    }

    try {
      const chainId = await this.publicClient.getChainId();
      this.escrowAddress = getEscrowAddress(chainId);

      if (!this.escrowAddress) {
        throw new Error(`Escrow contract not found on chain ${chainId}`);
      }

      console.log(`Starting escrow event listener on chain ${chainId} at ${this.escrowAddress}`);

      // Watch for all escrow events
      this.watchEscrowCreated();
      this.watchFundsLocked();
      this.watchNFTDeposited();
      this.watchReadyForRelease();
      this.watchDeliveryConfirmed();
      this.watchDisputeOpened();
      this.watchEscrowResolved();
      this.watchDeadlineRefund();
      this.watchNFTTransferred();

      this.isListening = true;
      console.log('Escrow event listener started successfully');
    } catch (error) {
      console.error('Failed to start event listener:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Stop listening to events
   */
  stopListening(): void {
    console.log('Stopping escrow event listener...');
    this.unwatchFunctions.forEach(unwatch => unwatch());
    this.unwatchFunctions = [];
    this.isListening = false;
    console.log('Escrow event listener stopped');
  }

  /**
   * Enable or disable backend synchronization
   */
  setBackendSyncEnabled(enabled: boolean): void {
    this.backendSyncEnabled = enabled;
  }

  /**
   * Sync escrow status with backend
   */
  private async syncWithBackend(escrowId: bigint, status: string, eventData: Record<string, any>): Promise<void> {
    if (!this.backendSyncEnabled) return;

    try {
      const response = await fetch('/api/marketplace/escrow/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          escrowId: escrowId.toString(),
          status,
          eventData,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error('Failed to sync escrow status with backend:', await response.text());
      }
    } catch (error) {
      console.error('Error syncing with backend:', error);
    }
  }

  // Event watchers
  private watchEscrowCreated(): void {
    const unwatch = this.publicClient.watchContractEvent({
      address: this.escrowAddress!,
      abi: [ESCROW_EVENTS.EscrowCreated],
      eventName: 'EscrowCreated',
      onLogs: (logs) => {
        logs.forEach((log) => this.handleEvent('EscrowCreated', log, (args) => ({
          buyer: args.buyer,
          seller: args.seller,
          amount: args.amount?.toString(),
        })));
      },
      onError: (error) => this.callbacks.onError?.(error),
    });
    this.unwatchFunctions.push(unwatch);
  }

  private watchFundsLocked(): void {
    const unwatch = this.publicClient.watchContractEvent({
      address: this.escrowAddress!,
      abi: [ESCROW_EVENTS.FundsLocked],
      eventName: 'FundsLocked',
      onLogs: (logs) => {
        logs.forEach((log) => this.handleEvent('FundsLocked', log, (args) => ({
          amount: args.amount?.toString(),
        }), 'funds_locked'));
      },
      onError: (error) => this.callbacks.onError?.(error),
    });
    this.unwatchFunctions.push(unwatch);
  }

  private watchNFTDeposited(): void {
    const unwatch = this.publicClient.watchContractEvent({
      address: this.escrowAddress!,
      abi: [ESCROW_EVENTS.NFTDeposited],
      eventName: 'NFTDeposited',
      onLogs: (logs) => {
        logs.forEach((log) => this.handleEvent('NFTDeposited', log, (args) => ({
          nftContract: args.nftContract,
          tokenId: args.tokenId?.toString(),
          standard: args.standard,
        }), 'nft_deposited'));
      },
      onError: (error) => this.callbacks.onError?.(error),
    });
    this.unwatchFunctions.push(unwatch);
  }

  private watchReadyForRelease(): void {
    const unwatch = this.publicClient.watchContractEvent({
      address: this.escrowAddress!,
      abi: [ESCROW_EVENTS.EscrowReadyForRelease],
      eventName: 'EscrowReadyForRelease',
      onLogs: (logs) => {
        logs.forEach((log) => this.handleEvent('EscrowReadyForRelease', log, () => ({}), 'ready_for_release'));
      },
      onError: (error) => this.callbacks.onError?.(error),
    });
    this.unwatchFunctions.push(unwatch);
  }

  private watchDeliveryConfirmed(): void {
    const unwatch = this.publicClient.watchContractEvent({
      address: this.escrowAddress!,
      abi: [ESCROW_EVENTS.DeliveryConfirmed],
      eventName: 'DeliveryConfirmed',
      onLogs: (logs) => {
        logs.forEach((log) => this.handleEvent('DeliveryConfirmed', log, (args) => ({
          deliveryInfo: args.deliveryInfo,
        }), 'completed'));
      },
      onError: (error) => this.callbacks.onError?.(error),
    });
    this.unwatchFunctions.push(unwatch);
  }

  private watchDisputeOpened(): void {
    const unwatch = this.publicClient.watchContractEvent({
      address: this.escrowAddress!,
      abi: [ESCROW_EVENTS.DisputeOpened],
      eventName: 'DisputeOpened',
      onLogs: (logs) => {
        logs.forEach((log) => this.handleEvent('DisputeOpened', log, (args) => ({
          method: args.method,
        }), 'disputed'));
      },
      onError: (error) => this.callbacks.onError?.(error),
    });
    this.unwatchFunctions.push(unwatch);
  }

  private watchEscrowResolved(): void {
    const unwatch = this.publicClient.watchContractEvent({
      address: this.escrowAddress!,
      abi: [ESCROW_EVENTS.EscrowResolved],
      eventName: 'EscrowResolved',
      onLogs: (logs) => {
        logs.forEach((log) => this.handleEvent('EscrowResolved', log, (args) => ({
          resolution: args.resolution,
          winner: args.winner,
        }), STATUS_MAP[Number((log as any).args?.resolution)] || 'completed'));
      },
      onError: (error) => this.callbacks.onError?.(error),
    });
    this.unwatchFunctions.push(unwatch);
  }

  private watchDeadlineRefund(): void {
    const unwatch = this.publicClient.watchContractEvent({
      address: this.escrowAddress!,
      abi: [ESCROW_EVENTS.DeadlineRefund],
      eventName: 'DeadlineRefund',
      onLogs: (logs) => {
        logs.forEach((log) => this.handleEvent('DeadlineRefund', log, (args) => ({
          buyer: args.buyer,
          amount: args.amount?.toString(),
          reason: args.reason,
        }), 'cancelled'));
      },
      onError: (error) => this.callbacks.onError?.(error),
    });
    this.unwatchFunctions.push(unwatch);
  }

  private watchNFTTransferred(): void {
    const unwatch = this.publicClient.watchContractEvent({
      address: this.escrowAddress!,
      abi: [ESCROW_EVENTS.NFTTransferred],
      eventName: 'NFTTransferred',
      onLogs: (logs) => {
        logs.forEach((log) => this.handleEvent('NFTTransferred', log, (args) => ({
          to: args.to,
          nftContract: args.nftContract,
          tokenId: args.tokenId?.toString(),
        })));
      },
      onError: (error) => this.callbacks.onError?.(error),
    });
    this.unwatchFunctions.push(unwatch);
  }

  /**
   * Generic event handler
   */
  private handleEvent(
    eventType: keyof typeof ESCROW_EVENTS,
    log: Log,
    parseData: (args: any) => Record<string, any>,
    newStatus?: string
  ): void {
    const args = (log as any).args;
    const escrowId = args.escrowId as bigint;

    const eventData: EscrowEventData = {
      escrowId,
      eventType,
      blockNumber: log.blockNumber || 0n,
      transactionHash: log.transactionHash || '',
      data: parseData(args),
    };

    // Call specific callback
    const callbackName = `on${eventType}` as keyof EventListenerCallbacks;
    (this.callbacks[callbackName] as ((data: EscrowEventData) => void) | undefined)?.(eventData);

    // Call generic callback
    this.callbacks.onAnyEvent?.(eventData);

    // Sync with backend if status changed
    if (newStatus) {
      this.syncWithBackend(escrowId, newStatus, eventData.data);
    }

    console.log(`[EscrowEvent] ${eventType} - Escrow #${escrowId}`, eventData.data);
  }

  /**
   * Get historical events for an escrow
   */
  async getEscrowHistory(escrowId: bigint, fromBlock?: bigint): Promise<EscrowEventData[]> {
    if (!this.escrowAddress) {
      const chainId = await this.publicClient.getChainId();
      this.escrowAddress = getEscrowAddress(chainId);
    }

    const events: EscrowEventData[] = [];
    const from = fromBlock || 0n;

    // Get all event types
    for (const [eventName, eventAbi] of Object.entries(ESCROW_EVENTS)) {
      try {
        const logs = await this.publicClient.getLogs({
          address: this.escrowAddress!,
          event: eventAbi,
          args: {
            escrowId,
          },
          fromBlock: from,
          toBlock: 'latest',
        });

        logs.forEach((log) => {
          const args = (log as any).args;
          events.push({
            escrowId,
            eventType: eventName as keyof typeof ESCROW_EVENTS,
            blockNumber: log.blockNumber || 0n,
            transactionHash: log.transactionHash || '',
            data: args,
          });
        });
      } catch (error) {
        console.error(`Failed to get ${eventName} events:`, error);
      }
    }

    // Sort by block number
    events.sort((a, b) => Number(a.blockNumber - b.blockNumber));

    return events;
  }

  /**
   * Check if listener is active
   */
  isActive(): boolean {
    return this.isListening;
  }
}

/**
 * Create and start an escrow event listener
 */
export async function createEscrowEventListener(
  publicClient: PublicClient,
  callbacks: EventListenerCallbacks = {}
): Promise<EscrowEventListener> {
  const listener = new EscrowEventListener(publicClient, callbacks);
  await listener.startListening();
  return listener;
}
