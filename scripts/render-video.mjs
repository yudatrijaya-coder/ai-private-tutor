#!/usr/bin/env node
/**
 * Render animated HTML → video via Playwright + ffmpeg
 * Optimized: 15fps, JPEG screenshots (faster than PNG)
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';

const HTML = process.argv[2];
const OUTPUT = process.argv[3];
const DURATION = parseFloat(process.argv[4] || '12');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const htmlPath = path.resolve(HTML);
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1500);

  const fps = 15; // Half frames = 2x faster
  const frames = Math.ceil(DURATION * fps);

  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-framerate', String(fps),
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    OUTPUT
  ]);

  for (let i = 0; i < frames; i++) {
    const buf = await page.screenshot({ type: 'jpeg', quality: 85 });
    ffmpeg.stdin.write(buf);
    if (i % 15 === 0) process.stderr.write(`Frame ${i}/${frames}\n`);
  }

  ffmpeg.stdin.end();
  await new Promise(resolve => ffmpeg.on('close', resolve));
  await browser.close();
  console.log('✅ Video:', OUTPUT);
})();
