import React from 'react';
import { Button as DesignSystemButton } from '@/design-system';

interface ButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onClick?: () => void;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className = '',
  variant = 'default',
  size = 'default',
  onClick,
  disabled = false
}) => {
  // Map the new variants to the design system variants
  const variantMap: Record<string, any> = {
    default: 'primary',
    destructive: 'primary',
    outline: 'outline',
    secondary: 'secondary',
    ghost: 'ghost',
    link: 'ghost'
  };

  // Map the new sizes to the design system sizes
  const sizeMap: Record<string, any> = {
    default: 'medium',
    sm: 'small',
    lg: 'large',
    icon: 'medium'
  };

  return (
    <DesignSystemButton
      variant={variantMap[variant]}
      size={sizeMap[size]}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </DesignSystemButton>
  );
};