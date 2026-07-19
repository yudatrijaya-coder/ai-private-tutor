/**
 * fix-raihan2-youtube.cjs
 *
 * Populates YouTube URLs for Raihan SMP_1 curriculum (e94cf3dd-3fae-4fae-b28f-e7aa899d11e7)
 * - Fetches ALL materials where videoUrl IS NULL OR videoUrl NOT LIKE '%watch%'
 * - Groups by (subject, topic) to minimize API calls (50 groups for 69 materials)
 * - Uses YouTube Data API v3 with queries like "[topic] [subject] SMP Indonesia Kelas 7/8/9"
 * - Verifies via oEmbed
 * - Updates videoUrl for all materials in each group
 * - Saves progress and results for resumability
 */

const { Client } = require('pg');
const httpsLib = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const DB_CONFIG = {
  host: 'localhost',
  user: 'tutor',
  password: 'tutor123',
  database: 'ai_private_tutor',
};

const YOUTUBE_API_KEY = 'AIzaSyDoLUc4CO2oeRTR-fd2iu_0Elb11htyx0Q';
const CURRICULUM_ID = 'e94cf3dd-3fae-4fae-b28f-e7aa899d11e7';
const SCRIPT_DIR = path.dirname(__filename);
const PROGRESS_FILE = path.join(SCRIPT_DIR, 'fix-raihan2-youtube-progress.json');
const RESULTS_FILE = path.join(SCRIPT_DIR, 'fix-raihan2-youtube-results.json');

// Grade level for query construction
const GRADE = 'SMP'; // Maps to kelas 7/8/9

// Rate limiting
let lastApiCall = 0;
const API_DELAY_MS = 350; // ms between API calls

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rateLimitedCall() {
  const now = Date.now();
  const elapsed = now - lastApiCall;
  if (elapsed < API_DELAY_MS) {
    await sleep(API_DELAY_MS - elapsed);
  }
  lastApiCall = Date.now();
}

// HTTPS GET helper
function httpsGet(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const req = httpsLib.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.on('error', reject);
  });
}

// Build search query string
function buildSearchQuery(topic, subject) {
  const queries = [
    `${topic} ${subject} ${GRADE} Indonesia Kelas 7 8 9`,
    `${topic} ${subject} materi SMP Indonesia`,
    `${topic} ${subject} pelajaran kelas 7 8 9`,
  ];
  return queries;
}

// YouTube Data API v3 search
async function searchYouTube(topic, subject) {
  const searchQueries = buildSearchQuery(topic, subject);

  for (const rawQuery of searchQueries) {
    await rateLimitedCall();
    const encodedQuery = encodeURIComponent(rawQuery);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodedQuery}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`;

    try {
      const response = await httpsGet(url);
      const data = JSON.parse(response);

      if (data.error) {
        if (data.error.code === 403) {
          if (data.error.message && data.error.message.toLowerCase().includes('quota')) {
            return { quotaExceeded: true };
          }
          console.log(`  API error ${data.error.code}: ${data.error.message}, trying next query...`);
          continue;
        }
        if (data.error.code === 400) {
          console.log(`  Bad request, trying next query...`);
          continue;
        }
        console.error(`  YouTube API Error: ${data.error.message}`);
        continue;
      }

      if (!data.items || data.items.length === 0) {
        continue;
      }

      // Filter out Shorts and prefer Indonesian content
      const validVideos = data.items.filter(item => {
        const title = (item.snippet.title || '').toLowerCase();
        const channel = (item.snippet.channelTitle || '').toLowerCase();
        // Skip Shorts
        if (title.includes('shorts') || title.includes('#shorts')) return false;
        // Prefer Indonesian channels
        return true;
      });

      if (validVideos.length === 0) {
        continue;
      }

      const video = validVideos[0];
      return {
        videoId: video.id.videoId,
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
        url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
      };
    } catch (err) {
      console.error(`  Search error: ${err.message}, trying next query...`);
      continue;
    }
  }

  return null;
}

// oEmbed verification
async function verifyOEmbed(videoUrl) {
  try {
    const videoId = videoUrl.match(/(?:v=|youtu\.be\/)([^&]+)/)?.[1];
    if (!videoId) return false;
    const oembedUrl = `https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await httpsGet(oembedUrl, 8000);
    const data = JSON.parse(response);
    return data.title !== undefined;
  } catch (err) {
    return false;
  }
}

