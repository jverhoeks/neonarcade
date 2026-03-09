#!/usr/bin/env node
// NEON ARCADE — Smoke Test Script
// Starts a local server, loads each game in a headless browser, checks for JS errors.
// Usage: node scripts/smoke-test.js [file1.html file2.html ...]
// If no files given, tests all game HTML files.
// Requires: npx playwright (auto-installed on first run)

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const PORT = 8787;
const GAME_DIRS = ['neonarcade', 'neonmind', 'neongrind', 'neonclassic'];
const TIMEOUT = 8000; // ms to wait per page

// MIME types for static serving
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      // Mock /api/* endpoints
      if (req.url.startsWith('/api/')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (req.url.includes('leaderboard')) {
          res.end(JSON.stringify({ game: 'test', leaderboard: [] }));
        } else if (req.url.includes('stats')) {
          res.end(JSON.stringify({ games: {} }));
        } else {
          res.end(JSON.stringify({ ok: true }));
        }
        return;
      }

      let filePath = path.join(PUBLIC, req.url === '/' ? 'index.html' : req.url);
      if (!filePath.includes('.')) filePath = path.join(filePath, 'index.html');

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(PORT, () => resolve(server));
  });
}

function getGameFiles(args) {
  if (args.length > 0) {
    return args.map(f => path.resolve(f)).filter(f => fs.existsSync(f));
  }
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html') && entry.name !== 'index.html') files.push(full);
    }
  }
  for (const d of GAME_DIRS) {
    const dir = path.join(PUBLIC, d);
    if (fs.existsSync(dir)) walk(dir);
  }
  return files;
}

async function main() {
  const args = process.argv.slice(2);
  const files = getGameFiles(args);

  if (files.length === 0) {
    console.log('No game files to test.');
    return;
  }

  // Ensure Playwright is available
  let playwright;
  try {
    playwright = require('playwright');
  } catch {
    console.log('Installing playwright...');
    execFileSync('npx', ['playwright', 'install', 'chromium'], { stdio: 'inherit' });
    playwright = require('playwright');
  }

  const server = await startServer();
  console.log(`Local server on port ${PORT}`);
  console.log(`Testing ${files.length} game(s)...\n`);

  const browser = await playwright.chromium.launch();
  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const file of files) {
    const rel = path.relative(PUBLIC, file);
    const url = `http://localhost:${PORT}/${rel}`;
    const errors = [];

    const page = await browser.newPage();
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });

    try {
      await page.goto(url, { timeout: TIMEOUT, waitUntil: 'domcontentloaded' });
      // Wait a bit for JS to initialize
      await page.waitForTimeout(1000);
    } catch (err) {
      errors.push(`Page load failed: ${err.message}`);
    }

    await page.close();

    // Filter out expected errors (API calls to mock server, font loading, etc.)
    const realErrors = errors.filter(e =>
      !e.includes('Failed to fetch') &&
      !e.includes('net::ERR_') &&
      !e.includes('fonts.googleapis') &&
      !e.includes('fonts.gstatic')
    );

    if (realErrors.length > 0) {
      console.error(`  FAIL  ${rel}`);
      for (const err of realErrors) {
        console.error(`         ${err.substring(0, 200)}`);
      }
      failed++;
      failures.push({ file: rel, errors: realErrors });
    } else {
      console.log(`  OK    ${rel}`);
      passed++;
    }
  }

  await browser.close();
  server.close();

  console.log(`\n  ${passed} passed | ${failed} failed | ${files.length} total`);

  if (failed > 0) {
    console.error('\nSmoke test FAILED.\n');
    process.exit(1);
  } else {
    console.log('\nAll smoke tests passed.\n');
  }
}

main().catch((err) => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
