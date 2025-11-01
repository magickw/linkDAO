import { stringifyWithBigInt } from '../utils/bigIntSerializer';

describe('Bridge Metrics Serialization', () => {
  it('should serialize chainMetrics with BigInt values', () => {
    // Simulate chainMetrics data structure that might contain BigInt values
    const chainMetrics = {
      1: {
        transactions: 10,
        volume: '123456789012345678901234567890', // This would be a string representation of a BigInt
        fees: '987654321098765432109876543210'
      },
      137: {
        transactions: 5,
        volume: '555555555555555555555555555555',
        fees: '333333333333333333333333333333'
      }
    };

    // This should not throw an error
    const serialized = stringifyWithBigInt(chainMetrics);
    const parsed = JSON.parse(serialized);

    expect(parsed[1].transactions).toBe(10);
    expect(parsed[1].volume).toBe('123456789012345678901234567890');
    expect(parsed[137].transactions).toBe(5);
    expect(parsed[137].fees).toBe('333333333333333333333333333333');
  });

  it('should handle empty chainMetrics', () => {
    const chainMetrics = {};

    // This should not throw an error
    const serialized = stringifyWithBigInt(chainMetrics);
    const parsed = JSON.parse(serialized);

    expect(Object.keys(parsed).length).toBe(0);
  });
});
