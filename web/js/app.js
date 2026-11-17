// Start-up: this is where the parts are put together.
//   Model      api.js            talks to the backend
//   ViewModel  viewmodels/       holds the state, the commands and the presenters
//   View       views/            turns state into HTML
// This file connects them: it draws the View when the state changes, and it
// turns clicks and submitted forms into ViewModel commands.

import { createApi } from './api.js';
import { clamp, esc, f1 } from './format.js';
import { createAppViewModel } from './viewmodels/appViewModel.js';
import { layoutLife } from './viewmodels/lifeTree.js';
import { presentMap } from './viewmodels/present.js';
import { createMapCamera, mapView, placeStops, stopDetail } from './views/mapView.js';
import { budgetView, foodView, gradesView, healthView, homeView } from './views/screens.js';

const $ = (selector, root = document) => root.querySelector(selector);

// Browser storage can be blocked (private windows). The app must still work then.
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* carry on without it */ } }
};

const SCREENS = { home: homeView, grades: gradesView, budget: budgetView, food: foodView, health: healthView };
const view = $('#view');
const status = $('#status');
const camera = createMapCamera();
let mapSelected = -1;
let drawnTab = null;        // the screen now on the page
let lifeDrawn = false;      // the life tree is on the page, so the view should not jump back to today

const api = createApi({ getToken: () => storage.get('apiToken') ?? '' });
const vm = createAppViewModel({ api, storage, onChange: draw });

// ---------- drawing ----------

function drawStatus(state) {
  const message = state.error?.message ?? state.notice;
  status.hidden = !message;
  status.className = `status ${state.error ? 'bad' : 'fine'}`;
  status.setAttribute('role', state.error ? 'alert' : 'status');
  status.innerHTML = message ? `<span>${esc(message)}</span><button type="button" class="link" data-dismiss>Close</button>` : '';
}

