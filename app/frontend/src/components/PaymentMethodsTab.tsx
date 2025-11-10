/**
 * PaymentMethodsTab - Secure payment method management
 */

import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, Star, Shield, Lock } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { paymentMethodService, PaymentMethod, CreatePaymentMethodInput } from '@/services/paymentMethodService';

export const PaymentMethodsTab: React.FC = () => {
  const { address: walletAddress } = useAccount();
  const { addToast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<CreatePaymentMethodInput>({
    type: 'card',
    nickname: '',
    isDefault: false,
  });

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

  const addPaymentMethod = async (formData: any) => {
    if (!walletAddress) return;
    
    try {
      setIsAdding(true);
      await paymentMethodService.addPaymentMethod(walletAddress!, formData);
      // Refresh the list
      const methods = await paymentMethodService.getPaymentMethods(walletAddress!);
      setPaymentMethods(methods);
      setIsAdding(false);
      return true;
    } catch (err) {
      setError('Failed to add payment method');
      console.error('Error adding payment method:', err);
      setIsAdding(false);
      return false;
    }
  };

  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await paymentMethodService.addPaymentMethod(walletAddress!, formData);
      addToast('Payment method added successfully', 'success');
      setShowAddForm(false);
      setFormData({ type: 'card', nickname: '', isDefault: false });
      fetchPaymentMethods();
    } catch (error) {
      addToast('Failed to add payment method', 'error');
    }
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

  if (loading) {
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
              All payment information is encrypted and tokenized. We never store raw payment data.
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
                    size="small"
                    onClick={() => setDefault(method.id)}
                    className="border-yellow-400/30 text-yellow-300 hover:bg-yellow-500/20"
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => handleDelete(method.id)}
                  className="border-red-400/30 text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </GlassPanel>
        ))}

        {paymentMethods.length === 0 && (
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
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Add Payment Method
        </Button>
      )}

      {/* Add Payment Method Form */}
      {showAddForm && (
        <GlassPanel variant="primary" className="p-6">
          <form onSubmit={handleAddPaymentMethod} className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="text-blue-400" size={16} />
              <h3 className="font-medium text-gray-900 dark:text-white">Add New Payment Method</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Payment Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full p-3 rounded-lg bg-white/20 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="card">Credit/Debit Card</option>
                <option value="bank">Bank Account</option>
                <option value="crypto">Crypto Wallet</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Nickname</label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                className="w-full p-3 rounded-lg bg-white/20 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., My Visa Card"
                required
              />
            </div>

            {formData.type === 'card' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Card Number</label>
                  <input
                    type="text"
                    onChange={(e) => setFormData(prev => ({ ...prev, cardNumber: e.target.value }))}
                    className="w-full p-3 rounded-lg bg-white/20 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Expiry Month</label>
                    <select
                      onChange={(e) => setFormData(prev => ({ ...prev, expiryMonth: parseInt(e.target.value) }))}
                      className="w-full p-3 rounded-lg bg-white/20 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Month</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{(i + 1).toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Expiry Year</label>
                    <select
                      onChange={(e) => setFormData(prev => ({ ...prev, expiryYear: parseInt(e.target.value) }))}
                      className="w-full p-3 rounded-lg bg-white/20 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Year</option>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() + i;
                        return <option key={year} value={year}>{year}</option>;
                      })}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">CVV</label>
                  <input
                    type="text"
                    onChange={(e) => setFormData(prev => ({ ...prev, cvv: e.target.value }))}
                    className="w-full p-3 rounded-lg bg-white/20 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123"
                    maxLength={4}
                    required
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700 dark:text-gray-200">
                Set as default payment method
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
              >
                Add Payment Method
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          </form>
        </GlassPanel>
      )}
    </div>
  );
};