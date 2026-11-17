// ViewModel, part 1: presenters.
//
// A presenter takes data from the backend and turns it into exactly what a
// screen shows: finished text, tones and lists. It has no HTML and touches no
// page, so it runs (and is tested) outside the browser.
//
// No grade or budget rule is decided here. The numbers and verdicts come from
// the backend; a presenter only chooses words and layout data for them.

import { clamp, dayText, f1, f2, hm, num, pct, plain, rm } from '../format.js';

export const MASK = '•••';   // shown in place of a grade when grades are hidden
const mask = (hidden, text) => (hidden ? MASK : text);

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n) => WORDS[n] ?? String(n);
const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const good = (text) => ({ text, tone: 'good' });
const warn = (text) => ({ text, tone: 'warn' });
const plainChip = (text) => ({ text, tone: '' });

// ---------- grades ----------

export function presentUnit(unit, hidden = false) {
  const s = unit.standing;
  const m = (text) => mask(hidden, text);

  let chips = [];
  if (s.hurdleFailed) chips = [warn('Hurdle failed')];
  else if (unit.target) {
    chips = [
      s.secured ? good('Secured') : s.possible ? good('Possible') : warn('Not possible'),
      s.realistic ? good('Realistic') : warn('Not realistic')
    ];
  }

  return {
    code: unit.code, name: unit.name, credit: unit.credit,
    hasTarget: Boolean(unit.target),
    // While grades are hidden nothing can be edited, so no raw mark is handed to the screen at all.
    canEdit: !hidden,
    targetMark: hidden ? null : unit.target?.mark ?? null,
    targetText: unit.target ? m(`${unit.target.grade} (${plain(unit.target.mark)})`) : 'not set',
    // One word for where the unit stands. The map and the home screen use it.
    state: s.hurdleFailed ? 'failed' : !unit.target ? 'no-target' : s.onCourse ? 'on-course' : s.possible ? 'not-realistic' : 'out-of-reach',
    chips,
    earned: m(f1(s.earned)),
    doneWeight: plain(s.doneWeight),
    leftWeight: plain(s.leftWeight),
    average: s.average === null ? null : m(pct(s.average)),
    need: !unit.target || s.need === null ? null : m(s.secured ? 'Done' : pct(s.needMax)),
    verdict: hidden && (unit.target || s.average !== null) ? 'Details hidden.' : s.verdict,
    doneCount: s.doneCount, totalCount: s.totalCount,
    weightMissing: unit.totalWeight < 100 ? plain(100 - unit.totalWeight) : null,
    whatIfStart: hidden ? 50 : clamp(Math.round(s.needMax ?? s.average ?? 50), 0, 100),
    canWhatIf: !hidden && s.leftWeight > 0,
    assessments: unit.assessments.map((a) => ({
      id: a.id, name: a.name, weight: plain(a.weight), done: a.done,
      score: hidden ? null : a.score, max: hidden ? null : a.max, hurdle: a.hurdle, hurdleFailed: a.hurdleFailed,
      markText: a.done ? m(`${plain(a.score)}/${plain(a.max)} · ${pct(a.percent)}`) : 'Not done',
      needText: a.done || a.needAtLeast === null ? null : m(`need ${pct(a.needAtLeast)}`)
    }))
  };
}

function goalBanner(goal, hidden) {
  const m = (text) => mask(hidden, text);
  const isWam = goal.measure === 'wam';
  const show = (value) => m(isWam ? f1(value) : f2(value));
  const banner = { title: `Final goal: ${goal.measure.toUpperCase()} ${show(goal.value)} by graduation`, tone: 'good', text: '' };

  if (goal.need === null) {
    banner.text = 'There are no credit points left to plan for.';
  } else if (!goal.reachable) {
    banner.tone = 'warn';
    banner.text = `This goal is out of reach. It would need an average of ${show(goal.need)} across the ${plain(goal.creditsLeft)} credit points you have left.`;
  } else if (goal.reached) {
    banner.text = 'You have already secured this goal.';
  } else {
    banner.text = `You need an average of ${show(goal.need)} across the ${plain(goal.creditsLeft)} credit points you have left.`;
    if (goal.defaultTarget) banner.text += ` The default target for each unit is ${m(`${goal.defaultTarget.grade} (${plain(goal.defaultTarget.mark)} or more)`)}.`;
    if (goal.gap !== null && !hidden) {
      if (goal.gap >= 0) banner.text += ` This semester you are heading for ${show(goal.currentValue)}, which is enough.`;
      else {
        banner.tone = 'warn';
        banner.text += ` This semester you are heading for ${show(goal.currentValue)}, which is ${show(-goal.gap)} short.`;
      }
    }
  }
  return banner;
}

