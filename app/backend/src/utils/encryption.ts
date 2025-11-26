import crypto from 'crypto';
import { safeLogger } from './safeLogger';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.TAX_ID_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text: string): string | null {
    try {
        if (!text) return null;

        if (!ENCRYPTION_KEY) {
            safeLogger.warn('Encryption key not found, skipping encryption');
            return null;
        }

        // Key must be 32 bytes (256 bits)
        // If the key is shorter/longer, we should hash it to get 32 bytes
        const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();

        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (error) {
        safeLogger.error('Encryption failed:', error);
        return null;
    }
}

export function decrypt(text: string): string | null {
    try {
        if (!text) return null;

        if (!ENCRYPTION_KEY) {
            safeLogger.warn('Encryption key not found, skipping decryption');
            return null;
        }

        const textParts = text.split(':');
        if (textParts.length !== 2) return null;

        const iv = Buffer.from(textParts[0], 'hex');
        const encryptedText = Buffer.from(textParts[1], 'hex');

        // Key must be 32 bytes (256 bits)
        const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString();
    } catch (error) {
        safeLogger.error('Decryption failed:', error);
        return null;
    }
}
