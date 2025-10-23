import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Ticket, 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { SupportTicketDashboard } from '@/components/Support/SupportTicketDashboard';

const SupportTickets: NextPage = () => {
  return (
    <>
      <Head>
        <title>Support Tickets - LinkDAO</title>
        <meta name="description" content="Manage your support tickets for LDAO tokens, marketplace, and platform issues" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/support" className="flex items-center">
                  <Ticket className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
                </Link>
              </div>
              <Link 
                href="/support/tickets/new" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Ticket
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Support Tickets</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your support requests and track their progress
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-8 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search tickets by title, ID, or description..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option>All Statuses</option>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Resolved</option>
                  <option>Closed</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <ArrowUpDown className="w-5 h-5 text-gray-400" />
                <select className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option>Newest First</option>
                  <option>Oldest First</option>
                  <option>Priority</option>
                </select>
              </div>
            </div>
          </div>

          {/* Support Ticket Dashboard */}
          <SupportTicketDashboard />
        </div>
      </div>
    </>
  );
};

export default SupportTickets;