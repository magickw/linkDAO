import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Search, 
  MessageCircle, 
  Book, 
  Video, 
  Mail, 
  Phone, 
  Users, 
  HelpCircle, 
  TrendingUp, 
  Shield, 
  Zap, 
  Globe,
  Award,
  ChevronRight
} from 'lucide-react';
import SupportWidget from '@/components/Support/SupportWidget';
import PersonalizedSupportDashboard from '@/components/Support/PersonalizedSupportDashboard';
import MultiLanguageSupport from '@/components/Support/MultiLanguageSupport';

const SupportLandingPage: NextPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const supportChannels = [
    {
      title: "AI Support Assistant",
      description: "Get instant help from our AI-powered assistant",
      icon: MessageCircle,
      href: "#",
      color: "blue",
      action: () => alert('AI Chat would open here')
    },
    {
      title: "Documentation",
      description: "Comprehensive guides and tutorials",
      icon: Book,
      href: "/support/documents",
      color: "green"
    },
    {
      title: "Video Tutorials",
      description: "Step-by-step video guides",
      icon: Video,
      href: "/support/tutorials",
      color: "purple"
    },
    {
      title: "Community Forum",
      description: "Connect with other users",
      icon: Users,
      href: "/support/community",
      color: "orange"
    },
    {
      title: "Live Chat",
      description: "Chat with our support team",
      icon: MessageCircle,
      href: "#",
      color: "pink",
      action: () => alert('Live chat would open here')
    },
    {
      title: "Email Support",
      description: "Send us a detailed message",
      icon: Mail,
      href: "/support/contact",
      color: "indigo"
    }
  ];

  const popularTopics = [
    { title: "Getting Started", count: 12, color: "blue" },
    { title: "LDAO Tokens", count: 8, color: "green" },
    { title: "Wallet Setup", count: 6, color: "purple" },
    { title: "Staking Guide", count: 10, color: "orange" },
    { title: "Marketplace", count: 7, color: "pink" },
    { title: "Governance", count: 5, color: "indigo" }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // In a real implementation, this would navigate to search results
      alert(`Searching for: ${searchQuery}`);
    }
  };

  return (
    <>
      <Head>
        <title>Support Center - LinkDAO</title>
        <meta name="description" content="Get help with LinkDAO, LDAO tokens, marketplace, and Web3 social networking" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <HelpCircle className="w-16 h-16 mx-auto mb-6 text-blue-200" />
              <h1 className="text-4xl md:text-5xl font-bold mb-6">LinkDAO Support Center</h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
                Get help with LDAO tokens, marketplace features, wallet issues, and everything Web3
              </p>
              
              <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for help articles, tutorials, and FAQs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 focus:ring-2 focus:ring-white focus:ring-opacity-50 focus:outline-none"
                />
                <button 
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Personalized Dashboard */}
          <div className="mb-12">
            <PersonalizedSupportDashboard />
          </div>

          {/* Support Channels */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">How can we help you?</h2>
              <Link href="/support/contact" className="text-blue-600 hover:text-blue-800 font-medium">
                Contact Us
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {supportChannels.map((channel, index) => {
                const Icon = channel.icon;
                return (
                  <div 
                    key={index} 
                    onClick={channel.action}
                    className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer ${
                      channel.action ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex items-start">
                      <div className={`p-3 bg-${channel.color}-100 rounded-lg mr-4`}>
                        <Icon className={`w-6 h-6 text-${channel.color}-600`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">{channel.title}</h3>
                        <p className="text-gray-600 text-sm mb-3">{channel.description}</p>
                        <div className="flex items-center text-blue-600 text-sm font-medium">
                          <span>Learn more</span>
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Popular Topics */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Topics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularTopics.map((topic, index) => (
                <div
                  key={index}
                  className={`p-4 bg-${topic.color}-50 border border-${topic.color}-200 rounded-lg hover:bg-${topic.color}-100 cursor-pointer transition-colors`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold text-${topic.color}-900`}>{topic.title}</h3>
                    <span className={`text-${topic.color}-700 text-sm font-medium`}>{topic.count} articles</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Multi-language Support */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Globe className="w-6 h-6 mr-2 text-gray-600" />
                Multi-language Support
              </h2>
              <Link href="/support/languages" className="text-blue-600 hover:text-blue-800 font-medium">
                View All Languages
              </Link>
            </div>
            <MultiLanguageSupport />
          </div>

          {/* Support Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Why choose LinkDAO Support?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">99% Satisfaction Rate</h3>
                <p className="text-gray-600 text-sm">Based on customer feedback</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">2.1h Average Response</h3>
                <p className="text-gray-600 text-sm">Faster than industry standard</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">24/7 Availability</h3>
                <p className="text-gray-600 text-sm">AI support never sleeps</p>
              </div>
            </div>
          </div>
        </div>

        {/* Support Widget */}
        <SupportWidget />
      </div>
    </>
  );
};

export default SupportLandingPage;