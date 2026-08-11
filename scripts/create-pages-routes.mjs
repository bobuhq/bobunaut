import {
  copyFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join } from "node:path";

const dist = "dist";
const source = join(dist, "index.html");

if (!existsSync(source)) {
  throw new Error(
    "dist/index.html does not exist. Run Vite build first.",
  );
}

const routes = [
  "genesis",
  "language-setup",
  "privacy",
  "terms",
"delete-account",
  "identity",
  "passport",
  "wallet",
  "mining",
  "missions",
  "galaxy",
  "leaderboard",

  "admin",
  "admin/login",
  "admin/builders",
  "admin/reward-ledger",
  "admin/mining-sessions",
  "admin/security",
  "admin/audit-logs",
  "admin/analytics",
];

for (const route of routes) {
  const directory = join(dist, route);

  mkdirSync(directory, {
    recursive: true,
  });

  copyFileSync(
    source,
    join(directory, "index.html"),
  );
}

copyFileSync(
  source,
  join(dist, "404.html"),
);

console.log(
  `✓ GitHub Pages SPA entries generated: ${routes.length}`,
);
