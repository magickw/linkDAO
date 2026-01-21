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