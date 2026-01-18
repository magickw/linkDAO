import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '../../../../design-system';

interface PayoutSetupStepProps {
  onComplete: (data: any) => void;
  data?: any;
}

export function PayoutSetupStep({ onComplete, data }: PayoutSetupStepProps) {
  const { address } = useAccount();
  const [formData, setFormData] = useState({
    defaultCrypto: data?.defaultCrypto || 'USDC',
    cryptoAddresses: data?.cryptoAddresses || {
      USDC: address || '',
      ETH: address || '',
    },
    fiatEnabled: data?.fiatEnabled || false,
    offRampProvider: data?.offRampProvider || '',
    bankAccount: data?.bankAccount || {
      accountNumber: '',
      routingNumber: '',
      swiftCode: '',
      bankName: '',
      accountHolderName: '',
      bankAddress: '',
      accountType: 'checking',
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const cryptoOptions = [
    { value: 'USDC', label: 'USDC (USD Coin)', icon: '💵' },
    { value: 'ETH', label: 'Ethereum (ETH)', icon: '⟠' },
  ];

  const offRampProviders = [
    { value: 'circle', label: 'Circle (USDC → Bank)', description: 'Direct USDC to bank transfer' },
    { value: 'coinbase', label: 'Coinbase Commerce', description: 'Crypto to fiat conversion' },
    { value: 'stripe', label: 'Stripe Crypto', description: 'Accept crypto, receive fiat' },
  ];

  const validateAddress = (address: string, crypto: string) => {
    if (!address) return false;

    // Basic validation - in production, use proper address validation
    switch (crypto) {
      case 'ETH':
      case 'USDC':
        return address.startsWith('0x') && address.length === 42;
      default:
        return address.length > 0;
    }
  };

  const handleCryptoAddressChange = (crypto: string, address: string) => {
    setFormData(prev => ({
      ...prev,
      cryptoAddresses: {
        ...prev.cryptoAddresses,
        [crypto]: address,
      },
    }));

    // Clear error when user starts typing
    if (errors[`${crypto}_address`]) {
      setErrors(prev => ({ ...prev, [`${crypto}_address`]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate default crypto address
    const defaultAddress = formData.cryptoAddresses[formData.defaultCrypto];
    if (!defaultAddress) {
      newErrors[`${formData.defaultCrypto}_address`] = `${formData.defaultCrypto} address is required`;
    } else if (!validateAddress(defaultAddress, formData.defaultCrypto)) {
      newErrors[`${formData.defaultCrypto}_address`] = `Invalid ${formData.defaultCrypto} address format`;
    }

    // Validate other provided addresses
    Object.entries(formData.cryptoAddresses).forEach(([crypto, address]) => {
      if (address && !validateAddress(address as string, crypto)) {
        newErrors[`${crypto}_address`] = `Invalid ${crypto} address format`;
      }
    });

    // Validate bank account if fiat is enabled
    if (formData.fiatEnabled) {
      if (!formData.offRampProvider) {
        newErrors.offRampProvider = 'Please select an off-ramp provider';
      }

      // Validate bank account for all fiat providers
      if (!formData.bankAccount.accountNumber) {
        newErrors.accountNumber = 'Account number is required';
      }
      if (!formData.bankAccount.routingNumber) {
        newErrors.routingNumber = 'Routing number is required';
      }
      if (!formData.bankAccount.bankName) {
        newErrors.bankName = 'Bank name is required';
      }
      if (!formData.bankAccount.accountHolderName) {
        newErrors.accountHolderName = 'Account holder name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onComplete(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Introduction */}
      <div className="bg-green-900 bg-opacity-50 rounded-lg p-4">
        <h4 className="text-green-300 font-medium text-sm mb-2">💰 Payout Configuration</h4>
        <p className="text-green-200 text-sm">
          Set up how you want to receive payments from your sales. You can always update these settings later.
        </p>
      </div>

      {/* Default Crypto Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Primary Payment Currency *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cryptoOptions.map((option) => (
            <label
              key={option.value}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${formData.defaultCrypto === option.value ? 'border-purple-500 bg-purple-600 bg-opacity-20' : 'border-gray-600 hover:border-gray-500'}`}
            >
              <input
                type="radio"
                name="defaultCrypto"
                value={option.value}
                checked={formData.defaultCrypto === option.value}
                onChange={(e) => setFormData(prev => ({ ...prev, defaultCrypto: e.target.value }))}
                className="sr-only"
              />
              <span className="text-2xl mr-3">{option.icon}</span>
              <div>
                <div className="text-white font-medium">{option.label}</div>
                <div className="text-gray-400 text-sm">
                  {option.value === 'USDC' && 'Stable, pegged to USD'}
                  {option.value === 'ETH' && 'Most widely accepted'}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Crypto Addresses */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Wallet Addresses</h3>
        <div className="space-y-4">
          {cryptoOptions.map((option) => (
            <div key={option.value}>
              <label htmlFor={`${option.value}_address`} className="block text-sm font-medium text-gray-300 mb-2">
                {option.label} Address
                {formData.defaultCrypto === option.value && <span className="text-red-400 ml-1">*</span>}
              </label>
              <div className="flex">
                <div className="flex items-center px-3 bg-gray-700 border border-r-0 border-gray-600 rounded-l-lg">
                  <span className="text-lg">{option.icon}</span>
                </div>
                <input
                  type="text"
                  id={`${option.value}_address`}
                  value={formData.cryptoAddresses[option.value] || ''}
                  onChange={(e) => handleCryptoAddressChange(option.value, e.target.value)}
                  className={`flex-1 px-3 py-2 bg-gray-800 border rounded-r-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors[`${option.value}_address`] ? 'border-red-500' : 'border-gray-600'}`}
                  placeholder={`Enter your ${option.value} wallet address`}
                />
              </div>
              {errors[`${option.value}_address`] && (
                <p className="mt-1 text-sm text-red-400">{errors[`${option.value}_address`]}</p>
              )}
              {option.value === formData.defaultCrypto && (
                <p className="mt-1 text-xs text-gray-400">
                  This is your primary payment address - make sure it's correct!
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fiat Off-ramp Option */}
      <div className="border-t border-gray-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Fiat Withdrawals</h3>
            <p className="text-gray-400 text-sm">Convert crypto to traditional currency</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.fiatEnabled}
              onChange={(e) => setFormData(prev => ({ ...prev, fiatEnabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {formData.fiatEnabled && (
          <div className="space-y-4">
            {/* Off-ramp Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Off-ramp Provider *
              </label>
              <div className="space-y-3">
                {offRampProviders.map((provider) => (
                  <label
                    key={provider.value}
                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${formData.offRampProvider === provider.value ? 'border-purple-500 bg-purple-600 bg-opacity-20' : 'border-gray-600 hover:border-gray-500'}`}
                  >
                    <input
                      type="radio"
                      name="offRampProvider"
                      value={provider.value}
                      checked={formData.offRampProvider === provider.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, offRampProvider: e.target.value }))}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="text-white font-medium">{provider.label}</div>
                      <div className="text-gray-400 text-sm">{provider.description}</div>
                    </div>
                  </label>
                ))}
              </div>
              {errors.offRampProvider && (
                <p className="mt-1 text-sm text-red-400">{errors.offRampProvider}</p>
              )}
            </div>

            {/* Bank Account Details (Required for all providers) */}
            {formData.offRampProvider && (
              <div className="bg-gray-800 rounded-lg p-4 space-y-4">
                <h4 className="text-white font-medium">Bank Account Details</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-300 mb-2">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      id="accountNumber"
                      value={formData.bankAccount.accountNumber}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        bankAccount: { ...prev.bankAccount, accountNumber: e.target.value }
                      }))}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.accountNumber ? 'border-red-500' : 'border-gray-600'}`}
                      placeholder="1234567890"
                    />
                    {errors.accountNumber && (
                      <p className="mt-1 text-sm text-red-400">{errors.accountNumber}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="routingNumber" className="block text-sm font-medium text-gray-300 mb-2">
                      Routing Number *
                    </label>
                    <input
                      type="text"
                      id="routingNumber"
                      value={formData.bankAccount.routingNumber}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        bankAccount: { ...prev.bankAccount, routingNumber: e.target.value }
                      }))}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.routingNumber ? 'border-red-500' : 'border-gray-600'}`}
                      placeholder="123456789"
                    />
                    {errors.routingNumber && (
                      <p className="mt-1 text-sm text-red-400">{errors.routingNumber}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="swiftCode" className="block text-sm font-medium text-gray-300 mb-2">
                      SWIFT Code
                    </label>
                    <input
                      type="text"
                      id="swiftCode"
                      value={formData.bankAccount.swiftCode}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        bankAccount: { ...prev.bankAccount, swiftCode: e.target.value }
                      }))}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.swiftCode ? 'border-red-500' : 'border-gray-600'}`}
                      placeholder="SWIFT123"
                    />
                    {errors.swiftCode && (
                      <p className="mt-1 text-sm text-red-400">{errors.swiftCode}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="bankName" className="block text-sm font-medium text-gray-300 mb-2">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      id="bankName"
                      value={formData.bankAccount.bankName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        bankAccount: { ...prev.bankAccount, bankName: e.target.value }
                      }))}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.bankName ? 'border-red-500' : 'border-gray-600'}`}
                      placeholder="Bank Name"
                    />
                    {errors.bankName && (
                      <p className="mt-1 text-sm text-red-400">{errors.bankName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-300 mb-2">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      id="accountHolderName"
                      value={formData.bankAccount.accountHolderName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        bankAccount: { ...prev.bankAccount, accountHolderName: e.target.value }
                      }))}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.accountHolderName ? 'border-red-500' : 'border-gray-600'}`}
                      placeholder="Account Holder Name"
                    />
                    {errors.accountHolderName && (
                      <p className="mt-1 text-sm text-red-400">{errors.accountHolderName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="bankAddress" className="block text-sm font-medium text-gray-300 mb-2">
                      Bank Address
                    </label>
                    <input
                      type="text"
                      id="bankAddress"
                      value={formData.bankAccount.bankAddress}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        bankAccount: { ...prev.bankAccount, bankAddress: e.target.value }
                      }))}
                      className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${errors.bankAddress ? 'border-red-500' : 'border-gray-600'}`}
                      placeholder="Bank Address"
                    />
                    {errors.bankAddress && (
                      <p className="mt-1 text-sm text-red-400">{errors.bankAddress}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="accountType" className="block text-sm font-medium text-gray-300 mb-2">
                    Account Type
                  </label>
                  <select
                    id="accountType"
                    value={formData.bankAccount.accountType}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      bankAccount: { ...prev.bankAccount, accountType: e.target.value as 'checking' | 'savings' }
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-900 bg-opacity-50 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h4 className="text-yellow-300 font-medium text-sm mb-1">Security Reminder</h4>
            <p className="text-yellow-200 text-sm">
              Double-check all wallet addresses before saving. Incorrect addresses may result in permanent loss of funds.
              We recommend sending a small test transaction first.
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" className="min-w-32">
          Save Payout Settings
        </Button>
      </div>
    </form>
  );
}