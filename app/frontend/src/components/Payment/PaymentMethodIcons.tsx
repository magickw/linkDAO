/**
 * Payment Method Icons - Visual representation of payment methods
 */

import React from 'react';
import { Wallet, CreditCard, Coins, DollarSign, Bitcoin } from 'lucide-react';

export interface PaymentMethodIconProps {
  method: 'eth' | 'usdc' | 'usdt' | 'dai' | 'matic' | 'stripe' | 'card' | 'crypto';
  size?: number;
  className?: string;
}

export const PaymentMethodIcon: React.FC<PaymentMethodIconProps> = ({
  method,
  size = 24,
  className = ''
}) => {
  const getIcon = () => {
    switch (method.toLowerCase()) {
      case 'eth':
        return (
          <svg width={size} height={size} viewBox="0 0 256 417" className={className}>
            <path fill="#343434" d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"/>
            <path fill="#8C8C8C" d="M127.962 0L0 212.32l127.962 75.639V154.158z"/>
            <path fill="#3C3C3B" d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z"/>
            <path fill="#8C8C8C" d="M127.962 416.905v-104.72L0 236.585z"/>
            <path fill="#141414" d="M127.961 287.958l127.96-75.637-127.96-58.162z"/>
            <path fill="#393939" d="M0 212.32l127.96 75.638v-133.8z"/>
          </svg>
        );

      case 'usdc':
        return (
          <svg width={size} height={size} viewBox="0 0 256 256" className={className}>
            <circle cx="128" cy="128" r="128" fill="#2775CA"/>
            <path fill="#FFFFFF" d="M128 36C73.7 36 29.8 79.9 29.8 134.2S73.7 232.4 128 232.4s98.2-43.9 98.2-98.2S182.3 36 128 36zm0 176.4c-43.1 0-78.2-35.1-78.2-78.2S84.9 56 128 56s78.2 35.1 78.2 78.2-35.1 78.2-78.2 78.2z"/>
            <path fill="#FFFFFF" d="M164.1 155.4c0-16.8-10.9-25.1-32.6-30.5-15.8-3.9-19.1-7.8-19.1-14.7 0-6.9 5.6-11.7 15.8-11.7 9.4 0 15.2 3.5 18.5 10.9 0.5 1.3 1.8 2.1 3.1 2.1h9.7c1.7 0 3.1-1.4 3.1-3.1v-0.5c-2.6-10.9-11.3-19.1-24.6-20.8v-13c0-1.7-1.4-3.1-3.1-3.1h-8.2c-1.7 0-3.1 1.4-3.1 3.1v12.7c-15.2 2.6-25.1 13.5-25.1 28.2 0 17.7 11.3 25.1 33 30.2 14.7 3.9 18.5 8.2 18.5 15.2s-7.4 12.6-17.3 12.6c-13.5 0-19.1-5.2-21.7-14.3-0.5-1.4-1.8-2.3-3.1-2.3H98c-1.7 0-3.1 1.4-3.1 3.1v0.7c3.1 13.5 12.6 22.1 28.2 24.6v13c0 1.7 1.4 3.1 3.1 3.1h8.2c1.7 0 3.1-1.4 3.1-3.1v-13.2c15.2-2.8 25.6-14.1 25.6-29.4z"/>
          </svg>
        );

      case 'usdt':
        return (
          <svg width={size} height={size} viewBox="0 0 256 256" className={className}>
            <circle cx="128" cy="128" r="128" fill="#26A17B"/>
            <path fill="#FFFFFF" d="M145.1 95.4h-34.2v23.3h34.2v57.8h-34.2v23.3h34.2v-23.3h34.3v23.3h23.3v-104.4h-57.6zm34.3 57.8h-34.3v-34.5h34.3v34.5z"/>
            <path fill="#FFFFFF" d="M128 145.1c-28.2 0-51.1-4.8-51.1-10.7s22.9-10.7 51.1-10.7 51.1 4.8 51.1 10.7-22.9 10.7-51.1 10.7zm0-17.1c-25.9 0-46.9 3.8-46.9 8.4s21 8.4 46.9 8.4 46.9-3.8 46.9-8.4-21-8.4-46.9-8.4z"/>
          </svg>
        );

      case 'dai':
        return (
          <svg width={size} height={size} viewBox="0 0 256 256" className={className}>
            <circle cx="128" cy="128" r="128" fill="#F4B731"/>
            <path fill="#FFFFFF" d="M128 48c-44.2 0-80 35.8-80 80s35.8 80 80 80 80-35.8 80-80-35.8-80-80-80zm54.7 85.3h-13.9c-0.9 10.7-4.1 20.5-9.1 28.6l23.3 23.3c8.7-14.8 13.6-31.3 14.7-48.9h-15zm-27.8-5.3h27.8v-5.3h-27.8c0.9-10.7 4.1-20.5 9.1-28.6l-23.3-23.3c-8.7 14.8-13.6 31.3-14.7 48.9v8.3zm-109.8 0h27.8v-5.3H45.1c1.1-17.6 6-34.1 14.7-48.9l23.3 23.3c-5 8.1-8.2 17.9-9.1 28.6zM100 128c0-15.5 12.5-28 28-28s28 12.5 28 28-12.5 28-28 28-28-12.5-28-28z"/>
          </svg>
        );

      case 'matic':
        return (
          <svg width={size} height={size} viewBox="0 0 256 256" className={className}>
            <circle cx="128" cy="128" r="128" fill="#8247E5"/>
            <path fill="#FFFFFF" d="M190.5 114.3c-5.9-3.4-15.5-3.4-21.4 0l-23.1 13.4-15.5 8.9-23.1 13.4c-5.9 3.4-15.5 3.4-21.4 0l-18.4-10.6c-5.9-3.4-10.7-11.6-10.7-18.9v-20.1c0-7.3 4.8-15.5 10.7-18.9l18.4-10.6c5.9-3.4 15.5-3.4 21.4 0l18.4 10.6c5.9 3.4 10.7 11.6 10.7 18.9v13.4l15.5-9v-13.4c0-7.3-4.8-15.5-10.7-18.9l-33.8-19.5c-5.9-3.4-15.5-3.4-21.4 0L32.3 72.8c-5.9 3.4-10.7 11.6-10.7 18.9v39c0 7.3 4.8 15.5 10.7 18.9l33.8 19.5c5.9 3.4 15.5 3.4 21.4 0l23.1-13.4 15.5-8.9 23.1-13.4c5.9-3.4 15.5-3.4 21.4 0l18.4 10.6c5.9 3.4 10.7 11.6 10.7 18.9v20.1c0 7.3-4.8 15.5-10.7 18.9l-18.4 10.6c-5.9 3.4-15.5 3.4-21.4 0l-18.4-10.6c-5.9-3.4-10.7-11.6-10.7-18.9v-13.4l-15.5 9v13.4c0 7.3 4.8 15.5 10.7 18.9l33.8 19.5c5.9 3.4 15.5 3.4 21.4 0l33.8-19.5c5.9-3.4 10.7-11.6 10.7-18.9v-39c0-7.3-4.8-15.5-10.7-18.9l-33.8-19.5z"/>
          </svg>
        );

      case 'stripe':
      case 'card':
        return <CreditCard size={size} className={className} />;

      case 'crypto':
        return <Coins size={size} className={className} />;

      default:
        return <Wallet size={size} className={className} />;
    }
  };

  return getIcon();
};

