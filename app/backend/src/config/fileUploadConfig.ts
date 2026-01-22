/**
 * File Upload Configuration
 * Defines allowed/blocked file types, size limits, and security policies
 */

export const FILE_UPLOAD_CONFIG = {
    // Allowed MIME types by category
    allowedMimeTypes: {
        images: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            'image/bmp',
            'image/tiff'
        ],
        documents: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/vnd.oasis.opendocument.text', // .odt
            'text/plain',
            'text/markdown',
            'text/csv'
        ],
        spreadsheets: [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.oasis.opendocument.spreadsheet', // .ods
            'text/csv'
        ],
        presentations: [
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
            'application/vnd.oasis.opendocument.presentation' // .odp
        ],
        audio: [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/ogg',
            'audio/webm',
            'audio/aac',
            'audio/flac'
        ],
        video: [
            'video/mp4',
            'video/webm',
            'video/ogg',
            'video/quicktime',
            'video/x-msvideo'
        ],
        archives: [
            'application/zip',
            'application/x-zip-compressed',
            'application/x-rar-compressed',
            'application/x-7z-compressed',
            'application/gzip',
            'application/x-tar'
        ]
    },

    // Blocked file extensions (executable files and scripts)
    blockedExtensions: [
        // Windows executables
        '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
        '.application', '.gadget', '.msi', '.msp',

        // Scripts
        '.vbs', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
        '.ps1', '.ps1xml', '.ps2', '.ps2xml', '.psc1', '.psc2',
        '.msh', '.msh1', '.msh2', '.mshxml', '.msh1xml', '.msh2xml',

        // Java
        '.jar', '.class',

        // macOS
        '.app', '.dmg', '.pkg',

        // Linux
        '.sh', '.run', '.bin',

        // Other dangerous types
        '.dll', '.sys', '.drv', '.ocx',
        '.cpl', '.scf', '.lnk', '.inf',
        '.reg', '.vb', '.vbe'
    ],

    // Maximum file sizes by category (in bytes)
    maxFileSizes: {
        image: 25 * 1024 * 1024, // 25MB
        document: 50 * 1024 * 1024, // 50MB
        spreadsheet: 50 * 1024 * 1024, // 50MB
        presentation: 100 * 1024 * 1024, // 100MB
        audio: 10 * 1024 * 1024, // 10MB (voice messages)
        video: 100 * 1024 * 1024, // 100MB
        archive: 100 * 1024 * 1024, // 100MB
        default: 25 * 1024 * 1024 // 25MB default
    },

    // Virus scanning configuration
    virusScanning: {
        enabled: process.env.ENABLE_VIRUS_SCANNING !== 'false',
        quarantineInfected: process.env.QUARANTINE_INFECTED_FILES !== 'false',
        scanTimeout: 30000, // 30 seconds
        maxRetries: 2
    },

    // Deduplication settings
    deduplication: {
        enabled: true,
        algorithm: 'sha256' as const,
        trackUsageCount: true
    },

    // Security policies
    security: {
        validateMagicNumbers: true, // Verify file type by content, not just extension
        rejectSpoofedMimeTypes: true,
        maxFilenameLength: 255,
        sanitizeFilenames: true
    }
} as const;

// Helper to get all allowed MIME types as a flat array
export function getAllowedMimeTypes(): string[] {
    return Object.values(FILE_UPLOAD_CONFIG.allowedMimeTypes).flat();
}

// Helper to check if a MIME type is allowed
export function isMimeTypeAllowed(mimeType: string): boolean {
    const allowed = getAllowedMimeTypes();
    return allowed.includes(mimeType.toLowerCase());
}

// Helper to check if an extension is blocked
export function isExtensionBlocked(filename: string): boolean {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return FILE_UPLOAD_CONFIG.blockedExtensions.includes(ext);
}

// Helper to get max file size for a MIME type
export function getMaxFileSize(mimeType: string): number {
    const type = mimeType.split('/')[0];

    if (mimeType.startsWith('image/')) return FILE_UPLOAD_CONFIG.maxFileSizes.image;
    if (mimeType.startsWith('audio/')) return FILE_UPLOAD_CONFIG.maxFileSizes.audio;
    if (mimeType.startsWith('video/')) return FILE_UPLOAD_CONFIG.maxFileSizes.video;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
        return FILE_UPLOAD_CONFIG.maxFileSizes.document;
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        return FILE_UPLOAD_CONFIG.maxFileSizes.spreadsheet;
    }
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
        return FILE_UPLOAD_CONFIG.maxFileSizes.presentation;
    }
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gzip')) {
        return FILE_UPLOAD_CONFIG.maxFileSizes.archive;
    }

    return FILE_UPLOAD_CONFIG.maxFileSizes.default;
}

export default FILE_UPLOAD_CONFIG;
