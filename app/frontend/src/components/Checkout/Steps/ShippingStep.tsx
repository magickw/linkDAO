/**
 * ShippingStep - Reusable shipping information step component
 * Can be used in both desktop and mobile checkout flows
 */

import React, { useState } from 'react';
import { BookOpen, CreditCard, Truck } from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { ShippingAddress } from '@/hooks/useCheckoutFlow';
import { countries } from '@/utils/countries';

export interface ShippingStepProps {
  shippingAddress: ShippingAddress;
  errors: Record<string, string>;
  onAddressChange: (address: Partial<ShippingAddress>) => void;
  userProfile?: any; // User profile for saved addresses
  variant?: 'desktop' | 'mobile';
  title?: string;
  saveToProfile?: boolean;
  onSaveAddressChange?: (shouldSave: boolean) => void;
}

export const ShippingStep: React.FC<ShippingStepProps> = ({
  shippingAddress,
  errors,
  onAddressChange,
  userProfile,
  variant = 'desktop',
  title = 'Shipping Information',
  saveToProfile = false,
  onSaveAddressChange
}) => {
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);

  const isMobile = variant === 'mobile';
  const inputClassName = isMobile
    ? `w-full p-4 text-lg rounded-xl bg-white/10 border-2 text-white placeholder-white/50 
       transition-all duration-200 focus:outline-none focus:ring-0 focus:border-blue-400 focus:bg-white/15 
       touch-manipulation`
    : `w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 
       focus:outline-none focus:ring-2 focus:ring-blue-500`;

  const labelClassName = isMobile
    ? 'block text-sm font-medium text-white mb-2'
    : 'block text-sm font-medium text-white mb-2';

  const loadSavedAddress = (type: 'billing' | 'shipping') => {
    if (!userProfile) return;

    const savedAddress =
      type === 'billing'
        ? {
          firstName: userProfile.billingFirstName || '',
          lastName: userProfile.billingLastName || '',
          email: userProfile.email || '',
          address1: userProfile.billingAddress1 || '',
          address2: userProfile.billingAddress2 || '',
          city: userProfile.billingCity || '',
          state: userProfile.billingState || '',
          zipCode: userProfile.billingZipCode || '',
          country: userProfile.billingCountry || 'US',
          phone: userProfile.billingPhone || '',
        }
        : {
          firstName: userProfile.shippingFirstName || '',
          lastName: userProfile.shippingLastName || '',
          email: userProfile.email || '',
          address1: userProfile.shippingAddress1 || '',
          address2: userProfile.shippingAddress2 || '',
          city: userProfile.shippingCity || '',
          state: userProfile.shippingState || '',
          zipCode: userProfile.shippingZipCode || '',
          country: userProfile.shippingCountry || 'US',
          phone: userProfile.shippingPhone || '',
        };

    onAddressChange(savedAddress);
    setShowSavedAddresses(false);
  };

  return (
    <div className="space-y-6">
      {!isMobile && <h2 className="text-xl font-bold text-white mb-4">{title}</h2>}

      {/* Saved Addresses Section */}
      {userProfile && (userProfile.billingAddress1 || userProfile.shippingAddress1) && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="text-blue-400" size={16} />
              <h4 className="font-medium text-blue-400">Use Saved Address</h4>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSavedAddresses(!showSavedAddresses)}
              className="border-blue-400/30 text-blue-300 hover:bg-blue-500/20"
            >
              {showSavedAddresses ? 'Hide' : 'Show'} Saved
            </Button>
          </div>

          {showSavedAddresses && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {userProfile.billingAddress1 && (
                <div
                  className="p-3 bg-white/5 rounded border border-white/10 hover:border-blue-400/30 cursor-pointer transition-colors"
                  onClick={() => loadSavedAddress('billing')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard size={14} className="text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">Billing Address</span>
                  </div>
                  <div className="text-xs text-white/70">
                    <p>
                      {userProfile.billingFirstName} {userProfile.billingLastName}
                    </p>
                    <p>{userProfile.billingAddress1}</p>
                    <p>
                      {userProfile.billingCity}, {userProfile.billingState}{' '}
                      {userProfile.billingZipCode}
                    </p>
                  </div>
                </div>
              )}

              {userProfile.shippingAddress1 && (
                <div
                  className="p-3 bg-white/5 rounded border border-white/10 hover:border-blue-400/30 cursor-pointer transition-colors"
                  onClick={() => loadSavedAddress('shipping')}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Truck size={14} className="text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">Shipping Address</span>
                  </div>
                  <div className="text-xs text-white/70">
                    <p>
                      {userProfile.shippingFirstName} {userProfile.shippingLastName}
                    </p>
                    <p>{userProfile.shippingAddress1}</p>
                    <p>
                      {userProfile.shippingCity}, {userProfile.shippingState}{' '}
                      {userProfile.shippingZipCode}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={isMobile ? 'mb-4' : ''}>
          <label className={labelClassName}>
            First Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={shippingAddress.firstName}
            onChange={(e) => onAddressChange({ firstName: e.target.value })}
            className={`${inputClassName} ${errors.firstName ? 'border-red-400' : ''}`}
            placeholder="Enter first name"
            style={isMobile ? { fontSize: '16px' } : {}}
          />
          {errors.firstName && <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>}
        </div>

        <div className={isMobile ? 'mb-4' : ''}>
          <label className={labelClassName}>
            Last Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={shippingAddress.lastName}
            onChange={(e) => onAddressChange({ lastName: e.target.value })}
            className={`${inputClassName} ${errors.lastName ? 'border-red-400' : ''}`}
            placeholder="Enter last name"
            style={isMobile ? { fontSize: '16px' } : {}}
          />
          {errors.lastName && <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className={labelClassName}>
          Email Address <span className="text-red-400">*</span>
        </label>
        <input
          type="email"
          value={shippingAddress.email}
          onChange={(e) => onAddressChange({ email: e.target.value })}
          className={`${inputClassName} ${errors.email ? 'border-red-400' : ''}`}
          placeholder="Enter email address"
          style={isMobile ? { fontSize: '16px' } : {}}
        />
        {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
      </div>

      {/* Address Lines */}
      <div>
        <label className={labelClassName}>
          Street Address <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={shippingAddress.address1}
          onChange={(e) => onAddressChange({ address1: e.target.value })}
          className={`${inputClassName} ${errors.address1 ? 'border-red-400' : ''} mb-2`}
          placeholder="Enter street address"
          style={isMobile ? { fontSize: '16px' } : {}}
        />
        <input
          type="text"
          value={shippingAddress.address2 || ''}
          onChange={(e) => onAddressChange({ address2: e.target.value })}
          className={inputClassName}
          placeholder="Apartment, suite, etc. (optional)"
          style={isMobile ? { fontSize: '16px' } : {}}
        />
        {errors.address1 && <p className="text-red-400 text-sm mt-1">{errors.address1}</p>}
      </div>

      {/* City, State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={isMobile ? 'mb-4' : ''}>
          <label className={labelClassName}>
            City <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={shippingAddress.city}
            onChange={(e) => onAddressChange({ city: e.target.value })}
            className={`${inputClassName} ${errors.city ? 'border-red-400' : ''}`}
            placeholder="Enter city"
            style={isMobile ? { fontSize: '16px' } : {}}
          />
          {errors.city && <p className="text-red-400 text-sm mt-1">{errors.city}</p>}
        </div>

        <div className={isMobile ? 'mb-4' : ''}>
          <label className={labelClassName}>
            State/Province <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={shippingAddress.state}
            onChange={(e) => onAddressChange({ state: e.target.value })}
            className={`${inputClassName} ${errors.state ? 'border-red-400' : ''}`}
            placeholder="Enter state"
            style={isMobile ? { fontSize: '16px' } : {}}
          />
          {errors.state && <p className="text-red-400 text-sm mt-1">{errors.state}</p>}
        </div>
      </div>

      {/* ZIP, Country */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={isMobile ? 'mb-4' : ''}>
          <label className={labelClassName}>
            ZIP/Postal Code <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={shippingAddress.zipCode}
            onChange={(e) => onAddressChange({ zipCode: e.target.value })}
            className={`${inputClassName} ${errors.zipCode ? 'border-red-400' : ''}`}
            placeholder="Enter ZIP code"
            style={isMobile ? { fontSize: '16px' } : {}}
          />
          {errors.zipCode && <p className="text-red-400 text-sm mt-1">{errors.zipCode}</p>}
        </div>

        <div className={isMobile ? 'mb-4' : ''}>
          <label className={labelClassName}>
            Country <span className="text-red-400">*</span>
          </label>
          <select
            value={shippingAddress.country}
            onChange={(e) => onAddressChange({ country: e.target.value })}
            className={`${inputClassName} ${errors.country ? 'border-red-400' : ''}`}
            style={isMobile ? { fontSize: '16px' } : {}}
          >
            <option value="">Select Country</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.name}
              </option>
            ))}
          </select>
          {errors.country && <p className="text-red-400 text-sm mt-1">{errors.country}</p>}
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className={labelClassName}>Phone</label>
        <input
          type="tel"
          value={shippingAddress.phone || ''}
          onChange={(e) => onAddressChange({ phone: e.target.value })}
          className={inputClassName}
          placeholder="Enter phone number"
          style={isMobile ? { fontSize: '16px' } : {}}
        />
      </div>

      {/* Save Address Option */}
      {onSaveAddressChange && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToProfile}
              onChange={(e) => onSaveAddressChange(e.target.checked)}
              className="form-checkbox h-4 w-4 text-green-600 bg-white/10 border-white/20 rounded focus:ring-green-500"
            />
            <span className="text-sm text-white">
              💾 Save this address to my profile for future orders
            </span>
          </label>
        </div>
      )}
    </div>
  );
};
