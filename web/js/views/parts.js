// Small pieces of HTML that several screens share.
// Every value that came from the user goes through esc() before it is put into HTML.

import { clamp, esc } from '../format.js';

const icon = (paths) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
export const ICON = {
  arrow: icon('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'),
  check: icon('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  plus: icon('<path d="M12 5v14M5 12h14"/>'),
  minus: icon('<path d="M5 12h14"/>')
};

export const chip = ({ text, tone }) => `<span class="chip ${tone ?? ''}">${esc(text)}</span>`;

// A progress bar. `todayAt` adds the triangle that points at today.
export const bar = (percent, tone = '', todayAt) => `
  <div class="bar ${tone}" aria-hidden="true">
    <i style="width:${clamp(percent, 0, 100)}%"></i>
    ${todayAt === undefined ? '' : `<span class="today" style="left:${clamp(todayAt, 0, 100)}%"></span>`}
  </div>`;

// An empty space where the artist's mascot art will go. The app ships with no pictures.
export const artSpace = (name, large = false) =>
  `<span class="mascot ${large ? 'lg' : ''}" role="img" aria-label="Space for ${esc(name)} art"></span>`;

export const mood = (tint, name, moodText) => `
  <div class="mood ${tint}">
    ${artSpace(name, true)}
    <div><strong>${esc(name)}</strong><span>Mood: ${esc(moodText)}</span><small>Art to come</small></div>
  </div>`;

export const pageHead = (title, sub, extra = '') => `
  <div class="page-head">
    <div class="text"><h1 class="page-title">${esc(title)}</h1><p class="sub">${esc(sub)}</p></div>
    ${extra}
  </div>`;

// A labelled input. The label wraps the input, so they are linked without needing ids.
export const field = (label, name, attrs = '', hint = '') => `
  <div class="field"><label>${esc(label)}${hint ? ` <small>${esc(hint)}</small>` : ''}
    <input name="${name}" autocomplete="off" ${attrs}></label></div>`;

export const select = (label, name, options, chosen = '') => `
  <div class="field"><label>${esc(label)}
    <select name="${name}">${options.map(([value, text]) => `<option value="${esc(value)}" ${value === chosen ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select></label></div>`;

// A part of the screen that stays folded away until it is needed. `key` lets it stay open when the screen is redrawn.
export const fold = (key, summary, body, open = false) =>
  `<details class="fold" data-key="${esc(key)}" ${open ? 'open' : ''}><summary>${esc(summary)}</summary><div class="fold-body">${body}</div></details>`;

export const emptyCard = (title, text, extra = '') => `
  <section class="card empty"><h2>${esc(title)}</h2><p class="note">${esc(text)}</p>${extra}</section>`;

// Previous and next buttons for a month or a day. "Next" stops at the current one.
export const periodNav = (slice, label, isCurrent, unit) => `
  <nav class="period" aria-label="Choose a ${unit}">
    <button type="button" class="btn quiet" data-action="showPeriod" data-slice="${slice}" data-step="-1" aria-label="Previous ${unit}">‹ Previous</button>
    <strong aria-live="polite">${esc(label)}</strong>
    <button type="button" class="btn quiet" data-action="showPeriod" data-slice="${slice}" data-step="1" aria-label="Next ${unit}" ${isCurrent ? 'disabled' : ''}>Next ›</button>
    ${isCurrent ? '' : `<button type="button" class="link" data-action="showCurrent" data-slice="${slice}">Back to this ${unit}</button>`}
  </nav>`;

// A column chart for a week: one column per day, with a dashed line at the target.
export function columns(rows, max, target, format, tipLabel) {
  const plot = 150;
  return `
    <div class="cols">
      ${target > 0 ? `<div class="target-line" style="bottom:${24 + Math.min(1, target / max) * plot}px"></div>` : ''}
      ${rows.map((d) => {
        const empty = d.value === null || d.value === undefined;
        return `
        <div class="col ${d.today ? 'today' : ''} ${empty ? 'empty' : ''}" ${empty ? '' : `data-tip="${esc(d.name)}: ${esc(format(d.value))} ${tipLabel}"`}>
          <span class="val">${empty ? '' : esc(format(d.value))}</span>
          <span class="mark" style="height:${empty ? 2 : Math.round(Math.min(1, d.value / max) * plot)}px"></span>
          <span class="day">${esc(d.name)}</span>
        </div>`;
      }).join('')}
    </div>`;
}

// A line chart with one point per semester, and a dashed line for the goal.
// Body weight over time. The scale fits the weights (and the goal, when there is one), so small changes show.
export function weightChart(points, goal) {
  const W = 520, H = 200, left = 44, right = 24, top = 28, bottom = 36;
  const values = points.map((p) => p.kg).concat(goal === null ? [] : [goal]);
  const low = Math.floor(Math.min(...values) - 0.5), high = Math.ceil(Math.max(...values) + 0.5);
  const x = (i) => (points.length === 1 ? (left + W - right) / 2 : left + i * (W - left - right) / (points.length - 1));
  const y = (v) => top + (high - v) * (H - top - bottom) / (high - low);
  const step = Math.max(1, Math.ceil((high - low) / 4));
  const ticks = [];
  for (let v = low; v <= high; v += step) ticks.push(v);
  const short = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
  const ends = points.length === 1 ? [0] : [0, points.length - 1];
  return `
    <svg class="linechart" viewBox="0 0 ${W} ${H}" role="img"
         aria-label="Body weight from ${esc(short(points[0].date))}, ${points[0].kg} kg, to ${esc(short(points.at(-1).date))}, ${points.at(-1).kg} kg${goal === null ? '' : `. Goal ${goal} kg`}.">
      ${ticks.map((v) => `<line class="gridline" x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}"/>
        <text class="axis" x="${left - 10}" y="${y(v) + 5}" text-anchor="end">${v}</text>`).join('')}
      ${goal === null ? '' : `<line class="goal" x1="${left}" x2="${W - right}" y1="${y(goal)}" y2="${y(goal)}"/>`}
      <polyline class="series" points="${points.map((p, i) => `${x(i)},${y(p.kg)}`).join(' ')}" pathLength="1"/>
      ${points.map((p, i) => `<circle class="dot small" cx="${x(i)}" cy="${y(p.kg)}" r="4"/>
        <circle class="hit" cx="${x(i)}" cy="${y(p.kg)}" r="14" data-tip="${esc(short(p.date))}: ${p.kg} kg"/>`).join('')}
      ${ends.map((i) => `<text x="${x(i)}" y="${y(points[i].kg) - 12}" text-anchor="${i === 0 && points.length > 1 ? 'start' : points.length === 1 ? 'middle' : 'end'}">${points[i].kg}</text>
        <text class="axis" x="${x(i)}" y="${H - 8}" text-anchor="${i === 0 && points.length > 1 ? 'start' : points.length === 1 ? 'middle' : 'end'}">${esc(short(points[i].date))}</text>`).join('')}
    </svg>
    <div class="legend"><span><i></i>Body weight</span>${goal === null ? '' : `<span><i class="dash goal-dash"></i>Your goal: ${goal} kg</span>`}</div>`;
}

export function trendChart(points, goal, format) {
  const W = 520, H = 220, left = 44, right = 24, top = 28, bottom = 36, low = 0, high = 4;
  const x = (i) => (points.length === 1 ? (left + W - right) / 2 : left + i * (W - left - right) / (points.length - 1));
  const y = (v) => top + (high - v) * (H - top - bottom) / (high - low);
  const anchor = (i) => (points.length === 1 ? 'middle' : i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle');
  return `
    <svg class="linechart" viewBox="0 0 ${W} ${H}" role="img"
         aria-label="CGPA by semester: ${points.map((p) => `${esc(p.label)} ${format(p.value)}${p.projected ? ' heading' : ''}`).join(', ')}${goal === null ? '' : `. Goal ${format(goal)}`}.">
      ${[0, 1, 2, 3, 4].map((v) => `<line class="gridline" x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}"/>
        <text class="axis" x="${left - 10}" y="${y(v) + 5}" text-anchor="end">${v}</text>`).join('')}
      ${goal === null ? '' : `<line class="goal" x1="${left}" x2="${W - right}" y1="${y(goal)}" y2="${y(goal)}"/>`}
      <polyline class="series" points="${points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}" pathLength="1"/>
      ${points.map((p, i) => `
        <circle class="dot ${p.projected ? 'proj' : ''}" cx="${x(i)}" cy="${y(p.value)}" r="6"/>
        <text x="${x(i)}" y="${y(p.value) - 14}" text-anchor="${anchor(i)}">${format(p.value)}</text>
        <text class="axis" x="${x(i)}" y="${H - 8}" text-anchor="${anchor(i)}">${esc(p.label)}</text>
        <circle class="hit" cx="${x(i)}" cy="${y(p.value)}" r="22" data-tip="${esc(p.label)}: CGPA ${format(p.value)}${p.projected ? ' (heading)' : ''}"/>`).join('')}
    </svg>
    <div class="legend">
      <span><i></i>CGPA each semester</span>
      ${goal === null ? '' : `<span><i class="dash goal-dash"></i>Goal ${format(goal)}</span>`}
      <span>Hollow point: where this semester is heading</span>
    </div>`;
}
