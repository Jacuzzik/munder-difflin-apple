// The Appearance panel's font library: bundled, licensed, and wired end to end.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const LIB = path.join(root, 'src/renderer/src/assets/fonts/library');
const CSS = fs.readFileSync(path.join(root, 'src/renderer/src/design/fonts-library.css'), 'utf8');
const TS = fs.readFileSync(path.join(root, 'src/renderer/src/design/fontLibrary.ts'), 'utf8');
const files = fs.readdirSync(LIB).filter((f) => f.endsWith('.woff2'));

test('every library face is a real woff2 file', () => {
  assert.ok(files.length >= 30, `only ${files.length} faces`);
  for (const f of files) {
    const buf = fs.readFileSync(path.join(LIB, f));
    assert.equal(buf.subarray(0, 4).toString('latin1'), 'wOF2', `${f} is not woff2`);
  }
});

test('the library stays a latin-only size (no CJK face slipped in)', () => {
  const total = files.reduce((n, f) => n + fs.statSync(path.join(LIB, f)).size, 0);
  assert.ok(total < 1.5 * 1024 * 1024, `font library is ${total}b, over the 1.5MB budget`);
});

test('every face is attributed and the OFL text ships with them', () => {
  const lic = fs.readFileSync(path.join(LIB, 'LICENSE.txt'), 'utf8');
  assert.match(lic, /SIL OPEN FONT LICENSE Version 1\.1/);
  for (const f of files) assert.ok(lic.includes(f), `${f} has no attribution`);
});

test('@font-face rules point only at bundled files that exist', () => {
  assert.doesNotMatch(CSS.replace(/\/\*[\s\S]*?\*\//g, ''), /https?:/);
  const urls = [...CSS.matchAll(/url\('\.\.\/assets\/fonts\/library\/([^']+)'\)/g)].map((m) => m[1]);
  assert.equal(urls.length, files.length, 'one @font-face per file');
  for (const u of urls) assert.ok(files.includes(u), `@font-face points at missing ${u}`);
});

test('every pairing names fonts that exist in the registry', () => {
  const ids = new Set([...TS.matchAll(/\{ id: '([^']+)', label:/g)].map((m) => m[1]));
  const pairs = [...TS.matchAll(/heading: '([^']+)',\s+body: '([^']+)'/g)];
  assert.ok(pairs.length >= 10, 'pairings list missing');
  for (const [, h, b] of pairs) {
    assert.ok(ids.has(h), `pairing heading ${h} is not a font`);
    assert.ok(ids.has(b), `pairing body ${b} is not a font`);
  }
});
