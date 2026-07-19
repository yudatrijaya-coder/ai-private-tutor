/**
 * Fix YouTube URLs for ALL materials that have broken search-links
 * Instead of real watch URLs (youtube.com/results?search_query=...)
 * 
 * DB: PostgreSQL at localhost:5432, user=tutor, password=tutor123, database=ai_private_tutor
 * YouTube API: AIzaSyDoLUc4CO2oeRTR-fd2iu_0Elb11htyx0Q
 */

const { Client } = require('pg');
const https = require('https');

// Configuration
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'tutor',
  password: 'tutor123',
  database: 'ai_private_tutor'
};

const YOUTUBE_API_KEY = 'AIzaSyDoLUc4CO2oeRTR-fd2iu_0Elb11htyx0Q';

// Subject to search query mappings (Indonesian curriculum)
const SUBJECT_QUERY_MAP = {
  'IPAS': {
    grades: ['SD_5'],
    queries: ['IPA SD Kelas 4', 'IPA SD Kelas 5', 'IPA SD Kelas 6']
  },
  'Matematika': {
    grades: ['SMA_2'],
    queries: ['Matematika SMA Kelas 10', 'Matematika SMA Kelas 11', 'Matematika SMA Kelas 12']
  },
  'Bahasa Indonesia': {
    grades: ['SD_5', 'SMP_1', 'SMA_2'],
    queries: ['Bahasa Indonesia SD Kelas 4', 'Bahasa Indonesia SMP Kelas 7', 'Bahasa Indonesia SMA Kelas 10']
  },
  'PJOK': {
    grades: ['SD_5', 'SMP_1', 'SMA_2'],
    queries: ['PJOK SD Kelas 4', 'PJOK SMP Kelas 7', 'PJOK SMA Kelas 10']
  },
  'Informatika': {
    grades: ['SMP_1', 'SMA_2'],
    queries: ['Informatika SMP Kelas 7', 'Informatika SMA Kelas 10']
  },
  'Pendidikan Pancasila': {
    grades: ['SD_5', 'SMP_1', 'SMA_2'],
    queries: ['Pendidikan Pancasila SD Kelas 4', 'Pendidikan Pancasila SMP Kelas 7', 'Pendidikan Pancasila SMA Kelas 10']
  },
  'Bahasa Inggris': {
    grades: ['SD_5', 'SMP_1', 'SMA_2'],
    queries: ['Bahasa Inggris SD Kelas 4', 'Bahasa Inggris SMP Kelas 7', 'Bahasa Inggris SMA Kelas 10']
  },
  'Bahasa Mandarin': {
    grades: ['SMA_2'],
    queries: ['Bahasa Mandarin SMA Kelas 10', 'Bahasa Mandarin SMA Kelas 11', 'Bahasa Mandarin SMA Kelas 12']
  },
  'Matematika Penalaran': {
    grades: ['SMA_2'],
    queries: ['Matematika Penalaran SMA Indonesia']
  },
  'Biologi': {
    grades: ['SMA_2'],
    queries: ['Biologi SMA Kelas 10', 'Biologi SMA Kelas 11', 'Biologi SMA Kelas 12']
  },
  'Fisika': {
    grades: ['SMA_2'],
    queries: ['Fisika SMA Kelas 10', 'Fisika SMA Kelas 11', 'Fisika SMA Kelas 12']
  },
  'Bahasa Inggris Tingkat Lanjutan': {
    grades: ['SMA_2'],
    queries: ['Bahasa Inggris SMA Kelas 11', 'Bahasa Inggris SMA Kelas 12']
  }
};

