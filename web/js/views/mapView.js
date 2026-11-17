// The map screen: a path of stops that runs left to right and can be dragged and zoomed.
//
// `mapView` draws it. `createMapCamera` holds where the map is looking and
// listens for drag, pinch, scroll and keys. The stops themselves come from
// presentMap in the ViewModel.

import { clamp, esc } from '../format.js';
import { MAP_KINDS, presentMap } from '../viewmodels/present.js';
import { ICON, bar, chip, pageHead } from './parts.js';
import { lifeView } from './lifeView.js';

const STEP = 250, PAD = 150, HEIGHT = 400, MIDDLE = 180;
const PIN_HALF = { done: 38, ahead: 38, now: 54, goal: 84 };
// What a screen reader says after a stop's name.
const SPOKEN = { done: 'finished', now: 'you are here', ahead: 'still ahead', goal: 'your goal' };

// The outline of the goal: a circle with soft petals around the edge.
const FLOWER = (() => {
  const points = [];
  for (let i = 0; i < 120; i++) {
    const angle = i / 120 * Math.PI * 2;
    const radius = 45 + 5 * Math.cos(angle * 10);
    points.push(`${(50 + radius * Math.cos(angle)).toFixed(1)}% ${(50 + radius * Math.sin(angle)).toFixed(1)}%`);
  }
  return `polygon(${points.join(',')})`;
})();

// Gives every stop its place. They step up and down a little so the path winds.
export function placeStops(stops) {
  let up = true;
  stops.forEach((stop, i) => {
    stop.x = PAD + i * STEP;
    if (stop.kind === 'now' || stop.kind === 'goal') { stop.y = MIDDLE; return; }
    stop.y = MIDDLE + (up ? -55 : 55);
    up = !up;
  });
  return stops;
}

export function stopDetail(stop) {
  if (!stop) return '';
  if (stop.kind === 'now') {
    return `
      <div><h2>${esc(stop.title)}</h2><p class="note">${esc(stop.note)} Filled steps are done. Dashed steps are still to do.</p></div>
      ${stop.tasks.map((t) => `
        <div class="task">
          <div class="head"><strong>${esc(t.title)}</strong>${chip(t.chip)}</div>
          <ol class="steps">
            ${t.done.map((text) => `<li>${esc(text)}</li>`).join('')}
            ${t.todo.map((text) => `<li class="todo">${esc(text)}</li>`).join('')}
          </ol>
          ${t.note ? `<p class="note">${esc(t.note)}</p>` : ''}
        </div>`).join('')}`;
  }
  const label = stop.kind === 'done' ? 'Finished' : stop.kind === 'goal' ? 'Your goal' : 'Still ahead';
  return `<div><p class="label">${label}</p><h2>${esc(stop.title)}</h2><p>${esc(stop.note)}</p></div>`;
}

