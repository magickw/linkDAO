/**
 * PaymentMethodsTab - Secure payment method management
 */

import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Star, Shield, Lock } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { paymentMethodService, PaymentMethod } from '@/services/paymentMethodService';
import { StripeProvider } from './Payment/StripeProvider';
import { StripeSetupForm } from './Payment/StripeSetupForm';

export const PaymentMethodsTab: React.FC = () => {
  const { address: walletAddress } = useAccount();
  const { addToast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [initializingSetup, setInitializingSetup] = useState(false);

  const fetchPaymentMethods = async () => {
    if (walletAddress) {
      try {
        setLoading(true);
        const methods = await paymentMethodService.getPaymentMethods(walletAddress!);
        setPaymentMethods(methods);
      } catch (err) {
        setError('Failed to load payment methods');
        console.error('Error fetching payment methods:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [walletAddress]);

  const handleAddClick = async () => {
    if (!walletAddress) return;
    
    try {
      setInitializingSetup(true);
      const secret = await paymentMethodService.createSetupIntent();
      setClientSecret(secret);
      setShowAddForm(true);
    } catch (error) {
      console.error('Failed to initialize payment setup:', error);
      addToast('Failed to initialize secure payment setup', 'error');
    } finally {
      setInitializingSetup(false);
    }
  };

  const handleSetupSuccess = async (setupIntentId: string, paymentMethodId: string) => {
    if (!walletAddress) return;

    try {
      await paymentMethodService.addPaymentMethod(walletAddress, paymentMethodId, 'Stripe Card');
      addToast('Payment method added successfully', 'success');
      setShowAddForm(false);
      setClientSecret(null);
      fetchPaymentMethods();
    } catch (error) {
      console.error('Failed to save payment method:', error);
      addToast('Failed to save payment method', 'error');
    }
  };

  const handleSetupError = (error: Error) => {
    addToast(error.message || 'Failed to setup payment method', 'error');
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setClientSecret(null);
  };

  const setDefault = async (paymentMethodId: string) => {
    if (!walletAddress) return;
    
    try {
      await paymentMethodService.setDefaultPaymentMethod(walletAddress!, paymentMethodId);
      // Refresh the list
      const methods = await paymentMethodService.getPaymentMethods(walletAddress!);
      setPaymentMethods(methods);
    } catch (err) {
      setError('Failed to set default payment method');
      console.error('Error setting default payment method:', err);
    }
  };

  const handleDelete = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;
    
    try {
      await paymentMethodService.deletePaymentMethod(paymentMethodId);
      addToast('Payment method deleted', 'success');
      fetchPaymentMethods();
    } catch (error) {
      addToast('Failed to delete payment method', 'error');
    }
  };

  if (loading && !paymentMethods.length) {
    return (
      <GlassPanel variant="primary" className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white/50"></div>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <GlassPanel variant="secondary" className="p-4">
        <div className="flex items-center gap-3">
          <Shield className="text-green-400" size={20} />
          <div>
            <h4 className="font-medium text-green-400">Secure Payment Storage</h4>
            <p className="text-gray-200 text-sm dark:text-gray-300">
              All payment information is encrypted and tokenized by Stripe. We never store your raw card details.
            </p>
          </div>
        </div>
      </GlassPanel>

      {/* Payment Methods List */}
      <div className="space-y-4">
        {paymentMethods.map((method) => (
          <GlassPanel key={method.id} variant="secondary" className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded flex items-center justify-center">
                  <CreditCard className="text-white" size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-100 dark:text-white">{method.nickname}</h4>
                    {method.isDefault && (
                      <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                        <Star size={12} />
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300 dark:text-gray-400">
                    <span className="text-gray-400 dark:text-gray-300">{method.brand}</span>
                    <span className="font-mono">•••• {method.lastFour}</span>
                    {method.expiryMonth && method.expiryYear && (
                      <span className="text-gray-400 dark:text-gray-300">• {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {!method.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDefault(method.id)}
                    className="border-yellow-400/30 text-yellow-300 hover:bg-yellow-500/20"
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(method.id)}
                  className="border-red-400/30 text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </GlassPanel>
        ))}

        {paymentMethods.length === 0 && !showAddForm && (
          <GlassPanel variant="primary" className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Payment Methods</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Add a payment method to make purchases easier</p>
          </GlassPanel>
        )}
      </div>

      {/* Add Payment Method Button */}
      {!showAddForm && (
        <Button
          variant="primary"
          onClick={handleAddClick}
          disabled={initializingSetup}
          className="w-full flex items-center justify-center gap-2"
        >
          {initializingSetup ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          ) : (
            <Plus size={16} />
          )}
          {initializingSetup ? 'Initializing Secure Setup...' : 'Add Payment Method'}
        </Button>
      )}

      {/* Add Payment Method Form */}
      {showAddForm && clientSecret && (
        <GlassPanel variant="primary" className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="text-blue-400" size={16} />
            <h3 className="font-medium text-gray-900 dark:text-white">Add New Card</h3>
          </div>
          
          <StripeProvider options={{ clientSecret }}>
            <StripeSetupForm
              clientSecret={clientSecret}
              onSuccess={handleSetupSuccess}
              onError={handleSetupError}
              onCancel={handleCancelAdd}
            />
          </StripeProvider>
        </GlassPanel>
      )}
    </div>
  );
};
