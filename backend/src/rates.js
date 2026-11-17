// Exchange rates from ExchangeRate-API's open access: free, no key, no account (ADR-0008).
// Only the base currency code is sent. Nothing about the user ever leaves the laptop.
// The answer is "1 MYR = x of each currency". Its terms ask for a credit link, which the app shows.

export const CURRENCIES = {
  USD: 'US dollar',
  OMR: 'Omani rial',
  CZK: 'Czech koruna',
  CAD: 'Canadian dollar',
  IDR: 'Indonesian rupiah'
};
export const RATES_SOURCE = { name: 'Exchange Rate API', url: 'https://www.exchangerate-api.com' };
const ADDRESS = 'https://open.er-api.com/v6/latest/MYR';

export class RatesUnavailable extends Error {}

// `fetchImpl` is passed in so tests can use a fake service and never touch the network.
export function createRates({ fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  return {
    async latest() {
      let response;
      try {
        response = await fetchImpl(ADDRESS, { signal: AbortSignal.timeout(timeoutMs) });
      } catch {
        throw new RatesUnavailable('The exchange-rate service could not be reached. The last rates saved are shown.');
      }
      if (!response.ok) throw new RatesUnavailable(`The exchange-rate service answered with an error (${response.status}).`);
      let body;
      try { body = await response.json(); } catch { throw new RatesUnavailable('The exchange-rate service sent an answer that could not be read.'); }
      if (body?.result !== 'success' || body.base_code !== 'MYR') throw new RatesUnavailable('The exchange-rate service sent an unexpected answer.');
      const rates = {};
      for (const code of Object.keys(CURRENCIES)) {
        const value = Number(body.rates?.[code]);
        if (!(value > 0)) throw new RatesUnavailable(`The exchange-rate service gave no rate for ${code}.`);
        rates[code] = value;
      }
      const updated = Number.isFinite(body.time_last_update_unix) ? new Date(body.time_last_update_unix * 1000).toISOString().slice(0, 10) : null;
      return { rates, updated };
    }
  };
}
