/**
 * Full YouTube video health audit
 * Uses the Innertube API (lighter, less rate-limited) + HTML fallback
 * Only flags genuinely dead videos (playability=ERROR, "Video tidak tersedia", UNPLAYABLE)
 * Ignores rate-limit signals ("Login untuk mengonfirmasi")
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// API v1/v2 approach — fetch /player endpoint with API key from page
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function fetchInnertubePlayer(videoId, apiKey, clientVersion) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      videoId,
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: clientVersion || '2.20250213.05.00',
          hl: 'en',
          gl: 'US'
        }
      }
    });

    const url = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`;

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': BROWSER_UA,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 12000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          // Check playability
          const playability = parsed?.playabilityStatus || {};
          const status = playability?.status || '';

          if (status === 'ERROR' || status === 'UNPLAYABLE' || status === 'LIVE_STREAM_OFFLINE') {
            const reason = playability?.reason || playability?.reason?.[0] || '';
            // Only count as dead if NOT rate-limit related
            if (reason.includes('Login') || reason.includes('confirm') || reason.includes('bot')) {
              resolve({ dead: false, reason: 'RATE_LIMITED' });
            } else {
              resolve({ dead: true, reason: `${status}: ${reason.substring(0, 100)}` });
            }
          } else if (status === 'OK' || status === 'AGE_CHECK_REQUIRED') {
            resolve({ dead: false, reason: status });
          } else {
            // Unknown status — might have worked
            resolve({ dead: false, reason: status || 'UNKNOWN' });
          }
        } catch(e) {
          resolve({ dead: false, reason: 'PARSE_ERROR' });
        }
      });
    });
    req.on('error', () => resolve({ dead: false, reason: 'NET_ERROR' }));
    req.on('timeout', () => { req.destroy(); resolve({ dead: false, reason: 'TIMEOUT' }); });
    req.write(postData);
  });
}

async function getApiCredentials() {
  return new Promise((resolve) => {
    https.get('https://www.youtube.com', {
      timeout: 10000,
      headers: { 'User-Agent': BROWSER_UA }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const apiKey = data.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1] || '';
        const clientVersion = data.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] || '2.20250213.05.00';
        resolve({ apiKey, clientVersion });
      });
    }).on('error', () => resolve({ apiKey: '', clientVersion: '2.20250213.05.00' }));
  });
}

function checkVideoFallback(videoId) {
  return new Promise((resolve) => {
    const req = https.get('https://www.youtube.com/watch?v=' + videoId, {
      timeout: 12000,
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const status = data.match(/"playabilityStatus":\{[^}]*"status":"([^"]+)"/)?.[1] || '';
        const reason = data.match(/"reason":"([^"]+)"/)?.[1] || '';
        const unavailable = data.includes('Video tidak tersedia') || data.includes('This video is unavailable') || data.includes('Video unavailable');

        if (unavailable || status === 'ERROR' || status === 'UNPLAYABLE') {
          if (reason.includes('Login') || reason.includes('bot') || reason.includes('confirm')) {
            resolve({ dead: false, reason: 'RATE_LIMITED' });
          } else {
            resolve({ dead: true, reason: reason || status });
          }
        } else {
          resolve({ dead: false, reason: 'OK' });
        }
      });
    });
    req.on('error', () => resolve({ dead: false, reason: 'NET_ERROR' }));
    req.on('timeout', () => { req.destroy(); resolve({ dead: false, reason: 'TIMEOUT' }); });
  });
}

async function main() {
  console.log('Getting API credentials...');
  const creds = await getApiCredentials();

  const dir = 'src/data';
  const files = ['youtube.ts', 'youtube-smp7.ts', 'youtube-sma11.ts'];
  const urlEntries = new Map(); // url -> { sourceFile, title, topic }

  for (const f of files) {
    try {
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      const entryRegex = /{([^}]+)}/g;
      let match;
      while ((match = entryRegex.exec(content)) !== null) {
        const block = match[1];
        const url = block.match(/url:\s*["']([^"']+)["']/)?.[1];
        if (!url) continue;
        const title = block.match(/title:\s*["']([^"']+)["']/)?.[1] || '';
        // Already have unique URLs
      }
    } catch(e) { /* skip */ }
  }

  // Just extract unique URLs from each file
  const fileData = [];
  for (const f of files) {
    try {
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      const matches = [...content.matchAll(/https?:\/\/(?:www\.)?(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/g)];
      for (const m of matches) {
        urlEntries.set(m[0], { url: m[0], vidId: m[1], file: f });
      }
    } catch(e) { /* skip */ }
  }

  const urls = [...urlEntries.values()];
  console.log(`Total unique URLs: ${urls.length}`);
  console.log(`API key: ${creds.apiKey ? '✅' : '❌'} | Client version: ${creds.clientVersion}\n`);

  const results = [];
  const start = Date.now();

  for (let i = 0; i < urls.length; i++) {
    const { url, vidId, file } = urls[i];
    let result;

    // Try Innertube API first
    if (creds.apiKey) {
      result = await fetchInnertubePlayer(vidId, creds.apiKey, creds.clientVersion);
    } else {
      result = await checkVideoFallback(vidId);
    }

    // Fallback to HTML if Innertube rate-limited
    if (result.reason === 'RATE_LIMITED' || result.reason === 'PARSE_ERROR' || result.reason === 'TIMEOUT' || result.reason === 'NET_ERROR') {
      const fallback = await checkVideoFallback(vidId);
      if (fallback.dead) {
        fallback.reason = '*HTML* ' + fallback.reason;
        result = fallback;
      } else if (result.reason === 'RATE_LIMITED') {
        result.dead = false;
        result.reason = 'OK (API=RL, HTML=OK)';
      }
    }

    result.url = url;
    result.vidId = vidId;
    result.file = file;
    results.push(result);

    const pct = Math.round((i + 1) / urls.length * 100);
    const elapsed = Math.round((Date.now() - start) / 1000);
    const eta = (elapsed / (i + 1)) * (urls.length - i - 1);
    const deadCount = results.filter(r => r.dead).length;
    process.stdout.write(`\r${i + 1}/${urls.length} (${pct}%) — OK: ${results.filter(r => !r.dead).length} DEAD: ${deadCount} | ETA: ${Math.round(eta / 60)}m ${Math.round(eta % 60)}s   `);
  }

  console.log('\n\n=== SUMMARY ===');
  console.log(`Total checked: ${urls.length}`);
  console.log(`OK: ${results.filter(r => !r.dead).length}`);
  console.log(`DEAD: ${results.filter(r => r.dead).length}`);

  const deads = results.filter(r => r.dead);
  if (deads.length > 0) {
    console.log('\n=== DEAD VIDEOS ===');
    for (const d of deads) {
      console.log(`DEAD | ${d.reason} | [${d.file}] ${d.url}`);
    }

    fs.writeFileSync('dead-youtube.json', JSON.stringify(deads.map(d => ({
      vidId: d.vidId,
      url: d.url,
      reason: d.reason,
      file: d.file
    })), null, 2));
    console.log('\n✅ Saved to dead-youtube.json');
  } else {
    console.log('\n✅ Semua video sehat!');
  }

  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`Done in ${Math.round(elapsed / 60)}m ${elapsed % 60}s`);
}

main().catch(console.error);