export function mapView(state, selected) {
  if (state.mapKind === 'life') return lifeView(state, MAP_KINDS);
  const map = presentMap(state.mapKind, state.overview, state.hidden);
  const stops = placeStops(map.stops);
  const now = stops.findIndex((s) => s.kind === 'now');
  const width = PAD * 2 + Math.max(0, stops.length - 1) * STEP;

  // The path between stops, with a small triangle on each part that points the way to the goal.
  const curve = (a, b) => `M${a.x} ${a.y} C${a.x + 110} ${a.y}, ${b.x - 110} ${b.y}, ${b.x} ${b.y} `;
  let walked = '', ahead = '', arrows = '';
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i];
    const done = i <= now;
    if (done) walked += curve(a, b); else ahead += curve(a, b);
    const turn = (Math.atan2(1.5 * (b.y - a.y), 165 + 1.5 * (b.x - a.x - 220)) * 180 / Math.PI).toFixed(1);
    arrows += `<polygon class="${done ? 'walked' : ''}" points="-9,-9 11,0 -9,9" transform="translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2}) rotate(${turn})"/>`;
  }

  const pin = (stop) => {
    if (stop.kind === 'now') return '<span class="pin now"><span>You are here</span></span>';
    if (stop.kind === 'goal') {
      return `<span class="pin goal" style="clip-path:${FLOWER}"><span class="core"><span>${esc(stop.top)}</span><b class="${stop.small ? 'small' : ''}">${esc(stop.big)}</b><span>${esc(stop.bottom)}</span></span></span>`;
    }
    return `<span class="pin ${stop.kind === 'done' ? 'done' : ''}">${stop.icon === 'check' ? ICON.check : esc(stop.pin)}</span>`;
  };
  const chosen = selected >= 0 && selected < stops.length ? selected : now;

  return `
    ${pageHead('Map', 'How every task leads to your goal. Pick a path, then follow it to the right.')}

    <div class="seg" role="group" aria-label="Choose a map">
      ${MAP_KINDS.map(([id, label]) => `<button type="button" data-action="setMapKind" data-kind="${id}" aria-pressed="${state.mapKind === id}">${label}</button>`).join('')}
    </div>

    <section class="card">
      ${map.chain.length ? `<div class="chain" aria-label="How a task reaches your goal">${map.chain.map((step) => `<span>${esc(step)}</span>`).join(ICON.arrow)}</div>` : ''}
      <p>${esc(map.summary)}</p>
      ${map.stops.length ? bar(map.progress, map.tone) : ''}
    </section>

    ${stops.length === 0 ? '' : `
    <section class="mapbox ${state.mapFull ? 'full' : ''}" aria-label="Your path to the goal">
      <div class="mapbar">
        <p class="note" id="mapHelp">Drag to move. Pinch, or hold Ctrl and scroll, to zoom. Pick a stop to see it below.</p>
        <div class="zoom" role="group" aria-label="Zoom">
          <button type="button" data-zoom="out" aria-label="Zoom out">${ICON.minus}</button>
          <button type="button" data-zoom="fit">Show all</button>
          <button type="button" data-zoom="here">Find me</button>
          <button type="button" data-zoom="in" aria-label="Zoom in">${ICON.plus}</button>
          <button type="button" data-zoom="full" aria-pressed="${Boolean(state.mapFull)}">${state.mapFull ? 'Exit full page' : 'Full page'}</button>
        </div>
      </div>
      <div class="mapview" id="mapview" tabindex="0" aria-label="Map. Arrow keys move it. Plus and minus zoom." aria-describedby="mapHelp">
        <div class="world" id="world" style="width:${width}px; height:${HEIGHT}px">
          <svg class="route" width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}" aria-hidden="true">
            <path class="ahead" d="${ahead}"/>
            <path class="walked" d="${walked}" pathLength="1"/>
            ${arrows}
          </svg>
          ${stops.map((stop, i) => `
            <button type="button" class="mstop" data-stop="${i}" aria-pressed="${i === chosen}" aria-label="${esc(`${stop.title}, ${SPOKEN[stop.kind]}`)}"
                    style="left:${stop.x}px; top:${stop.y - PIN_HALF[stop.kind]}px; --i:${i}">
              ${pin(stop)}
              <span class="mlabel"><strong>${esc(stop.title)}</strong></span>
            </button>`).join('')}
        </div>
      </div>
    <section class="here" id="mapDetail" aria-live="polite">${stopDetail(stops[chosen])}</section>
    </section>`}`;
}

