// The bridge to the C++ core.
//
// Every grade rule (grade bands, GPA, CGPA, WAM, possible, realistic, hurdles)
// lives in the C++ program `tracker`. The backend does not repeat any of it.
// To get the numbers, it writes the stored data as text, runs
// `tracker --engine`, and reads back one JSON report.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export class EngineMissing extends Error {}

// Tabs and line breaks split fields in the engine's text format, so they can never appear inside one.
const field = (value) => String(value ?? '').replace(/[\t\r\n]+/g, ' ');
const numberOrDash = (value) => (value === null || value === undefined ? '-' : String(value));

// Turns the stored academics data into the text the engine reads.
// The format is described in core/include/tracker/codec.hpp.
export function buildEngineText(state, questions = []) {
  const lines = ['tracker\t1'];
  if (state.currentTerm) lines.push(`term\t${field(state.currentTerm)}`);
  lines.push(`margin\t${state.margin}`);
  if (state.goal) lines.push(`goal\t${field(state.goal.measure)}\t${state.goal.value}\t${state.goal.totalCredits}`);
  for (const u of state.units) {
    lines.push(['unit', field(u.code), field(u.name), u.credit, numberOrDash(u.target), field(u.term)].join('\t'));
  }
  for (const a of state.assessments) {
    lines.push(['assess', field(a.unitCode), a.id, field(a.name), a.weight, numberOrDash(a.score), a.max, numberOrDash(a.hurdle)].join('\t'));
  }
  for (const r of state.results) {
    lines.push(['result', field(r.code), field(r.name), r.credit, r.mark, r.grade || '-', field(r.term)].join('\t'));
  }
  for (const q of questions) lines.push(`whatif\t${field(q.code)}\t${q.score}`);
  return lines.join('\n') + '\n';
}

export function createEngine(binaryPath) {
  return {
    path: binaryPath,
    available: () => existsSync(binaryPath),

    // Runs the engine and returns its report as an object.
    report(state, questions = []) {
      if (!existsSync(binaryPath)) {
        throw new EngineMissing(`The grade engine was not found at ${binaryPath}. Build it first: see the README.`);
      }
      const run = spawnSync(binaryPath, ['--engine'], {
        input: buildEngineText(state, questions),
        encoding: 'utf8',
        timeout: 10000,
        windowsHide: true
      });
      if (run.error) throw new Error(`The grade engine could not be started: ${run.error.message}`);
      if (run.status !== 0) throw new Error(`The grade engine stopped with code ${run.status}: ${run.stderr}`);
      return JSON.parse(run.stdout);
    }
  };
}
