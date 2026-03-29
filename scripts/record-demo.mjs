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
// Intro 5s + Demo 78s + Outro 6s = 89s
const VIDEO_DURATION_MS = 89_000;

// ── Audio timeline ────────────────────────────────────────────────────────────
// Each clip's start time in ms from the VERY BEGINNING of the video.
// Intro = 5000ms; LiveDemoScene adds each step's "time" on top of that.
const AUDIO_CLIPS = [
  { id: 'welcome',    startMs: 5_000  },
  { id: 'pl',         startMs: 10_800 },
  { id: 'cashflow',   startMs: 16_800 },
  { id: 'expenses',   startMs: 22_400 },
  { id: 'operations', startMs: 28_000 },
  { id: 'product',    startMs: 33_600 },
  { id: 'marketing',  startMs: 39_200 },
  { id: 'sales',      startMs: 44_800 },
  { id: 'people',     startMs: 50_400 },
  { id: 'portfolio',  startMs: 56_000 },
  { id: 'ma',         startMs: 61_800 },
  { id: 'reports',    startMs: 67_400 },
  { id: 'services',   startMs: 72_800 },
  { id: 'outro',      startMs: 78_400 },
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
  });

  const page = await context.newPage();
  console.log(`📺  Navigating to ${VIDEO_URL}`);
  await page.goto(VIDEO_URL, { waitUntil: 'networkidle' });

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
