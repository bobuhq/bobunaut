import assert from 'node:assert/strict';
import { readFile, readdir, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { pages } from '../seo/site.mjs';
import { root, origin, slugs, checkRepository, checkParents, productionFiles } from './create-seo-production.mjs';

checkRepository();
assert.equal(process.argv.length, 2, 'No validation overrides allowed');
const expected = await productionFiles();
for (const [relative, content] of expected) {
  await checkParents(relative);
  const stat = await lstat(join(root, relative));
  assert(stat.isFile() && !stat.isSymbolicLink(), `Unsafe file: ${relative}`);
  assert.equal(await readFile(join(root, relative), 'utf8'), content, `Production output differs: ${relative}`);
}
for (const slug of [...slugs, 'seo-v1']) {
  assert.deepEqual(await readdir(join(root, 'public', slug)), [slug === 'seo-v1' ? 'landing.css' : 'index.html'], 'Unexpected production inventory');
}
for (const field of ['title', 'description', 'heading']) assert.equal(new Set(pages.map(page => page[field])).size, 4, `Duplicate ${field}`);
for (const page of pages) {
  const html = await readFile(join(root, 'public', page.slug, 'index.html'), 'utf8');
  const url = `${origin}/${page.slug}/`;
  assert(html.startsWith('<!doctype html>') && html.includes('<html lang="en">'));
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.equal((html.match(/property="og:url"/g) || []).length, 1);
  assert(html.includes(`<link rel="canonical" href="${url}">`));
  assert(html.includes(`<meta property="og:url" content="${url}">`));
  assert(html.includes(`<link rel="stylesheet" href="/seo-v1/landing.css">`));
  for (const marker of ['name="description"', 'property="og:title"', 'property="og:description"', 'name="twitter:card"']) assert(html.includes(marker));
  assert(!/preview|\{\{|<script\b|<iframe\b|<form\b|name=["']robots/i.test(html));
  assert(page.sections.length >= 3 && page.faq.length >= 2);
  const related = [];
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (href.startsWith('#')) {
      assert(html.includes(`id="${href.slice(1)}"`));
    } else if (href === '/seo-v1/landing.css') {
      assert((await lstat(join(root, 'public', href.slice(1)))).isFile());
    } else if (href.startsWith('/')) {
      assert(slugs.some(slug => href === `/${slug}/`), `Unexpected internal link: ${href}`);
      assert(!href.includes(page.slug), 'Related link references itself');
      related.push(href);
      assert((await lstat(join(root, 'public', href.slice(1), 'index.html'))).isFile());
    } else {
      assert([url, `${origin}/`].includes(href), `Unexpected absolute link: ${href}`);
    }
  }
  assert.deepEqual(related.sort(), slugs.filter(slug => slug !== page.slug).map(slug => `/${slug}/`).sort());
  console.log(`PASS: ${page.slug} — reviewed content/design, metadata, canonical, og:url, CSS, links, FAQs and static HTML`);
}
const sitemap = await readFile(join(root, 'public/sitemap.xml'), 'utf8');
assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), slugs.map(slug => `${origin}/${slug}/`));
console.log('PASS: Sitemap contains exactly the four production SEO URLs.');
console.log('PASS: Exactly four standalone pages plus CSS and sitemap; no symlinks or preview labels; tracked files unchanged; branch seo-v1-safe.');
