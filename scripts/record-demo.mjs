#!/usr/bin/env node
/**
 * record-demo.mjs
 * Records the iNi live demo video and mixes in narration audio → produces an MP4.
 *
 * Usage:
 *   node scripts/record-demo.mjs
 *
 * Prerequisites:
 *   - All four Replit workflows must be running (video app, finance-saas, api-server)
 *   - ffmpeg must be available (it is in the Replit environment)
 */

import { chromium } from 'playwright-core';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Paths ────────────────────────────────────────────────────────────────────
const CHROMIUM_BIN =
  '/nix/store/0n9rl5l9syy808xi9bk4f6dhnfrvhkww-playwright-browsers-chromium/chromium-1080/chrome-linux/chrome';

const VIDEO_URL  = 'http://localhost:80/ini-demo-video/';  // Replit proxy at port 80
const AUDIO_DIR  = path.join(ROOT, 'artifacts/ini-demo-video/public/audio');
const OUTPUT_DIR = path.join(ROOT, 'artifacts/ini-demo-video/public');
const TEMP_DIR   = '/tmp/ini-recording';

fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Full video duration ───────────────────────────────────────────────────────
// Intro 5s + Demo 196s + Outro 6s = 207s
const VIDEO_DURATION_MS = 207_000;

// ── Audio timeline ────────────────────────────────────────────────────────────
// Absolute start times = DEMO_STEPS[step].time + 5000ms (intro offset)
// All timestamps verified against LiveDemoScene.tsx DEMO_STEPS.
const AUDIO_CLIPS = [
  { id: 'welcome',    startMs:   5_000 },  // demo t=0      + 5000
  { id: 'pl',         startMs:  23_856 },  // demo t=18856  + 5000
  { id: 'cashflow',   startMs:  37_072 },  // demo t=32072  + 5000
  { id: 'expenses',   startMs:  53_432 },  // demo t=48432  + 5000
  { id: 'operations', startMs:  66_096 },  // demo t=61096  + 5000
  { id: 'product',    startMs:  78_904 },  // demo t=73904  + 5000
  { id: 'marketing',  startMs:  91_904 },  // demo t=86904  + 5000
  { id: 'sales',      startMs: 104_208 },  // demo t=99208  + 5000
  { id: 'people',     startMs: 117_472 },  // demo t=112472 + 5000
  { id: 'portfolio',  startMs: 129_320 },  // demo t=124320 + 5000
  { id: 'ma',         startMs: 145_440 },  // demo t=140440 + 5000
  { id: 'reports',    startMs: 160_792 },  // demo t=155792 + 5000
  { id: 'services',   startMs: 175_952 },  // demo t=170952 + 5000
  { id: 'outro',      startMs: 187_272 },  // demo t=182272 + 5000
];

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  // ── Step 1: Record the browser demo with Playwright ──────────────────────
  console.log('\n🎬  Launching Chromium...');

  const browser = await chromium.launch({
    executablePath: CHROMIUM_BIN,
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--disable-web-security',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-software-rasterizer',
    ],
  });

  const context = await browser.newContext({
    viewport:     { width: 1920, height: 1080 },
    recordVideo:  { dir: TEMP_DIR, size: { width: 1920, height: 1080 } },
    // Pass screenshot/mock mode so finance-saas iframe shows data without auth
    extraHTTPHeaders: {
      'X-Screenshot-Mode': 'true',
    },
  });

  // Set VITE_USE_MOCK cookie so the finance-saas iframe uses mock data
  await context.addCookies([
    { name: 'use_mock', value: 'true', domain: 'localhost', path: '/' },
  ]);

  const page = await context.newPage();

  // Inject mock-mode flag into every page/iframe that loads
  await context.addInitScript(() => {
    window.__USE_MOCK__ = true;
    // Also set localStorage so Vite env checks pick it up
    try { localStorage.setItem('use_mock', 'true'); } catch {}
  });

  console.log(`📺  Navigating to ${VIDEO_URL}`);
  await page.goto(VIDEO_URL, { waitUntil: 'networkidle' });

  // Give the finance-saas iframe time to fully load before recording starts
  console.log('⏳  Waiting 4s for iframe to load...');
  await page.waitForTimeout(4_000);

  const durationSec = VIDEO_DURATION_MS / 1000;
  console.log(`⏳  Recording ${durationSec}s of video... (this takes real time)`);

  // Show progress every 10s
  const start = Date.now();
  const progress = setInterval(() => {
    const elapsed = Math.round((Date.now() - start) / 1000);
    process.stdout.write(`\r   ${elapsed}s / ${durationSec}s elapsed`);
  }, 2000);

  await page.waitForTimeout(VIDEO_DURATION_MS);
  clearInterval(progress);
  process.stdout.write('\n');

  const videoPath = await page.video()?.path();
  await context.close();
  await browser.close();

  if (!videoPath) throw new Error('Playwright did not produce a video file.');
  console.log(`\n📹  Raw recording saved: ${videoPath}`);

  // ── Step 2: Mix narration audio tracks with ffmpeg ────────────────────────
  console.log('\n🔊  Mixing narration audio...');

  // Verify all audio files exist
  for (const clip of AUDIO_CLIPS) {
    const p = path.join(AUDIO_DIR, `${clip.id}.mp3`);
    if (!fs.existsSync(p)) throw new Error(`Missing audio file: ${p}`);
  }

  // Build ffmpeg -filter_complex using adelay so each clip starts at the right ms
  const clipFilters = AUDIO_CLIPS.map(
    (clip, i) => `[${i + 1}:a]adelay=${clip.startMs}|${clip.startMs}[a${i + 1}]`
  ).join(';');

  const mixSources = AUDIO_CLIPS.map((_, i) => `[a${i + 1}]`).join('');
  const filterComplex = `${clipFilters};${mixSources}amix=inputs=${AUDIO_CLIPS.length}:normalize=0[aout]`;

  const audioInputs = AUDIO_CLIPS.map(
    clip => `-i "${path.join(AUDIO_DIR, clip.id + '.mp3')}"`
  ).join(' \\\n  ');

  const outputPath = path.join(OUTPUT_DIR, 'ini-demo.mp4');

  const ffmpegCmd = [
    'ffmpeg -y',
    `-i "${videoPath}"`,
    audioInputs,
    `-filter_complex "${filterComplex}"`,
    '-map 0:v',
    '-map "[aout]"',
    '-c:v libx264 -preset fast -crf 20',
    '-c:a aac -b:a 192k',
    `-t ${durationSec}`,
    `"${outputPath}"`,
  ].join(' \\\n  ');

  console.log('\n  ffmpeg command:\n' + ffmpegCmd + '\n');
  execSync(ffmpegCmd, { stdio: 'inherit' });

  const sizeMb = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(1);
  console.log(`\n✅  Done! Final video: ${outputPath} (${sizeMb} MB)`);
  console.log(`   Open /ini-demo-video/ini-demo.mp4 in the browser to download.\n`);
}

main().catch(err => {
  console.error('\n❌  Recording failed:', err);
  process.exit(1);
});
