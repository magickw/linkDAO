/**
 * File Validation Service
 * Comprehensive file validation including magic number verification
 */

import { safeLogger } from '../utils/safeLogger';
import crypto from 'crypto';

// File signatures (magic numbers) for common file types
const FILE_SIGNATURES: Record<string, { signature: Buffer; offset: number }[]> = {
    // Images
    'image/jpeg': [
        { signature: Buffer.from([0xFF, 0xD8, 0xFF]), offset: 0 }
    ],
    'image/png': [
        { signature: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), offset: 0 }
    ],
    'image/gif': [
        { signature: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), offset: 0 }, // GIF87a
        { signature: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), offset: 0 }  // GIF89a
    ],
    'image/webp': [
        { signature: Buffer.from([0x52, 0x49, 0x46, 0x46]), offset: 0 }, // RIFF
        { signature: Buffer.from([0x57, 0x45, 0x42, 0x50]), offset: 8 }  // WEBP
    ],
    'image/bmp': [
        { signature: Buffer.from([0x42, 0x4D]), offset: 0 } // BM
    ],

    // Documents
    'application/pdf': [
        { signature: Buffer.from([0x25, 0x50, 0x44, 0x46]), offset: 0 } // %PDF
    ],
    'application/zip': [
        { signature: Buffer.from([0x50, 0x4B, 0x03, 0x04]), offset: 0 }, // PK..
        { signature: Buffer.from([0x50, 0x4B, 0x05, 0x06]), offset: 0 }  // PK.. (empty archive)
    ],

    // Video
    'video/mp4': [
        { signature: Buffer.from([0x66, 0x74, 0x79, 0x70]), offset: 4 } // ftyp
    ],
    'video/webm': [
        { signature: Buffer.from([0x1A, 0x45, 0xDF, 0xA3]), offset: 0 }
    ]
};

// Dangerous file extensions that should never be allowed
const DANGEROUS_EXTENSIONS = [
    'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
    'app', 'deb', 'rpm', 'dmg', 'pkg', 'sh', 'bash', 'ps1', 'msi'
];

// Maximum file sizes by type (in bytes)
const MAX_FILE_SIZES: Record<string, number> = {
    'image/jpeg': 10 * 1024 * 1024,      // 10MB
    'image/png': 10 * 1024 * 1024,       // 10MB
    'image/gif': 5 * 1024 * 1024,        // 5MB
    'image/webp': 10 * 1024 * 1024,      // 10MB
    'image/bmp': 5 * 1024 * 1024,        // 5MB
    'application/pdf': 20 * 1024 * 1024, // 20MB
    'video/mp4': 100 * 1024 * 1024,      // 100MB
    'video/webm': 100 * 1024 * 1024,     // 100MB
    'default': 10 * 1024 * 1024          // 10MB default
};

export interface FileValidationResult {
    valid: boolean;
    mimeType?: string;
    extension?: string;
    size?: number;
    errors: string[];
    warnings: string[];
}

export class FileValidationService {
    /**
     * Validate file using magic number verification
     */
    async validateFile(
        fileBuffer: Buffer,
        originalFilename: string,
        declaredMimeType?: string
    ): Promise<FileValidationResult> {
        const result: FileValidationResult = {
            valid: true,
            errors: [],
            warnings: [],
            size: fileBuffer.length
        };

        // Extract extension
        const extension = this.getFileExtension(originalFilename);
        result.extension = extension;

        // Check for dangerous extensions
        if (DANGEROUS_EXTENSIONS.includes(extension.toLowerCase())) {
            result.valid = false;
            result.errors.push(`File extension '${extension}' is not allowed for security reasons`);
            return result;
        }

        // Detect actual MIME type from magic number
        const detectedMimeType = this.detectMimeType(fileBuffer);
        result.mimeType = detectedMimeType;

        // Verify MIME type matches declaration
        if (declaredMimeType && detectedMimeType !== declaredMimeType) {
            result.warnings.push(
                `Declared MIME type '${declaredMimeType}' does not match detected type '${detectedMimeType}'`
            );
        }

        // Check file size
        const maxSize = MAX_FILE_SIZES[detectedMimeType] || MAX_FILE_SIZES.default;
        if (fileBuffer.length > maxSize) {
            result.valid = false;
            result.errors.push(
                `File size ${fileBuffer.length} bytes exceeds maximum ${maxSize} bytes for type ${detectedMimeType}`
            );
        }

        // Special validation for SVG files
        if (extension.toLowerCase() === 'svg' || declaredMimeType === 'image/svg+xml') {
            const svgValidation = this.validateSVG(fileBuffer);
            if (!svgValidation.valid) {
                result.valid = false;
                result.errors.push(...svgValidation.errors);
            }
            result.warnings.push(...svgValidation.warnings);
        }

        // Check for embedded scripts in images
        if (detectedMimeType?.startsWith('image/')) {
            const scriptCheck = this.checkForEmbeddedScripts(fileBuffer);
            if (!scriptCheck.safe) {
                result.valid = false;
                result.errors.push('File contains potentially malicious embedded scripts');
            }
        }

        return result;
    }

