// Small helpers that turn values into text for the screen.
// Money is Malaysian ringgit and numbers use the en-MY style, everywhere.

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Hide numbers: every "RM 1,234.56" in a piece of text becomes "RM •••". Layout and everything else stay the same.
export const maskMoney = (text) => text.replace(/\bRM\s?-?[\d,]*\d(?:\.\d+)?/g, 'RM •••');

export const rm = (n) => 'RM ' + Number(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const num = (n) => Math.round(n).toLocaleString('en-MY');
export const f1 = (n) => Number(n).toFixed(1);
export const f2 = (n) => Number(n).toFixed(2);
export const pct = (n) => f1(n) + '%';

// A number without pointless decimals: 6 stays "6", 17.5 stays "17.5".
export const plain = (n) => String(Math.round(n * 100) / 100);

// 370 minutes -> "6 h 10 min"
export const hm = (minutes) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;

export const clamp = (n, low, high) => Math.min(high, Math.max(low, n));

// "2026-11-21" -> "21 November"
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dayText = (day) => `${Number(day.slice(8, 10))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;

// Moving through the calendar. Days are "YYYY-MM-DD" and months are "YYYY-MM", worked out in UTC so no time zone can shift them.
export function addDays(day, count) {
  const date = new Date(day + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function addMonths(month, count) {
  const date = new Date(month + '-01T00:00:00Z');
  date.setUTCMonth(date.getUTCMonth() + count);
  return date.toISOString().slice(0, 7);
}
export const lastDayOf = (month) => addDays(addMonths(month, 1) + '-01', -1);

// Reads a number typed into a form. Empty text gives null, so "nothing typed" and "0" stay different.
export function typedNumber(text) {
  const trimmed = String(text ?? '').trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : NaN;
}
