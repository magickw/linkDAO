import React, { useState } from 'react';
import { 
  HelpCircle, 
  MessageCircle, 
  BookOpen, 
  Mail, 
  Phone, 
  Users,
  X,
  ChevronRight
} from 'lucide-react';
import AIChatSupport from './AIChatSupport';

interface SupportOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
}

const SupportWidget: React.FC = () => {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const supportOptions: SupportOption[] = [
    {
      id: 'ai-chat',
      title: 'AI Assistant',
      description: 'Get instant help from our AI support assistant',
      icon: <MessageCircle className="w-5 h-5" />,
      action: () => {
        // This would integrate with the AI chat component
        alert('AI Chat would open here');
      },
      color: 'blue'
    },
    {
      id: 'docs',
      title: 'Documentation',
      description: 'Browse our comprehensive guides and tutorials',
      icon: <BookOpen className="w-5 h-5" />,
      action: () => {
        window.location.href = '/support/documents';
      },
      color: 'green'
    },
    {
      id: 'community',
      title: 'Community',
      description: 'Connect with other users in our Discord',
      icon: <Users className="w-5 h-5" />,
      action: () => {
        window.open('https://discord.gg/linkdao', '_blank');
      },
      color: 'purple'
    },
    {
      id: 'contact',
      title: 'Contact Us',
      description: 'Reach out to our human support team',
      icon: <Mail className="w-5 h-5" />,
      action: () => {
        window.location.href = '/support/contact';
      },
      color: 'orange'
    }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Main Widget Button */}
      <button
        onClick={() => {
          if (showOptions) {
            setShowOptions(false);
          } else {
            setIsWidgetOpen(true);
          }
        }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all"
      >
        {showOptions ? <X className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
      </button>

      {/* Support Options */}
      {showOptions && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">How can we help?</h3>
            <p className="text-sm text-gray-600">Choose an option below</p>
          </div>
          <div className="p-2">
            {supportOptions.map((option) => (
              <button
                key={option.id}
                onClick={option.action}
                className="w-full flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className={`w-10 h-10 bg-${option.color}-100 rounded-lg flex items-center justify-center mr-3`}>
                  <div className={`text-${option.color}-600`}>
                    {option.icon}
                  </div>
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-gray-900 group-hover:text-blue-600">
                    {option.title}
                  </div>
                  <div className="text-sm text-gray-600">
                    {option.description}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}
          </div>
          <div className="p-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Support available 24/7
            </p>
          </div>
        </div>
      )}

      {/* AI Chat Support Component */}
      <AIChatSupport />
    </div>
  );
};

export default SupportWidget;