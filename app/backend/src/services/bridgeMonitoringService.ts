import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { db } from '../db/connection';
import { bridgeTransactions, bridgeEvents, bridgeMetrics } from '../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export interface BridgeTransaction {
  id: string;
  nonce: number;
  user: string;
  amount: string;
  sourceChain: number;
  destinationChain: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  txHash?: string;
  fee: string;
  timestamp: Date;
  completedAt?: Date;
  validatorCount: number;
  requiredValidators: number;
}

export interface BridgeEvent {
  id: string;
  transactionId: string;
  eventType: 'initiated' | 'validator_signed' | 'completed' | 'failed' | 'cancelled';
  blockNumber: number;
  txHash: string;
  timestamp: Date;
  data: any;
}

export interface BridgeMetrics {
  totalTransactions: number;
  totalVolume: string;
  totalFees: string;
  successRate: number;
  averageCompletionTime: number;
  activeValidators: number;
  chainMetrics: {
    [chainId: number]: {
      transactions: number;
      volume: string;
      fees: string;
    };
  };
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  bridgeAddress: string;
  validatorAddress: string;
  startBlock: number;
  isActive: boolean;
}

export class BridgeMonitoringService extends EventEmitter {
  private providers: Map<number, ethers.Provider> = new Map();
  private bridgeContracts: Map<number, ethers.Contract> = new Map();
  private validatorContracts: Map<number, ethers.Contract> = new Map();
  private isMonitoring: boolean = false;
  private monitoringIntervals: Map<number, NodeJS.Timeout> = new Map();
  private lastProcessedBlocks: Map<number, number> = new Map();

  // Contract ABIs (simplified for key events)
  private readonly BRIDGE_ABI = [
    'event BridgeInitiated(uint256 indexed nonce, address indexed user, uint256 amount, uint8 sourceChain, uint8 destinationChain, uint256 fee)',
    'event BridgeCompleted(uint256 indexed nonce, address indexed user, uint256 amount, bytes32 txHash)',
    'event BridgeFailed(uint256 indexed nonce, address indexed user, string reason)',
    'event ValidatorSigned(uint256 indexed nonce, address indexed validator)',
    'function getBridgeTransaction(uint256 nonce) view returns (tuple(address user, uint256 amount, uint8 sourceChain, uint8 destinationChain, uint256 nonce, uint256 timestamp, uint8 status, bytes32 txHash, uint256 fee))',
    'function bridgeNonce() view returns (uint256)',
    'function totalLocked() view returns (uint256)',
    'function totalBridged() view returns (uint256)',
    'function validatorThreshold() view returns (uint256)'
  ];

  private readonly VALIDATOR_ABI = [
    'event ValidatorAdded(address indexed validator, uint256 stake)',
    'event ValidatorRemoved(address indexed validator, string reason)',
    'event ValidationCompleted(bytes32 indexed txHash, uint256 validatorCount)',
    'function getActiveValidatorCount() view returns (uint256)',
    'function getValidatorInfo(address validator) view returns (tuple(address validatorAddress, bool isActive, uint256 stake, uint256 validatedTransactions, uint256 lastActivity, uint256 reputation))'
  ];

  constructor(private chainConfigs: ChainConfig[]) {
    super();
    this.initializeProviders();
  }

  /**
   * Initialize providers and contracts for all chains
   */
  private initializeProviders(): void {
    for (const config of this.chainConfigs) {
      if (!config.isActive) continue;

      try {
        // Initialize provider
        const provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.providers.set(config.chainId, provider);

        // Initialize bridge contract
        const bridgeContract = new ethers.Contract(
          config.bridgeAddress,
          this.BRIDGE_ABI,
          provider
        );
        this.bridgeContracts.set(config.chainId, bridgeContract);

        // Initialize validator contract
        const validatorContract = new ethers.Contract(
          config.validatorAddress,
          this.VALIDATOR_ABI,
          provider
        );
        this.validatorContracts.set(config.chainId, validatorContract);

        // Set initial block
        this.lastProcessedBlocks.set(config.chainId, config.startBlock);

        logger.info(`Initialized monitoring for chain ${config.name} (${config.chainId})`);
      } catch (error) {
        logger.error(`Failed to initialize chain ${config.name}:`, error);
      }
    }
  }

