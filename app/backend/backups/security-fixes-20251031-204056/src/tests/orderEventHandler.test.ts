import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { orderEventHandlerService } from '../services/orderEventHandlerService';
import { orderEventListenerService } from '../services/orderEventListenerService';
import { orderMessagingAutomation } from '../services/orderMessagingAutomation';

// Mock the order messaging automation service
jest.mock('../services/orderMessagingAutomation');

describe('Order Event Handler Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('handleOrderEvent', () => {
    it('should handle ORDER_CREATED event', async () => {
      const orderId = 123;
      const eventType = 'ORDER_CREATED';
      
      await orderEventHandlerService.handleOrderEvent(orderId, eventType);
      
      expect(orderMessagingAutomation.onOrderCreated).toHaveBeenCalledWith(orderId);
    });

    it('should handle PAYMENT_RECEIVED event', async () => {
      const orderId = 123;
      const eventType = 'PAYMENT_RECEIVED';
      const eventData = { amount: '100', token: 'ETH' };
      
      await orderEventHandlerService.handleOrderEvent(orderId, eventType, eventData);
      
      expect(orderMessagingAutomation.onPaymentReceived).toHaveBeenCalledWith(orderId, eventData);
    });

    it('should handle ORDER_SHIPPED event', async () => {
      const orderId = 123;
      const eventType = 'ORDER_SHIPPED';
      const eventData = { trackingNumber: '123456789', carrier: 'FedEx' };
      
      await orderEventHandlerService.handleOrderEvent(orderId, eventType, eventData);
      
      expect(orderMessagingAutomation.onOrderShipped).toHaveBeenCalledWith(orderId, eventData);
    });

    it('should handle DISPUTE_INITIATED event', async () => {
      const orderId = 123;
      const eventType = 'DISPUTE_INITIATED';
      const eventData = { disputeId: 456 };
      
      await orderEventHandlerService.handleOrderEvent(orderId, eventType, eventData);
      
      expect(orderMessagingAutomation.onDisputeOpened).toHaveBeenCalledWith(456);
    });

    it('should handle unknown event types gracefully', async () => {
      const orderId = 123;
      const eventType = 'UNKNOWN_EVENT';
      
      // Should not throw an error for unknown event types
      await expect(orderEventHandlerService.handleOrderEvent(orderId, eventType))
        .resolves.not.toThrow();
    });
  });

  describe('processPendingOrderEvents', () => {
    it('should process pending events without error', async () => {
      await expect(orderEventHandlerService.processPendingOrderEvents())
        .resolves.not.toThrow();
    });
  });
});

describe('Order Event Listener Service', () => {
  describe('startListening and stopListening', () => {
    it('should start and stop listening without error', () => {
      expect(() => {
        orderEventListenerService.startListening();
        orderEventListenerService.stopListening();
      }).not.toThrow();
    });
  });

  describe('processOrderEvents', () => {
    it('should process order events without error', async () => {
      // Mock the database query
      jest.spyOn(orderEventHandlerService, 'handleOrderEvent').mockResolvedValue();
      
      await expect(orderEventListenerService.processOrderEvents(123))
        .resolves.toBeGreaterThanOrEqual(0);
    });
  });

  describe('processEventById', () => {
    it('should handle event not found error', async () => {
      // Mock the database query to return empty array
      await expect(orderEventListenerService.processEventById(999))
        .rejects.toThrow('Event 999 not found');
    });
  });
});