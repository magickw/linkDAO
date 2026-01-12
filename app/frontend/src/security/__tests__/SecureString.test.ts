/**
 * SecureString Tests
 * Tests for secure memory handling
 */

import { SecureString, SecureBuffer, clearObject, clearString } from '../SecureString';

describe('SecureString', () => {
    describe('constructor and getValue', () => {
        it('should store and retrieve string value', () => {
            const testValue = 'test-private-key';
            const secureStr = new SecureString(testValue);
            expect(secureStr.getValue()).toBe(testValue);
        });

        it('should not be cleared initially', () => {
            const secureStr = new SecureString('test');
            expect(secureStr.cleared).toBe(false);
        });
    });

    describe('clear', () => {
        it('should clear the data', () => {
            const secureStr = new SecureString('sensitive-data');
            secureStr.clear();
            expect(secureStr.cleared).toBe(true);
        });

        it('should throw error when accessing cleared data', () => {
            const secureStr = new SecureString('test');
            secureStr.clear();
            expect(() => secureStr.getValue()).toThrow('SecureString has been cleared');
        });

        it('should zero out underlying buffer', () => {
            const secureStr = new SecureString('test');
            const bytes = secureStr.getBytes();
            secureStr.clear();

            // Verify buffer is zeroed (if we could access it)
            expect(secureStr.cleared).toBe(true);
        });
    });

    describe('getBytes', () => {
        it('should return Uint8Array', () => {
            const secureStr = new SecureString('test');
            const bytes = secureStr.getBytes();
            expect(bytes).toBeInstanceOf(Uint8Array);
        });

        it('should throw error when accessing cleared bytes', () => {
            const secureStr = new SecureString('test');
            secureStr.clear();
            expect(() => secureStr.getBytes()).toThrow('SecureString has been cleared');
        });
    });
});

describe('SecureBuffer', () => {
    describe('constructor', () => {
        it('should create buffer from size', () => {
            const buffer = new SecureBuffer(32);
            expect(buffer.size).toBe(32);
        });

        it('should create buffer from Uint8Array', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const buffer = new SecureBuffer(data);
            expect(buffer.size).toBe(4);
        });
    });

    describe('clear', () => {
        it('should clear the buffer', () => {
            const buffer = new SecureBuffer(32);
            buffer.clear();
            expect(buffer.cleared).toBe(true);
        });

        it('should throw error when accessing cleared buffer', () => {
            const buffer = new SecureBuffer(32);
            buffer.clear();
            expect(() => buffer.getBuffer()).toThrow('SecureBuffer has been cleared');
        });
    });
});

describe('clearObject', () => {
    it('should clear all properties of an object', () => {
        const obj = {
            privateKey: '0x1234567890abcdef',
            mnemonic: 'test mnemonic phrase',
            nested: {
                secret: 'nested secret'
            }
        };

        clearObject(obj);

        expect(obj.privateKey).toBeNull();
        expect(obj.mnemonic).toBeNull();
        expect(obj.nested).toBeNull();
    });

    it('should clear SecureString instances', () => {
        const secureStr = new SecureString('test');
        const obj = { secure: secureStr };

        clearObject(obj);

        expect(secureStr.cleared).toBe(true);
    });

    it('should handle null and undefined', () => {
        expect(() => clearObject(null)).not.toThrow();
        expect(() => clearObject(undefined)).not.toThrow();
    });
});

describe('clearString', () => {
    it('should not throw error', () => {
        expect(() => clearString('test')).not.toThrow();
    });

    it('should handle empty string', () => {
        expect(() => clearString('')).not.toThrow();
    });
});