export function presentGrades(report, hidden = false) {
  const m = (text) => mask(hidden, text);
  const finished = report.finished, projected = report.projected;
  const has = finished.units > 0;
  const stat = (label, key, format) => ({
    label,
    value: has ? m(format(finished[key])) : '—',
    note: !has ? 'No finished units yet' : projected ? `${m(format(projected[key]))} if this semester ends where it is heading` : 'All finished units'
  });
  const units = report.units.map((u) => presentUnit(u, hidden));
  const withTarget = units.filter((u) => u.hasTarget);

  return {
    empty: report.units.length === 0 && report.terms.length === 0,
    term: report.currentTerm,
    // The two scales give different numbers for the same grades, so each one is named in full.
    stats: [stat('CGPA, Malaysia scale', 'cgpa', f2), stat('GPA, standard scale', 'gpa', f2), stat('WAM', 'wam', f1)],
    goal: report.goal ? goalBanner(report.goal, hidden) : null,
    goalValues: hidden ? null : report.settings.goal,
    canEdit: !hidden,
    // CGPA for each finished semester, then where this semester is heading.
    trend: hidden ? [] : [
      ...report.terms.map((t) => ({ label: t.term || 'No semester', value: t.cgpa, projected: false })),
      ...(report.current ? [{ label: report.currentTerm || 'This semester', value: report.current.cgpa, projected: true }] : [])
    ],
    trendGoal: !hidden && report.goal?.measure === 'cgpa' ? report.goal.value : null,
    units,
    onCourse: withTarget.filter((u) => u.state === 'on-course').length,
    withTarget: withTarget.length,
    terms: report.terms.map((t) => ({
      term: t.term || 'No semester',
      summary: `CGPA ${m(f2(t.cgpa))} · GPA ${m(f2(t.gpa))} · WAM ${m(f1(t.wam))}`,
      units: t.units.map((u) => ({ id: u.id, code: u.code, name: u.name, result: m(`${plain(u.mark)} ${u.grade}`) }))
    })),
    mood: withTarget.length === 0 ? 'waiting' : units.some((u) => u.state === 'failed') ? 'distressed'
      : withTarget.every((u) => u.state === 'on-course') ? 'happy'
      : withTarget.filter((u) => u.state === 'on-course').length >= withTarget.length / 2 ? 'worried' : 'distressed'
  };
}

// ---------- home ----------

