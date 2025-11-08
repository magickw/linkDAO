import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';

interface ReturnPolicyManagerProps {
  sellerId: string;
  onSave?: (policy: any) => void;
}

export const ReturnPolicyManager: React.FC<ReturnPolicyManagerProps> = ({
  sellerId,
  onSave
}) => {
  const [policy, setPolicy] = useState({
    acceptsReturns: true,
    returnWindowDays: 30,
    extendedReturnWindowDays: 0,
    restockingFeePercentage: 0,
    requiresOriginalPackaging: true,
    requiresUnusedCondition: true,
    requiresTagsAttached: false,
    buyerPaysReturnShipping: true,
    freeReturnShippingThreshold: 0,
    offersStoreCredit: false,
    storeCreditBonusPercentage: 0,
    offersExchanges: true,
    policyTitle: 'Return Policy',
    policyText: '',
    autoApproveLowRisk: false,
    autoApproveThresholdAmount: 0,
    requirePhotos: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadPolicy();
  }, [sellerId]);

  const loadPolicy = async () => {
    try {
      const response = await fetch(`/api/return-policies/${sellerId}`);
      if (response.ok) {
        const data = await response.json();
        setPolicy(data);
      }
    } catch (err) {
      console.error('Failed to load policy:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch('/api/return-policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...policy, sellerId })
      });

      if (!response.ok) {
        throw new Error('Failed to save policy');
      }

      const savedPolicy = await response.json();
      setSuccess(true);
      onSave?.(savedPolicy);
    } catch (err: any) {
      setError(err.message || 'Failed to save return policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Return Policy Settings</h2>

      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
          Return policy saved successfully!
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Settings</h3>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="acceptsReturns"
              checked={policy.acceptsReturns}
              onChange={(e) => setPolicy({ ...policy, acceptsReturns: e.target.checked })}
            />
            <label htmlFor="acceptsReturns">Accept returns</label>
          </div>

          {policy.acceptsReturns && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Return Window (days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={policy.returnWindowDays}
                  onChange={(e) => setPolicy({ ...policy, returnWindowDays: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Restocking Fee (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={policy.restockingFeePercentage}
                  onChange={(e) => setPolicy({ ...policy, restockingFeePercentage: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </>
          )}
        </div>

        {/* Item Condition Requirements */}
        {policy.acceptsReturns && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Item Condition Requirements</h3>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requiresOriginalPackaging"
                checked={policy.requiresOriginalPackaging}
                onChange={(e) => setPolicy({ ...policy, requiresOriginalPackaging: e.target.checked })}
              />
              <label htmlFor="requiresOriginalPackaging">Requires original packaging</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requiresUnusedCondition"
                checked={policy.requiresUnusedCondition}
                onChange={(e) => setPolicy({ ...policy, requiresUnusedCondition: e.target.checked })}
              />
              <label htmlFor="requiresUnusedCondition">Must be unused</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requiresTagsAttached"
                checked={policy.requiresTagsAttached}
                onChange={(e) => setPolicy({ ...policy, requiresTagsAttached: e.target.checked })}
              />
              <label htmlFor="requiresTagsAttached">Tags must be attached</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requirePhotos"
                checked={policy.requirePhotos}
                onChange={(e) => setPolicy({ ...policy, requirePhotos: e.target.checked })}
              />
              <label htmlFor="requirePhotos">Require photos for returns</label>
            </div>
          </div>
        )}

        {/* Shipping Settings */}
        {policy.acceptsReturns && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Shipping Settings</h3>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="buyerPaysReturnShipping"
                checked={policy.buyerPaysReturnShipping}
                onChange={(e) => setPolicy({ ...policy, buyerPaysReturnShipping: e.target.checked })}
              />
              <label htmlFor="buyerPaysReturnShipping">Buyer pays return shipping</label>
            </div>

            {policy.buyerPaysReturnShipping && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Free return shipping threshold ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={policy.freeReturnShippingThreshold}
                  onChange={(e) => setPolicy({ ...policy, freeReturnShippingThreshold: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="0 = no free shipping"
                />
              </div>
            )}
          </div>
        )}

        {/* Refund Options */}
        {policy.acceptsReturns && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Refund Options</h3>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="offersExchanges"
                checked={policy.offersExchanges}
                onChange={(e) => setPolicy({ ...policy, offersExchanges: e.target.checked })}
              />
              <label htmlFor="offersExchanges">Offer exchanges</label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="offersStoreCredit"
                checked={policy.offersStoreCredit}
                onChange={(e) => setPolicy({ ...policy, offersStoreCredit: e.target.checked })}
              />
              <label htmlFor="offersStoreCredit">Offer store credit</label>
            </div>

            {policy.offersStoreCredit && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Store credit bonus (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={policy.storeCreditBonusPercentage}
                  onChange={(e) => setPolicy({ ...policy, storeCreditBonusPercentage: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            )}
          </div>
        )}

        {/* Automation Settings */}
        {policy.acceptsReturns && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Automation Settings</h3>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoApproveLowRisk"
                checked={policy.autoApproveLowRisk}
                onChange={(e) => setPolicy({ ...policy, autoApproveLowRisk: e.target.checked })}
              />
              <label htmlFor="autoApproveLowRisk">Auto-approve low-risk returns</label>
            </div>

            {policy.autoApproveLowRisk && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Auto-approve threshold amount ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={policy.autoApproveThresholdAmount}
                  onChange={(e) => setPolicy({ ...policy, autoApproveThresholdAmount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            )}
          </div>
        )}

        {/* Policy Text */}
        {policy.acceptsReturns && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Policy Description</h3>

            <div>
              <label className="block text-sm font-medium mb-1">
                Policy Title
              </label>
              <input
                type="text"
                value={policy.policyTitle}
                onChange={(e) => setPolicy({ ...policy, policyTitle: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Policy Text
              </label>
              <textarea
                value={policy.policyText}
                onChange={(e) => setPolicy({ ...policy, policyText: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                rows={6}
                placeholder="Describe your return policy in detail..."
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Policy'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