  /**
   * Start monitoring all chains
   */
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      logger.warn('Bridge monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    logger.info('Starting bridge monitoring service');

    // Start monitoring each chain
    for (const config of this.chainConfigs) {
      if (!config.isActive) continue;

      const interval = setInterval(async () => {
        await this.monitorChain(config.chainId);
      }, 10000); // Check every 10 seconds

      this.monitoringIntervals.set(config.chainId, interval);
    }

    // Start metrics collection
    this.startMetricsCollection();

    this.emit('monitoring_started');
  }

  /**
   * Stop monitoring all chains
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    logger.info('Stopping bridge monitoring service');

    // Clear all intervals
    for (const [chainId, interval] of this.monitoringIntervals) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();

    this.emit('monitoring_stopped');
  }

  /**
   * Monitor a specific chain for bridge events
   */
  private async monitorChain(chainId: number): Promise<void> {
    try {
      const provider = this.providers.get(chainId);
      const bridgeContract = this.bridgeContracts.get(chainId);
      const validatorContract = this.validatorContracts.get(chainId);

      if (!provider || !bridgeContract || !validatorContract) {
        logger.error(`Missing provider or contract for chain ${chainId}`);
        return;
      }

      const currentBlock = await provider.getBlockNumber();
      const lastProcessedBlock = this.lastProcessedBlocks.get(chainId) || 0;

      if (currentBlock <= lastProcessedBlock) return;

      // Process bridge events
      await this.processBridgeEvents(chainId, bridgeContract, lastProcessedBlock + 1, currentBlock);
      
      // Process validator events
      await this.processValidatorEvents(chainId, validatorContract, lastProcessedBlock + 1, currentBlock);

      // Update last processed block
      this.lastProcessedBlocks.set(chainId, currentBlock);

    } catch (error) {
      logger.error(`Error monitoring chain ${chainId}:`, error);
      this.emit('monitoring_error', { chainId, error });
    }
  }

  /**
   * Process bridge contract events
   */
  private async processBridgeEvents(
    chainId: number,
    contract: ethers.Contract,
    fromBlock: number,
    toBlock: number
  ): Promise<void> {
    try {
      // Get all bridge events
      const events = await contract.queryFilter('*', fromBlock, toBlock);

      for (const event of events) {
        await this.processBridgeEvent(chainId, event);
      }
    } catch (error) {
      logger.error(`Error processing bridge events for chain ${chainId}:`, error);
    }
  }

  /**
   * Process validator contract events
   */
  private async processValidatorEvents(
    chainId: number,
    contract: ethers.Contract,
    fromBlock: number,
    toBlock: number
  ): Promise<void> {
    try {
      const events = await contract.queryFilter('*', fromBlock, toBlock);

      for (const event of events) {
        await this.processValidatorEvent(chainId, event);
      }
    } catch (error) {
      logger.error(`Error processing validator events for chain ${chainId}:`, error);
    }
  }

  /**
   * Process individual bridge event
   */
  private async processBridgeEvent(chainId: number, event: ethers.EventLog): Promise<void> {
    try {
      const eventName = event.fragment?.name;
      if (!eventName) return;

      const block = await event.getBlock();
      const timestamp = new Date(block.timestamp * 1000);

      switch (eventName) {
        case 'BridgeInitiated':
          await this.handleBridgeInitiated(chainId, event, timestamp);
          break;
        case 'BridgeCompleted':
          await this.handleBridgeCompleted(chainId, event, timestamp);
          break;
        case 'BridgeFailed':
          await this.handleBridgeFailed(chainId, event, timestamp);
          break;
        case 'ValidatorSigned':
          await this.handleValidatorSigned(chainId, event, timestamp);
          break;
      }

      // Store event
      await this.storeEvent({
        transactionId: `${chainId}-${event.args?.nonce || event.transactionHash}`,
        eventType: eventName.toLowerCase().replace('bridge', '') as any,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        timestamp,
        data: {
          chainId,
          args: event.args,
          gasUsed: event.gasUsed?.toString(),
          gasPrice: event.gasPrice?.toString()
        }
      });

    } catch (error) {
      logger.error('Error processing bridge event:', error);
    }
  }

