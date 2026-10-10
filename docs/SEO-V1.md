# BOBU SEO V1 safe stage

Four standalone English guides: Web3 Gaming, Builder Mining, Solana Devnet and Mars Exploration. Content is rendered directly into HTML, with unique titles, descriptions, Open Graph/Twitter metadata, one H1, explanatory sections, FAQs and related-guide links. No JavaScript or external resources are required to read the pages. Shared CSS provides responsive typography and visible keyboard focus.

## Files

- `seo/site.mjs`: page content and escaped HTML rendering.
- `seo/templates/landing.html`: shared semantic document template.
- `seo/landing.css`: preview styling.
- `scripts/create-seo-pages.mjs`: dependency-free Node generator.
- `scripts/validate-seo.mjs`: read-only validation.
- `docs/SEO-V1.md`: scope, usage and review notes.

## Generate and validate

Run from the repository with Node.js:

```sh
node scripts/create-seo-pages.mjs
node scripts/validate-seo.mjs
```

The generator requires `seo-v1-safe` and no tracked changes. It accepts no output override and refuses an existing `seo-preview` path, including symlinks. Outputs are exclusively:

- `seo-preview/web3-gaming/index.html`
- `seo-preview/builder-mining/index.html`
- `seo-preview/solana-devnet/index.html`
- `seo-preview/mars-exploration/index.html`
- `seo-preview/landing.css`

Open any generated HTML file locally to review it. Related links work directly from the filesystem. Generation is intentionally one-shot: an existing preview must be reviewed and removed manually before regenerating. A failed generation can leave partial preview files; the validator will reject incomplete output.

The validator checks the branch, tracked-file integrity, exact output inventory, symlink absence, source/output equality, unique metadata, English language declaration, a single H1, content sections, FAQs, local links and absence of scripts, forms, canonical tags and robots directives. It does not claim a browser accessibility audit, search-engine indexing result or verified production integration.

## Safe-stage boundaries

No existing application files, package scripts, routing, navigation, deployment settings, indexing rules or noindex rules are changed. No outputs go to `dist` or `public`. No application build, Supabase connection, wallet interaction or network request is needed. No commit, push or deployment is part of this stage.

No production hostname was supplied, so canonical URLs, `og:url`, sitemap and robots files are intentionally deferred. Preview pages add no indexing directive: keep `seo-preview` local. Public hosting and indexing decisions require a separate stage.

Copy is introductory and avoids claims of guaranteed income, token value, land ownership or unreleased capabilities. The Solana Devnet page explains testing context without asserting that all BOBU features operate on Devnet. Before publication, confirm product-specific behavior and production URLs with the project owner.
