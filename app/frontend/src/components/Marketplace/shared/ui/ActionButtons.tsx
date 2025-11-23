import React from 'react';
import { Button } from '@/design-system/components/Button';
import { cn } from '@/lib/utils';
import { 
  PencilIcon, 
  TrashIcon, 
  PlayIcon, 
  PauseIcon, 
  CheckIcon, 
  XIcon,
  EyeIcon
} from 'lucide-react';

export type ActionType = 'edit' | 'delete' | 'activate' | 'deactivate' | 'complete' | 'cancel' | 'view';

export interface ActionButtonConfig {
  type: ActionType;
  onClick: () => void;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  confirmMessage?: string;
  className?: string;
  iconOnly?: boolean;
}

const actionIcons: Record<ActionType, React.ReactNode> = {
  edit: <PencilIcon className="h-4 w-4" />,
  delete: <TrashIcon className="h-4 w-4 text-red-500" />,
  activate: <PlayIcon className="h-4 w-4 text-green-500" />,
  deactivate: <PauseIcon className="h-4 w-4 text-amber-500" />,
  complete: <CheckIcon className="h-4 w-4 text-blue-500" />,
  cancel: <XIcon className="h-4 w-4 text-gray-500" />,
  view: <EyeIcon className="h-4 w-4 text-gray-400" />,
};

const actionLabels: Record<ActionType, string> = {
  edit: 'Edit',
  delete: 'Delete',
  activate: 'Activate',
  deactivate: 'Pause',
  complete: 'Complete',
  cancel: 'Cancel',
  view: 'View',
};

const actionVariants: Record<ActionType, 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient'> = {
  edit: 'outline',
  delete: 'ghost',
  activate: 'ghost',
  deactivate: 'ghost',
  complete: 'outline',
  cancel: 'ghost',
  view: 'ghost',
};

interface ActionButtonsProps {
  actions: ActionButtonConfig[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end';
  spacing?: 'none' | 'xs' | 'sm' | 'md';
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  actions,
  className,
  size = 'sm',
  align = 'end',
  spacing = 'sm',
}) => {
  const spacingMap = {
    none: 'space-x-0',
    xs: 'space-x-1',
    sm: 'space-x-2',
    md: 'space-x-3',
  };

  const alignMap = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
  };

  const handleClick = (action: ActionButtonConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    if (action.confirmMessage && !window.confirm(action.confirmMessage)) {
      return;
    }
    action.onClick();
  };

  return (
    <div className={cn('flex items-center', alignMap[align], spacingMap[spacing], className)}>
      {actions.map((action, index) => {
        const Icon = actionIcons[action.type];
        const label = action.label || actionLabels[action.type];
        const variant = actionVariants[action.type];

        return (
          <Button
            key={index}
            variant={variant}
            size={size}
            onClick={(e) => handleClick(action, e)}
            disabled={action.disabled || action.loading}
            className={cn(
              action.type === 'delete' && 'text-red-500 hover:text-red-600',
              action.className
            )}
          >
            {action.loading ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <>
                {Icon && <span className={action.iconOnly ? '' : 'mr-1'}>{Icon}</span>}
                {!action.iconOnly && <span>{label}</span>}
              </>
            )}
          </Button>
        );
      })}
    </div>
  );
};

export default ActionButtons;
