/**
 * fix-raihan-youtube-v2.cjs
 * 
 * Resumes YouTube population for Raihan SMP curriculum (a61bcc63-7c88-41bb-9425-658b5fbf3fa3)
 * with NEW API key: AIzaSyDoLUc4CO2oeRTR-fd2iu_0Elb11htyx0Q
 * 
 * - Fetches ALL materials where videoUrl IS NULL OR videoUrl NOT LIKE '%watch%'
 * - Groups by (subject, topic) to minimize API calls
 * - Uses improved search queries: "[topic] [subject] SMP Indonesia Kelas 7/8/9"
 * - Verifies via oEmbed
 * - Updates videoUrl for all materials in each group
 */

const { Client } = require('pg');
const httpsLib = require('https');
const fs = require('fs');

// Configuration
const DB_CONFIG = {
  host: 'localhost',
  user: 'tutor',
  password: 'tutor123',
  database: 'ai_private_tutor',
};

const YOUTUBE_API_KEY = 'AIzaSyDoLUc4CO2oeRTR-fd2iu_0Elb11htyx0Q';
const CURRICULUM_ID = 'a61bcc63-7c88-41bb-9425-658b5fbf3fa3';
const PROGRESS_FILE = '/home/ubuntu/ai-private-tutor/scripts/fix-raihan-youtube-v2-progress.json';
const RESULTS_FILE = '/home/ubuntu/ai-private-tutor/scripts/fix-raihan-youtube-v2-results.json';

// Rate limiting
let lastApiCall = 0;
const API_DELAY_MS = 350; // 100 req/sec limit, be safe

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rateLimitedApiCall() {
  const now = Date.now();
  const elapsed = now - lastApiCall;
  if (elapsed < API_DELAY_MS) {
    await sleep(API_DELAY_MS - elapsed);
  }
  lastApiCall = Date.now();
}

// Fetch with HTTPS
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

// YouTube Search API v3
async function searchYouTube(query, subject) {
  await rateLimitedApiCall();
  
  // Improved search query: [topic] [subject] SMP Indonesia Kelas 7/8/9
  const searchQueries = [
    `${query} ${subject} SMP Indonesia`,
    `${query} ${subject} kelas 7 8 9`,
    `${query} materi SMP Indonesia`,
  ];
  
  for (const searchQuery of searchQueries) {
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodedQuery}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`;
    
    try {
      const response = await httpsGet(url);
      const data = JSON.parse(response);
      
      if (data.error) {
        if (data.error.code === 403) {
          if (data.error.message.includes('quota')) {
            return { quotaExceeded: true };
          }
          // Try alternative query on auth error
          console.log(`  API auth issue, trying alternative...`);
          continue;
        }
        console.error(`  YouTube API Error: ${data.error.message}`);
        continue;
      }
      
      if (data.items && data.items.length > 0) {
        // Find best matching video (prefer Indonesian channels, skip shorts)
        const validVideos = data.items.filter(item => {
          const title = (item.snippet.title || '').toLowerCase();
          // Skip Shorts
          return !title.includes('shorts') && !title.includes('#shorts');
        });
        
        if (validVideos.length > 0) {
          const video = validVideos[0];
          return {
            videoId: video.id.videoId,
            title: video.snippet.title,
            channel: video.snippet.channelTitle,
            url: `https://www.youtube.com/watch?v=${video.id.videoId}`
          };
        }
      }
    } catch (err) {
      console.error(`  Search failed: ${err.message}`);
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
    const response = await httpsGet(oembedUrl);
    const data = JSON.parse(response);
    
    return data.title !== undefined;
  } catch (err) {
    return false;
  }
}

// Load or create progress
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  }
  return { completed: [], failed: [], topicsCompleted: [] };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// Save results
function saveResults(results) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

