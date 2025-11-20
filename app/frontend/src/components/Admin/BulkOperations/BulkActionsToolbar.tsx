import React, { useState } from 'react';
import { Check, X, Trash2, UserX, UserCheck, AlertTriangle } from 'lucide-react';
import { Button, GlassPanel } from '@/design-system';

interface BulkActionsToolbarProps {
    selectedCount: number;
    onAction: (action: BulkAction) => void;
    onClear: () => void;
    availableActions?: BulkAction[];
    loading?: boolean;
}

export type BulkAction =
    | 'approve'
    | 'reject'
    | 'delete'
    | 'suspend'
    | 'activate'
    | 'assign'
    | 'flag';

interface ActionConfig {
    id: BulkAction;
    label: string;
    icon: React.ElementType;
    variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
    requiresConfirmation: boolean;
}

const ACTION_CONFIGS: Record<BulkAction, ActionConfig> = {
    approve: {
        id: 'approve',
        label: 'Approve All',
        icon: Check,
        variant: 'primary',
        requiresConfirmation: false,
    },
    reject: {
        id: 'reject',
        label: 'Reject All',
        icon: X,
        variant: 'secondary',
        requiresConfirmation: true,
    },
    delete: {
        id: 'delete',
        label: 'Delete All',
        icon: Trash2,
        variant: 'secondary',
        requiresConfirmation: true,
    },
    suspend: {
        id: 'suspend',
        label: 'Suspend All',
        icon: UserX,
        variant: 'secondary',
        requiresConfirmation: true,
    },
    activate: {
        id: 'activate',
        label: 'Activate All',
        icon: UserCheck,
        variant: 'primary',
        requiresConfirmation: false,
    },
    assign: {
        id: 'assign',
        label: 'Assign To...',
        icon: AlertTriangle,
        variant: 'outline',
        requiresConfirmation: false,
    },
    flag: {
        id: 'flag',
        label: 'Flag All',
        icon: AlertTriangle,
        variant: 'secondary',
        requiresConfirmation: false,
    },
};

export function BulkActionsToolbar({
    selectedCount,
    onAction,
    onClear,
    availableActions = ['approve', 'reject', 'delete'],
    loading = false,
}: BulkActionsToolbarProps) {
    const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);

    const handleAction = (action: BulkAction) => {
        const config = ACTION_CONFIGS[action];

        if (config.requiresConfirmation) {
            setConfirmAction(action);
        } else {
            onAction(action);
        }
    };

    const handleConfirm = () => {
        if (confirmAction) {
            onAction(confirmAction);
            setConfirmAction(null);
        }
    };

    const handleCancel = () => {
        setConfirmAction(null);
    };

    if (selectedCount === 0) {
        return null;
    }

    return (
        <>
            <GlassPanel className="p-4 mb-4 border-2 border-blue-500/50">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-white font-medium">
                                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {availableActions.map((actionId) => {
                            const config = ACTION_CONFIGS[actionId];
                            const Icon = config.icon;

                            return (
                                <Button
                                    key={actionId}
                                    onClick={() => handleAction(actionId)}
                                    variant={config.variant}
                                    size="small"
                                    disabled={loading}
                                    className="flex items-center gap-2"
                                >
                                    <Icon className="w-4 h-4" />
                                    {config.label}
                                </Button>
                            );
                        })}

                        <Button
                            onClick={onClear}
                            variant="ghost"
                            size="small"
                            disabled={loading}
                        >
                            Clear Selection
                        </Button>
                    </div>
                </div>
            </GlassPanel>

            {/* Confirmation Dialog */}
            {confirmAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <GlassPanel className="p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-white mb-4">Confirm Action</h3>
                        <p className="text-gray-300 mb-6">
                            Are you sure you want to <strong>{ACTION_CONFIGS[confirmAction].label.toLowerCase()}</strong> {selectedCount} item{selectedCount !== 1 ? 's' : ''}?
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button variant="secondary" onClick={handleConfirm}>
                                Confirm
                            </Button>
                        </div>
                    </GlassPanel>
                </div>
            )}
        </>
    );
}

// Selectable Table Row Component
interface SelectableRowProps {
    id: string;
    selected: boolean;
    onSelect: (id: string, selected: boolean) => void;
    children: React.ReactNode;
    className?: string;
}

export function SelectableRow({
    id,
    selected,
    onSelect,
    children,
    className = '',
}: SelectableRowProps) {
    return (
        <div
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${selected ? 'bg-blue-900/30 border border-blue-500/50' : 'bg-white/5'
                } ${className}`}
        >
            <input
                type="checkbox"
                checked={selected}
                onChange={(e) => onSelect(id, e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
            />
            <div className="flex-1 min-w-0">{children}</div>
        </div>
    );
}

// Select All Checkbox Component
interface SelectAllCheckboxProps {
    totalCount: number;
    selectedCount: number;
    onSelectAll: (selected: boolean) => void;
    label?: string;
}

export function SelectAllCheckbox({
    totalCount,
    selectedCount,
    onSelectAll,
    label = 'Select all',
}: SelectAllCheckboxProps) {
    const isAllSelected = totalCount > 0 && selectedCount === totalCount;
    const isPartiallySelected = selectedCount > 0 && selectedCount < totalCount;

    return (
        <label className="flex items-center gap-2 cursor-pointer">
            <input
                type="checkbox"
                checked={isAllSelected}
                ref={(input) => {
                    if (input) {
                        input.indeterminate = isPartiallySelected;
                    }
                }}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
            />
            <span className="text-gray-300 text-sm">
                {label} {selectedCount > 0 && `(${selectedCount}/${totalCount})`}
            </span>
        </label>
    );
}
