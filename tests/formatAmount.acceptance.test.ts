import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatAmount } from '../src/index.js';

// Independent QA tests for SDLC-38. They complement tests/formatAmount.test.ts and
// target cases the implementation's own tests do not pin down.

afterEach(() => {
  vi.restoreAllMocks();
});

/** The digits of a formatted amount, with currency symbol, grouping and separator removed. */
function digitsOf(formatted: string): string {
  return formatted.replace(/[^0-9]/gu, '');
}

/** The digits a formatted amount must show: |units|, left-padded to digits + 1 places. */
function expectedDigits(units: bigint, fractionDigits: number): string {
  const magnitude = units < 0n ? -units : units;
  return magnitude.toString().padStart(fractionDigits + 1, '0');
}

describe('AC1: formatAmount(minorUnits, currency) returns a display string', () => {
  it.each([
    [1, '$0.01'],
    [10, '$0.10'],
    [99, '$0.99'],
    [100, '$1.00'],
    [101, '$1.01'],
    [1234, '$12.34'],
    [99_999, '$999.99'],
    [100_000, '$1,000.00'],
  ])('formats %d US cents as %s', (units, expected) => {
    expect(formatAmount(units, 'USD')).toBe(expected);
  });

  it('accepts the currency code in mixed case', () => {
    expect(formatAmount(1234, 'uSd')).toBe('$12.34');
    expect(formatAmount(1234, 'jPy')).toBe('¥1,234');
  });

  it('returns a string for a bigint and for a number alike', () => {
    expect(typeof formatAmount(1234, 'USD')).toBe('string');
    expect(typeof formatAmount(1234n, 'USD')).toBe('string');
  });

  it('takes the fraction digits from the currency, not the locale', () => {
    expect(formatAmount(1234, 'JPY', 'de-DE')).toMatch(/^1\.234\s¥$/u);
    expect(formatAmount(1234, 'USD', 'de-DE')).toMatch(/^12,34\s\$$/u);
  });

  it.each(['US', 'USDD', ' USD', 'USD ', 'ÜSD', 'U5D', 'ZZZ'])(
    'rejects the currency %j with a RangeError',
    (code) => {
      expect(() => formatAmount(1234, code)).toThrow(RangeError);
    },
  );

  it('rejects a currency that is not a string', () => {
    expect(() => formatAmount(1234, null as unknown as string)).toThrow(RangeError);
    expect(() => formatAmount(1234, undefined as unknown as string)).toThrow(RangeError);
  });
});

describe('AC2: zero, negative amounts and amounts over one million', () => {
  it('formats zero in a two-, zero- and three-decimal currency', () => {
    expect(formatAmount(0, 'USD')).toBe('$0.00');
    expect(formatAmount(0, 'JPY')).toBe('¥0');
    expect(formatAmount(0n, 'KWD')).toMatch(/0\.000$/u);
    expect(formatAmount(0n, 'KWD')).not.toMatch(/^-/u);
  });

  it('formats negative zero as an unsigned zero', () => {
    expect(formatAmount(-0n, 'USD')).toBe('$0.00');
    expect(formatAmount(-0, 'JPY')).toBe('¥0');
  });

  it.each([
    [-1n, '-$0.01'],
    [-10n, '-$0.10'],
    [-100n, '-$1.00'],
    [-1234n, '-$12.34'],
  ])('formats the negative bigint %s as %s', (units, expected) => {
    expect(formatAmount(units, 'USD')).toBe(expected);
  });

  it('keeps the sign of a negative zero- and three-decimal amount', () => {
    expect(formatAmount(-1234, 'JPY')).toBe('-¥1,234');
    const kwd = formatAmount(-5, 'KWD');
    expect(kwd).toMatch(/^-/u);
    expect(kwd).toMatch(/0\.005$/u);
  });

  it('pads a three-decimal currency at every boundary', () => {
    expect(formatAmount(1, 'KWD')).toMatch(/0\.001$/u);
    expect(formatAmount(10, 'KWD')).toMatch(/0\.010$/u);
    expect(formatAmount(1000, 'KWD')).toMatch(/1\.000$/u);
  });

  it.each([
    [100_000_001, '$1,000,000.01'],
    [100_000_099, '$1,000,000.99'],
    [999_999_999, '$9,999,999.99'],
    [100_000_000_000, '$1,000,000,000.00'],
    [-100_000_001, '-$1,000,000.01'],
  ])('formats %d cents (over one million dollars) as %s', (units, expected) => {
    expect(formatAmount(units, 'USD')).toBe(expected);
  });

  it('formats over one million in a zero-decimal currency', () => {
    expect(formatAmount(1_000_001, 'JPY')).toBe('¥1,000,001');
    expect(formatAmount(-1_000_001n, 'JPY')).toBe('-¥1,000,001');
  });
});

