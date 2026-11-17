// Settings for the backend. Every one can be changed with an environment
// variable, or with a line in the file `.env` at the top of the repository.
// `.env` is ignored by git, so secrets such as the Gemini key never get committed.
// The file `.env.example` lists every setting.

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

try {
  process.loadEnvFile(path.join(root, '.env'));
} catch {
  // No .env file: that is fine, the defaults below are used.
}

const env = process.env;
const dataFile = path.resolve(root, env.DATA_FILE ?? 'backend/data/app.db');
mkdirSync(path.dirname(dataFile), { recursive: true });

export const config = {
  root,
  // 127.0.0.1 means only this computer can reach the app. See docs/handoff before changing it.
  host: env.HOST ?? '127.0.0.1',
  port: Number(env.PORT ?? 8080),
  dataFile,
  webDir: path.resolve(root, env.WEB_DIR ?? 'web'),
  enginePath: path.resolve(root, env.TRACKER_ENGINE ?? `core/build/tracker${process.platform === 'win32' ? '.exe' : ''}`),
  geminiKey: env.GEMINI_API_KEY ?? '',
  geminiModel: env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  // When set, every API call must send this token. Needed as soon as the app is reachable from other devices.
  token: env.APP_TOKEN ?? ''
};
