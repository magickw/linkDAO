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
  Shield
} from 'lucide-react';

const ContactPage: NextPage = () => {
  const { user, isAuthenticated } = useAuth();
  const { createTicket } = useSupportTickets();
  const [formData, setFormData] = useState({
    subject: '',
    category: 'general',
    priority: 'medium',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
          message: ''
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
      color: "blue"
    },
    {
      title: "Email Support",
      description: "For detailed inquiries and complex issues",
      icon: Mail,
      availability: "Available 24/7",
      responseTime: "4 hours average",
      action: "support@linkdao.io",
      color: "green"
    },
    {
      title: "Emergency Hotline",
      description: "For urgent security issues only",
      icon: Phone,
      availability: "Available 24/7",
      responseTime: "Immediate",
      action: "+1-800-LINKDAO",
      color: "red"
    }
  ];

  const supportHours = [
    { day: "Monday - Friday", hours: "8:00 AM - 8:00 PM EST" },
    { day: "Saturday", hours: "10:00 AM - 6:00 PM EST" },
    { day: "Sunday", hours: "12:00 PM - 6:00 PM EST" }
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Information */}
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
                          <div className={`text-sm font-medium text-${channel.color}-600 dark:text-${channel.color}-400`}>
                            {channel.action}
                          </div>
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
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Community Support</h3>
                  <div className="space-y-3">
                    <a 
                      href="https://discord.gg/linkdao" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="w-8 h-8 bg-indigo-600 rounded mr-3"></div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Discord Community</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Real-time community help</div>
                      </div>
                    </a>
                    <a 
                      href="https://t.me/linkdao" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="w-8 h-8 bg-blue-500 rounded mr-3"></div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">Telegram Group</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Community discussions</div>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Send us a Message</h2>
                
                {!isAuthenticated ? (
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Authentication Required</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Please connect your wallet to submit a support ticket.
                    </p>
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
                        <p className="text-red-800 dark:text-red-200">{submitError}</p>
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
                          <input type="file" className="hidden" multiple />
                        </label>
                      </div>
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
          </div>
        </div>
      </div>
    </>
  );
};

export default ContactPage;