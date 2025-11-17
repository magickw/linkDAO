import React, { useState, useEffect } from 'react';
import { Search, MessageCircle, Book, Video, Mail, Phone, Clock, CheckCircle, Bot, Star, Bookmark, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { supportService } from '@/services/supportService';

interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  lastUpdate: Date;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  views: number;
}

const LDAOSupportCenter: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { tickets, loading: ticketsLoading, error: ticketsError, fetchTickets } = useSupportTickets();
  const [activeTab, setActiveTab] = useState<'help' | 'tickets' | 'contact'>('help');
  const [searchQuery, setSearchQuery] = useState('');
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);
  const [isLiveChatOpen, setIsLiveChatOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTickets();
    }
    loadFAQItems();
  }, [isAuthenticated, fetchTickets]);



  const loadFAQItems = async () => {
    setFaqLoading(true);
    setFaqError(null);
    try {
      const data = await supportService.getFAQ('ldao');
      setFaqs(data);
    } catch (error) {
      setFaqError('Failed to load FAQ items');
    } finally {
      setFaqLoading(false);
    }
  };

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-100';
      case 'in-progress': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          LDAO Token Support Center
        </h1>
        <p className="text-gray-600">
          Get help with LDAO token acquisition, staking, trading, and more
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setIsLiveChatOpen(true)}
          className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <MessageCircle className="w-6 h-6 text-blue-600 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-blue-900">Live Chat</div>
            <div className="text-sm text-blue-600">Available 24/7</div>
          </div>
        </button>

        <a
          href="/docs/user-guides/ldao-token-acquisition"
          className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
        >
          <Book className="w-6 h-6 text-green-600 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-green-900">User Guide</div>
            <div className="text-sm text-green-600">Complete documentation</div>
          </div>
        </a>

        <a
          href="/tutorials/ldao-quick-start"
          className="flex items-center p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
        >
          <Video className="w-6 h-6 text-purple-600 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-purple-900">Video Tutorials</div>
            <div className="text-sm text-purple-600">Step-by-step guides</div>
          </div>
        </a>

        <a
          href="mailto:ldao-support@linkdao.io"
          className="flex items-center p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
        >
          <Mail className="w-6 h-6 text-orange-600 mr-3" />
          <div className="text-left">
            <div className="font-semibold text-orange-900">Email Support</div>
            <div className="text-sm text-orange-600">4-hour response</div>
          </div>
        </a>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'help', label: 'Help Center', icon: Book },
            { id: 'tickets', label: 'My Tickets', icon: MessageCircle },
            { id: 'contact', label: 'Contact Us', icon: Phone }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Help Center Tab */}
      {activeTab === 'help' && (
        <div>
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* AI Support Assistant */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-start">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <Bot className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">AI Support Assistant</h3>
                <p className="text-gray-600 mb-4">Get instant help with LDAO tokens, staking, and trading from our AI-powered assistant.</p>
                <button 
                  onClick={() => alert('AI Chat would open here')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  Chat with Assistant
                </button>
              </div>
            </div>
          </div>

          {/* Popular LDAO Topics */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Popular LDAO Topics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: 'Token Acquisition', articles: 15, color: 'blue' },
                { title: 'Staking Rewards', articles: 12, color: 'green' },
                { title: 'DEX Trading', articles: 8, color: 'purple' },
                { title: 'Governance Voting', articles: 10, color: 'orange' },
                { title: 'Security Best Practices', articles: 7, color: 'red' },
                { title: 'Wallet Setup', articles: 9, color: 'indigo' }
              ].map((topic) => {
                const colorClasses = {
                  blue: {
                    bg: 'bg-blue-50',
                    border: 'border-blue-200',
                    hover: 'hover:bg-blue-100',
                    title: 'text-blue-900',
                    text: 'text-blue-600'
                  },
                  green: {
                    bg: 'bg-green-50',
                    border: 'border-green-200',
                    hover: 'hover:bg-green-100',
                    title: 'text-green-900',
                    text: 'text-green-600'
                  },
                  purple: {
                    bg: 'bg-purple-50',
                    border: 'border-purple-200',
                    hover: 'hover:bg-purple-100',
                    title: 'text-purple-900',
                    text: 'text-purple-600'
                  },
                  orange: {
                    bg: 'bg-orange-50',
                    border: 'border-orange-200',
                    hover: 'hover:bg-orange-100',
                    title: 'text-orange-900',
                    text: 'text-orange-600'
                  },
                  red: {
                    bg: 'bg-red-50',
                    border: 'border-red-200',
                    hover: 'hover:bg-red-100',
                    title: 'text-red-900',
                    text: 'text-red-600'
                  },
                  indigo: {
                    bg: 'bg-indigo-50',
                    border: 'border-indigo-200',
                    hover: 'hover:bg-indigo-100',
                    title: 'text-indigo-900',
                    text: 'text-indigo-600'
                  }
                }[topic.color] || {
                  bg: 'bg-gray-50',
                  border: 'border-gray-200',
                  hover: 'hover:bg-gray-100',
                  title: 'text-gray-900',
                  text: 'text-gray-600'
                };

                return (
                  <div
                    key={topic.title}
                    className={`p-4 ${colorClasses.bg} ${colorClasses.border} rounded-lg ${colorClasses.hover} cursor-pointer transition-colors`}
                  >
                    <h3 className={`font-semibold ${colorClasses.title} mb-1`}>
                      {topic.title}
                    </h3>
                    <p className={`text-sm ${colorClasses.text}`}>
                      {topic.articles} articles
                    </p>
                  </div>
                );
              })},
            </div>
          </div>

          {/* Saved Resources */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Saved Resources</h2>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                View All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow cursor-pointer">
                <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                  <Bookmark className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Staking Guide</h3>
                  <p className="text-sm text-gray-600">Bookmarked 2 days ago</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow cursor-pointer">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <Star className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Top FAQ: Wallet Connection</h3>
                  <p className="text-sm text-gray-600">Recommended for you</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            {filteredFAQs.map((faq) => (
              <div
                key={faq.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-gray-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-600 mb-4">
                  {faq.answer}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>{faq.views} views</span>
                    <span>{faq.helpful} found helpful</span>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800">
                    Was this helpful?
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Tickets Tab */}
      {activeTab === 'tickets' && (
        <div>
          {!isAuthenticated ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Authentication Required
              </h3>
              <p className="text-gray-600 mb-4">
                Please connect your wallet to view support tickets
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  My Support Tickets
                </h2>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Create New Ticket
                </button>
              </div>

              {ticketsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800">{ticketsError}</p>
                </div>
              )}

              {ticketsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading tickets...</p>
                </div>
              ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No support tickets yet
              </h3>
              <p className="text-gray-600 mb-4">
                Create a ticket if you need help with LDAO tokens
              </p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Create Your First Ticket
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {ticket.subject}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Ticket #{ticket.id}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Created {ticket.createdAt.toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Updated {ticket.updatedAt.toLocaleDateString()}
                      </div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Contact Us Tab */}
      {activeTab === 'contact' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Contact Information
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <MessageCircle className="w-6 h-6 text-blue-600 mr-4 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Live Chat</h3>
                  <p className="text-gray-600 mb-2">
                    Get instant help from our support team
                  </p>
                  <p className="text-sm text-green-600">Available 24/7</p>
                </div>
              </div>

              <div className="flex items-start">
                <Mail className="w-6 h-6 text-green-600 mr-4 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Email Support</h3>
                  <p className="text-gray-600 mb-2">
                    ldao-support@linkdao.io
                  </p>
                  <p className="text-sm text-gray-500">Response within 4 hours</p>
                </div>
              </div>

              <div className="flex items-start">
                <Phone className="w-6 h-6 text-purple-600 mr-4 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Emergency Hotline</h3>
                  <p className="text-gray-600 mb-2">
                    +1-800-WEB3-HELP
                  </p>
                  <p className="text-sm text-gray-500">For urgent issues only</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="font-semibold text-gray-900 mb-4">Community Support</h3>
              <div className="space-y-3">
                <a
                  href="https://discord.gg/web3marketplace"
                  className="flex items-center p-3 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-indigo-600 rounded mr-3"></div>
                  <div>
                    <div className="font-medium text-indigo-900">Discord Community</div>
                    <div className="text-sm text-indigo-600">Real-time community help</div>
                  </div>
                </a>
                
                <a
                  href="https://t.me/linkdao_web3"
                  className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded mr-3"></div>
                  <div>
                    <div className="font-medium text-blue-900">Telegram Group</div>
                    <div className="text-sm text-blue-600">Community discussions</div>
                  </div>
                </a>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Create Support Ticket
            </h2>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Direct Purchase Issues</option>
                  <option>DEX Trading Problems</option>
                  <option>Staking Questions</option>
                  <option>Earn-to-Own System</option>
                  <option>Cross-Chain Bridge</option>
                  <option>Technical Issues</option>
                  <option>Account Problems</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>Low - General question</option>
                  <option>Medium - Issue affecting usage</option>
                  <option>High - Blocking issue</option>
                  <option>Urgent - Funds at risk</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Please provide detailed information about your issue, including any error messages, transaction hashes, or steps to reproduce the problem."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments
                </label>
                <input
                  type="file"
                  multiple
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload screenshots, error logs, or other relevant files
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Support Ticket
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Live Chat Modal */}
      {isLiveChatOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md h-96 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Live Chat Support</h3>
              <button
                onClick={() => setIsLiveChatOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="text-center text-gray-600">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Connecting you to a support agent...</p>
                <p className="text-sm mt-2">Average wait time: 2 minutes</p>
              </div>
            </div>
            <div className="p-4 border-t">
              <input
                type="text"
                placeholder="Type your message..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LDAOSupportCenter;