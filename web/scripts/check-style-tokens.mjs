#!/usr/bin/env node
/**
 * check-style-tokens.mjs — fail when component/page styles use raw colour literals.
 *
 * Usage: node scripts/check-style-tokens.mjs <file-or-dir> [...more]
 *
 * Colour must come ONLY from src/styles/tokens.css via var(--token). This checker
 * scans .css/.scss/.ts/.html files (recursively for directories; *.spec.ts and
 * tokens.css itself are skipped) and reports:
 *   - hex colours            (#fff, #163e8c, #0000001a)
 *   - colour functions       (rgb(), rgba(), hsl(), hsla()) unless their first
 *                            argument is a var(--…) tint such as rgba(var(--color-primary-rgb), .1)
 *   - named white/black      used as a colour value (color: white, stroke="white")
 * Exit 0 = clean, 1 = violations found, 2 = usage error / missing path.
 */
import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const EXTS = new Set(['.css', '.scss', '.ts', '.html']);

const RULES = [
  { name: 'hex colour', re: /(?<![\w&/$.-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w(-])/g },
  { name: 'colour function', re: /\b(?:rgba?|hsla?)\(\s*(?!var\()/g },
  {
    name: 'named colour',
    re: /(?:^|[\s;{"'`])(?:color|background(?:-color)?|border(?:-[a-z]+)?|fill|stroke|outline(?:-color)?)\s*[:=]\s*["']?\s*(?:white|black)\b/gi,
  },
];

function collect(path, out) {
  const st = statSync(path);
  if (st.isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      collect(join(path, entry), out);
    }
    return;
  }
  const name = basename(path);
  if (name === 'tokens.css' || name.endsWith('.spec.ts')) return;
  if (!EXTS.has(extname(name))) return;
  out.push(path);
}

/** Blank out block comments (keeping newlines so line numbers stay right). */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: node scripts/check-style-tokens.mjs <file-or-dir> [...]');
  process.exit(2);
}

const files = [];
for (const arg of args) {
  if (!existsSync(arg)) {
    console.error(`check-style-tokens: no such file or directory: ${arg}`);
    process.exit(2);
  }
  collect(arg, files);
}

const violations = [];
for (const file of files) {
  const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      const m = rule.re.exec(line);
      if (m) violations.push(`${file}:${i + 1}: raw ${rule.name}: ${line.trim()}`);
    }
  });
}

if (violations.length) {
  console.error(violations.join('\n'));
  console.error(`\ncheck-style-tokens: ${violations.length} raw literal(s) — use var(--token) from src/styles/tokens.css`);
  process.exit(1);
}
console.log(`check-style-tokens: ${files.length} file(s) clean`);
