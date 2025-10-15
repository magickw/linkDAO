import React from 'react';
import { Crown, Shield, Users, Star } from 'lucide-react';

export type UserRole = 'admin' | 'moderator' | 'member' | 'vip';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * RoleBadge Component
 * 
 * Displays user role badges with appropriate icons and colors.
 * Supports different sizes and optional text labels.
 * 
 * Requirements: 1.2 (role badge display next to community names)
 */
export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  size = 'sm',
  showLabel = false,
  className = ''
}) => {
  const getRoleConfig = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          icon: Crown,
          label: 'Admin',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          textColor: 'text-yellow-800 dark:text-yellow-200'
        };
      case 'moderator':
        return {
          icon: Shield,
          label: 'Moderator',
          iconColor: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          borderColor: 'border-blue-200 dark:border-blue-800',
          textColor: 'text-blue-800 dark:text-blue-200'
        };
      case 'vip':
        return {
          icon: Star,
          label: 'VIP',
          iconColor: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
          borderColor: 'border-purple-200 dark:border-purple-800',
          textColor: 'text-purple-800 dark:text-purple-200'
        };
      case 'member':
      default:
        return {
          icon: Users,
          label: 'Member',
          iconColor: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          borderColor: 'border-green-200 dark:border-green-800',
          textColor: 'text-green-800 dark:text-green-200'
        };
    }
  };

  const getSizeConfig = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'lg':
        return {
          container: 'px-3 py-2',
          icon: 'w-5 h-5',
          text: 'text-sm font-medium',
          spacing: 'space-x-2'
        };
      case 'md':
        return {
          container: 'px-2 py-1.5',
          icon: 'w-4 h-4',
          text: 'text-xs font-medium',
          spacing: 'space-x-1.5'
        };
      case 'sm':
      default:
        return {
          container: 'px-1.5 py-1',
          icon: 'w-3 h-3',
          text: 'text-xs font-medium',
          spacing: 'space-x-1'
        };
    }
  };

  const roleConfig = getRoleConfig(role);
  const sizeConfig = getSizeConfig(size);
  const { icon: RoleIcon } = roleConfig;

  return (
    <div
      className={`
        inline-flex items-center rounded-full border transition-all duration-200
        ${roleConfig.bgColor} ${roleConfig.borderColor} ${sizeConfig.container}
        ${showLabel ? sizeConfig.spacing : ''}
        ${className}
      `}
      title={`${roleConfig.label} role`}
    >
      <RoleIcon className={`${sizeConfig.icon} ${roleConfig.iconColor}`} />
      {showLabel && (
        <span className={`${sizeConfig.text} ${roleConfig.textColor}`}>
          {roleConfig.label}
        </span>
      )}
    </div>
  );
};

export default RoleBadge;