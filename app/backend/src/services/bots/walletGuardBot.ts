import { AIBot, getAIService, AIResponse } from '../aiService';

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
        description: 'Analyzes transactions for safety and detects potential scams',
        scope: ['wallet', 'security'],
        permissions: ['read-transactions'],
        aiModel: 'gpt-4-turbo',
        persona: 'security-expert',
      },
      getAIService()
    );
  }

  async analyzeTransaction(transaction: TransactionData, userAddress: string): Promise<{ 
    isSafe: boolean; 
    riskLevel: 'low' | 'medium' | 'high'; 
    explanation: string;
    recommendations: string[];
  }> {
    // In a real implementation, we would analyze the transaction details
    // For now, we'll return a mock analysis
    return {
      isSafe: true,
      riskLevel: 'low',
      explanation: 'Transaction appears safe based on analysis',
      recommendations: ['Always verify contract addresses before signing']
    };
  }

  async processMessage(userMessage: string, userId: string): Promise<AIResponse> {
    const prompt = `
      User is asking about wallet security: "${userMessage}"
      
      Provide guidance on:
      1. Best practices for wallet security
      2. How to identify potential scams
      3. What to do if they suspect a scam
      4. General security recommendations
    `;

    return await this.aiService.generateText([
      {
        role: 'system',
        content: 'You are a blockchain security expert helping users protect their assets.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);
  }
}