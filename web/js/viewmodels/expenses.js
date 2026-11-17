// The "looking back" part of the Expenses tab: which period is shown, in words, and the table of
// what was spent each month on what. Pure functions, so they are tested without a browser.

// The periods the user can switch between. They match SPENDING_SPANS in backend/src/domain.js.
export const EXPENSE_SPANS = [['month', 'This month'], ['3m', '3 months'], ['year', 'A year'], ['all', 'All time']];
export const DEFAULT_SPAN = '3m';
export const isSpan = (span) => EXPENSE_SPANS.some(([id]) => id === span);

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = (month) => `${SHORT[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

// The period in words, for headings and notes: "October 2026", "the last 3 months", "all time, since Jun 2025".
export function spanWords(span, period, monthName) {
  if (span === 'month') return monthName;
  if (span === 'all') return `all time, since ${monthLabel(period.from.slice(0, 7))}`;
  return `the last ${period.months} months`;
}

// What was spent each month inside the period, on what: one row per category, one column per month.
// Rows with the most spending come first. Months with no spending at all are left out.
export function presentMonthlyTable(byMonth, fromMonth, toMonth, essential = []) {
  const months = (byMonth ?? []).filter((m) => m.month >= fromMonth && m.month <= toMonth);
  const totals = new Map();
  for (const m of months) {
    for (const [category, amount] of Object.entries(m.byCategory)) totals.set(category, round2((totals.get(category) ?? 0) + amount));
  }
  const rows = [...totals].sort((a, b) => b[1] - a[1]).map(([category, total]) => ({
    category, total, essential: essential.includes(category),
    cells: months.map((m) => m.byCategory[category] ?? 0)
  }));
  return {
    months: months.map((m) => ({ month: m.month, label: monthLabel(m.month), total: m.total })),
    rows,
    total: round2(months.reduce((sum, m) => sum + m.total, 0))
  };
}

const round2 = (n) => Math.round(n * 100) / 100;
