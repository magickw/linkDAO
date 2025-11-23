/**
 * Shared Button Type Definitions
 * 
 * This file contains standardized type definitions for all button components
 * across the application to ensure consistency.
 */

import React from 'react';

/**
 * Standard button sizes across all button components
 * - sm: Small (compact UI, secondary actions)
 * - md: Medium (default, most common use case)
 * - lg: Large (primary CTAs, mobile-friendly)
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Standard button variants
 */
export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'danger'
    | 'link';

/**
 * Base button props that all button components should extend
 */
export interface BaseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
    children: React.ReactNode;
}

/**
 * Legacy size values for backward compatibility during migration
 * @deprecated Use ButtonSize instead
 */
export type LegacyButtonSize = 'small' | 'medium' | 'large';

/**
 * Normalizes legacy size values to standard ButtonSize
 * @param size - Size value (can be legacy or standard)
 * @returns Normalized ButtonSize
 */
export function normalizeButtonSize(size: ButtonSize | LegacyButtonSize): ButtonSize {
    switch (size) {
        case 'small':
            return 'sm';
        case 'medium':
            return 'md';
        case 'large':
            return 'lg';
        default:
            return size;
    }
}

/**
 * Type guard to check if a size is a legacy value
 */
export function isLegacySize(size: string): size is LegacyButtonSize {
    return ['small', 'medium', 'large'].includes(size);
}
