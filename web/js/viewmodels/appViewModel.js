// ViewModel, part 2: the state of the app and the commands that change it.
//
// The View never talks to the backend. It shows `state` and calls a command
// when the user does something. A command checks what was typed, calls the
// API, puts the answer into `state` and tells the View to draw again.
//
// This file has no HTML and does not touch the page, so every command can be
// tested with a fake API (see web/test/appViewModel.test.js).

import { ApiError } from '../api.js';
import { typedNumber } from '../format.js';

const TABS = ['home', 'map', 'grades', 'budget', 'food', 'health', 'more'];

export function createAppViewModel({ api, storage, onChange = () => {} }) {
  const state = {
    loading: true,
    overview: null,        // everything the backend knows, loaded in one call
    loadError: null,       // set when the first load failed
    error: null,           // { message, field } from the last command that failed
    notice: null,          // a short "it worked" message
    busy: false,
    tab: 'home',
    mapKind: 'studies',
    hidden: storage.get('hideGrades') === '1',
    plan: null,            // the AI helper's last plan
    imported: null         // { code, items } read from a screenshot, waiting for the user to check
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
      if (slice) {
        state.overview[slice] = result;
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

  async function load() {
    try {
      state.overview = await api.overview();
      state.loadError = null;
    } catch (error) {
      state.loadError = error.message;
    }
    state.loading = false;
    changed();
  }
  const reload = (work, notice) => act(null, async () => { await work(); state.overview = await api.overview(); }, notice);

  return {
    state,
    load,

    // ----- moving around and personal settings -----
    setTab(tab) {
      state.tab = TABS.includes(tab) ? tab : 'home';
      state.error = null;
      state.notice = null;
      changed();
    },
    setMapKind(kind) { state.mapKind = kind; changed(); },
    toggleHidden() {
      state.hidden = !state.hidden;
      storage.set('hideGrades', state.hidden ? '1' : '0');
      state.error = null;
      state.notice = null;
      changed();
    },
    dismiss() { state.error = null; state.notice = null; changed(); },

    loadDemo: () => reload(() => api.loadDemo(), 'Example data loaded. Everything in it is made up.'),
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
    clearGoal: () => act('academics', () => api.saveAcademicsSettings({ goal: null }), 'Goal removed.'),

    // A question, not a change: nothing is saved and the screen is not redrawn.
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
    addSpending: (f) => act('budget', () => api.addSpending({ what: f.what, category: f.category, amount: number(f.amount, 'The amount') }), 'Spending added.'),
    deleteSpending: (id) => act('budget', () => api.deleteSpending(id), 'Spending removed.'),

    // ----- food -----
    saveFoodTargets: (f) => act('food', () => api.saveFoodTargets({ targetKcal: number(f.kcal, 'The calorie target'), targetProtein: number(f.protein, 'The protein target', { required: false }) ?? 0 }), 'Targets saved.'),
    logFood: (f) => act('food', () => api.logFood({ food: f.food, meal: f.meal, remember: f.remember === 'on', kcal: number(f.kcal, 'Calories'), protein: number(f.protein, 'Protein', { required: false }) ?? 0 }), 'Food logged.'),
    quickAddFood(id, meal) {
      const food = state.overview.food.foods.find((x) => x.id === Number(id));
      return act('food', () => api.logFood({ food: food.name, kcal: food.kcal, protein: food.protein, meal }), `${food.name} logged.`);
    },
    deleteFood: (id) => act('food', () => api.deleteFood(id), 'Entry removed.'),

    // ----- health -----
    saveHealthTargets: (f) => act('health', () => api.saveHealthTargets({
      stepTarget: number(f.steps, 'The step target', { required: false }) ?? 0,
      sleepTargetMinutes: Math.round((number(f.sleepHours, 'The sleep target', { required: false }) ?? 0) * 60),
      workoutTarget: number(f.workouts, 'The workout target', { required: false }) ?? 0
    }), 'Targets saved.'),
    // Only the boxes that were filled in are sent, so an empty box never wipes a saved value.
    saveToday: (f) => act('health', () => {
      const values = {};
      const steps = number(f.steps, 'Steps', { required: false });
      const hours = number(f.sleepHours, 'Sleep hours', { required: false });
      const minutes = number(f.sleepMinutes, 'Sleep minutes', { required: false });
      const heart = number(f.restingHr, 'Resting heart rate', { required: false });
      if (steps !== null) values.steps = steps;
      if (hours !== null || minutes !== null) values.sleepMinutes = (hours ?? 0) * 60 + (minutes ?? 0);
      if (heart !== null) values.restingHr = heart;
      if (Object.keys(values).length === 0) throw new ApiError(400, 'invalid', 'Fill in at least one box.');
      return api.saveHealthDay(state.overview.today, values);
    }, 'Saved.'),
    addWorkout: (f) => act('health', () => api.addWorkout({ name: f.name }), 'Workout added.'),
    deleteWorkout: (id) => act('health', () => api.deleteWorkout(id), 'Workout removed.')
  };
}
