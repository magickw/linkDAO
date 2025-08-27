import { AIBot, aiService, AIResponse } from '../aiService';

interface TransactionData {
  from: string;
  to: string;
  value: string;
  data: string;
  gasLimit: string;
  gasPrice: string;
}

export class WalletGuardBot extends AIBot {
  constructor() {
    super(
      {
        name: 'Wallet Guard',
        description: 'Protects your wallet from scams and suspicious transactions',
        scope: ['wallet', 'security'],
        permissions: ['read-transactions', 'read-contract-abi'],
        aiModel: 'gpt-4-turbo',
        persona: 'security-expert',
      },
      aiService
    );
  }

  async analyzeTransaction(transaction: TransactionData, userAddress: string): Promise<AIResponse> {
    // Get user's on-chain activity for context
    const userActivity = await this.aiService.getUserOnChainActivity(userAddress);
    
    // Create a prompt for the AI to analyze the transaction
    const prompt = `
      Analyze this Ethereum transaction for potential security risks:
      
      Transaction Details:
      From: ${transaction.from}
      To: ${transaction.to}
      Value: ${transaction.value} ETH
      Data: ${transaction.data.substring(0, 1000)}${transaction.data.length > 1000 ? '...' : ''}
      Gas Limit: ${transaction.gasLimit}
      Gas Price: ${transaction.gasPrice}
      
      User Activity Context:
      Transaction Count: ${userActivity?.transactionCount || 'Unknown'}
      Balance: ${userActivity?.balance || 'Unknown'} ETH
      
      Please analyze:
      1. Is this a known scam or phishing contract?
      2. Are there any suspicious patterns in the transaction data?
      3. Does the gas limit seem unusually high?
      4. Is the recipient address associated with known malicious activity?
      5. Any other security concerns?
      
      Provide a risk assessment (Low/Medium/High/Critical) and a brief explanation.
    `;

    return await this.aiService.generateText([
      {
        role: 'system',
        content: 'You are a blockchain security expert that helps users identify potentially malicious transactions.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);
  }

  async processMessage(userMessage: string, userId: string): Promise<AIResponse> {
    // For Wallet Guard, we expect structured transaction data
    // In a real implementation, this would come from the wallet integration
    const prompt = `
      User is asking about wallet security: "${userMessage}"
      
      Provide security advice related to:
      1. Identifying phishing attempts
      2. Recognizing scam tokens or contracts
      3. Best practices for wallet management
      4. How to verify contract legitimacy
    `;

    return await this.aiService.generateText([
      {
        role: 'system',
        content: 'You are a blockchain security expert helping users protect their wallets.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);
  }
}