function draw(state, info = {}) {
  drawStatus(state);
  document.body.classList.toggle('busy', state.busy);
  if (state.loading) return;

  if (state.loadError) {
    const locked = state.loadError.includes('locked');
    view.innerHTML = locked
      ? `<section class="card empty"><h1 class="page-title">This app is locked</h1>
          <p>Enter the access token that was set when the server was started.</p>
          <form class="form" data-token><div class="field"><label>Access token<input name="token" type="password" autocomplete="current-password" required></label></div><button class="btn primary" type="submit">Unlock</button></form></section>`
      : `<section class="card empty"><h1 class="page-title">The app could not start</h1><p>${esc(state.loadError)}</p>
          <p class="note">Start the server with <code>node backend/src/server.js</code>, then reload this page.</p></section>`;
    return;
  }
  // A failed command only updates the message. The screen is left alone, so nothing the user typed is lost.
  if (info.failed && drawnTab === state.tab) return;

  const open = [...view.querySelectorAll('details[open][data-key]')].map((d) => d.dataset.key);
  const navigated = drawnTab !== state.tab;

  // Example data must never be mistaken for the user's own: say so on every screen.
  const demo = state.overview.demo
    ? `<section class="banner warn demo" role="note"><h2>Example data, not yours</h2>
        <p>This server was started with <code>--demo</code>. Everything here is made up and is lost when it stops. Your own data is in the app started without <code>--demo</code>.</p></section>`
    : '';
  view.innerHTML = demo + (state.tab === 'map' ? mapView(state, mapSelected) : (SCREENS[state.tab] ?? homeView)(state)) +
    (state.overview.empty ? '' : `<p class="foot">${state.overview.demo ? 'Example data, kept in memory only.' : 'Kept on this computer only.'}</p>`);
  for (const key of open) view.querySelector(`details[data-key="${CSS.escape(key)}"]`)?.setAttribute('open', '');

  if (state.tab === 'map' && state.mapKind === 'life') {
    if (state.life) {
      camera.mount(layoutLife(state.life, state.lifeOpen, state.hidden).nodes, navigated || !lifeDrawn);
      lifeDrawn = true;
    }
  } else if (state.tab === 'map') {
    camera.mount(placeStops(presentMap(state.mapKind, state.overview, state.hidden).stops), navigated);
  }
  if (state.tab !== 'map' || state.mapKind !== 'life') lifeDrawn = false;
  document.body.classList.toggle('map-full', state.tab === 'map' && state.mapFull);
  if (state.imported) $('#import-review')?.scrollIntoView({ block: 'start' });

  document.querySelectorAll('.nav a').forEach((a) => {
    if (a.dataset.tab === state.tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  document.title = `${state.tab.charAt(0).toUpperCase() + state.tab.slice(1)} · Student companion`;
  if (navigated) {
    view.classList.remove('enter');
    void view.offsetWidth;          // restart the entrance animation
    view.classList.add('enter');
    window.scrollTo(0, 0);
    // Move focus to the new screen only when the user changed screens, not when the app first opens.
    // On first load, focus stays at the top so Tab reaches "Skip to content" and the menu first.
    if (drawnTab !== null) view.focus({ preventScroll: true });
  }
  drawnTab = state.tab;
}

// ---------- moving between screens ----------

const calm = matchMedia('(prefers-reduced-motion: reduce)');
function goToHash() {
  const tab = location.hash.replace('#', '') || 'home';
  mapSelected = -1;
  camera.reset();
  // Browsers that can do it cross-fade from the old screen to the new one.
  if (document.startViewTransition && !calm.matches && drawnTab) document.startViewTransition(() => vm.setTab(tab));
  else vm.setTab(tab);
}
window.addEventListener('hashchange', goToHash);

// ---------- commands ----------
// Each entry turns a click or a submitted form into one ViewModel command.
// `f` holds the form's fields, `d` holds the element's data-* values.

// Saves the exported data as a .json file in the browser's downloads.
function download(file) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `student-companion-${file.exportedOn}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

const readText = (file) => {
  if (file.size > 8 * 1024 * 1024) return Promise.reject(new Error('That file is larger than 8 MB, so it cannot be an export from this app.'));
  return file.text();
};

const readPicture = (file) => new Promise((resolve, reject) => {
  if (file.size > 5 * 1024 * 1024) { reject(new Error('That picture is larger than 5 MB. Choose a smaller one.')); return; }
  const reader = new FileReader();
  reader.onload = () => resolve({ base64: String(reader.result).split(',')[1], mimeType: file.type });
  reader.onerror = () => reject(new Error('The picture could not be read.'));
  reader.readAsDataURL(file);
});

const COMMANDS = {
  loadDemo: () => vm.loadDemo(),
  toggleAllSpending: () => vm.toggleAllSpending(),
  exportData: async () => { const file = await vm.exportData(); if (file) download(file); },
  importData: async (f) => vm.importData(await readText(f.file)),
  deleteEverything: (f) => vm.deleteEverything(f.confirm),
  showPeriod: (f, d) => vm.showPeriod(d.slice, Number(d.step)),
  showCurrent: (f, d) => vm.showCurrent(d.slice),
  setMapKind: (f, d) => { mapSelected = -1; camera.reset(); lifeDrawn = false; vm.setMapKind(d.kind); },
  lifeOpenToday: () => { vm.lifeOpenToday(); camera.goTo(camera.findMe(), true); },
  lifeOpenAll: () => { vm.lifeOpenAll(); camera.showAll(true); },
  lifeCloseAll: () => { vm.lifeCloseAll(); camera.showAll(true); },

  addUnit: (f) => vm.addUnit(f),
  deleteUnit: (f, d) => vm.deleteUnit(d.code),
  saveUnitDetails: (f, d) => vm.saveUnitDetails(d.code, f),
  setTarget: (f, d) => vm.setTarget(d.code, f.target.trim()),
  addAssessment: (f, d) => vm.addAssessment(d.code, f),
  saveMark: (f, d) => vm.saveMark(d.id, f),
  saveHurdle: (f, d) => vm.saveHurdle(d.id, f.hurdle),
  deleteAssessment: (f, d) => vm.deleteAssessment(d.id),
  addResult: (f) => vm.addResult(f),
  deleteResult: (f, d) => vm.deleteResult(d.id),
  saveGoal: (f) => vm.saveGoal(f),
  clearGoal: () => vm.clearGoal(),
  saveTermDates: (f) => vm.saveTermDates(f),
  askPlan: () => vm.askPlan(),
  readScreenshot: async (f, d) => vm.readScreenshot(d.code, await readPicture(f.picture)),
  cancelImport: () => vm.cancelImport(),
  confirmImport: (f) => {
    const rows = [];
    for (let i = 0; `name-${i}` in f; i++) {
      if (f[`keep-${i}`] === 'on') rows.push({ name: f[`name-${i}`], weight: f[`weight-${i}`], score: f[`score-${i}`], max: f[`max-${i}`] });
    }
    return vm.confirmImport(rows);
  },

  saveBudgetLimit: (f) => vm.saveBudgetLimit(f.limit),
  addCategory: (f) => vm.addCategory(f),
  deleteCategory: (f, d) => vm.deleteCategory(d.id),
  addSpending: (f) => vm.addSpending(f),
  deleteSpending: (f, d) => vm.deleteSpending(d.id),
  addAccount: (f) => vm.addAccount(f),
  deleteAccount: (f, d) => vm.deleteAccount(Number(d.id)),
  setBalance: (f, d) => vm.setBalance(Number(d.id), f.balance),
  addIncome: (f, d) => vm.addIncome(Number(d.id), f),
  transfer: (f) => vm.transfer(f),
  deleteAccountMove: (f, d) => vm.deleteAccountMove(Number(d.id)),

  saveFoodTargets: (f) => vm.saveFoodTargets(f),
  logFood: (f) => vm.logFood(f),
  quickAddFood: (f, d) => vm.quickAddFood(d.id, $('select[name="quickMeal"]', view)?.value ?? 'Snack'),
  deleteFood: (f, d) => vm.deleteFood(d.id),
  forgetFood: (f, d) => vm.forgetFood(d.id),

  saveHealthTargets: (f) => vm.saveHealthTargets(f),
  saveToday: (f) => vm.saveToday(f),
  addWorkout: (f) => vm.addWorkout(f),
  deleteWorkout: (f, d) => vm.deleteWorkout(d.id),
  addWater: (f, d) => vm.addWater(Number(d.ml)),
  addExercise: (f, d) => vm.addExercise(Number(d.id), f),
  deleteExercise: (f, d) => vm.deleteExercise(d.id)
};

async function runCommand(name, fields, element) {
  if (vm.state.busy || !COMMANDS[name]) return;
  if (element.dataset.confirm && !window.confirm(element.dataset.confirm)) return;
  try {
    await COMMANDS[name](fields, element.dataset);
  } catch (problem) {
    vm.state.error = { message: problem.message };
    drawStatus(vm.state);
  }
}

view.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.matches('[data-token]')) {      // the "app is locked" form
    storage.set('apiToken', form.token.value);
    vm.load();
    return;
  }
  if (!form.dataset.action) return;
  const fields = {};
  for (const [key, value] of new FormData(form)) fields[key] = typeof value === 'string' ? value : value;
  runCommand(form.dataset.action, fields, form);
});

view.addEventListener('click', (e) => {
  const stop = e.target.closest('[data-stop]');
  if (stop) {                              // a stop on the map: show its details and centre it
    mapSelected = Number(stop.dataset.stop);
    view.querySelectorAll('.mstop').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.stop) === mapSelected)));
    $('#mapDetail').innerHTML = stopDetail(camera.stop(mapSelected));
    camera.goTo(mapSelected, true);
    return;
  }
  const lifeNode = e.target.closest('[data-node]');
  if (lifeNode) {                          // a node of the life tree: open or close it, keeping it still on screen
    const id = lifeNode.dataset.node;
    const before = camera.stopById(id);
    const where = before && { x: before.x, y: before.y };
    vm.toggleLifeNode(id);
    camera.follow(where, camera.stopById(id));
    $(`[data-node="${CSS.escape(id)}"]`, view)?.focus({ preventScroll: true });
    return;
  }
  const zoom = e.target.closest('[data-zoom]');
  if (zoom) {
    const how = zoom.dataset.zoom;
    if (how === 'full') { vm.toggleMapFull(); camera.apply(false); return; }
    if (how === 'fit') camera.showAll(true);
    else if (how === 'here') $(`.mstop[data-stop="${camera.findMe()}"]`, view)?.click();
    else camera.zoomBy(how === 'in' ? 1.3 : 1 / 1.3);
    return;
  }
  const button = e.target.closest('button[data-action]');
  if (button) runCommand(button.dataset.action, {}, button);
});

status.addEventListener('click', (e) => { if (e.target.closest('[data-dismiss]')) vm.dismiss(); });

// Escape leaves the full-page map.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && vm.state.mapFull) { vm.toggleMapFull(); camera.apply(false); }
});

// The what-if slider asks the backend and shows the answer. Nothing is saved.
let whatIfTimer = null;
// A choice in a drop-down list that changes the view straight away, with no Save button.
view.addEventListener('change', (e) => {
  const choice = e.target.closest('select[data-choose]');
  if (!choice) return;
  if (choice.dataset.choose === 'unitOrder') vm.setUnitOrder(choice.value);
  if (choice.dataset.choose === 'spendingCategory') vm.setSpendingCategory(choice.value);
  if (choice.dataset.choose === 'resultOrder') vm.setResultOrder(choice.value);
});

view.addEventListener('input', (e) => {
  const slider = e.target.closest('[data-whatif]');
  if (!slider) return;
  const box = slider.closest('.whatif');
  $('[data-whatif-value]', box).textContent = slider.value;
  clearTimeout(whatIfTimer);
  whatIfTimer = setTimeout(async () => {
    const answer = await vm.whatIf(slider.dataset.whatif, slider.value);
    if (!answer) return;
    $('[data-whatif-out]', box).textContent = answer.hurdleFail
      ? `Final mark ${f1(answer.finalMark)}, but that is below a hurdle, so the unit would be a hurdle fail.`
      : `Final mark ${f1(answer.finalMark)}, grade ${answer.grade}.${answer.reachesTarget === null ? '' : answer.reachesTarget ? ' Target reached.' : ' Below your target.'}`;
  }, 120);
});

// ---------- the controls in the side menu ----------

const root = document.documentElement;
const gradesButton = $('#toggleGrades'), themeButton = $('#toggleTheme'), lookSelect = $('#lookSelect');

function syncControls() {
  gradesButton.setAttribute('aria-pressed', String(vm.state.hidden));
  $('#toggleGradesLabel').textContent = vm.state.hidden ? 'Show grades' : 'Hide grades';
  const market = root.dataset.look === 'market';      // the night market look is always dark
  const dark = root.dataset.theme === 'dark';
  themeButton.disabled = market;
  $('#toggleThemeLabel').textContent = market ? 'Always dark' : dark ? 'Light mode' : 'Dark mode';
  themeButton.setAttribute('aria-label', market ? 'This look is always dark' : dark ? 'Switch to light mode' : 'Switch to dark mode');
}
function applyLook(look) {
  root.dataset.look = look;
  root.dataset.theme = look === 'market' ? 'dark' : storage.get('theme') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  syncControls();
}
gradesButton.addEventListener('click', () => { vm.toggleHidden(); syncControls(); });
themeButton.addEventListener('click', () => {
  storage.set('theme', root.dataset.theme === 'dark' ? 'light' : 'dark');
  applyLook(root.dataset.look);
});
lookSelect.value = root.dataset.look || 'tropical';
lookSelect.addEventListener('change', () => { storage.set('look', lookSelect.value); applyLook(lookSelect.value); });

// ---------- the small label that follows chart marks ----------

const tip = $('#tip');
view.addEventListener('pointerover', (e) => {
  const target = e.target.closest('[data-tip]');
  if (!target) { tip.hidden = true; return; }
  const box = target.getBoundingClientRect();
  tip.textContent = target.dataset.tip;
  tip.style.left = clamp(box.left + box.width / 2, 90, window.innerWidth - 90) + 'px';
  tip.style.top = Math.max(48, box.top) + 'px';
  tip.hidden = false;
});
view.addEventListener('pointerleave', () => { tip.hidden = true; });
window.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });
window.addEventListener('resize', () => { if (vm.state.tab === 'map') camera.apply(false); });

// ---------- start ----------

applyLook(lookSelect.value);
vm.state.tab = location.hash.replace('#', '') || 'home';
vm.load();

// Lets the app open again when the server cannot be reached, and be installed on a phone.
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { /* not available: the app still works */ });
