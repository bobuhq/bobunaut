import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { pages, renderPage } from '../seo/site.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
if (git('branch', '--show-current') !== 'seo-v1-safe') throw new Error('Requires branch seo-v1-safe.');
if (git('diff', '--name-only', 'HEAD')) throw new Error('Tracked changes detected; generation stopped.');
if (process.argv.length > 2) throw new Error('No output overrides are allowed.');
const template = await readFile(join(root, 'seo/templates/landing.html'), 'utf8');
const css = await readFile(join(root, 'seo/landing.css'), 'utf8');
const rendered = pages.map(page => {
  if (!/^[a-z0-9-]+$/.test(page.slug)) throw new Error('Unsafe slug.');
  return { slug: page.slug, html: renderPage(page, template) };
});
const output = join(root, 'seo-preview');
// Deliberately refuse an existing directory (including symlinks) or output file.
await mkdir(output);
await writeFile(join(output, 'landing.css'), css, { flag: 'wx' });
for (const page of rendered) {
  const directory = join(output, page.slug);
  await mkdir(directory);
  await writeFile(join(directory, 'index.html'), page.html, { flag: 'wx' });
}
console.log(`PASS: Generated ${rendered.length} static pages and one stylesheet under seo-preview only.`);
