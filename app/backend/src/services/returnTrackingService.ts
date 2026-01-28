import axios from 'axios';
import { db } from '../db/index';
import { returns, returnStatusHistory } from '../db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { safeLogger } from '../utils/logger';

export interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  events: Array<{
    timestamp: string;
    status: string;
    location: string;
    description: string;
  }>;
}

export class ReturnTrackingService {
  /**
   * Update return tracking information
   */
  async updateReturnTracking(
    returnId: string, 
    trackingNumber: string, 
    carrier: string
  ): Promise<void> {
    try {
      // Update return record with tracking info
      await db
        .update(returns)
        .set({
          returnTrackingNumber: trackingNumber,
          returnCarrier: carrier,
          status: 'label_generated', // Update status to indicate label has been generated
          updatedAt: new Date()
        })
        .where(eq(returns.id, returnId));

      // Add status history
      await this.addStatusHistory(
        returnId, 
        'approved', 
        'label_generated', 
        `Return label generated with tracking: ${trackingNumber}`
      );

      safeLogger.info(`Return tracking updated: ${returnId}, tracking: ${trackingNumber}`);
    } catch (error) {
      safeLogger.error('Error updating return tracking:', error);
      throw error;
    }
  }

  /**
   * Track return shipment and get real-time status
   */
  async trackReturnShipment(
    trackingNumber: string, 
    carrier: string
  ): Promise<TrackingInfo> {
    try {
      let trackingInfo: TrackingInfo;
      
      switch (carrier.toUpperCase()) {
        case 'FEDEX':
          trackingInfo = await this.trackFedExReturn(trackingNumber);
          break;
        case 'UPS':
          trackingInfo = await this.trackUPSReturn(trackingNumber);
          break;
        case 'DHL':
          trackingInfo = await this.trackDHLReturn(trackingNumber);
          break;
        case 'USPS':
          trackingInfo = await this.trackUSPSReturn(trackingNumber);
          break;
        default:
          throw new Error(`Unsupported carrier for tracking: ${carrier}`);
      }

      return trackingInfo;
    } catch (error) {
      safeLogger.error('Error tracking return shipment:', error);
      throw error;
    }
  }

  /**
   * Process tracking updates for a return
   */
  async processTrackingUpdate(
    returnId: string, 
    trackingNumber: string, 
    carrier: string
  ): Promise<void> {
    try {
      // Get current return record
      const [returnRecord] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, returnId));

      if (!returnRecord) {
        throw new Error('Return record not found');
      }

      // Get latest tracking information
      const trackingInfo = await this.trackReturnShipment(trackingNumber, carrier);

      // Update return record based on tracking status
      let newStatus = returnRecord.status;
      let statusNotes = '';

      // Determine new status based on tracking info
      if (trackingInfo.status.toLowerCase().includes('in transit')) {
        newStatus = 'in_transit';
        statusNotes = `Return package is in transit with carrier: ${carrier}`;
      } else if (trackingInfo.status.toLowerCase().includes('delivered')) {
        newStatus = 'received';
        statusNotes = `Return package delivered to seller`;
        
        // Update received timestamp
        await db
          .update(returns)
          .set({
            receivedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(returns.id, returnId));
      } else if (trackingInfo.status.toLowerCase().includes('exception')) {
        newStatus = 'received'; // Still received but with exception
        statusNotes = `Return package delivered with exception: ${trackingInfo.status}`;
        
        // Update received timestamp
        await db
          .update(returns)
          .set({
            receivedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(returns.id, returnId));
      }

      // Update return status if changed
      if (newStatus !== returnRecord.status) {
        await db
          .update(returns)
          .set({
            status: newStatus,
            updatedAt: new Date()
          })
          .where(eq(returns.id, returnId));

        // Add status history
        await this.addStatusHistory(
          returnId,
          returnRecord.status,
          newStatus,
          statusNotes
        );
      }

      safeLogger.info(`Return tracking update processed: ${returnId}, status: ${newStatus}`);
    } catch (error) {
      safeLogger.error('Error processing return tracking update:', error);
      throw error;
    }
  }

  /**
   * Schedule periodic tracking updates for a return
   */
  scheduleReturnTrackingUpdates(
    returnId: string, 
    trackingNumber: string, 
    carrier: string
  ): void {
    // Check if we already have an interval for this return
    const existingInterval = this.getTrackingInterval(returnId);
    if (existingInterval) {
      clearInterval(existingInterval.intervalId);
    }

    // Schedule updates every 2 hours for the next 30 days
    const intervalId = setInterval(async () => {
      try {
        await this.processTrackingUpdate(returnId, trackingNumber, carrier);
        
        // Check if the return has reached a final state
        const [returnRecord] = await db
          .select()
          .from(returns)
          .where(eq(returns.id, returnId));

        if (returnRecord && ['received', 'inspected', 'refund_processing', 'completed'].includes(returnRecord.status)) {
          // Stop tracking updates since the return is in a final state
          clearInterval(intervalId);
          this.clearTrackingInterval(returnId);
        }
      } catch (error) {
        safeLogger.error(`Error in scheduled tracking update for return ${returnId}:`, error);
      }
    }, 2 * 60 * 60 * 1000); // Every 2 hours

    // Store interval reference to clear later if needed
    this.storeTrackingInterval(returnId, intervalId);

    // Clear interval after 30 days
    setTimeout(() => {
      clearInterval(intervalId);
      this.clearTrackingInterval(returnId);
    }, 30 * 24 * 60 * 60 * 1000);
  }

