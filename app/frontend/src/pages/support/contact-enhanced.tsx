import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { 
  Mail, 
  Phone, 
  MessageCircle, 
  Clock, 
  MapPin, 
  Send, 
  CheckCircle,
  User,
  Building,
  Tag,
  FileText,
  Paperclip,
  Shield,
  AlertCircle,
  Info,
  HelpCircle,
  Book,
  Users,
  Zap,
  X
} from 'lucide-react';

const EnhancedContactPage: NextPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { createTicket } = useSupportTickets();
  const [formData, setFormData] = useState({
    subject: '',
    category: 'general',
    priority: 'medium',
    message: '',
    attachments: [] as File[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'faq' | 'community'>('form');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...files]
      }));
    }
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => {
      const newAttachments = [...prev.attachments];
      newAttachments.splice(index, 1);
      return {
        ...prev,
        attachments: newAttachments
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setSubmitError('Please connect your wallet to submit a support ticket');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      await createTicket({
        subject: formData.subject,
        description: formData.message,
        category: formData.category,
        priority: formData.priority,
      });
      
      setIsSubmitted(true);
      
      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({
          subject: '',
          category: 'general',
          priority: 'medium',
          message: '',
          attachments: []
        });
      }, 5000);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportChannels = [
    {
      title: "Live Chat Support",
      description: "Get instant help from our support team",
      icon: MessageCircle,
      availability: "Available 24/7",
      responseTime: "2 minutes average",
      action: "Start Live Chat",
      href: "/support/live-chat",
      color: "blue"
    },
    {
      title: "Email Support",
      description: "For detailed inquiries and complex issues",
      icon: Mail,
      availability: "Available 24/7",
      responseTime: "4 hours average",
      action: "support@linkdao.io",
      href: "mailto:support@linkdao.io",
      color: "green"
    },
    {
      title: "Emergency Hotline",
      description: "For urgent security issues only",
      icon: Phone,
      availability: "Available 24/7",
      responseTime: "Immediate",
      action: "+1-800-LINKDAO",
      href: "tel:+18005465326",
      color: "red"
    }
  ];

  const supportHours = [
    { day: "Monday - Friday", hours: "8:00 AM - 8:00 PM EST" },
    { day: "Saturday", hours: "10:00 AM - 6:00 PM EST" },
    { day: "Sunday", hours: "12:00 PM - 6:00 PM EST" }
  ];

  const faqItems = [
    {
      question: "How long does it take to get a response?",
      answer: "Email support typically responds within 4 hours. Live chat is available 24/7 with an average response time of 2 minutes."
    },
    {
      question: "Do I need to connect my wallet to submit a ticket?",
      answer: "Yes, all support tickets require wallet authentication to prevent spam and ensure we can assist you properly."
    },
    {
      question: "What information should I include in my ticket?",
      answer: "Please include detailed information about your issue, including any error messages, transaction hashes, steps to reproduce the problem, and screenshots if possible."
    },
    {
      question: "How can I check the status of my ticket?",
      answer: "You can check the status of your tickets in the Support Dashboard under the 'Tickets' tab."
    }
  ];

  return (
    <>
      <Head>
        <title>Contact Support - LinkDAO</title>
        <meta name="description" content="Get in touch with LinkDAO support team for assistance with tokens, marketplace, wallet, or technical issues" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Contact Support</h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                Get help with LDAO tokens, marketplace features, wallet issues, or technical problems
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
            <button
              onClick={() => setActiveTab('form')}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'form'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Submit Ticket
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'faq'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              FAQ
            </button>
            <button
              onClick={() => setActiveTab('community')}
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'community'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Community Support
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {activeTab === 'form' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Send us a Message</h2>
                  
                  {!isAuthenticated ? (
                    <div className="text-center py-12">
                      <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Authentication Required</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Please connect your wallet to submit a support ticket.
                      </p>
                      <Link 
                        href="/connect-wallet" 
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Connect Wallet
                      </Link>
                    </div>
                  ) : isSubmitted ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Message Sent!</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Thank you for contacting us. We'll get back to you within 4 hours.
                      </p>
                      <Link 
                        href="/support" 
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Back to Support Center
                      </Link>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {submitError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                          <div className="flex items-center">
                            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                            <p className="text-red-800 dark:text-red-200">{submitError}</p>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Subject
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Tag className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="subject"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            required
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Brief description of your issue"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Category
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Building className="h-5 w-5 text-gray-400" />
                            </div>
                            <select
                              id="category"
                              name="category"
                              value={formData.category}
                              onChange={handleChange}
                              className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="direct-purchase">Direct Purchase</option>
                              <option value="dex-trading">DEX Trading</option>
                              <option value="staking">Staking</option>
                              <option value="earn-to-own">Earn-to-Own</option>
                              <option value="cross-chain">Cross-Chain</option>
                              <option value="technical">Technical Issues</option>
                              <option value="account">Account Issues</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Priority
                          </label>
                          <select
                            id="priority"
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                            className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="low">Low - General question</option>
                            <option value="medium">Medium - Issue affecting usage</option>
                            <option value="high">High - Blocking issue</option>
                            <option value="urgent">Urgent - Funds at risk</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          How can we help you?
                        </label>
                        <div className="relative">
                          <div className="absolute top-3 left-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                          </div>
                          <textarea
                            id="message"
                            name="message"
                            rows={6}
                            value={formData.message}
                            onChange={handleChange}
                            required
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Please provide detailed information about your issue, including any error messages, transaction hashes, or steps to reproduce the problem."
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Attachments
                        </label>
                        <div className="flex items-center justify-center w-full">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Paperclip className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                PNG, JPG, GIF, PDF up to 10MB
                              </p>
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              multiple 
                              onChange={handleFileChange}
                              accept="image/*,.pdf"
                            />
                          </label>
                        </div>
                        {formData.attachments.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                              {formData.attachments.length} file(s) selected:
                            </p>
                            <div className="space-y-2">
                              {formData.attachments.map((file, index) => (
                                <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded p-2">
                                  <div className="flex items-center">
                                    <Paperclip className="w-4 h-4 text-gray-500 mr-2" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">
                                      {file.name}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeAttachment(index)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          Upload screenshots, error logs, or other relevant files
                        </p>
                      </div>
                      
                      <div className="flex items-center">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
                        >
                          {isSubmitting ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5 mr-2" />
                              Send Message
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {activeTab === 'faq' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Frequently Asked Questions</h2>
                  
                  <div className="space-y-6">
                    {faqItems.map((faq, index) => (
                      <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0 last:pb-0">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                          {faq.question}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {faq.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Need More Help?</h3>
                    <Link 
                      href="/support/faq" 
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <HelpCircle className="w-4 h-4 mr-2" />
                      View All FAQs
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'community' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Community Support</h2>
                  
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start">
                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Discord Community</h3>
                          <p className="text-blue-800 dark:text-blue-300 text-sm mb-3">
                            Join our active Discord community for peer-to-peer support, discussions, and announcements.
                          </p>
                          <a 
                            href="https://discord.gg/linkdao" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                          >
                            Join Discord
                          </a>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-start">
                        <Book className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-3 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-1">Documentation</h3>
                          <p className="text-purple-800 dark:text-purple-300 text-sm mb-3">
                            Browse our comprehensive documentation for guides, tutorials, and technical references.
                          </p>
                          <Link 
                            href="/support/documents" 
                            className="inline-flex items-center px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                          >
                            Browse Docs
                          </Link>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-start">
                        <Zap className="w-6 h-6 text-green-600 dark:text-green-400 mr-3 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-green-900 dark:text-green-200 mb-1">Telegram Group</h3>
                          <p className="text-green-800 dark:text-green-300 text-sm mb-3">
                            Join our Telegram group for real-time discussions and community support.
                          </p>
                          <a 
                            href="https://t.me/linkdao" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                          >
                            Join Telegram
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Community Guidelines</h3>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Be respectful and constructive in all interactions</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Search existing discussions before posting new questions</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Share helpful resources and experiences with others</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Report spam or abusive behavior to moderators</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Response Times */}
              <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Expected Response Times</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="font-medium text-blue-900 dark:text-blue-200">Standard Support</div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">4 hours for emails</div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="font-medium text-green-900 dark:text-green-200">Priority Support</div>
                    <div className="text-sm text-green-700 dark:text-green-300">2 hours for urgent issues</div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Response times may vary during high volume periods
                </div>
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Support Channels</h2>
                
                <div className="space-y-6">
                  {supportChannels.map((channel, index) => {
                    const Icon = channel.icon;
                    return (
                      <div key={index} className="flex items-start">
                        <div className={`w-12 h-12 bg-${channel.color}-100 dark:bg-${channel.color}-900/30 rounded-lg flex items-center justify-center flex-shrink-0 mr-4`}>
                          <Icon className={`w-6 h-6 text-${channel.color}-600 dark:text-${channel.color}-400`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{channel.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{channel.description}</p>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{channel.availability}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">{channel.responseTime}</div>
                          <Link 
                            href={channel.href}
                            className={`text-sm font-medium text-${channel.color}-600 dark:text-${channel.color}-400 hover:underline`}
                          >
                            {channel.action}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Support Hours</h3>
                  <div className="space-y-3">
                    {supportHours.map((hours, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{hours.day}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{hours.hours}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4 inline mr-1" />
                    All times in Eastern Standard Time (EST)
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Before You Contact Us</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <Info className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Check our <Link href="/support/faq" className="text-blue-600 hover:underline">FAQ section</Link> for quick answers to common questions
                      </p>
                    </div>
                    <div className="flex items-start">
                      <Info className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Browse our <Link href="/support/documents" className="text-blue-600 hover:underline">documentation</Link> for detailed guides and tutorials
                      </p>
                    </div>
                    <div className="flex items-start">
                      <Info className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Join our <a href="https://discord.gg/linkdao" className="text-blue-600 hover:underline">Discord community</a> for peer-to-peer support
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EnhancedContactPage;