/**
 * Dispute Detail View - Chat interface, evidence gallery, resolution
 * Sprint 3: Real-time chat, timeline, evidence lightbox
 */

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { Button } from '@/design-system/components/Button';
import {
  MessageSquare,
  Send,
  Image as ImageIcon,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  ArrowLeft,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type DisputeStatus = 'filed' | 'under_review' | 'dao_vote' | 'resolved';
type MessageSender = 'buyer' | 'seller' | 'moderator';

interface Message {
  id: string;
  sender: MessageSender;
  senderName: string;
  content: string;
  timestamp: string;
}

interface Evidence {
  id: string;
  type: 'image' | 'document';
  url: string;
  filename: string;
  uploadedBy: 'buyer' | 'seller';
}

interface TimelineEvent {
  status: string;
  description: string;
  timestamp: string;
  completed: boolean;
}

interface DisputeDetail {
  id: string;
  orderId: string;
  category: string;
  description: string;
  status: DisputeStatus;
  createdAt: string;
  timeline: TimelineEvent[];
  evidence: Evidence[];
  resolution?: {
    outcome: 'buyer_wins' | 'seller_wins' | 'partial_refund';
    amount?: string;
    reason: string;
  };
}

// Mock data
const MOCK_DISPUTE: DisputeDetail = {
  id: 'DIS-001',
  orderId: 'ORD-001',
  category: 'Item Not Received',
  description: 'Package was marked as delivered but I never received it. Tracking shows it was left at the door but nothing was there when I checked.',
  status: 'under_review',
  createdAt: '2025-01-10T10:00:00Z',
  timeline: [
    {
      status: 'Dispute Filed',
      description: 'Buyer opened a dispute',
      timestamp: '2025-01-10T10:00:00Z',
      completed: true,
    },
    {
      status: 'Under Review',
      description: 'DAO moderators reviewing evidence',
      timestamp: '2025-01-10T12:00:00Z',
      completed: true,
    },
    {
      status: 'DAO Vote',
      description: 'Community voting on resolution',
      timestamp: '',
      completed: false,
    },
    {
      status: 'Resolved',
      description: 'Final decision reached',
      timestamp: '',
      completed: false,
    },
  ],
  evidence: [
    {
      id: 'ev1',
      type: 'image',
      url: '/api/placeholder/400/300',
      filename: 'tracking_screenshot.png',
      uploadedBy: 'buyer',
    },
    {
      id: 'ev2',
      type: 'image',
      url: '/api/placeholder/400/300',
      filename: 'empty_doorstep.jpg',
      uploadedBy: 'buyer',
    },
  ],
};

const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg1',
    sender: 'buyer',
    senderName: 'You',
    content: 'I never received the package. The tracking says it was delivered but nothing was at my door.',
    timestamp: '2025-01-10T10:05:00Z',
  },
  {
    id: 'msg2',
    sender: 'seller',
    senderName: 'TechGear Store',
    content: 'We shipped the package on time and tracking confirms delivery. Did you check with neighbors or building management?',
    timestamp: '2025-01-10T14:30:00Z',
  },
  {
    id: 'msg3',
    sender: 'moderator',
    senderName: 'DAO Moderator',
    content: 'Thank you both for providing information. We are reviewing the evidence and will make a decision within 48 hours.',
    timestamp: '2025-01-10T16:00:00Z',
  },
];

const DisputeDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [dispute] = useState<DisputeDetail>(MOCK_DISPUTE);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: Message = {
      id: `msg${Date.now()}`,
      sender: 'buyer',
      senderName: 'You',
      content: newMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const getStatusColor = (status: DisputeStatus) => {
    switch (status) {
      case 'filed':
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'under_review':
        return 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'dao_vote':
        return 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'resolved':
        return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  const getSenderColor = (sender: MessageSender) => {
    switch (sender) {
      case 'buyer':
        return 'bg-blue-600 text-white';
      case 'seller':
        return 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white';
      case 'moderator':
        return 'bg-purple-600 text-white';
    }
  };

  const imageEvidence = dispute.evidence.filter(e => e.type === 'image');

  return (
    <Layout title={`Dispute ${id} - LinkDAO Marketplace`}>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/support/disputes')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-2 flex items-center gap-1"
              >
                <ArrowLeft size={16} />
                Back to disputes
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Dispute #{dispute.id}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Order #{dispute.orderId} • {dispute.category}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(
                dispute.status
              )}`}
            >
              {dispute.status === 'under_review' && <Clock size={16} />}
              {dispute.status === 'dao_vote' && <Users size={16} />}
              {dispute.status === 'resolved' && <CheckCircle size={16} />}
              {dispute.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
            {/* Main Content */}
            <div className="space-y-6">
              {/* Description */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  Issue Description
                </h2>
                <p className="text-gray-700 dark:text-gray-300">{dispute.description}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  Filed on {new Date(dispute.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Evidence Gallery */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Evidence ({dispute.evidence.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {dispute.evidence.map((evidence, index) => (
                    <div
                      key={evidence.id}
                      className="relative group cursor-pointer"
                      onClick={() => evidence.type === 'image' && setLightboxIndex(index)}
                    >
                      {evidence.type === 'image' ? (
                        <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                          <img
                            src={evidence.url}
                            alt={evidence.filename}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center">
                          <FileText size={32} className="text-gray-400 dark:text-gray-500" />
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 px-2 text-center truncate w-full">
                            {evidence.filename}
                          </p>
                        </div>
                      )}
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                        {evidence.uploadedBy}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Interface */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageSquare size={20} />
                    Discussion
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Communicate with the seller and DAO moderators
                  </p>
                </div>

                {/* Messages */}
                <div className="h-96 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'buyer' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${message.sender === 'buyer' ? 'order-2' : 'order-1'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {message.senderName}
                          </span>
                          {message.sender === 'moderator' && (
                            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                              Moderator
                            </span>
                          )}
                        </div>
                        <div
                          className={`px-4 py-2 rounded-lg ${getSenderColor(message.sender)}`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button type="submit" variant="primary" disabled={!newMessage.trim()}>
                      <Send size={16} />
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Timeline */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Status Timeline
                </h3>
                <div className="space-y-4">
                  {dispute.timeline.map((event, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            event.completed
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {event.completed ? <CheckCircle size={16} /> : <Clock size={16} />}
                        </div>
                        {index < dispute.timeline.length - 1 && (
                          <div
                            className={`w-0.5 flex-1 min-h-[30px] ${
                              event.completed
                                ? 'bg-green-600'
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {event.status}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {event.description}
                        </p>
                        {event.timestamp && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolution (if resolved) */}
              {dispute.resolution && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Resolution
                  </h3>
                  <div className="space-y-3">
                    <div
                      className={`px-4 py-3 rounded-lg ${
                        dispute.resolution.outcome === 'buyer_wins'
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : dispute.resolution.outcome === 'seller_wins'
                          ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      }`}
                    >
                      <p className="font-semibold">
                        {dispute.resolution.outcome === 'buyer_wins' && 'Buyer Wins'}
                        {dispute.resolution.outcome === 'seller_wins' && 'Seller Wins'}
                        {dispute.resolution.outcome === 'partial_refund' && 'Partial Refund'}
                      </p>
                      {dispute.resolution.amount && (
                        <p className="text-sm mt-1">Refund: {dispute.resolution.amount} ETH</p>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {dispute.resolution.reason}
                    </p>
                  </div>
                </div>
              )}

              {/* Help */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  Need Help?
                </h3>
                <p className="text-xs text-blue-800 dark:text-blue-300 mb-3">
                  DAO moderators typically respond within 24 hours. Be patient and provide all requested information.
                </p>
                <Button variant="outline" className="w-full text-sm" onClick={() => router.push('/support')}>
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
          >
            <X size={24} />
          </button>

          {lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex - 1);
              }}
              className="absolute left-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <img
            src={imageEvidence[lightboxIndex]?.url}
            alt={imageEvidence[lightboxIndex]?.filename}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {lightboxIndex < imageEvidence.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex + 1);
              }}
              className="absolute right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
            >
              <ChevronRight size={24} />
            </button>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
            {lightboxIndex + 1} / {imageEvidence.length}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default DisputeDetailPage;
