// The life tree: every year of your data, split into four areas, each opening further.
//
//   You
//   └─ 2026
//      ├─ Studies ─ S1 2026 ─ FIT2099 ─ Assignment 1
//      ├─ Money ─── November ─ Week 3 ─ 17 November ─ Nasi lemak
//      ├─ Food ──── November ─ 17 November ─ Lunch ─ Chicken rice
//      └─ Health ── November ─ Week 3 ─ 17 November ─ Push day
//
// Like the rest of the rules here, this is a pure function: plain data in, a tree out.
// Grade numbers come from the C++ engine's report; nothing here repeats a grade rule.
//
// Each node has:
//   id        a stable path, used by the screen to remember which nodes are open
//   level     what the node is (root, year, area, term, unit, assessment, month, week, day, meal, item)
//   area      studies | money | food | health, or null above the areas
//   title     a short name
//   value     the main figure, as text
//   note      one line of detail
//   done      0 to 1: how full the circle is, or null for no circle
//   time      0 to 1: how much of the period has passed, or null when it does not apply
//   tone      good | warn | '' (shown with words and shape on screen, never colour alone)
//   now       true on the path to today
//   grade     true when value or note shows a grade or mark (hidden when grades are hidden)
//   children  the nodes inside it

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const round2 = (n) => Math.round(n * 100) / 100;
const clamp01 = (n) => Math.max(0, Math.min(1, n));
const rm = (n) => 'RM ' + round2(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const group = (items, keyOf) => {
  const map = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
};
const daysIn = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const dayName = (day) => `${Number(day.slice(8, 10))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;
const weekOf = (day) => Math.ceil(Number(day.slice(8, 10)) / 7);   // week 1 is days 1 to 7, and so on
const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const hm = (minutes) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;

// How much of a period has passed, from 0 to 1.
function passed(from, to, today) {
  if (today < from) return 0;
  if (today > to) return 1;
  const ms = (day) => new Date(day + 'T00:00:00Z').getTime();
  const total = ms(to) - ms(from) + 86400000;
  return clamp01((ms(today) - ms(from) + 86400000) / total);
}

// The year a semester belongs to: the first 20xx in its name, or the current year.
const termYear = (term, today) => Number((/\b(20\d\d)\b/.exec(term ?? '') ?? [])[1] ?? today.slice(0, 4));

function node(fields) {
  return { area: null, value: '', note: '', done: null, time: null, tone: '', now: false, grade: false, children: [], ...fields };
}

// ---------- studies ----------

function studiesFor(year, input, id) {
  const { report, termDates, today } = input;
  if (!report) return null;
  const terms = [];

  for (const t of report.terms) {
    if (termYear(t.term, today) !== year) continue;
    terms.push(node({
      id: `${id}/${t.term}`, level: 'term', area: 'studies', title: t.term || 'No semester',
      value: `CGPA ${t.cgpa.toFixed(2)}`, note: `GPA ${t.gpa.toFixed(2)} · WAM ${t.wam.toFixed(1)} · finished`, grade: true, done: 1,
      children: t.units.map((u) => node({
        id: `${id}/${t.term}/${u.code}`, level: 'unit', area: 'studies', title: u.code,
        value: `${u.mark} ${u.grade}`, note: u.name, grade: true, done: 1,
        tone: ['N', 'NH', 'WN'].includes(u.grade) ? 'warn' : 'good'
      }))
    }));
  }

  const current = report.units.filter((u) => termYear(u.term || report.currentTerm, today) === year);
  if (current.length) {
    const name = report.currentTerm || current[0].term || 'This semester';
    const time = termDates ? passed(termDates.start, termDates.end, today) : null;
    const marked = current.reduce((sum, u) => sum + u.standing.doneWeight, 0) / (current.length * 100);
    const off = current.filter((u) => u.target && !u.standing.onCourse).length;
    terms.push(node({
      id: `${id}/${name}`, level: 'term', area: 'studies', title: name, now: true,
      value: report.current ? `CGPA ${report.current.cgpa.toFixed(2)}` : 'In progress',
      note: `${Math.round(marked * 100)}% of the work marked${time === null ? '' : ` · ${Math.round(time * 100)}% of the semester gone`}${off ? ` · ${off} off course` : ''}`,
      grade: true, done: marked, time, tone: off ? 'warn' : 'good',
      children: current.map((u) => {
        const s = u.standing;
        return node({
          id: `${id}/${name}/${u.code}`, level: 'unit', area: 'studies', title: u.code, now: true,
          value: s.average === null ? 'No marks yet' : `${s.average.toFixed(1)}% so far`,
          note: s.verdict, grade: true, done: s.doneWeight / 100, time,
          tone: s.hurdleFailed || (u.target && !s.onCourse) ? 'warn' : u.target ? 'good' : '',
          children: u.assessments.map((a) => node({
            id: `${id}/${name}/${u.code}/${a.id}`, level: 'assessment', area: 'studies', title: a.name,
            value: a.done ? `${a.percent.toFixed(1)}%` : a.needAtLeast === null ? 'Not done' : `Need ${a.needAtLeast.toFixed(1)}%`,
            note: `${a.weight}% of the unit${a.hurdle === null ? '' : ` · hurdle ${a.hurdle}%`}`,
            grade: true, done: a.done ? clamp01(a.percent / 100) : 0, tone: a.hurdleFailed ? 'warn' : a.done ? 'good' : ''
          }))
        });
      })
    }));
  }
  if (!terms.length) return null;
  return node({ id, level: 'area', area: 'studies', title: 'Studies', value: `${terms.length} ${terms.length === 1 ? 'semester' : 'semesters'}`, note: '', children: terms, now: terms.some((t) => t.now) });
}

// ---------- money ----------

function moneyFor(year, input, id) {
  const { transactions, limit, today } = input;
  const inYear = transactions.filter((t) => Number(t.date.slice(0, 4)) === year);
  if (!inYear.length) return null;
  const months = [...group(inYear, (t) => t.date.slice(0, 7))].sort(([a], [b]) => a.localeCompare(b)).map(([month, list]) => {
    const m = Number(month.slice(5, 7));
    const days = daysIn(year, m);
    const spent = list.reduce((sum, t) => sum + t.amount, 0);
    const from = `${month}-01`, to = `${month}-${String(days).padStart(2, '0')}`;
    const isNow = today >= from && today <= to;
    const weeks = [...group(list, (t) => weekOf(t.date))].sort(([a], [b]) => a - b).map(([w, wl]) => {
      const first = (w - 1) * 7 + 1, last = Math.min(w * 7, days);
      const wFrom = `${month}-${String(first).padStart(2, '0')}`, wTo = `${month}-${String(last).padStart(2, '0')}`;
      return node({
        id: `${id}/${month}/w${w}`, level: 'week', area: 'money', title: `Week ${w}`, now: today >= wFrom && today <= wTo,
        value: rm(wl.reduce((s, t) => s + t.amount, 0)), note: `Days ${first} to ${last}`,
        children: [...group(wl, (t) => t.date)].sort(([a], [b]) => a.localeCompare(b)).map(([day, dl]) => node({
          id: `${id}/${month}/w${w}/${day}`, level: 'day', area: 'money', title: dayName(day), now: day === today,
          value: rm(dl.reduce((s, t) => s + t.amount, 0)), note: `${dl.length} ${dl.length === 1 ? 'entry' : 'entries'}`,
          children: dl.map((t) => node({
            id: `${id}/${month}/w${w}/${day}/${t.id}`, level: 'item', area: 'money', title: t.what,
            value: rm(t.amount), note: [t.category, t.account].filter(Boolean).join(' · ')
          }))
        }))
      });
    });
    return node({
      id: `${id}/${month}`, level: 'month', area: 'money', title: MONTHS[m - 1], now: isNow,
      value: rm(spent), note: limit ? `of ${rm(limit)}${spent > limit ? ' · over the limit' : ''}` : `${list.length} entries`,
      done: limit ? clamp01(spent / limit) : null, time: passed(from, to, today),
      tone: limit ? (spent > limit ? 'warn' : 'good') : '', children: weeks
    });
  });
  const total = inYear.reduce((s, t) => s + t.amount, 0);
  return node({ id, level: 'area', area: 'money', title: 'Money', value: `${rm(total)} spent`, note: `${months.length} ${months.length === 1 ? 'month' : 'months'}`, children: months, now: months.some((m) => m.now) });
}

// ---------- food ----------

function foodFor(year, input, id) {
  const { foodLog, foodTargets, today } = input;
  const inYear = foodLog.filter((e) => Number(e.date.slice(0, 4)) === year);
  if (!inYear.length) return null;
  const kcalTarget = foodTargets?.kcal ?? 0;
  const months = [...group(inYear, (e) => e.date.slice(0, 7))].sort(([a], [b]) => a.localeCompare(b)).map(([month, list]) => {
    const byDay = [...group(list, (e) => e.date)].sort(([a], [b]) => a.localeCompare(b));
    const onTarget = kcalTarget ? byDay.filter(([, dl]) => dl.reduce((s, e) => s + e.kcal, 0) <= kcalTarget).length : 0;
    return node({
      id: `${id}/${month}`, level: 'month', area: 'food', title: MONTHS[Number(month.slice(5, 7)) - 1], now: today.slice(0, 7) === month,
      value: `${byDay.length} ${byDay.length === 1 ? 'day' : 'days'} logged`, note: kcalTarget ? `${onTarget} at or under your calorie target` : '',
      done: kcalTarget && byDay.length ? onTarget / byDay.length : null, tone: '',
      children: byDay.map(([day, dl]) => {
        const kcal = Math.round(dl.reduce((s, e) => s + e.kcal, 0));
        const protein = Math.round(dl.reduce((s, e) => s + e.protein, 0));
        return node({
          id: `${id}/${month}/${day}`, level: 'day', area: 'food', title: dayName(day), now: day === today,
          value: `${kcal.toLocaleString('en-MY')} kcal`, note: `${protein} g protein`,
          done: kcalTarget ? clamp01(kcal / kcalTarget) : null, tone: kcalTarget ? (kcal > kcalTarget ? 'warn' : 'good') : '',
          children: [...group(dl, (e) => e.meal)].map(([meal, ml]) => node({
            id: `${id}/${month}/${day}/${meal}`, level: 'meal', area: 'food', title: meal,
            value: `${Math.round(ml.reduce((s, e) => s + e.kcal, 0))} kcal`, note: `${ml.length} ${ml.length === 1 ? 'food' : 'foods'}`,
            children: ml.map((e) => node({ id: `${id}/${month}/${day}/${meal}/${e.id}`, level: 'item', area: 'food', title: e.food, value: `${Math.round(e.kcal)} kcal`, note: `${Math.round(e.protein)} g protein` }))
          }))
        });
      })
    });
  });
  return node({ id, level: 'area', area: 'food', title: 'Food', value: `${count(new Set(inYear.map((e) => e.date)).size, 'day')} logged`, children: months, now: months.some((m) => m.now) });
}

// ---------- health ----------

function healthFor(year, input, id) {
  const { healthDays, workouts, healthTargets, today } = input;
  const days = healthDays.filter((d) => Number(d.day.slice(0, 4)) === year);
  const sessions = workouts.filter((w) => Number(w.date.slice(0, 4)) === year);
  if (!days.length && !sessions.length) return null;
  const stepTarget = healthTargets?.steps ?? 0;
  const all = [...new Set([...days.map((d) => d.day), ...sessions.map((w) => w.date)])].sort();
  const dayData = new Map(days.map((d) => [d.day, d]));
  const workoutsOn = group(sessions, (w) => w.date);

  const months = [...group(all, (d) => d.slice(0, 7))].map(([month, list]) => {
    const monthWorkouts = list.reduce((n, d) => n + (workoutsOn.get(d)?.length ?? 0), 0);
    const reached = stepTarget ? list.filter((d) => (dayData.get(d)?.steps ?? 0) >= stepTarget).length : 0;
    return node({
      id: `${id}/${month}`, level: 'month', area: 'health', title: MONTHS[Number(month.slice(5, 7)) - 1], now: today.slice(0, 7) === month,
      value: `${monthWorkouts} ${monthWorkouts === 1 ? 'workout' : 'workouts'}`, note: stepTarget ? `Step target reached on ${reached} of ${list.length} days` : `${count(list.length, 'day')} logged`,
      done: stepTarget ? reached / list.length : null,
      children: [...group(list, (d) => weekOf(d))].sort(([a], [b]) => a - b).map(([w, wl]) => node({
        id: `${id}/${month}/w${w}`, level: 'week', area: 'health', title: `Week ${w}`, now: wl.includes(today),
        value: count(wl.reduce((n, d) => n + (workoutsOn.get(d)?.length ?? 0), 0), 'workout'), note: `${count(wl.length, 'day')} logged`,
        children: wl.map((day) => {
          const d = dayData.get(day) ?? {};
          const ws = workoutsOn.get(day) ?? [];
          const items = [];
          if (d.steps !== null && d.steps !== undefined) items.push(node({ id: `${id}/${month}/w${w}/${day}/steps`, level: 'item', area: 'health', title: 'Steps', value: d.steps.toLocaleString('en-MY'), done: stepTarget ? clamp01(d.steps / stepTarget) : null, tone: stepTarget ? (d.steps >= stepTarget ? 'good' : 'warn') : '' }));
          if (d.sleepMinutes !== null && d.sleepMinutes !== undefined) items.push(node({ id: `${id}/${month}/w${w}/${day}/sleep`, level: 'item', area: 'health', title: 'Sleep', value: hm(d.sleepMinutes) }));
          if (d.restingHr !== null && d.restingHr !== undefined) items.push(node({ id: `${id}/${month}/w${w}/${day}/hr`, level: 'item', area: 'health', title: 'Resting heart rate', value: `${d.restingHr} bpm` }));
          if (d.weightKg !== null && d.weightKg !== undefined) items.push(node({ id: `${id}/${month}/w${w}/${day}/weight`, level: 'item', area: 'health', title: 'Body weight', value: `${d.weightKg} kg` }));
          if (d.waterMl !== null && d.waterMl !== undefined) items.push(node({ id: `${id}/${month}/w${w}/${day}/water`, level: 'item', area: 'health', title: 'Water', value: `${(d.waterMl / 1000).toFixed(1)} L`, done: healthTargets?.waterMl ? clamp01(d.waterMl / healthTargets.waterMl) : null }));
          for (const wo of ws) {
            items.push(node({
              id: `${id}/${month}/w${w}/${day}/workout-${wo.id}`, level: 'item', area: 'health', title: wo.name,
              value: wo.minutes ? `${wo.minutes} min` : 'Workout', note: wo.kind && wo.kind !== 'other' ? wo.kind[0].toUpperCase() + wo.kind.slice(1) : '',
              children: (wo.exercises ?? []).map((x) => node({ id: `${id}/${month}/w${w}/${day}/workout-${wo.id}/${x.id}`, level: 'item', area: 'health', title: x.name, value: `${x.sets} × ${x.reps}${x.weightKg ? ` at ${x.weightKg} kg` : ''}` }))
            }));
          }
          return node({
            id: `${id}/${month}/w${w}/${day}`, level: 'day', area: 'health', title: dayName(day), now: day === today,
            value: d.steps !== null && d.steps !== undefined ? `${d.steps.toLocaleString('en-MY')} steps` : count(ws.length, 'workout'),
            note: ws.map((x) => x.name).join(', '), done: stepTarget && d.steps !== null && d.steps !== undefined ? clamp01(d.steps / stepTarget) : null,
            children: items
          });
        })
      }))
    });
  });
  return node({ id, level: 'area', area: 'health', title: 'Health', value: count(sessions.length, 'workout'), note: `${count(all.length, 'day')} logged`, children: months, now: months.some((m) => m.now) });
}

// ---------- the years ahead ----------

// A full-time year at Monash is 48 credit points (24 a semester).
export const CREDITS_A_YEAR = 48;

// The last year of the course, worked out from the total credit points the user typed in with their goal.
// The current semester's units count as done, so what is left starts next year.
// With no total known, the line goes one year ahead.
export function lastYear(report, goal, thisYear) {
  const total = goal?.totalCredits;
  if (!report || !total) return thisYear + 1;
  const done = (report.finished?.credits ?? 0) + (report.units ?? []).reduce((sum, u) => sum + (u.credit ?? 0), 0);
  const left = Math.max(0, total - done);
  return thisYear + Math.max(1, Math.ceil(left / CREDITS_A_YEAR));
}

// ---------- the whole tree ----------

export function lifeTree(input) {
  const { today, report } = input;
  const years = new Set([Number(today.slice(0, 4))]);
  for (const t of report?.terms ?? []) years.add(termYear(t.term, today));
  for (const u of report?.units ?? []) years.add(termYear(u.term || report.currentTerm, today));
  for (const t of input.transactions) years.add(Number(t.date.slice(0, 4)));
  for (const e of input.foodLog) years.add(Number(e.date.slice(0, 4)));
  for (const d of input.healthDays) years.add(Number(d.day.slice(0, 4)));
  for (const w of input.workouts) years.add(Number(w.date.slice(0, 4)));
  const thisYear = Number(today.slice(0, 4));
  const end = lastYear(report, input.goal, thisYear);
  for (let year = thisYear + 1; year <= end; year++) years.add(year);

  const yearNodes = [...years].sort((a, b) => a - b).map((year) => {
    const id = `life/${year}`;
    // A year that has started always shows all four areas, so an empty one says so instead of vanishing.
    const AREAS = [['studies', 'Studies', studiesFor], ['money', 'Money', moneyFor], ['food', 'Food', foodFor], ['health', 'Health', healthFor]];
    const found = AREAS.map(([key, , make]) => make(year, input, `${id}/${key}`));
    const areas = year > thisYear ? found.filter(Boolean) : found.map((area, i) => area ?? node({
      id: `${id}/${AREAS[i][0]}`, level: 'area', area: AREAS[i][0], title: AREAS[i][1], value: 'Nothing recorded', empty: true
    }));
    const recorded = areas.filter((a) => !a.empty);
    const isNow = String(year) === today.slice(0, 4);
    return node({
      id, level: 'year', title: String(year), now: isNow,
      value: isNow ? 'This year' : year < thisYear ? 'Finished' : 'Ahead',
      note: recorded.length ? recorded.map((a) => a.title).join(', ') : year > thisYear ? (year === end && input.goal?.totalCredits ? 'The last year of your course' : 'Still to come') : 'Nothing recorded',
      time: passed(`${year}-01-01`, `${year}-12-31`, today), children: areas
    });
  });

  return node({ id: 'life', level: 'root', title: 'You', value: `${yearNodes.length} ${yearNodes.length === 1 ? 'year' : 'years'}`, now: true, children: yearNodes });
}
