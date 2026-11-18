// The AI helper. It talks to Google's Gemini API.
//
// Three rules:
//   1. The API key stays on the backend. It is read from the environment and is
//      never sent to the browser, never logged and never stored in the repository.
//   2. Only a short summary is sent to the AI, not the stored records.
//   3. The AI never changes data. What it reads from a screenshot is shown to
//      the user, who decides what is saved.
//
// With no key set, the app still works. The AI features answer with a clear
// message that explains how to turn them on.

import { HttpError } from './http.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export function createGemini({ apiKey, model = 'gemini-2.5-flash', fetchImpl = fetch }) {
  const configured = Boolean(apiKey);

  async function ask(parts, { json = false } = {}) {
    if (!configured) {
      throw new HttpError(503, 'ai_not_configured',
        'The AI helper is not set up yet. Add a Gemini API key to turn it on: see docs/handoff/gemini-setup.md.');
    }
    let response;
    try {
      response = await fetchImpl(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024, ...(json ? { responseMimeType: 'application/json' } : {}) }
        }),
        signal: AbortSignal.timeout(30000)
      });
    } catch {
      throw new HttpError(502, 'ai_unreachable', 'The AI helper could not be reached. Check the internet connection and try again.');
    }
    if (response.status === 429) throw new HttpError(429, 'ai_limit', 'The free daily limit of the AI helper is used up. Try again later.');
    if (!response.ok) throw new HttpError(502, 'ai_failed', `The AI helper answered with an error (${response.status}).`);
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new HttpError(502, 'ai_empty', 'The AI helper gave no answer. Try again.');
    return text;
  }

  return {
    configured,
    model,

    // A short study plan. `summary` is a small object made by the caller: unit codes, targets and verdicts only.
    async plan(summary) {
      const prompt =
        'You are a calm, practical study planner for a university student. ' +
        'Below is a summary of their units this semester as JSON. ' +
        'Write a short plan to help them reach their targets. Rules: plain English, short sentences, ' +
        'at most 6 bullet points, each starting with the unit code it is about. ' +
        'Be honest when a target is out of reach and suggest a new target. Do not invent facts about the units.\n\n' +
        JSON.stringify(summary);
      return ask([{ text: prompt }]);
    },

    // Reads food from a photo of a meal or a nutrition label. Returns [{ food, kcal, protein }] for the user to check.
    async readMeal(base64, mimeType) {
      const prompt =
        'This picture shows food, a meal, a menu item or a nutrition label. ' +
        'Return a JSON array. Each item has: "food" (a short name), "kcal" (calories for the portion shown, as a number) ' +
        'and "protein" (grams of protein for that portion, as a number, or null if you cannot tell). ' +
        'If it is a nutrition label, use the numbers printed on it. If it is a photo, estimate a usual portion. ' +
        'At most 8 items. Do not add anything that is not in the picture.';
      const text = await ask([{ text: prompt }, { inlineData: { mimeType, data: base64 } }], { json: true });
      let items;
      try { items = JSON.parse(text); } catch { items = null; }
      if (!Array.isArray(items)) throw new HttpError(502, 'ai_unreadable', 'The AI helper could not read any food from that picture.');
      const amount = (value, max) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? Math.round(value) : null);
      return items
        .filter((item) => item && typeof item.food === 'string' && item.food.trim() !== '' && amount(item.kcal, 5000) !== null)
        .slice(0, 8)
        .map((item) => ({ food: item.food.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60), kcal: amount(item.kcal, 5000), protein: amount(item.protein, 500) ?? 0 }));
    },

    // Reads assessments and marks from a picture. Returns [{ name, weight, score, max }].
    async readScreenshot(base64, mimeType) {
      const prompt =
        'This picture shows a university unit\'s assessments and marks. ' +
        'Return a JSON array. Each item has: "name" (text), "weight" (percent of the unit as a number, or null if not shown), ' +
        '"score" (marks received as a number, or null if not marked yet) and "max" (marks available as a number, or null). ' +
        'Only include what you can read in the picture. Do not guess missing numbers.';
      const text = await ask([{ text: prompt }, { inlineData: { mimeType, data: base64 } }], { json: true });
      let items;
      try { items = JSON.parse(text); } catch { items = null; }
      if (!Array.isArray(items)) throw new HttpError(502, 'ai_unreadable', 'The AI helper could not read assessments from that picture.');
      const numberOrNull = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
      return items
        .filter((item) => item && typeof item.name === 'string' && item.name.trim() !== '')
        .slice(0, 30)
        .map((item) => ({
          name: item.name.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 80),
          weight: numberOrNull(item.weight), score: numberOrNull(item.score), max: numberOrNull(item.max)
        }));
    }
  };
}
