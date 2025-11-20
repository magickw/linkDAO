import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Calendar } from 'lucide-react';
import { Button, GlassPanel } from '@/design-system';

export interface ExportOptions {
    format: 'csv' | 'json' | 'pdf';
    filename?: string;
    dateRange?: {
        from: string;
        to: string;
    };
    columns?: string[];
}

interface ExportButtonProps {
    data: any[];
    filename?: string;
    onExport?: (options: ExportOptions) => Promise<void>;
    availableFormats?: Array<'csv' | 'json' | 'pdf'>;
    columns?: Array<{ key: string; label: string }>;
}

export function ExportButton({
    data,
    filename = 'export',
    onExport,
    availableFormats = ['csv', 'json'],
    columns,
}: ExportButtonProps) {
    const [showDialog, setShowDialog] = useState(false);
    const [options, setOptions] = useState<ExportOptions>({
        format: 'csv',
        filename,
    });
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            if (onExport) {
                await onExport(options);
            } else {
                // Default export logic
                await defaultExport(data, options);
            }
            setShowDialog(false);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setExporting(false);
        }
    };

    return (
        <>
            <Button
                onClick={() => setShowDialog(true)}
                variant="outline"
                size="small"
                className="flex items-center gap-2"
            >
                <Download className="w-4 h-4" />
                Export
            </Button>

            {showDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <GlassPanel className="p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-white mb-4">Export Data</h3>

                        {/* Format Selection */}
                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm mb-2">Format</label>
                            <div className="grid grid-cols-3 gap-2">
                                {availableFormats.includes('csv') && (
                                    <button
                                        onClick={() => setOptions({ ...options, format: 'csv' })}
                                        className={`p-3 rounded-lg border-2 transition-colors ${options.format === 'csv'
                                                ? 'border-blue-500 bg-blue-900/30'
                                                : 'border-gray-700 bg-gray-800'
                                            }`}
                                    >
                                        <FileSpreadsheet className="w-6 h-6 text-white mx-auto mb-1" />
                                        <p className="text-white text-xs">CSV</p>
                                    </button>
                                )}
                                {availableFormats.includes('json') && (
                                    <button
                                        onClick={() => setOptions({ ...options, format: 'json' })}
                                        className={`p-3 rounded-lg border-2 transition-colors ${options.format === 'json'
                                                ? 'border-blue-500 bg-blue-900/30'
                                                : 'border-gray-700 bg-gray-800'
                                            }`}
                                    >
                                        <FileText className="w-6 h-6 text-white mx-auto mb-1" />
                                        <p className="text-white text-xs">JSON</p>
                                    </button>
                                )}
                                {availableFormats.includes('pdf') && (
                                    <button
                                        onClick={() => setOptions({ ...options, format: 'pdf' })}
                                        className={`p-3 rounded-lg border-2 transition-colors ${options.format === 'pdf'
                                                ? 'border-blue-500 bg-blue-900/30'
                                                : 'border-gray-700 bg-gray-800'
                                            }`}
                                    >
                                        <FileText className="w-6 h-6 text-white mx-auto mb-1" />
                                        <p className="text-white text-xs">PDF</p>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Filename */}
                        <div className="mb-4">
                            <label className="block text-gray-400 text-sm mb-2">Filename</label>
                            <input
                                type="text"
                                value={options.filename}
                                onChange={(e) => setOptions({ ...options, filename: e.target.value })}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                                placeholder="export"
                            />
                        </div>

                        {/* Column Selection */}
                        {columns && (
                            <div className="mb-4">
                                <label className="block text-gray-400 text-sm mb-2">Columns to Export</label>
                                <div className="max-h-40 overflow-y-auto space-y-2 bg-gray-800 rounded-lg p-3">
                                    {columns.map((col) => (
                                        <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!options.columns || options.columns.includes(col.key)}
                                                onChange={(e) => {
                                                    const currentCols = options.columns || columns.map((c) => c.key);
                                                    setOptions({
                                                        ...options,
                                                        columns: e.target.checked
                                                            ? [...currentCols, col.key]
                                                            : currentCols.filter((c) => c !== col.key),
                                                    });
                                                }}
                                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600"
                                            />
                                            <span className="text-white text-sm">{col.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Info */}
                        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                            <p className="text-blue-300 text-sm">
                                Exporting {data.length} record{data.length !== 1 ? 's' : ''} as {options.format.toUpperCase()}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={exporting}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleExport} disabled={exporting}>
                                {exporting ? 'Exporting...' : 'Export'}
                            </Button>
                        </div>
                    </GlassPanel>
                </div>
            )}
        </>
    );
}

// Default export implementation
async function defaultExport(data: any[], options: ExportOptions) {
    const { format, filename = 'export', columns } = options;

    switch (format) {
        case 'csv':
            exportToCSV(data, filename, columns);
            break;
        case 'json':
            exportToJSON(data, filename);
            break;
        case 'pdf':
            // PDF export would require a library like jsPDF
            console.warn('PDF export not implemented');
            break;
    }
}

function exportToCSV(data: any[], filename: string, selectedColumns?: string[]) {
    if (data.length === 0) return;

    // Get headers
    const headers = selectedColumns || Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...data.map((row) =>
            headers.map((header) => {
                const value = row[header];
                // Escape commas and quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        ),
    ].join('\n');

    downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

function exportToJSON(data: any[], filename: string) {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, `${filename}.json`, 'application/json');
}

function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