  /**
   * Process individual validator event
   */
  private async processValidatorEvent(chainId: number, event: ethers.EventLog): Promise<void> {
    try {
      const eventName = event.fragment?.name;
      if (!eventName) return;

      const block = await event.getBlock();
      const timestamp = new Date(block.timestamp * 1000);

      // Store validator event
      await this.storeEvent({
        transactionId: `validator-${chainId}-${event.transactionHash}`,
        eventType: eventName.toLowerCase() as any,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        timestamp,
        data: {
          chainId,
          args: event.args,
          eventName
        }
      });

      this.emit('validator_event', {
        chainId,
        eventName,
        args: event.args,
        timestamp
      });

    } catch (error) {
      logger.error('Error processing validator event:', error);
    }
  }

  /**
   * Handle BridgeInitiated event
   */
  private async handleBridgeInitiated(
    chainId: number,
    event: ethers.EventLog,
    timestamp: Date
  ): Promise<void> {
    const { nonce, user, amount, sourceChain, destinationChain, fee } = event.args!;

    const transaction: Omit<BridgeTransaction, 'id'> = {
      nonce: Number(nonce),
      user,
      amount: amount.toString(),
      sourceChain: Number(sourceChain),
      destinationChain: Number(destinationChain),
      status: 'pending',
      fee: fee.toString(),
      timestamp,
      validatorCount: 0,
      requiredValidators: await this.getRequiredValidators(chainId)
    };

    await this.storeBridgeTransaction(transaction);

    this.emit('bridge_initiated', {
      chainId,
      nonce: Number(nonce),
      user,
      amount: amount.toString(),
      destinationChain: Number(destinationChain)
    });

    logger.info(`Bridge initiated: ${nonce} from ${user} for ${ethers.formatEther(amount)} LDAO`);
  }

  /**
   * Handle BridgeCompleted event
   */
  private async handleBridgeCompleted(
    chainId: number,
    event: ethers.EventLog,
    timestamp: Date
  ): Promise<void> {
    const { nonce, user, amount, txHash } = event.args!;

    await this.updateBridgeTransaction(Number(nonce), {
      status: 'completed',
      txHash,
      completedAt: timestamp
    });

    this.emit('bridge_completed', {
      chainId,
      nonce: Number(nonce),
      user,
      amount: amount.toString(),
      txHash
    });

    logger.info(`Bridge completed: ${nonce} for ${user} with txHash ${txHash}`);
  }

  /**
   * Handle BridgeFailed event
   */
  private async handleBridgeFailed(
    chainId: number,
    event: ethers.EventLog,
    timestamp: Date
  ): Promise<void> {
    const { nonce, user, reason } = event.args!;

    await this.updateBridgeTransaction(Number(nonce), {
      status: 'failed',
      completedAt: timestamp
    });

    this.emit('bridge_failed', {
      chainId,
      nonce: Number(nonce),
      user,
      reason
    });

    logger.warn(`Bridge failed: ${nonce} for ${user} - ${reason}`);
  }

  /**
   * Handle ValidatorSigned event
   */
  private async handleValidatorSigned(
    chainId: number,
    event: ethers.EventLog,
    timestamp: Date
  ): Promise<void> {
    const { nonce, validator } = event.args!;

    // Update validator count for the transaction
    await this.incrementValidatorCount(Number(nonce));

    this.emit('validator_signed', {
      chainId,
      nonce: Number(nonce),
      validator
    });

    logger.info(`Validator signed: ${validator} for transaction ${nonce}`);
  }

  /**
   * Store bridge transaction in database
   */
  private async storeBridgeTransaction(transaction: Omit<BridgeTransaction, 'id'>): Promise<void> {
    try {
      await db.insert(bridgeTransactions).values({
        id: `${transaction.sourceChain}-${transaction.nonce}`,
        ...transaction
      });
    } catch (error) {
      logger.error('Error storing bridge transaction:', error);
    }
  }

  /**
   * Update bridge transaction in database
   */
  private async updateBridgeTransaction(
    nonce: number,
    updates: Partial<BridgeTransaction>
  ): Promise<void> {
    try {
      // Find transaction by nonce (assuming single chain for now)
      const [transaction] = await db
        .select()
        .from(bridgeTransactions)
        .where(eq(bridgeTransactions.nonce, nonce))
        .limit(1);

      if (transaction) {
        await db
          .update(bridgeTransactions)
          .set(updates)
          .where(eq(bridgeTransactions.id, transaction.id));
      }
    } catch (error) {
      logger.error('Error updating bridge transaction:', error);
    }
  }

