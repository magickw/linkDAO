import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';
import { Camera, Plus, Minus, Trash2, Upload, Image as ImageIcon } from 'lucide-react';

interface ReturnRequestFormProps {
  orderId: string;
  buyerId: string;
  sellerId: string;
  orderItems: Array<{
    itemId: string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  onSubmit: (returnData: any) => Promise<void>;
  onCancel: () => void;
}

export const MobileOptimizedReturnRequestForm: React.FC<ReturnRequestFormProps> = ({
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
  const [showPhotoUpload, setShowPhotoUpload] = useState<string | null>(null);

  const returnReasons = [
    { value: 'defective', label: 'Defective or damaged' },
    { value: 'wrong_item', label: 'Wrong item received' },
    { value: 'not_as_described', label: 'Not as described' },
    { value: 'changed_mind', label: 'Changed my mind' },
    { value: 'quality_issues', label: 'Quality issues' },
    { value: 'no_longer_needed', label: 'No longer needed' },
    { value: 'better_price', label: 'Found better price' },
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
    if (quantity < 1) return; // Prevent negative quantities
    
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

  const handleAddPhoto = (itemId: string, photoUrl: string) => {
    const newSelection = new Map(selectedItems);
    const item = newSelection.get(itemId);
    if (item) {
      newSelection.set(itemId, { 
        ...item, 
        photos: [...item.photos, photoUrl] 
      });
    }
    setSelectedItems(newSelection);
  };

  const handleRemovePhoto = (itemId: string, photoIndex: number) => {
    const newSelection = new Map(selectedItems);
    const item = newSelection.get(itemId);
    if (item) {
      const newPhotos = [...item.photos];
      newPhotos.splice(photoIndex, 1);
      newSelection.set(itemId, { ...item, photos: newPhotos });
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

  const handlePhotoUpload = (itemId: string) => {
    // In a real implementation, this would open the camera or file picker
    // For now, we'll just show a placeholder
    alert(`Camera/photo upload would open for item: ${itemId}`);
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 pb-4">
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold">Request Return</h2>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Items Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Select Items to Return
            </label>
            <div className="space-y-4">
              {orderItems.map(item => (
                <div 
                  key={item.itemId} 
                  className="border rounded-xl p-4 bg-white shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.itemId)}
                      onChange={(e) => handleItemSelection(item.itemId, e.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      {item.image && (
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-16 h-16 object-cover rounded-lg mb-2"
                        />
                      )}
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        ${item.price.toFixed(2)} × {item.quantity}
                      </div>

                      {selectedItems.has(item.itemId) && (
                        <div className="mt-3 space-y-3">
                          {/* Quantity selector */}
                          <div>
                            <label className="text-sm font-medium">Quantity to return:</label>
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.itemId, (selectedItems.get(item.itemId)?.quantity || 1) - 1)}
                                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                                disabled={(selectedItems.get(item.itemId)?.quantity || 1) <= 1}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={item.quantity}
                                value={selectedItems.get(item.itemId)?.quantity || 1}
                                onChange={(e) => handleQuantityChange(item.itemId, parseInt(e.target.value))}
                                className="w-14 text-center px-2 py-2 border rounded"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.itemId, (selectedItems.get(item.itemId)?.quantity || 1) + 1)}
                                className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                                disabled={(selectedItems.get(item.itemId)?.quantity || 1) >= item.quantity}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Reason selector */}
                          <div>
                            <label className="text-sm font-medium">Reason for return:</label>
                            <select
                              value={selectedItems.get(item.itemId)?.reason || ''}
                              onChange={(e) => handleItemReasonChange(item.itemId, e.target.value)}
                              className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select a reason</option>
                              {returnReasons.map(reason => (
                                <option key={reason.value} value={reason.value}>
                                  {reason.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Photo upload */}
                          <div>
                            <label className="text-sm font-medium block mb-1">Add photos of item (optional):</label>
                            <div className="flex flex-wrap gap-2">
                              {selectedItems.get(item.itemId)?.photos.map((photo, index) => (
                                <div key={index} className="relative">
                                  <img 
                                    src={photo} 
                                    alt={`Return item ${index + 1}`} 
                                    className="w-16 h-16 object-cover rounded-lg border"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(item.itemId, index)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => handlePhotoUpload(item.itemId)}
                                className="border-2 border-dashed border-gray-300 rounded-lg w-16 h-16 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400"
                              >
                                <Camera className="w-6 h-6" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Return Reason (if no items have specific reasons) */}
          {(Array.from(selectedItems.values()).every(item => !item.reason)) && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Main Return Reason *
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          )}

          {/* Additional Details */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Additional Details
            </label>
            <textarea
              value={returnReasonDetails}
              onChange={(e) => setReturnReasonDetails(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
              placeholder="Please provide any additional information about your return..."
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedItems.size === 0}
              className="flex-1"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                'Submit Return Request'
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};