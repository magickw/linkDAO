/**
 * Password Strength Indicator Component
 * Displays password strength with visual feedback
 */

import React from 'react';
import { calculatePasswordStrength, PasswordStrengthResult } from '@/utils/passwordStrength';

interface PasswordStrengthIndicatorProps {
  password: string;
  showSuggestions?: boolean;
  className?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showSuggestions = true,
  className = '',
}) => {
  const strength = calculatePasswordStrength(password);

  const segments = [0, 1, 2, 3, 4];

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Strength Bar */}
      <div className="flex space-x-1">
        {segments.map((segment) => (
          <div
            key={segment}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              segment <= strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Strength Label */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Password Strength
        </span>
        <span
          className={`text-sm font-semibold ${
            strength.score <= 1
              ? 'text-red-600 dark:text-red-400'
              : strength.score === 2
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-green-600 dark:text-green-400'
          }`}
        >
          {password ? strength.label : 'Not entered'}
        </span>
      </div>

      {/* Suggestions */}
      {showSuggestions && password && strength.suggestions.length > 0 && (
        <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
            Suggestions:
          </p>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-0.5">
            {strength.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {password && strength.score >= 3 && strength.suggestions.length === 0 && (
        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">
            ✓ Your password is strong
          </p>
        </div>
      )}
    </div>
  );
};