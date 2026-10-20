/**
 * Formats money held as an integer number of minor units (cents, pence, fils...).
 *
 * The amount is never converted to a floating-point number: it is split into its
 * major and minor parts with bigint arithmetic, written out as an exact decimal
 * string, and that string is handed to Intl.NumberFormat, which formats decimal
 * strings exactly (ECMA-402 NumberFormat v3, Node >= 20).
 */

const CURRENCY_CODE = /^[A-Za-z]{3}$/;

let supportedCurrencies: ReadonlySet<string> | undefined;

function isSupportedCurrency(code: string): boolean {
  supportedCurrencies ??= new Set(Intl.supportedValuesOf('currency'));
  return supportedCurrencies.has(code);
}

function toMinorUnits(minorUnits: bigint | number): bigint {
  if (typeof minorUnits === 'bigint') {
    return minorUnits;
  }
  if (typeof minorUnits === 'number') {
    if (!Number.isSafeInteger(minorUnits)) {
      throw new RangeError(
        'minorUnits must be a safe integer; pass a bigint for larger amounts',
      );
    }
    return BigInt(minorUnits);
  }
  throw new TypeError('minorUnits must be a bigint or an integer number');
}

function toCurrencyCode(currency: string): string {
  if (typeof currency !== 'string' || !CURRENCY_CODE.test(currency)) {
    throw new RangeError('currency must be a three-letter ISO 4217 code');
  }
  const code = currency.toUpperCase();
  if (!isSupportedCurrency(code)) {
    throw new RangeError('currency is not a known ISO 4217 code');
  }
  return code;
}

/** Writes minor units as an exact decimal string with `digits` fraction digits. */
function toDecimalString(units: bigint, digits: number): `${number}` {
  const negative = units < 0n;
  const magnitude = negative ? -units : units;
  const scale = 10n ** BigInt(digits);
  const sign = negative ? '-' : '';
  const major = (magnitude / scale).toString();
  if (digits === 0) {
    return `${sign}${major}` as `${number}`;
  }
  const minor = (magnitude % scale).toString().padStart(digits, '0');
  return `${sign}${major}.${minor}` as `${number}`;
}

/**
 * Formats an integer amount of minor units as a currency display string.
 *
 * @example formatAmount(1234, 'USD') // '$12.34'
 * @param minorUnits The amount in the currency's minor units: a bigint, or a safe integer number.
 * @param currency A three-letter ISO 4217 code, in any case.
 * @param locale The BCP 47 locale to format for; defaults to en-US.
 * @throws RangeError when minorUnits is not a safe integer or currency is not a known code.
 */
export function formatAmount(
  minorUnits: bigint | number,
  currency: string,
  locale = 'en-US',
): string {
  const units = toMinorUnits(minorUnits);
  const code = toCurrencyCode(currency);
  const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: code });
  const digits = formatter.resolvedOptions().maximumFractionDigits;
  if (digits === undefined) {
    throw new RangeError('the number of fraction digits for this currency is unknown');
  }
  return formatter.format(toDecimalString(units, digits));
}
