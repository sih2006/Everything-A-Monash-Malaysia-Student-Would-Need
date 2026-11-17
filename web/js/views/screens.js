// The View: one function per screen. Each takes the app state and returns HTML.
//
// A screen decides nothing. It shows what the presenters prepared, and marks
// buttons and forms with data-action="..." so app.js can call the right command.

import { dayText, esc, f2, hm, lastDayOf, num, plain, rm } from '../format.js';
import { RESULT_ORDERS, UNIT_ORDERS, presentGrades, presentHome, presentSpending } from '../viewmodels/present.js';
import { ICON, artSpace, bar, chip, columns, emptyCard, field, fold, mood, pageHead, periodNav, select, trendChart, weightChart } from './parts.js';

const MEALS = [['Breakfast', 'Breakfast'], ['Lunch', 'Lunch'], ['Dinner', 'Dinner'], ['Snack', 'Snack']];
const WORKOUT_KINDS = [['gym', 'Gym'], ['run', 'Run'], ['walk', 'Walk'], ['cycle', 'Cycle'], ['swim', 'Swim'], ['sport', 'Sport'], ['other', 'Other']];
const KIND_NAME = Object.fromEntries(WORKOUT_KINDS);
const litres = (ml) => `${plain(Math.round(ml / 100) / 10)} L`;
const signed = (kg) => `${kg > 0 ? '+' : kg < 0 ? '−' : ''}${plain(Math.abs(kg))} kg`;
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
        <a class="petal ${tints[c.tab]}" href="#${c.tab}" aria-label="${esc(`${c.title}: ${c.big}, ${c.line}. ${c.chip.text}.`)}">
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
        ${u.passFail ? chip({ text: 'Pass or fail only', tone: '' }) : `<span class="note">Target: <strong>${esc(u.targetText)}</strong></span>`}
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
          <div class="field tick"><label><input type="checkbox" name="passFail" ${u.passFail ? 'checked' : ''}> Pass or fail only (does not count in GPA, CGPA or WAM)</label></div>
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
  const g = presentGrades(report, state.hidden, state.unitOrder, state.resultOrder, state.predicted, state.predictions);
  const predicting = Boolean(state.predicted);
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
        <div class="card"><div class="label">${esc(s.label)}</div><div class="big">${esc(s.value)}</div><p class="note" data-stat="${s.key}">${esc(s.note)}</p></div>`).join('')}
    </section>
    <p class="note" data-predict-bar ${predicting ? '' : 'hidden'}>Using the marks you predicted with the sliders. Nothing is saved.
      <button type="button" class="link" data-action="clearPredictions">Clear predictions</button></p>
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
      ${fold('term-dates', g.termDates ? `Semester dates: ${dayText(g.termDates.start)} to ${dayText(g.termDates.end)}` : 'Set the semester dates', `
        <form class="form" data-action="saveTermDates">
          ${field('First day', 'start', `type="date" required value="${g.termDates?.start ?? ''}"`)}
          ${field('Last day, exams included', 'end', `type="date" required value="${g.termDates?.end ?? ''}"`)}
          <button class="btn primary" type="submit">Save dates</button>
        </form>
        <p class="note">With these, the map shows how much of the semester has gone next to how much of each unit is marked.</p>`)}
    </section>`}

    ${g.trend.length >= 2 ? `<section class="card"><h2>CGPA by semester</h2>${trendChart(g.trend, g.trendGoal, f2)}</section>` : ''}

    ${g.units.length > 1 ? `<div class="row sorter"><label>Order the units
      <select data-choose="unitOrder">${UNIT_ORDERS.map(([value, text]) => `<option value="${value}" ${value === state.unitOrder ? 'selected' : ''}>${text}</option>`).join('')}</select></label></div>` : ''}
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
      ${g.terms.length && !state.hidden ? `<div class="row sorter"><label>Order the finished units
        <select data-choose="resultOrder">${RESULT_ORDERS.map(([value, text]) => `<option value="${value}" ${value === g.resultOrder ? 'selected' : ''}>${text}</option>`).join('')}</select></label></div>` : ''}
      ${g.flatResults ? `<ul class="list">
        ${g.flatResults.map((u) => `<li><span>${esc(u.code)} <span class="dim">· ${esc(u.name)} · ${esc(u.term)}</span></span>
          <span class="end">${esc(u.result)} ${remove('deleteResult', `data-id="${u.id}" data-confirm="Remove ${esc(u.code)} from your finished units?"`, `Remove ${u.code}`)}</span></li>`).join('')}
      </ul>` : g.terms.length === 0 ? '<p class="note">None yet. Add your past results so your CGPA, GPA and WAM include them.</p>' : g.terms.map((t) => `
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

// ================= money accounts =================

const KIND_NAMES = { bank: 'Bank', ewallet: 'E-wallet', investment: 'Investment', cash: 'Cash' };
const MOVE_WORDS = { set: 'Set to', in: 'In', out: 'Out' };

function accountCard(a) {
  return `
    <article class="card account">
      <div class="card-head"><h2>${esc(a.name)}</h2>${chip({ text: KIND_NAMES[a.kind] ?? a.kind, tone: '' })}</div>
      <div class="big">${rm(a.balance)}</div>
      <p class="note">${a.lastSet ? `Last set by hand on ${esc(dayText(a.lastSet))}` : 'Never set by hand'}</p>
      ${a.recent.length ? `<ul class="list">
        ${a.recent.map((m) => `<li><span>${esc(m.note || MOVE_WORDS[m.kind])} <span class="dim">· ${esc(dayText(m.date))}</span></span>
          <span class="end">${m.kind === 'set' ? `= ${rm(m.amount)}` : `${m.kind === 'in' ? '+' : '−'} ${rm(m.amount)}`}
          ${m.fromSpending ? '' : `<button type="button" class="link danger" data-action="deleteAccountMove" data-id="${m.id}" aria-label="Remove this entry">Remove</button>`}</span></li>`).join('')}
      </ul>` : ''}
      ${fold(`acc-set-${a.id}`, 'Set the balance by hand', `
        <form class="form" data-action="setBalance" data-id="${a.id}">
          ${field('What it holds now (RM)', 'balance', `required inputmode="decimal" value="${a.balance}"`)}
          <button class="btn primary" type="submit">Save balance</button>
        </form>
        <p class="note">Use this when the app and your real account do not match. It replaces the worked-out balance from now on.</p>`)}
      ${fold(`acc-in-${a.id}`, 'Add money in', `
        <form class="form" data-action="addIncome" data-id="${a.id}">
          ${field('Amount (RM)', 'amount', 'required inputmode="decimal"')}
          ${field('From', 'note', 'maxlength="60" placeholder="Allowance, part-time job"', 'optional')}
          <button class="btn primary" type="submit">Add</button>
        </form>`)}
      <button type="button" class="link danger" data-action="deleteAccount" data-id="${a.id}" data-confirm="Remove ${esc(a.name)} and its history? Spending paid from it stays.">Remove account</button>
    </article>`;
}

// The money in all your accounts. Always as it is now, whichever month the budget below shows.
function moneySection(money) {
  const accounts = money.accounts;
  const options = accounts.map((a) => [String(a.id), a.name]);
  return `
    <section class="banner money ${money.total < 0 ? 'warn' : 'good'}">
      <h2>Your money: ${rm(money.total)}</h2>
      <p>${accounts.length === 0 ? 'Add your accounts, such as a bank, an e-wallet and an investing account, to see your total here.'
        : `${rm(money.spendable)} to spend${money.invested ? ` and ${rm(money.invested)} invested` : ''}, across ${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'}.`}</p>
    </section>
    ${accounts.length ? `<section class="grid" aria-label="Accounts">${accounts.map((a) => accountCard(a)).join('')}</section>` : ''}
    <section class="card">
      ${fold('add-account', 'Add an account', `
        <form class="form" data-action="addAccount">
          ${field('Name', 'name', 'required maxlength="30" placeholder="Maybank"')}
          ${select('Kind', 'kind', Object.entries(KIND_NAMES))}
          ${field('What it holds now (RM)', 'balance', 'inputmode="decimal"', 'optional')}
          <button class="btn primary" type="submit">Add</button>
        </form>`, accounts.length === 0)}
      ${accounts.length > 1 ? fold('transfer', 'Move money between accounts', `
        <form class="form" data-action="transfer">
          ${select('From', 'from', options, options[0][0])}
          ${select('To', 'to', options, options[1][0])}
          ${field('Amount (RM)', 'amount', 'required inputmode="decimal"')}
          <button class="btn primary" type="submit">Move</button>
        </form>
        <p class="note">For example topping up Touch 'n Go from your bank. It is not spending, so the budget does not change.</p>`) : ''}
    </section>`;
}

// ================= budget =================

// Money in during the month shown, where it came from, and what is left after spending.
function incomeSection(b, day) {
  const income = b.income ?? { total: 0, net: 0, sources: [] };
  const accounts = b.money?.accounts ?? [];
  return `
    <section class="card">
      <div class="card-head"><h2>Money in: ${rm(income.total)}</h2>${income.total ? chip(income.net >= 0 ? { text: `${rm(income.net)} left after spending`, tone: 'good' } : { text: `${rm(-income.net)} more out than in`, tone: 'warn' }) : ''}</div>
      ${income.sources.length ? `<ul class="list">${income.sources.map((s) => `<li><span>${esc(s.source)}</span><span class="end">${rm(s.amount)}</span></li>`).join('')}</ul>`
        : '<p class="note">Nothing came in this month yet. Moving money between your own accounts does not count.</p>'}
      ${accounts.length ? fold('money-in', 'Add money in', `
        <form class="form" data-action="addMoneyIn">
          ${field('Amount (RM)', 'amount', 'required inputmode="decimal"')}
          ${field('From', 'note', 'maxlength="60" placeholder="Money from home, part-time job"', 'optional')}
          ${select('Into', 'account', accounts.map((a) => [String(a.id), a.name]))}
          ${field('Date', 'date', `type="date" value="${day}"`)}
          <button class="btn primary" type="submit">Add</button>
        </form>`) : '<p class="note">Add an account above first, so the money has somewhere to go.</p>'}
    </section>`;
}

export function budgetView(state) {
  const b = state.views.budget ?? state.overview.budget;
  const isCurrent = !state.views.budget;
  const today = state.overview.today;
  // New spending goes on today, or on the last day of a past month being looked at. The user can change it.
  const spendDay = isCurrent ? today : lastDayOf(b.month);
  const head = pageHead('Budget', isCurrent ? `Day ${b.day} of ${b.days}.${b.hasLimit ? ` Your monthly limit is ${rm(b.limit)}.` : ''}` : `A past month.${b.hasLimit ? ` The limit is ${rm(b.limit)}.` : ''}`, mood('t-budget', 'Crab', b.mood));
  return `
    ${head}
    ${moneySection(b.money)}
    ${periodNav('budget', b.monthName, isCurrent, 'month')}
    ${incomeSection(b, spendDay)}
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
          ${b.money.accounts.length ? select('Paid from', 'accountId', [['', 'Not from an account'], ...b.money.accounts.map((a) => [String(a.id), a.name])]) : ''}
          ${field('Day', 'date', `type="date" required value="${spendDay}" min="${b.month}-01" max="${spendDay}"`)}
          <button class="btn primary" type="submit">Add</button>
        </form>`}
        <h2>Spending in ${esc(b.monthName.split(' ')[0])}</h2>
        ${spendingList(b, state)}
      </div>
    </section>`;
}

// The spending list with its category filter. Kept apart so the budget screen above stays readable.
function spendingList(b, state) {
  if (b.recent.length === 0) return `<p class="note">Nothing recorded in ${esc(b.monthName)}.</p>`;
  const chosen = b.categories.some((c) => c.name === state.spendingCategory) ? state.spendingCategory : 'all';
  const s = presentSpending(b.recent, chosen, state.showAllSpending);
  return `
    <div class="row sorter"><label>Show
      <select data-choose="spendingCategory">
        <option value="all" ${chosen === 'all' ? 'selected' : ''}>All categories</option>
        ${b.categories.map((c) => `<option value="${esc(c.name)}" ${c.name === chosen ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
      </select></label>
      <span class="note">${s.count} ${s.count === 1 ? 'entry' : 'entries'} · ${rm(s.total)}</span></div>
    ${s.count === 0 ? '<p class="note">Nothing in this category this month.</p>' : `<ul class="list">
          ${s.rows.map((x) => `
            <li><span>${esc(x.what)} <span class="dim">· ${esc(x.category)} · ${esc(dayText(x.date))}${x.account ? ` · ${esc(x.account)}` : ''}</span></span>
            <span class="end">${rm(x.amount)} ${remove('deleteSpending', `data-id="${x.id}"`, `Remove ${x.what}`)}</span></li>`).join('')}
        </ul>`}
    ${s.hidden > 0 ? `<button type="button" class="link" data-action="toggleAllSpending">Show all ${s.count}</button>`
      : state.showAllSpending && s.count > 10 ? '<button type="button" class="link" data-action="toggleAllSpending">Show the newest 10</button>' : ''}`;
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
      <div class="card">
        <div class="card-head"><div class="label">Water ${when}</div>${h.waterMl === null || !h.waterTarget ? '' : chip(h.waterLeft === 0 ? { text: 'Target reached', tone: 'good' } : { text: `${litres(h.waterLeft)} to go`, tone: '' })}</div>
        <div class="big">${h.waterMl === null ? '—' : litres(h.waterMl)}</div>
        ${h.waterMl !== null && h.waterTarget ? bar(h.waterMl / h.waterTarget * 100) : ''}
        <div class="row">
          <button type="button" class="btn quiet" data-action="addWater" data-ml="250">+ 250 ml</button>
          <button type="button" class="btn quiet" data-action="addWater" data-ml="500">+ 500 ml</button>
        </div>
      </div>
      <div class="card">
        <div class="label">Body weight</div>
        <div class="big">${h.weight.latest === null ? '—' : `${plain(h.weight.latest.kg)} kg`}</div>
        ${h.weight.bmi === null ? '' : `<p class="note">BMI ${plain(h.weight.bmi)} at ${h.weight.heightCm} cm</p>`}
        <p class="note">${h.weight.latest === null ? 'Not logged yet'
          : [h.weight.latest.date === h.date ? 'Weighed this day' : `Last weighed ${dayText(h.weight.latest.date)}`,
             h.weight.change30 === null ? '' : `${signed(h.weight.change30)} in 30 days`,
             h.weight.toGoal === null ? '' : h.weight.toGoal === 0 ? 'At your goal' : `${plain(Math.abs(h.weight.toGoal))} kg ${h.weight.toGoal > 0 ? 'above' : 'below'} your goal`].filter(Boolean).join(' · ')}</p>
      </div>
    </section>

    <section class="card">
      <h2>Numbers for ${isCurrent ? 'today' : dayText(h.date)}</h2>
      <form class="form" data-action="saveToday">
        ${field('Steps', 'steps', `inputmode="numeric" value="${h.steps ?? ''}"`)}
        ${field('Sleep: hours', 'sleepHours', `inputmode="numeric" value="${h.sleepMinutes === null ? '' : Math.floor(h.sleepMinutes / 60)}"`)}
        ${field('Sleep: minutes', 'sleepMinutes', `inputmode="numeric" value="${h.sleepMinutes === null ? '' : h.sleepMinutes % 60}"`)}
        ${field('Resting heart rate (bpm)', 'restingHr', `inputmode="numeric" value="${h.restingHr ?? ''}"`)}
        ${field('Body weight (kg)', 'weightKg', `inputmode="decimal" value="${h.weightKg ?? ''}"`)}
        ${field('Water (ml)', 'waterMl', `inputmode="numeric" value="${h.waterMl ?? ''}"`)}
        <button class="btn primary" type="submit">Save</button>
      </form>
    </section>

    <section class="grid wide">
      <div class="card">
        <h2>Steps this week</h2>
        ${h.stepsAverage === null ? '' : `<p class="note">Average ${num(h.stepsAverage)} a day on the days logged</p>`}
        ${columns(h.week.map((d) => ({ name: d.name, value: d.steps, today: d.today })), stepsMax, h.stepTarget, num, 'steps')}
        <div class="legend"><span><i></i>Earlier days</span><span><i class="today"></i>Today</span>${h.stepTarget ? `<span><i class="dash"></i>Your target: ${num(h.stepTarget)}</span>` : ''}</div>
      </div>
      <div class="card">
        <h2>Sleep this week</h2>
        ${h.sleepAverage === null ? '' : `<p class="note">Average ${hm(h.sleepAverage)} a night</p>`}
        ${columns(h.week.map((d) => ({ name: d.name, value: d.sleepMinutes, today: d.today })), sleepMax, h.sleepTargetMinutes, clock, 'hours')}
        <div class="legend"><span><i></i>Earlier nights</span><span><i class="today"></i>Last night</span>${h.sleepTargetMinutes ? `<span><i class="dash"></i>Your target: ${clock(h.sleepTargetMinutes)}</span>` : ''}</div>
      </div>
    </section>

    ${h.weight.points.length >= 2 ? `<section class="card"><h2>Body weight</h2>${weightChart(h.weight.points, h.weight.goalKg)}</section>` : ''}

    <section class="card">
      <div class="card-head">
        <h2>Workouts: ${h.workouts.done}${h.workoutTarget ? ` of ${h.workoutTarget}` : ''} this week</h2>
        ${h.workoutTarget ? chip(h.workouts.done >= h.workoutTarget ? { text: 'Target reached', tone: 'good' } : { text: `${h.workoutTarget - h.workouts.done} to go`, tone: '' }) : ''}
      </div>
      ${h.workouts.done ? `<p class="note">${hm(h.workouts.minutes)} in all${h.workouts.kinds.length ? ': ' + h.workouts.kinds.map((k) => `${k.count} ${KIND_NAME[k.kind].toLowerCase()}`).join(', ') : ''}</p>` : ''}
      ${h.workouts.list.length === 0 ? '<p class="note">No workouts logged this week.</p>' : `<div class="workouts">
        ${h.workouts.list.map((w) => `<article class="workout">
          <div class="card-head"><h3>${esc(w.name)} <span class="dim">· ${esc(dayText(w.date))}${w.minutes ? ` · ${w.minutes} min` : ''}</span></h3>
            <span class="end">${chip({ text: KIND_NAME[w.kind] ?? 'Other', tone: '' })} ${remove('deleteWorkout', `data-id="${w.id}" data-confirm="Remove ${esc(w.name)} and its exercises?"`, `Remove ${w.name}`)}</span></div>
          ${w.exercises.length ? `<ul class="list">
            ${w.exercises.map((x) => `<li><span>${esc(x.name)}</span>
              <span class="end">${x.sets} × ${x.reps}${x.weightKg === null ? '' : ` at ${plain(x.weightKg)} kg`} ${remove('deleteExercise', `data-id="${x.id}"`, `Remove ${x.name}`)}</span></li>`).join('')}
          </ul>` : ''}
          ${fold(`exercise-${w.id}`, 'Add an exercise', `
            <form class="form" data-action="addExercise" data-id="${w.id}">
              ${field('Exercise', 'name', 'required maxlength="60" placeholder="Bench press"')}
              ${field('Sets', 'sets', 'required inputmode="numeric"')}
              ${field('Reps', 'reps', 'required inputmode="numeric"')}
              ${field('Weight (kg)', 'weightKg', 'inputmode="decimal"', 'empty for body weight')}
              <button class="btn primary" type="submit">Add exercise</button>
            </form>`)}
        </article>`).join('')}
      </div>`}
      <form class="form" data-action="addWorkout">
        ${field('Workout', 'name', 'required maxlength="60" placeholder="Push day"')}
        ${select('Kind', 'kind', WORKOUT_KINDS, 'gym')}
        ${field('Length (minutes)', 'minutes', 'inputmode="numeric"')}
        <button class="btn primary" type="submit">Add ${isCurrent ? 'today' : `on ${dayText(h.date)}`}</button>
      </form>
    </section>

    ${h.bests.length ? `<section class="card">
      <h2>Best lifts</h2>
      <p class="note">The heaviest weight for each exercise, up to ${isCurrent ? 'today' : dayText(h.date)}.</p>
      <ul class="list">${h.bests.map((b) => `<li><span>${esc(b.name)} <span class="dim">· done ${b.times} ${b.times === 1 ? 'time' : 'times'}</span></span><span class="end">${plain(b.weightKg)} kg</span></li>`).join('')}</ul>
    </section>` : ''}

    <section class="card">
      ${fold('health-targets', h.stepTarget || h.sleepTargetMinutes || h.workoutTarget ? 'Change your targets' : 'Set your targets', `
        <form class="form" data-action="saveHealthTargets">
          ${field('Steps a day', 'steps', `inputmode="numeric" value="${h.stepTarget || ''}"`)}
          ${field('Sleep a night (hours)', 'sleepHours', `inputmode="decimal" value="${h.sleepTargetMinutes ? plain(h.sleepTargetMinutes / 60) : ''}"`)}
          ${field('Workouts a week', 'workouts', `inputmode="numeric" value="${h.workoutTarget || ''}"`)}
          ${field('Water a day (litres)', 'waterLitres', `inputmode="decimal" value="${h.waterTarget ? plain(h.waterTarget / 1000) : ''}"`)}
          ${field('Goal weight (kg)', 'weightGoal', `inputmode="decimal" value="${h.weight.goalKg ?? ''}"`, 'optional, your own choice')}
          ${field('Height (cm)', 'heightCm', `inputmode="numeric" value="${h.weight.heightCm ?? ''}"`, 'for BMI')}
          <button class="btn primary" type="submit">Save targets</button>
        </form>`, !(h.stepTarget || h.sleepTargetMinutes || h.workoutTarget))}
    </section>`;
}
