/**
 * Link validation and preview utilities
 */

export interface LinkMetadata {
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
    url: string;
    type: 'website' | 'ipfs' | 'document' | 'unknown';
}

/**
 * Validate if a string is a valid URL
 */
export function validateURL(url: string): boolean {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const urlObj = new URL(url);
        return ['http:', 'https:', 'ipfs:'].includes(urlObj.protocol);
    } catch {
        // Check if it's an IPFS hash without protocol
        if (isIPFSHash(url)) {
            return true;
        }
        return false;
    }
}

/**
 * Check if URL is an IPFS link
 */
export function isIPFSLink(url: string): boolean {
    if (!url) return false;

    // Check for ipfs:// protocol
    if (url.startsWith('ipfs://')) {
        return true;
    }

    // Check for IPFS gateway URLs
    const ipfsGateways = [
        'ipfs.io/ipfs/',
        'gateway.pinata.cloud/ipfs/',
        'cloudflare-ipfs.com/ipfs/',
        'dweb.link/ipfs/',
    ];

    return ipfsGateways.some(gateway => url.includes(gateway));
}

/**
 * Check if string is a valid IPFS hash (CID)
 */
export function isIPFSHash(hash: string): boolean {
    if (!hash) return false;

    // CIDv0: Qm followed by 44 base58 characters
    const cidV0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;

    // CIDv1: starts with b (base32) or z (base58)
    const cidV1Regex = /^(b[a-z2-7]{58}|z[1-9A-HJ-NP-Za-km-z]{48,})$/;

    return cidV0Regex.test(hash) || cidV1Regex.test(hash);
}

/**
 * Extract IPFS hash from URL
 */
export function extractIPFSHash(url: string): string | null {
    if (!url) return null;

    // Handle ipfs:// protocol
    if (url.startsWith('ipfs://')) {
        const hash = url.replace('ipfs://', '');
        return isIPFSHash(hash) ? hash : null;
    }

    // Handle gateway URLs
    const ipfsMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    if (ipfsMatch && ipfsMatch[1]) {
        return isIPFSHash(ipfsMatch[1]) ? ipfsMatch[1] : null;
    }

    // Check if the entire string is an IPFS hash
    if (isIPFSHash(url)) {
        return url;
    }

    return null;
}

/**
 * Normalize URL (add protocol if missing, handle IPFS)
 */
export function normalizeURL(url: string): string {
    if (!url) return '';

    const trimmed = url.trim();

    // Handle IPFS hash without protocol
    if (isIPFSHash(trimmed)) {
        return `ipfs://${trimmed}`;
    }

    // Add https:// if no protocol
    if (!trimmed.match(/^[a-zA-Z]+:\/\//)) {
        return `https://${trimmed}`;
    }

    return trimmed;
}

/**
 * Convert IPFS URL to gateway URL
 */
export function ipfsToGatewayURL(url: string, gateway: string = 'https://ipfs.io/ipfs/'): string {
    const hash = extractIPFSHash(url);
    if (!hash) return url;

    return `${gateway}${hash}`;
}

/**
 * Fetch link metadata (Open Graph, Twitter Cards, etc.)
 */
export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
    const normalizedURL = normalizeURL(url);

    // Handle IPFS links
    if (isIPFSLink(normalizedURL)) {
        const hash = extractIPFSHash(normalizedURL);
        return {
            url: normalizedURL,
            type: 'ipfs',
            title: `IPFS Document`,
            description: hash ? `IPFS Hash: ${hash.substring(0, 20)}...` : 'IPFS Content',
            favicon: '🔗',
        };
    }

    // For regular URLs, try to fetch metadata via backend proxy
    try {
        const response = await fetch('/api/link-preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: normalizedURL }),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch metadata');
        }

        const metadata = await response.json();
        return {
            url: normalizedURL,
            type: 'website',
            ...metadata,
        };
    } catch (error) {
        console.error('Failed to fetch link metadata:', error);

        // Return basic metadata from URL
        try {
            const urlObj = new URL(normalizedURL);
            return {
                url: normalizedURL,
                type: 'website',
                title: urlObj.hostname,
                description: normalizedURL,
            };
        } catch {
            return {
                url: normalizedURL,
                type: 'unknown',
                title: 'Link',
                description: normalizedURL,
            };
        }
    }
}

/**
 * Detect file type from URL
 */
export function detectFileType(url: string): 'pdf' | 'image' | 'document' | 'unknown' {
    const lowerURL = url.toLowerCase();

    if (lowerURL.match(/\.(pdf)$/)) {
        return 'pdf';
    }

    if (lowerURL.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
        return 'image';
    }

    if (lowerURL.match(/\.(doc|docx|txt|rtf|odt)$/)) {
        return 'document';
    }

    return 'unknown';
}

/**
 * Validate EIN (Employer Identification Number)
 */
export function validateEIN(ein: string): boolean {
    if (!ein) return false;

    // Remove hyphens and spaces
    const cleaned = ein.replace(/[-\s]/g, '');

    // EIN should be exactly 9 digits
    return /^\d{9}$/.test(cleaned);
}

/**
 * Format EIN with hyphen (XX-XXXXXXX)
 */
export function formatEIN(ein: string): string {
    if (!ein) return '';

    const cleaned = ein.replace(/[-\s]/g, '');

    if (cleaned.length === 9) {
        return `${cleaned.substring(0, 2)}-${cleaned.substring(2)}`;
    }

    return ein;
}
