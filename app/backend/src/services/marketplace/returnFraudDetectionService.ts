import { fraudDetectionEngine, ReturnData } from './fraudDetectionEngine';

/**
 * Return Fraud Detection Service
 * Legacy wrapper for backward compatibility
 * 
 * This service now delegates to the comprehensive FraudDetectionEngine
 */
export class ReturnFraudDetectionService {
  /**
   * Calculate risk score for a return
   * @deprecated Use fraudDetectionEngine.assessReturnRisk() instead
   */
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
    // Convert to new format
    const returnData: ReturnData = {
      returnId: `temp_${Date.now()}`, // Temporary ID for legacy calls
      userId: data.userId,
      orderId: data.orderId,
      returnReason: data.returnReason,
      orderValue: data.orderValue,
      refundAmount: data.orderValue, // Assume full refund for legacy calls
      itemsToReturn: [],
      createdAt: new Date(),
    };

    // Use new engine
    const assessment = await fraudDetectionEngine.assessReturnRisk(returnData);

    return {
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      flags: assessment.flags,
    };
  }
}

export const returnFraudDetectionService = new ReturnFraudDetectionService();
