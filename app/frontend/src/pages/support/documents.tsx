import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  BookOpen, 
  Search, 
  Filter, 
  ArrowLeft,
  Book,
  FileText,
  Video,
  Download
} from 'lucide-react';
import SupportDocuments from '@/components/Support/SupportDocuments';

const SupportDocumentsPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Support Documents - LinkDAO</title>
        <meta name="description" content="Comprehensive documentation for LDAO tokens, marketplace, and Web3 social networking" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/support" className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Support
                </Link>
              </div>
              <div className="flex items-center">
                <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Support Documents</h1>
              </div>
              <div></div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Documentation Center</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Comprehensive guides, tutorials, and resources to help you succeed with LinkDAO
            </p>
          </div>

          {/* Support Documents Component */}
          <SupportDocuments />
        </div>
      </div>
    </>
  );
};

export default SupportDocumentsPage;