import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { normalizeEvent } from '../js/core/schema.js';

const root = fileURLToPath(new URL('..', import.meta.url));

export function fixtureNames() {
  return readdirSync(`${root}fixtures/events`).filter((f) => f.endsWith('.json')).sort();
}

export function loadFixture(name, opts = { confirmed: true }) {
  const file = name.endsWith('.json') ? name : `${name}.json`;
  return normalizeEvent(JSON.parse(readFileSync(`${root}fixtures/events/${file}`, 'utf8')), { now: '2026-06-01T00:00:00+09:00', ...opts });
}

export function rawFixture(name) {
  const text = readFileSync(`${root}fixtures/raw/${name}.txt`, 'utf8');
  return { files: [{ name: `${name}.txt`, type: 'text/plain', pages: [{ page: 1, text }] }] };
}

export function parse(html) {
  const doc = html.trimStart().startsWith('<!doctype') ? html : `<!doctype html><html lang="ja"><body>${html}</body></html>`;
  return parseHTML(doc).document;
}
