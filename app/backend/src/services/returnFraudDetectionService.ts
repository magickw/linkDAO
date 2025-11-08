export class ReturnFraudDetectionService {
  async calculateRiskScore(data: {
    userId: string;
    orderId: string;
    returnReason: string;
    orderValue: number;
    accountAge: number;
    previousReturns: number;
  }): Promise<{
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    flags: string[];
  }> {
    let score = 0;
    const flags: string[] = [];

    // High return frequency
    if (data.previousReturns > 5) {
      score += 30;
      flags.push('High return frequency');
    }

    // New account
    if (data.accountAge < 30) {
      score += 20;
      flags.push('New account');
    }

    // High value order
    if (data.orderValue > 1000) {
      score += 15;
      flags.push('High value order');
    }

    // Suspicious reason
    if (data.returnReason === 'changed_mind' && data.orderValue > 500) {
      score += 25;
      flags.push('Suspicious return reason for high value');
    }

    const riskLevel = score > 60 ? 'high' : score > 30 ? 'medium' : 'low';

    return { riskScore: score, riskLevel, flags };
  }
}

export const returnFraudDetectionService = new ReturnFraudDetectionService();
