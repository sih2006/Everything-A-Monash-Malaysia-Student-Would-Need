# Turning on the AI helper (Gemini)

The app works fully without this. The AI helper adds two things:

- **Study plan:** on the Grades screen, a short plan written from your targets and verdicts.
- **Read a screenshot:** in a unit, read assessments and marks from a picture. You check and correct them before anything is saved.

**Time needed:** about 5 minutes. **Cost:** free on Google's free tier.

## Before you start: what gets sent

| Feature | What is sent to Google | What is not sent |
|---|---|---|
| Study plan | Unit codes, target grades, your average so far, the mark needed, the verdicts, names and weights of assessments still to do | Unit names, your individual marks, anything about money, food or health |
| Read a screenshot | The picture you choose | Nothing else |

On the free tier, Google may use what you send to improve its products. If a screenshot shows your name or student number, crop it first.

## Steps

1. Open <https://aistudio.google.com> and sign in with a Google account.
2. Find **Get API key** (in the menu on the left) and choose **Create API key**. If it asks for a project, let it create a new one.
3. Copy the key. It is a long text that starts with `AIza`. Treat it like a password.
4. In the project folder, copy the file `.env.example` to a new file named `.env`.
5. Open `.env` and put the key after `GEMINI_API_KEY=`, with no spaces and no quotes:
   ```
   GEMINI_API_KEY=AIza...your key...
   ```
6. Stop the server if it is running (Ctrl+C), then start it again:
   ```
   node backend/src/server.js
   ```
   It should now print `AI helper:    on (gemini-2.5-flash)`.
7. Reload the app. On the Grades screen the plan card now has a **Write me a plan** button, and each unit's "Add an assessment" section has **Read screenshot**.

## If it does not work

| What you see | What it means | What to do |
|---|---|---|
| `AI helper: off` when the server starts | The key was not found | Check the file is named exactly `.env`, is in the top folder (next to `README.md`), and the line has no spaces around `=` |
| "The AI helper answered with an error (404)" | The model name is no longer offered | Model names change. Open AI Studio, see which "Flash" model is current, and set `GEMINI_MODEL=that-name` in `.env` |
| "The AI helper answered with an error (400)" or (403) | The key is wrong or was deleted | Create a new key and replace it in `.env` |
| "The free daily limit ... is used up" | You reached the free tier's limit | Wait until the next day |
| "could not be reached" | No internet from the laptop | Check the connection |

## Keeping the key safe

- `.env` is listed in `.gitignore`, so git will not commit it. Do not rename it and do not paste the key into any other file.
- The key stays on the backend. The browser never receives it. A test checks this (`backend/test/api.test.js`, "the key stays in the header").
- CI fails if a text that looks like a Google key is ever committed.
- If the key leaks (for example you pasted it into a chat), delete it in AI Studio and create a new one. That takes one minute and makes the old key useless.

## For an AI agent: how this part is built

- All Gemini code is in [backend/src/gemini.js](../../backend/src/gemini.js). It is the only file that knows the address and shape of Google's API.
- The two routes are `POST /api/advisor/plan` and `POST /api/import/screenshot` in [backend/src/api.js](../../backend/src/api.js). The summary that is sent is built there, in one place, so it is easy to see exactly what leaves the computer.
- To use a different AI service, write a file with the same two functions (`plan(summary)` and `readScreenshot(base64, mimeType)`) and a `configured` flag, and hand it to `createApp` in [backend/src/server.js](../../backend/src/server.js). Nothing else changes.
- These features have only been tested with a fake AI service. **They have not been run against the real Gemini API**, because no key was available when they were written. The first real run may need a small fix to the model name or the answer format.