/**
 * Payment Method Badge - Shows payment method with icon and name
 */
interface PaymentMethodBadgeProps {
  method: 'eth' | 'usdc' | 'usdt' | 'dai' | 'matic' | 'stripe' | 'card';
  name: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  balance?: string;
}

export const PaymentMethodBadge: React.FC<PaymentMethodBadgeProps> = ({
  method,
  name,
  selected = false,
  onClick,
  disabled = false,
  balance
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-3 p-4 rounded-xl border-2 transition-all
        ${selected
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
          : 'border-white/10 bg-white/5 hover:border-white/20'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex-shrink-0">
        <PaymentMethodIcon method={method} size={32} />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-semibold text-white">{name}</p>
        {balance && (
          <p className="text-xs text-white/60">Balance: {balance}</p>
        )}
      </div>
      {selected && (
        <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
            <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </button>
  );
};

/**
 * Payment Method Grid - Shows multiple payment methods in a grid
 */
interface PaymentMethodGridProps {
  methods: Array<{
    id: string;
    type: 'eth' | 'usdc' | 'usdt' | 'dai' | 'matic' | 'stripe' | 'card';
    name: string;
    balance?: string;
    disabled?: boolean;
  }>;
  selectedMethod?: string;
  onSelectMethod: (methodId: string) => void;
}

export const PaymentMethodGrid: React.FC<PaymentMethodGridProps> = ({
  methods,
  selectedMethod,
  onSelectMethod
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {methods.map((method) => (
        <PaymentMethodBadge
          key={method.id}
          method={method.type}
          name={method.name}
          balance={method.balance}
          selected={selectedMethod === method.id}
          disabled={method.disabled}
          onClick={() => onSelectMethod(method.id)}
        />
      ))}
    </div>
  );
};
