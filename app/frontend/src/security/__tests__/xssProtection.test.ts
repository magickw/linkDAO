/**
 * XSS Protection Tests
 * Tests for input sanitization and XSS prevention
 */

import {
    sanitizeHTML,
    sanitizeInput,
    sanitizeAddress,
    sanitizeAmount,
    sanitizeMnemonic,
    sanitizePrivateKey,
    sanitizeURL,
    validateClipboardContent,
    escapeHTML,
} from '../xssProtection';

describe('XSS Protection', () => {
    describe('sanitizeHTML', () => {
        it('should allow safe HTML tags', () => {
            const input = '<p>Hello <strong>World</strong></p>';
            const result = sanitizeHTML(input);
            expect(result).toContain('<p>');
            expect(result).toContain('<strong>');
        });

        it('should remove script tags', () => {
            const input = '<p>Hello</p><script>alert("XSS")</script>';
            const result = sanitizeHTML(input);
            expect(result).not.toContain('<script>');
            expect(result).not.toContain('alert');
        });

        it('should remove dangerous attributes', () => {
            const input = '<a href="javascript:alert(1)">Click</a>';
            const result = sanitizeHTML(input);
            expect(result).not.toContain('javascript:');
        });
    });

    describe('sanitizeInput', () => {
        it('should escape HTML entities', () => {
            const input = '<script>alert("XSS")</script>';
            const result = sanitizeInput(input);
            expect(result).toContain('&lt;');
            expect(result).toContain('&gt;');
            expect(result).not.toContain('<script>');
        });

        it('should handle special characters', () => {
            const input = '& < > " \' /';
            const result = sanitizeInput(input);
            expect(result).toBe('&amp; &lt; &gt; &quot; &#x27; &#x2F;');
        });

        it('should handle empty string', () => {
            expect(sanitizeInput('')).toBe('');
        });
    });

    describe('sanitizeAddress', () => {
        it('should format valid address', () => {
            const input = '0x1234567890123456789012345678901234567890';
            const result = sanitizeAddress(input);
            expect(result).toBe('0x1234567890123456789012345678901234567890');
        });

        it('should add 0x prefix if missing', () => {
            const input = '1234567890123456789012345678901234567890';
            const result = sanitizeAddress(input);
            expect(result).toMatch(/^0x/);
        });

        it('should convert to lowercase', () => {
            const input = '0xABCDEF1234567890123456789012345678901234';
            const result = sanitizeAddress(input);
            expect(result).toBe('0xabcdef1234567890123456789012345678901234');
        });

        it('should throw on invalid length', () => {
            const input = '0x1234'; // Too short
            expect(() => sanitizeAddress(input)).toThrow('Invalid address length');
        });

        it('should remove non-hex characters', () => {
            const input = '0x12g34h56i78j90k12l34m56n78o90p12q34r56s78t';
            const result = sanitizeAddress(input);
            expect(result).toMatch(/^0x[0-9a-f]{40}$/);
        });
    });

    describe('sanitizeAmount', () => {
        it('should allow valid decimal numbers', () => {
            expect(sanitizeAmount('123.456')).toBe('123.456');
        });

        it('should remove non-numeric characters', () => {
            expect(sanitizeAmount('$123.45')).toBe('123.45');
        });

        it('should handle multiple decimal points', () => {
            const result = sanitizeAmount('123.45.67');
            expect(result).toBe('123.4567');
        });

        it('should return 0 for negative numbers', () => {
            expect(sanitizeAmount('-123')).toBe('0');
        });

        it('should return 0 for invalid input', () => {
            expect(sanitizeAmount('abc')).toBe('0');
        });

        it('should handle empty string', () => {
            expect(sanitizeAmount('')).toBe('0');
        });
    });

    describe('sanitizeMnemonic', () => {
        it('should normalize whitespace', () => {
            const input = '  word1   word2  word3  ';
            const result = sanitizeMnemonic(input);
            expect(result).toBe('word1 word2 word3');
        });

        it('should convert to lowercase', () => {
            const input = 'Word1 WORD2 WoRd3';
            const result = sanitizeMnemonic(input);
            expect(result).toBe('word1 word2 word3');
        });

        it('should remove non-letter characters', () => {
            const input = 'word1! word2@ word3#';
            const result = sanitizeMnemonic(input);
            expect(result).toBe('word word word');
        });

        it('should handle empty string', () => {
            expect(sanitizeMnemonic('')).toBe('');
        });
    });

    describe('sanitizePrivateKey', () => {
        it('should format valid private key', () => {
            const input = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            const result = sanitizePrivateKey(input);
            expect(result).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
        });

        it('should remove 0x prefix and re-add it', () => {
            const input = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
            const result = sanitizePrivateKey(input);
            expect(result).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
        });

        it('should throw on invalid length', () => {
            const input = '0x1234'; // Too short
            expect(() => sanitizePrivateKey(input)).toThrow('Invalid private key length');
        });

        it('should convert to lowercase', () => {
            const input = 'ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890';
            const result = sanitizePrivateKey(input);
            expect(result).toMatch(/^0x[0-9a-f]{64}$/);
        });
    });

    describe('sanitizeURL', () => {
        it('should allow https URLs', () => {
            const input = 'https://example.com';
            expect(sanitizeURL(input)).toBe(input);
        });

        it('should allow http URLs', () => {
            const input = 'http://example.com';
            expect(sanitizeURL(input)).toBe(input);
        });

        it('should allow ipfs URLs', () => {
            const input = 'ipfs://QmHash';
            expect(sanitizeURL(input)).toBe(input);
        });

        it('should block javascript: URLs', () => {
            const input = 'javascript:alert(1)';
            expect(() => sanitizeURL(input)).toThrow('Dangerous URL protocol detected');
        });

        it('should block data: URLs', () => {
            const input = 'data:text/html,<script>alert(1)</script>';
            expect(() => sanitizeURL(input)).toThrow('Dangerous URL protocol detected');
        });

        it('should block file: URLs', () => {
            const input = 'file:///etc/passwd';
            expect(() => sanitizeURL(input)).toThrow('Dangerous URL protocol detected');
        });

        it('should throw on invalid protocol', () => {
            const input = 'ftp://example.com';
            expect(() => sanitizeURL(input)).toThrow('Invalid URL protocol');
        });
    });

    describe('validateClipboardContent', () => {
        it('should validate address content', async () => {
            const content = '0x1234567890123456789012345678901234567890';
            const result = await validateClipboardContent(content, 'address');
            expect(result.valid).toBe(true);
            expect(result.sanitized).toBeDefined();
        });

        it('should validate amount content', async () => {
            const content = '123.45';
            const result = await validateClipboardContent(content, 'amount');
            expect(result.valid).toBe(true);
            expect(result.sanitized).toBe('123.45');
        });

        it('should validate mnemonic content', async () => {
            const content = 'word1 word2 word3';
            const result = await validateClipboardContent(content, 'mnemonic');
            expect(result.valid).toBe(true);
        });

        it('should reject invalid address', async () => {
            const content = 'invalid-address';
            const result = await validateClipboardContent(content, 'address');
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should reject invalid private key', async () => {
            const content = 'too-short';
            const result = await validateClipboardContent(content, 'privateKey');
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('escapeHTML', () => {
        it('should escape HTML entities', () => {
            const input = '<script>alert("XSS")</script>';
            const result = escapeHTML(input);
            expect(result).not.toContain('<script>');
            expect(result).toContain('&lt;');
            expect(result).toContain('&gt;');
        });

        it('should handle special characters', () => {
            const input = '& < > " \'';
            const result = escapeHTML(input);
            expect(result).toContain('&amp;');
            expect(result).toContain('&lt;');
            expect(result).toContain('&gt;');
        });
    });
});