export function presentHome(overview, hidden = false) {
  const { academics, budget, food, health } = overview;
  const grades = academics ? presentGrades(academics, hidden) : null;

  // The headline is split in three so the view can make the middle part stand out.
  let headline = { before: 'Add your first unit to see where you stand.', strong: '', after: '' };
  let lede = 'Set a target for each unit, and the app tells you if you are on course.';
  if (!grades) {
    headline = { before: 'Grades are not available right now.', strong: '', after: '' };
    lede = overview.academicsError ?? '';
  } else if (grades.units.length > 0 && grades.withTarget === 0) {
    headline = { before: `You have ${word(grades.units.length)} ${grades.units.length === 1 ? 'unit' : 'units'}. Set a target to see if you are `, strong: 'on course', after: '.' };
  } else if (grades.withTarget > 0) {
    const all = grades.onCourse === grades.withTarget;
    const count = all ? (grades.withTarget === 1 ? 'Your unit is ' : `All ${word(grades.withTarget)} of your units are `)
      : `${capital(word(grades.onCourse))} of your ${word(grades.withTarget)} units ${grades.onCourse === 1 ? 'is' : 'are'} `;
    headline = { before: count, strong: 'on course', after: '.' };
    const off = grades.units.filter((u) => ['not-realistic', 'out-of-reach', 'failed'].includes(u.state));
    const reasons = off.map((u) => u.state === 'out-of-reach' ? `${u.code} can no longer reach your target`
      : u.state === 'failed' ? `${u.code} has a failed hurdle` : `${u.code} needs more than you usually score`);
    lede = hidden ? 'Grade details are hidden.' : reasons.length ? capital(reasons.join(', and ')) + '.' : 'Every target is within reach of your average so far.';
  }
  if (budget.tone === 'warn') lede += budget.over ? ' You are over your budget this month.' : ' Your spending is running ahead of the month.';

  const cards = [
    grades
      ? { tab: 'grades', title: 'Grades', name: 'penguin egg', chip: grades.withTarget === 0 ? plainChip('No targets yet') : grades.onCourse === grades.withTarget ? good('On course') : warn('Needs attention'),
          big: grades.withTarget ? `${grades.onCourse} of ${grades.withTarget}` : String(grades.units.length), line: grades.withTarget ? 'units on course for their targets' : grades.units.length === 1 ? 'unit this semester' : 'units this semester' }
      : { tab: 'grades', title: 'Grades', name: 'penguin egg', chip: warn('Not available'), big: '—', line: 'The grade engine is not ready' },
    budget.hasLimit
      ? { tab: 'budget', title: 'Budget', name: 'crab', chip: { text: budget.verdict, tone: budget.tone }, big: rm(Math.abs(budget.left)), line: budget.over ? 'over your limit this month' : `left for the next ${budget.daysLeft} days` }
      : { tab: 'budget', title: 'Budget', name: 'crab', chip: plainChip('No limit yet'), big: rm(budget.spent), line: 'spent this month' },
    food.hasTargets
      ? { tab: 'food', title: 'Food', name: 'Joel', chip: { text: food.verdict, tone: food.tone }, big: `${num(Math.abs(food.left))} kcal`, line: food.over ? 'over your target today' : 'left for today' }
      : { tab: 'food', title: 'Food', name: 'Joel', chip: plainChip('No target yet'), big: `${num(food.kcal)} kcal`, line: 'eaten today' },
    health.steps === null
      ? { tab: 'health', title: 'Health', name: 'health mascot', chip: plainChip('Nothing logged'), big: '—', line: 'no steps logged today' }
      : { tab: 'health', title: 'Health', name: 'health mascot', chip: health.stepTarget === 0 ? plainChip('No target yet') : health.stepsOk ? good('Target reached') : warn('Behind today'),
          big: num(health.steps), line: health.stepTarget ? `steps of your ${num(health.stepTarget)} target` : 'steps today' }
  ];

  const attention = [];
  for (const item of academics?.attention ?? []) attention.push({ tab: 'grades', text: hidden ? `${item.code}: details hidden` : `${item.code}: ${item.reason}` });
  for (const c of budget.categories.filter((x) => x.over)) attention.push({ tab: 'budget', text: `${c.name} is over its limit by ${rm(c.spent - c.limit)}.` });
  if (food.targetProtein > 0 && food.proteinLeft > 0 && food.log.length > 0) attention.push({ tab: 'food', text: `Protein is ${num(food.proteinLeft)} g short of today's target.` });
  if (health.sleepShort > 0) attention.push({ tab: 'health', text: `Last night's sleep was ${hm(health.sleepShort)} under your target.` });

  return {
    empty: overview.empty,
    headline, lede,
    when: [academics?.currentTerm, dayText(overview.today)].filter(Boolean).join(' · '),
    mood: grades?.mood ?? 'waiting',
    cards, attention
  };
}

// ---------- the map ----------
// A map is a list of stops from left to right: finished ones, "now", ones still ahead, and the goal.
// A "now" stop carries tasks: each has steps that are done and steps still to do.

const task = (title, chip, done, todo, note = '') => ({ title, chip, done, todo, note });

