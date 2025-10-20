import { Request, Response } from 'express';
import { orderEventHandlerService } from '../services/orderEventHandlerService';
import { apiResponse } from '../utils/apiResponse';

export class OrderEventHandlerController {
  /**
   * Handle order event
   * POST /api/order-events/handle
   */
  async handleOrderEvent(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, eventType, eventData } = req.body;
      
      // Validate input
      if (!orderId || !eventType) {
        res.status(400).json(apiResponse.error('orderId and eventType are required', 400));
        return;
      }
      
      // Handle the order event
      await orderEventHandlerService.handleOrderEvent(orderId, eventType, eventData);
      
      res.json(apiResponse.success(null, `Order event ${eventType} handled successfully for order ${orderId}`));
    } catch (error) {
      console.error('Error handling order event:', error);
      res.status(500).json(apiResponse.error('Failed to handle order event'));
    }
  }

  /**
   * Process pending order events
   * POST /api/order-events/process-pending
   */
  async processPendingEvents(req: Request, res: Response): Promise<void> {
    try {
      await orderEventHandlerService.processPendingOrderEvents();
      res.json(apiResponse.success(null, 'Pending order events processed successfully'));
    } catch (error) {
      console.error('Error processing pending order events:', error);
      res.status(500).json(apiResponse.error('Failed to process pending order events'));
    }
  }
}

export const orderEventHandlerController = new OrderEventHandlerController();