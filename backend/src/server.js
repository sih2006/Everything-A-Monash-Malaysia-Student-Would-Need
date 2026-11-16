// Starts the backend: `npm start` in the backend folder, or `node backend/src/server.js`.
// This is the one place where the real parts are put together (the "composition root"):
// the real database, the real engine and the real AI helper are created here and handed to the app.

import http from 'node:http';

import { createApp } from './api.js';
import { config } from './config.js';
import { openDatabase } from './db.js';
import { createEngine } from './engine.js';
import { createGemini } from './gemini.js';
import { createStore } from './store.js';

const db = openDatabase(config.dataFile);
const engine = createEngine(config.enginePath);
const app = createApp({
  db,
  store: createStore(db),
  engine,
  gemini: createGemini({ apiKey: config.geminiKey, model: config.geminiModel }),
  webDir: config.webDir,
  token: config.token,
  log: (entry) => console.log(JSON.stringify({ time: new Date().toISOString(), ...entry }))
});

const server = http.createServer(app);
server.listen(config.port, config.host, () => {
  console.log(`Student companion is running at http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`);
  console.log(`  data file:    ${config.dataFile}`);
  console.log(`  grade engine: ${engine.available() ? 'ready' : 'NOT BUILT (grades will not load). Build it: cmake -S core -B core/build && cmake --build core/build'}`);
  console.log(`  AI helper:    ${config.geminiKey ? `on (${config.geminiModel})` : 'off (no GEMINI_API_KEY). See docs/handoff/gemini-setup.md'}`);
  if (config.host !== '127.0.0.1' && !config.token) {
    console.log('  WARNING: the app can be reached from other devices and has no APP_TOKEN. Anyone on the network can read and change the data.');
  }
});

// Close the database cleanly when the program is stopped.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}