function studiesMap(report, hidden) {
  const m = (text) => mask(hidden, text);
  const stops = report.terms.map((t) => ({ kind: 'done', pin: hidden ? '···' : f2(t.cgpa), title: t.term || 'No semester', note: `CGPA ${m(f2(t.cgpa))} · ${t.units.length} ${t.units.length === 1 ? 'unit' : 'units'}` }));
  const units = report.units.map((u) => presentUnit(u, hidden));

  stops.push({
    kind: 'now', title: report.currentTerm || 'This semester',
    note: report.current ? `You are heading for a CGPA of ${m(f2(report.current.cgpa))} this semester.` : units.length ? 'Record a mark to see where this semester is heading.' : 'Add your units on the Grades screen.',
    tasks: units.map((u) => task(
      u.code,
      u.state === 'on-course' ? good('On course') : u.state === 'not-realistic' ? warn('Not realistic') : u.state === 'out-of-reach' ? warn('Out of reach') : u.state === 'failed' ? warn('Hurdle failed') : plainChip('No target'),
      u.assessments.filter((a) => a.done).map((a) => (hidden ? a.name : `${a.name} · ${a.markText.split(' · ')[1]}`)),
      u.assessments.filter((a) => !a.done).map((a) => (a.needText && !hidden ? `${a.name} · ${a.needText}` : a.name)),
      u.hasTarget ? `Leads to your ${u.targetText} target in this unit.` : 'Set a target to see what each step needs.'))
  });

  const goal = report.goal;
  if (goal && goal.need !== null) {
    // Credit points not yet finished or in progress, shown as later semesters the size of this one.
    const inProgress = report.units.reduce((sum, u) => sum + u.credit, 0);
    const perSemester = inProgress || 24;
    const later = Math.min(8, Math.ceil(Math.max(0, goal.creditsLeft - inProgress) / perSemester));
    const aim = goal.reachable ? `aim for ${m(goal.measure === 'wam' ? f1(goal.need) : f2(goal.need))}` : 'the goal is out of reach';
    for (let i = 1; i <= later; i++) stops.push({ kind: 'ahead', pin: String(report.terms.length + 1 + i), title: `Later semester ${i}`, note: `About ${plain(perSemester)} credit points · ${aim}` });
  }
  stops.push(goal
    ? { kind: 'goal', top: goal.measure.toUpperCase(), big: hidden ? '···' : goal.measure === 'wam' ? f1(goal.value) : f2(goal.value), bottom: 'your goal', title: 'Graduation', note: 'Your final goal.' }
    : { kind: 'goal', top: 'Goal', big: '?', bottom: 'not set', title: 'No final goal yet', note: 'Set a final goal on the Grades screen and the map will show what it needs.' });

  const total = goal?.totalCredits ?? 0;
  return {
    chain: ['Assessment', 'Unit grade', 'Semester result', 'CGPA', 'Final goal'],
    summary: goal ? `${plain(goal.creditsDone)} of ${plain(total)} credit points finished. One 6-point unit is ${f1(600 / total)}% of your course.` : `${report.finished.units} finished ${report.finished.units === 1 ? 'unit' : 'units'} so far.`,
    progress: goal ? goal.creditsDone / total * 100 : 0, tone: '', stops
  };
}

function budgetMap(b) {
  const stops = b.weeks.filter((w) => w.state === 'done').map((w, i) => ({ kind: 'done', pin: String(i + 1), title: w.name, note: `${w.days} · ${rm(w.spent)} spent` }));
  stops.push({
    kind: 'now', title: `${b.monthName}, day ${b.day} of ${b.days}`,
    note: !b.hasLimit ? 'Set a monthly limit on the Budget screen.' : b.over ? `You are over your limit by ${rm(-b.left)}.` : `${rm(b.left)} left this month.`,
    tasks: b.categories.map((c) => task(c.name, c.limit <= 0 ? plainChip('No limit') : c.over ? warn('Over') : good('Inside'),
      [`${rm(c.spent)} spent`], c.limit <= 0 ? [] : [c.over ? `Over by ${rm(c.spent - c.limit)}` : `${rm(c.left)} left`]))
  });
  if (b.daysLeft > 0 && b.hasLimit) stops.push({ kind: 'ahead', pin: String(stops.length), title: `The last ${b.daysLeft} ${b.daysLeft === 1 ? 'day' : 'days'}`, note: `Spend ${rm(b.perDay)} a day or less` });
  stops.push(b.hasLimit
    ? { kind: 'goal', top: 'Limit', big: 'RM ' + num(b.limit), small: true, bottom: 'this month', title: `End of ${b.monthName.split(' ')[0]}`, note: 'Your goal: finish the month inside your limit.' }
    : { kind: 'goal', top: 'Limit', big: '?', bottom: 'not set', title: 'No limit yet', note: 'Set a monthly limit on the Budget screen.' });
  return {
    chain: ['Each purchase', 'Category total', 'Month total', 'Monthly limit'],
    summary: b.hasLimit ? `Day ${b.day} of ${b.days}. ${Math.round(b.spentPercent)}% of your limit is spent.` : `Day ${b.day} of ${b.days}. ${rm(b.spent)} spent so far.`,
    progress: b.spentPercent, tone: b.tone === 'warn' ? 'warn' : '', stops
  };
}

