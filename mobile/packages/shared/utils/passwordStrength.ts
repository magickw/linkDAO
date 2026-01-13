/**
 * Password Strength Utilities
 * Provides password strength validation and scoring
 */

export interface PasswordStrengthResult {
  score: number; // 0-4
  label: string;
  color: string;
  suggestions: string[];
}

const MIN_LENGTH = 8;
const GOOD_LENGTH = 12;

/**
 * Calculate password strength score
 * Returns a score from 0 (very weak) to 4 (very strong)
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;
  const suggestions: string[] = [];

  // Check length
  if (password.length >= MIN_LENGTH) {
    score += 1;
  } else {
    suggestions.push(`Use at least ${MIN_LENGTH} characters`);
  }

  if (password.length >= GOOD_LENGTH) {
    score += 1;
  }

  // Check for lowercase letters
  if (/[a-z]/.test(password)) {
    score += 0.5;
  } else {
    suggestions.push('Add lowercase letters');
  }

  // Check for uppercase letters
  if (/[A-Z]/.test(password)) {
    score += 0.5;
  } else {
    suggestions.push('Add uppercase letters');
  }

  // Check for numbers
  if (/[0-9]/.test(password)) {
    score += 0.5;
  } else {
    suggestions.push('Add numbers');
  }

  // Check for special characters
  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 0.5;
  } else {
    suggestions.push('Add special characters (!@#$%^&*)');
  }

  // Bonus for variety
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (hasLowercase && hasUppercase && hasNumber && hasSpecial) {
    score += 0.5;
  }

  // Cap score at 4
  score = Math.min(4, Math.round(score));

  return {
    score,
    label: getStrengthLabel(score),
    color: getStrengthColor(score),
    suggestions,
  };
}

function getStrengthLabel(score: number): string {
  switch (score) {
    case 0:
      return 'Very Weak';
    case 1:
      return 'Weak';
    case 2:
      return 'Fair';
    case 3:
      return 'Good';
    case 4:
      return 'Strong';
    default:
      return 'Unknown';
  }
}

function getStrengthColor(score: number): string {
  switch (score) {
    case 0:
      return 'bg-red-500';
    case 1:
      return 'bg-orange-500';
    case 2:
      return 'bg-yellow-500';
    case 3:
      return 'bg-green-500';
    case 4:
      return 'bg-emerald-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Check if password meets minimum requirements
 */
export function isPasswordValid(password: string): boolean {
  return password.length >= MIN_LENGTH;
}

/**
 * Check if password is strong (score >= 3)
 */
export function isPasswordStrong(password: string): boolean {
  const strength = calculatePasswordStrength(password);
  return strength.score >= 3;
}

/**
 * Get password strength percentage (0-100)
 */
export function getPasswordStrengthPercentage(password: string): number {
  const strength = calculatePasswordStrength(password);
  return (strength.score / 4) * 100;
}