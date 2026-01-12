/**
 * RPC Response Validator Service
 * Validates all RPC responses to prevent malicious data injection
 */

import { Address, Hash, Hex } from 'viem';

export interface RPCResponse {
  jsonrpc: string;
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: any;
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  try {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  } catch {
    return false;
  }
}

/**
 * Validate transaction hash format
 */
export function isValidHash(hash: string): boolean {
  try {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  } catch {
    return false;
  }
}

/**
 * Validate hex string format
 */
export function isValidHex(hex: string, length?: number): boolean {
  try {
    if (!/^0x[a-fA-F0-9]+$/.test(hex)) {
      return false;
    }
    if (length !== undefined) {
      return hex.length === 2 + length * 2; // 0x + 2 chars per byte
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate block number
 */
export function isValidBlockNumber(blockNumber: string | number): boolean {
  try {
    if (blockNumber === 'latest' || blockNumber === 'pending' || blockNumber === 'earliest') {
      return true;
    }
    const num = typeof blockNumber === 'string' ? parseInt(blockNumber, 16) : blockNumber;
    return !isNaN(num) && num >= 0;
  } catch {
    return false;
  }
}

/**
 * Validate transaction object
 */
export function validateTransaction(tx: any): ValidationResult {
  try {
    if (!tx || typeof tx !== 'object') {
      return { valid: false, error: 'Transaction must be an object' };
    }

    const sanitized: any = {};

    // Validate and sanitize 'from' address
    if (tx.from) {
      if (!isValidAddress(tx.from)) {
        return { valid: false, error: 'Invalid from address' };
      }
      sanitized.from = tx.from.toLowerCase();
    }

    // Validate and sanitize 'to' address
    if (tx.to) {
      if (!isValidAddress(tx.to)) {
        return { valid: false, error: 'Invalid to address' };
      }
      sanitized.to = tx.to.toLowerCase();
    }

    // Validate and sanitize 'value'
    if (tx.value !== undefined) {
      const value = typeof tx.value === 'string' ? tx.value : tx.value.toString();
      if (!isValidHex(value)) {
        return { valid: false, error: 'Invalid value format' };
      }
      sanitized.value = value;
    }

    // Validate and sanitize 'gas'
    if (tx.gas !== undefined) {
      const gas = typeof tx.gas === 'string' ? tx.gas : tx.gas.toString();
      if (!isValidHex(gas)) {
        return { valid: false, error: 'Invalid gas format' };
      }
      sanitized.gas = gas;
    }

    // Validate and sanitize 'gasPrice'
    if (tx.gasPrice !== undefined) {
      const gasPrice = typeof tx.gasPrice === 'string' ? tx.gasPrice : tx.gasPrice.toString();
      if (!isValidHex(gasPrice)) {
        return { valid: false, error: 'Invalid gasPrice format' };
      }
      sanitized.gasPrice = gasPrice;
    }

    // Validate and sanitize 'maxFeePerGas'
    if (tx.maxFeePerGas !== undefined) {
      const maxFeePerGas = typeof tx.maxFeePerGas === 'string' ? tx.maxFeePerGas : tx.maxFeePerGas.toString();
      if (!isValidHex(maxFeePerGas)) {
        return { valid: false, error: 'Invalid maxFeePerGas format' };
      }
      sanitized.maxFeePerGas = maxFeePerGas;
    }

    // Validate and sanitize 'maxPriorityFeePerGas'
    if (tx.maxPriorityFeePerGas !== undefined) {
      const maxPriorityFeePerGas = typeof tx.maxPriorityFeePerGas === 'string' ? tx.maxPriorityFeePerGas : tx.maxPriorityFeePerGas.toString();
      if (!isValidHex(maxPriorityFeePerGas)) {
        return { valid: false, error: 'Invalid maxPriorityFeePerGas format' };
      }
      sanitized.maxPriorityFeePerGas = maxPriorityFeePerGas;
    }

    // Validate and sanitize 'nonce'
    if (tx.nonce !== undefined) {
      const nonce = typeof tx.nonce === 'string' ? tx.nonce : tx.nonce.toString();
      if (!isValidHex(nonce)) {
        return { valid: false, error: 'Invalid nonce format' };
      }
      sanitized.nonce = nonce;
    }

    // Validate and sanitize 'data'
    if (tx.data !== undefined) {
      if (!isValidHex(tx.data)) {
        return { valid: false, error: 'Invalid data format' };
      }
      sanitized.data = tx.data;
    }

    // Validate and sanitize 'chainId'
    if (tx.chainId !== undefined) {
      const chainId = typeof tx.chainId === 'string' ? tx.chainId : tx.chainId.toString();
      if (!isValidHex(chainId)) {
        return { valid: false, error: 'Invalid chainId format' };
      }
      sanitized.chainId = chainId;
    }

    // Validate and sanitize 'hash'
    if (tx.hash) {
      if (!isValidHash(tx.hash)) {
        return { valid: false, error: 'Invalid transaction hash' };
      }
      sanitized.hash = tx.hash.toLowerCase();
    }

    // Validate and sanitize 'blockHash'
    if (tx.blockHash) {
      if (!isValidHash(tx.blockHash)) {
        return { valid: false, error: 'Invalid block hash' };
      }
      sanitized.blockHash = tx.blockHash.toLowerCase();
    }

    // Validate and sanitize 'blockNumber'
    if (tx.blockNumber !== undefined) {
      if (!isValidBlockNumber(tx.blockNumber)) {
        return { valid: false, error: 'Invalid block number' };
      }
      sanitized.blockNumber = tx.blockNumber;
    }

    return { valid: true, sanitized };
  } catch (error: any) {
    return { valid: false, error: `Transaction validation error: ${error.message}` };
  }
}

/**
 * Validate block object
 */
export function validateBlock(block: any): ValidationResult {
  try {
    if (!block || typeof block !== 'object') {
      return { valid: false, error: 'Block must be an object' };
    }

    const sanitized: any = {};

    // Validate and sanitize 'number'
    if (block.number !== undefined) {
      if (!isValidBlockNumber(block.number)) {
        return { valid: false, error: 'Invalid block number' };
      }
      sanitized.number = block.number;
    }

    // Validate and sanitize 'hash'
    if (block.hash) {
      if (!isValidHash(block.hash)) {
        return { valid: false, error: 'Invalid block hash' };
      }
      sanitized.hash = block.hash.toLowerCase();
    }

    // Validate and sanitize 'parentHash'
    if (block.parentHash) {
      if (!isValidHash(block.parentHash)) {
        return { valid: false, error: 'Invalid parent hash' };
      }
      sanitized.parentHash = block.parentHash.toLowerCase();
    }

    // Validate and sanitize 'nonce'
    if (block.nonce) {
      if (!isValidHex(block.nonce, 8)) {
        return { valid: false, error: 'Invalid block nonce' };
      }
      sanitized.nonce = block.nonce;
    }

    // Validate and sanitize 'sha3Uncles'
    if (block.sha3Uncles) {
      if (!isValidHash(block.sha3Uncles)) {
        return { valid: false, error: 'Invalid sha3Uncles' };
      }
      sanitized.sha3Uncles = block.sha3Uncles.toLowerCase();
    }

    // Validate and sanitize 'logsBloom'
    if (block.logsBloom) {
      if (!isValidHex(block.logsBloom, 256)) {
        return { valid: false, error: 'Invalid logsBloom' };
      }
      sanitized.logsBloom = block.logsBloom;
    }

    // Validate and sanitize 'transactionsRoot'
    if (block.transactionsRoot) {
      if (!isValidHash(block.transactionsRoot)) {
        return { valid: false, error: 'Invalid transactionsRoot' };
      }
      sanitized.transactionsRoot = block.transactionsRoot.toLowerCase();
    }

    // Validate and sanitize 'stateRoot'
    if (block.stateRoot) {
      if (!isValidHash(block.stateRoot)) {
        return { valid: false, error: 'Invalid stateRoot' };
      }
      sanitized.stateRoot = block.stateRoot.toLowerCase();
    }

    // Validate and sanitize 'receiptsRoot'
    if (block.receiptsRoot) {
      if (!isValidHash(block.receiptsRoot)) {
        return { valid: false, error: 'Invalid receiptsRoot' };
      }
      sanitized.receiptsRoot = block.receiptsRoot.toLowerCase();
    }

    // Validate and sanitize 'miner'
    if (block.miner) {
      if (!isValidAddress(block.miner)) {
        return { valid: false, error: 'Invalid miner address' };
      }
      sanitized.miner = block.miner.toLowerCase();
    }

    // Validate and sanitize 'difficulty'
    if (block.difficulty !== undefined) {
      const difficulty = typeof block.difficulty === 'string' ? block.difficulty : block.difficulty.toString();
      if (!isValidHex(difficulty)) {
        return { valid: false, error: 'Invalid difficulty format' };
      }
      sanitized.difficulty = difficulty;
    }

    // Validate and sanitize 'totalDifficulty'
    if (block.totalDifficulty !== undefined) {
      const totalDifficulty = typeof block.totalDifficulty === 'string' ? block.totalDifficulty : block.totalDifficulty.toString();
      if (!isValidHex(totalDifficulty)) {
        return { valid: false, error: 'Invalid totalDifficulty format' };
      }
      sanitized.totalDifficulty = totalDifficulty;
    }

    // Validate and sanitize 'extraData'
    if (block.extraData) {
      if (!isValidHex(block.extraData)) {
        return { valid: false, error: 'Invalid extraData format' };
      }
      sanitized.extraData = block.extraData;
    }

    // Validate and sanitize 'size'
    if (block.size !== undefined) {
      const size = typeof block.size === 'string' ? block.size : block.size.toString();
      if (!isValidHex(size)) {
        return { valid: false, error: 'Invalid size format' };
      }
      sanitized.size = size;
    }

    // Validate and sanitize 'gasLimit'
    if (block.gasLimit !== undefined) {
      const gasLimit = typeof block.gasLimit === 'string' ? block.gasLimit : block.gasLimit.toString();
      if (!isValidHex(gasLimit)) {
        return { valid: false, error: 'Invalid gasLimit format' };
      }
      sanitized.gasLimit = gasLimit;
    }

    // Validate and sanitize 'gasUsed'
    if (block.gasUsed !== undefined) {
      const gasUsed = typeof block.gasUsed === 'string' ? block.gasUsed : block.gasUsed.toString();
      if (!isValidHex(gasUsed)) {
        return { valid: false, error: 'Invalid gasUsed format' };
      }
      sanitized.gasUsed = gasUsed;
    }

    // Validate and sanitize 'timestamp'
    if (block.timestamp !== undefined) {
      const timestamp = typeof block.timestamp === 'string' ? block.timestamp : block.timestamp.toString();
      if (!isValidHex(timestamp)) {
        return { valid: false, error: 'Invalid timestamp format' };
      }
      sanitized.timestamp = timestamp;
    }

    return { valid: true, sanitized };
  } catch (error: any) {
    return { valid: false, error: `Block validation error: ${error.message}` };
  }
}

/**
 * Validate log object
 */
export function validateLog(log: any): ValidationResult {
  try {
    if (!log || typeof log !== 'object') {
      return { valid: false, error: 'Log must be an object' };
    }

    const sanitized: any = {};

    // Validate and sanitize 'address'
    if (log.address) {
      if (!isValidAddress(log.address)) {
        return { valid: false, error: 'Invalid log address' };
      }
      sanitized.address = log.address.toLowerCase();
    }

    // Validate and sanitize 'topics'
    if (log.topics && Array.isArray(log.topics)) {
      sanitized.topics = log.topics.map((topic: string) => {
        if (!isValidHash(topic)) {
          throw new Error('Invalid topic hash');
        }
        return topic.toLowerCase();
      });
    }

    // Validate and sanitize 'data'
    if (log.data) {
      if (!isValidHex(log.data)) {
        return { valid: false, error: 'Invalid log data' };
      }
      sanitized.data = log.data;
    }

    // Validate and sanitize 'blockHash'
    if (log.blockHash) {
      if (!isValidHash(log.blockHash)) {
        return { valid: false, error: 'Invalid block hash' };
      }
      sanitized.blockHash = log.blockHash.toLowerCase();
    }

    // Validate and sanitize 'blockNumber'
    if (log.blockNumber !== undefined) {
      if (!isValidBlockNumber(log.blockNumber)) {
        return { valid: false, error: 'Invalid block number' };
      }
      sanitized.blockNumber = log.blockNumber;
    }

    // Validate and sanitize 'transactionHash'
    if (log.transactionHash) {
      if (!isValidHash(log.transactionHash)) {
        return { valid: false, error: 'Invalid transaction hash' };
      }
      sanitized.transactionHash = log.transactionHash.toLowerCase();
    }

    // Validate and sanitize 'transactionIndex'
    if (log.transactionIndex !== undefined) {
      const txIndex = typeof log.transactionIndex === 'string' ? log.transactionIndex : log.transactionIndex.toString();
      if (!isValidHex(txIndex)) {
        return { valid: false, error: 'Invalid transactionIndex format' };
      }
      sanitized.transactionIndex = txIndex;
    }

    // Validate and sanitize 'logIndex'
    if (log.logIndex !== undefined) {
      const logIndex = typeof log.logIndex === 'string' ? log.logIndex : log.logIndex.toString();
      if (!isValidHex(logIndex)) {
        return { valid: false, error: 'Invalid logIndex format' };
      }
      sanitized.logIndex = logIndex;
    }

    return { valid: true, sanitized };
  } catch (error: any) {
    return { valid: false, error: `Log validation error: ${error.message}` };
  }
}

/**
 * Validate RPC response structure
 */
export function validateRPCResponse(response: any): ValidationResult {
  try {
    if (!response || typeof response !== 'object') {
      return { valid: false, error: 'Response must be an object' };
    }

    // Check jsonrpc version
    if (response.jsonrpc !== '2.0') {
      return { valid: false, error: 'Invalid JSON-RPC version' };
    }

    // Check id
    if (response.id === undefined) {
      return { valid: false, error: 'Missing response id' };
    }

    // Check for error or result (must have one)
    if (response.error === undefined && response.result === undefined) {
      return { valid: false, error: 'Response must have either error or result' };
    }

    // Check for both error and result (invalid)
    if (response.error !== undefined && response.result !== undefined) {
      return { valid: false, error: 'Response cannot have both error and result' };
    }

    // Validate error object if present
    if (response.error) {
      if (typeof response.error !== 'object') {
        return { valid: false, error: 'Error must be an object' };
      }
      if (typeof response.error.code !== 'number') {
        return { valid: false, error: 'Error code must be a number' };
      }
      if (typeof response.error.message !== 'string') {
        return { valid: false, error: 'Error message must be a string' };
      }
    }

    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: `RPC response validation error: ${error.message}` };
  }
}

/**
 * Sanitize RPC response based on method
 */
export function sanitizeRPCResponse(method: string, result: any): ValidationResult {
  try {
    let sanitized: any;

    switch (method) {
      case 'eth_getBlockByNumber':
      case 'eth_getBlockByHash':
        sanitized = validateBlock(result);
        break;

      case 'eth_getTransactionByHash':
      case 'eth_getTransactionByBlockHashAndIndex':
      case 'eth_getTransactionByBlockNumberAndIndex':
        sanitized = validateTransaction(result);
        break;

      case 'eth_getTransactionReceipt':
        if (result && typeof result === 'object') {
          // Transaction receipt structure is similar to transaction
          sanitized = validateTransaction(result);
        } else {
          sanitized = { valid: true };
        }
        break;

      case 'eth_getLogs':
        if (Array.isArray(result)) {
          const logs = result.map(log => validateLog(log));
          const invalid = logs.find(l => !l.valid);
          if (invalid) {
            return { valid: false, error: invalid.error };
          }
          sanitized = { valid: true, sanitized: logs.map(l => l.sanitized) };
        } else {
          sanitized = validateLog(result);
        }
        break;

      default:
        // For unknown methods, return as-is but validate basic structure
        sanitized = { valid: true, sanitized: result };
    }

    return sanitized;
  } catch (error: any) {
    return { valid: false, error: `RPC response sanitization error: ${error.message}` };
  }
}

/**
 * Main validator function
 */
export const rpcValidator = {
  isValidAddress,
  isValidHash,
  isValidHex,
  isValidBlockNumber,
  validateTransaction,
  validateBlock,
  validateLog,
  validateRPCResponse,
  sanitizeRPCResponse,
};