function foodMap(f) {
  const stops = f.meals.map((meal) => ({ kind: 'done', icon: 'check', title: meal.meal, note: `${meal.foods.join(', ')} · ${num(meal.kcal)} kcal · ${num(meal.protein)} g protein` }));
  const tasks = !f.hasTargets ? [] : [
    task('Calories', { text: f.verdict, tone: f.tone }, [`${num(f.kcal)} kcal eaten`], [f.over ? `Over by ${num(-f.left)} kcal` : `${num(f.left)} kcal left`]),
    ...(f.targetProtein > 0 ? [task('Protein', f.proteinLeft > 0 ? warn('Short so far') : good('Target reached'), [`${num(f.protein)} g eaten`], f.proteinLeft > 0 ? [`${num(f.proteinLeft)} g to go`] : [])] : [])
  ];
  stops.push({ kind: 'now', title: 'Today so far', note: f.hasTargets ? `${num(f.kcal)} kcal and ${num(f.protein)} g of protein eaten.` : 'Set your daily targets on the Food screen.', tasks });
  if (f.hasTargets) stops.push({ kind: 'ahead', pin: 'Next', title: 'Your next meal', note: f.over ? 'You are already over your calorie target' : `Up to ${num(f.left)} kcal` + (f.proteinLeft > 0 ? `, with ${num(f.proteinLeft)} g of protein to find` : '') });
  stops.push(f.hasTargets
    ? { kind: 'goal', top: 'Today', big: num(f.targetKcal), bottom: 'kcal', title: 'End of the day', note: `Your goal: ${num(f.targetKcal)} kcal` + (f.targetProtein ? ` and ${num(f.targetProtein)} g of protein.` : '.') }
    : { kind: 'goal', top: 'Today', big: '?', bottom: 'not set', title: 'No target yet', note: 'Set your daily targets on the Food screen.' });
  return {
    chain: ['Each meal', 'Day total', 'Daily target'],
    summary: f.hasTargets ? `${num(f.kcal)} of ${num(f.targetKcal)} kcal eaten today.` : `${num(f.kcal)} kcal eaten today.`,
    progress: f.percent, tone: f.over ? 'warn' : '', stops
  };
}

function healthMap(h) {
  const stops = [];
  for (const d of h.week) {
    if (d.today) {
      const tasks = [];
      if (h.stepTarget) tasks.push(task('Steps', h.steps === null ? plainChip('Not logged') : h.stepsOk ? good('Target reached') : warn('Behind'), h.steps === null ? [] : [`${num(h.steps)} walked`], h.steps === null ? [`${num(h.stepTarget)} to walk`] : h.stepsOk ? [] : [`${num(h.stepsLeft)} to go`]));
      if (h.sleepTargetMinutes) tasks.push(task('Sleep', h.sleepMinutes === null ? plainChip('Not logged') : h.sleepShort > 0 ? warn('Under target') : good('Target reached'), h.sleepMinutes === null ? [] : [`${hm(h.sleepMinutes)} last night`], [`Aim for ${hm(h.sleepTargetMinutes)} tonight`]));
      if (h.workoutTarget) tasks.push(task('Workouts', h.workouts.done >= h.workoutTarget ? good('Target reached') : plainChip(`${h.workoutTarget - h.workouts.done} to go`), [`${h.workouts.done} done this week`], h.workouts.done >= h.workoutTarget ? [] : [`${h.workoutTarget - h.workouts.done} more this week`]));
      stops.push({ kind: 'now', title: `Today, ${d.name}`, note: tasks.length ? 'These count towards your week.' : 'Set your targets on the Health screen.', tasks });
    } else if (d.future) {
      stops.push({ kind: 'ahead', pin: d.name, title: 'Still to come', note: h.stepTarget ? `Aim for ${num(h.stepTarget)} steps` : 'No step target yet' });
    } else {
      stops.push({ kind: 'done', pin: d.name, title: d.steps === null ? 'Nothing logged' : `${num(d.steps)} steps`,
        note: d.steps === null || !h.stepTarget ? '' : d.steps >= h.stepTarget ? 'Target reached' : `${num(h.stepTarget - d.steps)} short of your target` });
    }
  }
  stops.push(h.stepTarget
    ? { kind: 'goal', top: 'Each day', big: num(h.stepTarget), bottom: 'steps', title: 'End of the week', note: 'Your goal for the week.' }
    : { kind: 'goal', top: 'Week', big: '?', bottom: 'not set', title: 'No targets yet', note: 'Set your targets on the Health screen.' });
  const past = h.week.filter((d) => !d.future && !d.today).length;
  return {
    chain: ['Each day', 'Week total', 'Weekly targets'],
    summary: `${past} of 7 days finished this week.` + (h.workoutTarget ? ` ${h.workouts.done} of ${h.workoutTarget} workouts done.` : ''),
    progress: past / 7 * 100, tone: '', stops
  };
}

export const MAP_KINDS = [['studies', 'Studies'], ['budget', 'Budget'], ['food', 'Food'], ['health', 'Health']];

export function presentMap(kind, overview, hidden = false) {
  if (kind === 'studies') {
    if (!overview.academics) return { chain: [], summary: overview.academicsError ?? 'Grades are not available.', progress: 0, tone: 'warn', stops: [] };
    return studiesMap(overview.academics, hidden);
  }
  if (kind === 'budget') return budgetMap(overview.budget);
  if (kind === 'food') return foodMap(overview.food);
  return healthMap(overview.health);
}