// Holds where the map is looking: how far it has moved (x, y) and how much it is zoomed (k).
export function createMapCamera() {
  const cam = { x: 0, y: 0, k: 1 };
  let stops = [];
  let placed = false;      // false until the camera has been pointed at "you are here"
  const frame = () => document.querySelector('#mapview');
  const world = () => document.querySelector('#world');

  function apply(smooth) {
    const f = frame(), w = world();
    if (!f || !w) return;
    // Keep the map inside its frame. A map smaller than the frame sits in the middle.
    const width = w.offsetWidth * cam.k, height = w.offsetHeight * cam.k;
    cam.x = width <= f.clientWidth ? (f.clientWidth - width) / 2 : clamp(cam.x, f.clientWidth - width, 0);
    cam.y = height <= f.clientHeight ? (f.clientHeight - height) / 2 : clamp(cam.y, f.clientHeight - height, 0);
    w.classList.toggle('smooth', Boolean(smooth));
    w.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.k})`;
  }

  // Zoom while one point of the frame stays still, so the map grows around the pointer.
  function zoomAt(k, px, py, smooth) {
    const next = clamp(k, 0.35, 2.2);
    cam.x = px - (px - cam.x) * next / cam.k;
    cam.y = py - (py - cam.y) * next / cam.k;
    cam.k = next;
    apply(smooth);
  }
  const zoomBy = (factor) => zoomAt(cam.k * factor, frame().clientWidth / 2, frame().clientHeight / 2, true);

  function showAll(smooth) {
    const f = frame(), w = world();
    cam.k = clamp(Math.min(f.clientWidth / w.offsetWidth, f.clientHeight / w.offsetHeight), 0.35, 1);
    cam.x = 0; cam.y = 0;
    apply(smooth);
  }

  function goTo(index, smooth) {
    const f = frame(), stop = stops[index];
    if (!f || !stop) return;
    cam.x = f.clientWidth / 2 - stop.x * cam.k;
    cam.y = f.clientHeight / 2 - (stop.y + 30) * cam.k;
    apply(smooth);
  }

  // Call after the map screen has been drawn. `fresh` points the camera at "you are here" again.
  function mount(placedStops, fresh) {
    stops = placedStops;
    const f = frame();
    if (!f) return;
    if (fresh || !placed) {
      cam.k = 1;
      goTo(stops.findIndex((s) => s.kind === 'now'), false);
      placed = true;
    } else {
      apply(false);
    }

    const touches = new Map();
    const drag = { x: 0, y: 0, camX: 0, camY: 0, moved: false, gap: 0, k: 1 };
    const spread = () => { const p = [...touches.values()]; return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };

    f.addEventListener('pointerdown', (e) => {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      drag.x = e.clientX; drag.y = e.clientY; drag.camX = cam.x; drag.camY = cam.y; drag.moved = false;
      if (touches.size === 2) { drag.gap = spread(); drag.k = cam.k; }
    });
    f.addEventListener('pointermove', (e) => {
      const touch = touches.get(e.pointerId);
      if (!touch) return;
      touch.x = e.clientX; touch.y = e.clientY;
      if (touches.size === 2) {
        const box = f.getBoundingClientRect(), p = [...touches.values()];
        zoomAt(drag.k * spread() / drag.gap, (p[0].x + p[1].x) / 2 - box.left, (p[0].y + p[1].y) / 2 - box.top, false);
        drag.moved = true;
        return;
      }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;   // a small wobble is still a tap
      if (!drag.moved) {
        drag.moved = true;
        f.classList.add('dragging');
        try { f.setPointerCapture(e.pointerId); } catch { /* the pointer is already gone: keep dragging anyway */ }
      }
      cam.x = drag.camX + dx; cam.y = drag.camY + dy;
      apply(false);
    });
    const lift = (e) => { touches.delete(e.pointerId); f.classList.remove('dragging'); };
    f.addEventListener('pointerup', lift);
    f.addEventListener('pointercancel', lift);

    f.addEventListener('wheel', (e) => {
      const box = f.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomAt(cam.k * Math.exp(-e.deltaY * 0.0022), e.clientX - box.left, e.clientY - box.top, false);
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();     // a sideways scroll moves along the path
        cam.x -= e.deltaX;
        apply(false);
      }
    }, { passive: false });

    f.addEventListener('dblclick', (e) => {
      if (e.target.closest('.mstop')) return;
      const box = f.getBoundingClientRect();
      zoomAt(cam.k * 1.5, e.clientX - box.left, e.clientY - box.top, true);
    });

    f.addEventListener('keydown', (e) => {
      const moves = { ArrowLeft: [90, 0], ArrowRight: [-90, 0], ArrowUp: [0, 90], ArrowDown: [0, -90] };
      if (moves[e.key]) { e.preventDefault(); cam.x += moves[e.key][0]; cam.y += moves[e.key][1]; apply(true); }
      else if (e.key === '+' || e.key === '=') zoomBy(1.3);
      else if (e.key === '-') zoomBy(1 / 1.3);
      else if (e.key === '0') showAll(true);
    });

    // Moving through the stops with the Tab key brings each one into view.
    f.addEventListener('focusin', (e) => {
      const stop = e.target.closest('.mstop');
      if (stop && stop.matches(':focus-visible')) goTo(Number(stop.dataset.stop), true);
    });
  }

  return {
    mount, apply, goTo, showAll, zoomBy,
    reset() { placed = false; },
    findMe() { cam.k = 1; return stops.findIndex((s) => s.kind === 'now'); },
    stop: (index) => stops[index],
    stopById: (id) => stops.find((s) => s.id === id),
    // Moves the view by how far a node moved, so it stays still on screen when the tree around it changes.
    follow(before, after) {
      if (!before || !after) return;
      cam.x -= (after.x - before.x) * cam.k;
      cam.y -= (after.y - before.y) * cam.k;
      apply(false);
    }
  };
}
