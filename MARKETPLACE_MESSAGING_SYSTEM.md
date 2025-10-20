# Marketplace Messaging System

## Overview

The Marketplace Messaging System enhances the existing messaging infrastructure with buyer-seller specific features for order communication, product inquiries, and dispute resolution.

## Key Features

### 1. Order-Based Conversations
- Auto-created conversations for every order
- Order context embedded in conversation metadata
- Unified timeline showing messages + order events

### 2. Marketplace-Specific Message Types
- Order status updates (shipped, delivered, cancelled)
- Payment confirmations
- Tracking number sharing
- Dispute escalations
- Product inquiry templates

### 3. Seller Quick Replies & Templates
- Pre-defined message templates for common responses
- Quick reply suggestions based on message content
- Keyboard shortcuts for templates

### 4. Conversation Analytics
- Seller response time tracking
- Conversion rate metrics (inquiries → sales)
- Message volume and engagement metrics

### 5. Automated Notifications
- Auto-messages on order placement
- Payment confirmations
- Shipping updates
- Review requests

## Technical Implementation

### Database Schema Enhancements

#### Conversations Table
```sql
ALTER TABLE conversations
  ADD COLUMN conversation_type varchar(32) DEFAULT 'general',
  ADD COLUMN order_id integer REFERENCES orders(id),
  ADD COLUMN product_id uuid REFERENCES products(id),
  ADD COLUMN listing_id integer REFERENCES listings(id),
  ADD COLUMN context_metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN is_automated boolean DEFAULT false;
```

#### New Tables
1. `conversation_participants` - Tracks participants with roles (buyer, seller, moderator)
2. `message_templates` - Pre-defined seller responses
3. `quick_replies` - Automated reply suggestions
4. `conversation_analytics` - Performance metrics
5. `message_attachments` - Enhanced file handling

### Backend Services

#### MarketplaceMessagingService
Handles marketplace-specific messaging operations:
- Create order conversations
- Send automated notifications
- Generate order timelines
- Suggest quick replies
- Update conversation analytics

#### OrderMessagingAutomation
Handles order event integration:
- Auto-create conversation on order placement
- Send notifications on order events (payment, shipping, disputes)

### API Endpoints

#### Order Conversations
- `POST /marketplace/messaging/conversations/order/:orderId` - Create order conversation
- `POST /marketplace/messaging/conversations/product/:productId` - Start product inquiry
- `GET /marketplace/messaging/conversations/my-orders` - Get order conversations
- `GET /marketplace/messaging/conversations/:id/order-timeline` - Get unified timeline

#### Templates & Quick Replies
- `GET /marketplace/messaging/templates` - Get user templates
- `POST /marketplace/messaging/templates` - Create template
- `PUT /marketplace/messaging/templates/:id` - Update template
- `DELETE /marketplace/messaging/templates/:id` - Delete template
- `POST /marketplace/messaging/quick-replies` - Create quick reply
- `GET /marketplace/messaging/quick-replies/suggest` - Suggest quick replies

#### Analytics
- `GET /marketplace/messaging/conversations/:id/analytics` - Get conversation analytics
- `GET /marketplace/messaging/seller/analytics/messaging` - Get seller analytics

#### Automation
- `POST /marketplace/messaging/conversations/:id/auto-notify` - Send automated notification
- `POST /marketplace/messaging/conversations/:id/escalate` - Escalate to dispute

## Frontend Components

### OrderConversationView
Displays order-specific conversations with:
- Unified timeline of messages and order events
- Quick reply suggestions
- Automated message indicators
- Context-aware UI elements

### QuickReplyPanel
Provides seller quick replies:
- Template-based responses
- Keyword-triggered suggestions
- Usage analytics

## Integration Points

### Order Management System
- Auto-create conversations on order placement
- Send notifications on order events
- Link tracking information to conversations

### Dispute Resolution System
- Escalate conversations to disputes
- Add moderators to conversations
- Track dispute resolution progress

### Analytics System
- Track seller response times
- Measure conversion rates
- Monitor message engagement

## Security Considerations

1. **Access Control**
   - Only buyers and sellers can access order conversations
   - Moderators can join dispute conversations
   - System messages are clearly marked

2. **Data Privacy**
   - Order details are embedded in context metadata
   - Messages are end-to-end encrypted
   - Analytics data is aggregated and anonymized

3. **Rate Limiting**
   - Messaging rate limits prevent spam
   - Template creation is rate-limited
   - Quick reply suggestions are cached

## Performance Optimizations

1. **Database Indexes**
   - Indexes on order_id, product_id, and conversation_type
   - Composite indexes for common query patterns

2. **Caching**
   - Conversation metadata caching
   - Template caching for quick replies
   - Analytics data pre-computation

3. **Background Processing**
   - Asynchronous conversation creation
   - Batch analytics updates
   - Deferred template usage tracking

## Future Enhancements

1. **AI-Powered Features**
   - Sentiment analysis for messages
   - Automated dispute resolution suggestions
   - Personalized template recommendations

2. **Advanced Analytics**
   - Predictive response time modeling
   - Customer satisfaction scoring
   - Seller performance benchmarking

3. **Multi-Channel Support**
   - Email integration for important notifications
   - SMS notifications for critical updates
   - Social media messaging connectors

## Testing

The system includes comprehensive tests for:
- Conversation creation and management
- Message sending and receiving
- Template and quick reply functionality
- Analytics data accuracy
- Integration with order management system

## Deployment

The marketplace messaging system is deployed as part of the main application with:
- Database migrations applied automatically
- API endpoints registered with the main router
- Frontend components integrated into the marketplace UI
- Monitoring and alerting for system health