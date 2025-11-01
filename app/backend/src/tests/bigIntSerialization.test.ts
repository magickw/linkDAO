import { stringifyWithBigInt, parseWithBigInt, bigIntToJson, jsonToBigInt, convertBigIntToStrings } from '../utils/bigIntSerializer';

describe('BigInt Serialization', () => {
  it('should serialize BigInt values to JSON', () => {
    const obj = {
      value: BigInt(123),
      nested: {
        amount: BigInt(456),
        regular: 'string',
        number: 42
      },
      array: [BigInt(789), 'test', BigInt(1000)]
    };

    const serialized = stringifyWithBigInt(obj);
    const parsed = JSON.parse(serialized);

    expect(parsed.value).toBe('123');
    expect(parsed.nested.amount).toBe('456');
    expect(parsed.nested.regular).toBe('string');
    expect(parsed.nested.number).toBe(42);
    expect(parsed.array[0]).toBe('789');
    expect(parsed.array[1]).toBe('test');
    expect(parsed.array[2]).toBe('1000');
  });

  it('should deserialize BigInt values from JSON', () => {
    const jsonString = '{"value":"123","nested":{"amount":"456","regular":"string","number":42},"array":["789","test","1000"]}';

    const parsed = parseWithBigInt(jsonString);

    expect(parsed.value).toBe(BigInt(123));
    expect(parsed.nested.amount).toBe(BigInt(456));
    expect(parsed.nested.regular).toBe('string');
    expect(parsed.nested.number).toBe(42);
    expect(parsed.array[0]).toBe(BigInt(789));
    expect(parsed.array[1]).toBe('test');
    expect(parsed.array[2]).toBe(BigInt(1000));
  });

  it('should handle convertBigIntToStrings function', () => {
    const obj = {
      value: BigInt(123),
      nested: {
        amount: BigInt(456),
        regular: 'string',
        number: 42
      },
      array: [BigInt(789), 'test', BigInt(1000)]
    };

    const converted = convertBigIntToStrings(obj);

    expect(converted.value).toBe('123');
    expect(converted.nested.amount).toBe('456');
    expect(converted.nested.regular).toBe('string');
    expect(converted.nested.number).toBe(42);
    expect(converted.array[0]).toBe('789');
    expect(converted.array[1]).toBe('test');
    expect(converted.array[2]).toBe('1000');
  });

  it('should handle edge cases', () => {
    const obj = {
      nullValue: null,
      undefinedValue: undefined,
      zero: BigInt(0),
      negative: BigInt(-123),
      large: BigInt('123456789012345678901234567890')
    };

    const serialized = stringifyWithBigInt(obj);
    const parsed = parseWithBigInt(serialized);

    expect(parsed.zero).toBe(BigInt(0));
    expect(parsed.negative).toBe(BigInt(-123));
    expect(parsed.large).toBe(BigInt('123456789012345678901234567890'));
    expect(parsed.nullValue).toBe(null);
    expect(parsed.undefinedValue).toBe(undefined);
  });
});
