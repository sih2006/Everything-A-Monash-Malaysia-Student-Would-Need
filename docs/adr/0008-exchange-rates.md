# ADR-0008: Exchange rates for other currencies

## Status

Accepted. The owner chose on 18 November 2026: free live rates with the option to type a rate by hand, and both a converter and a switch that shows every amount in another currency.

## Date

2026-11-18

## Context

The owner wants to see money in other currencies: the US dollar, the Omani rial, the Czech koruna, the Canadian dollar and the Indonesian rupiah. Everything in the app is stored in Malaysian ringgit (MYR), and that must not change: the budget rules, the limits and the statements are all in ringgit.

Rates change every day, so they must come from somewhere. The project rules say: free tiers only, no packages without a record, and no personal data leaving the laptop unless the owner turns on a feature that needs it.

## Options considered

1. **Free live rates from ExchangeRate-API's open access.** One address, no key, no account, updated once a day. It has all five currencies, including the Omani rial. Only the base currency code (`MYR`) is sent. Its terms ask for a visible credit link.
2. **Frankfurter (European Central Bank rates).** Free and no key, but it has no Omani rial.
3. **Rates typed by hand only.** Nothing leaves the laptop, but the rates go out of date and the owner has to look them up.
4. **A paid or keyed service** (Open Exchange Rates, Fixer). More currencies and history, but needs an account and a key, and the free tiers are small.

## Decision

Option 1, with option 3 on top: the backend fetches the rates at most once a day and saves them; a rate typed by hand always wins over the live one, and removing it brings the live rate back. If the service cannot be reached, the last saved rates are used and the screen says so.

In the app:

- A **converter** on the Budget screen's Overview tab: an amount in any of the six currencies, shown in all the others.
- A **"show amounts in" switch** in the menu: every RM amount on every screen is shown in the chosen currency. Typing and storage stay in ringgit, and a line at the top of the screen says which currency and rate are in use. Hiding numbers wins over converting.

## Consequences

- The app now makes one outside request a day, to `open.er-api.com`, carrying no personal data. The security document's data-flow diagram shows it.
- The code is `backend/src/rates.js` (the service, passed into the app so tests use a fake and never touch the network), three addresses under `/api/currency`, and `web/js/viewmodels/currency.js`.
- The rates are good for seeing roughly what something costs. They are not the rate a bank or money changer gives.
- Adding a currency means adding its code to `CURRENCIES` in `rates.js`, `SHOW_IN` in `appViewModel.js`, and the menu in `index.html`.
