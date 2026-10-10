import assert from 'node:assert/strict';
import { readFile, lstat, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { pages, renderPage } from '../seo/site.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const origin = 'https://bobunaut.com';
export const slugs = ['web3-gaming', 'builder-mining', 'solana-devnet', 'mars-exploration'];
export const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
export function checkRepository() {
  assert.equal(git('branch', '--show-current'), 'seo-v1-safe', 'Requires branch seo-v1-safe');
  assert.equal(git('diff', '--name-only', 'HEAD'), '', 'Tracked changes detected');
}
export async function checkParents(relative) {
  const parts = relative.split('/');
  for (let i = 1; i < parts.length; i++) {
    try {
      const stat = await lstat(join(root, ...parts.slice(0, i)));
      assert(stat.isDirectory() && !stat.isSymbolicLink(), 'Unsafe output parent');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}
export async function productionFiles() {
  assert.deepEqual(pages.map(page => page.slug), slugs);
  const template = await readFile(join(root, 'seo/templates/landing.html'), 'utf8');
  const css = await readFile(join(root, 'seo/landing.css'), 'utf8');
  assert.equal(await readFile(join(root, 'seo-preview/landing.css'), 'utf8'), css, 'Reviewed CSS differs from source');
  const files = new Map();
  for (const page of pages) {
    const preview = renderPage(page, template);
    assert.equal(await readFile(join(root, 'seo-preview', page.slug, 'index.html'), 'utf8'), preview, 'Reviewed preview differs from source');
    const url = `${origin}/${page.slug}/`;
    let html = preview
      .replace('  <link rel="stylesheet" href="../landing.css">', `  <link rel="canonical" href="${url}">\n  <meta property="og:url" content="${url}">\n  <link rel="stylesheet" href="/seo-v1/landing.css">`)
      .replace('<p class="preview-label">English guide · Local SEO preview</p>', '<p class="guide-label">English guide</p>')
      .replace('BOBU Universe · Preview content for review', 'BOBU Universe · English guides')
      .replaceAll('href="https://bobunaut.com"', 'href="https://bobunaut.com/"');
    for (const slug of slugs) html = html.replaceAll(`href="../${slug}/index.html"`, `href="/${slug}/"`);
    files.set(`public/${page.slug}/index.html`, html);
  }
  files.set('public/seo-v1/landing.css', css.replaceAll('.preview-label', '.guide-label'));
  files.set('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${slugs.map(slug => `  <url><loc>${origin}/${slug}/</loc></url>`).join('\n')}\n</urlset>\n`);
  return files;
}
async function generate() {
  checkRepository();
  assert.equal(process.argv.length, 2, 'No output overrides allowed');
  const files = await productionFiles();
  // Preflight every target before any mkdir or write, including dangling symlinks.
  for (const relative of files.keys()) {
    await checkParents(relative);
    try {
      await lstat(join(root, relative));
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    throw new Error(`Target already exists; stopped before writing: ${relative}`);
  }
  for (const [relative, content] of files) {
    await mkdir(join(root, relative, '..'), { recursive: true });
    await writeFile(join(root, relative), content, { flag: 'wx' });
    console.log(`CREATED: ${relative}`);
  }
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await generate();
