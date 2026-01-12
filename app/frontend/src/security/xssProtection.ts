/**
 * XSS Protection Module
 * Provides input sanitization and Content Security Policy helpers
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        ALLOW_DATA_ATTR: false,
    });
}

/**
 * Sanitize user input for display
 * Removes all HTML tags and special characters
 */
export function sanitizeInput(input: string): string {
    if (!input) return '';

    // Remove all HTML tags
    let sanitized = input.replace(/<[^>]*>/g, '');

    // Encode special characters
    sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');

    return sanitized;
}

/**
 * Validate and sanitize Ethereum address
 */
export function sanitizeAddress(address: string): string {
    if (!address) return '';

    // Remove any non-hex characters except 0x prefix
    const cleaned = address.toLowerCase().replace(/[^0-9a-fx]/g, '');

    // Ensure it starts with 0x
    if (!cleaned.startsWith('0x')) {
        return '0x' + cleaned;
    }

    // Ensure it's the correct length (42 characters including 0x)
    if (cleaned.length !== 42) {
        throw new Error('Invalid address length');
    }

    return cleaned;
}

/**
 * Validate and sanitize amount input
 */
export function sanitizeAmount(amount: string): string {
    if (!amount) return '0';

    // Remove any non-numeric characters except decimal point
    const cleaned = amount.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
        return parts[0] + '.' + parts.slice(1).join('');
    }

    // Ensure positive number
    const num = parseFloat(cleaned);
    if (isNaN(num) || num < 0) {
        return '0';
    }

    return cleaned;
}

/**
 * Validate and sanitize mnemonic phrase
 */
export function sanitizeMnemonic(mnemonic: string): string {
    if (!mnemonic) return '';

    // Remove extra whitespace and convert to lowercase
    const cleaned = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');

    // Only allow letters and spaces
    const sanitized = cleaned.replace(/[^a-z ]/g, '');

    return sanitized;
}

/**
 * Validate and sanitize private key
 */
export function sanitizePrivateKey(privateKey: string): string {
    if (!privateKey) return '';

    // Remove any non-hex characters except 0x prefix
    let cleaned = privateKey.toLowerCase().replace(/[^0-9a-fx]/g, '');

    // Remove 0x prefix if present
    if (cleaned.startsWith('0x')) {
        cleaned = cleaned.slice(2);
    }

    // Ensure it's exactly 64 hex characters
    if (cleaned.length !== 64) {
        throw new Error('Invalid private key length');
    }

    return '0x' + cleaned;
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 */
export function sanitizeURL(url: string): string {
    if (!url) return '';

    const cleaned = url.trim().toLowerCase();

    // Block dangerous protocols
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    for (const protocol of dangerousProtocols) {
        if (cleaned.startsWith(protocol)) {
            throw new Error('Dangerous URL protocol detected');
        }
    }

    // Only allow http, https, and ipfs
    if (!cleaned.startsWith('http://') &&
        !cleaned.startsWith('https://') &&
        !cleaned.startsWith('ipfs://')) {
        throw new Error('Invalid URL protocol');
    }

    return url.trim();
}

/**
 * Content Security Policy configuration
 */
export const CSP_CONFIG = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // TODO: Remove unsafe-inline and unsafe-eval
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'https:', 'ipfs:'],
    'connect-src': [
        "'self'",
        'https://*.infura.io',
        'https://*.alchemy.com',
        'https://*.etherscan.io',
        'wss://*.infura.io',
        'wss://*.alchemy.com',
    ],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
};

/**
 * Generate CSP header string
 */
export function generateCSPHeader(): string {
    return Object.entries(CSP_CONFIG)
        .map(([directive, sources]) => {
            if (sources.length === 0) {
                return directive;
            }
            return `${directive} ${sources.join(' ')}`;
        })
        .join('; ');
}

/**
 * Validate clipboard content before pasting
 */
export async function validateClipboardContent(
    content: string,
    expectedType: 'address' | 'privateKey' | 'mnemonic' | 'amount'
): Promise<{ valid: boolean; sanitized?: string; error?: string }> {
    try {
        let sanitized: string;

        switch (expectedType) {
            case 'address':
                sanitized = sanitizeAddress(content);
                break;
            case 'privateKey':
                sanitized = sanitizePrivateKey(content);
                break;
            case 'mnemonic':
                sanitized = sanitizeMnemonic(content);
                break;
            case 'amount':
                sanitized = sanitizeAmount(content);
                break;
            default:
                return { valid: false, error: 'Unknown content type' };
        }

        return { valid: true, sanitized };
    } catch (error) {
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Validation failed',
        };
    }
}

/**
 * Escape HTML entities for safe display
 */
export function escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Remove potentially dangerous attributes from objects
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized = { ...obj };

    // Remove __proto__, constructor, and prototype
    delete (sanitized as any).__proto__;
    delete (sanitized as any).constructor;
    delete (sanitized as any).prototype;

    return sanitized;
}
