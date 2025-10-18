import React from 'react';

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectValueProps {
  placeholder?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({ 
  children, 
  value, 
  onValueChange,
  className = ''
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
    </div>
  );
};

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ 
  children, 
  className = ''
}) => {
  return (
    <button className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>
      {children}
    </button>
  );
};

export const SelectValue: React.FC<SelectValueProps> = ({ 
  placeholder = 'Select'
}) => {
  return (
    <span className="text-muted-foreground">
      {placeholder}
    </span>
  );
};

export const SelectContent: React.FC<SelectContentProps> = ({ 
  children, 
  className = ''
}) => {
  return (
    <div className={`relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className}`}>
      {children}
    </div>
  );
};

export const SelectItem: React.FC<SelectItemProps> = ({ 
  children, 
  value,
  className = ''
}) => {
  return (
    <div className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className}`}>
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <div className="h-2 w-2 border-2 border-current border-t-0 border-r-0 rotate-45 hidden"></div>
      </span>
      {children}
    </div>
  );
};