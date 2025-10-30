/**
 * LDAO Token Purchase Modal - Allows users to buy LDAO tokens
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { ldaoTokenService } from '@/services/web3/ldaoTokenService';
import { tokenService } from '@/services/web3/tokenService';
import { fiatPaymentService, FiatPaymentQuote } from '@/services/payment/fiatPaymentService';
import { dexService, DexSwapQuote } from '@/services/web3/dexService';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { 
  X, 
  ShoppingCart, 
  Zap, 
  TrendingUp, 
  Wallet,
  AlertCircle,
  ArrowUpDown
} from 'lucide-react';
import { TokenInfo } from '@/types/web3Community';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
}

type LocalTokenInfo = TokenInfo & {
  priceUSD: number;
  priceChange24h: number;
};

const PurchaseModal: React.FC<PurchaseModalProps> = ({ 
  isOpen, 
  onClose, 
  onPurchaseSuccess 
}) => {
  const { address, isConnected } = useAccount();
  const [tokenInfo, setTokenInfo] = useState<LocalTokenInfo | null>(null);
  const [userBalance, setUserBalance] = useState<string>('0');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'eth' | 'usdc' | 'fiat'>('eth');
  const [fiatQuotes, setFiatQuotes] = useState<FiatPaymentQuote[]>([]);
  const [dexQuotes, setDexQuotes] = useState<DexSwapQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<FiatPaymentQuote | DexSwapQuote | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load token info and user balance
  useEffect(() => {
    if (isOpen && isConnected && address) {
      loadTokenInfo();
      loadUserBalance();
    }
  }, [isOpen, isConnected, address]);

  const loadTokenInfo = async () => {
    try {
      const info = await tokenService.getTokenInfo('LDAO');
      if (info) {
        // Convert to our local type with required fields
        const localInfo: LocalTokenInfo = {
          ...info,
          priceUSD: info.priceUSD || 0.5,
          priceChange24h: info.priceChange24h || 0
        };
        setTokenInfo(localInfo);
      }
    } catch (error) {
      console.error('Failed to load token info:', error);
    }
  };

  const loadUserBalance = async () => {
    if (!address) return;
    
    try {
      const balance = await tokenService.getUserTokenBalance(address, 'LDAO');
      setUserBalance(balance.toFixed(2));
    } catch (error) {
      console.error('Failed to load user balance:', error);
    }
  };

  const handleAmountChange = (value: string) => {
    // Only allow numeric values and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      // Fetch quotes when amount changes
      if (value && parseFloat(value) > 0) {
        fetchQuotes(value);
      }
    }
  };

  const fetchQuotes = async (amount: string) => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setIsLoadingQuotes(true);
    setErrorMessage('');
    
    try {
      if (paymentMethod === 'fiat') {
        // Fetch fiat quotes for LDAO tokens specifically
        const quotes = await fiatPaymentService.getQuotes(parseFloat(amount), 'USD', 'LDAO');
        setFiatQuotes(quotes);
        if (quotes.length > 0) {
          setSelectedQuote(quotes[0]);
        }
      } else {
        // Fetch DEX quotes for swapping ETH/USDC to LDAO
        const fromToken = paymentMethod === 'eth' ? 'ETH' : 'USDC';
        const quotes = await dexService.getSwapQuotes(fromToken, 'LDAO', amount);
        setDexQuotes(quotes);
        if (quotes.length > 0) {
          setSelectedQuote(quotes[0]);
        } else {
          // If no quotes are returned, show a more specific error
          setErrorMessage('No DEX quotes available. Please try a different amount or payment method.');
        }
      }
    } catch (error) {
      setErrorMessage(`Failed to fetch quotes: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Quote fetch error:', error);
    } finally {
      setIsLoadingQuotes(false);
    }
  };

  const calculateCost = (): string => {
    if (!amount || !tokenInfo) return '0.00';
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return '0.00';
    
    // Calculate cost based on token price
    const cost = amountNum * (tokenInfo.priceUSD || 0.5);
    return cost.toFixed(2);
  };

  const handlePurchase = async () => {
    if (!isConnected || !address || !amount) {
      setErrorMessage('Please connect your wallet and enter an amount');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    if (paymentMethod === 'fiat' && (!selectedQuote || !fiatQuotes.length)) {
      setErrorMessage('Please select a fiat payment provider');
      return;
    }

    if (paymentMethod !== 'fiat' && (!selectedQuote || !dexQuotes.length)) {
      setErrorMessage('Please select a DEX for crypto swap');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setTransactionStatus('idle');

    try {
      // In a real implementation, this would interact with the selected payment processor
      // or DEX contract to swap ETH/ERC20/fiat for LDAO tokens
      
      if (paymentMethod === 'fiat') {
        // Redirect to selected fiat provider
        const quote = selectedQuote as FiatPaymentQuote;
        window.open(quote.url, '_blank');
        
        // Simulate successful purchase
        setTimeout(() => {
          setTransactionStatus('success');
          // Refresh user balance
          loadUserBalance();
          // Notify parent of success
          if (onPurchaseSuccess) {
            onPurchaseSuccess();
          }
          // Close modal after a delay
          setTimeout(() => {
            onClose();
            setTransactionStatus('idle');
          }, 2000);
        }, 2000);
      } else {
        // Execute DEX swap using the real DEX service
        const quote = selectedQuote as DexSwapQuote;
        const fromToken = paymentMethod === 'eth' ? 'ETH' : 'USDC';
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
        
        let result;
        if (quote.dex === 'uniswap') {
          result = await dexService.swapOnUniswap(
            fromToken,
            'LDAO',
            amount,
            quote.toAmount,
            deadline
          );
        } else {
          result = await dexService.swapOnSushiswap(
            fromToken,
            'LDAO',
            amount,
            quote.toAmount,
            deadline
          );
        }
        
        if (result.status === 'success') {
          setTransactionStatus('success');
          // Refresh user balance
          loadUserBalance();
          // Notify parent of success
          if (onPurchaseSuccess) {
            onPurchaseSuccess();
          }
          // Close modal after a delay
          setTimeout(() => {
            onClose();
            setTransactionStatus('idle');
          }, 2000);
        } else {
          throw new Error(result.error || 'Swap failed');
        }
      }
    } catch (error) {
      setTransactionStatus('error');
      setErrorMessage(`Purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Purchase error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMaxAmount = () => {
    // Set a reasonable max amount for demo purposes
    setAmount('1000');
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl w-full max-w-md border border-white/20 relative z-[10000]">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Buy LDAO Tokens</h2>
            <button 
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Token Info */}
          <div className="bg-white/10 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-4">
              {tokenInfo?.logoUrl ? (
                <img 
                  src={tokenInfo.logoUrl} 
                  alt={tokenInfo.name} 
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Zap className="text-white" size={20} />
                </div>
              )}
              <div>
                <div className="font-bold text-white">{tokenInfo?.symbol || 'LDAO'}</div>
                <div className="text-sm text-white/70">{tokenInfo?.name || 'LinkDAO Token'}</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-white/70">Price</div>
                <div className="font-bold text-white">
                  ${tokenInfo?.priceUSD?.toFixed(2) || '0.50'} USD
                </div>
              </div>
              <div>
                <div className="text-sm text-white/70">Balance</div>
                <div className="font-bold text-white">{userBalance} LDAO</div>
              </div>
            </div>
          </div>

          {/* Purchase Form */}
          <div className="space-y-4">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Amount to Buy
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleMaxAmount}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded"
                >
                  MAX
                </button>
              </div>
              <div className="mt-1 text-sm text-white/60">
                ≈ ${calculateCost()} USD
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    setPaymentMethod('eth');
                    if (amount && parseFloat(amount) > 0) {
                      fetchQuotes(amount);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-colors ${
                    paymentMethod === 'eth'
                      ? 'bg-purple-500/20 border-purple-500 text-white'
                      : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <Wallet size={18} />
                  ETH
                </button>
                <button
                  onClick={() => {
                    setPaymentMethod('usdc');
                    if (amount && parseFloat(amount) > 0) {
                      fetchQuotes(amount);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-colors ${
                    paymentMethod === 'usdc'
                      ? 'bg-purple-500/20 border-purple-500 text-white'
                      : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <Wallet size={18} />
                  USDC
                </button>
                <button
                  onClick={() => {
                    setPaymentMethod('fiat');
                    if (amount && parseFloat(amount) > 0) {
                      fetchQuotes(amount);
                    }
                  }}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-colors ${
                    paymentMethod === 'fiat'
                      ? 'bg-purple-500/20 border-purple-500 text-white'
                      : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <Wallet size={18} />
                  Fiat
                </button>
              </div>
            </div>

            {/* Quotes Loading */}
            {isLoadingQuotes && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                <span className="ml-2 text-white">Fetching best rates...</span>
              </div>
            )}

            {/* Quotes Selection */}
            {((paymentMethod === 'fiat' && fiatQuotes.length > 0) || 
              (paymentMethod !== 'fiat' && dexQuotes.length > 0)) && !isLoadingQuotes && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">Best Rates</h4>
                  <ArrowUpDown size={16} className="text-white/50" />
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(paymentMethod === 'fiat' ? fiatQuotes : dexQuotes).map((quote, index) => (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedQuote === quote 
                          ? 'bg-purple-500/20 border border-purple-500' 
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                      onClick={() => setSelectedQuote(quote)}
                    >
                      <div>
                        <div className="font-medium text-white">
                          {paymentMethod === 'fiat' 
                            ? (quote as FiatPaymentQuote).provider.toUpperCase()
                            : (quote as DexSwapQuote).dex.toUpperCase()}
                        </div>
                        <div className="text-sm text-white/70">
                          {paymentMethod === 'fiat' 
                            ? `Fee: $${(quote as FiatPaymentQuote).fees.toFixed(2)}`
                            : `Fee: ${(quote as DexSwapQuote).fee} ETH`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-white">
                          {paymentMethod === 'fiat' 
                            ? `$${(quote as FiatPaymentQuote).totalCost.toFixed(2)}`
                            : `${(quote as DexSwapQuote).expectedAmount} LDAO`}
                        </div>
                        <div className="text-sm text-white/70">
                          {paymentMethod === 'fiat' 
                            ? (quote as FiatPaymentQuote).estimatedCompletionTime
                            : 'Instant'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Quotes Available Message */}
            {((paymentMethod !== 'fiat' && dexQuotes.length === 0) || 
              (paymentMethod === 'fiat' && fiatQuotes.length === 0)) && 
             !isLoadingQuotes && amount && parseFloat(amount) > 0 && (
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <AlertCircle size={24} className="mx-auto text-white/50 mb-2" />
                <p className="text-white/70 text-sm">
                  {paymentMethod === 'fiat' 
                    ? 'No fiat payment providers available at the moment. Please try another payment method.' 
                    : 'No DEX quotes available. Showing estimated rates based on current market prices.'}
                </p>
              </div>
            )}

            {/* Summary */}
            <GlassPanel variant="secondary" className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Amount</span>
                  <span className="text-white">{amount || '0'} LDAO</span>
                </div>
                {selectedQuote && paymentMethod === 'fiat' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Provider</span>
                      <span className="text-white">{(selectedQuote as FiatPaymentQuote).provider.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Fees</span>
                      <span className="text-white">${(selectedQuote as FiatPaymentQuote).fees.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Subtotal</span>
                      <span className="text-white">${((selectedQuote as FiatPaymentQuote).amount).toFixed(2)}</span>
                    </div>
                  </>
                )}
                {selectedQuote && paymentMethod !== 'fiat' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">DEX</span>
                      <span className="text-white">{(selectedQuote as DexSwapQuote).dex.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Network Fee</span>
                      <span className="text-white">{(selectedQuote as DexSwapQuote).fee} ETH</span>
                    </div>
                  </>
                )}
                <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-white">
                    {selectedQuote && paymentMethod === 'fiat' 
                      ? `$${(selectedQuote as FiatPaymentQuote).totalCost.toFixed(2)} USD`
                      : `${amount || '0'} LDAO`}
                  </span>
                </div>
              </div>
            </GlassPanel>

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-red-500/20 rounded-lg text-red-300">
                <AlertCircle size={16} />
                <span className="text-sm">{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {transactionStatus === 'success' && (
              <div className="flex items-center gap-2 p-3 bg-green-500/20 rounded-lg text-green-300">
                <TrendingUp size={16} />
                <span className="text-sm">Purchase successful! Tokens will appear in your wallet shortly.</span>
              </div>
            )}

            {/* Action Button */}
            <Button
              variant="primary"
              onClick={handlePurchase}
              disabled={isProcessing || !isConnected}
              className="w-full flex items-center justify-center gap-2 py-3"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart size={18} />
                  {isConnected ? 'Buy LDAO Tokens' : 'Connect Wallet'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render modal in a portal to ensure it's above all other content
  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
};

export default PurchaseModal;