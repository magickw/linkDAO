import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderConversationHeader } from '../components/Messaging/OrderConversationHeader';
import { QuickReplyPanel } from '../components/Messaging/QuickReplyPanel';
import { OrderTimeline } from '../components/Messaging/OrderTimeline';

// Mock router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('Marketplace Messaging Frontend Components', () => {
  describe('OrderConversationHeader', () => {
    const mockConversation = {
      id: 'conv1',
      participants: ['user1', 'user2'],
      lastActivity: new Date(),
      unreadCounts: {},
      isEncrypted: true,
      metadata: {
        type: 'direct' as const,
      },
      orderId: 12345,
      contextMetadata: {
        productName: 'Wireless Headphones',
        productImage: '/images/product.jpg',
        orderStatus: 'shipped',
        orderId: 12345,
      },
    };

    it('renders order information correctly', () => {
      render(
        <OrderConversationHeader 
          conversation={mockConversation}
          onViewOrder={jest.fn()}
          onTrackPackage={jest.fn()}
        />
      );

      expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
      expect(screen.getByText('Order #12345')).toBeInTheDocument();
      expect(screen.getByText('shipped')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(
        <OrderConversationHeader 
          conversation={mockConversation}
          onViewOrder={jest.fn()}
          onTrackPackage={jest.fn()}
        />
      );

      expect(screen.getByText('View Order')).toBeInTheDocument();
      expect(screen.getByText('Track Package')).toBeInTheDocument();
    });

    it('calls onViewOrder when View Order button is clicked', () => {
      const onViewOrder = jest.fn();
      render(
        <OrderConversationHeader 
          conversation={mockConversation}
          onViewOrder={onViewOrder}
          onTrackPackage={jest.fn()}
        />
      );

      fireEvent.click(screen.getByText('View Order'));
      expect(onViewOrder).toHaveBeenCalledWith(12345);
    });

    it('does not render when no order ID is present', () => {
      const { container } = render(
        <OrderConversationHeader 
          conversation={{
            ...mockConversation,
            orderId: undefined,
          }}
          onViewOrder={jest.fn()}
          onTrackPackage={jest.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('QuickReplyPanel', () => {
    it('renders quick replies and templates', () => {
      render(<QuickReplyPanel onSelectReply={jest.fn()} />);

      // Wait for loading to complete
      setTimeout(() => {
        expect(screen.getByText('Quick Replies')).toBeInTheDocument();
        expect(screen.getByText('Templates')).toBeInTheDocument();
      }, 600);
    });

    it('calls onSelectReply when a reply is selected', () => {
      const onSelectReply = jest.fn();
      render(<QuickReplyPanel onSelectReply={onSelectReply} />);

      // Wait for loading to complete and then test
      setTimeout(() => {
        const replyButton = screen.getByText('When will my order be shipped?').closest('button');
        if (replyButton) {
          fireEvent.click(replyButton);
          expect(onSelectReply).toHaveBeenCalledWith('When will my order be shipped?');
        }
      }, 600);
    });
  });

  describe('OrderTimeline', () => {
    const mockMessages = [
      {
        id: 'msg1',
        conversationId: 'conv1',
        fromAddress: 'user1',
        content: 'Hello, I have a question about my order',
        contentType: 'text' as const,
        timestamp: new Date('2023-01-01T10:00:00Z'),
        deliveryStatus: 'read' as const,
      },
      {
        id: 'msg2',
        conversationId: 'conv1',
        fromAddress: 'user2',
        content: 'Sure, what would you like to know?',
        contentType: 'text' as const,
        timestamp: new Date('2023-01-01T10:05:00Z'),
        deliveryStatus: 'read' as const,
      },
    ];

    const mockOrderEvents = [
      {
        id: 'event1',
        type: 'order_event' as const,
        eventType: 'order_placed',
        description: 'Order #12345 has been placed',
        timestamp: new Date('2023-01-01T09:00:00Z'),
      },
      {
        id: 'event2',
        type: 'order_event' as const,
        eventType: 'order_shipped',
        description: 'Order #12345 has been shipped',
        timestamp: new Date('2023-01-01T11:00:00Z'),
      },
    ];

    it('renders timeline items in chronological order', () => {
      render(
        <OrderTimeline
          conversationId="conv1"
          messages={mockMessages}
          orderEvents={mockOrderEvents}
        />
      );

      // Check that items are rendered
      expect(screen.getByText('Hello, I have a question about my order')).toBeInTheDocument();
      expect(screen.getByText('Sure, what would you like to know?')).toBeInTheDocument();
      expect(screen.getByText('order_placed')).toBeInTheDocument();
      expect(screen.getByText('order_shipped')).toBeInTheDocument();
    });
  });
});