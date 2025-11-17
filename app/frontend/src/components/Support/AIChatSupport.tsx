import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  X, 
  Volume2, 
  VolumeX, 
  ThumbsUp, 
  ThumbsDown,
  Copy,
  RotateCcw
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  feedback?: 'positive' | 'negative' | null;
}

const AIChatSupport: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your LinkDAO support assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;

    // Add user message with proper unique ID
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsSending(true);

    try {
      // Simulate AI response delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate AI response based on user input
      const aiResponse = generateAIResponse(inputValue);
      
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Play sound if enabled
      if (isSoundEnabled) {
        playNotificationSound();
      }
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: 'Sorry, I encountered an issue processing your request. Please try again or contact our human support team.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    // Simple response logic - in a real implementation, this would call an AI API
    if (input.includes('token') || input.includes('ldao')) {
      return 'LDAO tokens are the native governance and utility tokens of LinkDAO. You can acquire them through direct purchase, trading on decentralized exchanges, staking, or our Earn-to-Own program. Would you like more specific information about any of these methods?';
    }
    
    if (input.includes('stake') || input.includes('staking')) {
      return 'To stake LDAO tokens, navigate to the Staking section in your wallet, connect your wallet, and follow the staking interface to lock up your tokens. You\'ll earn rewards proportional to your stake and the platform\'s performance. The minimum staking amount is 10 LDAO tokens.';
    }
    
    if (input.includes('wallet')) {
      return 'LinkDAO supports all WalletConnect-compatible wallets including MetaMask, Coinbase Wallet, Trust Wallet, and Rainbow. For the best experience, we recommend using a desktop wallet like MetaMask. Make sure you\'re on the official LinkDAO website (https://linkdao.io) before connecting your wallet.';
    }
    
    if (input.includes('marketplace')) {
      return 'Our marketplace supports ETH, major stablecoins (USDC, USDT, DAI), and other popular cryptocurrencies. All transactions are secured through smart contracts with optional escrow protection. You can list both digital items (NFTs, digital art) and physical items.';
    }
    
    if (input.includes('governance') || input.includes('vote')) {
      return 'LinkDAO is a decentralized autonomous organization (DAO) governed by LDAO token holders. Each LDAO token represents one vote. You can create proposals for platform changes, and token holders can vote. Proposals with sufficient votes are automatically executed by smart contracts.';
    }
    
    if (input.includes('account')) {
      return 'You don\'t need to create a traditional account. Simply connect your Web3 wallet (like MetaMask, WalletConnect, or Coinbase Wallet) to get started. Your wallet address becomes your identity on the platform.';
    }
    
    if (input.includes('thank')) {
      return 'You\'re welcome! Is there anything else I can help you with today?';
    }
    
    // Default response
    return 'I understand you\'re looking for help with: "' + userInput + '". While I\'m still learning, I can help with common questions about LDAO tokens, staking, wallets, marketplace, and governance. For more complex issues, I recommend contacting our human support team. What specifically would you like to know?';
  };

  const playNotificationSound = () => {
    // In a real implementation, this would play an actual sound
    console.log('Playing notification sound');
  };

  const handleFeedback = (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, feedback } : msg
    ));
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers or clipboard API issues
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Fallback clipboard copy failed:', err);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  const handleRestartConversation = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hello! I\'m your LinkDAO support assistant. How can I help you today?',
        timestamp: new Date()
      }
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-end z-50">
          <div className="bg-white w-full h-2/3 sm:w-96 sm:h-[600px] flex flex-col rounded-t-xl sm:rounded-xl shadow-xl">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bot className="w-6 h-6 mr-2" />
                  <h3 className="font-semibold">LinkDAO Support Assistant</h3>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                  >
                    {isSoundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={handleRestartConversation}
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-blue-100 mt-1">AI-powered support assistant</p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white border border-gray-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      {message.role === 'assistant' ? (
                        <Bot className="w-4 h-4 mr-2 text-blue-600" />
                      ) : (
                        <User className="w-4 h-4 mr-2 text-white" />
                      )}
                      <span className="text-xs font-medium">
                        {message.role === 'assistant' ? 'Support Assistant' : 'You'}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {message.role === 'assistant' && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleFeedback(message.id, 'positive')}
                            className={`p-1 rounded ${message.feedback === 'positive' ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-green-600'}`}
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleFeedback(message.id, 'negative')}
                            className={`p-1 rounded ${message.feedback === 'negative' ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-600'}`}
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                        </div>
                        <button 
                          onClick={() => handleCopyMessage(message.content)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start mb-4">
                  <div className="bg-white border border-gray-200 rounded-lg rounded-bl-none p-3 shadow-sm">
                    <div className="flex items-center">
                      <Bot className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="text-xs font-medium text-gray-700">Support Assistant</span>
                    </div>
                    <div className="flex space-x-1 mt-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="flex items-end space-x-2">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your question here..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  disabled={isSending}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isSending}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                AI assistant can make mistakes. Consider checking important information.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatSupport;