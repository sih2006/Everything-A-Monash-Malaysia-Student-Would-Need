// The View: one function per screen. Each takes the app state and returns HTML.
//
// A screen decides nothing. It shows what the presenters prepared, and marks
// buttons and forms with data-action="..." so app.js can call the right command.

import { dayText, esc, f2, hm, lastDayOf, num, plain, rm } from '../format.js';
import { presentGrades, presentHome } from '../viewmodels/present.js';
import { ICON, artSpace, bar, chip, columns, emptyCard, field, fold, mood, pageHead, periodNav, select, trendChart } from './parts.js';

const MEALS = [['Breakfast', 'Breakfast'], ['Lunch', 'Lunch'], ['Dinner', 'Dinner'], ['Snack', 'Snack']];
const remove = (action, data, label) =>
  `<button type="button" class="link danger" data-action="${action}" ${data} aria-label="${esc(label)}">Remove</button>`;

// ================= home =================

export function homeView(state) {
  const home = presentHome(state.overview, state.hidden);
  const tints = { grades: 't-grades', budget: 't-budget', food: 't-food', health: 't-health' };
  return `
    <section class="hero scallop">
      <div class="hero-copy">
        <h1>${esc(home.headline.before)}${home.headline.strong ? `<em>${esc(home.headline.strong)}</em>` : ''}${esc(home.headline.after)}</h1>
        <p class="lede">${esc(home.lede)}</p>
        <div class="row">
          <a class="btn primary" href="#map">See your map</a>
          <a class="btn quiet" href="#grades">Open grades</a>
        </div>
        <p class="when">${esc(home.when)}</p>
      </div>
      <figure class="hero-art">
        <div class="slot" role="img" aria-label="Space for penguin egg art">Penguin egg art goes here</div>
        <figcaption>Mood: ${esc(home.mood)}</figcaption>
      </figure>
    </section>

    ${home.empty ? emptyCard('Start here', 'The app is empty. Add your own units on the Grades screen, or load example data to look around first. The example data is made up and can be deleted again.',
      '<div class="row"><a class="btn primary" href="#grades">Add my first unit</a><button type="button" class="btn quiet" data-action="loadDemo">Load example data</button></div>') : ''}

    <section class="petals" aria-label="Today at a glance">
      ${home.cards.map((c) => `
        <a class="petal ${tints[c.tab]}" href="#${c.tab}">
          <div class="card-head">${artSpace(c.name)}${chip(c.chip)}</div>
          <h2>${esc(c.title)}</h2>
          <div class="big">${esc(c.big)}</div>
          <p class="note">${esc(c.line)}</p>
          <span class="go">Open ${esc(c.title.toLowerCase())} ${ICON.arrow}</span>
        </a>`).join('')}
    </section>

    <section class="card">
      <h2>Needs your attention</h2>
      ${home.attention.length ? `<ul class="list attention">
        ${home.attention.map((a) => `<li><span>${esc(a.text)}</span><a href="#${a.tab}">Open ${a.tab}</a></li>`).join('')}
      </ul>` : `<p class="note">${home.empty ? 'Nothing yet.' : 'Nothing right now. Everything is on target.'}</p>`}
    </section>

    <section class="card">
      <h2>Your data</h2>
      <p class="note">Everything you enter is kept on this computer, in one file. Nothing is sent anywhere unless you use the AI helper.</p>
      ${home.empty ? '' : `
      <div class="row"><button type="button" class="btn quiet" data-action="exportData">Download all my data</button></div>
      <p class="note">Saves one .json file with everything in the app. Keep it somewhere safe as a backup. It holds your marks, money and health numbers, so do not share it.</p>`}
      ${!home.empty ? '' : fold('import', 'Load my data from a file', `
        <form class="form" data-action="importData">
          <div class="field"><label>A file downloaded from this app<input type="file" name="file" accept=".json,application/json" required></label></div>
          <button class="btn primary" type="submit">Load the file</button>
        </form>
        <p class="note">Every row is checked before anything is saved. If one row is wrong, nothing is loaded.</p>`)}
      ${home.empty ? '' : fold('delete-all', 'Delete all my data', `
        <form class="form" data-action="deleteEverything">
          ${field('Type the word delete to confirm', 'confirm', 'required')}
          <button class="btn danger" type="submit">Delete everything</button>
        </form>
        <p class="note">This removes every unit, mark, spending entry, meal and health record. It cannot be undone. Download your data first if you might want it back.</p>`)}
    </section>`;
}

// ================= grades =================

function unitCard(u, state) {
  const ai = state.overview.ai;
  return `
    <article class="card unit">
      <div class="card-head">
        <h2>${esc(u.code)}</h2>
        <span class="note">Target: <strong>${esc(u.targetText)}</strong></span>
      </div>
      ${u.name ? `<p class="note">${esc(u.name)}</p>` : ''}
      ${u.chips.length ? `<div class="row">${u.chips.map(chip).join('')}</div>` : ''}
      <div class="pair">
        <div>
          <div class="label">Earned so far</div>
          <div class="mid">${esc(u.earned)}</div>
          <div class="note">of ${u.doneWeight} marked${u.average ? ` · average ${esc(u.average)}` : ''}</div>
        </div>
        <div>
          <div class="label">Needed for target</div>
          <div class="mid">${u.need ? esc(u.need) : '—'}</div>
          <div class="note">${u.hasTarget ? `across the remaining ${u.leftWeight}%` : 'set a target first'}</div>
        </div>
      </div>
      <p>${esc(u.verdict)}</p>
      ${u.canWhatIf ? `
      <div class="whatif">
        <label>What if you score <span data-whatif-value>${u.whatIfStart}</span>% on what is left?
          <input type="range" min="0" max="100" step="1" value="${u.whatIfStart}" data-whatif="${esc(u.code)}"></label>
        <output data-whatif-out>Move the slider to see your final mark.</output>
      </div>` : ''}

      <h3 class="label">Assessments: ${u.doneCount} of ${u.totalCount} done</h3>
      ${u.assessments.length ? `<ul class="list">
        ${u.assessments.map((a) => `
          <li class="stack">
            <div class="rowline">
              <span>${esc(a.name)} <span class="dim">· ${a.weight}%${a.hurdle === null ? '' : ` · hurdle ${plain(a.hurdle)}%`}</span></span>
              <span class="end ${a.done ? '' : 'dim'}">${esc(a.markText)}${a.needText ? ` <span class="dim">· ${esc(a.needText)}</span>` : ''}</span>
            </div>
            ${a.hurdleFailed ? '<p class="note warn">Below the hurdle.</p>' : ''}
            ${!u.canEdit ? '' : fold(`a-${a.id}`, a.done ? 'Change' : 'Enter mark', `
              <form class="form" data-action="saveMark" data-id="${a.id}">
                ${field('Your mark', 'score', `inputmode="decimal" value="${a.done ? plain(a.score) : ''}"`, 'empty = not done')}
                ${field('Out of', 'max', `inputmode="decimal" value="${plain(a.max)}"`)}
                <button class="btn primary" type="submit">Save mark</button>
              </form>
              <form class="form" data-action="saveHurdle" data-id="${a.id}">
                ${field('Hurdle: lowest % that still passes', 'hurdle', `inputmode="decimal" value="${a.hurdle === null ? '' : plain(a.hurdle)}"`, 'empty = none')}
                <button class="btn quiet" type="submit">Save hurdle</button>
              </form>
              ${remove('deleteAssessment', `data-id="${a.id}" data-confirm="Remove ${esc(a.name)}?"`, `Remove ${a.name}`)}`)}
          </li>`).join('')}
      </ul>` : '<p class="note">No assessments yet. Add the first one below.</p>'}
      ${u.weightMissing ? `<p class="note">The weights add up to ${plain(100 - Number(u.weightMissing))}%. ${u.weightMissing}% is not entered yet, and counts as still to come.</p>` : ''}

      ${fold(`add-a-${u.code}`, 'Add an assessment', `
        <form class="form" data-action="addAssessment" data-code="${esc(u.code)}">
          ${field('Name', 'name', 'required maxlength="80" placeholder="Final exam"')}
          ${field('Weight (%)', 'weight', 'required inputmode="decimal"')}
          ${field('Hurdle (%)', 'hurdle', 'inputmode="decimal"', 'optional')}
          <button class="btn primary" type="submit">Add</button>
        </form>
        ${ai ? `
        <form class="form" data-action="readScreenshot" data-code="${esc(u.code)}">
          <div class="field"><label>Or read them from a screenshot<input type="file" name="picture" accept="image/png,image/jpeg,image/webp" required></label></div>
          <button class="btn quiet" type="submit">Read screenshot</button>
        </form>
        <p class="note">The picture is sent to Google's Gemini to be read. You check everything before it is saved.</p>` : ''}`,
        u.assessments.length === 0)}

      ${!u.canEdit ? '<p class="note">Show grades to change marks and targets.</p>' : fold(`t-${u.code}`, 'Target and unit settings', `
        <form class="form" data-action="setTarget" data-code="${esc(u.code)}">
          ${field('Target mark for the unit', 'target', `inputmode="decimal" value="${u.targetMark === null ? '' : plain(u.targetMark)}"`, 'P 50, C 60, D 70, HD 80. Empty = no target')}
          <button class="btn primary" type="submit">Save target</button>
        </form>
        <form class="form" data-action="saveUnitDetails" data-code="${esc(u.code)}">
          ${field('Name', 'name', `maxlength="80" value="${esc(u.name)}"`)}
          ${field('Credit points', 'credit', `required inputmode="decimal" value="${plain(u.credit)}"`)}
          ${field('Semester', 'term', `maxlength="40" value="${esc(u.term)}"`)}
          <button class="btn quiet" type="submit">Save details</button>
        </form>
        <p class="note">The unit code cannot be changed. To fix a wrong code, add the unit again and remove this one.</p>
        ${remove('deleteUnit', `data-code="${esc(u.code)}" data-confirm="Remove ${esc(u.code)} and all its assessments?"`, `Remove ${u.code}`)}`)}
    </article>`;
}

