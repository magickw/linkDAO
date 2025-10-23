import React, { useState } from 'react';
import { 
  HelpCircle, 
  MessageCircle, 
  Book, 
  Video, 
  Mail, 
  X, 
  Search,
  Clock,
  Award,
  Shield,
  Users,
  Zap
} from 'lucide-react';
import Link from 'next/link';

interface SupportWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupportWidget: React.FC<SupportWidgetProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) {
    return (
      <button
        onClick={() => {}}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
        title="Need Help?"
      >
        <HelpCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-80 max-h-96 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
            <HelpCircle className="w-5 h-5 mr-2 text-blue-500" />
            LinkDAO Support
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        
        <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
          <Link
            href="/support"
            className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            onClick={onClose}
          >
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform">
              <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">Help Center</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">FAQs & Documentation</div>
            </div>
          </Link>
          
          <Link
            href="/support/guides/ldao-complete-guide"
            className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            onClick={onClose}
          >
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">LDAO Token Guide</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Complete acquisition guide</div>
            </div>
          </Link>
          
          <Link
            href="/support/tutorials/first-ldao-purchase"
            className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            onClick={onClose}
          >
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform">
              <Video className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">Video Tutorials</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Step-by-step guides</div>
            </div>
          </Link>
          
          <Link
            href="/support/security"
            className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            onClick={onClose}
          >
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">Security Center</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Wallet & account safety</div>
            </div>
          </Link>
          
          <a
            href="mailto:support@linkdao.io"
            className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            onClick={onClose}
          >
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform">
              <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">Email Support</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">4-hour response time</div>
            </div>
          </a>
          
          <Link
            href="/community"
            className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            onClick={onClose}
          >
            <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">Community Help</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Ask fellow members</div>
            </div>
          </Link>
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">Response Times</div>
            <div className="flex items-center text-xs text-green-600 dark:text-green-400">
              <Zap className="w-3 h-3 mr-1" />
              Fast Support
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white dark:bg-gray-600 rounded p-2">
              <div className="text-xs font-medium text-gray-900 dark:text-white">Live Chat</div>
              <div className="text-xs text-gray-500 dark:text-gray-300">2 min</div>
            </div>
            <div className="bg-white dark:bg-gray-600 rounded p-2">
              <div className="text-xs font-medium text-gray-900 dark:text-white">Email</div>
              <div className="text-xs text-gray-500 dark:text-gray-300">4 hrs</div>
            </div>
            <div className="bg-white dark:bg-gray-600 rounded p-2">
              <div className="text-xs font-medium text-gray-900 dark:text-white">Community</div>
              <div className="text-xs text-gray-500 dark:text-gray-300">12 hrs</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportWidget;