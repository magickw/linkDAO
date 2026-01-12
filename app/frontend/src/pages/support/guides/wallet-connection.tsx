import React, { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Wallet, 
  Download,
  Plug,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Shield,
  Smartphone,
  Monitor,
  Copy,
  ExternalLink,
  MessageCircle
} from 'lucide-react';

const WalletConnectionGuide: NextPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  
  const steps = [
    {
      id: 1,
      title: 'Choose Your Wallet',
      description: 'Select a Web3 wallet that works best for your needs',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Monitor className="w-8 h-8 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold">Desktop Wallets</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  MetaMask (Browser Extension)
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Coinbase Wallet
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Brave Wallet (Built-in)
                </li>
              </ul>
              <p className="mt-3 text-xs text-gray-500">Best for frequent trading and advanced features</p>
            </div>
            
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Smartphone className="w-8 h-8 text-purple-600 mr-3" />
                <h3 className="text-lg font-semibold">Mobile Wallets</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Trust Wallet
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Rainbow Wallet
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  WalletConnect Apps
                </li>
              </ul>
              <p className="mt-3 text-xs text-gray-500">Best for mobile browsing and payments</p>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-1">Recommended Choice</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  For beginners, we recommend MetaMask for desktop or Trust Wallet for mobile devices.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      image: '/images/wallet-selection.png' // Placeholder for actual screenshot
    },
    {
      id: 2,
      title: 'Install Your Wallet',
      description: 'Download and install your chosen wallet application',
      content: (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <Download className="w-5 h-5 text-green-500 mr-2" />
              Installing MetaMask (Browser Extension)
            </h3>
            <ol className="list-decimal list-inside space-y-3 text-gray-700 dark:text-gray-300">
              <li>Visit metamask.io in your browser</li>
              <li>Click "Download" and select your browser</li>
              <li>Follow the installation prompts</li>
              <li>Restart your browser when prompted</li>
              <li>Look for the fox icon in your browser toolbar</li>
            </ol>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <AlertCircle className="w-5 h-5 text-yellow-600 mb-2" />
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">Important Security Note</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Only download wallets from official sources. Check the URL is correct before installing.
              </p>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <CheckCircle className="w-5 h-5 text-green-600 mb-2" />
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">Verification Tips</h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Look for official badges, check reviews, and verify download counts before installing.
              </p>
            </div>
          </div>
        </div>
      ),
      image: '/images/metamask-install.png'
    },
    {
      id: 3,
      title: 'Set Up Your Wallet',
      description: 'Create your wallet and secure your recovery phrase',
      content: (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4">Wallet Setup Process</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-blue-800 dark:text-blue-200 font-medium">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">Agree to Terms</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Read and accept the wallet terms of service</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-blue-800 dark:text-blue-200 font-medium">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">Create Password</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Set a strong password to unlock your wallet locally</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-blue-800 dark:text-blue-200 font-medium">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-1">Save Recovery Phrase</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Write down your 12-word phrase and store it securely</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-red-600 mb-2" />
            <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Critical Security Warning</h4>
            <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside space-y-1">
              <li><strong>Never</strong> share your recovery phrase with anyone</li>
              <li><strong>Never</strong> enter your recovery phrase on websites</li>
              <li><strong>Never</strong> store your phrase digitally (photos, emails, cloud storage)</li>
              <li><strong>Always</strong> write it down on paper and store in multiple secure locations</li>
            </ul>
          </div>
        </div>
      ),
      image: '/images/wallet-setup.png'
    },
    {
      id: 4,
      title: 'Connect to LinkDAO',
      description: 'Link your wallet to the LinkDAO platform',
      content: (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <Plug className="w-5 h-5 text-green-500 mr-2" />
              Connection Steps
            </h3>
            <div className="space-y-4">
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="font-medium mr-2">Step 1:</span>
                <span>Navigate to LinkDAO.io and click "Connect Wallet"</span>
              </div>
              
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="font-medium mr-2">Step 2:</span>
                <span>Select your wallet from the popup menu</span>
              </div>
              
              <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="font-medium mr-2">Step 3:</span>
                <span>Approve the connection in your wallet</span>
              </div>
              
              <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="font-medium text-green-800 dark:text-green-200">You're now connected!</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Network Selection</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                LinkDAO will automatically connect to the appropriate network. You can switch networks later in your wallet settings.
              </p>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">First-Time Connection</h4>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                You may need to sign a message to verify wallet ownership. This doesn't cost gas fees.
              </p>
            </div>
          </div>
        </div>
      ),
      image: '/images/linkdao-connect.png'
    },
    {
      id: 5,
      title: 'Security Best Practices',
      description: 'Keep your wallet and funds safe',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold mb-4 text-green-600">✅ Do This</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Write recovery phrase on paper and store in multiple secure locations</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Enable two-factor authentication if available</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Use strong, unique passwords</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Keep wallet software updated</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Verify you're on the official LinkDAO website</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold mb-4 text-red-600">❌ Don't Do This</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Share your recovery phrase or private keys</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Enter wallet details on suspicious websites</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Click on unsolicited wallet connection requests</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Store recovery phrases digitally</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Use public Wi-Fi for wallet transactions</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-lg mb-3 text-center">Quick Security Checklist</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                'Wallet installed securely',
                'Recovery phrase saved offline',
                'Strong password set',
                'On official website'
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-green-500">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      image: '/images/security-best-practices.png'
    }
  ];

  const currentStepData = steps.find(step => step.id === currentStep);

  return (
    <>
      <Head>
        <title>Wallet Connection Guide - LinkDAO</title>
        <meta name="description" content="Step-by-step illustrated guide to connecting your Web3 wallet to LinkDAO safely and securely" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/docs/getting-started" className="inline-flex items-center text-blue-600 dark:text-blue-400 mb-6 hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Getting Started
          </Link>

          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
              <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Wallet Connection Guide
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Learn how to safely connect your Web3 wallet to LinkDAO with step-by-step instructions and security tips
            </p>
          </div>

          {/* Progress Tracker */}
          <div className="mb-12">
            <div className="flex flex-wrap justify-center gap-2 md:gap-4">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentStep === step.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : currentStep > step.id
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {currentStep > step.id && (
                    <CheckCircle className="w-4 h-4 mr-1" />
                  )}
                  <span>{step.id}.</span>
                  <span className="hidden sm:inline ml-1">{step.title.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Content Section */}
            <div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {currentStep}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {currentStepData?.title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        {currentStepData?.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="prose prose-blue max-w-none dark:prose-invert">
                    {currentStepData?.content}
                  </div>
                </div>
                
                {/* Navigation */}
                <div className="px-8 py-6 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                  <button
                    onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center ${
                      currentStep === 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </button>
                  
                  <button
                    onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
                    disabled={currentStep === steps.length}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center ${
                      currentStep === steps.length
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            </div>

            {/* Visual Guide Section */}
            <div className="sticky top-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6">
                  <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Visual Guide</h3>
                  <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-300 dark:bg-gray-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Wallet className="w-8 h-8 text-gray-500" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400">Screenshot placeholder</p>
                      <p className="text-sm text-gray-400 mt-1">Actual screenshots coming soon</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <button className="w-full flex items-center justify-between p-3 text-left bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                      <span className="font-medium text-blue-800 dark:text-blue-200">View Full Size</span>
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                    </button>
                    
                    <button className="w-full flex items-center justify-between p-3 text-left bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Download Guide PDF</span>
                      <Download className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Quick Help */}
              <div className="mt-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                <h3 className="font-semibold mb-3 text-purple-800 dark:text-purple-200">Need Help?</h3>
                <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
                  If you're having trouble connecting your wallet, our support team can help.
                </p>
                <Link 
                  href="/support/live-chat" 
                  className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat with Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WalletConnectionGuide;