// The list read from a screenshot, shown for the user to correct before anything is saved.
function importReview(imported) {
  return `
    <section class="card" id="import-review">
      <h2>Check what was read for ${esc(imported.code)}</h2>
      <p class="note">Nothing is saved yet. Correct anything that is wrong, untick rows you do not want, then save.</p>
      ${imported.items.length === 0 ? '<p>Nothing could be read from that picture.</p>' : `
      <form data-action="confirmImport" class="import">
        ${imported.items.map((item, i) => `
          <fieldset class="form">
            <div class="field tick"><label><input type="checkbox" name="keep-${i}" checked> Keep</label></div>
            ${field('Name', `name-${i}`, `value="${esc(item.name)}" maxlength="80"`)}
            ${field('Weight (%)', `weight-${i}`, `inputmode="decimal" value="${item.weight ?? ''}"`)}
            ${field('Mark', `score-${i}`, `inputmode="decimal" value="${item.score ?? ''}"`, 'empty = not done')}
            ${field('Out of', `max-${i}`, `inputmode="decimal" value="${item.max ?? ''}"`)}
          </fieldset>`).join('')}
        <div class="row"><button class="btn primary" type="submit">Save the ticked rows</button>
        <button class="btn quiet" type="button" data-action="cancelImport">Cancel</button></div>
      </form>`}
      ${imported.items.length === 0 ? '<button class="btn quiet" type="button" data-action="cancelImport">Close</button>' : ''}
    </section>`;
}