// Main processing
async function main() {
  const args = process.argv.slice(2);
  const fresh = args.includes('--fresh') || args.includes('-f');
  
  console.log('=== Raihan SMP YouTube URL Fixer v2 ===\n');
  console.log(`Fresh mode: ${fresh ? 'ON (ignore previous progress)' : 'OFF (resume)'}\n`);
  console.log(`API Key: ${YOUTUBE_API_KEY.substring(0, 10)}...\n`);
  
  // Connect to database
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('Connected to database\n');
  
  // Fetch ALL materials where videoUrl IS NULL OR videoUrl NOT LIKE '%watch%'
  const materialsQuery = `
    SELECT id, topic, "subTopic", "videoUrl", "subject"
    FROM "Material"
    WHERE "curriculumId" = $1
      AND ("videoUrl" IS NULL OR "videoUrl" NOT LIKE '%watch%')
    ORDER BY "subject", topic
  `;
  
  const result = await client.query(materialsQuery, [CURRICULUM_ID]);
  const materials = result.rows;
  console.log(`Found ${materials.length} materials needing YouTube URLs\n`);
  
  if (materials.length === 0) {
    console.log('All materials already have valid YouTube URLs!');
    await client.end();
    return;
  }
  
  // Load progress
  const progress = loadProgress();
  
  // Clear progress if fresh mode
  if (fresh) {
    progress.completed = [];
    progress.failed = [];
    progress.topicsCompleted = [];
    console.log('Cleared previous progress (fresh mode)\n');
  }
  
  // Filter out already completed topics
  const completedTopics = new Set(progress.topicsCompleted);
  const topicsNeedingWork = materials.filter(m => !completedTopics.has(`${m.subject}|${m.topic}`));
  
  console.log(`Topics already completed: ${completedTopics.size}`);
  console.log(`Topics remaining: ${topicsNeedingWork.length}\n`);
  
  // Group by (subject, topic) to minimize API calls
  const groupedTopics = new Map();
  for (const m of topicsNeedingWork) {
    const key = `${m.subject}|${m.topic}`;
    if (!groupedTopics.has(key)) {
      groupedTopics.set(key, {
        subject: m.subject,
        topic: m.topic,
        materials: []
      });
    }
    groupedTopics.get(key).materials.push(m);
  }
  
  console.log(`Unique (subject, topic) groups: ${groupedTopics.size}\n`);
  console.log('--- Processing ---\n');
  
  let processed = 0;
  let quotaExceeded = false;
  const stats = {
    topicsProcessed: 0,
    topicsFailed: 0,
    materialsUpdated: 0,
    topics: []
  };
  
  for (const [key, group] of groupedTopics) {
    if (quotaExceeded) {
      console.log('\n⚠️  Quota exceeded. Use --fresh to restart later.');
      break;
    }
    
    processed++;
    const topicKey = `${group.subject}|${group.topic}`;
    
    console.log(`[${processed}/${groupedTopics.size}] ${group.subject} - ${group.topic}`);
    console.log(`  Materials to update: ${group.materials.length}`);
    
    // Search YouTube with improved query
    const youtubeResult = await searchYouTube(group.topic, group.subject);
    
    if (youtubeResult?.quotaExceeded) {
      quotaExceeded = true;
      console.log('  ⚠️  YouTube API quota exceeded\n');
      break;
    }
    
    if (!youtubeResult) {
      console.log(`  ✗ No YouTube result found\n`);
      progress.failed.push({
        subject: group.subject,
        topic: group.topic,
        materialIds: group.materials.map(m => m.id),
        reason: 'No search results'
      });
      stats.topicsFailed++;
      saveProgress(progress);
      continue;
    }
    
    console.log(`  Found: ${youtubeResult.title}`);
    console.log(`  Channel: ${youtubeResult.channel}`);
    console.log(`  URL: ${youtubeResult.url}`);
    
    // Verify with oEmbed
    const isValid = await verifyOEmbed(youtubeResult.url);
    
    if (!isValid) {
      console.log(`  ✗ oEmbed verification failed\n`);
      progress.failed.push({
        subject: group.subject,
        topic: group.topic,
        materialIds: group.materials.map(m => m.id),
        reason: 'oEmbed verification failed'
      });
      stats.topicsFailed++;
      saveProgress(progress);
      continue;
    }
    
    console.log(`  ✓ oEmbed verified`);
    
    // Update all materials with this subject/topic
    for (const m of group.materials) {
      await client.query(
        'UPDATE "Material" SET "videoUrl" = $1, "updatedAt" = NOW() WHERE id = $2',
        [youtubeResult.url, m.id]
      );
      progress.completed.push({
        id: m.id,
        subject: m.subject,
        topic: m.topic,
        url: youtubeResult.url,
        title: youtubeResult.title
      });
      stats.materialsUpdated++;
    }
    
    progress.topicsCompleted.push(topicKey);
    stats.topicsProcessed++;
    stats.topics.push({
      subject: group.subject,
      topic: group.topic,
      url: youtubeResult.url,
      title: youtubeResult.title,
      materialsUpdated: group.materials.length
    });
    
    console.log(`  ✓ Updated ${group.materials.length} material(s)\n`);
    saveProgress(progress);
    
    // Small delay between batches
    await sleep(100);
  }
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total materials needing URLs: ${materials.length}`);
  console.log(`Topics processed: ${stats.topicsProcessed}`);
  console.log(`Topics failed: ${stats.topicsFailed}`);
  console.log(`Materials updated: ${stats.materialsUpdated}`);
  console.log(`Topics remaining: ${groupedTopics.size - stats.topicsProcessed - stats.topicsFailed}`);
  
  // Save final results
  saveResults({
    timestamp: new Date().toISOString(),
    curriculumId: CURRICULUM_ID,
    apiKeyUsed: YOUTUBE_API_KEY.substring(0, 10) + '...',
    summary: {
      totalMaterialsNeedingUrls: materials.length,
      topicsProcessed: stats.topicsProcessed,
      topicsFailed: stats.topicsFailed,
      materialsUpdated: stats.materialsUpdated,
      topicsRemaining: groupedTopics.size - stats.topicsProcessed - stats.topicsFailed
    },
    topics: stats.topics,
    progress
  });
  
  console.log(`\nResults saved to: ${RESULTS_FILE}`);
  console.log(`Progress saved to: ${PROGRESS_FILE}`);
  
  if (quotaExceeded) {
    console.log('\n📌 Quota exceeded. To continue, run again (will resume from last topic):');
    console.log('   node scripts/fix-raihan-youtube-v2.cjs');
  }
  
  await client.end();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
