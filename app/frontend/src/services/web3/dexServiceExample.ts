/**
 * Example usage of the DEX service
 * This file demonstrates how to use the updated DEX service with real contract interactions
 */

import { dexService } from './dexService';

// Example: Get quotes for swapping ETH to LDAO
async function getSwapQuotes() {
  try {
    console.log('Getting swap quotes for ETH to LDAO...');
    
    const quotes = await dexService.getSwapQuotes('ETH', 'LDAO', '1.0', 0.5);
    
    console.log('Received quotes:');
    quotes.forEach(quote => {
      console.log(`- ${quote.dex.toUpperCase()}: ${quote.expectedAmount} LDAO (min: ${quote.toAmount} LDAO)`);
    });
    
    return quotes;
  } catch (error) {
    console.error('Error getting swap quotes:', error);
  }
}

// Example: Approve token spending before swap
async function approveTokenSpending() {
  try {
    console.log('Approving ETH spending for Uniswap...');
    
    // Approve 1 ETH for Uniswap router
    const result = await dexService.approveToken(
      'ETH', 
      '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap router address
      '1.0'
    );
    
    if (result.success) {
      console.log('Token approval successful:', result.transactionHash);
    } else {
      console.error('Token approval failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error approving token spending:', error);
  }
}

// Example: Execute a swap on Uniswap
async function executeUniswapSwap() {
  try {
    console.log('Executing swap on Uniswap...');
    
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
    
    const result = await dexService.swapOnUniswap(
      'ETH',
      'LDAO',
      '1.0', // 1 ETH
      '1000.0', // Minimum 1000 LDAO
      deadline
    );
    
    if (result.status === 'success') {
      console.log('Swap successful:', result.transactionHash);
    } else {
      console.error('Swap failed:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error executing swap:', error);
  }
}

// Export examples for use in other modules
export {
  getSwapQuotes,
  approveTokenSpending,
  executeUniswapSwap
};