export function gradesView(state) {
  const report = state.overview.academics;
  if (!report) {
    return pageHead('Grades', 'Units, marks, targets and your results.') +
      emptyCard('Grades cannot load', state.overview.academicsError ?? 'The grade engine is not ready.');
  }
  const g = presentGrades(report, state.hidden);
  const goal = g.goalValues;
  const addUnit = `
    <form class="form" data-action="addUnit">
      ${field('Unit code', 'code', 'required maxlength="12" placeholder="FIT2004"')}
      ${field('Name', 'name', 'maxlength="80"', 'optional')}
      ${field('Credit points', 'credit', 'inputmode="decimal" value="6"')}
      ${field('Semester', 'term', `maxlength="40" value="${esc(g.term)}" placeholder="S1 2027"`)}
      <button class="btn primary" type="submit">Add unit</button>
    </form>`;

  return `
    ${pageHead('Grades', `${g.term ? g.term + '. ' : ''}You set the targets. The app gives the verdict.`, mood('t-grades', 'Penguin egg', g.mood))}
    ${state.imported ? importReview(state.imported) : ''}

    <section class="grid stats" aria-label="Overall results">
      ${g.stats.map((s) => `
        <div class="card"><div class="label">${esc(s.label)}</div><div class="big">${esc(s.value)}</div><p class="note">${esc(s.note)}</p></div>`).join('')}
    </section>
    <p class="note">CGPA and GPA use different scales, so they give different numbers for the same grades. In Malaysia a Distinction counts 3.67; on the standard scale it counts 3.</p>

    ${g.goal ? `<section class="banner scallop ${g.goal.tone}"><h2>${esc(g.goal.title)}</h2><p>${esc(g.goal.text)}</p></section>` : ''}
    ${!g.canEdit ? '' : `<section class="card">
      ${fold('goal', g.goal ? 'Change your final goal' : 'Set a final goal', `
        <form class="form" data-action="saveGoal">
          ${select('Measure', 'measure', [['cgpa', 'CGPA (Malaysia scale)'], ['gpa', 'GPA (standard scale)'], ['wam', 'WAM']], goal?.measure ?? 'cgpa')}
          ${field('Value you want at graduation', 'value', `required inputmode="decimal" value="${goal ? plain(goal.value) : ''}"`)}
          ${field('Credit points in your whole course', 'totalCredits', `required inputmode="decimal" value="${goal ? plain(goal.totalCredits) : '144'}"`)}
          <button class="btn primary" type="submit">Save goal</button>
        </form>
        ${goal ? '<button type="button" class="link danger" data-action="clearGoal">Remove the goal</button>' : ''}
        <p class="note">The app works out what you need each semester from this goal, and offers it as the default target.</p>`, !g.goal && !g.empty)}
    </section>`}

    ${g.trend.length >= 2 ? `<section class="card"><h2>CGPA by semester</h2>${trendChart(g.trend, g.trendGoal, f2)}</section>` : ''}

    <section class="grid wide" aria-label="Units this semester">
      ${g.units.map((u) => unitCard(u, state)).join('')}
    </section>
    <section class="card">
      ${g.units.length === 0 ? '<h2>Add your first unit</h2>' + addUnit : fold('add-unit', 'Add a unit', addUnit)}
    </section>

    <section class="card">
      <h2>Study plan from the AI helper</h2>
      ${state.overview.ai ? `
        <p class="note">Sends a short summary (unit codes, targets and verdicts) to Google's Gemini and shows the plan it writes. Your unit names and marks are not sent.</p>
        <button type="button" class="btn quiet" data-action="askPlan" ${g.units.length ? '' : 'disabled'}>Write me a plan</button>
        ${state.plan ? `<div class="plan">${esc(state.plan)}</div>` : ''}`
      : '<p class="note">The AI helper is off. To turn it on, add a Gemini API key: the steps are in docs/handoff/gemini-setup.md. Everything else works without it.</p>'}
    </section>

    <section class="card">
      <h2>Finished units</h2>
      ${g.terms.length === 0 ? '<p class="note">None yet. Add your past results so your CGPA, GPA and WAM include them.</p>' : g.terms.map((t) => `
        <h3 class="label">${esc(t.term)} · ${esc(t.summary)}</h3>
        <ul class="list">
          ${t.units.map((u) => `<li><span>${esc(u.code)} <span class="dim">· ${esc(u.name)}</span></span>
            <span class="end">${esc(u.result)} ${remove('deleteResult', `data-id="${u.id}" data-confirm="Remove ${esc(u.code)} from your finished units?"`, `Remove ${u.code}`)}</span></li>`).join('')}
        </ul>`).join('')}
      ${fold('add-result', 'Add a finished unit', `
        <form class="form" data-action="addResult">
          ${field('Unit code', 'code', 'required maxlength="12"')}
          ${field('Name', 'name', 'maxlength="80"', 'optional')}
          ${field('Credit points', 'credit', 'inputmode="decimal" value="6"')}
          ${field('Final mark', 'mark', 'required inputmode="decimal"')}
          ${select('Grade', 'grade', [['', 'Work it out from the mark'], ['NP', 'NP (near pass)'], ['NH', 'NH (hurdle fail)'], ['WN', 'WN (withdrawn fail)']])}
          ${field('Semester', 'term', 'maxlength="40" placeholder="S1 2026"')}
          <button class="btn primary" type="submit">Add</button>
        </form>`)}
    </section>`;
}

