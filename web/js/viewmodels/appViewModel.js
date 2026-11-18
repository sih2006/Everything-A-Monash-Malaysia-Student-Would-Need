// ViewModel, part 2: the state of the app and the commands that change it.
//
// The View never talks to the backend. It shows `state` and calls a command
// when the user does something. A command checks what was typed, calls the
// API, puts the answer into `state` and tells the View to draw again.
//
// This file has no HTML and does not touch the page, so every command can be
// tested with a fake API (see web/test/appViewModel.test.js).

import { DEFAULT_SPAN, isSpan } from './expenses.js';
import { isFoodTab } from './food.js';

// The currencies amounts can be shown in. Ringgit first: it is what everything is stored and typed in.
export const SHOW_IN = ['MYR', 'USD', 'OMR', 'CZK', 'CAD', 'IDR'];
import { ApiError } from '../api.js';
import { addDays, addMonths, lastDayOf, typedNumber } from '../format.js';
import { openAll, openToToday, startOpen } from './lifeTree.js';

const TABS = ['home', 'map', 'grades', 'budget', 'food', 'health', 'more'];

// Budget is looked at by month, food and health by day. These say how to name and fetch a period.
const PERIODS = {
  budget: { keyOf: (data) => data.month, current: (today) => today.slice(0, 7), step: addMonths },
  food: { keyOf: (data) => data.date, current: (today) => today, step: addDays },
  health: { keyOf: (data) => data.date, current: (today) => today, step: addDays }
};

function hiddenAtStart(storage) {
  const saved = storage.get('hideNumbers');
  if (saved !== null) return saved === '1';
  return storage.get('hideGrades') === '1' || storage.get('hideMoney') === '1';
}

// The Budget screen's tabs: everything at a glance, bank and e-wallet accounts, investing, and spending.
export const BUDGET_TABS = ['all', 'banking', 'investing', 'expenses'];
function savedAccounts(text) {
  try {
    const saved = JSON.parse(text ?? '{}');
    return { banking: Number(saved?.banking) || null, investing: Number(saved?.investing) || null };
  } catch { return { banking: null, investing: null }; }
}

