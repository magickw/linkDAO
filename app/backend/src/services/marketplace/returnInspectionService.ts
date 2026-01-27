import { db } from '../db/index';
import { returns, returnStatusHistory } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { safeLogger } from '../utils/logger';

export interface InspectionResult {
  condition: 'as_new' | 'good' | 'acceptable' | 'damaged' | 'unusable';
  notes: string;
  photos: string[]; // URLs to inspection photos
  passed: boolean;
  inspectorId: string;
  inspectionDate: Date;
}

export class ReturnInspectionService {
  /**
   * Record inspection results for a return
   */
  async recordInspection(
    returnId: string,
    inspection: InspectionResult
  ): Promise<void> {
    try {
      // Update return record with inspection details
      await db
        .update(returns)
        .set({
          itemCondition: inspection.condition,
          inspectionNotes: inspection.notes,
          inspectionPhotos: JSON.stringify(inspection.photos),
          inspectionPassed: inspection.passed,
          inspectedAt: inspection.inspectionDate,
          inspectedBy: inspection.inspectorId,
          status: inspection.passed ? 'inspected' : 'rejected',
          updatedAt: new Date()
        })
        .where(eq(returns.id, returnId));

      // Add status history
      await this.addStatusHistory(
        returnId,
        'received',
        inspection.passed ? 'inspected' : 'rejected',
        `Return inspection ${inspection.passed ? 'passed' : 'failed'}: ${inspection.notes}`
      );

      safeLogger.info(`Return inspection recorded: ${returnId}, passed: ${inspection.passed}`);
    } catch (error) {
      safeLogger.error('Error recording return inspection:', error);
      throw error;
    }
  }

  /**
   * Get inspection details for a return
   */
  async getInspectionDetails(returnId: string): Promise<any> {
    try {
      const [returnRecord] = await db
        .select({
          itemCondition: returns.itemCondition,
          inspectionNotes: returns.inspectionNotes,
          inspectionPhotos: returns.inspectionPhotos,
          inspectionPassed: returns.inspectionPassed,
          inspectedAt: returns.inspectedAt,
          inspectedBy: returns.inspectedBy
        })
        .from(returns)
        .where(eq(returns.id, returnId));

      if (!returnRecord) {
        throw new Error('Return not found');
      }

      return {
        ...returnRecord,
        inspectionPhotos: returnRecord.inspectionPhotos ? JSON.parse(returnRecord.inspectionPhotos) : []
      };
    } catch (error) {
      safeLogger.error('Error fetching inspection details:', error);
      throw error;
    }
  }

  /**
   * Generate inspection checklist for a return
   */
  async generateInspectionChecklist(returnId: string): Promise<any[]> {
    try {
      // Get return details
      const [returnRecord] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, returnId));

      if (!returnRecord) {
        throw new Error('Return not found');
      }

      // Parse items to return
      const itemsToReturn = returnRecord.itemsToReturn ? JSON.parse(returnRecord.itemsToReturn as string) : [];

      // Generate checklist items for each returned item
      const checklist = itemsToReturn.map((item: any) => ({
        itemId: item.itemId,
        itemName: item.name || `Item ${item.itemId}`,
        checks: [
          {
            id: 'condition',
            label: 'Item condition',
            description: 'Check for damage, wear, or defects',
            required: true,
            passed: null,
            notes: ''
          },
          {
            id: 'original_packaging',
            label: 'Original packaging',
            description: 'Verify original packaging is included',
            required: true,
            passed: null,
            notes: ''
          },
          {
            id: 'accessories',
            label: 'Accessories included',
            description: 'Verify all accessories are present',
            required: false,
            passed: null,
            notes: ''
          },
          {
            id: 'functionality',
            label: 'Functionality test',
            description: 'Test if item functions properly',
            required: true,
            passed: null,
            notes: ''
          }
        ]
      }));

      return checklist;
    } catch (error) {
      safeLogger.error('Error generating inspection checklist:', error);
      throw error;
    }
  }

  /**
   * Update inspection checklist item
   */
  async updateChecklistItem(
    returnId: string,
    itemId: string,
    checkId: string,
    passed: boolean,
    notes: string
  ): Promise<void> {
    try {
      // In a real implementation, we would store checklist progress in the database
      // For now, we'll just log the update
      safeLogger.info(`Checklist item updated: return=${returnId}, item=${itemId}, check=${checkId}, passed=${passed}`);
    } catch (error) {
      safeLogger.error('Error updating checklist item:', error);
      throw error;
    }
  }

  /**
   * Complete inspection and determine refund eligibility
   */
  async completeInspection(
    returnId: string,
    inspectorId: string,
    checklistResults: any[]
  ): Promise<{
    eligibleForRefund: boolean;
    condition: 'as_new' | 'good' | 'acceptable' | 'damaged' | 'unusable';
    notes: string;
    photos: string[];
  }> {
    try {
      // Analyze checklist results to determine overall condition
      const totalChecks = checklistResults.reduce((sum, item) => sum + item.checks.length, 0);
      const passedChecks = checklistResults.reduce((sum, item) => 
        sum + item.checks.filter((check: any) => check.passed === true).length, 0);
      
      const passRate = totalChecks > 0 ? passedChecks / totalChecks : 0;
      
      let condition: 'as_new' | 'good' | 'acceptable' | 'damaged' | 'unusable';
      let eligibleForRefund = true;
      let notes = '';
      
      if (passRate >= 0.9) {
        condition = 'as_new';
        notes = 'Item in excellent condition, eligible for full refund';
      } else if (passRate >= 0.7) {
        condition = 'good';
        notes = 'Item in good condition, eligible for full refund';
      } else if (passRate >= 0.5) {
        condition = 'acceptable';
        notes = 'Item in acceptable condition, eligible for partial refund';
      } else {
        condition = 'damaged';
        eligibleForRefund = false;
        notes = 'Item significantly damaged, not eligible for refund';
      }

      // Record the inspection
      await this.recordInspection(returnId, {
        condition,
        notes,
        photos: [], // In a real implementation, we would collect photos
        passed: eligibleForRefund,
        inspectorId,
        inspectionDate: new Date()
      });

      return {
        eligibleForRefund,
        condition,
        notes,
        photos: []
      };
    } catch (error) {
      safeLogger.error('Error completing inspection:', error);
      throw error;
    }
  }

  /**
   * Add entry to return status history
   */
  private async addStatusHistory(
    returnId: string,
    fromStatus: string,
    toStatus: string,
    notes?: string
  ): Promise<void> {
    try {
      await db.insert(returnStatusHistory).values({
        id: uuidv4(),
        returnId,
        fromStatus,
        toStatus,
        notes,
        createdAt: new Date()
      });
    } catch (error) {
      safeLogger.error('Error adding status history:', error);
    }
  }
}

export const returnInspectionService = new ReturnInspectionService();