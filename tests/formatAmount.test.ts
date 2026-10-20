import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatAmount } from '../src/index.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('formatAmount: display string (AC1)', () => {
  it('formats minor units as a currency string', () => {
    expect(formatAmount(1234, 'USD')).toBe('$12.34');
  });

  it('accepts a bigint amount', () => {
    expect(formatAmount(1234n, 'USD')).toBe('$12.34');
  });

  it('accepts a lowercase currency code', () => {
    expect(formatAmount(1234, 'usd')).toBe('$12.34');
  });

  it('formats for another locale when one is given', () => {
    expect(formatAmount(1234, 'EUR', 'de-DE')).toMatch(/^12,34\s€$/u);
  });
});

describe('formatAmount: zero, negative and large amounts (AC2)', () => {
  it('formats zero', () => {
    expect(formatAmount(0, 'USD')).toBe('$0.00');
    expect(formatAmount(0n, 'USD')).toBe('$0.00');
  });

  it('formats negative zero as zero', () => {
    expect(formatAmount(-0, 'USD')).toBe('$0.00');
  });

  it('formats a negative amount', () => {
    expect(formatAmount(-1234, 'USD')).toBe('-$12.34');
  });

  it('pads amounts below one major unit', () => {
    expect(formatAmount(5, 'USD')).toBe('$0.05');
    expect(formatAmount(-5, 'USD')).toBe('-$0.05');
    expect(formatAmount(50, 'USD')).toBe('$0.50');
  });

  it('formats exactly one million', () => {
    expect(formatAmount(100_000_000, 'USD')).toBe('$1,000,000.00');
  });

  it('formats an amount over one million with grouping', () => {
    expect(formatAmount(123_456_789, 'USD')).toBe('$1,234,567.89');
    expect(formatAmount(-123_456_789, 'USD')).toBe('-$1,234,567.89');
  });

  it('formats a zero-decimal currency', () => {
    expect(formatAmount(1234, 'JPY')).toBe('¥1,234');
  });

  it('formats a three-decimal currency', () => {
    const formatted = formatAmount(1_234_567, 'KWD');
    expect(formatted).toMatch(/1,234\.567/u);
    expect(formatAmount(-5, 'KWD')).toMatch(/0\.005/u);
  });
});

describe('formatAmount: never a float (AC3)', () => {
  it('keeps every digit of a bigint beyond Number.MAX_SAFE_INTEGER', () => {
    // 9007199254740993.12 has no exact double: a float path would print ...992 or ...994.
    expect(formatAmount(900_719_925_474_099_312n, 'USD')).toBe('$9,007,199,254,740,993.12');
    expect(formatAmount(-900_719_925_474_099_312n, 'USD')).toBe('-$9,007,199,254,740,993.12');
  });

  it('hands Intl.NumberFormat a decimal string, never a number', () => {
    const received: unknown[] = [];
    // Intl.NumberFormat.prototype.format is an accessor, but its type is a method, which
    // vi.spyOn refuses to treat as a getter; view the prototype as a plain property.
    const prototype = Intl.NumberFormat.prototype as unknown as {
      readonly format: unknown;
    };
    vi.spyOn(prototype, 'format', 'get').mockImplementation(() => (value: unknown) => {
      received.push(value);
      return 'formatted';
    });

    expect(formatAmount(1234, 'USD')).toBe('formatted');
    expect(formatAmount(-5, 'USD')).toBe('formatted');
    expect(formatAmount(1234, 'JPY')).toBe('formatted');
    expect(received).toEqual(['12.34', '-0.05', '1234']);
  });

  it('rejects a number that is not an integer', () => {
    expect(() => formatAmount(12.5, 'USD')).toThrow(RangeError);
    expect(() => formatAmount(Number.NaN, 'USD')).toThrow(RangeError);
    expect(() => formatAmount(Number.POSITIVE_INFINITY, 'USD')).toThrow(RangeError);
  });

  it('rejects a number beyond the safe integer range', () => {
    expect(() => formatAmount(Number.MAX_SAFE_INTEGER + 1, 'USD')).toThrow(RangeError);
    expect(formatAmount(Number.MAX_SAFE_INTEGER, 'USD')).toBe('$90,071,992,547,409.91');
  });

  it('rejects an amount that is neither a bigint nor a number', () => {
    expect(() => formatAmount('1234' as unknown as number, 'USD')).toThrow(TypeError);
  });
});

describe('formatAmount: currency validation', () => {
  it.each(['US', 'USDX', 'US$', '', '123'])('rejects the malformed code %j', (code) => {
    expect(() => formatAmount(1234, code)).toThrow(RangeError);
  });

  it('rejects a well-formed code that is not a known currency', () => {
    expect(() => formatAmount(1234, 'ZZZ')).toThrow(RangeError);
  });
});
