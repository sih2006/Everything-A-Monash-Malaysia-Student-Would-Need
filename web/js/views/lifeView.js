// The View for the life tree. It draws what layoutLife placed, and nothing else.

import { esc } from '../format.js';
import { NODE_WIDTH, layoutLife } from '../viewmodels/lifeTree.js';
import { ICON, pageHead } from './parts.js';

const LEVEL_WORDS = { root: 'you', year: 'year', area: 'area', term: 'semester', unit: 'unit', assessment: 'assessment', month: 'month', week: 'week', day: 'day', meal: 'meal', item: 'entry' };

// A circle with two rings: the outer one is how much is done, the inner one how much time has gone.
function rings(n) {
  const R = 26, r = 19;
  const C = 2 * Math.PI * R, c = 2 * Math.PI * r;
  const outer = n.done === null ? '' : `<circle class="ring-done ${n.tone}" cx="32" cy="32" r="${R}" stroke-dasharray="${(n.done * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 32 32)"/>`;
  const inner = n.time === null ? '' : `<circle class="ring-time" cx="32" cy="32" r="${r}" stroke-dasharray="${(n.time * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 32 32)"/>`;
  const centre = n.done !== null ? `${Math.round(n.done * 100)}%` : n.level === 'year' ? esc(n.title.slice(2)) : '';
  return `<svg class="rings" viewBox="0 0 64 64" aria-hidden="true">
    <circle class="ring-track" cx="32" cy="32" r="${R}"/>${n.time === null ? '' : `<circle class="ring-track thin" cx="32" cy="32" r="${r}"/>`}
    ${outer}${inner}<text x="32" y="37">${centre}</text></svg>`;
}

function spoken(n) {
  const parts = [`${n.title}, ${LEVEL_WORDS[n.level] ?? ''}`, n.value, n.note];
  if (n.done !== null) parts.push(`${Math.round(n.done * 100)}% done`);
  if (n.time !== null) parts.push(`${Math.round(n.time * 100)}% of the time gone`);
  if (n.count) parts.push(n.open ? 'open' : `${n.count} inside, closed`);
  return parts.filter(Boolean).join('. ');
}

export function lifeDetail(n) {
  if (!n) return '';
  return `
    <div><p class="label">${esc(LEVEL_WORDS[n.level] ?? '')}${n.now ? ' · now' : ''}</p>
      <h2>${esc(n.title)}</h2><p class="big">${esc(n.value)}</p>${n.note ? `<p>${esc(n.note)}</p>` : ''}
      <p class="note">${[n.done === null ? '' : `${Math.round(n.done * 100)}% done`, n.time === null ? '' : `${Math.round(n.time * 100)}% of the time gone`, n.count ? `${n.count} inside` : ''].filter(Boolean).join(' · ')}</p></div>`;
}

export function lifeView(state, kinds) {
  const tabs = kinds.map(([id, label]) => `<button type="button" data-action="setMapKind" data-kind="${id}" aria-pressed="${state.mapKind === id}">${label}</button>`).join('');
  if (!state.life) {
    return `${pageHead('Map', 'Your life so far, year by year. Open any part to go deeper.')}<div class="seg" role="group" aria-label="Choose a map">${tabs}</div>
      <section class="card"><p class="note">${esc(state.lifeError ?? 'Loading the tree…')}</p></section>`;
  }
  const layout = layoutLife(state.life, state.lifeOpen, state.hidden);
  const selected = layout.nodes.find((n) => n.id === state.lifeSelected) ?? layout.nodes.find((n) => n.kind === 'now') ?? layout.nodes[0];
  // The year line runs straight down between the year circles. A branch leaves where the parent's
  // label ends and curves into the child's circle, so lines never cross any text.
  const path = (e) => {
    if (e.kind === 'trunk') return `M${e.from.x} ${e.from.y + 34} L${e.to.x} ${e.to.y - 34}`;
    const sx = e.from.x - 32 + NODE_WIDTH + 4, ex = e.to.x - 36;
    const bend = (ex - sx) / 2;
    return `M${sx} ${e.from.y} C${sx + bend} ${e.from.y}, ${ex - bend} ${e.to.y}, ${ex} ${e.to.y}`;
  };
  const edgeClass = (e) => (e.kind === 'trunk' ? `trunk ${e.now ? 'walked' : 'ahead'}` : e.now ? 'walked' : 'branch');

  return `
    ${pageHead('Map', 'Your years run down the left. Open a year to see its studies, money, food and health, then keep opening to the right.')}
    <div class="seg" role="group" aria-label="Choose a map">${tabs}</div>

    <section class="mapbox ${state.mapFull ? 'full' : ''}" aria-label="Your life tree">
      <div class="mapbar">
        <p class="note" id="mapHelp">Click a year or any circle to open or close it. Drag to move, pinch or Ctrl and scroll to zoom. Outer ring: done. Inner ring: time gone.</p>
        <div class="zoom" role="group" aria-label="Tree controls">
          <button type="button" data-action="lifeOpenToday">Open to today</button>
          <button type="button" data-action="lifeOpenAll">Open all</button>
          <button type="button" data-action="lifeCloseAll">Close all</button>
          <button type="button" data-zoom="out" aria-label="Zoom out">${ICON.minus}</button>
          <button type="button" data-zoom="fit">Show all</button>
          <button type="button" data-zoom="in" aria-label="Zoom in">${ICON.plus}</button>
          <button type="button" data-zoom="full" aria-pressed="${Boolean(state.mapFull)}">${state.mapFull ? 'Exit full page' : 'Full page'}</button>
        </div>
      </div>
      <div class="mapview life" id="mapview" tabindex="0" aria-label="Life tree. Arrow keys move it. Plus and minus zoom." aria-describedby="mapHelp">
        <div class="world" id="world" style="width:${layout.width}px; height:${layout.height}px">
          <svg class="route" width="${layout.width}" height="${layout.height}" aria-hidden="true">
            ${layout.edges.map((e) => `<path class="${edgeClass(e)}" d="${path(e)}"/>`).join('')}
          </svg>
          ${layout.nodes.map((n) => `
            <button type="button" class="lnode lv-${n.level} ${n.area ? `area-${n.area}` : ''} ${n.now ? 'is-now' : ''} ${n.ahead ? 'is-ahead' : ''} ${n.empty ? 'is-empty' : ''} ${n.id === selected.id ? 'is-picked' : ''}" data-node="${esc(n.id)}"
                    style="left:${n.x - 32}px; top:${n.y - 32}px" aria-label="${esc(spoken(n))}" aria-expanded="${n.count ? n.open : 'false'}">
              ${rings(n)}
              <span class="ltext"><strong>${esc(n.title)}</strong><span>${esc(n.value)}</span>${n.count ? `<small>${n.open ? 'Close' : `Open · ${n.count}`}</small>` : ''}</span>${n.count ? `<span class="lchev" aria-hidden="true">${n.open ? '−' : '+'}</span>` : ''}
            </button>`).join('')}
        </div>
      </div>
      <section class="here" id="mapDetail" aria-live="polite">${lifeDetail(selected)}</section>
    </section>`;
}
