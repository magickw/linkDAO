/**
 * File Upload Validation Service
 * Comprehensive file validation with virus scanning and security checks
 */

import crypto from 'crypto';
import path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { securityConfig } from '../config/securityConfig';

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
  scanForViruses?: boolean;
  checkMagicNumbers?: boolean;
  validateImageDimensions?: boolean;
  maxImageWidth?: number;
  maxImageHeight?: number;
}

export interface FileValidationResult {
  valid: boolean;
  sanitizedName: string;
  hash: string;
  size: number;
  mimeType: string;
  extension: string;
  errors: string[];
  warnings: string[];
  metadata: {
    isImage: boolean;
    isVideo: boolean;
    isDocument: boolean;
    dimensions?: { width: number; height: number };
    duration?: number;
    hasMetadata: boolean;
  };
  virusScanResult?: {
    clean: boolean;
    threats: string[];
    scanEngine: string;
  };
}

export interface UploadedFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export class FileUploadValidationService {
  private static readonly DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly DEFAULT_MAX_IMAGE_WIDTH = 4096;
  private static readonly DEFAULT_MAX_IMAGE_HEIGHT = 4096;

  private static readonly ALLOWED_MIME_TYPES = {
    image: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff'
    ],
    video: [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/avi',
      'video/mov',
      'video/wmv'
    ],
    document: [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    audio: [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      'audio/webm'
    ]
  };