  /**
   * Increment validator count for transaction
   */
  private async incrementValidatorCount(nonce: number): Promise<void> {
    try {
      const [transaction] = await db
        .select()
        .from(bridgeTransactions)
        .where(eq(bridgeTransactions.nonce, nonce))
        .limit(1);

      if (transaction) {
        await db
          .update(bridgeTransactions)
          .set({ validatorCount: transaction.validatorCount + 1 })
          .where(eq(bridgeTransactions.id, transaction.id));
      }
    } catch (error) {
      logger.error('Error incrementing validator count:', error);
    }
  }

  /**
   * Store event in database
   */
  private async storeEvent(event: Omit<BridgeEvent, 'id'>): Promise<void> {
    try {
      await db.insert(bridgeEvents).values({
        id: `${event.txHash}-${event.eventType}`,
        ...event
      });
    } catch (error) {
      logger.error('Error storing bridge event:', error);
    }
  }

  /**
   * Get required validators for a chain
   */
  private async getRequiredValidators(chainId: number): Promise<number> {
    try {
      const bridgeContract = this.bridgeContracts.get(chainId);
      if (!bridgeContract) return 3; // Default

      const threshold = await bridgeContract.validatorThreshold();
      return Number(threshold);
    } catch (error) {
      logger.error('Error getting validator threshold:', error);
      return 3; // Default
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(async () => {
      await this.collectMetrics();
    }, 60000); // Collect metrics every minute
  }

  /**
   * Collect and store bridge metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.calculateMetrics();
      
      await db.insert(bridgeMetrics).values({
        id: `metrics-${Date.now()}`,
        timestamp: new Date(),
        totalTransactions: metrics.totalTransactions,
        totalVolume: metrics.totalVolume,
        totalFees: metrics.totalFees,
        successRate: metrics.successRate,
        averageCompletionTime: metrics.averageCompletionTime,
        activeValidators: metrics.activeValidators,
        chainMetrics: JSON.stringify(metrics.chainMetrics)
      });

      this.emit('metrics_collected', metrics);
    } catch (error) {
      logger.error('Error collecting metrics:', error);
    }
  }

  /**
   * Calculate bridge metrics
   */
  private async calculateMetrics(): Promise<BridgeMetrics> {
    try {
      // Get all transactions from last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const transactions = await db
        .select()
        .from(bridgeTransactions)
        .where(gte(bridgeTransactions.timestamp, oneDayAgo));

      const totalTransactions = transactions.length;
      const completedTransactions = transactions.filter(tx => tx.status === 'completed');
      const successRate = totalTransactions > 0 ? (completedTransactions.length / totalTransactions) * 100 : 0;

      // Calculate total volume and fees
      const totalVolume = transactions.reduce((sum, tx) => sum + BigInt(tx.amount), 0n);
      const totalFees = transactions.reduce((sum, tx) => sum + BigInt(tx.fee), 0n);

      // Calculate average completion time
      const completionTimes = completedTransactions
        .filter(tx => tx.completedAt)
        .map(tx => tx.completedAt!.getTime() - tx.timestamp.getTime());
      
      const averageCompletionTime = completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
        : 0;

      // Get active validators count
      let activeValidators = 0;
      for (const [chainId, contract] of this.validatorContracts) {
        try {
          const count = await contract.getActiveValidatorCount();
          activeValidators += Number(count);
        } catch (error) {
          logger.error(`Error getting validator count for chain ${chainId}:`, error);
        }
      }

      // Calculate chain-specific metrics
      const chainMetrics: { [chainId: number]: any } = {};
      for (const config of this.chainConfigs) {
        const chainTxs = transactions.filter(tx => 
          tx.sourceChain === config.chainId || tx.destinationChain === config.chainId
        );
        
        chainMetrics[config.chainId] = {
          transactions: chainTxs.length,
          volume: chainTxs.reduce((sum, tx) => sum + BigInt(tx.amount), 0n).toString(),
          fees: chainTxs.reduce((sum, tx) => sum + BigInt(tx.fee), 0n).toString()
        };
      }

      return {
        totalTransactions,
        totalVolume: totalVolume.toString(),
        totalFees: totalFees.toString(),
        successRate,
        averageCompletionTime,
        activeValidators,
        chainMetrics
      };
    } catch (error) {
      logger.error('Error calculating metrics:', error);
      return {
        totalTransactions: 0,
        totalVolume: '0',
        totalFees: '0',
        successRate: 0,
        averageCompletionTime: 0,
        activeValidators: 0,
        chainMetrics: {}
      };
    }
  }

  /**
   * Get bridge transaction by nonce
   */
  public async getBridgeTransaction(nonce: number): Promise<BridgeTransaction | null> {
    try {
      const [transaction] = await db
        .select()
        .from(bridgeTransactions)
        .where(eq(bridgeTransactions.nonce, nonce))
        .limit(1);

      return transaction || null;
    } catch (error) {
      logger.error('Error getting bridge transaction:', error);
      return null;
    }
  }

  /**
   * Get bridge transactions with pagination
   */
  public async getBridgeTransactions(
    page: number = 1,
    limit: number = 50,
    status?: string
  ): Promise<{ transactions: BridgeTransaction[]; total: number }> {
    try {
      const offset = (page - 1) * limit;
      
      let query = db.select().from(bridgeTransactions);
      
      if (status) {
        query = query.where(eq(bridgeTransactions.status, status as any));
      }
      
      const transactions = await query
        .orderBy(desc(bridgeTransactions.timestamp))
        .limit(limit)
        .offset(offset);

      // Get total count
      const totalQuery = db.select({ count: bridgeTransactions.id }).from(bridgeTransactions);
      if (status) {
        totalQuery.where(eq(bridgeTransactions.status, status as any));
      }
      
      const [{ count }] = await totalQuery;
      
      return {
        transactions,
        total: count
      };
    } catch (error) {
      logger.error('Error getting bridge transactions:', error);
      return { transactions: [], total: 0 };
    }
  }

  /**
   * Get bridge events for a transaction
   */
  public async getBridgeEvents(transactionId: string): Promise<BridgeEvent[]> {
    try {
      return await db
        .select()
        .from(bridgeEvents)
        .where(eq(bridgeEvents.transactionId, transactionId))
        .orderBy(desc(bridgeEvents.timestamp));
    } catch (error) {
      logger.error('Error getting bridge events:', error);
      return [];
    }
  }

  /**
   * Get latest bridge metrics
   */
  public async getLatestMetrics(): Promise<BridgeMetrics | null> {
    try {
      const [metrics] = await db
        .select()
        .from(bridgeMetrics)
        .orderBy(desc(bridgeMetrics.timestamp))
        .limit(1);

      if (!metrics) return null;

      return {
        totalTransactions: metrics.totalTransactions,
        totalVolume: metrics.totalVolume,
        totalFees: metrics.totalFees,
        successRate: metrics.successRate,
        averageCompletionTime: metrics.averageCompletionTime,
        activeValidators: metrics.activeValidators,
        chainMetrics: JSON.parse(metrics.chainMetrics)
      };
    } catch (error) {
      logger.error('Error getting latest metrics:', error);
      return null;
    }
  }

  /**
   * Check bridge health
   */
  public async checkBridgeHealth(): Promise<{
    isHealthy: boolean;
    issues: string[];
    chainStatus: { [chainId: number]: boolean };
  }> {
    const issues: string[] = [];
    const chainStatus: { [chainId: number]: boolean } = {};

    // Check each chain
    for (const config of this.chainConfigs) {
      if (!config.isActive) continue;

      try {
        const provider = this.providers.get(config.chainId);
        const bridgeContract = this.bridgeContracts.get(config.chainId);

        if (!provider || !bridgeContract) {
          issues.push(`Chain ${config.name} not properly initialized`);
          chainStatus[config.chainId] = false;
          continue;
        }

        // Check if provider is responsive
        await provider.getBlockNumber();
        
        // Check if bridge contract is responsive
        await bridgeContract.bridgeNonce();

        chainStatus[config.chainId] = true;
      } catch (error) {
        issues.push(`Chain ${config.name} is not responsive: ${error}`);
        chainStatus[config.chainId] = false;
      }
    }

    // Check for stuck transactions
    const stuckTransactions = await this.getStuckTransactions();
    if (stuckTransactions.length > 0) {
      issues.push(`${stuckTransactions.length} transactions stuck for over 24 hours`);
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      chainStatus
    };
  }

  /**
   * Get stuck transactions (pending for over 24 hours)
   */
  private async getStuckTransactions(): Promise<BridgeTransaction[]> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      return await db
        .select()
        .from(bridgeTransactions)
        .where(
          and(
            eq(bridgeTransactions.status, 'pending'),
            lte(bridgeTransactions.timestamp, oneDayAgo)
          )
        );
    } catch (error) {
      logger.error('Error getting stuck transactions:', error);
      return [];
    }
  }
}