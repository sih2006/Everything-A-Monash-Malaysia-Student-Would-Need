// A small web layer on top of Node's own http module: routes, JSON bodies,
// errors with a clear shape, input checks and static files.
// It is written by hand so the backend has no packages to install or to trust.

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

// An error that should reach the user. `status` is the HTTP status, `code` is a
// short machine-readable name, `message` is a plain sentence, `field` names the input at fault.
export class HttpError extends Error {
  constructor(status, code, message, field) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

// ---------- routes ----------

export function createRouter() {
  const routes = [];
  return {
    // `pattern` looks like "/api/units/:code". Each ":name" part becomes a parameter.
    add(method, pattern, handler) {
      const names = [];
      const source = pattern.replace(/:[a-zA-Z]+/g, (name) => {
        names.push(name.slice(1));
        return '([^/]+)';
      });
      routes.push({ method, regex: new RegExp(`^${source}$`), names, handler });
    },
    find(method, pathname) {
      let pathMatched = false;
      for (const route of routes) {
        const match = route.regex.exec(pathname);
        if (!match) continue;
        pathMatched = true;
        if (route.method !== method) continue;
        const params = {};
        route.names.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });
        return { handler: route.handler, params };
      }
      return pathMatched ? 'wrong-method' : null;
    }
  };
}

// ---------- reading and writing ----------

export async function readJson(req, limitBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) throw new HttpError(413, 'too_large', 'That is too much data for one request.');
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Error('not an object');
    return body;
  } catch {
    throw new HttpError(400, 'bad_json', 'The request body is not valid JSON.');
  }
}

// Headers that make the browser stricter. The page may only load its own files,
// plus the fonts from Google Fonts.
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
};

export function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(text), 'Cache-Control': 'no-store' });
  res.end(text);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
};

// Sends a file from the web folder. Returns false if there is no such file.
export async function sendStatic(webDir, pathname, res) {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.resolve(webDir, relative);
  // Never serve anything outside the web folder, whatever the address says.
  if (file !== path.resolve(webDir) && !file.startsWith(path.resolve(webDir) + path.sep)) return false;
  let info;
  try { info = await stat(file); } catch { return false; }
  if (!info.isFile()) return false;
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': 'no-cache'
  });
  createReadStream(file).pipe(res);
  return true;
}

// ---------- checking input ----------
// Input is checked once, here at the edge. Code further in can then trust it.

export const check = {
  // A piece of text: trimmed, with no control characters. Returns '' for a missing optional value.
  text(value, field, { max = 80, required = true } = {}) {
    if (value === undefined || value === null || value === '') {
      if (required) throw new HttpError(400, 'invalid', `${label(field)} cannot be empty.`, field);
      return '';
    }
    if (typeof value !== 'string') throw new HttpError(400, 'invalid', `${label(field)} must be text.`, field);
    const text = value.trim();
    if (required && text === '') throw new HttpError(400, 'invalid', `${label(field)} cannot be empty.`, field);
    if (/[\u0000-\u001f\u007f]/.test(text)) throw new HttpError(400, 'invalid', `${label(field)} cannot contain tabs or line breaks.`, field);
    if (text.length > max) throw new HttpError(400, 'invalid', `${label(field)} can be at most ${max} characters.`, field);
    return text;
  },
  // A number from `min` to `max`. With `nullable`, null is allowed and returned as null.
  number(value, field, { min = -Infinity, max = Infinity, nullable = false, whole = false } = {}) {
    if (value === null && nullable) return null;
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new HttpError(400, 'invalid', `${label(field)} must be a number.`, field);
    if (whole && !Number.isInteger(value)) throw new HttpError(400, 'invalid', `${label(field)} must be a whole number.`, field);
    if (value < min || value > max) throw new HttpError(400, 'invalid', `${label(field)} must be from ${min} to ${max}.`, field);
    return value;
  },
  id(text) {
    const id = Number(text);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, 'not_found', 'There is nothing at that address.');
    return id;
  }
};

// "targetKcal" -> "Target kcal", for messages.
function label(field) {
  const spaced = field.replace(/([A-Z])/g, ' $1').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
