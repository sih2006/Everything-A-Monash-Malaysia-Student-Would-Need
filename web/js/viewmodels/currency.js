// Other currencies (ADR-0008). Money is always stored and typed in ringgit; these functions only change
// how amounts are shown. Rates come from the backend as "1 MYR = x". Pure functions, tested without a browser.

// Decimal places used for each currency: the Omani rial has three, the rupiah is shown without any.
const DIGITS = { MYR: 2, USD: 2, OMR: 3, CZK: 2, CAD: 2, IDR: 0 };

// "RM 1,234.56", "USD 297.12", "OMR 114.230", "IDR 4,456,878".
export function formatIn(code, amount) {
  const digits = DIGITS[code] ?? 2;
  const text = Number(amount).toLocaleString('en-MY', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return code === 'MYR' ? `RM ${text}` : `${code} ${text}`;
}

// How many of `code` one ringgit buys, or null when there is no rate.
export function rateOf(currency, code) {
  if (code === 'MYR') return 1;
  return currency?.currencies?.find((c) => c.code === code)?.perMyr ?? null;
}

// Every "RM 1,234.56" in a piece of screen text becomes the same amount in `code`.
// It uses the same pattern as hiding numbers, so both always find the same amounts.
export function convertMoneyText(text, code, perMyr) {
  if (code === 'MYR' || !perMyr) return text;
  return text.replace(/\bRM\s?(-?)([\d,]*\d(?:\.\d+)?)/g, (whole, minus, digits) => {
    const ringgit = Number(digits.replace(/,/g, ''));
    return (minus ? '-' : '') + formatIn(code, ringgit * perMyr);
  });
}

// The converter: an amount in one currency, shown in ringgit and every other currency that has a rate.
export function convertAll(amount, from, currency) {
  const fromRate = rateOf(currency, from);
  if (!(amount >= 0) || !fromRate) return [];
  const ringgit = amount / fromRate;
  const codes = ['MYR', ...(currency?.currencies ?? []).map((c) => c.code)];
  return codes.filter((code) => code !== from && rateOf(currency, code))
    .map((code) => ({ code, name: code === 'MYR' ? 'Malaysian ringgit' : currency.currencies.find((c) => c.code === code).name, text: formatIn(code, ringgit * rateOf(currency, code)) }));
}

// The rates card: each currency as "1 USD = RM 4.09", and where the rate came from.
// A currency worth less than one sen is shown per 1,000, so it never reads "1 IDR = RM 0.00".
export function presentRates(currency) {
  const say = (code, perMyr) => {
    const units = 1 / perMyr < 0.01 ? 1000 : 1;
    return `${units.toLocaleString('en-MY')} ${code} = ${formatIn('MYR', units / perMyr)}`;
  };
  return (currency?.currencies ?? []).map((c) => ({
    code: c.code,
    name: c.name,
    rate: c.perMyr ? say(c.code, c.perMyr) : 'No rate yet',
    from: c.from === 'hand' ? 'Set by hand' : c.from === 'live' ? 'Live' : 'Not available',
    byHand: c.myrPerUnitByHand,
    live: c.live ? say(c.code, c.live) : null,
    // The live rate as "1 unit = this many RM", for the hint in the set-by-hand box.
    liveHint: c.live ? String(Number((1 / c.live).toPrecision(4))) : ''
  }));
}