    /**
     * Detect MIME type from file magic number
     */
    private detectMimeType(buffer: Buffer): string {
        for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
            for (const { signature, offset } of signatures) {
                if (this.checkSignature(buffer, signature, offset)) {
                    return mimeType;
                }
            }
        }
        return 'application/octet-stream'; // Unknown type
    }

    /**
     * Check if buffer matches signature at offset
     */
    private checkSignature(buffer: Buffer, signature: Buffer, offset: number): boolean {
        if (buffer.length < offset + signature.length) {
            return false;
        }

        for (let i = 0; i < signature.length; i++) {
            if (buffer[offset + i] !== signature[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get file extension from filename
     */
    private getFileExtension(filename: string): string {
        const parts = filename.split('.');
        return parts.length > 1 ? parts[parts.length - 1] : '';
    }

    /**
     * Validate SVG file for malicious content
     */
    private validateSVG(buffer: Buffer): { valid: boolean; errors: string[]; warnings: string[] } {
        const result = { valid: true, errors: [] as string[], warnings: [] as string[] };
        const content = buffer.toString('utf8');

        // Check for script tags
        if (/<script/i.test(content)) {
            result.valid = false;
            result.errors.push('SVG contains script tags');
        }

        // Check for event handlers
        const eventHandlers = /on\w+\s*=/i;
        if (eventHandlers.test(content)) {
            result.valid = false;
            result.errors.push('SVG contains event handlers');
        }

        // Check for external references
        if (/xlink:href\s*=\s*["'](?!#|data:)/i.test(content)) {
            result.warnings.push('SVG contains external references');
        }

        // Check for embedded data URIs with scripts
        if (/data:text\/html/i.test(content) || /data:application\/javascript/i.test(content)) {
            result.valid = false;
            result.errors.push('SVG contains potentially malicious data URIs');
        }

        return result;
    }

    /**
     * Check for embedded scripts in binary files
     */
    private checkForEmbeddedScripts(buffer: Buffer): { safe: boolean } {
        const content = buffer.toString('utf8', 0, Math.min(buffer.length, 10000)); // Check first 10KB

        // Look for common script patterns
        const scriptPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /eval\(/i,
            /Function\(/i
        ];

        for (const pattern of scriptPatterns) {
            if (pattern.test(content)) {
                safeLogger.warn('[FileValidation] Detected potential script in file');
                return { safe: false };
            }
        }

        return { safe: true };
    }

    /**
     * Sanitize filename to prevent path traversal
     */
    sanitizeFilename(filename: string): string {
        // Remove path separators and null bytes
        let sanitized = filename.replace(/[\/\\]/g, '_').replace(/\0/g, '');

        // Remove leading dots
        sanitized = sanitized.replace(/^\.+/, '');

        // Limit length
        if (sanitized.length > 255) {
            const ext = this.getFileExtension(sanitized);
            const nameWithoutExt = sanitized.substring(0, sanitized.length - ext.length - 1);
            sanitized = nameWithoutExt.substring(0, 250) + '.' + ext;
        }

        return sanitized || 'unnamed';
    }

    /**
     * Generate secure filename with hash
     */
    generateSecureFilename(originalFilename: string, userId?: string): string {
        const extension = this.getFileExtension(originalFilename);
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        const hash = crypto
            .createHash('sha256')
            .update(`${originalFilename}${timestamp}${random}${userId || ''}`)
            .digest('hex')
            .substring(0, 16);

        return `${hash}_${timestamp}.${extension}`;
    }

    /**
     * Check if file type is allowed
     */
    isFileTypeAllowed(mimeType: string, allowedTypes: string[]): boolean {
        return allowedTypes.some(allowed => {
            if (allowed.endsWith('/*')) {
                const prefix = allowed.substring(0, allowed.length - 2);
                return mimeType.startsWith(prefix);
            }
            return mimeType === allowed;
        });
    }
}

// Singleton instance
export const fileValidationService = new FileValidationService();