export function createAppViewModel({ api, storage, onChange = () => {} }) {
  const state = {
    loading: true,
    overview: null,        // everything the backend knows, loaded in one call
    loadError: null,       // set when the first load failed
    error: null,           // { message, field } from the last command that failed
    notice: null,          // a short "it worked" message
    busy: false,
    tab: 'home',
    mapKind: 'life',
    life: null,             // the life tree from the backend, loaded when the map opens
    lifeError: null,
    lifeOpen: new Set(),    // ids of the tree nodes that are open
    lifeSelected: null,     // the node whose details show under the tree
    mapFull: false,         // the map fills the whole page
    unitOrder: storage.get('unitOrder') ?? 'code',   // how the units on Grades are ordered
    predictions: {},        // the what-if sliders that were moved: { unit code: percent on what is left }
    predicted: null,        // the semester totals with those predictions, from the engine
    resultOrder: storage.get('resultOrder') ?? 'term', // how the finished units are ordered
    budgetTab: BUDGET_TABS.includes(storage.get('budgetTab')) ? storage.get('budgetTab') : 'all', // the Budget tab that is open
    budgetAccount: savedAccounts(storage.get('budgetAccount')),  // the account shown on Banking and on Investing: { banking: id, investing: id }
    foodTab: isFoodTab(storage.get('foodTab')) ? storage.get('foodTab') : 'today',   // the Food tab that is open
    goalPlan: null,         // targets worked out from the weight goal, shown until the user uses or leaves them
    eatMeal: null,          // the meal What to eat shows; null means "the meal for the time of day"
    foodImport: null,       // food read from a picture, waiting for the user to check: [{ food, kcal, protein }]
    expenseSpan: isSpan(storage.get('expenseSpan')) ? storage.get('expenseSpan') : DEFAULT_SPAN, // the period the Expenses tab looks back over
    currency: null,         // exchange rates from the backend; null until loaded, or when they could not load
    showIn: SHOW_IN.includes(storage.get('showIn')) ? storage.get('showIn') : 'MYR', // amounts on screen are shown in this currency
    conversion: null,       // the converter's last question: { amount, from }
    spendingCategory: 'all',                          // which spending the Budget list shows
    showAllSpending: false,
    // "Hide numbers": marks, grades and targets are masked, and every RM amount shows as RM •••.
    // It replaced two switches (hide grades, hide money); either one being on keeps numbers hidden.
    hidden: hiddenAtStart(storage),
    plan: null,            // the AI helper's last plan
    imported: null,        // { code, items } read from a screenshot, waiting for the user to check
    // Data for a past month or day the user is looking at. null means the current one, which lives in `overview`.
    // Home and the map always use `overview`, so they always show today.
    views: { budget: null, food: null, health: null }
  };
  // Tells the View to draw again. `failed` means "a command just failed": the View then
  // only shows the message and leaves the screen alone, so typed text is not lost.
  const changed = (info = {}) => onChange(state, info);

  // Turns typed text into a number, or stops the command with a clear message.
  function number(text, label, { required = true } = {}) {
    const value = typedNumber(text);
    if (value === null && required) throw new ApiError(400, 'invalid', `${label} cannot be empty.`);
    if (Number.isNaN(value)) throw new ApiError(400, 'invalid', `${label} must be a number.`);
    return value;
  }

  // Runs one command. `slice` names the part of the overview that the API call returns.
  async function act(slice, work, notice = null) {
    state.busy = true;
    state.error = null;
    state.notice = null;
    let failed = false;
    try {
      const result = await work();
      if (PERIODS[slice]) await settlePeriod(slice, result);
      else if (slice) state.overview[slice] = result;
      if (slice) {
        state.overview.empty = false;
        if (slice === 'academics') state.overview.academicsError = null;
      }
      state.notice = notice;
      return true;
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      failed = true;
      state.error = { message: error.message, field: error.field };
      return false;
    } finally {
      state.busy = false;
      changed({ failed });
    }
  }

  // The data now on the Budget, Food or Health screen.
  const shown = (slice) => state.views[slice] ?? state.overview[slice];
  const fetchPeriod = (slice, key) => api[slice](key);

  // After a change, both the period being looked at and the current one must be up to date,
  // whichever one the change happened to answer with.
  async function settlePeriod(slice, result) {
    const period = PERIODS[slice];
    const current = period.current(state.overview.today);
    const answered = period.keyOf(result);
    if (state.views[slice]) {
      const viewed = period.keyOf(state.views[slice]);
      state.views[slice] = answered === viewed ? result : await fetchPeriod(slice, viewed);
    }
    state.overview[slice] = answered === current ? result : await fetchPeriod(slice);
  }

  async function loadLife() {
    try {
      state.life = await api.life();
      state.lifeError = null;
      if (state.lifeOpen.size === 0) state.lifeOpen = startOpen(state.life);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      state.lifeError = error.message;
    }
    changed();
  }

  async function load() {
    try {
      state.overview = await api.overview();
      state.loadError = null;
    } catch (error) {
      state.loadError = error.message;
    }
    state.loading = false;
    changed();
    // Exchange rates come second: if they cannot load, the rest of the app is not held up.
    if (!state.loadError) {
      try { state.currency = await api.currency(); changed(); } catch (error) { if (!(error instanceof ApiError)) throw error; }
    }
    // Opened straight onto the map: fetch the tree too.
    if (!state.loadError && state.tab === 'map' && state.mapKind === 'life') await loadLife();
  }
  const reload = (work, notice) => act(null, async () => { await work(); state.overview = await api.overview(); }, notice);

  return {
    state,
    load,
    loadLife,

    // ----- moving around and personal settings -----
    setTab(tab) {
      state.tab = TABS.includes(tab) ? tab : 'home';
      state.error = null;
      state.notice = null;
      if (state.tab !== 'map') state.mapFull = false;
      changed();
      // The tree is built from everything, so it is fetched again each time the map opens.
      if (state.tab === 'map' && state.mapKind === 'life') loadLife();
    },
    setMapKind(kind) {
      state.mapKind = kind;
      changed();
      if (kind === 'life') loadLife();
    },
    toggleLifeNode(id) {
      if (state.lifeOpen.has(id)) state.lifeOpen.delete(id);
      else state.lifeOpen.add(id);
      state.lifeSelected = id;
      changed();
    },
    lifeOpenToday() { if (state.life) { state.lifeOpen = openToToday(state.life, state.lifeOpen); changed(); } },
    lifeOpenAll() { if (state.life) { state.lifeOpen = openAll(state.life, 'month'); changed(); } },
    lifeCloseAll() { if (state.life) { state.lifeOpen = new Set([state.life.id]); state.lifeSelected = null; changed(); } },
    toggleMapFull() { state.mapFull = !state.mapFull; changed(); },
    setUnitOrder(order) {
      state.unitOrder = ['code', 'name', 'attention', 'need', 'average', 'left'].includes(order) ? order : 'code';
      storage.set('unitOrder', state.unitOrder);
      changed();
    },
    setResultOrder(order) {
      state.resultOrder = ['term', 'mark-high', 'mark-low', 'grade', 'code', 'level'].includes(order) ? order : 'term';
      storage.set('resultOrder', state.resultOrder);
      changed();
    },
    setBudgetTab(tab) {
      state.budgetTab = BUDGET_TABS.includes(tab) ? tab : 'all';
      storage.set('budgetTab', state.budgetTab);
      changed();
    },
    // Opens one account on its tab. The other accounts stay out of sight until picked.
    showAccount(group, id) {
      if (!['banking', 'investing'].includes(group)) return;
      state.budgetAccount = { ...state.budgetAccount, [group]: id };
      state.budgetTab = group;
      storage.set('budgetAccount', JSON.stringify(state.budgetAccount));
      storage.set('budgetTab', group);
      changed();
    },
    setShowIn(code) {
      state.showIn = SHOW_IN.includes(code) ? code : 'MYR';
      storage.set('showIn', state.showIn);
      changed();
    },
    refreshRates: () => act(null, async () => { state.currency = await api.refreshRates(); }, 'Rates updated.'),
    // A rate typed by hand: "1 USD = 4.25 RM". An empty box removes it, so the live rate counts again.
    setManualRate: (f) => act(null, async () => {
      const value = number(f.value, `The rate for ${f.code}`, { required: false });
      if (value !== null && !(value > 0)) throw new ApiError(400, 'invalid', 'A rate must be above 0.');
      state.currency = await api.setManualRate(f.code, value);
    }, 'Rate saved.'),
    convertAmount(f) {
      const amount = typedNumber(f.amount);
      state.conversion = amount === null || Number.isNaN(amount) ? null : { amount, from: SHOW_IN.includes(f.from) ? f.from : 'MYR' };
      changed();
    },
    setExpenseSpan(span) {
      state.expenseSpan = isSpan(span) ? span : DEFAULT_SPAN;
      storage.set('expenseSpan', state.expenseSpan);
      changed();
    },
    setSpendingCategory(category) { state.spendingCategory = category || 'all'; state.showAllSpending = false; changed(); },
    toggleAllSpending() { state.showAllSpending = !state.showAllSpending; changed(); },

    shown,
    // Moves Budget back or forward a month, or Food and Health back or forward a day. Never past today.
    showPeriod: (slice, step) => act(null, async () => {
      const period = PERIODS[slice];
      const current = period.current(state.overview.today);
      const next = period.step(period.keyOf(shown(slice)), step);
      if (next > current) throw new ApiError(400, 'invalid', 'That has not happened yet.');
      state.views[slice] = next === current ? null : await fetchPeriod(slice, next);
    }),
    showCurrent(slice) { state.views[slice] = null; state.error = null; state.notice = null; changed(); },
    toggleHidden() {
      state.hidden = !state.hidden;
      storage.set('hideNumbers', state.hidden ? '1' : '0');
      state.error = null;
      state.notice = null;
      changed();
    },
    dismiss() { state.error = null; state.notice = null; changed(); },

    loadDemo: () => reload(() => api.loadDemo(), 'Example data loaded. Everything in it is made up.'),

    // Gets everything as one object. Saving it as a file is the View's job, because it needs the page.
    async exportData() {
      let file = null;
      await act(null, async () => { file = await api.exportData(); }, 'Your data was saved as a file.');
      return file;
    },
    // `text` is what the chosen file holds. Only an empty app can load a file.
    importData: (text) => reload(() => {
      let file;
      try { file = JSON.parse(text); } catch { throw new ApiError(400, 'invalid', 'That file is not a file exported from this app.'); }
      if (file === null || typeof file !== 'object' || Array.isArray(file)) throw new ApiError(400, 'invalid', 'That file is not a file exported from this app.');
      return api.importData(file);
    }, 'Your data was loaded from the file.'),
    deleteEverything(typed) {
      if (String(typed).trim().toLowerCase() !== 'delete') {
        state.error = { message: 'Type the word delete to confirm.', field: 'confirm' };
        changed({ failed: true });
        return Promise.resolve(false);
      }
      return reload(() => api.deleteEverything(), 'All your data was deleted.');
    },

    // ----- grades -----
    addUnit: (f) => act('academics', () => api.addUnit({ code: f.code, name: f.name, term: f.term, credit: number(f.credit, 'Credit points', { required: false }) ?? 6 }), 'Unit added.'),
    deleteUnit: (code) => act('academics', () => api.deleteUnit(code), `${code} removed.`),
    // Name, credit points and semester. The code is the unit's key, so it cannot change here.
    saveUnitDetails: (code, f) => act('academics', () => api.changeUnit(code, {
      name: f.name ?? '', term: f.term ?? '', credit: number(f.credit, 'Credit points'),
      passFail: f.passFail === 'on'      // a ticked box sends "on"; an empty one sends nothing
    }), 'Unit saved.'),
    setTarget: (code, text) => act('academics', () => api.changeUnit(code, { target: number(text, 'The target', { required: false }) }), text === '' ? 'Target removed.' : 'Target saved.'),
    addAssessment: (code, f) => act('academics', () => api.addAssessment(code, {
      name: f.name, weight: number(f.weight, 'The weight'),
      ...(typedNumber(f.hurdle) === null ? {} : { hurdle: number(f.hurdle, 'The hurdle') })
    }), 'Assessment added.'),
    // An empty mark clears it, so an assessment can go back to "not done".
    saveMark: (id, f) => act('academics', () => {
      const score = number(f.score, 'Your mark', { required: false });
      return api.changeAssessment(id, score === null ? { score: null } : { score, max: number(f.max, 'Marks available', { required: false }) ?? 100 });
    }, 'Mark saved.'),
    saveHurdle: (id, text) => act('academics', () => api.changeAssessment(id, { hurdle: number(text, 'The hurdle', { required: false }) }), 'Hurdle saved.'),
    deleteAssessment: (id) => act('academics', () => api.deleteAssessment(id), 'Assessment removed.'),
    addResult: (f) => act('academics', () => api.addResult({ code: f.code, name: f.name, term: f.term, grade: f.grade, credit: number(f.credit, 'Credit points', { required: false }) ?? 6, mark: number(f.mark, 'The final mark') }), 'Finished unit added.'),
    deleteResult: (id) => act('academics', () => api.deleteResult(id), 'Finished unit removed.'),
    saveGoal: (f) => act('academics', () => api.saveAcademicsSettings({ goal: { measure: f.measure, value: number(f.value, 'The goal'), totalCredits: number(f.totalCredits, 'Credit points in your course') } }), 'Goal saved.'),
    // The first and last day of the current semester, for "how much time is left".
    saveTermDates: (f) => act('academics', () => {
      if (!f.start || !f.end) throw new ApiError(400, 'invalid', 'Pick both the first and the last day.');
      return api.saveAcademicsSettings({ termDates: { start: f.start, end: f.end } });
    }, 'Semester dates saved.'),
    clearGoal: () => act('academics', () => api.saveAcademicsSettings({ goal: null }), 'Goal removed.'),

    // A question, not a change: nothing is saved and the screen is not redrawn.
    // Moves one slider: asks the engine for that unit's answer and the semester totals with every slider.
    // Nothing is saved; the predictions last until the app is closed or they are cleared.
    async predict(code, score) {
      state.predictions = { ...state.predictions, [code]: Number(score) };
      const asked = state.predictions;
      try {
        const answer = await api.predict(asked);
        if (state.predictions !== asked) return null;      // a newer slider move is on its way
        state.predicted = answer.predicted;
        return answer;
      } catch { return null; }
    },
    clearPredictions() {
      state.predictions = {};
      state.predicted = null;
      changed();
    },
    async whatIf(code, score) {
      try { return await api.whatIf(code, score); } catch { return null; }
    },

    askPlan: () => act(null, async () => { state.plan = (await api.plan()).plan; }),

    // Sends a picture to be read. What comes back waits in `state.imported` until the user confirms.
    readScreenshot: (code, picture) => act(null, async () => {
      state.imported = { code, items: (await api.readScreenshot(picture.base64, picture.mimeType)).items };
    }),
    cancelImport() { state.imported = null; changed(); },
    // Saves only the rows the user kept. Each row is the user's own corrected text.
    confirmImport: (rows) => act('academics', async () => {
      const code = state.imported.code;
      let report = null;
      for (const row of rows) {
        const score = number(row.score, `The mark for ${row.name}`, { required: false });
        report = await api.addAssessment(code, {
          name: row.name, weight: number(row.weight, `The weight of ${row.name}`),
          ...(score === null ? {} : { score, max: number(row.max, 'Marks available', { required: false }) ?? 100 })
        });
      }
      state.imported = null;
      return report ?? state.overview.academics;
    }, 'Imported.'),

    // ----- budget -----
    saveBudgetLimit: (text) => act('budget', () => api.saveBudgetLimit(number(text, 'The limit', { required: false })), 'Limit saved.'),
    addCategory: (f) => act('budget', () => api.addCategory({ name: f.name, limit: number(f.limit, 'The category limit', { required: false }) ?? 0 }), 'Category added.'),
    deleteCategory: (id) => act('budget', () => api.deleteCategory(id), 'Category removed.'),
    // ----- regular expenses: one press records the spending, on today or the last day of the month shown -----
    spendRegular(id) {
      const b = shown('budget');
      const regular = (b.regulars ?? []).find((r) => r.id === id);
      if (!regular) return Promise.resolve(false);
      const account = b.money.accounts.find((a) => a.name === regular.account);
      const date = state.views.budget ? lastDayOf(b.month) : state.overview.today;
      return act('budget', () => api.addSpending({ what: regular.name, amount: regular.amount, category: regular.category, date, ...(account ? { accountId: account.id } : {}) }),
        `${regular.name} added.`);
    },
    addRegular: (f) => act('budget', () => api.addRegular({
      name: f.name, amount: number(f.amount, 'The amount'), category: f.category, ...(f.accountId ? { accountId: Number(f.accountId) } : {})
    }), 'Regular expense saved.'),
    saveSuggestedRegular(index) {
      const b = shown('budget');
      const s = (b.suggestedRegulars ?? [])[index];
      if (!s) return Promise.resolve(false);
      const account = b.money.accounts.find((a) => a.name === s.account);
      return act('budget', () => api.addRegular({ name: s.name, amount: s.amount, category: s.category, ...(account ? { accountId: account.id } : {}) }), `${s.name} saved as a regular expense.`);
    },
    removeRegular: (id) => act('budget', () => api.removeRegular(id), 'Regular expense removed.'),
    // Essential spending (rent, fees) is never listed as something you could cut.
    setEssential: (id, essential) => act('budget', () => api.updateCategory(id, { essential }), essential ? 'Marked as essential.' : 'No longer essential.'),
    saveAdvice: (text) => act('budget', () => {
      if (!String(text ?? '').trim()) throw new ApiError(400, 'invalid', 'Write some advice first, or remove it.');
      return api.saveAdvice(text, 'You');
    }, 'Advice saved.'),
    clearAdvice: () => act('budget', () => api.saveAdvice(null), 'Advice removed.'),
    addSpending: (f) => act('budget', () => api.addSpending({
      what: f.what, category: f.category, amount: number(f.amount, 'The amount'),
      ...(f.date ? { date: f.date } : {}), ...(f.accountId ? { accountId: Number(f.accountId) } : {})
    }), 'Spending added.'),

    // ----- money accounts -----
    addAccount: (f) => act('budget', () => api.addAccount({ name: f.name, kind: f.kind, balance: number(f.balance, 'The balance', { required: false }) }), 'Account added.'),
    deleteAccount: (id) => act('budget', () => api.deleteAccount(id), 'Account removed.'),
    // The manual overwrite: the user types what the account really holds now.
    setBalance: (id, text) => act('budget', () => api.setBalance(id, number(text, 'The balance')), 'Balance updated.'),
    addIncome: (id, f) => act('budget', () => api.addIncome(id, { amount: number(f.amount, 'The amount'), note: f.note ?? '', ...(f.date ? { date: f.date } : {}) }), 'Money added.'),
    // Money in from the Budget screen: the account is picked in the form.
    addMoneyIn: (f) => act('budget', () => {
      if (!f.account) throw new ApiError(400, 'invalid', 'Pick the account the money went into.');
      return api.addIncome(Number(f.account), { amount: number(f.amount, 'The amount'), note: f.note ?? '', ...(f.date ? { date: f.date } : {}) });
    }, 'Money in added.'),
    transfer: (f) => act('budget', () => {
      if (!f.from || !f.to) throw new ApiError(400, 'invalid', 'Pick both accounts.');
      return api.transfer({ from: Number(f.from), to: Number(f.to), amount: number(f.amount, 'The amount') });
    }, 'Money moved.'),
    deleteAccountMove: (id) => act('budget', () => api.deleteAccountMove(id), 'Entry removed.'),
    deleteSpending: (id) => act('budget', () => api.deleteSpending(id), 'Spending removed.'),

    // ----- food -----
    saveFoodTargets: (f) => act('food', () => api.saveFoodTargets({ targetKcal: number(f.kcal, 'The calorie target'), targetProtein: number(f.protein, 'The protein target', { required: false }) ?? 0 }), 'Targets saved.'),
    logFood: (f) => act('food', () => api.logFood({ date: shown('food').date, food: f.food, meal: f.meal, remember: f.remember === 'on', kcal: number(f.kcal, 'Calories'), protein: number(f.protein, 'Protein', { required: false }) ?? 0 }), 'Food logged.'),
    quickAddFood(id, meal) {
      const food = shown('food').foods.find((x) => x.id === Number(id));
      return act('food', () => api.logFood({ date: shown('food').date, food: food.name, kcal: food.kcal, protein: food.protein, meal }), `${food.name} logged.`);
    },
    // A common meal: logged, and saved as one of your meals so its numbers can be corrected once.
    quickAddPreset(name, meal) {
      const food = shown('food').presets.find((x) => x.name === name);
      if (!food) return Promise.resolve(false);
      return act('food', () => api.logFood({ date: shown('food').date, food: food.name, kcal: food.kcal, protein: food.protein, meal, remember: true }), `${food.name} logged and saved to your meals.`);
    },
    setEatMeal(meal) { state.eatMeal = ['Breakfast', 'Lunch', 'Dinner', 'Snack'].includes(meal) ? meal : null; changed(); },
    setFoodTab(tab) {
      state.foodTab = isFoodTab(tab) ? tab : 'today';
      storage.set('foodTab', state.foodTab);
      changed();
    },
    saveFoodAdvice: (text) => act('food', () => {
      if (!String(text ?? '').trim()) throw new ApiError(400, 'invalid', 'Write some advice first, or remove it.');
      return api.saveFoodAdvice(text, 'You');
    }, 'Advice saved.'),
    clearFoodAdvice: () => act('food', () => api.saveFoodAdvice(null), 'Advice removed.'),
    // The kitchen form has one tick box per item, named "equipment:Air fryer" or "pantry:Rice".
    saveKitchen: (f) => act('food', () => api.saveKitchen({
      equipment: Object.keys(f).filter((k) => k.startsWith('equipment:')).map((k) => k.slice('equipment:'.length)),
      pantry: Object.keys(f).filter((k) => k.startsWith('pantry:')).map((k) => k.slice('pantry:'.length))
    }), 'Kitchen saved.'),
    // "cucumber, pickles" becomes ['cucumber', 'pickles'].
    savePreferences: (f) => act('food', () => api.savePreferences({
      avoid: String(f.avoid ?? '').split(',').map((w) => w.trim()).filter(Boolean),
      priority: f.priority
    }), 'Preferences saved.'),
    goalTargets: (f) => act(null, async () => {
      state.goalPlan = await api.goalTargets({ age: number(f.age, 'Your age'), sex: f.sex, activity: f.activity, weeks: number(f.weeks, 'The number of weeks') });
    }),
    useGoalTargets: () => act('food', async () => {
      const plan = state.goalPlan;
      const saved = await api.saveFoodTargets({ targetKcal: plan.calories, targetProtein: plan.protein });
      state.goalPlan = null;
      return saved;
    }, 'Targets saved from your goal.'),
    // A recipe that was cooked: logged with its calories and protein, and saved to your meals.
    logRecipe(id, meal) {
      const plan = shown('food').plan;
      const recipe = [...(plan?.recipes ?? []), ...(plan?.needsEquipment ?? [])].find((r) => r.id === id);
      if (!recipe) return Promise.resolve(false);
      return act('food', () => api.logFood({ date: shown('food').date, food: recipe.name, kcal: recipe.kcal, protein: recipe.protein, meal, remember: true }), `${recipe.name} logged.`);
    },
    // Reads food from a picture. Nothing is saved until the user has checked the list.
    readFoodPicture: (picture) => act(null, async () => {
      state.foodImport = (await api.readFoodPicture(picture.base64, picture.mimeType)).items;
    }),
    cancelFoodImport() { state.foodImport = null; changed(); },
    confirmFoodImport: (rows, meal) => act('food', async () => {
      let answer = null;
      for (const row of rows) {
        answer = await api.logFood({ date: shown('food').date, food: row.food, meal, remember: true,
          kcal: number(row.kcal, `Calories for ${row.food}`), protein: number(row.protein, `Protein for ${row.food}`, { required: false }) ?? 0 });
      }
      state.foodImport = null;
      return answer ?? shown('food');
    }, 'Logged and saved to your meals.'),
    deleteFood: (id) => act('food', () => api.deleteFood(id), 'Entry removed.'),
    forgetFood: (id) => act('food', () => api.forgetFood(id), 'Removed from quick add.'),

    // ----- health -----
    saveHealthTargets: (f) => act('health', () => api.saveHealthTargets({
      stepTarget: number(f.steps, 'The step target', { required: false }) ?? 0,
      sleepTargetMinutes: Math.round((number(f.sleepHours, 'The sleep target', { required: false }) ?? 0) * 60),
      workoutTarget: number(f.workouts, 'The workout target', { required: false }) ?? 0,
      waterTarget: Math.round((number(f.waterLitres, 'The water target', { required: false }) ?? 0) * 1000),
      weightGoalKg: number(f.weightGoal, 'The goal weight', { required: false }),
      heightCm: number(f.heightCm, 'Your height', { required: false })
    }), 'Targets saved.'),
    // Only the boxes that were filled in are sent, so an empty box never wipes a saved value.
    saveToday: (f) => act('health', () => {
      const values = {};
      const steps = number(f.steps, 'Steps', { required: false });
      const hours = number(f.sleepHours, 'Sleep hours', { required: false });
      const minutes = number(f.sleepMinutes, 'Sleep minutes', { required: false });
      const heart = number(f.restingHr, 'Resting heart rate', { required: false });
      const weight = number(f.weightKg, 'Body weight', { required: false });
      const water = number(f.waterMl, 'Water', { required: false });
      if (weight !== null) values.weightKg = weight;
      if (water !== null) values.waterMl = water;
      if (steps !== null) values.steps = steps;
      if (hours !== null || minutes !== null) values.sleepMinutes = (hours ?? 0) * 60 + (minutes ?? 0);
      if (heart !== null) values.restingHr = heart;
      if (Object.keys(values).length === 0) throw new ApiError(400, 'invalid', 'Fill in at least one box.');
      return api.saveHealthDay(shown('health').date, values);
    }, 'Saved.'),
    addWorkout: (f) => act('health', () => api.addWorkout({
      name: f.name, date: shown('health').date, kind: f.kind || 'other',
      minutes: number(f.minutes, 'The length', { required: false })
    }), 'Workout added.'),
    deleteWorkout: (id) => act('health', () => api.deleteWorkout(id), 'Workout removed.'),
    // Adds a glass or a bottle to the water drunk on the day shown.
    addWater: (ml) => act('health', () => {
      const h = shown('health');
      return api.saveHealthDay(h.date, { waterMl: (h.waterMl ?? 0) + ml });
    }, `${ml} ml added.`),
    addExercise: (workoutId, f) => act('health', () => api.addExercise(workoutId, {
      name: f.name,
      sets: number(f.sets, 'Sets'),
      reps: number(f.reps, 'Reps'),
      weightKg: number(f.weightKg, 'The weight', { required: false })
    }), 'Exercise added.'),
    deleteExercise: (id) => act('health', () => api.deleteExercise(id), 'Exercise removed.')
  };
}
