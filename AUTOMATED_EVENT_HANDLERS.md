# Automated Event Handlers

## Overview

The Automated Event Handlers system provides real-time processing of order events to trigger appropriate messaging automation. This system listens for order-related events and automatically sends notifications, updates conversations, and manages dispute escalations.

## Components

### 1. OrderEventHandlerService

Located at: `app/backend/src/services/orderEventHandlerService.ts`

This service handles specific order events and triggers the appropriate messaging automation:

- **ORDER_CREATED**: Creates order conversation and sends welcome message
- **PAYMENT_RECEIVED**: Sends payment confirmation notification
- **ORDER_SHIPPED**: Sends tracking information and shipping update
- **DISPUTE_INITIATED**: Escalates conversation to dispute and notifies moderator

### 2. OrderEventListenerService

Located at: `app/backend/src/services/orderEventListenerService.ts`

This service automatically listens for new order events and processes them:

- **Polling Mechanism**: Checks for new events every 30 seconds
- **Event Processing**: Processes events in chronological order
- **Error Handling**: Continues processing even if individual events fail
- **Manual Processing**: Allows manual triggering of event processing

### 3. OrderEventHandlerController & Routes

Located at:
- `app/backend/src/controllers/orderEventHandlerController.ts`
- `app/backend/src/routes/orderEventHandlerRoutes.ts`

Provides API endpoints for external systems to trigger event handling:

- **POST /api/order-events/handle**: Handle a specific order event
- **POST /api/order-events/process-pending**: Process pending order events

### 4. Integration with OrderMessagingAutomation

The automated event handlers integrate with the existing `OrderMessagingAutomation` service to perform the actual messaging operations.

## Event Types

### ORDER_CREATED
Triggered when a new order is created:
- Creates a conversation between buyer and seller
- Sends order confirmation message
- Notifies seller via WebSocket

### PAYMENT_RECEIVED
Triggered when payment is confirmed:
- Sends payment confirmation to buyer and seller
- Updates conversation with payment details

### ORDER_SHIPPED
Triggered when order is shipped:
- Sends tracking information to buyer
- Updates conversation with shipping details
- Links tracking record to conversation

### DISPUTE_INITIATED
Triggered when a dispute is opened:
- Updates conversation type to 'dispute'
- Adds moderator to conversation
- Notifies all parties of dispute escalation

## Implementation Details

### Event Listening
The system uses a polling mechanism to check for new events every 30 seconds. This approach was chosen for simplicity and reliability, though a webhook or message queue system could be implemented for higher performance.

### Error Handling
Each event is processed independently, so if one event fails, it doesn't affect the processing of other events. Errors are logged for debugging and monitoring.

### Data Retrieval
When event data is not provided in the event handler call, the system automatically retrieves the necessary data from the database.

## API Endpoints

### Handle Order Event
```
POST /api/order-events/handle
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": 123,
  "eventType": "ORDER_CREATED",
  "eventData": {
    // Optional event-specific data
  }
}
```

### Process Pending Events
```
POST /api/order-events/process-pending
Authorization: Bearer <token>
```

## Testing

### Unit Tests
Located at: `app/backend/src/tests/orderEventHandler.test.ts`

Tests cover:
- Event handling for each event type
- Error handling for unknown event types
- Pending event processing

### Integration Tests
Located at: `app/backend/src/tests/orderEventHandlerRoutes.test.ts`

Tests cover:
- Authentication requirements
- Input validation
- Successful request processing

## Deployment

The automated event handlers are automatically started when the backend server starts. The system is designed to be resilient and continue operating even if individual events fail to process.

## Monitoring

The system logs all event processing activities, which can be monitored through:
- Console logs
- Error tracking systems
- Custom monitoring dashboards

## Future Enhancements

1. **Real-time Event Processing**: Implement webhook or message queue integration for immediate event processing
2. **Advanced Retry Logic**: Add exponential backoff for failed event processing
3. **Event Filtering**: Allow configuration of which events to process
4. **Batch Processing**: Process multiple events in a single operation for better performance
5. **Event Prioritization**: Prioritize critical events (like disputes) over informational events