import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Book,
  ArrowLeft,
  Hash,
  Globe,
  Users,
  Shield,
  TrendingUp,
  Wallet,
  Zap,
  MessageCircle
} from 'lucide-react';

const GlossaryPage: NextPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openTerms, setOpenTerms] = useState<string[]>([]);

  const toggleTerm = (termId: string) => {
    if (openTerms.includes(termId)) {
      setOpenTerms(openTerms.filter(id => id !== termId));
    } else {
      setOpenTerms([...openTerms, termId]);
    }
  };

  const glossaryTerms = [
    {
      id: 'web3',
      category: 'Fundamentals',
      icon: Globe,
      terms: [
        {
          term: 'Web3',
          definition: 'The next generation of the internet built on blockchain technology, where users own their data and digital identities rather than centralized companies.',
          example: 'Unlike Web2 (Facebook, Twitter), Web3 platforms like LinkDAO give you control over your information and earnings.'
        },
        {
          term: 'Blockchain',
          definition: 'A distributed digital ledger that records transactions across multiple computers in a way that makes records extremely difficult to alter.',
          example: 'Think of it as a public, tamper-proof record book that everyone can see but no one can secretly change.'
        },
        {
          term: 'Decentralized',
          definition: 'Controlled by many participants rather than a single authority, making systems more resilient and censorship-resistant.',
          example: 'Bitcoin is decentralized because no bank or government controls it - thousands of computers worldwide maintain the network.'
        }
      ]
    },
    {
      id: 'wallet',
      category: 'Wallet & Security',
      icon: Wallet,
      terms: [
        {
          term: 'Crypto Wallet',
          definition: 'A digital tool that stores your private keys and allows you to interact with blockchain networks to send, receive, and manage digital assets.',
          example: 'MetaMask and Coinbase Wallet are popular crypto wallets that work with LinkDAO.'
        },
        {
          term: 'Private Key',
          definition: 'A secret code that proves ownership of your wallet and digital assets. Like a password, but if lost, you permanently lose access to your funds.',
          example: 'Your private key is like the PIN to your bank account - never share it with anyone.'
        },
        {
          term: 'Seed Phrase',
          definition: 'A series of 12-24 words that can restore access to your wallet if you lose your device. Store it securely offline.',
          example: 'Write down your seed phrase on paper and keep it in a safe place - it\'s the only way to recover your wallet.'
        },
        {
          term: 'Wallet Address',
          definition: 'A unique identifier (like an email address) that you share with others to receive payments or connect to dApps.',
          example: 'Your wallet address looks like: 0x742d35Cc6634C0532925a3b8D49A0D8234567890'
        }
      ]
    },
    {
      id: 'defi',
      category: 'DeFi Terms',
      icon: TrendingUp,
      terms: [
        {
          term: 'DeFi (Decentralized Finance)',
          definition: 'Financial services built on blockchain technology without traditional banks or intermediaries.',
          example: 'Instead of a bank loan, you can use DeFi protocols to borrow cryptocurrency by locking up collateral.'
        },
        {
          term: 'Smart Contract',
          definition: 'Self-executing computer programs that automatically carry out agreements when predetermined conditions are met.',
          example: 'When you buy something on LinkDAO\'s marketplace, a smart contract holds the payment until both parties confirm satisfaction.'
        },
        {
          term: 'Yield Farming',
          definition: 'Earning rewards by providing liquidity to DeFi protocols or staking tokens in various platforms.',
          example: 'Deposit USDC into a liquidity pool and earn trading fees plus additional token rewards.'
        },
        {
          term: 'APY (Annual Percentage Yield)',
          definition: 'The total return on investment over one year, including compound interest from reinvested earnings.',
          example: 'A vault offering 12% APY pays you 1% per month, with each month\'s earnings added to your principal.'
        },
        {
          term: 'TVL (Total Value Locked)',
          definition: 'The total amount of assets deposited in a DeFi protocol, measured in dollar value.',
          example: 'A vault with $10 million TVL has $10 million worth of tokens deposited by users.'
        }
      ]
    },
    {
      id: 'tokens',
      category: 'Tokens & NFTs',
      icon: Hash,
      terms: [
        {
          term: 'Cryptocurrency',
          definition: 'Digital money that uses cryptography for security and operates independently of central banks.',
          example: 'Bitcoin, Ethereum, and LDAO are all cryptocurrencies with different purposes and technologies.'
        },
        {
          term: 'Token',
          definition: 'A digital asset representing value, utility, or ownership on a blockchain network.',
          example: 'LDAO tokens give you voting rights in LinkDAO governance and access to platform features.'
        },
        {
          term: 'NFT (Non-Fungible Token)',
          definition: 'Unique digital assets that represent ownership of specific items like art, collectibles, or virtual real estate.',
          example: 'Digital artwork, event tickets, and gaming items can be represented as NFTs with provable ownership.'
        },
        {
          term: 'Stablecoin',
          definition: 'Cryptocurrencies designed to maintain a stable value, typically pegged to traditional currencies like the US dollar.',
          example: 'USDC and USDT are stablecoins worth approximately $1 each, perfect for transactions without price volatility.'
        }
      ]
    },
    {
      id: 'governance',
      category: 'Governance',
      icon: Users,
      terms: [
        {
          term: 'DAO (Decentralized Autonomous Organization)',
          definition: 'An organization governed by smart contracts and community voting rather than traditional corporate hierarchies.',
          example: 'LinkDAO is a DAO where token holders vote on platform changes, feature additions, and treasury allocations.'
        },
        {
          term: 'Governance Token',
          definition: 'Tokens that grant voting rights in a DAO or protocol\'s decision-making processes.',
          example: 'Each LDAO token equals one vote in LinkDAO governance proposals.'
        },
        {
          term: 'Proposal',
          definition: 'A formal suggestion submitted to a DAO for community voting on platform changes or treasury spending.',
          example: 'Community members can propose new marketplace categories, fee structures, or partnership agreements.'
        }
      ]
    },
    {
      id: 'security',
      category: 'Security',
      icon: Shield,
      terms: [
        {
          term: 'Gas Fees',
          definition: 'Transaction costs paid to miners or validators for processing blockchain transactions, paid in the network\'s native cryptocurrency.',
          example: 'Sending ETH on Ethereum network requires gas fees, which vary based on network congestion.'
        },
        {
          term: 'Phishing',
          definition: 'Fraudulent attempts to steal your private keys or login credentials by pretending to be legitimate websites or services.',
          example: 'Always verify you\'re on https://linkdao.io before connecting your wallet - never click suspicious links.'
        },
        {
          term: 'Slippage',
          definition: 'The difference between expected and actual trade prices, especially common with large trades or volatile assets.',
          example: 'Setting 1% slippage tolerance means your trade can execute at up to 1% worse than the quoted price.'
        }
      ]
    }
  ];

  const filteredCategories = glossaryTerms.map(category => {
    if (!searchQuery) return category;
    
    const filteredTerms = category.terms.filter(term => 
      term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      term.definition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      term.example.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return {
      ...category,
      terms: filteredTerms
    };
  }).filter(category => category.terms.length > 0 || !searchQuery);

  return (
    <>
      <Head>
        <title>Glossary - LinkDAO Support Center</title>
        <meta name="description" content="Simple explanations of DeFi, Web3, and cryptocurrency terms for beginners" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Web3 & DeFi Glossary</h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
                Simple explanations of cryptocurrency, blockchain, and decentralized finance terms
              </p>
              
              <div className="max-w-2xl mx-auto relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search terms, definitions, or examples..."
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
            {/* Main Content */}
            <div className="lg:w-3/4">
              {filteredCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <div key={category.id} className="mb-12">
                    <div className="flex items-center mb-6">
                      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {category.category}
                      </h2>
                    </div>
                    
                    <div className="space-y-4">
                      {category.terms.map((term) => (
                        <div 
                          key={term.term} 
                          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                        >
                          <button
                            onClick={() => toggleTerm(term.term)}
                            className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {term.term}
                            </h3>
                            {openTerms.includes(term.term) ? (
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                          </button>
                          
                          {openTerms.includes(term.term) && (
                            <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700">
                              <p className="text-gray-700 dark:text-gray-300 mb-3">
                                <span className="font-medium">Definition:</span> {term.definition}
                              </p>
                              <p className="text-gray-600 dark:text-gray-400 text-sm">
                                <span className="font-medium">Example:</span> {term.example}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {!filteredCategories.length && searchQuery && (
                <div className="text-center py-12">
                  <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No terms found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try searching with different keywords or browse all categories
                  </p>
                </div>
              )}
            </div>
            
            {/* Sidebar */}
            <div className="lg:w-1/4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 sticky top-6">
                <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Categories</h3>
                <nav className="space-y-2">
                  {glossaryTerms.map((category) => {
                    const Icon = category.icon;
                    return (
                      <a
                        key={category.id}
                        href={`#${category.id}`}
                        className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {category.category}
                      </a>
                    );
                  })}
                </nav>
                
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Popular Terms</h4>
                  <div className="space-y-2">
                    {['Web3', 'Wallet', 'DeFi', 'NFT', 'DAO'].map((term) => (
                      <button
                        key={term}
                        onClick={() => setSearchQuery(term)}
                        className="block text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Call to Action */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-800">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Still Confused?</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
                These terms can be challenging at first. Our support team is here to help explain anything in simple terms.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link 
                  href="/support/live-chat" 
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Live Chat Support
                </Link>
                <Link 
                  href="/docs/getting-started" 
                  className="px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg font-medium transition-colors"
                >
                  Beginner's Guide
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GlossaryPage;