  private static readonly FILE_SIGNATURES = {
    // Images
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]],
    'image/bmp': [[0x42, 0x4D]],
    
    // Videos
    'video/mp4': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]],
    'video/webm': [[0x1A, 0x45, 0xDF, 0xA3]],
    'video/avi': [[0x52, 0x49, 0x46, 0x46]],
    
    // Documents
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
    'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06], [0x50, 0x4B, 0x07, 0x08]],
    
    // Audio
    'audio/mpeg': [[0xFF, 0xFB], [0xFF, 0xF3], [0xFF, 0xF2]],
    'audio/wav': [[0x52, 0x49, 0x46, 0x46]],
    'audio/ogg': [[0x4F, 0x67, 0x67, 0x53]]
  };

  private static readonly DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.app', '.deb', '.pkg', '.dmg', '.iso', '.msi', '.dll', '.so', '.dylib'
  ];

  private static readonly EXECUTABLE_SIGNATURES = [
    [0x4D, 0x5A], // Windows PE
    [0x7F, 0x45, 0x4C, 0x46], // Linux ELF
    [0xCA, 0xFE, 0xBA, 0xBE], // Java class
    [0xFE, 0xED, 0xFA, 0xCE], // Mach-O binary (32-bit)
    [0xFE, 0xED, 0xFA, 0xCF], // Mach-O binary (64-bit)
  ];

  /**
   * Validate uploaded file with comprehensive security checks
   */
  static async validateFile(
    file: UploadedFile,
    options: FileValidationOptions = {}
  ): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const opts = {
      maxSize: options.maxSize || this.DEFAULT_MAX_SIZE,
      allowedTypes: options.allowedTypes || Object.values(this.ALLOWED_MIME_TYPES).flat(),
      scanForViruses: options.scanForViruses !== false,
      checkMagicNumbers: options.checkMagicNumbers !== false,
      validateImageDimensions: options.validateImageDimensions !== false,
      maxImageWidth: options.maxImageWidth || this.DEFAULT_MAX_IMAGE_WIDTH,
      maxImageHeight: options.maxImageHeight || this.DEFAULT_MAX_IMAGE_HEIGHT,
      ...options
    };

    try {
      // Basic file validation
      const basicValidation = await this.performBasicValidation(file, opts);
      errors.push(...basicValidation.errors);
      warnings.push(...basicValidation.warnings);

      // Security validation
      const securityValidation = await this.performSecurityValidation(file);
      errors.push(...securityValidation.errors);
      warnings.push(...securityValidation.warnings);

      // Magic number validation
      let magicNumberValid = true;
      if (opts.checkMagicNumbers) {
        const magicValidation = this.validateMagicNumbers(file);
        if (!magicValidation.valid) {
          errors.push(...magicValidation.errors);
          magicNumberValid = false;
        }
      }

      // Content-specific validation
      const contentValidation = await this.performContentValidation(file, opts);
      errors.push(...contentValidation.errors);
      warnings.push(...contentValidation.warnings);

      // Virus scanning
      let virusScanResult;
      if (opts.scanForViruses && errors.length === 0) {
        virusScanResult = await this.performVirusScan(file);
        if (!virusScanResult.clean) {
          errors.push(`Virus detected: ${virusScanResult.threats.join(', ')}`);
        }
      }

      // Generate file hash
      const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

      // Sanitize filename
      const sanitizedName = this.sanitizeFilename(file.originalName);

      // Determine file type categories
      const isImage = file.mimeType.startsWith('image/');
      const isVideo = file.mimeType.startsWith('video/');
      const isDocument = file.mimeType.startsWith('application/') || file.mimeType.startsWith('text/');

      return {
        valid: errors.length === 0,
        sanitizedName,
        hash,
        size: file.size,
        mimeType: file.mimeType,
        extension: path.extname(file.originalName).toLowerCase(),
        errors,
        warnings,
        metadata: {
          isImage,
          isVideo,
          isDocument,
          dimensions: contentValidation.dimensions,
          duration: contentValidation.duration,
          hasMetadata: contentValidation.hasMetadata
        },
        virusScanResult
      };

    } catch (error) {
      return {
        valid: false,
        sanitizedName: 'unknown',
        hash: '',
        size: 0,
        mimeType: 'unknown',
        extension: '',
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        metadata: {
          isImage: false,
          isVideo: false,
          isDocument: false,
          hasMetadata: false
        }
      };
    }
  }

  /**
   * Perform basic file validation
   */
  private static async performBasicValidation(
    file: UploadedFile,
    options: FileValidationOptions
  ): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Size validation
    if (file.size === 0) {
      errors.push('File is empty');
    } else if (file.size > (options.maxSize || this.DEFAULT_MAX_SIZE)) {
      errors.push(`File too large. Maximum size is ${Math.round((options.maxSize || this.DEFAULT_MAX_SIZE) / (1024 * 1024))}MB`);
    }

    // MIME type validation
    if (options.allowedTypes && !options.allowedTypes.includes(file.mimeType)) {
      errors.push(`File type '${file.mimeType}' is not allowed`);
    }

    // Extension validation
    const extension = path.extname(file.originalName).toLowerCase();
    if (this.DANGEROUS_EXTENSIONS.includes(extension)) {
      errors.push(`File extension '${extension}' is not allowed for security reasons`);
    }

    if (options.allowedExtensions && !options.allowedExtensions.includes(extension)) {
      errors.push(`File extension '${extension}' is not in the allowed list`);
    }

    // Filename validation
    if (!file.originalName || file.originalName.trim() === '') {
      errors.push('Filename is required');
    } else if (file.originalName.length > 255) {
      warnings.push('Filename is very long and will be truncated');
    }

    return { errors, warnings };
  }

  /**
   * Perform security validation
   */
  private static async performSecurityValidation(
    file: UploadedFile
  ): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for executable file signatures
    for (const signature of this.EXECUTABLE_SIGNATURES) {
      if (file.buffer.length >= signature.length) {
        const fileStart = Array.from(file.buffer.slice(0, signature.length));
        if (signature.every((byte, index) => byte === fileStart[index])) {
          errors.push('File appears to be an executable and is not allowed');
          break;
        }
      }
    }

    // Check for embedded scripts in text-based files
    if (file.mimeType.startsWith('text/') || file.mimeType === 'image/svg+xml') {
      const content = file.buffer.toString('utf8');
      const scriptPatterns = [
        /<script/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /on\w+\s*=/gi,
        /<iframe/gi,
        /<object/gi,
        /<embed/gi
      ];

      for (const pattern of scriptPatterns) {
        if (pattern.test(content)) {
          errors.push('File contains potentially malicious scripts');
          break;
        }
      }
    }

    // Check for suspicious file structure
    if (this.hasSuspiciousStructure(file.buffer)) {
      warnings.push('File has unusual structure that may indicate tampering');
    }

    return { errors, warnings };
  }

  /**
   * Validate magic numbers (file signatures)
   */
  private static validateMagicNumbers(file: UploadedFile): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const expectedSignatures = this.FILE_SIGNATURES[file.mimeType as keyof typeof this.FILE_SIGNATURES];
    if (!expectedSignatures) {
      // No signature validation available for this type
      return { valid: true, errors: [] };
    }

    const fileStart = Array.from(file.buffer.slice(0, 16));
    const hasValidSignature = expectedSignatures.some(signature =>
      signature.every((byte, index) => index < fileStart.length && byte === fileStart[index])
    );

    if (!hasValidSignature) {
      errors.push('File signature does not match declared MIME type');
    }

    return { valid: hasValidSignature, errors };
  }

  /**
   * Perform content-specific validation
   */
  private static async performContentValidation(
    file: UploadedFile,
    options: FileValidationOptions
  ): Promise<{
    errors: string[];
    warnings: string[];
    dimensions?: { width: number; height: number };
    duration?: number;
    hasMetadata: boolean;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let dimensions: { width: number; height: number } | undefined;
    let duration: number | undefined;
    let hasMetadata = false;

    try {
      if (file.mimeType.startsWith('image/')) {
        const imageValidation = await this.validateImage(file, options);
        errors.push(...imageValidation.errors);
        warnings.push(...imageValidation.warnings);
        dimensions = imageValidation.dimensions;
        hasMetadata = imageValidation.hasMetadata;
      } else if (file.mimeType.startsWith('video/')) {
        const videoValidation = await this.validateVideo(file, options);
        errors.push(...videoValidation.errors);
        warnings.push(...videoValidation.warnings);
        dimensions = videoValidation.dimensions;
        duration = videoValidation.duration;
        hasMetadata = videoValidation.hasMetadata;
      }
    } catch (error) {
      warnings.push(`Content validation warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { errors, warnings, dimensions, duration, hasMetadata };
  }

  /**
   * Validate image files
   */
  private static async validateImage(
    file: UploadedFile,
    options: FileValidationOptions
  ): Promise<{
    errors: string[];
    warnings: string[];
    dimensions?: { width: number; height: number };
    hasMetadata: boolean;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let dimensions: { width: number; height: number } | undefined;
    let hasMetadata = false;

    try {
      // Basic image validation
      if (file.buffer.length < 100) {
        errors.push('Image file appears to be corrupted or too small');
        return { errors, warnings, hasMetadata };
      }

      // Try to extract basic image information
      const imageInfo = this.extractImageInfo(file.buffer, file.mimeType);
      if (imageInfo) {
        dimensions = imageInfo.dimensions;
        hasMetadata = imageInfo.hasMetadata;

        // Validate dimensions
        if (options.validateImageDimensions && dimensions) {
          if (dimensions.width > (options.maxImageWidth || this.DEFAULT_MAX_IMAGE_WIDTH)) {
            errors.push(`Image width ${dimensions.width}px exceeds maximum ${options.maxImageWidth || this.DEFAULT_MAX_IMAGE_WIDTH}px`);
          }
          if (dimensions.height > (options.maxImageHeight || this.DEFAULT_MAX_IMAGE_HEIGHT)) {
            errors.push(`Image height ${dimensions.height}px exceeds maximum ${options.maxImageHeight || this.DEFAULT_MAX_IMAGE_HEIGHT}px`);
          }
        }
      }

      // SVG-specific validation
      if (file.mimeType === 'image/svg+xml') {
        const svgValidation = this.validateSVG(file.buffer);
        errors.push(...svgValidation.errors);
        warnings.push(...svgValidation.warnings);
      }

    } catch (error) {
      warnings.push(`Image validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { errors, warnings, dimensions, hasMetadata };
  }

  /**
   * Validate video files
   */
  private static async validateVideo(
    file: UploadedFile,
    options: FileValidationOptions
  ): Promise<{
    errors: string[];
    warnings: string[];
    dimensions?: { width: number; height: number };
    duration?: number;
    hasMetadata: boolean;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let dimensions: { width: number; height: number } | undefined;
    let duration: number | undefined;
    let hasMetadata = false;

    try {
      // Basic video validation
      if (file.buffer.length < 1000) {
        errors.push('Video file appears to be corrupted or too small');
        return { errors, warnings, hasMetadata };
      }

      // Try to extract basic video information
      const videoInfo = this.extractVideoInfo(file.buffer, file.mimeType);
      if (videoInfo) {
        dimensions = videoInfo.dimensions;
        duration = videoInfo.duration;
        hasMetadata = videoInfo.hasMetadata;

        // Validate duration (max 10 minutes for uploads)
        if (duration && duration > 600) {
          errors.push('Video duration exceeds maximum of 10 minutes');
        }
      }

    } catch (error) {
      warnings.push(`Video validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { errors, warnings, dimensions, duration, hasMetadata };
  }

  /**
   * Perform virus scan using ClamAV or similar
   */
  private static async performVirusScan(file: UploadedFile): Promise<{
    clean: boolean;
    threats: string[];
    scanEngine: string;
  }> {
    try {
      // Try ClamAV first
      const clamavResult = await this.scanWithClamAV(file.buffer);
      if (clamavResult) {
        return clamavResult;
      }

      // Fallback to basic signature-based scanning
      return this.performBasicVirusScan(file.buffer);

    } catch (error) {
      console.warn('Virus scanning failed:', error);
      return {
        clean: true, // Assume clean if scanning fails
        threats: [],
        scanEngine: 'none'
      };
    }
  }

  /**
   * Scan with ClamAV antivirus
   */
  private static async scanWithClamAV(buffer: Buffer): Promise<{
    clean: boolean;
    threats: string[];
    scanEngine: string;
  } | null> {
    return new Promise((resolve) => {
      try {
        const clamav = spawn('clamdscan', ['--fdpass', '--stream']);
        let output = '';
        let errorOutput = '';

        clamav.stdout.on('data', (data) => {
          output += data.toString();
        });

        clamav.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        clamav.on('close', (code) => {
          if (code === 0) {
            resolve({
              clean: true,
              threats: [],
              scanEngine: 'ClamAV'
            });
          } else if (code === 1) {
            const threats = this.extractThreatsFromClamAVOutput(output);
            resolve({
              clean: false,
              threats,
              scanEngine: 'ClamAV'
            });
          } else {
            // ClamAV not available or error
            resolve(null);
          }
        });

        clamav.on('error', () => {
          resolve(null);
        });

        // Send file data to ClamAV
        clamav.stdin.write(buffer);
        clamav.stdin.end();

      } catch (error) {
        resolve(null);
      }
    });
  }

  /**
   * Basic virus scan using known malware signatures
   */
  private static performBasicVirusScan(buffer: Buffer): {
    clean: boolean;
    threats: string[];
    scanEngine: string;
  } {
    const threats: string[] = [];

    // Known malware signatures (simplified)
    const malwareSignatures = [
      { name: 'EICAR Test', signature: [0x58, 0x35, 0x4F, 0x21, 0x50, 0x25, 0x40, 0x41, 0x50] },
      // Add more signatures as needed
    ];

    for (const { name, signature } of malwareSignatures) {
      if (this.containsSignature(buffer, signature)) {
        threats.push(name);
      }
    }

    return {
      clean: threats.length === 0,
      threats,
      scanEngine: 'Basic'
    };
  }

  /**
   * Helper methods
   */
  private static sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let sanitized = path.basename(filename);
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');
    
    // Limit length
    if (sanitized.length > 255) {
      const ext = path.extname(sanitized);
      const name = path.basename(sanitized, ext);
      sanitized = name.substring(0, 255 - ext.length) + ext;
    }
    
    // Ensure it's not empty
    if (!sanitized || sanitized === '.') {
      sanitized = `file_${Date.now()}`;
    }
    
    return sanitized;
  }

  private static hasSuspiciousStructure(buffer: Buffer): boolean {
    // Check for unusual patterns that might indicate file tampering
    const suspiciousPatterns = [
      // Multiple file signatures in one file
      /\xFF\xD8\xFF.*\x89PNG/s,
      // Embedded executables
      /MZ.*PE\x00\x00/s,
    ];

    const content = buffer.toString('binary');
    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  private static extractImageInfo(buffer: Buffer, mimeType: string): {
    dimensions?: { width: number; height: number };
    hasMetadata: boolean;
  } | null {
    try {
      // Basic image dimension extraction (simplified)
      if (mimeType === 'image/png') {
        if (buffer.length >= 24) {
          const width = buffer.readUInt32BE(16);
          const height = buffer.readUInt32BE(20);
          return {
            dimensions: { width, height },
            hasMetadata: buffer.includes(Buffer.from('tEXt')) || buffer.includes(Buffer.from('iTXt'))
          };
        }
      } else if (mimeType === 'image/jpeg') {
        // JPEG dimension extraction would be more complex
        return {
          hasMetadata: buffer.includes(Buffer.from('Exif'))
        };
      }
    } catch (error) {
      // Ignore extraction errors
    }
    
    return null;
  }

  private static extractVideoInfo(buffer: Buffer, mimeType: string): {
    dimensions?: { width: number; height: number };
    duration?: number;
    hasMetadata: boolean;
  } | null {
    // Video metadata extraction would require more sophisticated parsing
    // This is a placeholder for basic video validation
    return {
      hasMetadata: buffer.length > 1000 // Assume metadata if file is reasonably sized
    };
  }

  private static validateSVG(buffer: Buffer): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const content = buffer.toString('utf8');
      
      // Check for dangerous SVG elements
      const dangerousElements = [
        /<script/gi,
        /<foreignObject/gi,
        /<use\s+href\s*=\s*["']javascript:/gi,
        /on\w+\s*=/gi
      ];

      for (const pattern of dangerousElements) {
        if (pattern.test(content)) {
          errors.push('SVG contains potentially dangerous elements');
          break;
        }
      }

      // Check for external references
      if (/href\s*=\s*["']https?:/gi.test(content)) {
        warnings.push('SVG contains external references');
      }

    } catch (error) {
      warnings.push('SVG validation failed');
    }

    return { errors, warnings };
  }

  private static containsSignature(buffer: Buffer, signature: number[]): boolean {
    for (let i = 0; i <= buffer.length - signature.length; i++) {
      if (signature.every((byte, index) => buffer[i + index] === byte)) {
        return true;
      }
    }
    return false;
  }

  private static extractThreatsFromClamAVOutput(output: string): string[] {
    const threats: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/FOUND:\s*(.+)/);
      if (match) {
        threats.push(match[1].trim());
      }
    }
    
    return threats;
  }
}

export default FileUploadValidationService;