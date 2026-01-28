#!/usr/bin/env node
// Usage:
//  node scripts/strict-clean.mjs              # Dry-Run (nur anzeigen)
//  node scripts/strict-clean.mjs --apply      # in .trash/ verschieben
//  PERMANENT_DELETE=1 node scripts/strict-clean.mjs --apply  # endgültig löschen

import fs from "fs";
import fsp from "fs/promises";
import path from "path";

const APPLY = process.argv.includes("--apply");
const HARD  = process.env.PERMANENT_DELETE === "1";

// Passe diese Whitelist an DEIN Repo an:
const KEEP_DIRS_TOP = new Set([
  ".github", ".claude",
  "app", "components", "data", "docs", "hooks", "lib",
  "public", "server", "store", "tests", "types",
  "prisma", "scripts", ".trash"
]);

const KEEP_FILES_TOP = new Set([
  "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
  "tsconfig.json", "next.config.js", "next.config.mjs", "postcss.config.js",
  "postcss.config.mjs", "tailwind.config.js", "tailwind.config.ts",
  ".gitignore", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json",
  ".prettierrc", ".prettierrc.json", ".prettierignore",
  "codecov.yml", "Dockerfile", "README.md", "LICENSE", "CODEOWNERS",
  "playwright.config.ts", "vitest.config.ts", "vitest.setup.ts",
  ".env", ".env.example", ".env.local", ".env.production", ".env.development",
  "nodemon.json", "next-env.d.ts", "middleware.ts"
]);

// Artefakt-Ordner (können immer weg)
const JUNK_DIRS_ANY = new Set([
  ".next", ".turbo", "dist", "build", "coverage",
  "playwright-report", "test-results", ".playwright", ".cache",
  ".vercel", "out", ".nyc_output", ".vitest"
]);

// Junk-Dateien/Pattern
const JUNK_FILES_ANY = new Set([
  ".DS_Store", "Thumbs.db", "npm-debug.log", "yarn-error.log",
  "pnpm-debug.log", "error.log", "combined.log"
]);

const JUNK_SUFFIXES = [".log", ".tmp", ".swp", ".orig", ".rej", "~"];

// Sensible Sachen nie anfassen, falls vorhanden
const SAFE_ENV = new Set([
  ".env", ".env.local", ".env.production", ".env.development",
  ".env.test", ".env.production.local", ".env.development.local",
  ".env.test.local"
]);

const TRASH_BASE = path.join(".trash", new Date().toISOString().replace(/[:.]/g, "-"));

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true }).catch(() => {});
}

async function toTrash(abs) {
  const rel = path.relative(process.cwd(), abs);
  const dest = path.join(TRASH_BASE, rel);
  await ensureDir(path.dirname(dest));
  try {
    await fsp.rename(abs, dest);
  } catch {
    const st = await fsp.lstat(abs).catch(() => null);
    if (!st) return;
    if (st.isDirectory()) {
      await fsp.cp(abs, dest, { recursive: true });
      await fsp.rm(abs, { recursive: true, force: true });
    } else {
      await fsp.copyFile(abs, dest);
      await fsp.rm(abs, { force: true });
    }
  }
}

async function remove(abs) {
  if (!APPLY) {
    console.log("DRY  :", abs);
    return;
  }
  if (HARD) {
    console.log("DEL  :", abs);
    await fsp.rm(abs, { recursive: true, force: true });
  } else {
    console.log("TRASH:", abs);
    await toTrash(abs);
  }
}

function isJunkFile(name) {
  if (JUNK_FILES_ANY.has(name)) return true;
  return JUNK_SUFFIXES.some(s => name.endsWith(s));
}

function topLevelName(abs) {
  const rel = path.relative(process.cwd(), abs);
  return rel.split(path.sep)[0];
}

async function walk(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);

  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const top = topLevelName(abs);

    // Schütze .git & node_modules
    if (e.name === ".git" || e.name === "node_modules") continue;

    // 1) Alles außerhalb der Top-Whitelist → entfernen
    if (dir === process.cwd()) {
      const keepTop = KEEP_DIRS_TOP.has(e.name) || KEEP_FILES_TOP.has(e.name);
      if (!keepTop) {
        await remove(abs);
        continue;
      }
    }

    // 2) Junk-Artefakte überall raus
    if (e.isDirectory() && JUNK_DIRS_ANY.has(e.name)) {
      await remove(abs);
      continue;
    }

    if (e.isFile()) {
      if (SAFE_ENV.has(e.name)) continue;
      if (isJunkFile(e.name)) {
        await remove(abs);
        continue;
      }
    }

    // 3) Tiefer laufen
    if (e.isDirectory()) {
      await walk(abs);
      // ggf. leere Ordner löschen (außer Top-Level-Whitelist-Wurzel)
      try {
        const list = await fsp.readdir(abs);
        if (list.length === 0 && !KEEP_DIRS_TOP.has(e.name)) {
          await remove(abs);
        }
      } catch {}
    }
  }
}

async function main() {
  console.log(`>>> Strict Clean ${APPLY ? "(APPLY)" : "(DRY-RUN)"}  HARD=${HARD ? "yes" : "no (trash)"}`);
  await walk(process.cwd());

  if (!APPLY) {
    console.log("\n📋 Dry-Run beendet. Anwenden mit:");
    console.log("  node scripts/strict-clean.mjs --apply");
    console.log("\n⚠️  Endgültig löschen:");
    console.log("  PERMANENT_DELETE=1 node scripts/strict-clean.mjs --apply");
  } else if (!HARD) {
    console.log(`\n✅ Verschoben nach: ${TRASH_BASE}`);
  } else {
    console.log("\n✅ Permanent gelöscht!");
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
