import React from 'react';

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
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedCount} order{selectedCount !== 1 ? 's' : ''} selected
                    </span>
                    <button
                        onClick={onClear}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Clear selection
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onMarkShipped}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                        Mark as Shipped
                    </button>
                    <button
                        onClick={onPrintLabels}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                        Print Labels
                    </button>
                    <button
                        onClick={onExportCSV}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                    >
                        Export CSV
                    </button>
                </div>
            </div>
        </div>
    );
}