// ================= budget =================

export function budgetView(state) {
  const b = state.views.budget ?? state.overview.budget;
  const isCurrent = !state.views.budget;
  const today = state.overview.today;
  // New spending goes on today, or on the last day of a past month being looked at. The user can change it.
  const spendDay = isCurrent ? today : lastDayOf(b.month);
  const head = pageHead('Budget', isCurrent ? `Day ${b.day} of ${b.days}.${b.hasLimit ? ` Your monthly limit is ${rm(b.limit)}.` : ''}` : `A past month.${b.hasLimit ? ` The limit is ${rm(b.limit)}.` : ''}`, mood('t-budget', 'Crab', b.mood));
  return `
    ${head}
    ${periodNav('budget', b.monthName, isCurrent, 'month')}
    ${b.hasLimit ? `
    <section class="grid stats" aria-label="Month so far">
      <div class="card"><div class="label">Spent</div><div class="big">${rm(b.spent)}</div><p class="note">${Math.round(b.spentPercent)}% of your limit</p></div>
      <div class="card"><div class="label">${b.over ? 'Over by' : 'Left'}</div><div class="big">${rm(Math.abs(b.left))}</div><p class="note">with ${b.daysLeft} ${b.daysLeft === 1 ? 'day' : 'days'} to go</p></div>
      <div class="card"><div class="label">Per day to stay inside</div><div class="big">${rm(b.perDay)}</div><p class="note">You have averaged ${rm(b.perDaySoFar)}</p></div>
    </section>
    <section class="banner scallop ${b.tone}">
      <h2>${esc(b.verdict)}</h2>
      <p>${Math.round(b.monthPercent)}% of the month has passed and ${Math.round(b.spentPercent)}% of your limit is spent.</p>
      ${bar(b.spentPercent, b.tone, b.monthPercent)}
      <p>The triangle points at today.</p>
    </section>` : emptyCard('Set a monthly limit', 'You decide the limit. The app then tells you if your spending is on pace.')}

    <section class="card">
      ${fold('limit', b.hasLimit ? 'Change the monthly limit' : 'Set the monthly limit', `
        <form class="form" data-action="saveBudgetLimit">
          ${field('Monthly limit (RM)', 'limit', `inputmode="decimal" value="${b.hasLimit ? plain(b.limit) : ''}"`, 'empty = add up the category limits')}
          <button class="btn primary" type="submit">Save limit</button>
        </form>`, !b.hasLimit)}
    </section>

    <section class="grid wide">
      <div class="card">
        <h2>Categories</h2>
        ${b.categories.length === 0 ? '<p class="note">No categories yet. Add one, such as Food or Transport, to start recording spending.</p>' : b.categories.map((c) => `
          <div class="bar-row" data-tip="${esc(c.name)}: ${Math.round(c.percent)}% of its limit">
            <div class="top"><strong>${esc(c.name)}</strong><span>${rm(c.spent)}${c.limit > 0 ? ` <span class="note">of ${rm(c.limit)}</span>` : ''}</span></div>
            ${c.limit > 0 ? bar(c.percent, c.over ? 'warn' : '') : ''}
            <div class="rowline"><span class="note ${c.over ? 'warn' : ''}">${c.limit <= 0 ? 'No limit' : c.over ? 'Over by ' + rm(c.spent - c.limit) : rm(c.left) + ' left'}</span>
              ${remove('deleteCategory', `data-id="${c.id}" data-confirm="Remove ${esc(c.name)} and all spending in it?"`, `Remove ${c.name}`)}</div>
          </div>`).join('')}
        ${fold('add-category', 'Add a category', `
          <form class="form" data-action="addCategory">
            ${field('Name', 'name', 'required maxlength="30" placeholder="Food"')}
            ${field('Monthly limit (RM)', 'limit', 'inputmode="decimal"', 'optional')}
            <button class="btn primary" type="submit">Add</button>
          </form>`, b.categories.length === 0)}
      </div>

      <div class="card">
        <h2>Add spending</h2>
        ${b.categories.length === 0 ? '<p class="note">Add a category first.</p>' : `
        <form class="form" data-action="addSpending">
          ${field('What was it?', 'what', 'required maxlength="60"')}
          ${field('Amount (RM)', 'amount', 'required inputmode="decimal"')}
          ${select('Category', 'category', b.categories.map((c) => [c.name, c.name]))}
          ${field('Day', 'date', `type="date" required value="${spendDay}" min="${b.month}-01" max="${spendDay}"`)}
          <button class="btn primary" type="submit">Add</button>
        </form>`}
        <h2>Latest spending</h2>
        ${b.recent.length === 0 ? `<p class="note">Nothing recorded in ${esc(b.monthName)}.</p>` : `<ul class="list">
          ${b.recent.map((x) => `
            <li><span>${esc(x.what)} <span class="dim">· ${esc(x.category)} · ${esc(dayText(x.date))}</span></span>
            <span class="end">${rm(x.amount)} ${remove('deleteSpending', `data-id="${x.id}"`, `Remove ${x.what}`)}</span></li>`).join('')}
        </ul>`}
      </div>
    </section>`;
}

