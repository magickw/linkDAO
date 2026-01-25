import React from 'react';
import { Button } from '../../design-system';

interface BulkActionsBarProps {
    selectedCount: number;
    onMarkShipped: () => void;
    onPrintLabels: () => void;
    onExportCSV: () => void;
    onClear: () => void;
}

export function BulkActionsBar({
    selectedCount,
    onMarkShipped,
    onPrintLabels,
    onExportCSV,
    onClear
}: BulkActionsBarProps) {
    return (
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg px-6 py-4 mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-white">
                        {selectedCount} order{selectedCount !== 1 ? 's' : ''} selected
                    </span>
                    <button
                        onClick={onClear}
                        className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                    >
                        Clear selection
                    </button>
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={onMarkShipped}
                        variant="primary"
                        className="bg-green-600 hover:bg-green-700 border-green-600"
                    >
                        Mark as Shipped
                    </Button>
                    <Button
                        onClick={onPrintLabels}
                        variant="primary"
                    >
                        Print Labels
                    </Button>
                    <Button
                        onClick={onExportCSV}
                        variant="secondary"
                    >
                        Export CSV
                    </Button>
                </div>
            </div>
        </div>
    );
}
