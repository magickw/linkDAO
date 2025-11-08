import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';

interface ReturnRequestFormProps {
  orderId: string;
  buyerId: string;
  sellerId: string;
  orderItems: Array<{
    itemId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  onSubmit: (returnData: any) => Promise<void>;
  onCancel: () => void;
}

export const ReturnRequestForm: React.FC<ReturnRequestFormProps> = ({
  orderId,
  buyerId,
  sellerId,
  orderItems,
  onSubmit,
  onCancel
}) => {
  const [selectedItems, setSelectedItems] = useState<Map<string, { quantity: number; reason: string; photos: string[] }>>(new Map());
  const [returnReason, setReturnReason] = useState('');
  const [returnReasonDetails, setReturnReasonDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnReasons = [
    { value: 'defective', label: 'Defective or damaged' },
    { value: 'wrong_item', label: 'Wrong item received' },
    { value: 'not_as_described', label: 'Not as described' },
    { value: 'changed_mind', label: 'Changed my mind' },
    { value: 'quality_issues', label: 'Quality issues' },
    { value: 'other', label: 'Other' }
  ];

  const handleItemSelection = (itemId: string, selected: boolean) => {
    const newSelection = new Map(selectedItems);
    if (selected) {
      newSelection.set(itemId, { quantity: 1, reason: '', photos: [] });
    } else {
      newSelection.delete(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    const newSelection = new Map(selectedItems);
    const item = newSelection.get(itemId);
    if (item) {
      newSelection.set(itemId, { ...item, quantity });
    }
    setSelectedItems(newSelection);
  };

  const handleItemReasonChange = (itemId: string, reason: string) => {
    const newSelection = new Map(selectedItems);
    const item = newSelection.get(itemId);
    if (item) {
      newSelection.set(itemId, { ...item, reason });
    }
    setSelectedItems(newSelection);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedItems.size === 0) {
      setError('Please select at least one item to return');
      return;
    }

    if (!returnReason) {
      setError('Please select a return reason');
      return;
    }

    setLoading(true);

    try {
      const itemsToReturn = Array.from(selectedItems.entries()).map(([itemId, data]) => ({
        itemId,
        quantity: data.quantity,
        reason: data.reason || returnReason,
        photos: data.photos
      }));

      const totalAmount = itemsToReturn.reduce((sum, item) => {
        const orderItem = orderItems.find(oi => oi.itemId === item.itemId);
        return sum + (orderItem ? orderItem.price * item.quantity : 0);
      }, 0);

      await onSubmit({
        orderId,
        buyerId,
        sellerId,
        returnReason,
        returnReasonDetails,
        itemsToReturn,
        originalAmount: totalAmount
      });
    } catch (err: any) {
      setError(err.message || 'Failed to submit return request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Request Return</h2>

      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Items Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Select Items to Return
          </label>
          <div className="space-y-3">
            {orderItems.map(item => (
              <div key={item.itemId} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.itemId)}
                    onChange={(e) => handleItemSelection(item.itemId, e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">
                      ${item.price.toFixed(2)} × {item.quantity}
                    </div>

                    {selectedItems.has(item.itemId) && (
                      <div className="mt-3 space-y-2">
                        <div>
                          <label className="text-sm">Quantity to return:</label>
                          <input
                            type="number"
                            min="1"
                            max={item.quantity}
                            value={selectedItems.get(item.itemId)?.quantity || 1}
                            onChange={(e) => handleQuantityChange(item.itemId, parseInt(e.target.value))}
                            className="ml-2 w-20 px-2 py-1 border rounded"
                          />
                        </div>
                        <div>
                          <label className="text-sm">Specific reason (optional):</label>
                          <input
                            type="text"
                            value={selectedItems.get(item.itemId)?.reason || ''}
                            onChange={(e) => handleItemReasonChange(item.itemId, e.target.value)}
                            className="w-full px-3 py-2 border rounded mt-1"
                            placeholder="Additional details for this item"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Return Reason */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Main Return Reason *
          </label>
          <select
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          >
            <option value="">Select a reason</option>
            {returnReasons.map(reason => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </div>

        {/* Additional Details */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Additional Details
          </label>
          <textarea
            value={returnReasonDetails}
            onChange={(e) => setReturnReasonDetails(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            rows={4}
            placeholder="Please provide any additional information about your return..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || selectedItems.size === 0}
          >
            {loading ? 'Submitting...' : 'Submit Return Request'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