  /**
   * Get return status with tracking information
   */
  async getReturnWithTracking(returnId: string): Promise<any> {
    try {
      const [returnRecord] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, returnId));

      if (!returnRecord) {
        throw new Error('Return not found');
      }

      // If we have tracking information, get the latest tracking status
      let trackingInfo = null;
      if (returnRecord.returnTrackingNumber && returnRecord.returnCarrier) {
        try {
          trackingInfo = await this.trackReturnShipment(
            returnRecord.returnTrackingNumber,
            returnRecord.returnCarrier
          );
        } catch (error) {
          safeLogger.warn(`Could not retrieve tracking info for return ${returnId}:`, error);
          // Return the return record with null tracking info rather than throwing
        }
      }

      return {
        ...this.formatReturnResponse(returnRecord),
        trackingInfo
      };
    } catch (error) {
      safeLogger.error('Error getting return with tracking:', error);
      throw error;
    }
  }

  // Private methods for carrier-specific tracking
  private async trackFedExReturn(trackingNumber: string): Promise<TrackingInfo> {
    try {
      // In a real implementation, we would call the FedEX API
      // For now, we'll simulate the response
      return {
        trackingNumber,
        carrier: 'FEDEX',
        status: 'In Transit',
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        actualDelivery: undefined,
        events: [
          {
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            status: 'Shipped',
            location: 'Origin Facility',
            description: 'Package has been shipped'
          },
          {
            timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            status: 'In Transit',
            location: 'Sorting Facility',
            description: 'Package in transit to destination'
          }
        ]
      };
    } catch (error) {
      safeLogger.error('FedEx return tracking error:', error);
      throw new Error('Failed to track FedEx return');
    }
  }

  private async trackUPSReturn(trackingNumber: string): Promise<TrackingInfo> {
    try {
      // In a real implementation, we would call the UPS API
      // For now, we'll simulate the response
      return {
        trackingNumber,
        carrier: 'UPS',
        status: 'In Transit',
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        actualDelivery: undefined,
        events: [
          {
            timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
            status: 'Processed',
            location: 'Distribution Center',
            description: 'Package processed for return shipping'
          }
        ]
      };
    } catch (error) {
      safeLogger.error('UPS return tracking error:', error);
      throw new Error('Failed to track UPS return');
    }
  }

  private async trackDHLReturn(trackingNumber: string): Promise<TrackingInfo> {
    try {
      // In a real implementation, we would call the DHL API
      // For now, we'll simulate the response
      return {
        trackingNumber,
        carrier: 'DHL',
        status: 'In Transit',
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        actualDelivery: undefined,
        events: [
          {
            timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
            status: 'Pickup',
            location: 'Pickup Point',
            description: 'Package picked up for return'
          }
        ]
      };
    } catch (error) {
      safeLogger.error('DHL return tracking error:', error);
      throw new Error('Failed to track DHL return');
    }
  }

  private async trackUSPSReturn(trackingNumber: string): Promise<TrackingInfo> {
    try {
      // In a real implementation, we would call the USPS API
      // For now, we'll simulate the response
      return {
        trackingNumber,
        carrier: 'USPS',
        status: 'In Transit',
        estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        actualDelivery: undefined,
        events: [
          {
            timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            status: 'Accepted',
            location: 'Post Office',
            description: 'Package accepted for return shipping'
          }
        ]
      };
    } catch (error) {
      safeLogger.error('USPS return tracking error:', error);
      throw new Error('Failed to track USPS return');
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
        id: randomUUID(),
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

  /**
   * Format return response to parse JSON fields
   */
  private formatReturnResponse(returnRecord: any): any {
    return {
      ...returnRecord,
      itemsToReturn: returnRecord.itemsToReturn ? JSON.parse(returnRecord.itemsToReturn) : [],
      riskFactors: returnRecord.riskFactors ? JSON.parse(returnRecord.riskFactors) : []
    };
  }

  // In-memory tracking of intervals
  private trackingIntervals = new Map<string, { intervalId: NodeJS.Timeout; createdAt: Date }>();

  private storeTrackingInterval(returnId: string, intervalId: NodeJS.Timeout): void {
    this.trackingIntervals.set(returnId, {
      intervalId,
      createdAt: new Date()
    });
  }

  private getTrackingInterval(returnId: string) {
    return this.trackingIntervals.get(returnId);
  }

  private clearTrackingInterval(returnId: string): void {
    const interval = this.getTrackingInterval(returnId);
    if (interval) {
      clearInterval(interval.intervalId);
      this.trackingIntervals.delete(returnId);
    }
  }
}

export const returnTrackingService = new ReturnTrackingService();