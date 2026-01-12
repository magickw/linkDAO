/**
 * Secure Memory Utilities
 * Provides functions for securely wiping sensitive data from memory
 */

/**
 * Securely wipe a string from memory by overwriting it with random data
 * Note: JavaScript strings are immutable, so this creates a new string
 * The original string may still exist in memory until garbage collected
 */
export function wipeString(str: string): void {
  if (!str || typeof str !== 'string') return;

  // Create a new string of same length with random characters
  const randomStr = Array.from({ length: str.length }, () =>
    String.fromCharCode(Math.floor(Math.random() * 256))
  ).join('');

  // In a real implementation with WASM or native modules,
  // we would overwrite the actual memory location
  // In JavaScript, we rely on the garbage collector
  // and encourage immediate dereferencing
}

/**
 * Securely wipe a Uint8Array
 */
export function wipeUint8Array(arr: Uint8Array): void {
  if (!arr || !(arr instanceof Uint8Array)) return;

  // Overwrite with random bytes
  crypto.getRandomValues(arr);
}

/**
 * Securely wipe a regular array
 */
export function wipeArray(arr: any[]): void {
  if (!arr || !Array.isArray(arr)) return;

  // Overwrite each element with random data
  for (let i = 0; i < arr.length; i++) {
    if (typeof arr[i] === 'string') {
      wipeString(arr[i]);
      arr[i] = Array.from({ length: arr[i].length }, () =>
        String.fromCharCode(Math.floor(Math.random() * 256))
      ).join('');
    } else if (arr[i] instanceof Uint8Array) {
      wipeUint8Array(arr[i]);
    } else {
      arr[i] = Math.random();
    }
  }
}

/**
 * Create a secure wrapper for sensitive data that can be wiped
 */
export class SecureString {
  private _value: string | null = null;

  constructor(value: string) {
    this._value = value;
  }

  getValue(): string {
    if (!this._value) {
      throw new Error('SecureString has been wiped');
    }
    return this._value;
  }

  wipe(): void {
    if (this._value) {
      wipeString(this._value);
      this._value = null;
    }
  }

  isWiped(): boolean {
    return this._value === null;
  }
}

/**
 * Create a secure wrapper for sensitive binary data
 */
export class SecureBuffer {
  private _value: Uint8Array | null = null;

  constructor(value: Uint8Array) {
    this._value = new Uint8Array(value);
  }

  getValue(): Uint8Array {
    if (!this._value) {
      throw new Error('SecureBuffer has been wiped');
    }
    return new Uint8Array(this._value);
  }

  wipe(): void {
    if (this._value) {
      wipeUint8Array(this._value);
      this._value = null;
    }
  }

  isWiped(): boolean {
    return this._value === null;
  }
}

/**
 * Utility to securely clear variables after use
 * Usage: await secureClear(() => { ... your code ... }, [sensitiveVar1, sensitiveVar2]);
 */
export async function secureClear<T>(
  fn: () => T,
  sensitiveVars: (string | Uint8Array | any[])[]
): Promise<T> {
  try {
    return fn();
  } finally {
    // Wipe all sensitive variables
    for (const variable of sensitiveVars) {
      if (typeof variable === 'string') {
        wipeString(variable);
      } else if (variable instanceof Uint8Array) {
        wipeUint8Array(variable);
      } else if (Array.isArray(variable)) {
        wipeArray(variable);
      }
    }
  }
}

/**
 * Zero-fill a buffer with null bytes
 */
export function zeroFill(buffer: Uint8Array): void {
  buffer.fill(0);
}

/**
 * Securely compare two strings in constant time
 * to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}