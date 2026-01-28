/**
 * Helper to serialize objects containing BigInt values for JSON response
 */
export function serializeBigInt(data: any): any {
  return JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint'
      ? value.toString()
      : value // return everything else unchanged
  ));
}

/**
 * Stringify with BigInt support
 */
export function stringifyWithBigInt(data: any): string {
  return JSON.stringify(data, (key, value) =>
    typeof value === 'bigint'
      ? value.toString()
      : value
  );
}

/**
 * Convert BigInt values to strings in an object
 */
export function convertBigIntToStrings(data: any): any {
  if (typeof data === 'bigint') {
    return data.toString();
  }
  if (Array.isArray(data)) {
    return data.map(item => convertBigIntToStrings(item));
  }
  if (data !== null && typeof data === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = convertBigIntToStrings(value);
    }
    return result;
  }
  return data;
}

/**
 * Convert string representations of BigInt back to BigInt
 */
export function jsonToBigInt(data: any, keys: string[] = []): any {
  if (typeof data === 'string' && keys.length === 0) {
    // Try to parse as BigInt if no specific keys provided
    try {
      return BigInt(data);
    } catch {
      return data;
    }
  }
  if (Array.isArray(data)) {
    return data.map(item => jsonToBigInt(item, keys));
  }
  if (data !== null && typeof data === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (keys.includes(key) && typeof value === 'string') {
        try {
          result[key] = BigInt(value);
        } catch {
          result[key] = value;
        }
      } else {
        result[key] = jsonToBigInt(value, keys);
      }
    }
    return result;
  }
  return data;
}