// Progress persistence
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    } catch {
      return { completed: [], failed: [], topicsCompleted: [] };
    }
  }
  return { completed: [], failed: [], topicsCompleted: [] };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function saveResults(results) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const fresh = args.includes('--fresh') || args.includes('-f');

  console.log('='.repeat(60));
  console.log(' Raihan SMP_1 YouTube URL Fixer — fix-raihan2-youtube.cjs');
  console.log('='.repeat(60));
  console.log(`Curriculum: ${CURRICULUM_ID}`);
  console.log(`API Key:    ${YOUTUBE_API_KEY.substring(0, 10)}...`);
  console.log(`Fresh mode: ${fresh ? 'ON' : 'OFF (resume from progress)'}`);
  console.log('');

  // Connect to DB
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('Connected to database\n');

  // Fetch materials needing YouTube URLs
  const materialsResult = await client.query(`
    SELECT id, "subject", topic, "subTopic", "videoUrl"
    FROM "Material"
    WHERE "curriculumId" = $1
      AND ("videoUrl" IS NULL OR "videoUrl" NOT LIKE '%watch%')
    ORDER BY "subject", topic
  `, [CURRICULUM_ID]);

  const materials = materialsResult.rows;
  console.log(`Found ${materials.length} materials needing YouTube URLs\n`);

  if (materials.length === 0) {
    console.log('All materials already have valid YouTube URLs!');
    await client.end();
    return;
  }

  // Load or reset progress
  const progress = loadProgress();
  if (fresh) {
    progress.completed = [];
    progress.failed = [];
    progress.topicsCompleted = [];
    saveProgress(progress);
    console.log('Fresh mode: cleared previous progress\n');
  }

  const completedTopics = new Set(progress.topicsCompleted);

  // Group by (subject, topic)
  const groups = new Map();
  for (const m of materials) {
    const key = `${m.subject}|${m.topic}`;
    if (!groups.has(key)) {
      groups.set(key, { subject: m.subject, topic: m.topic, materials: [] });
    }
    groups.get(key).materials.push(m);
  }

  // Filter out already-completed topics
  let groupsToProcess = [];
  let alreadyDone = 0;
  for (const [key, group] of groups) {
    if (completedTopics.has(key)) {
      alreadyDone++;
    } else {
      groupsToProcess.push([key, group]);
    }
  }

  console.log(`Total unique (subject, topic) groups: ${groups.size}`);
  console.log(`Already completed: ${alreadyDone}`);
  console.log(`Groups to process:  ${groupsToProcess.length}`);
  console.log('');
  console.log('-'.repeat(60));
  console.log('Processing...\n');

  const stats = {
    topicsProcessed: 0,
    topicsFailed: 0,
    materialsUpdated: 0,
    quotaExceeded: false,
    topics: [],
    errors: [],
  };

  for (const [key, group] of groupsToProcess) {
    const [subject, topic] = key.split('|');

    console.log(`[${stats.topicsProcessed + stats.topicsFailed + 1}/${groupsToProcess.length}] ${subject} — ${topic}`);
    console.log(`  Materials: ${group.materials.length}`);

    // Search YouTube
    const result = await searchYouTube(topic, subject);

    if (result?.quotaExceeded) {
      stats.quotaExceeded = true;
      console.log('\n  ⚠️  YouTube API quota exceeded!\n');
      break;
    }

    if (!result) {
      console.log(`  ✗ No YouTube result found\n`);
      stats.topicsFailed++;
      progress.failed.push({ subject, topic, materialIds: group.materials.map(m => m.id), reason: 'No search results' });
      saveProgress(progress);
      continue;
    }

    console.log(`  Title:   ${result.title}`);
    console.log(`  Channel: ${result.channel}`);
    console.log(`  URL:     ${result.url}`);

    // Verify via oEmbed
    const isValid = await verifyOEmbed(result.url);
    if (!isValid) {
      console.log(`  ✗ oEmbed verification failed\n`);
      stats.topicsFailed++;
      progress.failed.push({ subject, topic, materialIds: group.materials.map(m => m.id), reason: 'oEmbed verification failed' });
      saveProgress(progress);
      continue;
    }
    console.log(`  ✓ oEmbed verified`);

    // Update all materials in this group
    let updated = 0;
    for (const m of group.materials) {
      try {
        await client.query(
          `UPDATE "Material" SET "videoUrl" = $1, "updatedAt" = NOW() WHERE id = $2`,
          [result.url, m.id]
        );
        progress.completed.push({ id: m.id, subject, topic, url: result.url, title: result.title });
        updated++;
      } catch (err) {
        console.error(`    Failed to update material ${m.id}: ${err.message}`);
        stats.errors.push({ materialId: m.id, error: err.message });
      }
    }

    progress.topicsCompleted.push(key);
    stats.topicsProcessed++;
    stats.materialsUpdated += updated;
    stats.topics.push({ subject, topic, url: result.url, title: result.title, materialsUpdated: updated });

    console.log(`  ✓ Updated ${updated} material(s)\n`);
    saveProgress(progress);

    // Brief pause between groups
    await sleep(80);
  }

  // Final summary
  const remaining = groupsToProcess.length - stats.topicsProcessed - stats.topicsFailed;
  console.log('='.repeat(60));
  console.log(' SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Materials needing URLs:    ${materials.length}`);
  console.log(`  Unique (subject,topic) groups: ${groups.size}`);
  console.log(`  Topics processed:        ${stats.topicsProcessed}`);
  console.log(`  Topics failed:            ${stats.topicsFailed}`);
  console.log(`  Materials updated:        ${stats.materialsUpdated}`);
  console.log(`  Topics remaining:         ${remaining}`);
  if (stats.errors.length > 0) {
    console.log(`  Update errors:           ${stats.errors.length}`);
  }
  console.log('');

  if (stats.topicsFailed > 0) {
    console.log('Failed topics:');
    for (const f of progress.failed) {
      console.log(`  - ${f.subject} | ${f.topic} (${f.materialIds.length} materials) — ${f.reason}`);
    }
    console.log('');
  }

  // Save results
  saveResults({
    timestamp: new Date().toISOString(),
    curriculumId: CURRICULUM_ID,
    apiKeyPrefix: YOUTUBE_API_KEY.substring(0, 10) + '...',
    summary: {
      totalMaterialsNeedingUrls: materials.length,
      totalUniqueGroups: groups.size,
      topicsProcessed: stats.topicsProcessed,
      topicsFailed: stats.topicsFailed,
      materialsUpdated: stats.materialsUpdated,
      topicsRemaining: remaining,
      quotaExceeded: stats.quotaExceeded,
    },
    topics: stats.topics,
    failed: progress.failed,
    errors: stats.errors,
    progress,
  });

  console.log(`Results:  ${RESULTS_FILE}`);
  console.log(`Progress: ${PROGRESS_FILE}`);

  if (stats.quotaExceeded) {
    console.log('\n📌 Quota exceeded. Run again (no --fresh) to resume.');
  } else if (remaining > 0) {
    console.log('\n📌 Some topics failed. Run again (no --fresh) to retry failed topics.');
  } else {
    console.log('\n✅ All done!');
  }

  await client.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