// YouTube API helper
function searchYouTube(query) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: '5',
      key: YOUTUBE_API_KEY
    });

    const options = {
      hostname: 'www.googleapis.com',
      path: `/youtube/v3/search?${params.toString()}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.error) {
            console.log(`  [API Error] ${result.error.message}`);
            resolve([]);
          } else {
            resolve(result.items || []);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('YouTube API timeout'));
    });
    req.end();
  });
}

// Verify video via oEmbed
function verifyVideo(videoId) {
  return new Promise((resolve) => {
    const url = `https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`;
    
    https.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const info = JSON.parse(data);
            resolve({ valid: true, title: info.title });
          } catch {
            resolve({ valid: false, title: null });
          }
        } else {
          resolve({ valid: false, title: null });
        }
      });
    }).on('error', () => {
      resolve({ valid: false, title: null });
    }).on('timeout', () => {
      resolve({ valid: false, title: null });
    });
  });
}

// Sleep helper for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main execution
async function main() {
  console.log('=== YouTube URL Fix Script ===\n');
  
  const db = new Client(DB_CONFIG);
  
  try {
    await db.connect();
    console.log('Connected to PostgreSQL database\n');

    // Step 1: Find all materials with broken YouTube URLs
    console.log('Step 1: Finding materials with broken YouTube URLs...');
    
    const brokenUrlPattern = '%youtube.com/results%';
    const result = await db.query(`
      SELECT id, "subject", topic, "gradeLevel", "videoUrl"
      FROM "Material"
      WHERE "videoUrl" IS NOT NULL
        AND (
          "videoUrl" LIKE $1
          OR "videoUrl" LIKE '%youtube.com/search%'
          OR "videoUrl" LIKE '%youtu.be/%'
          OR "videoUrl" = ''
          OR "videoUrl" = 'null'
        )
      ORDER BY "subject", topic
    `, [brokenUrlPattern]);

    const materials = result.rows;
    console.log(`Found ${materials.length} materials with broken YouTube URLs\n`);

    if (materials.length === 0) {
      console.log('No materials with broken URLs found!');
      return;
    }

    // Step 2: Group by (subject, topic)
    const grouped = {};
    for (const m of materials) {
      const key = `${m.subject}|${m.topic}`;
      if (!grouped[key]) {
        grouped[key] = {
          subject: m.subject,
          topic: m.topic,
          gradeLevel: m.gradeLevel,
          materials: []
        };
      }
      grouped[key].materials.push(m.id);
    }

    const uniqueGroups = Object.values(grouped);
    console.log(`Step 2: Grouped into ${uniqueGroups.length} unique (subject, topic) combinations\n`);

    // Step 3: Process each group
    console.log('Step 3: Processing each unique topic...\n');
    
    const stats = {
      processed: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      results: [],
      failures: []
    };

    for (const group of uniqueGroups) {
      stats.processed++;
      
      console.log(`[${stats.processed}/${uniqueGroups.length}] ${group.subject} - ${group.topic}`);
      
      // Build search query
      let searchQuery;
      if (SUBJECT_QUERY_MAP[group.subject]) {
        const subjectConfig = SUBJECT_QUERY_MAP[group.subject];
        // Use the first query template as base
        searchQuery = `${group.topic} ${subjectConfig.queries[0]} Indonesia`;
      } else {
        // Fallback
        searchQuery = `${group.topic} ${group.subject} Indonesia SMA SMP SD`;
      }

      console.log(`  Query: "${searchQuery}"`);

      // Search YouTube
      let videoId = null;
      let videoTitle = null;
      
      try {
        const results = await searchYouTube(searchQuery);
        
        if (results.length === 0) {
          // Try simpler query without "Indonesia"
          console.log('  No results, trying simpler query...');
          const simpleQuery = `${group.topic} ${group.subject}`;
          const simpleResults = await searchYouTube(simpleQuery);
          
          if (simpleResults.length > 0) {
            console.log(`  Found ${simpleResults.length} results with simple query`);
          }
        }

        // Find first valid video
        for (const item of results) {
          if (item.id && item.id.videoId) {
            const verification = await verifyVideo(item.id.videoId);
            if (verification.valid) {
              videoId = item.id.videoId;
              videoTitle = verification.title;
              console.log(`  Found valid video: ${videoId} - "${videoTitle}"`);
              break;
            }
          }
        }

        // Rate limit
        await sleep(500);

      } catch (err) {
        console.log(`  Error searching: ${err.message}`);
      }

      // Step 4: Update all materials in this group
      if (videoId) {
        const watchUrl = `http://www.youtube.com/watch?v=${videoId}`;
        
        try {
          const updateResult = await db.query(`
            UPDATE "Material"
            SET "videoUrl" = $1, "updatedAt" = NOW()
            WHERE id = ANY($2)
            RETURNING id
          `, [watchUrl, group.materials]);

          stats.updated += updateResult.rowCount;
          
          stats.results.push({
            subject: group.subject,
            topic: group.topic,
            videoId,
            videoTitle,
            materialsUpdated: updateResult.rowCount
          });

          console.log(`  Updated ${updateResult.rowCount} materials with ${watchUrl}\n`);

        } catch (err) {
          console.log(`  Error updating: ${err.message}\n`);
          stats.failed += group.materials.length;
          stats.failures.push({
            subject: group.subject,
            topic: group.topic,
            error: err.message
          });
        }
      } else {
        stats.failed += group.materials.length;
        stats.failures.push({
          subject: group.subject,
          topic: group.topic,
          materials: group.materials.length
        });
        console.log(`  FAILED: No valid video found\n`);
      }
    }

    // Final Report
    console.log('\n=== FINAL REPORT ===\n');
    console.log(`Total unique topics processed: ${stats.processed}`);
    console.log(`Total materials updated: ${stats.updated}`);
    console.log(`Total materials failed: ${stats.failed}`);
    console.log(`\n=== SAMPLE RESULTS ===\n`);
    
    for (const r of stats.results.slice(0, 10)) {
      console.log(`✓ ${r.subject} - ${r.topic}`);
      console.log(`  Video: http://www.youtube.com/watch?v=${r.videoId}`);
      console.log(`  Title: "${r.videoTitle}"`);
      console.log(`  Updated: ${r.materialsUpdated} material(s)\n`);
    }

    if (stats.failures.length > 0) {
      console.log('\n=== FAILED TOPICS (no video found) ===\n');
      for (const f of stats.failures) {
        console.log(`✗ ${f.subject} - ${f.topic} (${f.materials || f.error})`);
      }
    }

    // Save results to file
    const fs = require('fs');
    const outputPath = '/home/ubuntu/ai-private-tutor/scripts/youtube-fix-results.json';
    fs.writeFileSync(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      stats,
      summary: {
        topicsProcessed: stats.processed,
        materialsUpdated: stats.updated,
        materialsFailed: stats.failed
      }
    }, null, 2));
    console.log(`\nResults saved to: ${outputPath}`);

  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await db.end();
  }
}

main().catch(console.error);
