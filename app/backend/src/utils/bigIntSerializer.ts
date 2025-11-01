/**
 * Utility functions for handling BigInt serialization in JSON
 */

/**
 * Convert BigInt values to strings when serializing to JSON
 * @param key The object key
 * @param value The value to serialize
 * @returns The serialized value
 */
export function bigIntToJson(key: string, value: any): any {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

/**
 * Parse BigInt values from strings when deserializing from JSON
 * @param key The object key
 * @param value The value to deserialize
 * @returns The deserialized value
 */
export function jsonToBigInt(key: string, value: any): any {
  // This is a simple approach - in practice, you might want to check
  // if the string represents a BigInt based on some criteria
  if (typeof value === 'string' && /^-?\d+n?$/.test(value)) {
    // Remove the 'n' suffix if present
    const cleanValue = value.replace(/n$/, '');
    // Check if it's a valid number (don't check for safe integer as BigInt can be larger)
    if (!isNaN(Number(cleanValue))) {
      try {
        return BigInt(cleanValue);
      } catch (e) {
        // If conversion fails, return the original value
        return value;
      }
    }
  }
  return value;
}

/**
 * Safely stringify an object that may contain BigInt values
 * @param obj The object to stringify
 * @param space Optional number of spaces for indentation
 * @returns The JSON string representation
 */
export function stringifyWithBigInt(obj: any, space?: number): string {
  return JSON.stringify(obj, bigIntToJson, space);
}

/**
 * Safely parse a JSON string that may contain BigInt values
 * @param text The JSON string to parse
 * @returns The parsed object
 */
export function parseWithBigInt(text: string): any {
  return JSON.parse(text, jsonToBigInt);
}

/**
 * Convert BigInt values in an object to strings recursively
 * @param obj The object to process
 * @returns A new object with BigInt values converted to strings
 */
export function convertBigIntToStrings(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertBigIntToStrings(item));
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertBigIntToStrings(value);
    }
    return result;
  }

  return obj;
}
