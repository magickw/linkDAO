import { orderEventHandlerService } from './orderEventHandlerService';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { 
  orders, 
  orderEvents
} from '../db/schema';
import { eq, desc, gt, sql } from 'drizzle-orm';

export class OrderEventListenerService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastProcessedEventId: number | null = null;

  /**
   * Start listening for order events
   */
  startListening() {
    // Clear any existing interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    // Start polling for new events every 30 seconds
    this.pollingInterval = setInterval(() => {
      this.checkForNewEvents();
    }, 30000);
    
    safeLogger.info('Order event listener started');
  }

  /**
   * Stop listening for order events
   */
  stopListening() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    safeLogger.info('Order event listener stopped');
  }

  /**
   * Check for new order events and process them
   */
  private async checkForNewEvents() {
    try {
      safeLogger.info('Checking for new order events...');
      
      // Build query for new events
      const query = db
        .select()
        .from(orderEvents)
        .where(this.lastProcessedEventId ? gt(orderEvents.id, this.lastProcessedEventId) : sql`true`)
        .orderBy(desc(orderEvents.timestamp))
        .limit(50); // Process up to 50 events at a time
      
      const events = await query;
      
      // Process events in chronological order (oldest first)
      for (const event of events.reverse()) {
        try {
          await orderEventHandlerService.handleOrderEvent(
            event.orderId, 
            event.eventType, 
            event.metadata ? JSON.parse(event.metadata) : undefined
          );
          
          // Update the last processed event ID
          this.lastProcessedEventId = event.id;
        } catch (error) {
          safeLogger.error(`Error processing event ${event.id}:`, error);
          // Continue processing other events
        }
      }
      
      if (events.length > 0) {
        safeLogger.info(`Processed ${events.length} order events`);
      }
    } catch (error) {
      safeLogger.error('Error checking for new order events:', error);
    }
  }

  /**
   * Manually trigger event processing for a specific order
   */
  async processOrderEvents(orderId: string) {
    try {
      // Get all events for this order
      const events = await db
        .select()
        .from(orderEvents)
        .where(eq(orderEvents.orderId, orderId))
        .orderBy(orderEvents.timestamp);
      
      // Process each event
      for (const event of events) {
        await orderEventHandlerService.handleOrderEvent(
          event.orderId, 
          event.eventType, 
          event.metadata ? JSON.parse(event.metadata) : undefined
        );
      }
      
      safeLogger.info(`Processed ${events.length} events for order ${orderId}`);
      return events.length;
    } catch (error) {
      safeLogger.error(`Error processing events for order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Process a specific event by ID
   */
  async processEventById(eventId: number) {
    try {
      // Get the specific event
      const events = await db
        .select()
        .from(orderEvents)
        .where(eq(orderEvents.id, eventId));
      
      if (events.length === 0) {
        throw new Error(`Event ${eventId} not found`);
      }
      
      const event = events[0];
      
      await orderEventHandlerService.handleOrderEvent(
        event.orderId, 
        event.eventType, 
        event.metadata ? JSON.parse(event.metadata) : undefined
      );
      
      safeLogger.info(`Processed event ${eventId}`);
      return true;
    } catch (error) {
      safeLogger.error(`Error processing event ${eventId}:`, error);
      throw error;
    }
  }
}

export const orderEventListenerService = new OrderEventListenerService();
