import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    Calendar,
    Plus,
    Trash2,
    Save,
    AlertCircle
} from 'lucide-react';
import { monthlyUpdateService, MonthlyUpdate, MonthlyUpdateHighlight, MonthlyUpdateMetrics, CreateMonthlyUpdateInput, UpdateMonthlyUpdateInput } from '@/services/monthlyUpdateService';

interface CreateMonthlyUpdateModalProps {
    communityId: string;
    existingUpdate?: MonthlyUpdate;
    onClose: () => void;
    onSuccess: (update: MonthlyUpdate) => void;
}

const CreateMonthlyUpdateModal: React.FC<CreateMonthlyUpdateModalProps> = ({
    communityId,
    existingUpdate,
    onClose,
    onSuccess
}) => {
    const isEditing = !!existingUpdate;
    const currentDate = new Date();

    const [formData, setFormData] = useState({
        title: existingUpdate?.title || '',
        content: existingUpdate?.content || '',
        summary: existingUpdate?.summary || '',
        month: existingUpdate?.month || currentDate.getMonth() + 1,
        year: existingUpdate?.year || currentDate.getFullYear(),
    });

    const [highlights, setHighlights] = useState<MonthlyUpdateHighlight[]>(
        existingUpdate?.highlights || []
    );

    const [metrics, setMetrics] = useState<MonthlyUpdateMetrics>(
        existingUpdate?.metrics || {}
    );

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' },
    ];

    const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

    const addHighlight = () => {
        setHighlights([...highlights, { title: '', description: '' }]);
    };

    const updateHighlight = (index: number, field: keyof MonthlyUpdateHighlight, value: string) => {
        const updated = [...highlights];
        updated[index] = { ...updated[index], [field]: value };
        setHighlights(updated);
    };

    const removeHighlight = (index: number) => {
        setHighlights(highlights.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.title.trim()) {
            setError('Title is required');
            return;
        }

        if (!formData.content.trim()) {
            setError('Content is required');
            return;
        }

        try {
            setLoading(true);

            // Filter out empty highlights
            const validHighlights = highlights.filter(h => h.title.trim());

            if (isEditing && existingUpdate) {
                // Update existing
                const updateInput: UpdateMonthlyUpdateInput = {
                    title: formData.title,
                    content: formData.content,
                    summary: formData.summary || undefined,
                    highlights: validHighlights,
                    metrics: metrics,
                };

                const response = await monthlyUpdateService.updateMonthlyUpdate(existingUpdate.id, updateInput);

                if (response.success && response.data) {
                    onSuccess(response.data);
                } else {
                    setError(response.message || 'Failed to update monthly update');
                }
            } else {
                // Create new
                const createInput: CreateMonthlyUpdateInput = {
                    communityId,
                    title: formData.title,
                    content: formData.content,
                    summary: formData.summary || undefined,
                    month: formData.month,
                    year: formData.year,
                    highlights: validHighlights,
                    metrics: metrics,
                };

                const response = await monthlyUpdateService.createMonthlyUpdate(createInput);

                if (response.success && response.data) {
                    onSuccess(response.data);
                } else {
                    setError(response.message || 'Failed to create monthly update');
                }
            }
        } catch (err) {
            console.error('Error saving monthly update:', err);
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-500" />
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {isEditing ? 'Edit Monthly Update' : 'Create Monthly Update'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Month/Year Selection (only for new) */}
                    {!isEditing && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Month
                                </label>
                                <select
                                    value={formData.month}
                                    onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    {months.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Year
                                </label>
                                <select
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    {years.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder={`${months.find(m => m.value === formData.month)?.label} ${formData.year} Community Update`}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            required
                        />
                    </div>

                    {/* Summary */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Summary (short preview)
                        </label>
                        <input
                            type="text"
                            value={formData.summary}
                            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                            placeholder="A brief summary of this month's highlights"
                            maxLength={200}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">{formData.summary.length}/200 characters</p>
                    </div>

                    {/* Content */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Content <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            placeholder="Write your monthly update here. Include achievements, news, upcoming events..."
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
                            required
                        />
                    </div>

                    {/* Highlights */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Highlights
                            </label>
                            <button
                                type="button"
                                onClick={addHighlight}
                                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" />
                                Add Highlight
                            </button>
                        </div>
                        <div className="space-y-3">
                            {highlights.map((highlight, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <div className="flex-1 space-y-2">
                                        <input
                                            type="text"
                                            value={highlight.title}
                                            onChange={(e) => updateHighlight(index, 'title', e.target.value)}
                                            placeholder="Highlight title"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={highlight.description}
                                            onChange={(e) => updateHighlight(index, 'description', e.target.value)}
                                            placeholder="Brief description (optional)"
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeHighlight(index)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {highlights.length === 0 && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    No highlights added yet
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Metrics */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Key Metrics (optional)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    New Members
                                </label>
                                <input
                                    type="number"
                                    value={metrics.newMembers || ''}
                                    onChange={(e) => setMetrics({ ...metrics, newMembers: parseInt(e.target.value) || undefined })}
                                    placeholder="0"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Total Posts
                                </label>
                                <input
                                    type="number"
                                    value={metrics.totalPosts || ''}
                                    onChange={(e) => setMetrics({ ...metrics, totalPosts: parseInt(e.target.value) || undefined })}
                                    placeholder="0"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Active Proposals
                                </label>
                                <input
                                    type="number"
                                    value={metrics.activeProposals || ''}
                                    onChange={(e) => setMetrics({ ...metrics, activeProposals: parseInt(e.target.value) || undefined })}
                                    placeholder="0"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    Engagement Rate (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={metrics.engagementRate !== undefined ? metrics.engagementRate * 100 : ''}
                                    onChange={(e) => setMetrics({ ...metrics, engagementRate: parseFloat(e.target.value) / 100 || undefined })}
                                    placeholder="0"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {isEditing ? 'Update' : 'Create Draft'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default CreateMonthlyUpdateModal;