describe('AC3: minor units are never converted to a float', () => {
  const magnitudes: readonly bigint[] = [
    1n,
    9n,
    10n,
    2n ** 53n - 1n,
    2n ** 53n,
    2n ** 53n + 1n,
    2n ** 53n + 3n,
    10n ** 17n + 1n,
    12_345_678_901_234_567_891n,
  ];

  it.each(magnitudes.flatMap((m) => [m, -m]))(
    'shows every digit of %s USD cents, with the right sign',
    (units) => {
      const formatted = formatAmount(units, 'USD');
      expect(digitsOf(formatted)).toBe(expectedDigits(units, 2));
      expect(formatted.startsWith('-')).toBe(units < 0n);
    },
  );

  it('shows every digit of a large zero-decimal amount', () => {
    expect(formatAmount(12_345_678_901_234_567_890n, 'JPY')).toBe(
      '¥12,345,678,901,234,567,890',
    );
  });

  it('shows every digit of a large three-decimal amount', () => {
    const units = 9_007_199_254_740_993_001n;
    expect(digitsOf(formatAmount(units, 'KWD'))).toBe(expectedDigits(units, 3));
  });

  it('gives the same result for a safe integer number and the same bigint', () => {
    const samples = [
      0,
      1,
      -1,
      1234,
      -1234,
      123_456_789,
      Number.MAX_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
    ];
    for (const units of samples) {
      expect(formatAmount(units, 'USD')).toBe(formatAmount(BigInt(units), 'USD'));
    }
  });

  it('formats Number.MIN_SAFE_INTEGER exactly and rejects the next integer below it', () => {
    expect(formatAmount(Number.MIN_SAFE_INTEGER, 'USD')).toBe('-$90,071,992,547,409.91');
    expect(() => formatAmount(Number.MIN_SAFE_INTEGER - 1, 'USD')).toThrow(RangeError);
  });

  it.each([0.5, -0.5, 1234.0001, 1e21, Number.NEGATIVE_INFINITY, Number.EPSILON])(
    'rejects the non-safe-integer number %d with a RangeError',
    (units) => {
      expect(() => formatAmount(units, 'USD')).toThrow(RangeError);
    },
  );

  it('runs no float helper while formatting', () => {
    const spies = [
      vi.spyOn(globalThis, 'parseFloat'),
      vi.spyOn(Number, 'parseFloat'),
      vi.spyOn(Number.prototype, 'toFixed'),
      vi.spyOn(Number.prototype, 'toPrecision'),
      vi.spyOn(Math, 'round'),
      vi.spyOn(Math, 'floor'),
      vi.spyOn(Math, 'trunc'),
      vi.spyOn(Math, 'pow'),
    ];

    const results = [
      formatAmount(1234, 'USD'),
      formatAmount(-5n, 'KWD'),
      formatAmount(123_456_789, 'JPY'),
      formatAmount(12_345_678_901_234_567_891n, 'USD'),
    ];
    const calls = spies.map((spy) => spy.mock.calls.length);

    expect(results[0]).toBe('$12.34');
    expect(calls).toEqual(spies.map(() => 0));
  });

  it('hands Intl a string and still formats the real value', () => {
    const prototype = Intl.NumberFormat.prototype as unknown as { readonly format: unknown };
    const descriptor = Object.getOwnPropertyDescriptor(Intl.NumberFormat.prototype, 'format');
    const originalGet = descriptor?.get;
    expect(originalGet).toBeTypeOf('function');
    if (originalGet === undefined) {
      return;
    }

    const receivedTypes: string[] = [];
    vi.spyOn(prototype, 'format', 'get').mockImplementation(function (this: unknown) {
      const real = originalGet.call(this) as (value: unknown) => string;
      return (value: unknown): string => {
        receivedTypes.push(typeof value);
        return real(value);
      };
    });

    const big = formatAmount(12_345_678_901_234_567_891n, 'USD');
    const small = formatAmount(-1, 'USD');

    expect(receivedTypes).toEqual(['string', 'string']);
    expect(big).toBe('$123,456,789,012,345,678.91');
    expect(small).toBe('-$0.01');
  });
});
