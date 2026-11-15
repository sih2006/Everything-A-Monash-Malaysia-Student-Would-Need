/*
 * Prototype logic. Plain JavaScript, no build step, no dependencies.
 * Everything is worked out from the fake data in data.js, so changing a mark
 * there changes every figure and verdict on screen.
 *
 * This is a throwaway prototype of the screens. It is not the real app and
 * none of this code is meant to be reused in it.
 */
(function () {
  'use strict';

  // Work on a copy so the fake data file is never changed. A reload resets everything.
  const D = JSON.parse(JSON.stringify(window.FAKE));

  // ---------- Small helpers ----------

  const $ = (sel, root) => (root || document).querySelector(sel);
  const sum = (xs) => xs.reduce((a, b) => a + b, 0);
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rm = (n) => 'RM ' + n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (n) => Math.round(n).toLocaleString('en-MY');
  const f1 = (n) => n.toFixed(1);
  const f2 = (n) => n.toFixed(2);
  const pct = (n) => f1(n) + '%';
  const hm = (min) => Math.floor(min / 60) + ' h ' + String(min % 60).padStart(2, '0') + ' min';
  const WORDS = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (e) { /* storage blocked: carry on */ } }
  };

  let hidden = store.get('hideGrades') === '1';

  // Wraps any grade-related value so it can be hidden.
  const g = (value) => hidden
    ? '<span class="masked"><span aria-hidden="true">•••</span><span class="sr">hidden</span></span>'
    : value;

  const ARROW = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';

  const chip = (text, tone) => `<span class="chip ${tone || ''}">${esc(text)}</span>`;
  const bar = (percent, tone, todayAt) => `
    <div class="bar ${tone || ''}" aria-hidden="true">
      <i style="width:${clamp(percent, 0, 100)}%"></i>
      ${todayAt === undefined ? '' : `<span class="today" style="left:${todayAt}%"></span>`}
    </div>`;
  const mascot = (file, tint, alt, large) =>
    `<img class="mascot ${large ? 'lg' : ''} ${tint}" src="images/${file}" alt="${esc(alt)}" width="104" height="104">`;
  const mood = (file, tint, name, moodText) => `
    <div class="mood">
      ${mascot(file, tint, name + ' placeholder art', true)}
      <div><strong>${esc(name)}</strong><span>Mood: ${esc(moodText)}</span><small>Placeholder art</small></div>
    </div>`;

  // ---------- Grades: the rules ----------

  const gradeFor = (mark) => D.gradeBands.find((b) => mark >= b.min);

  function unitStats(u) {
    const done = u.assessments.filter((a) => a.mark !== null);
    const doneWeight = sum(done.map((a) => a.weight));
    const earned = sum(done.map((a) => a.weight * a.mark / 100));
    const leftWeight = 100 - doneWeight;
    const average = doneWeight ? earned / doneWeight * 100 : null;
    const secured = earned >= u.target.mark;
    const need = leftWeight ? (u.target.mark - earned) / leftWeight * 100 : null;
    const possible = secured || (need !== null && need <= 100);
    const limit = average === null ? null : Math.min(100, average + D.realisticMargin);
    const realistic = secured || (possible && limit !== null && need <= limit);
    const best = gradeFor(earned + leftWeight);
    const bestRealistic = limit === null ? best : gradeFor(earned + leftWeight * limit / 100);
    const projected = average === null ? null : earned + leftWeight * average / 100;

    let verdict;
    if (secured) verdict = 'Your target is already secured.';
    else if (!possible) verdict = `${u.target.grade} is out of reach. The highest grade you can still get is ${best.grade}.`;
    else if (!realistic) verdict = `You would need ${f1(need - average)} points above your average so far. ${bestRealistic.grade} is the highest realistic grade.`;
    else if (need <= average) verdict = 'On course. The mark you need is below your average so far.';
    else verdict = `On course. You need ${f1(need - average)} points above your average so far.`;

    return { u, doneCount: done.length, doneWeight, earned, leftWeight, average, need, secured, possible, realistic, onCourse: possible && realistic, best, bestRealistic, projected, verdict };
  }

  const gpaOf = (rows) => sum(rows.map((r) => gradeFor(r.mark).points * r.credit)) / sum(rows.map((r) => r.credit));
  const wamOf = (rows) => sum(rows.map((r) => r.mark * r.credit)) / sum(rows.map((r) => r.credit));

  function gradeSummary() {
    const stats = D.units.map(unitStats);
    const current = stats.map((s) => ({ mark: s.projected, credit: s.u.credit }));
    const pastRows = D.past.flatMap((t) => t.units);
    const pointsSoFar = sum(pastRows.map((r) => gradeFor(r.mark).points));
    const unitsLeft = D.student.totalUnits - pastRows.length;
    return {
      stats,
      onCourse: stats.filter((s) => s.onCourse).length,
      semGpa: gpaOf(current),
      cgpa: gpaOf(pastRows),
      cgpaProjected: gpaOf(pastRows.concat(current)),
      wam: wamOf(pastRows),
      unitsLeft,
      goalNeed: (D.goal.value * D.student.totalUnits - pointsSoFar) / unitsLeft,
      trend: D.past.map((t) => ({ label: t.short, gpa: gpaOf(t.units), projected: false }))
        .concat([{ label: 'S1 2027', gpa: gpaOf(current), projected: true }])
    };
  }

  // ---------- Budget, food and health: the rules ----------

  function budgetSummary() {
    const b = D.budget;
    const spent = sum(b.categories.map((c) => c.spent));
    const left = b.limit - spent;
    const daysLeft = b.days - b.day;
    const spentPct = spent / b.limit * 100;
    const monthPct = b.day / b.days * 100;
    const over = left < 0;
    const ahead = !over && spentPct > monthPct + 5;
    return {
      spent, left, daysLeft, spentPct, monthPct, over, ahead,
      perDay: daysLeft > 0 ? Math.max(0, left) / daysLeft : 0,
      perDaySoFar: spent / b.day,
      verdict: over ? 'Over your limit' : ahead ? 'Ahead of pace' : 'On pace',
      tone: over || ahead ? 'warn' : 'good',
      mood: over ? 'panicking' : ahead ? 'stressed' : 'relaxed'
    };
  }

  function foodSummary() {
    const f = D.food;
    const kcal = sum(f.log.map((x) => x.kcal));
    const protein = sum(f.log.map((x) => x.protein));
    const over = kcal > f.targetKcal;
    return {
      kcal, protein, over,
      left: f.targetKcal - kcal,
      proteinLeft: f.targetProtein - protein,
      verdict: over ? 'Over target' : 'On target',
      tone: over ? 'warn' : 'good',
      mood: over ? 'concerned' : protein >= f.targetProtein ? 'proud' : 'wants more protein'
    };
  }

  function healthSummary() {
    const h = D.health;
    const today = h.steps.find((d) => d.today);
    const sleep = h.sleep.find((d) => d.today);
    return {
      steps: today.value, stepsLeft: h.stepTarget - today.value,
      sleep: sleep.minutes, sleepShort: h.sleepTargetMin - sleep.minutes,
      stepsOk: today.value >= h.stepTarget
    };
  }

  // ---------- Views ----------

  function viewHome() {
    const gs = gradeSummary();
    const bs = budgetSummary();
    const fs = foodSummary();
    const hs = healthSummary();
    const total = gs.stats.length;
    const off = gs.stats.filter((s) => !s.onCourse);

    const headline = gs.onCourse === total
      ? `All ${WORDS[total].toLowerCase()} of your units are on course.`
      : `${WORDS[gs.onCourse]} of your ${WORDS[total].toLowerCase()} units ${gs.onCourse === 1 ? 'is' : 'are'} on course.`;

    const offText = off.map((s) => s.possible
      ? `${s.u.code} needs more than you usually score`
      : `${s.u.code} can no longer reach your ${s.u.target.grade} target`);
    let lede = offText.length ? offText.join(', and ') + '.' : 'Every target is within reach of your average so far.';
    if (hidden) lede = 'Grade details are hidden.';
    if (bs.tone === 'warn') lede += ' Your spending is running ahead of the month.';

    const eggMood = gs.onCourse === total ? 'happy' : gs.onCourse >= total / 2 ? 'worried' : 'distressed';

    const attention = [];
    off.forEach((s) => attention.push({
      tab: 'grades',
      text: hidden ? `${s.u.code}: details hidden` : `${s.u.code}: ${s.verdict}`
    }));
    D.budget.categories.filter((c) => c.spent > c.limit).forEach((c) => attention.push({
      tab: 'budget', text: `${c.name} is over its limit by ${rm(c.spent - c.limit)}.`
    }));
    if (fs.proteinLeft > 0) attention.push({ tab: 'food', text: `Protein is ${fs.proteinLeft} g short of today's target.` });
    if (hs.sleepShort > 0) attention.push({ tab: 'health', text: `Last night's sleep was ${hm(hs.sleepShort)} under your target.` });

    const modules = [
      { tab: 'grades', title: 'Grades', img: 'penguin-egg.svg', tint: 't-grades', alt: 'Penguin egg placeholder art',
        chip: chip(gs.onCourse === total ? 'On course' : 'Needs attention', gs.onCourse === total ? 'good' : 'warn'),
        big: `${gs.onCourse} of ${total}`, line: 'units on course for their targets' },
      { tab: 'budget', title: 'Budget', img: 'crab.svg', tint: 't-budget', alt: 'Crab placeholder art',
        chip: chip(bs.verdict, bs.tone), big: rm(Math.max(0, bs.left)), line: `left for the next ${bs.daysLeft} days` },
      { tab: 'food', title: 'Food', img: 'joel.svg', tint: 't-food', alt: 'Joel placeholder art',
        chip: chip(fs.verdict, fs.tone), big: `${num(Math.max(0, fs.left))} kcal`, line: 'left for today' },
      { tab: 'health', title: 'Health', img: 'pulse.svg', tint: 't-health', alt: 'Health placeholder art',
        chip: chip(hs.stepsOk ? 'Target reached' : 'Behind today', hs.stepsOk ? 'good' : 'warn'),
        big: num(hs.steps), line: `steps of your ${num(D.health.stepTarget)} target` }
    ];

    return `
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Good evening, ${esc(D.student.name)} · ${esc(D.term.name)} · Week ${D.term.week} of ${D.term.weeks}</p>
          <h1>${headline}</h1>
          <p class="lede">${esc(lede)}</p>
          <div class="row">
            <a class="btn primary" href="#grades">Open grades</a>
            <a class="btn quiet" href="#budget">Open budget</a>
          </div>
        </div>
        <figure class="hero-art">
          <img src="images/penguin-egg.svg" alt="Penguin egg placeholder art" width="240" height="240">
          <figcaption>Mood: ${eggMood}<small>Placeholder art</small></figcaption>
        </figure>
      </section>

      <section class="grid wide" aria-label="Today at a glance">
        ${modules.map((m) => `
          <a class="card module" href="#${m.tab}">
            <div class="card-head">${mascot(m.img, m.tint, m.alt)}${m.chip}</div>
            <h2>${m.title}</h2>
            <div class="big">${m.big}</div>
            <p class="note">${m.line}</p>
            <span class="go">Open ${m.title.toLowerCase()} ${ARROW}</span>
          </a>`).join('')}
      </section>

      <section class="card">
        <h2>Needs your attention</h2>
        ${attention.length ? `<ul class="list attention">
          ${attention.map((a) => `<li><span>${esc(a.text)}</span><a href="#${a.tab}">Open ${a.tab}</a></li>`).join('')}
        </ul>` : '<p class="note">Nothing right now. Everything is on target.</p>'}
      </section>`;
  }

  function gpaChart(trend, goal) {
    if (hidden) return '<p class="note">Hidden while grades are hidden.</p>';
    const W = 520, H = 220, left = 44, right = 24, top = 28, bottom = 36;
    const lo = 2, hi = 4;
    const x = (i) => left + i * (W - left - right) / (trend.length - 1);
    const y = (v) => top + (hi - v) * (H - top - bottom) / (hi - lo);
    const points = trend.map((t, i) => `${x(i)},${y(t.gpa)}`).join(' ');
    return `
      <svg class="linechart" viewBox="0 0 ${W} ${H}" role="img"
           aria-label="GPA by semester: ${trend.map((t) => `${t.label} ${f2(t.gpa)}${t.projected ? ' projected' : ''}`).join(', ')}. Goal ${f2(goal)}.">
        ${[2, 3, 4].map((v) => `<line class="gridline" x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}"/>
          <text class="axis" x="${left - 10}" y="${y(v) + 5}" text-anchor="end">${v}.0</text>`).join('')}
        <line class="goal" x1="${left}" x2="${W - right}" y1="${y(goal)}" y2="${y(goal)}"/>
        <polyline class="series" points="${points}"/>
        ${trend.map((t, i) => `
          <circle class="dot ${t.projected ? 'proj' : ''}" cx="${x(i)}" cy="${y(t.gpa)}" r="6"/>
          <text x="${x(i)}" y="${y(t.gpa) + 26}" text-anchor="${i === 0 ? 'start' : i === trend.length - 1 ? 'end' : 'middle'}">${f2(t.gpa)}</text>
          <text class="axis" x="${x(i)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === trend.length - 1 ? 'end' : 'middle'}">${t.label}</text>
          <circle class="hit" cx="${x(i)}" cy="${y(t.gpa)}" r="22" data-tip="${t.label}: GPA ${f2(t.gpa)}${t.projected ? ' (projected)' : ''}"/>`).join('')}
      </svg>
      <div class="legend">
        <span><i></i>GPA each semester</span>
        <span><i class="dash" style="border-color: var(--mark-warn)"></i>Goal ${f2(goal)}</span>
        <span>Hollow point: projected</span>
      </div>`;
  }

  function unitCard(s, index) {
    const u = s.u;
    const start = clamp(Math.round(s.need === null ? 0 : s.need), 0, 100);
    return `
      <article class="card unit">
        <div class="card-head">
          <h2>${esc(u.code)}</h2>
          <span class="note">Target: <strong>${g(`${u.target.grade} (${u.target.mark})`)}</strong></span>
        </div>
        <p class="note">${esc(u.name)}</p>
        <div class="row">
          ${chip(s.secured ? 'Secured' : s.possible ? 'Possible' : 'Not possible', s.possible ? 'good' : 'warn')}
          ${chip(s.realistic ? 'Realistic' : 'Not realistic', s.realistic ? 'good' : 'warn')}
        </div>
        <div class="pair">
          <div>
            <div class="label">Earned so far</div>
            <div class="mid">${g(f1(s.earned))}</div>
            <div class="note">of ${s.doneWeight} marked · average ${g(pct(s.average))}</div>
          </div>
          <div>
            <div class="label">Needed for target</div>
            <div class="mid">${g(s.secured ? 'Done' : pct(s.need))}</div>
            <div class="note">across the remaining ${s.leftWeight}%</div>
          </div>
        </div>
        <p>${hidden ? 'Details hidden.' : esc(s.verdict)}</p>
        ${hidden ? '' : `
        <div class="whatif">
          <label for="whatif-${index}">What if you score <span data-whatif-value>${start}</span>% on what is left?</label>
          <input type="range" id="whatif-${index}" min="0" max="100" step="1" value="${start}" data-whatif="${index}">
          <output for="whatif-${index}" data-whatif-out>${whatIf(s, start)}</output>
        </div>`}
        <details>
          <summary>Assessments: ${s.doneCount} of ${u.assessments.length} done</summary>
          <ul class="list">
            ${u.assessments.map((a) => `
              <li><span>${esc(a.name)} <span class="dim">· ${a.weight}%</span></span>
              <span class="end ${a.mark === null ? 'dim' : ''}">${a.mark === null ? 'Not done' : g(a.mark + '%')}</span></li>`).join('')}
          </ul>
        </details>
        <p class="note">${u.hurdle ? `Hurdle: at least ${u.hurdle.min}% on the ${esc(u.hurdle.on.toLowerCase())}.` : 'No hurdle.'}</p>
      </article>`;
  }

  // Result of scoring `score` percent on everything that is left in a unit.
  function whatIf(s, score) {
    const final = s.earned + s.leftWeight * score / 100;
    const grade = gradeFor(final).grade;
    const failsHurdle = s.u.hurdle && score < s.u.hurdle.min;
    if (failsHurdle) return `Final mark ${f1(final)}, but you would fail the hurdle (${s.u.hurdle.min}% needed).`;
    return `Final mark ${f1(final)}, grade ${grade}. ${final >= s.u.target.mark ? 'Target reached.' : 'Below your target.'}`;
  }

  function viewGrades() {
    const gs = gradeSummary();
    const total = gs.stats.length;
    const eggMood = gs.onCourse === total ? 'happy' : gs.onCourse >= total / 2 ? 'worried' : 'distressed';
    const goalGap = gs.semGpa - gs.goalNeed;

    return `
      <div class="page-head">
        <div class="text">
          <h1 class="page-title">Grades</h1>
          <p class="sub">${esc(D.term.name)}, week ${D.term.week} of ${D.term.weeks}. You set the targets. The app gives the verdict.</p>
        </div>
        ${mood('penguin-egg.svg', 't-grades', 'Penguin egg', eggMood)}
      </div>

      <section class="grid" aria-label="Overall results">
        <div class="card">
          <div class="label">GPA this semester, projected</div>
          <div class="big">${g(f2(gs.semGpa))}</div>
          <p class="note">If you keep your average in every unit</p>
        </div>
        <div class="card">
          <div class="label">CGPA, all finished semesters</div>
          <div class="big">${g(f2(gs.cgpa))}</div>
          <p class="note">${g(f2(gs.cgpaProjected))} projected after this semester</p>
        </div>
        <div class="card">
          <div class="label">WAM, all finished semesters</div>
          <div class="big">${g(f1(gs.wam))}</div>
          <p class="note">Weighted by credit points</p>
        </div>
      </section>

      <section class="banner ${goalGap >= 0 ? 'good' : 'warn'}">
        <h2>Final goal: ${D.goal.measure} ${g(f2(D.goal.value))} by graduation</h2>
        <p>You need an average GPA of ${g(f2(gs.goalNeed))} across your remaining ${gs.unitsLeft} units, so that is your default target this semester.
        ${hidden ? '' : goalGap >= 0 ? 'You are projected to meet it.' : `You are projected to fall ${f2(-goalGap)} short.`}</p>
      </section>

      <section class="card">
        <h2>GPA by semester</h2>
        ${gpaChart(gs.trend, D.goal.value)}
      </section>

      <section class="grid wide" aria-label="Units this semester">
        ${gs.stats.map(unitCard).join('')}
      </section>

      <section class="card">
        <details>
          <summary>Finished units: ${D.past.reduce((n, t) => n + t.units.length, 0)}</summary>
          ${D.past.map((t) => `
            <h3 class="label" style="margin-top: var(--s4)">${esc(t.term)} · GPA ${g(f2(gpaOf(t.units)))}</h3>
            <ul class="list">
              ${t.units.map((r) => `<li><span>${esc(r.code)} <span class="dim">· ${esc(r.name)}</span></span>
                <span class="end">${g(`${r.mark} ${gradeFor(r.mark).grade}`)}</span></li>`).join('')}
            </ul>`).join('')}
        </details>
      </section>`;
  }

  function viewBudget(message) {
    const b = D.budget;
    const bs = budgetSummary();
    return `
      <div class="page-head">
        <div class="text">
          <h1 class="page-title">Budget</h1>
          <p class="sub">${esc(b.month)}, day ${b.day} of ${b.days}. Your monthly limit is ${rm(b.limit)}.</p>
        </div>
        ${mood('crab.svg', 't-budget', 'Crab', bs.mood)}
      </div>

      <section class="grid" aria-label="Month so far">
        <div class="card">
          <div class="label">Spent</div>
          <div class="big">${rm(bs.spent)}</div>
          <p class="note">${Math.round(bs.spentPct)}% of your limit</p>
        </div>
        <div class="card">
          <div class="label">${bs.over ? 'Over by' : 'Left'}</div>
          <div class="big">${rm(Math.abs(bs.left))}</div>
          <p class="note">with ${bs.daysLeft} days to go</p>
        </div>
        <div class="card">
          <div class="label">Per day to stay inside</div>
          <div class="big">${rm(bs.perDay)}</div>
          <p class="note">You have averaged ${rm(bs.perDaySoFar)}</p>
        </div>
      </section>

      <section class="banner ${bs.tone}">
        <h2>${bs.verdict}</h2>
        <p>${Math.round(bs.monthPct)}% of the month has passed and ${Math.round(bs.spentPct)}% of your limit is spent.</p>
        ${bar(bs.spentPct, bs.tone, bs.monthPct)}
        <p>The dark line marks today.</p>
      </section>

      <section class="grid wide">
        <div class="card">
          <h2>Categories</h2>
          ${b.categories.map((c) => {
            const over = c.spent > c.limit;
            return `
            <div class="bar-row" data-tip="${esc(c.name)}: ${Math.round(c.spent / c.limit * 100)}% of limit">
              <div class="top"><strong>${esc(c.name)}</strong><span>${rm(c.spent)} <span class="note">of ${rm(c.limit)}</span></span></div>
              ${bar(c.spent / c.limit * 100, over ? 'warn' : '')}
              <span class="note ${over ? 'warn' : ''}">${over ? 'Over by ' + rm(c.spent - c.limit) : rm(c.limit - c.spent) + ' left'}</span>
            </div>`;
          }).join('')}
        </div>

        <div class="card">
          <h2>Add spending</h2>
          <form class="form" id="expenseForm" novalidate>
            <div class="field">
              <label for="expWhat">What was it?</label>
              <input id="expWhat" name="what" type="text" autocomplete="off" maxlength="40" required>
            </div>
            <div class="field">
              <label for="expAmount">Amount (RM)</label>
              <input id="expAmount" name="amount" type="number" inputmode="decimal" min="0.01" step="0.01" required>
            </div>
            <div class="field">
              <label for="expCat">Category</label>
              <select id="expCat" name="category">${b.categories.map((c) => `<option>${esc(c.name)}</option>`).join('')}</select>
            </div>
            <button class="btn primary" type="submit">Add</button>
          </form>
          <p class="error" id="expError" role="alert">${message ? esc(message) : ''}</p>
          <h2>Latest spending</h2>
          <ul class="list">
            ${b.recent.slice(0, 6).map((x) => `
              <li><span>${esc(x.what)} <span class="dim">· ${esc(x.category)} · ${esc(x.when)}</span></span>
              <span class="end">${rm(x.amount)}</span></li>`).join('')}
          </ul>
        </div>
      </section>`;
  }

  function viewFood() {
    const f = D.food;
    const fs = foodSummary();
    const r = 58, c = 2 * Math.PI * r;
    const filled = clamp(fs.kcal / f.targetKcal, 0, 1) * c;
    const proteinPct = fs.protein / f.targetProtein * 100;
    return `
      <div class="page-head">
        <div class="text">
          <h1 class="page-title">Food</h1>
          <p class="sub">Today. Your targets are ${num(f.targetKcal)} kcal and ${f.targetProtein} g of protein.</p>
        </div>
        ${mood('joel.svg', 't-food', 'Joel', fs.mood)}
      </div>

      <section class="grid wide" aria-label="Today so far">
        <div class="card">
          <div class="card-head"><h2>Calories</h2>${chip(fs.verdict, fs.tone)}</div>
          <div class="ring">
            <svg viewBox="0 0 148 148" role="img" aria-label="${num(fs.kcal)} of ${num(f.targetKcal)} kcal eaten">
              <circle class="trk" cx="74" cy="74" r="${r}"/>
              <circle class="val" cx="74" cy="74" r="${r}" transform="rotate(-90 74 74)" stroke-dasharray="${filled} ${c}"/>
              <text x="74" y="76">${num(fs.kcal)}</text>
              <text class="unit" x="74" y="96">kcal eaten</text>
            </svg>
            <div>
              <div class="label">${fs.over ? 'Over by' : 'Left for today'}</div>
              <div class="big">${num(Math.abs(fs.left))} kcal</div>
              <p class="note">${Math.round(fs.kcal / f.targetKcal * 100)}% of your target</p>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Protein</h2>${chip(fs.proteinLeft > 0 ? 'Short so far' : 'Target reached', fs.proteinLeft > 0 ? 'warn' : 'good')}</div>
          <div class="big">${fs.protein} g</div>
          ${bar(proteinPct, fs.proteinLeft > 0 ? 'warn' : '')}
          <p class="note ${fs.proteinLeft > 0 ? 'warn' : ''}">${fs.proteinLeft > 0 ? `${fs.proteinLeft} g short of ${f.targetProtein} g` : `${f.targetProtein} g target reached`}</p>
        </div>
      </section>

      <section class="card">
        <h2>Quick add</h2>
        <p class="note">Tap a food to log it.</p>
        <div class="quick">
          ${f.quickAdd.map((q, i) => `
            <button type="button" data-add-food="${i}">
              <strong>${esc(q.food)}</strong><span>${q.kcal} kcal · ${q.protein} g protein</span>
            </button>`).join('')}
        </div>
      </section>

      <section class="card">
        <h2>Logged today</h2>
        <ul class="list">
          ${f.log.map((m) => `
            <li><span><strong>${esc(m.food)}</strong> <span class="dim">· ${esc(m.when)}</span></span>
            <span class="end">${m.kcal} kcal <span class="dim">· ${m.protein} g</span></span></li>`).join('')}
        </ul>
      </section>`;
  }

  // Column chart shared by steps and sleep.
  function columns(rows, max, target, format, tipLabel) {
    const plot = 150; // pixels available for the tallest bar
    return `
      <div class="cols">
        <div class="target-line" style="bottom:${24 + target / max * plot}px"></div>
        ${rows.map((d) => {
          const value = d.value;
          const empty = value === null || value === undefined;
          return `
          <div class="col ${d.today ? 'today' : ''} ${empty ? 'empty' : ''}" ${empty ? '' : `data-tip="${d.day}: ${format(value)} ${tipLabel}"`}>
            <span class="val">${empty ? '' : format(value)}</span>
            <span class="mark" style="height:${empty ? 2 : Math.round(value / max * plot)}px"></span>
            <span class="day">${d.day}</span>
          </div>`;
        }).join('')}
      </div>`;
  }

  function viewHealth() {
    const h = D.health;
    const hs = healthSummary();
    const sleepRows = h.sleep.map((d) => ({ day: d.day, value: d.minutes, today: d.today }));
    const shortHm = (min) => Math.floor(min / 60) + ':' + String(min % 60).padStart(2, '0');
    return `
      <div class="page-head">
        <div class="text">
          <h1 class="page-title">Health</h1>
          <p class="sub">Steps come from your phone. Heart rate and sleep need a smartwatch.</p>
        </div>
        ${mood('pulse.svg', 't-health', 'No mascot yet', 'not designed')}
      </div>

      <section class="grid" aria-label="Today">
        <div class="card">
          <div class="card-head"><div class="label">Steps today</div>${chip(hs.stepsOk ? 'Target reached' : 'Behind', hs.stepsOk ? 'good' : 'warn')}</div>
          <div class="big">${num(hs.steps)}</div>
          ${bar(hs.steps / h.stepTarget * 100)}
          <p class="note">${hs.stepsOk ? 'Target reached' : `${num(hs.stepsLeft)} short of your ${num(h.stepTarget)} target`}</p>
        </div>
        <div class="card">
          <div class="card-head"><div class="label">Sleep last night</div>${chip(hs.sleepShort > 0 ? 'Under target' : 'Target reached', hs.sleepShort > 0 ? 'warn' : 'good')}</div>
          <div class="big">${hm(hs.sleep)}</div>
          <p class="note ${hs.sleepShort > 0 ? 'warn' : ''}">${hs.sleepShort > 0 ? `${hm(hs.sleepShort)} under your ${hm(h.sleepTargetMin)} target` : 'Target reached'}</p>
        </div>
        <div class="card">
          <div class="label">Resting heart rate</div>
          <div class="big">${h.restingHr} bpm</div>
          <p class="note">Your 7-day average is ${h.restingHrWeek} bpm</p>
        </div>
      </section>

      <section class="grid wide">
        <div class="card">
          <h2>Steps this week</h2>
          ${columns(h.steps, 10000, h.stepTarget, num, 'steps')}
          <div class="legend"><span><i></i>Earlier days</span><span><i class="today"></i>Today</span><span><i class="dash"></i>Your target: ${num(h.stepTarget)}</span></div>
        </div>
        <div class="card">
          <h2>Sleep this week</h2>
          ${columns(sleepRows, 540, h.sleepTargetMin, shortHm, 'hours')}
          <div class="legend"><span><i></i>Earlier nights</span><span><i class="today"></i>Last night</span><span><i class="dash"></i>Your target: ${shortHm(h.sleepTargetMin)}</span></div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <h2>Workouts: ${h.workouts.done} of ${h.workouts.target} this week</h2>
          ${chip(h.workouts.done >= h.workouts.target ? 'Target reached' : `${h.workouts.target - h.workouts.done} to go`, h.workouts.done >= h.workouts.target ? 'good' : '')}
        </div>
        <p class="note">Last session: ${esc(h.workouts.last)}.</p>
        <ul class="list">
          ${h.lifts.map((l) => `<li><span>${esc(l.name)}</span><span class="end">${esc(l.sets)} <span class="dim">· ${esc(l.load)}</span></span></li>`).join('')}
        </ul>
      </section>`;
  }

  // ---------- Routing and rendering ----------

  const VIEWS = { home: viewHome, grades: viewGrades, budget: viewBudget, food: viewFood, health: viewHealth };
  const view = $('#view');
  const currentTab = () => {
    const tab = location.hash.replace('#', '');
    return VIEWS[tab] ? tab : 'home';
  };

  function render(options) {
    const tab = currentTab();
    const opts = options || {};
    view.innerHTML = VIEWS[tab](opts.message) + '<p class="foot">Prototype. Every number here is made up.</p>';
    document.querySelectorAll('.nav a').forEach((a) => {
      if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = tab.charAt(0).toUpperCase() + tab.slice(1) + ' · Student companion prototype';
    if (opts.navigated) {
      view.classList.remove('enter');
      void view.offsetWidth; // restart the entrance animation
      view.classList.add('enter');
      window.scrollTo(0, 0);
      view.focus({ preventScroll: true });
    }
  }

  window.addEventListener('hashchange', () => render({ navigated: true }));

  // ---------- Top-level controls ----------

  const gradesBtn = $('#toggleGrades');
  function syncGradesBtn() {
    gradesBtn.setAttribute('aria-pressed', String(hidden));
    $('#toggleGradesLabel').textContent = hidden ? 'Show grades' : 'Hide grades';
  }
  gradesBtn.addEventListener('click', () => {
    hidden = !hidden;
    store.set('hideGrades', hidden ? '1' : '0');
    syncGradesBtn();
    render();
  });

  const themeBtn = $('#toggleTheme');
  function syncThemeBtn() {
    const dark = document.documentElement.dataset.theme === 'dark';
    $('#toggleThemeLabel').textContent = dark ? 'Light mode' : 'Dark mode';
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    store.set('theme', next);
    syncThemeBtn();
  });

  // ---------- Events inside the views (delegated) ----------

  view.addEventListener('input', (e) => {
    const slider = e.target.closest('[data-whatif]');
    if (!slider) return;
    const stats = unitStats(D.units[Number(slider.dataset.whatif)]);
    const box = slider.closest('.whatif');
    $('[data-whatif-value]', box).textContent = slider.value;
    $('[data-whatif-out]', box).textContent = whatIf(stats, Number(slider.value));
  });

  view.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add-food]');
    if (!add) return;
    const item = D.food.quickAdd[Number(add.dataset.addFood)];
    D.food.log.push({ food: item.food, when: 'Just now', kcal: item.kcal, protein: item.protein });
    render();
  });

  view.addEventListener('submit', (e) => {
    if (e.target.id !== 'expenseForm') return;
    e.preventDefault();
    const what = e.target.what.value.trim();
    const amount = Number(e.target.amount.value);
    const category = D.budget.categories.find((c) => c.name === e.target.category.value);
    if (!what) { $('#expError').textContent = 'Say what the spending was for.'; e.target.what.focus(); return; }
    if (!(amount > 0)) { $('#expError').textContent = 'Enter an amount above RM 0.00.'; e.target.amount.focus(); return; }
    category.spent += amount;
    D.budget.recent.unshift({ what, category: category.name, amount, when: 'Just now' });
    render();
  });

  // ---------- Tooltip for chart marks ----------

  const tip = $('#tip');
  function showTip(target) {
    const box = target.getBoundingClientRect();
    tip.textContent = target.dataset.tip;
    tip.style.left = clamp(box.left + box.width / 2, 90, window.innerWidth - 90) + 'px';
    tip.style.top = Math.max(48, box.top) + 'px';
    tip.hidden = false;
  }
  view.addEventListener('pointerover', (e) => {
    const target = e.target.closest('[data-tip]');
    if (target) showTip(target); else tip.hidden = true;
  });
  view.addEventListener('pointerleave', () => { tip.hidden = true; });
  window.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

  // ---------- Start ----------

  syncGradesBtn();
  syncThemeBtn();
  render();
})();
