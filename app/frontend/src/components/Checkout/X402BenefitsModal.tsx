import React from 'react';
import { X, Zap, Shield, Clock, TrendingDown, CheckCircle } from 'lucide-react';

interface X402BenefitsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function X402BenefitsModal({ isOpen, onClose }: X402BenefitsModalProps) {
    if (!isOpen) return null;

    const benefits = [
        {
            icon: <TrendingDown className="w-6 h-6" />,
            title: 'Up to 90% Lower Fees',
            description: 'Optimized smart contracts reduce transaction costs dramatically compared to standard crypto payments.',
            color: 'from-green-500 to-emerald-600'
        },
        {
            icon: <Zap className="w-6 h-6" />,
            title: 'Lightning Fast',
            description: 'Transactions confirm in under 1 minute with our optimized protocol, much faster than traditional methods.',
            color: 'from-yellow-500 to-orange-600'
        },
        {
            icon: <Shield className="w-6 h-6" />,
            title: 'Secure & Trustless',
            description: 'Built on battle-tested smart contracts with escrow protection. Your funds are always safe.',
            color: 'from-blue-500 to-indigo-600'
        },
        {
            icon: <CheckCircle className="w-6 h-6" />,
            title: 'No Hidden Costs',
            description: 'What you see is what you pay. No surprise gas fees or additional charges.',
            color: 'from-purple-500 to-pink-600'
        }
    ];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">x402 Protocol</h2>
                                <p className="text-purple-100 text-sm">The Future of Low-Fee Payments</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        >
                            <X className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* What is x402 */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            What is x402 Protocol?
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                            x402 is a revolutionary payment protocol developed by Coinbase that dramatically reduces
                            transaction fees through optimized smart contract architecture. It maintains the same
                            security guarantees as standard blockchain transactions while cutting costs by up to 90%.
                        </p>
                    </div>

                    {/* Benefits Grid */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Key Benefits
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {benefits.map((benefit, index) => (
                                <div
                                    key={index}
                                    className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600"
                                >
                                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${benefit.color} flex items-center justify-center text-white mb-3`}>
                                        {benefit.icon}
                                    </div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                        {benefit.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {benefit.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* How It Works */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                            How It Works
                        </h3>
                        <div className="space-y-3">
                            {[
                                { step: 1, title: 'Select x402', desc: 'Choose x402 as your payment method at checkout' },
                                { step: 2, title: 'Optimized Processing', desc: 'Our smart contracts batch and optimize your transaction' },
                                { step: 3, title: 'Instant Confirmation', desc: 'Receive confirmation in under 1 minute with minimal fees' }
                            ].map((item) => (
                                <div key={item.step} className="flex gap-4">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                                        {item.step}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900 dark:text-white">{item.title}</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Comparison */}
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                        <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-3">
                            Real Example: $100 Purchase
                        </h4>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-700 dark:text-gray-300">x402 Protocol</span>
                                <span className="font-bold text-green-600 dark:text-green-400">$0.10 fee</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-700 dark:text-gray-300">Standard Crypto</span>
                                <span className="font-bold text-red-600 dark:text-red-400">$5.00 fee</span>
                            </div>
                            <div className="pt-2 border-t border-purple-200 dark:border-purple-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-purple-900 dark:text-purple-300">You Save</span>
                                    <span className="font-bold text-purple-600 dark:text-purple-400">$4.90 (98%)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
                        >
                            Use x402 Protocol
                        </button>
                        <a
                            href="https://www.coinbase.com/x402"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 border-2 border-purple-600 text-purple-600 dark:text-purple-400 rounded-lg font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                        >
                            Learn More
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