// ================= food =================

export function foodView(state) {
  const f = state.views.food ?? state.overview.food;
  const isCurrent = !state.views.food;
  const when = isCurrent ? 'today' : `on ${dayText(f.date)}`;
  return `
    ${pageHead('Food', f.hasTargets ? `Your daily targets are ${num(f.targetKcal)} kcal${f.targetProtein ? ` and ${num(f.targetProtein)} g of protein` : ''}.` : 'Set your own daily targets to get a verdict.', mood('t-food', 'Joel', f.mood))}
    ${periodNav('food', isCurrent ? `Today, ${dayText(f.date)}` : dayText(f.date), isCurrent, 'day')}

    ${f.hasTargets ? `
    <section class="grid wide" aria-label="Today so far">
      <div class="card">
        <div class="card-head"><h2>Calories</h2>${chip({ text: f.verdict, tone: f.tone })}</div>
        <div class="big">${num(f.kcal)} kcal</div>
        ${bar(f.percent, f.over ? 'warn' : '')}
        <p class="note ${f.over ? 'warn' : ''}">${f.over ? `Over your ${num(f.targetKcal)} kcal target by ${num(-f.left)}` : `${num(f.left)} kcal left of ${num(f.targetKcal)}`}</p>
      </div>
      ${f.targetProtein > 0 ? `
      <div class="card">
        <div class="card-head"><h2>Protein</h2>${chip(f.proteinLeft > 0 ? { text: 'Short so far', tone: 'warn' } : { text: 'Target reached', tone: 'good' })}</div>
        <div class="big">${num(f.protein)} g</div>
        ${bar(f.proteinPercent, f.proteinLeft > 0 ? 'warn' : '')}
        <p class="note ${f.proteinLeft > 0 ? 'warn' : ''}">${f.proteinLeft > 0 ? `${num(f.proteinLeft)} g short of ${num(f.targetProtein)} g` : `${num(f.targetProtein)} g target reached`}</p>
      </div>` : ''}
    </section>` : ''}

    <section class="card">
      ${fold('food-targets', f.hasTargets ? 'Change your daily targets' : 'Set your daily targets', `
        <form class="form" data-action="saveFoodTargets">
          ${field('Calories (kcal)', 'kcal', `required inputmode="decimal" value="${f.targetKcal || ''}"`)}
          ${field('Protein (g)', 'protein', `inputmode="decimal" value="${f.targetProtein || ''}"`, 'optional')}
          <button class="btn primary" type="submit">Save targets</button>
        </form>`, !f.hasTargets)}
    </section>

    <section class="card">
      <h2>Log food</h2>
      <form class="form" data-action="logFood">
        ${field('Food', 'food', 'required maxlength="60" placeholder="Nasi lemak"')}
        ${field('Calories (kcal)', 'kcal', 'required inputmode="decimal"')}
        ${field('Protein (g)', 'protein', 'inputmode="decimal"', 'optional')}
        ${select('Meal', 'meal', MEALS, 'Snack')}
        <div class="field tick"><label><input type="checkbox" name="remember"> Remember for quick add</label></div>
        <button class="btn primary" type="submit">Log</button>
      </form>
      ${f.foods.length ? `
      <h3 class="label">Quick add</h3>
      <div class="row">${select('Add to', 'quickMeal', MEALS, 'Snack')}</div>
      <div class="quick">
        ${f.foods.map((q) => `
          <button type="button" data-action="quickAddFood" data-id="${q.id}">
            <strong>${esc(q.name)}</strong><span>${num(q.kcal)} kcal · ${num(q.protein)} g protein</span>
          </button>`).join('')}
      </div>
      ${fold('manage-foods', 'Change the quick-add list', `
        <ul class="list">
          ${f.foods.map((q) => `<li><span>${esc(q.name)} <span class="dim">· ${num(q.kcal)} kcal</span></span>
            <span class="end">${remove('forgetFood', `data-id="${q.id}"`, `Remove ${q.name} from quick add`)}</span></li>`).join('')}
        </ul>
        <p class="note">Removing a food here does not change anything you already logged.</p>`)}` : ''}
    </section>

    <section class="card">
      <h2>Logged ${when}</h2>
      ${f.log.length === 0 ? `<p class="note">Nothing logged ${when}.</p>` : `<ul class="list">
        ${f.log.map((e) => `
          <li><span><strong>${esc(e.food)}</strong> <span class="dim">· ${esc(e.meal)}</span></span>
          <span class="end">${num(e.kcal)} kcal <span class="dim">· ${num(e.protein)} g</span> ${remove('deleteFood', `data-id="${e.id}"`, `Remove ${e.food}`)}</span></li>`).join('')}
      </ul>`}
    </section>`;
}

