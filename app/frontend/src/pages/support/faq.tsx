import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Home, 
  Mail, 
  MessageCircle,
  Book,
  Users,
  Shield,
  TrendingUp,
  Wallet,
  Zap
} from 'lucide-react';

const FAQPage: NextPage = () => {
  const [openCategories, setOpenCategories] = useState<string[]>(['tokens', 'marketplace']);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = (category: string) => {
    if (openCategories.includes(category)) {
      setOpenCategories(openCategories.filter(c => c !== category));
    } else {
      setOpenCategories([...openCategories, category]);
    }
  };

  const faqCategories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Home,
      faqs: [
        {
          question: "What is LinkDAO?",
          answer: "LinkDAO is a Web3 social network where you own your identity, money, and governance. Unlike traditional social media, there are no ads, no data harvesting, and no centralized control. Everything is built on blockchain technology."
        },
        {
          question: "How do I create an account?",
          answer: "You don't need to create a traditional account. Simply connect your Web3 wallet (like MetaMask, WalletConnect, or Coinbase Wallet) to get started. Your wallet address becomes your identity on the platform."
        },
        {
          question: "Do I need cryptocurrency to use LinkDAO?",
          answer: "While you can browse some content without cryptocurrency, you'll need ETH or other supported tokens to fully participate - posting, following, tipping, and voting all require small transaction fees."
        }
      ]
    },
    {
      id: 'tokens',
      title: 'LDAO Tokens',
      icon: TrendingUp,
      faqs: [
        {
          question: "What are LDAO tokens?",
          answer: "LDAO tokens are the native governance and utility tokens of the LinkDAO platform. They allow you to participate in platform governance, access premium features, and earn rewards through staking."
        },
        {
          question: "How can I acquire LDAO tokens?",
          answer: "You can acquire LDAO tokens through: 1) Direct purchase during token sales, 2) Trading on decentralized exchanges, 3) Earning through platform participation and staking rewards, 4) Our Earn-to-Own program for active community members."
        },
        {
          question: "How do I stake LDAO tokens?",
          answer: "Navigate to the Staking section in your wallet, connect your wallet, and follow the staking interface to lock up your tokens. You'll earn rewards proportional to your stake and the platform's performance."
        },
        {
          question: "What are the benefits of holding LDAO tokens?",
          answer: "LDAO token holders can: 1) Vote on platform governance proposals, 2) Access premium features and reduced fees, 3) Earn staking rewards, 4) Participate in platform revenue sharing, 5) Receive airdrops and exclusive opportunities."
        }
      ]
    },
    {
      id: 'wallet',
      title: 'Wallet & Security',
      icon: Wallet,
      faqs: [
        {
          question: "Is my wallet secure on LinkDAO?",
          answer: "Yes, LinkDAO uses industry-standard security practices. We never store your private keys, and all transactions require your direct approval through your wallet provider. Always ensure you're on the official LinkDAO website (https://linkdao.io) before connecting your wallet."
        },
        {
          question: "What wallets are supported?",
          answer: "LinkDAO supports all WalletConnect-compatible wallets including MetaMask, Coinbase Wallet, Trust Wallet, Rainbow, and many others. For the best experience, we recommend using a desktop wallet like MetaMask."
        },
        {
          question: "What should I do if I lose access to my wallet?",
          answer: "If you lose access to your wallet, you'll lose access to your LinkDAO profile and any associated assets. This is why it's crucial to properly secure and backup your wallet using the recovery phrases provided by your wallet provider. LinkDAO cannot recover lost wallets."
        }
      ]
    },
    {
      id: 'marketplace',
      title: 'Marketplace',
      icon: TrendingUp,
      faqs: [
        {
          question: "How do I list an item on the marketplace?",
          answer: "Connect your wallet, navigate to the Marketplace section, and click 'Create Listing'. You can list both digital items (NFTs, digital art) and physical items. Set your price, payment method, and shipping details (for physical items)."
        },
        {
          question: "What payment methods are accepted?",
          answer: "The marketplace supports ETH, major stablecoins (USDC, USDT, DAI), and other popular cryptocurrencies. All transactions are secured through smart contracts with optional escrow protection."
        },
        {
          question: "How does the escrow system work?",
          answer: "For added security, buyers and sellers can use the smart contract escrow system. Funds are held in the contract until both parties confirm satisfaction. The system includes dispute resolution mechanisms for unresolved issues."
        }
      ]
    },
    {
      id: 'governance',
      title: 'Governance',
      icon: Users,
      faqs: [
        {
          question: "How does governance work on LinkDAO?",
          answer: "LinkDAO is a decentralized autonomous organization (DAO) governed by LDAO token holders. Anyone can create proposals for platform changes, and token holders can vote. Proposals with sufficient votes are automatically executed by smart contracts."
        },
        {
          question: "How much voting power do I have?",
          answer: "Each LDAO token represents one vote. The more tokens you hold (or have staked), the more voting power you have. You can also delegate your voting power to other trusted community members."
        },
        {
          question: "What types of proposals can be made?",
          answer: "Proposals can include: platform feature changes, treasury allocations, parameter adjustments, partnership agreements, and protocol upgrades. The community can also propose and vote on new categories for the marketplace."
        }
      ]
    },
    {
      id: 'technical',
      title: 'Technical Issues',
      icon: Zap,
      faqs: [
        {
          question: "Why is the platform loading slowly?",
          answer: "Web3 applications can sometimes load slowly due to network congestion, RPC provider issues, or browser extension conflicts. Try refreshing the page, switching RPC providers in your wallet settings, or disabling other browser extensions."
        },
        {
          question: "I'm getting transaction errors. What should I do?",
          answer: "Transaction errors can occur due to insufficient gas fees, network congestion, or wallet issues. Try increasing your gas fees, checking your wallet balance, or waiting for network congestion to decrease. If problems persist, contact support with the transaction hash."
        },
        {
          question: "How do I clear my cache?",
          answer: "To clear the application cache: 1) Hard refresh (Ctrl+F5 or Cmd+Shift+R), 2) Clear your browser cache for linkdao.io, 3) In some cases, you may need to reset your wallet's connection to the site in your wallet settings."
        }
      ]
    }
  ];

  const filteredCategories = faqCategories.map(category => {
    if (!searchQuery) return category;
    
    const filteredFaqs = category.faqs.filter(faq => 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return {
      ...category,
      faqs: filteredFaqs
    };
  }).filter(category => category.faqs.length > 0 || !searchQuery);

  return (
    <>
      <Head>
        <title>FAQ - LinkDAO Support Center</title>
        <meta name="description" content="Frequently asked questions about LinkDAO, LDAO tokens, marketplace, and Web3 social networking" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Frequently Asked Questions</h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
                Find answers to common questions about LinkDAO, LDAO tokens, and Web3 social networking
              </p>
              
              <div className="max-w-2xl mx-auto relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search FAQ articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-lg text-gray-900 focus:ring-2 focus:ring-white focus:ring-opacity-50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-1/4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 sticky top-6">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Categories</h2>
                <div className="space-y-2">
                  {faqCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          const element = document.getElementById(category.id);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="w-full flex items-center px-4 py-3 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        <span className="font-medium">{category.title}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Need More Help?</h3>
                  <div className="space-y-3">
                    <Link 
                      href="/support" 
                      className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Home className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Support Center</div>
                      </div>
                    </Link>
                    <a 
                      href="mailto:support@linkdao.io" 
                      className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Email Support</div>
                      </div>
                    </a>
                    <button 
                      onClick={() => {
                        // This would open a live chat widget
                        alert('Live chat would open here in a real implementation');
                      }}
                      className="w-full flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Live Chat</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:w-3/4">
              {filteredCategories.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                    No FAQs found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Try a different search term
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {filteredCategories.map((category) => {
                    const Icon = category.icon;
                    const isOpen = openCategories.includes(category.id);
                    
                    return (
                      <div 
                        key={category.id} 
                        id={category.id}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
                      >
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="w-full flex items-center justify-between p-6 text-left"
                        >
                          <div className="flex items-center">
                            <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-4" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                              {category.title}
                            </h2>
                          </div>
                          {isOpen ? (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          )}
                        </button>
                        
                        {isOpen && (
                          <div className="px-6 pb-6 space-y-6 border-t border-gray-200 dark:border-gray-700">
                            {category.faqs.map((faq, index) => (
                              <div key={index} className="pt-6">
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                                  {faq.question}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                  {faq.answer}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FAQPage;