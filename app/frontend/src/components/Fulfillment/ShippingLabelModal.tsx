import React, { useState } from 'react';
import { GlassPanel, Button } from '../../design-system';

interface ShippingLabelModalProps {
    orderId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function ShippingLabelModal({ orderId, onClose, onSuccess }: ShippingLabelModalProps) {
    const [step, setStep] = useState<'package' | 'rates' | 'confirm'>('package');

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <GlassPanel className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">
                        Purchase Shipping Label
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-300"
                    >
                        ✕
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-gray-400">
                        Shipping label purchase flow - Coming soon!
                    </p>
                    <div className="mt-6 flex justify-end">
                        <Button
                            onClick={onClose}
                            variant="secondary"
                        >
                            Close
                        </Button>
                    </div>
                </div>
            </GlassPanel>
        </div>
    );
}
