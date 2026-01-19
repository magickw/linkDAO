import React, { useState } from 'react';

interface ShippingLabelModalProps {
    orderId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function ShippingLabelModal({ orderId, onClose, onSuccess }: ShippingLabelModalProps) {
    const [step, setStep] = useState<'package' | 'rates' | 'confirm'>('package');

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Purchase Shipping Label
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        ✕
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-400">
                        Shipping label purchase flow - Coming soon!
                    </p>
                    <button
                        onClick={onClose}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
