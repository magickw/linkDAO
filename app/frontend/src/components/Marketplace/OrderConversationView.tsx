import React, { useState, useEffect } from 'react';
import { marketplaceMessagingService } from '../../services/marketplaceMessagingService';

interface OrderConversationViewProps {
  conversationId: string;
  orderId: number;
}

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  isAutomated?: boolean;
}

interface TimelineEvent {
  id: string;
  type: 'message' | 'order_event';
  timestamp: string;
  data: any;
}

const OrderConversationView: React.FC<OrderConversationViewProps> = ({ 
  conversationId, 
  orderId 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConversationData();
  }, [conversationId]);

  const loadConversationData = async () => {
    setLoading(true);
    try {
      // Load messages
      // const conversationMessages = await marketplaceMessagingService.getMessages(conversationId);
      // setMessages(conversationMessages);

      // Load timeline
      const orderTimeline = await marketplaceMessagingService.getOrderTimeline(conversationId);
      setTimeline(orderTimeline);

      setError(null);
    } catch (err) {
      setError('Failed to load conversation data');
      console.error('Error loading conversation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      // await marketplaceMessagingService.sendMessage(conversationId, newMessage);
      setNewMessage('');
      await loadConversationData(); // Refresh the conversation
      setError(null);
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestQuickReplies = async (messageContent: string) => {
    try {
      const suggestions = await marketplaceMessagingService.suggestQuickReplies(messageContent);
      // Handle suggestions in UI
      console.log('Quick reply suggestions:', suggestions);
    } catch (err) {
      console.error('Error getting quick reply suggestions:', err);
    }
  };

  if (loading && messages.length === 0) {
    return <div>Loading conversation...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="order-conversation-view">
      <div className="conversation-header">
        <h2>Order #{orderId} Conversation</h2>
        <button onClick={() => loadConversationData()}>Refresh</button>
      </div>

      <div className="conversation-timeline">
        {timeline.map((event) => (
          <div key={event.id} className={`timeline-item ${event.type}`}>
            {event.type === 'message' ? (
              <div className="message-item">
                <div className="message-sender">{event.data.sender}</div>
                <div className="message-content">{event.data.content}</div>
                <div className="message-timestamp">{new Date(event.timestamp).toLocaleString()}</div>
                {event.data.isAutomated && (
                  <span className="automated-badge">Automated</span>
                )}
              </div>
            ) : (
              <div className="order-event-item">
                <div className="event-type">{event.data.eventType}</div>
                <div className="event-description">{event.data.description}</div>
                <div className="event-timestamp">{new Date(event.timestamp).toLocaleString()}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="message-input-area">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
          rows={3}
        />
        <div className="message-actions">
          <button 
            onClick={handleSendMessage} 
            disabled={loading || !newMessage.trim()}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
          <button 
            onClick={() => handleSuggestQuickReplies(newMessage)}
            disabled={!newMessage.trim()}
          >
            Suggest Replies
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConversationView;