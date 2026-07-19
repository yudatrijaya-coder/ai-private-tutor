/**
 * fix-raihan-youtube.cjs
 * 
 * Populates YouTube URLs for Raihan SMP curriculum (a61bcc63-7c88-41bb-9425-658b5fbf3fa3)
 * - Fetches all materials with non-URL videoUrl
 * - Searches YouTube Data API v3 for each unique topic
 * - Verifies via oEmbed
 * - Updates videoUrl in database
 * - Saves progress for resumability
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
const PROGRESS_FILE = '/home/ubuntu/ai-private-tutor/scripts/fix-raihan-youtube-progress.json';

// Rate limiting
let lastApiCall = 0;
const API_DELAY_MS = 300; // 100 req/sec limit, be safe

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
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    httpsLib.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// YouTube Search API v3
async function searchYouTube(query) {
  await rateLimitedApiCall();
  
  const searchQuery = `${query} kelas 7 SMP Indonesia`;
  const encodedQuery = encodeURIComponent(searchQuery);
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodedQuery}&type=video&maxResults=3&key=${YOUTUBE_API_KEY}`;
  
  try {
    const response = await httpsGet(url);
    const data = JSON.parse(response);
    
    if (data.error) {
      if (data.error.code === 403 && data.error.message.includes('quota')) {
        return { quotaExceeded: true };
      }
      console.error(`  YouTube API Error: ${data.error.message}`);
      return null;
    }
    
    if (data.items && data.items.length > 0) {
      const video = data.items[0];
      return {
        videoId: video.id.videoId,
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
        url: `https://www.youtube.com/watch?v=${video.id.videoId}`
      };
    }
    return null;
  } catch (err) {
    console.error(`  YouTube search failed: ${err.message}`);
    return null;
  }
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
  return { completed: [], failed: [] };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// Main processing
async function main() {
  const args = process.argv.slice(2);
  const resume = args.includes('--resume') || args.includes('-r');
  
  console.log('=== Raihan SMP YouTube URL Fixer ===\n');
  console.log(`Resume mode: ${resume ? 'ON' : 'OFF'}\n`);
  
  // Connect to database
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('Connected to database\n');
  
  // Fetch all materials from Raihan SMP curriculum
  const materialsQuery = `
    SELECT id, topic, "subTopic", "videoUrl", "subject"
    FROM "Material"
    WHERE "curriculumId" = $1
  `;
  
  const result = await client.query(materialsQuery, [CURRICULUM_ID]);
  const materials = result.rows;
  console.log(`Found ${materials.length} materials in curriculum\n`);
  
  // Identify materials needing YouTube URLs
  const needsFix = materials.filter(m => {
    const v = m.videoUrl || '';
    return !v.startsWith('http');
  });
  
  console.log(`Materials needing YouTube URLs: ${needsFix.length}\n`);
  
  // Load progress
  const progress = loadProgress();
  
  // Filter out already completed materials
  const completedIds = new Set(progress.completed.map(c => c.id));
  const toProcess = needsFix.filter(m => !completedIds.has(m.id));
  
  console.log(`Already completed: ${completedIds.size}`);
  console.log(`Remaining to process: ${toProcess.length}\n`);
  
  if (toProcess.length === 0) {
    console.log('All materials have been processed!');
    await client.end();
    return;
  }
  
  // Group by unique topic+subtopic combinations
  const uniqueTopics = new Map();
  for (const m of toProcess) {
    const key = `${m.topic}|${m.subTopic}`;
    if (!uniqueTopics.has(key)) {
      uniqueTopics.set(key, []);
    }
    uniqueTopics.get(key).push(m);
  }
  
  console.log(`Unique topics to search: ${uniqueTopics.size}\n`);
  console.log('--- Processing ---\n');
  
  let processed = 0;
  let quotaExceeded = false;
  
  for (const [key, materialGroup] of uniqueTopics) {
    if (quotaExceeded) {
      console.log('\n⚠️  Quota exceeded. Use --resume flag to continue later.');
      break;
    }
    
    const [topic, subTopic] = key.split('|');
    processed++;
    
    console.log(`[${processed}/${uniqueTopics.size}] ${topic} - ${subTopic}`);
    
    // Search YouTube
    const searchTerm = subTopic || topic;
    const youtubeResult = await searchYouTube(searchTerm);
    
    if (youtubeResult?.quotaExceeded) {
      quotaExceeded = true;
      console.log('  ⚠️  YouTube API quota exceeded\n');
      continue;
    }
    
    if (!youtubeResult) {
      console.log(`  ✗ No YouTube result found\n`);
      progress.failed.push({ 
        id: materialGroup[0].id, 
        topic: materialGroup[0].topic, 
        subTopic: materialGroup[0].subTopic, 
        reason: 'No search results' 
      });
      saveProgress(progress);
      continue;
    }
    
    console.log(`  Found: ${youtubeResult.title}`);
    console.log(`  URL: ${youtubeResult.url}`);
    
    // Verify with oEmbed
    const isValid = await verifyOEmbed(youtubeResult.url);
    
    if (!isValid) {
      console.log(`  ✗ oEmbed verification failed\n`);
      progress.failed.push({ 
        id: materialGroup[0].id, 
        topic: materialGroup[0].topic, 
        subTopic: materialGroup[0].subTopic, 
        reason: 'oEmbed verification failed' 
      });
      saveProgress(progress);
      continue;
    }
    
    console.log(`  ✓ oEmbed verified`);
    
    // Update all materials with this topic/subtopic combination
    for (const m of materialGroup) {
      await client.query(
        'UPDATE "Material" SET "videoUrl" = $1, "updatedAt" = NOW() WHERE id = $2',
        [youtubeResult.url, m.id]
      );
      progress.completed.push({ 
        id: m.id, 
        topic: m.topic, 
        subTopic: m.subTopic, 
        url: youtubeResult.url,
        title: youtubeResult.title
      });
    }
    
    console.log(`  ✓ Updated ${materialGroup.length} material(s)\n`);
    saveProgress(progress);
    
    // Small delay between batches
    await sleep(100);
  }
  
  // Summary
  const totalProcessed = progress.completed.length;
  const totalFailed = progress.failed.length;
  
  console.log('\n=== Summary ===');
  console.log(`Total materials in curriculum: ${materials.length}`);
  console.log(`Successfully updated: ${totalProcessed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Remaining to process: ${needsFix.length - totalProcessed - totalFailed}`);
  
  // Save final results
  const outputFile = '/home/ubuntu/ai-private-tutor/scripts/fix-raihan-youtube-results.json';
  fs.writeFileSync(outputFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    curriculumId: CURRICULUM_ID,
    summary: {
      total: materials.length,
      updated: totalProcessed,
      failed: totalFailed,
      remaining: needsFix.length - totalProcessed - totalFailed
    },
    progress
  }, null, 2));
  
  console.log(`\nResults saved to: ${outputFile}`);
  console.log(`Progress saved to: ${PROGRESS_FILE}`);
  
  if (quotaExceeded || needsFix.length - totalProcessed - totalFailed > 0) {
    console.log('\n📌 To continue later, run:');
    console.log(`   node scripts/fix-raihan-youtube.cjs --resume`);
  }
  
  await client.end();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
