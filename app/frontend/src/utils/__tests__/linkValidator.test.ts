import {
    validateURL,
    isIPFSLink,
    isIPFSHash,
    extractIPFSHash,
    normalizeURL,
    ipfsToGatewayURL,
    detectFileType,
    validateEIN,
    formatEIN
} from '@/utils/linkValidator';

describe('linkValidator', () => {
    describe('validateURL', () => {
        it('should validate HTTP URLs', () => {
            expect(validateURL('http://example.com')).toBe(true);
            expect(validateURL('https://example.com')).toBe(true);
        });

        it('should validate IPFS URLs', () => {
            expect(validateURL('ipfs://QmXxx')).toBe(true);
        });

        it('should validate IPFS hashes without protocol', () => {
            expect(validateURL('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')).toBe(true);
        });

        it('should reject invalid URLs', () => {
            expect(validateURL('')).toBe(false);
            expect(validateURL('not a url')).toBe(false);
            expect(validateURL('ftp://example.com')).toBe(false);
        });

        it('should handle null and undefined', () => {
            expect(validateURL(null as any)).toBe(false);
            expect(validateURL(undefined as any)).toBe(false);
        });
    });

    describe('isIPFSLink', () => {
        it('should detect ipfs:// protocol', () => {
            expect(isIPFSLink('ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')).toBe(true);
        });

        it('should detect IPFS gateway URLs', () => {
            expect(isIPFSLink('https://ipfs.io/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')).toBe(true);
            expect(isIPFSLink('https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')).toBe(true);
            expect(isIPFSLink('https://cloudflare-ipfs.com/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')).toBe(true);
        });

        it('should reject non-IPFS URLs', () => {
            expect(isIPFSLink('https://example.com')).toBe(false);
            expect(isIPFSLink('')).toBe(false);
        });
    });

    describe('isIPFSHash', () => {
        it('should validate CIDv0 hashes', () => {
            expect(isIPFSHash('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG')).toBe(true);
        });

        it('should reject invalid CIDv0 hashes', () => {
            expect(isIPFSHash('QmInvalid')).toBe(false);
            expect(isIPFSHash('NotACID')).toBe(false);
        });

        it('should handle empty strings', () => {
            expect(isIPFSHash('')).toBe(false);
            expect(isIPFSHash(null as any)).toBe(false);
        });
    });

    describe('extractIPFSHash', () => {
        it('should extract hash from ipfs:// protocol', () => {
            const hash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
            expect(extractIPFSHash(`ipfs://${hash}`)).toBe(hash);
        });

        it('should extract hash from gateway URLs', () => {
            const hash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
            expect(extractIPFSHash(`https://ipfs.io/ipfs/${hash}`)).toBe(hash);
            expect(extractIPFSHash(`https://gateway.pinata.cloud/ipfs/${hash}`)).toBe(hash);
        });

        it('should return hash if input is already a valid hash', () => {
            const hash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
            expect(extractIPFSHash(hash)).toBe(hash);
        });

        it('should return null for invalid inputs', () => {
            expect(extractIPFSHash('https://example.com')).toBe(null);
            expect(extractIPFSHash('')).toBe(null);
        });
    });

    describe('normalizeURL', () => {
        it('should add https:// to URLs without protocol', () => {
            expect(normalizeURL('example.com')).toBe('https://example.com');
        });

        it('should convert IPFS hash to ipfs:// protocol', () => {
            const hash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
            expect(normalizeURL(hash)).toBe(`ipfs://${hash}`);
        });

        it('should not modify URLs with protocol', () => {
            expect(normalizeURL('https://example.com')).toBe('https://example.com');
            expect(normalizeURL('ipfs://QmXxx')).toBe('ipfs://QmXxx');
        });

        it('should handle empty strings', () => {
            expect(normalizeURL('')).toBe('');
        });
    });

    describe('ipfsToGatewayURL', () => {
        it('should convert IPFS URL to gateway URL', () => {
            const hash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
            expect(ipfsToGatewayURL(`ipfs://${hash}`)).toBe(`https://ipfs.io/ipfs/${hash}`);
        });

        it('should use custom gateway', () => {
            const hash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
            const gateway = 'https://custom-gateway.com/ipfs/';
            expect(ipfsToGatewayURL(`ipfs://${hash}`, gateway)).toBe(`${gateway}${hash}`);
        });

        it('should return original URL if not IPFS', () => {
            const url = 'https://example.com';
            expect(ipfsToGatewayURL(url)).toBe(url);
        });
    });

    describe('detectFileType', () => {
        it('should detect PDF files', () => {
            expect(detectFileType('document.pdf')).toBe('pdf');
            expect(detectFileType('https://example.com/file.PDF')).toBe('pdf');
        });

        it('should detect image files', () => {
            expect(detectFileType('image.jpg')).toBe('image');
            expect(detectFileType('photo.jpeg')).toBe('image');
            expect(detectFileType('pic.png')).toBe('image');
            expect(detectFileType('graphic.gif')).toBe('image');
            expect(detectFileType('icon.webp')).toBe('image');
        });

        it('should detect document files', () => {
            expect(detectFileType('document.doc')).toBe('document');
            expect(detectFileType('file.docx')).toBe('document');
            expect(detectFileType('text.txt')).toBe('document');
        });

        it('should return unknown for unrecognized types', () => {
            expect(detectFileType('file.xyz')).toBe('unknown');
            expect(detectFileType('noextension')).toBe('unknown');
        });
    });

    describe('validateEIN', () => {
        it('should validate 9-digit EINs', () => {
            expect(validateEIN('123456789')).toBe(true);
        });

        it('should validate EINs with hyphen', () => {
            expect(validateEIN('12-3456789')).toBe(true);
        });

        it('should validate EINs with spaces', () => {
            expect(validateEIN('12 3456789')).toBe(true);
        });

        it('should reject invalid EINs', () => {
            expect(validateEIN('12345')).toBe(false);
            expect(validateEIN('1234567890')).toBe(false);
            expect(validateEIN('abc123456')).toBe(false);
            expect(validateEIN('')).toBe(false);
        });
    });

    describe('formatEIN', () => {
        it('should format 9-digit EIN with hyphen', () => {
            expect(formatEIN('123456789')).toBe('12-3456789');
        });

        it('should preserve already formatted EIN', () => {
            expect(formatEIN('12-3456789')).toBe('12-3456789');
        });

        it('should remove spaces and format', () => {
            expect(formatEIN('12 3456789')).toBe('12-3456789');
        });

        it('should return original for invalid length', () => {
            expect(formatEIN('12345')).toBe('12345');
            expect(formatEIN('')).toBe('');
        });
    });
});