// ================= health =================

export function healthView(state) {
  const h = state.views.health ?? state.overview.health;
  const isCurrent = !state.views.health;
  const when = isCurrent ? 'today' : `on ${dayText(h.date)}`;
  const clock = (minutes) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
  const stepsMax = Math.max(10000, h.stepTarget, ...h.week.map((d) => d.steps ?? 0));
  const sleepMax = Math.max(540, h.sleepTargetMinutes, ...h.week.map((d) => d.sleepMinutes ?? 0));
  return `
    ${pageHead('Health', 'Type in your numbers for now. Reading them from your phone comes with the Android app.', mood('t-health', 'No mascot yet', 'not designed'))}
    ${periodNav('health', isCurrent ? `Today, ${dayText(h.date)}` : dayText(h.date), isCurrent, 'day')}

    <section class="grid stats" aria-label="Today">
      <div class="card">
        <div class="card-head"><div class="label">Steps ${when}</div>${h.steps === null || !h.stepTarget ? '' : chip(h.stepsOk ? { text: 'Target reached', tone: 'good' } : { text: 'Behind', tone: 'warn' })}</div>
        <div class="big">${h.steps === null ? '—' : num(h.steps)}</div>
        ${h.steps !== null && h.stepTarget ? bar(h.steps / h.stepTarget * 100) : ''}
        <p class="note">${h.steps === null ? (isCurrent ? 'Not logged yet' : 'Not logged') : !h.stepTarget ? 'No target set' : h.stepsOk ? 'Target reached' : `${num(h.stepsLeft)} short of your ${num(h.stepTarget)} target`}</p>
      </div>
      <div class="card">
        <div class="card-head"><div class="label">${isCurrent ? 'Sleep last night' : `Sleep before ${dayText(h.date)}`}</div>${h.sleepMinutes === null || !h.sleepTargetMinutes ? '' : chip(h.sleepShort > 0 ? { text: 'Under target', tone: 'warn' } : { text: 'Target reached', tone: 'good' })}</div>
        <div class="big">${h.sleepMinutes === null ? '—' : hm(h.sleepMinutes)}</div>
        <p class="note ${h.sleepShort > 0 ? 'warn' : ''}">${h.sleepMinutes === null ? (isCurrent ? 'Not logged yet' : 'Not logged') : !h.sleepTargetMinutes ? 'No target set' : h.sleepShort > 0 ? `${hm(h.sleepShort)} under your ${hm(h.sleepTargetMinutes)} target` : 'Target reached'}</p>
      </div>
      <div class="card">
        <div class="label">Resting heart rate</div>
        <div class="big">${h.restingHr === null ? '—' : `${h.restingHr} bpm`}</div>
        <p class="note">${h.restingHrWeek === null ? 'Not logged this week' : `This week's average is ${h.restingHrWeek} bpm`}</p>
      </div>
    </section>

    <section class="card">
      <h2>Numbers for ${isCurrent ? 'today' : dayText(h.date)}</h2>
      <form class="form" data-action="saveToday">
        ${field('Steps', 'steps', `inputmode="numeric" value="${h.steps ?? ''}"`)}
        ${field('Sleep: hours', 'sleepHours', `inputmode="numeric" value="${h.sleepMinutes === null ? '' : Math.floor(h.sleepMinutes / 60)}"`)}
        ${field('Sleep: minutes', 'sleepMinutes', `inputmode="numeric" value="${h.sleepMinutes === null ? '' : h.sleepMinutes % 60}"`)}
        ${field('Resting heart rate (bpm)', 'restingHr', `inputmode="numeric" value="${h.restingHr ?? ''}"`)}
        <button class="btn primary" type="submit">Save</button>
      </form>
    </section>

    <section class="grid wide">
      <div class="card">
        <h2>Steps this week</h2>
        ${columns(h.week.map((d) => ({ name: d.name, value: d.steps, today: d.today })), stepsMax, h.stepTarget, num, 'steps')}
        <div class="legend"><span><i></i>Earlier days</span><span><i class="today"></i>Today</span>${h.stepTarget ? `<span><i class="dash"></i>Your target: ${num(h.stepTarget)}</span>` : ''}</div>
      </div>
      <div class="card">
        <h2>Sleep this week</h2>
        ${columns(h.week.map((d) => ({ name: d.name, value: d.sleepMinutes, today: d.today })), sleepMax, h.sleepTargetMinutes, clock, 'hours')}
        <div class="legend"><span><i></i>Earlier nights</span><span><i class="today"></i>Last night</span>${h.sleepTargetMinutes ? `<span><i class="dash"></i>Your target: ${clock(h.sleepTargetMinutes)}</span>` : ''}</div>
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <h2>Workouts: ${h.workouts.done}${h.workoutTarget ? ` of ${h.workoutTarget}` : ''} this week</h2>
        ${h.workoutTarget ? chip(h.workouts.done >= h.workoutTarget ? { text: 'Target reached', tone: 'good' } : { text: `${h.workoutTarget - h.workouts.done} to go`, tone: '' }) : ''}
      </div>
      ${h.workouts.list.length === 0 ? '<p class="note">No workouts logged this week.</p>' : `<ul class="list">
        ${h.workouts.list.map((w) => `<li><span>${esc(w.name)} <span class="dim">· ${esc(dayText(w.date))}</span></span>
          <span class="end">${remove('deleteWorkout', `data-id="${w.id}"`, `Remove ${w.name}`)}</span></li>`).join('')}
      </ul>`}
      <form class="form" data-action="addWorkout">
        ${field('Workout', 'name', 'required maxlength="60" placeholder="Push day"')}
        <button class="btn primary" type="submit">Add ${isCurrent ? 'today' : `on ${dayText(h.date)}`}</button>
      </form>
    </section>

    <section class="card">
      ${fold('health-targets', h.stepTarget || h.sleepTargetMinutes || h.workoutTarget ? 'Change your targets' : 'Set your targets', `
        <form class="form" data-action="saveHealthTargets">
          ${field('Steps a day', 'steps', `inputmode="numeric" value="${h.stepTarget || ''}"`)}
          ${field('Sleep a night (hours)', 'sleepHours', `inputmode="decimal" value="${h.sleepTargetMinutes ? plain(h.sleepTargetMinutes / 60) : ''}"`)}
          ${field('Workouts a week', 'workouts', `inputmode="numeric" value="${h.workoutTarget || ''}"`)}
          <button class="btn primary" type="submit">Save targets</button>
        </form>`, !(h.stepTarget || h.sleepTargetMinutes || h.workoutTarget))}
    </section>`;
}
