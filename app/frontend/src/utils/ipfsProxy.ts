/**
 * IPFS Image Helper
 * Converts IPFS gateway URLs to use the backend proxy
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

/**
 * Convert an IPFS gateway URL to use the backend proxy
 * This bypasses CORS restrictions from Pinata gateway
 */
export function getProxiedIPFSUrl(ipfsUrl: string): string {
    if (!ipfsUrl) return '';

    // Check if URL is already a proxied URL (backend proxy or any gateway)
    try {
        const url = new URL(ipfsUrl, window.location.href);
        // Check if it contains /api/ipfs/ or any IPFS gateway
        if (
            url.pathname.includes('/api/ipfs/') ||
            url.pathname.includes('/ipfs/') ||
            url.hostname.includes('ipfs.io') ||
            url.hostname.includes('cloudflare-ipfs.com') ||
            url.hostname.includes('pinata.cloud') ||
            url.hostname.includes('dweb.link')
        ) {
            return ipfsUrl; // Return as-is, already proxied
        }
    } catch {
        // If URL parsing fails, continue with hash extraction
    }

    // Extract IPFS hash from various URL formats
    let hash = '';

    // Handle gateway.pinata.cloud URLs
    if (ipfsUrl.includes('gateway.pinata.cloud/ipfs/')) {
        hash = ipfsUrl.split('gateway.pinata.cloud/ipfs/')[1];
    }
    // Handle ipfs.io URLs
    else if (ipfsUrl.includes('ipfs.io/ipfs/')) {
        hash = ipfsUrl.split('ipfs.io/ipfs/')[1];
    }
    // Handle cloudflare-ipfs.com URLs
    else if (ipfsUrl.includes('cloudflare-ipfs.com/ipfs/')) {
        hash = ipfsUrl.split('cloudflare-ipfs.com/ipfs/')[1];
    }
    // Handle ipfs:// protocol
    else if (ipfsUrl.startsWith('ipfs://')) {
        hash = ipfsUrl.replace('ipfs://', '');
    }
    // Handle /ipfs/ prefix
    else if (ipfsUrl.startsWith('/ipfs/')) {
        hash = ipfsUrl.replace('/ipfs/', '');
    }
    // Assume it's already just a hash
    else {
        hash = ipfsUrl;
    }

    // Remove any query parameters or fragments
    hash = hash.split('?')[0].split('#')[0];

    // Return proxied URL
    return `${BACKEND_URL}/api/ipfs/${hash}`;
}

/**
 * Check if a URL is an IPFS URL
 */
export function isIPFSUrl(url: string): boolean {
    if (!url) return false;

    return (
        url.includes('gateway.pinata.cloud/ipfs/') ||
        url.includes('ipfs.io/ipfs/') ||
        url.includes('cloudflare-ipfs.com/ipfs/') ||
        url.startsWith('ipfs://') ||
        url.startsWith('/ipfs/')
    );
}

/**
 * Process an array of image URLs, converting IPFS URLs to proxied URLs
 */
export function processImageUrls(urls: string[]): string[] {
    if (!Array.isArray(urls)) return [];

    return urls.map(url => {
        if (isIPFSUrl(url)) {
            return getProxiedIPFSUrl(url);
        }
        return url;
    });
}
