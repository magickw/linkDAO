import React, { useState } from 'react';

interface BulkActionOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: 'default' | 'danger' | 'success';
  requireConfirm?: boolean;
  confirmMessage?: string;
}

interface OrderBulkActionsProps {
  selectedCount: number;
  onAction: (actionId: string, selectedIds: string[]) => Promise<void>;
  selectedIds: string[];
  onClearSelection?: () => void;
  className?: string;
}

const defaultActions: BulkActionOption[] = [
  {
    id: 'mark_processing',
    label: 'Mark as Processing',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    id: 'mark_ready_to_ship',
    label: 'Mark Ready to Ship',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
  {
    id: 'print_packing_slips',
    label: 'Print Packing Slips',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
    ),
  },
  {
    id: 'export_csv',
    label: 'Export to CSV',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'send_bulk_message',
    label: 'Send Bulk Message',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'cancel_orders',
    label: 'Cancel Orders',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    variant: 'danger',
    requireConfirm: true,
    confirmMessage: 'Are you sure you want to cancel these orders? This action cannot be undone.',
  },
];

export function OrderBulkActions({
  selectedCount,
  onAction,
  selectedIds,
  onClearSelection,
  className = '',
}: OrderBulkActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<BulkActionOption | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedCount === 0) return null;

  const handleAction = async (action: BulkActionOption) => {
    if (action.requireConfirm) {
      setConfirmingAction(action);
      setIsOpen(false);
      return;
    }

    setIsProcessing(true);
    try {
      await onAction(action.id, selectedIds);
      setIsOpen(false);
      onClearSelection?.();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmingAction) return;

    setIsProcessing(true);
    try {
      await onAction(confirmingAction.id, selectedIds);
      setConfirmingAction(null);
      onClearSelection?.();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className={`flex items-center gap-3 p-4 bg-purple-600/20 border border-purple-500/30 rounded-lg ${className}`}>
        {/* Selection Count */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">{selectedCount}</span>
          </div>
          <span className="text-purple-200 text-sm">
            order{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-purple-500/30" />

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={() => handleAction(defaultActions[0])}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            {defaultActions[0].icon}
            Processing
          </button>
          <button
            onClick={() => handleAction(defaultActions[1])}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
          >
            {defaultActions[1].icon}
            Ready to Ship
          </button>

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              More Actions
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsOpen(false)}
                />
                <div className="absolute top-full left-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                  {defaultActions.slice(2).map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action)}
                      disabled={isProcessing}
                      className={`
                        w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors
                        ${action.variant === 'danger'
                          ? 'text-red-400 hover:bg-red-500/10'
                          : 'text-white hover:bg-gray-700'
                        }
                      `}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Confirmation Modal */}
      {confirmingAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Confirm Action</h3>
            </div>

            <p className="text-gray-300 mb-6">
              {confirmingAction.confirmMessage || `Are you sure you want to ${confirmingAction.label.toLowerCase()} for ${selectedCount} order(s)?`}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmingAction(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default OrderBulkActions;
