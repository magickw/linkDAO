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
  Clock, 
  CheckCircle, 
  Award, 
  Shield, 
  Users, 
  Zap, 
  ChevronRight,
  HelpCircle,
  TrendingUp,
  FileText,
  Lightbulb,
  AlertCircle,
  Ticket,
  BarChart,
  User,
  Settings,
  Bell
} from 'lucide-react';
import EnhancedSupportDocuments from '@/components/Support/EnhancedSupportDocuments';
import { SupportTicketDashboard } from '@/components/Support/SupportTicketDashboard';
import PersonalizedSupportDashboard from '@/components/Support/PersonalizedSupportDashboard';
import SupportAnalyticsDashboard from '@/components/Support/SupportAnalyticsDashboard';
import EnhancedSupportCenter from '@/components/Support/EnhancedSupportCenter';

const SupportDashboard: NextPage = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'tickets' | 'analytics'>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for support metrics
  const supportMetrics = [
    { title: 'Open Tickets', value: '12', change: '+2', icon: Ticket },
    { title: 'Avg. Response Time', value: '2.4h', change: '-0.3h', icon: Clock },
    { title: 'Resolution Rate', value: '92%', change: '+3%', icon: CheckCircle },
    { title: 'Satisfaction Score', value: '4.8/5', change: '+0.1', icon: Award },
  ];

  const quickActions = [
    { title: 'Create Ticket', href: '/support/tickets/new', icon: Ticket, color: 'blue' },
    { title: 'Browse Docs', href: '/support/documents', icon: Book, color: 'green' },
    { title: 'Live Chat', href: '/support/live-chat', icon: MessageCircle, color: 'purple' },
    { title: 'Contact Us', href: '/support/contact', icon: Mail, color: 'orange' },
  ];

  return (
    <>
      <Head>
        <title>Support Dashboard - LinkDAO</title>
        <meta name="description" content="Comprehensive support dashboard for LinkDAO users" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Use the enhanced support center component */}
        <EnhancedSupportCenter />
      </div>
    </>
  );
};

export default SupportDashboard;