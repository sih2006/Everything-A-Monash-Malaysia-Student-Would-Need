// The Model's doorway: every call to the backend goes through here.
// The rest of the web app never uses `fetch` directly, so tests can swap this
// object for a fake one.

// An error from the backend, with the plain message it sent.
export class ApiError extends Error {
  constructor(status, code, message, field) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export function createApi({ fetchImpl = (...args) => fetch(...args), getToken = () => '' } = {}) {
  async function call(method, address, body) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetchImpl(address, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new ApiError(0, 'offline', 'The app could not reach its server. Check that it is running, then try again.');
    }
    let data = null;
    try { data = await response.json(); } catch { /* an empty or non-JSON answer */ }
    if (!response.ok) {
      const error = data?.error ?? {};
      throw new ApiError(response.status, error.code ?? 'error', error.message ?? 'Something went wrong. Nothing was changed.', error.field);
    }
    return data;
  }

  const get = (address) => call('GET', address);
  const post = (address, body = {}) => call('POST', address, body);
  const put = (address, body) => call('PUT', address, body);
  const patch = (address, body) => call('PATCH', address, body);
  const remove = (address, body = {}) => call('DELETE', address, body);
  const part = encodeURIComponent;

  return {
    overview: () => get('/api/overview'),
    life: () => get('/api/life'),
    loadDemo: () => post('/api/demo'),
    deleteEverything: () => remove('/api/data', { confirm: 'delete everything' }),
    exportData: () => get('/api/export'),
    importData: (file) => post('/api/import', file),

    // grades
    addUnit: (unit) => post('/api/units', unit),
    changeUnit: (code, fields) => patch(`/api/units/${part(code)}`, fields),
    deleteUnit: (code) => remove(`/api/units/${part(code)}`),
    addAssessment: (code, assessment) => post(`/api/units/${part(code)}/assessments`, assessment),
    changeAssessment: (id, fields) => patch(`/api/assessments/${id}`, fields),
    deleteAssessment: (id) => remove(`/api/assessments/${id}`),
    addResult: (result) => post('/api/results', result),
    deleteResult: (id) => remove(`/api/results/${id}`),
    saveAcademicsSettings: (settings) => put('/api/academics/settings', settings),
    whatIf: (code, score) => get(`/api/academics/whatif?unit=${part(code)}&score=${part(score)}`),
    plan: () => post('/api/advisor/plan'),
    readScreenshot: (image, mimeType) => post('/api/import/screenshot', { image, mimeType }),

    // budget, food and health for another month or day. Leave the argument out for the current one.
    budget: (month) => get(`/api/budget${month ? `?month=${part(month)}` : ''}`),
    food: (day) => get(`/api/food${day ? `?date=${part(day)}` : ''}`),
    health: (day) => get(`/api/health${day ? `?date=${part(day)}` : ''}`),

    // budget
    saveBudgetLimit: (limit) => put('/api/budget/settings', { limit }),
    addCategory: (category) => post('/api/budget/categories', category),
    deleteCategory: (id) => remove(`/api/budget/categories/${id}`),
    addSpending: (entry) => post('/api/transactions', entry),
    deleteSpending: (id) => remove(`/api/transactions/${id}`),

    // money accounts
    addAccount: (account) => post('/api/accounts', account),
    deleteAccount: (id) => remove(`/api/accounts/${id}`),
    setBalance: (id, balance) => put(`/api/accounts/${id}/balance`, { balance }),
    addIncome: (id, income) => post(`/api/accounts/${id}/income`, income),
    transfer: (move) => post('/api/accounts/transfer', move),
    deleteAccountMove: (id) => remove(`/api/account-moves/${id}`),

    // food
    saveFoodTargets: (targets) => put('/api/food/settings', targets),
    logFood: (entry) => post('/api/food/log', entry),
    deleteFood: (id) => remove(`/api/food/log/${id}`),
    forgetFood: (id) => remove(`/api/food/items/${id}`),

    // health
    saveHealthTargets: (targets) => put('/api/health/settings', targets),
    saveHealthDay: (day, values) => put(`/api/health/days/${part(day)}`, values),
    addWorkout: (workout) => post('/api/workouts', workout),
    deleteWorkout: (id) => remove(`/api/workouts/${id}`),
    addExercise: (workoutId, x) => post(`/api/workouts/${workoutId}/exercises`, x),
    deleteExercise: (id) => remove(`/api/exercises/${id}`)
  };
}
