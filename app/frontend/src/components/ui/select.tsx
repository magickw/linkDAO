import React, { createContext, useContext, useState } from 'react';

// Context for compound component pattern
interface SelectContextType {
  value?: string;
  onValueChange?: (value: string) => void;
}

const SelectContext = createContext<SelectContextType | undefined>(undefined);

// Main Select component - supports both simple and compound patterns
interface SelectProps extends Partial<React.SelectHTMLAttributes<HTMLSelectElement>> {
  children: React.ReactNode;
  label?: string;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({
  children,
  label,
  className = '',
  value,
  onValueChange,
  onChange,
  ...props
}) => {
  // Check if this is compound component usage (has SelectTrigger as child)
  const isCompoundComponent = React.Children.toArray(children).some(
    (child: any) => child?.type?.name === 'SelectTrigger'
  );

  if (isCompoundComponent) {
    // Compound component pattern
    return (
      <SelectContext.Provider value={{ value, onValueChange }}>
        <div className={`relative ${className}`}>
          {children}
        </div>
      </SelectContext.Provider>
    );
  }

  // Simple select pattern with options
  if (label) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <select
          className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          value={value}
          onChange={onChange}
          {...props}
        >
          {children}
        </select>
      </div>
    );
  }

  return (
    <select
      className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      value={value}
      onChange={onChange}
      {...props}
    >
      {children}
    </select>
  );
};

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  className = ''
}) => {
  const context = useContext(SelectContext);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <button
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children}
      <svg
        className="h-4 w-4 opacity-50"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );
};

interface SelectValueProps {
  placeholder?: string;
}

export const SelectValue: React.FC<SelectValueProps> = ({
  placeholder = 'Select'
}) => {
  const context = useContext(SelectContext);

  return (
    <span className="text-foreground">
      {context?.value || placeholder}
    </span>
  );
};

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectContent: React.FC<SelectContentProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`absolute top-full left-0 z-50 mt-1 min-w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md ${className}`}>
      <div className="p-1">
        {children}
      </div>
    </div>
  );
};

interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export const SelectItem: React.FC<SelectItemProps> = ({
  children,
  value,
  className = ''
}) => {
  const context = useContext(SelectContext);
  const isSelected = context?.value === value;

  const handleClick = () => {
    context?.onValueChange?.(value);
  };

  return (
    <div
      className={`relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground ${isSelected ? 'bg-accent' : ''} ${className}`}
      onClick={handleClick}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </span>
      )}
      {children}
    </div>
  );
};
