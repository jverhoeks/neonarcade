#!/usr/bin/env node
// NEON ARCADE — Comprehensive Game Audit Script
// Checks: neon.js integration, color palette, SEO tags, security, performance
// Usage: node scripts/audit-games.js [--json] [--category=neonarcade] [file1.html ...]
// Exit code 1 if errors found, 0 if only warnings or clean.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const GAME_DIRS = ['neonarcade', 'neonmind', 'neongrind', 'neonclassic', 'neoncasino', 'neonquest'];

// ========== PALETTE ==========
const BANNED_BG_PATTERNS = [
  { pattern: /background\s*:\s*#000(?:000)?(?:\s|;|"|'|$)/gi, name: '#000 background (use #0a0a12)' },
  { pattern: /background-color\s*:\s*#000(?:000)?(?:\s|;|"|'|$)/gi, name: '#000 background-color (use #0a0a12)' },
  { pattern: /fillStyle\s*=\s*['"]#000(?:000)?['"]/g, name: 'Canvas fillStyle #000 (use #0a0a12)' },
];

const WRONG_CYAN = /#00e5ff/gi;

// ========== SEO REQUIRED TAGS ==========
const SEO_CHECKS = [
  { pattern: /<title>.+<\/title>/s, name: 'title tag' },
  { pattern: /<meta\s+name="description"/, name: 'meta description' },
  { pattern: /<link\s+rel="canonical"/, name: 'canonical URL' },
  { pattern: /<link\s+rel="manifest"/, name: 'manifest link' },
  { pattern: /og:type/, name: 'og:type' },
  { pattern: /og:url/, name: 'og:url' },
  { pattern: /og:title/, name: 'og:title' },
  { pattern: /og:description/, name: 'og:description' },
  { pattern: /og:image/, name: 'og:image' },
  { pattern: /og:image:width/, name: 'og:image:width' },
  { pattern: /og:image:height/, name: 'og:image:height' },
  { pattern: /og:site_name/, name: 'og:site_name' },
  { pattern: /og:locale/, name: 'og:locale' },
  { pattern: /twitter:card/, name: 'twitter:card' },
  { pattern: /twitter:url/, name: 'twitter:url' },
  { pattern: /twitter:title/, name: 'twitter:title' },
  { pattern: /twitter:description/, name: 'twitter:description' },
  { pattern: /twitter:image/, name: 'twitter:image' },
  { pattern: /"@type"\s*:\s*"VideoGame"/, name: 'VideoGame schema' },
  { pattern: /"@type"\s*:\s*"BreadcrumbList"/, name: 'BreadcrumbList schema' },
  { pattern: /user-scalable=no/, name: 'viewport user-scalable=no' },
];

// ========== NEON.JS INTEGRATION ==========
const NEON_CHECKS = [
  { pattern: /<script\s+src="\/neon\.js"><\/script>/, name: 'neon.js include' },
  { pattern: /Neon\.init\s*\(/, name: 'Neon.init()' },
  { pattern: /Neon\.save\s*\(/, name: 'Neon.save()' },
  { pattern: /Neon\.render\s*\(/, name: 'Neon.render()' },
  { pattern: /Neon\.getName\s*\(\)|Neon\.promptName\s*\(/, name: 'Neon.getName/promptName' },
  { pattern: /navigator\.clipboard\.writeText|navigator\.share/, name: 'Share functionality' },
];

// ========== SECURITY (detects dangerous JS constructs) ==========
const SECURITY_CHECKS = [
  { pattern: /\beval\b\s*\(/g, name: 'unsafe code evaluation detected', severity: 'error' },
  { pattern: /\bdocument\s*\.\s*write\b\s*\(/g, name: 'unsafe DOM write detected', severity: 'warn' },
  { pattern: /@import\s+url/i, name: '@import CSS (render-blocking)', severity: 'warn' },
];

// ========== PRECONNECT ==========
const PRECONNECT_CHECKS = [
  { pattern: /preconnect.*fonts\.googleapis\.com/, name: 'preconnect fonts.googleapis.com' },
  { pattern: /preconnect.*fonts\.gstatic\.com/, name: 'preconnect fonts.gstatic.com' },
];

// ========== VISUAL EFFECTS ==========
const EFFECTS_CHECKS = [
  { pattern: /body::after|repeating-linear-gradient.*transparent.*rgba\(0,\s*0,\s*0/s, name: 'Scanline overlay' },
  { pattern: /@keyframes\s+shake|\.shake|shake\s*\{/i, name: 'Screen shake animation' },
  { pattern: /text-shadow.*rgba/i, name: 'Neon glow (text-shadow)' },
];

// ========== HELPERS ==========
let errors = 0;
let warnings = 0;
const issues = [];

function report(severity, file, check, detail) {
  const rel = path.relative(PUBLIC, file);
  issues.push({ severity, file: rel, check, detail: detail || '' });
  if (severity === 'error') errors++;
  else warnings++;
}

function isGameFile(filePath) {
  const rel = path.relative(PUBLIC, filePath);
  const parts = rel.split(path.sep);
  return GAME_DIRS.includes(parts[0]) && path.basename(filePath) !== 'index.html';
}

function isCanvasGame(html) {
  // A canvas game uses visible canvas for rendering (not just hidden share-image canvas)
  if (!/<canvas/i.test(html)) return false;
  // If all canvas elements are display:none or id="share-canvas", it's not a canvas game
  if (/share-canvas/i.test(html) && !/<canvas(?![^>]*share)[^>]*>/i.test(html)) return false;
  return true;
}

function getGameFiles(args, categoryFilter) {
  if (args.length > 0) {
    return args.map(f => path.resolve(f)).filter(f => fs.existsSync(f));
  }
  const files = [];
  const dirs = categoryFilter ? [categoryFilter] : GAME_DIRS;
  for (const d of dirs) {
    const dir = path.join(PUBLIC, d);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.endsWith('.html') && entry.name !== 'index.html') {
        files.push(path.join(dir, entry.name));
      }
    }
  }
  return files.sort();
}

// ========== AUDIT FUNCTIONS ==========

function auditNeonIntegration(html, file) {
  for (const check of NEON_CHECKS) {
    if (!check.pattern.test(html)) {
      report('error', file, 'neon.js', 'Missing: ' + check.name);
    }
  }
}

function auditSEO(html, file) {
  for (const check of SEO_CHECKS) {
    if (!check.pattern.test(html)) {
      report('warn', file, 'seo', 'Missing: ' + check.name);
    }
  }
}

function auditColors(html, file) {
  const lines = html.split('\n');

  for (const check of BANNED_BG_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      check.pattern.lastIndex = 0;
      if (check.pattern.test(lines[i])) {
        // Exception: light mask compositing
        const context = lines.slice(Math.max(0, i - 3), i + 3).join('\n');
        if (/globalCompositeOperation|lightCtx|maskCtx/i.test(context)) continue;
        // Exception: text color on bright background buttons
        if (/color:\s*#000/i.test(lines[i]) && !/background/i.test(lines[i])) continue;
        report('error', file, 'color', check.name + ' at line ' + (i + 1));
      }
    }
  }

  // Non-standard cyan
  let cyanCount = 0;
  for (let i = 0; i < lines.length; i++) {
    WRONG_CYAN.lastIndex = 0;
    if (WRONG_CYAN.test(lines[i])) cyanCount++;
  }
  if (cyanCount > 0) {
    report('warn', file, 'color', 'Non-standard cyan #00e5ff (' + cyanCount + 'x) — use #00f0ff');
  }
}

function auditEffects(html, file) {
  for (const check of EFFECTS_CHECKS) {
    if (!check.pattern.test(html)) {
      report('warn', file, 'effects', 'Missing: ' + check.name);
    }
  }
}

function auditSecurity(html, file) {
  const lines = html.split('\n');
  for (const check of SECURITY_CHECKS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('*')) continue;
      check.pattern.lastIndex = 0;
      if (check.pattern.test(lines[i])) {
        report(check.severity, file, 'security', check.name + ' at line ' + (i + 1));
      }
    }
  }
}

function auditPerformance(html, file) {
  for (const check of PRECONNECT_CHECKS) {
    if (!check.pattern.test(html)) {
      report('warn', file, 'perf', 'Missing: ' + check.name);
    }
  }

  if (isCanvasGame(html) && !/devicePixelRatio/i.test(html)) {
    report('error', file, 'perf', 'Canvas game missing devicePixelRatio for HiDPI');
  }

  if (/@import.*fonts\.googleapis/i.test(html)) {
    report('error', file, 'perf', 'Using @import for Google Fonts (use <link> tag)');
  }
}

// ========== MAIN ==========
function main() {
  const args = process.argv.slice(2);
  const fileArgs = args.filter(a => !a.startsWith('--'));
  const flags = args.filter(a => a.startsWith('--'));
  const categoryMatch = flags.find(f => f.startsWith('--category='));
  const category = categoryMatch ? categoryMatch.split('=')[1] : null;
  const jsonOutput = flags.includes('--json');

  const files = getGameFiles(fileArgs, category);

  if (files.length === 0) {
    console.log('No game files to audit.');
    return;
  }

  console.log('\nNEON ARCADE — Game Audit');
  console.log('========================');
  console.log('Auditing ' + files.length + ' game(s)...\n');

  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');

    if (isGameFile(file)) {
      auditNeonIntegration(html, file);
      auditSEO(html, file);
    }
    auditColors(html, file);
    auditEffects(html, file);
    auditSecurity(html, file);
    auditPerformance(html, file);
  }

  // ========== REPORT ==========
  if (jsonOutput) {
    console.log(JSON.stringify({ errors, warnings, total: files.length, issues }, null, 2));
    process.exit(errors > 0 ? 1 : 0);
    return;
  }

  if (issues.length === 0) {
    console.log('  All games passed all audit checks.\n');
  } else {
    const errorIssues = issues.filter(i => i.severity === 'error');
    const warnIssues = issues.filter(i => i.severity === 'warn');

    if (errorIssues.length > 0) {
      console.log('ERRORS:');
      for (const i of errorIssues) {
        console.error('  ERROR  [' + i.check + '] ' + i.file + ': ' + i.detail);
      }
      console.log('');
    }

    if (warnIssues.length > 0) {
      console.log('WARNINGS:');
      for (const i of warnIssues) {
        console.warn('  WARN   [' + i.check + '] ' + i.file + ': ' + i.detail);
      }
      console.log('');
    }
  }

  // Summary
  const byCheck = {};
  for (const i of issues) {
    const key = i.severity + ':' + i.check;
    byCheck[key] = (byCheck[key] || 0) + 1;
  }

  console.log('SUMMARY:');
  console.log('  ' + files.length + ' games audited | ' + errors + ' errors | ' + warnings + ' warnings');
  if (Object.keys(byCheck).length > 0) {
    console.log('\n  By category:');
    for (const [key, count] of Object.entries(byCheck).sort()) {
      const [sev, check] = key.split(':');
      console.log('    ' + sev.toUpperCase().padEnd(6) + ' ' + check.padEnd(12) + ' ' + count + ' issue(s)');
    }
  }
  console.log('');

  if (errors > 0) {
    console.error('Audit FAILED — fix errors before committing.\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('Audit passed with warnings.\n');
  } else {
    console.log('Audit passed.\n');
  }
}

main();
