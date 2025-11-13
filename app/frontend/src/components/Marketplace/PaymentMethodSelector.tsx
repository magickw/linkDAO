import React, { useState, useEffect } from 'react';
import { PaymentMethod, tokenService, TokenInfo } from '../../services/tokenService';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  amount?: string;
  showBalance?: boolean;
  disabled?: boolean;
  className?: string;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  selectedMethod,
  onMethodChange,
  amount,
  showBalance = true,
  disabled = false,
  className = ''
}) => {
  const [tokenInfo, setTokenInfo] = useState<Record<PaymentMethod, TokenInfo | null>>({
    [PaymentMethod.ETH]: null,
    [PaymentMethod.USDC]: null,
    [PaymentMethod.USDT]: null
  });

  const [balances, setBalances] = useState<Record<PaymentMethod, string>>({
    [PaymentMethod.ETH]: '0',
    [PaymentMethod.USDC]: '0',
    [PaymentMethod.USDT]: '0'
  });

  const [loading, setLoading] = useState(true);
  const [sufficientBalance, setSufficientBalance] = useState<Record<PaymentMethod, boolean>>({
    [PaymentMethod.ETH]: true,
    [PaymentMethod.USDC]: true,
    [PaymentMethod.USDT]: true
  });

  useEffect(() => {
    loadTokenInfo();
  }, []);

  useEffect(() => {
    if (amount && tokenInfo[selectedMethod]) {
      checkBalances();
    }
  }, [amount, selectedMethod, tokenInfo]);

  const loadTokenInfo = async () => {
    try {
      setLoading(true);
      await tokenService.initialize();

      const [ethInfo, usdcInfo, usdtInfo] = await Promise.all([
        tokenService.getTokenInfo(PaymentMethod.ETH),
        tokenService.getTokenInfo(PaymentMethod.USDC),
        tokenService.getTokenInfo(PaymentMethod.USDT)
      ]);

      setTokenInfo({
        [PaymentMethod.ETH]: ethInfo,
        [PaymentMethod.USDC]: usdcInfo,
        [PaymentMethod.USDT]: usdtInfo
      });

      if (showBalance) {
        await loadBalances();
      }
    } catch (error) {
      console.error('Failed to load token info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBalances = async () => {
    try {
      const [ethBalance, usdcBalance, usdtBalance] = await Promise.all([
        tokenService.getFormattedBalance(PaymentMethod.ETH),
        tokenService.getFormattedBalance(PaymentMethod.USDC),
        tokenService.getFormattedBalance(PaymentMethod.USDT)
      ]);

      setBalances({
        [PaymentMethod.ETH]: ethBalance,
        [PaymentMethod.USDC]: usdcBalance,
        [PaymentMethod.USDT]: usdtBalance
      });
    } catch (error) {
      console.error('Failed to load balances:', error);
    }
  };

  const checkBalances = async () => {
    if (!amount) return;

    try {
      const checks = await Promise.all([
        PaymentMethod.ETH,
        PaymentMethod.USDC,
        PaymentMethod.USDT
      ].map(async (method) => {
        const info = tokenInfo[method];
        if (!info) return { method, hasBalance: true };

        const amountBigInt = tokenService.parseAmount(amount, info.decimals);
        const { hasBalance } = await tokenService.checkBalance(method, amountBigInt);
        return { method, hasBalance };
      }));

      const newSufficientBalance = { ...sufficientBalance };
      checks.forEach(({ method, hasBalance }) => {
        newSufficientBalance[method] = hasBalance;
      });
      setSufficientBalance(newSufficientBalance);
    } catch (error) {
      console.error('Failed to check balances:', error);
    }
  };

  const paymentMethods = [
    {
      method: PaymentMethod.ETH,
      icon: '⟠',
      color: 'from-purple-500 to-indigo-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      method: PaymentMethod.USDC,
      icon: '$',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      method: PaymentMethod.USDT,
      icon: '₮',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Payment Method
        </label>
        <div className="grid grid-cols-3 gap-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Payment Method
      </label>
      <div className="grid grid-cols-3 gap-3">
        {paymentMethods.map(({ method, icon, color, bgColor, borderColor }) => {
          const info = tokenInfo[method];
          const isSelected = selectedMethod === method;
          const hasEnoughBalance = sufficientBalance[method];
          const isDisabled = disabled || !hasEnoughBalance;

          return (
            <button
              key={method}
              type="button"
              onClick={() => !isDisabled && onMethodChange(method)}
              disabled={isDisabled}
              className={`
                relative p-4 rounded-lg border-2 transition-all
                ${isSelected
                  ? `${borderColor} ${bgColor} ring-2 ring-offset-1 ring-${borderColor.split('-')[1]}-300`
                  : 'border-gray-200 hover:border-gray-300'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
                ${!hasEnoughBalance && amount ? 'border-red-200' : ''}
              `}
            >
              <div className="flex flex-col items-center space-y-2">
                {/* Icon */}
                <div className={`
                  w-10 h-10 rounded-full bg-gradient-to-br ${color}
                  flex items-center justify-center text-white font-bold text-xl
                `}>
                  {icon}
                </div>

                {/* Symbol */}
                <div className="text-sm font-semibold text-gray-900">
                  {info?.symbol || '...'}
                </div>

                {/* Balance */}
                {showBalance && (
                  <div className={`
                    text-xs ${hasEnoughBalance ? 'text-gray-600' : 'text-red-600'}
                  `}>
                    {balances[method]}
                  </div>
                )}

                {/* Insufficient balance indicator */}
                {!hasEnoughBalance && amount && (
                  <div className="absolute top-1 right-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                )}

                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Insufficient balance warning */}
      {amount && !sufficientBalance[selectedMethod] && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Insufficient Balance</p>
              <p className="text-xs text-red-600 mt-1">
                You need {amount} {tokenInfo[selectedMethod]?.symbol} but only have {balances[selectedMethod]}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Token approval notice for USDC/USDT */}
      {selectedMethod !== PaymentMethod.ETH && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-xs text-blue-800">
                You'll need to approve the marketplace to spend your {tokenInfo[selectedMethod]?.symbol} tokens. This is a one-time transaction.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodSelector;
