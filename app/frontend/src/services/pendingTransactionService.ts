/**
 * PendingTransactionService - Service for tracking locally submitted transactions
 * that haven't yet been indexed by block explorers.
 */

export interface PendingTransaction {
  id: string;
  hash: string;
  type: 'send' | 'receive' | 'swap' | 'stake' | 'contract_interaction';
  amount: string;
  token: string;
  valueUSD?: number;
  from: string;
  to: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  chainId: number;
}

class PendingTransactionService {
  private readonly STORAGE_KEY = 'linkdao_pending_transactions';
  private pendingTxs: PendingTransaction[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
    
    // Clean up old pending transactions on initialization
    this.cleanup();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        this.pendingTxs = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse pending transactions', e);
        this.pendingTxs = [];
      }
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.pendingTxs));
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  addTransaction(tx: Omit<PendingTransaction, 'id' | 'status' | 'timestamp'>) {
    const newTx: PendingTransaction = {
      ...tx,
      id: `local_${tx.hash}`,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    // Avoid duplicates
    if (!this.pendingTxs.some(t => t.hash === tx.hash)) {
      this.pendingTxs.unshift(newTx);
      this.saveToStorage();
    }
  }

  getTransactions(address: string, chainId?: number): PendingTransaction[] {
    return this.pendingTxs.filter(tx => 
      tx.from.toLowerCase() === address.toLowerCase() && 
      (!chainId || tx.chainId === chainId)
    );
  }

  removeTransaction(hash: string) {
    this.pendingTxs = this.pendingTxs.filter(tx => tx.hash !== hash);
    this.saveToStorage();
  }

  updateTransactionStatus(hash: string, status: 'confirmed' | 'failed') {
    const tx = this.pendingTxs.find(t => t.hash === hash);
    if (tx) {
      tx.status = status;
      this.saveToStorage();
    }
  }

  /**
   * Remove transactions that are older than 30 minutes
   * (By then they should definitely be indexed or failed)
   */
  private cleanup() {
    const now = Date.now();
    const expiry = 30 * 60 * 1000; // 30 minutes
    
    const initialCount = this.pendingTxs.length;
    this.pendingTxs = this.pendingTxs.filter(tx => {
      const txTime = new Date(tx.timestamp).getTime();
      return now - txTime < expiry;
    });

    if (this.pendingTxs.length !== initialCount) {
      this.saveToStorage();
    }
  }
}

export const pendingTransactionService = new PendingTransactionService();
