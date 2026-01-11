import React, { useState } from 'react';

interface TrackingFormProps {
  orderId: string;
  existingTracking?: {
    number: string;
    carrier: string;
    estimatedDelivery?: string;
  };
  onSubmit: (orderId: string, data: {
    trackingNumber: string;
    carrier: string;
    estimatedDelivery?: string;
    notifyBuyer?: boolean;
  }) => Promise<void>;
  onCancel?: () => void;
  isInline?: boolean;
  className?: string;
}

const carriers = [
  { id: 'fedex', name: 'FedEx', trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr=' },
  { id: 'ups', name: 'UPS', trackingUrl: 'https://www.ups.com/track?tracknum=' },
  { id: 'usps', name: 'USPS', trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' },
  { id: 'dhl', name: 'DHL', trackingUrl: 'https://www.dhl.com/en/express/tracking.html?AWB=' },
  { id: 'amazon', name: 'Amazon Logistics', trackingUrl: '' },
  { id: 'ontrac', name: 'OnTrac', trackingUrl: 'https://www.ontrac.com/tracking.asp?trackingNumber=' },
  { id: 'lasership', name: 'LaserShip', trackingUrl: '' },
  { id: 'other', name: 'Other', trackingUrl: '' },
];

export function TrackingForm({
  orderId,
  existingTracking,
  onSubmit,
  onCancel,
  isInline = false,
  className = '',
}: TrackingFormProps) {
  const [form, setForm] = useState({
    trackingNumber: existingTracking?.number || '',
    carrier: existingTracking?.carrier || 'fedex',
    estimatedDelivery: existingTracking?.estimatedDelivery || '',
    notifyBuyer: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const validateTrackingNumber = (number: string, carrierId: string): boolean => {
    if (!number.trim()) return false;

    // Basic validation patterns for major carriers
    const patterns: Record<string, RegExp> = {
      fedex: /^\d{12,22}$/,
      ups: /^1Z[A-Z0-9]{16}$/i,
      usps: /^\d{20,22}$|^[A-Z]{2}\d{9}US$/i,
      dhl: /^\d{10}$|^\d{11}$/,
    };

    const pattern = patterns[carrierId];
    if (!pattern) return true; // No validation for unknown carriers

    return pattern.test(number.replace(/\s/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.trackingNumber.trim()) {
      setError('Tracking number is required');
      return;
    }

    if (!validateTrackingNumber(form.trackingNumber, form.carrier)) {
      setError(`Invalid tracking number format for ${carriers.find(c => c.id === form.carrier)?.name || form.carrier}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(orderId, {
        trackingNumber: form.trackingNumber.trim(),
        carrier: form.carrier,
        estimatedDelivery: form.estimatedDelivery || undefined,
        notifyBuyer: form.notifyBuyer,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add tracking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTrackingUrl = (carrierId: string, trackingNumber: string): string => {
    const carrier = carriers.find(c => c.id === carrierId);
    if (!carrier?.trackingUrl) return '';
    return carrier.trackingUrl + trackingNumber;
  };

  const content = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Carrier Selection */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Shipping Carrier <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {carriers.slice(0, 4).map((carrier) => (
            <button
              key={carrier.id}
              type="button"
              onClick={() => setForm({ ...form, carrier: carrier.id })}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${form.carrier === carrier.id
                  ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }
              `}
            >
              {carrier.name}
            </button>
          ))}
        </div>
        <select
          value={form.carrier}
          onChange={(e) => setForm({ ...form, carrier: e.target.value })}
          className="w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {carriers.map((carrier) => (
            <option key={carrier.id} value={carrier.id}>
              {carrier.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tracking Number */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Tracking Number <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.trackingNumber}
          onChange={(e) => setForm({ ...form, trackingNumber: e.target.value.toUpperCase() })}
          placeholder="Enter tracking number"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
        />
        {form.trackingNumber && getTrackingUrl(form.carrier, form.trackingNumber) && (
          <a
            href={getTrackingUrl(form.carrier, form.trackingNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 mt-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Test tracking link
          </a>
        )}
      </div>

      {/* Estimated Delivery */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Estimated Delivery <span className="text-gray-600">(optional)</span>
        </label>
        <input
          type="date"
          value={form.estimatedDelivery}
          onChange={(e) => setForm({ ...form, estimatedDelivery: e.target.value })}
          min={new Date().toISOString().split('T')[0]}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Notify Buyer Checkbox */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            checked={form.notifyBuyer}
            onChange={(e) => setForm({ ...form, notifyBuyer: e.target.checked })}
            className="sr-only"
          />
          <div
            className={`
              w-5 h-5 rounded border-2 transition-colors flex items-center justify-center
              ${form.notifyBuyer
                ? 'bg-purple-600 border-purple-600'
                : 'bg-transparent border-gray-600'
              }
            `}
          >
            {form.notifyBuyer && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>
        <span className="text-sm text-gray-300">
          Send tracking notification to buyer
        </span>
      </label>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !form.trackingNumber.trim()}
          className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors"
        >
          {isSubmitting ? 'Adding...' : existingTracking ? 'Update Tracking' : 'Add Tracking'}
        </button>
      </div>
    </form>
  );

  if (isInline) {
    return <div className={className}>{content}</div>;
  }

  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-xl p-5 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <h3 className="text-white font-semibold">Shipping Information</h3>
          <p className="text-gray-400 text-sm">Add tracking details for this order</p>
        </div>
      </div>
      {content}
    </div>
  );
}

export default TrackingForm;
