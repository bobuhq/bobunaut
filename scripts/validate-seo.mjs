import assert from 'node:assert/strict';
import { readFile, readdir, lstat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, resolve, sep } from 'node:path';
import { pages, renderPage } from '../seo/site.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
assert.equal(git('branch', '--show-current'), 'seo-v1-safe');
assert.equal(git('diff', '--name-only', 'HEAD'), '', 'Existing tracked files changed');
const output = join(root, 'seo-preview');
const actual = [];
async function walk(directory) {
  assert(!(await lstat(directory)).isSymbolicLink(), 'Symlinks are prohibited');
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), 'Symlinks are prohibited');
    if (entry.isDirectory()) await walk(join(directory, entry.name));
    else actual.push(join(directory, entry.name).slice(output.length + 1));
  }
}
await walk(output);
assert.equal(pages.length, 4);
assert.equal(new Set(pages.map(page => page.slug)).size, 4);
for (const field of ['title', 'description', 'heading']) assert.equal(new Set(pages.map(page => page[field])).size, 4, `Duplicate ${field}`);
assert.deepEqual(actual.sort(), ['landing.css', ...pages.map(page => `${page.slug}/index.html`)].sort());
assert.equal(await readFile(join(output, 'landing.css'), 'utf8'), await readFile(join(root, 'seo/landing.css'), 'utf8'));
const template = await readFile(join(root, 'seo/templates/landing.html'), 'utf8');
for (const page of pages) {
  const html = await readFile(join(output, page.slug, 'index.html'), 'utf8');
  assert.equal(html, renderPage(page, template), 'Output differs from source');
  assert(html.startsWith('<!doctype html>'));
  assert(html.includes('<html lang="en">'));
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  assert(html.includes('<meta name="description"'));
  assert(html.includes('<meta property="og:title"'));
  assert(html.includes('<meta name="twitter:card"'));
  assert(!/\{\{|<script\b|<iframe\b|<form\b|name=["']robots|rel=["']canonical/i.test(html));
  assert(page.sections.length >= 3 && page.faq.length >= 2);
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (href === 'https://bobunaut.com') continue;
    assert(!/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href), `Unexpected external URL: ${href}`);
    if (href.startsWith('#')) {
      assert(html.includes(`id="${href.slice(1)}"`));
      continue;
    }
    const target = resolve(output, page.slug, href);
    assert(target.startsWith(output + sep), 'Link leaves preview');
    assert((await lstat(target)).isFile(), `Missing local link: ${href}`);
  }
  console.log(`PASS: ${page.slug} — English content, metadata, structure, FAQs and local links`);
}
console.log('PASS: Exactly four pages plus CSS; source/output match; no scripts or indexing directives; tracked files unchanged; branch seo-v1-safe.');
