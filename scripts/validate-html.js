#!/usr/bin/env node
// NEON ARCADE — HTML/JS Validation Script
// Validates game HTML files for syntax errors, required patterns, and common issues.
// Usage: node scripts/validate-html.js [file1.html file2.html ...]
// If no files given, validates all HTML files in public/

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

// ========== Configuration ==========
const GAME_DIRS = ['neonarcade', 'neonmind', 'neongrind', 'neonclassic'];

// Required patterns for game files (not hub/admin pages)
const REQUIRED_PATTERNS = [
  { pattern: /<script src="\/neon\.js"><\/script>/, name: 'neon.js inclusion', severity: 'error' },
  { pattern: /Neon\.init\s*\(/, name: 'Neon.init() call', severity: 'error' },
  { pattern: /<meta name="viewport"/, name: 'viewport meta tag', severity: 'error' },
  { pattern: /<title>.+<\/title>/, name: 'title tag', severity: 'error' },
  { pattern: /<meta name="description"/, name: 'meta description', severity: 'warn' },
  { pattern: /og:title/, name: 'Open Graph tags', severity: 'warn' },
  { pattern: /canonical/, name: 'canonical URL', severity: 'warn' },
  { pattern: /font-family:\s*['"]?Orbitron/, name: 'Orbitron font usage', severity: 'warn' },
  { pattern: /font-family:\s*['"]?Rajdhani/, name: 'Rajdhani font usage', severity: 'warn' },
  { pattern: /fonts\.googleapis\.com/, name: 'Google Fonts link', severity: 'warn' },
];

// Dangerous patterns to flag
const DANGEROUS_PATTERNS = [
  { pattern: /\.innerHTML\s*=/, name: 'innerHTML assignment (potential XSS)', severity: 'warn' },
  { pattern: /\beval\s*\(/, name: 'eval() usage', severity: 'error' },
  { pattern: /new\s+Function\s*\(/, name: 'new Function() usage', severity: 'warn' },
  { pattern: /document\.write\s*\(/, name: 'document.write() usage', severity: 'warn' },
  { pattern: /@import\s+url/, name: '@import in CSS (render-blocking)', severity: 'warn' },
];

// ========== Helpers ==========
let errorCount = 0;
let warnCount = 0;

function log(severity, file, message) {
  const rel = path.relative(ROOT, file);
  if (severity === 'error') {
    console.error(`  ERROR  ${rel}: ${message}`);
    errorCount++;
  } else {
    console.warn(`  WARN   ${rel}: ${message}`);
    warnCount++;
  }
}

function extractScriptBlocks(html) {
  const blocks = [];
  // Match inline <script> blocks (not ones with src attribute)
  const regex = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    // Skip JSON-LD blocks
    if (match[0].includes('application/ld+json')) continue;
    blocks.push({
      code: match[1],
      offset: html.substring(0, match.index).split('\n').length,
    });
  }
  return blocks;
}

function validateJsSyntax(code, file, lineOffset) {
  try {
    // Use vm.Script to check syntax without executing
    new vm.Script(code, { filename: file });
    return true;
  } catch (err) {
    const line = err.message.match(/line (\d+)/)?.[1];
    const actualLine = line ? parseInt(line) + lineOffset - 1 : '?';
    log('error', file, `JS syntax error at line ~${actualLine}: ${err.message.split('\n')[0]}`);
    return false;
  }
}

function isGameFile(filePath) {
  const rel = path.relative(PUBLIC, filePath);
  const parts = rel.split(path.sep);
  // Game file = inside a game dir AND not index.html
  return GAME_DIRS.includes(parts[0]) && path.basename(filePath) !== 'index.html';
}

function validateHtmlStructure(html, file) {
  if (!/<html/i.test(html)) log('error', file, 'Missing <html> tag');
  if (!/<head/i.test(html)) log('error', file, 'Missing <head> tag');
  if (!/<body/i.test(html)) log('error', file, 'Missing <body> tag');
  if (!/<\/html>/i.test(html)) log('error', file, 'Missing closing </html> tag');
  if (!/<\/head>/i.test(html)) log('error', file, 'Missing closing </head> tag');
  if (!/<\/body>/i.test(html)) log('error', file, 'Missing closing </body> tag');
  if (!/<!DOCTYPE\s+html>/i.test(html)) log('warn', file, 'Missing <!DOCTYPE html>');
}

function validateRequiredPatterns(html, file) {
  if (!isGameFile(file)) return;

  for (const req of REQUIRED_PATTERNS) {
    if (!req.pattern.test(html)) {
      log(req.severity, file, `Missing required: ${req.name}`);
    }
  }
}

function checkDangerousPatterns(html, file) {
  const lines = html.split('\n');
  for (const danger of DANGEROUS_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      if (danger.pattern.test(lines[i])) {
        // Skip innerHTML in comments
        if (lines[i].trim().startsWith('//') || lines[i].trim().startsWith('*')) continue;
        log(danger.severity, file, `${danger.name} at line ${i + 1}`);
      }
    }
  }
}

function validateFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');

  // 1. HTML structure
  validateHtmlStructure(html, filePath);

  // 2. JS syntax check
  const scripts = extractScriptBlocks(html);
  for (const block of scripts) {
    if (block.code.trim()) {
      validateJsSyntax(block.code, filePath, block.offset);
    }
  }

  // 3. Required patterns (game files only)
  validateRequiredPatterns(html, filePath);

  // 4. Dangerous patterns
  checkDangerousPatterns(html, filePath);
}

// ========== Main ==========
function main() {
  const args = process.argv.slice(2);
  let files = [];

  if (args.length > 0) {
    // Validate specific files
    files = args.map(f => path.resolve(f)).filter(f => {
      if (!fs.existsSync(f)) {
        console.error(`File not found: ${f}`);
        return false;
      }
      return true;
    });
  } else {
    // Validate all HTML files in public/
    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.name.endsWith('.html')) {
          files.push(full);
        }
      }
    }
    walk(PUBLIC);
  }

  if (files.length === 0) {
    console.log('No HTML files to validate.');
    return;
  }

  console.log(`Validating ${files.length} HTML file(s)...\n`);

  for (const file of files) {
    validateFile(file);
  }

  console.log(`\n  ${files.length} files checked | ${errorCount} errors | ${warnCount} warnings`);

  if (errorCount > 0) {
    console.error('\nValidation FAILED — fix errors before committing.\n');
    process.exit(1);
  }

  if (warnCount > 0) {
    console.log('\nValidation passed with warnings.\n');
  } else {
    console.log('\nValidation passed.\n');
  }
}

main();
