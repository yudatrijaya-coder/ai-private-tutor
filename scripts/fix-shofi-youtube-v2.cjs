/**
 * Fix YouTube URLs for SHOFI SMA Curriculum materials - V2
 * Finds materials where videoUrl IS NULL OR videoUrl NOT LIKE '%watch%'
 * Groups by (subject, topic) to minimize YouTube API calls
 * 
 * DB: PostgreSQL at localhost:5432, user=tutor, password=tutor123, database=ai_private_tutor
 * YouTube API: AIzaSyDoLUc4CO2oeRTR-fd2iu_0Elb11htyx0Q
 * oEmbed: https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v={id}&format=json
 * Curriculum: 98f0274e-4e39-45f5-9c79-3632c5717b27 (SHOFI SMA)
 */

const { Client } = require('pg');
const https = require('https');
const fs = require('fs');

// Configuration
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'tutor',
  password: 'tutor123',
  database: 'ai_private_tutor'
};

const YOUTUBE_API_KEY = 'AIzaSyDoLUc4CO2oeRTR-fd2iu_0Elb11htyx0Q';
const CURRICULUM_ID = '98f0274e-4e39-45f5-9c79-3632c5717b27';

// Grade-appropriate query templates per subject
const SUBJECT_GRADE_QUERIES = {
  'Bahasa Indonesia': {
    base: 'Bahasa Indonesia SMA',
    grades: ['Kelas 10', 'Kelas 11', 'Kelas 12']
  },
  'Bahasa Inggris': {
    base: 'Bahasa Inggris SMA',
    grades: ['Kelas 10', 'Kelas 11', 'Kelas 12']
  },
  'Ekonomi': {
    base: 'Ekonomi SMA',
    grades: ['Kelas 10', 'Kelas 11', 'Kelas 12']
  },
  'Geografi': {
    base: 'Geografi SMA',
    grades: ['Kelas 10', 'Kelas 11', 'Kelas 12']
  },
  'Informatika': {
    base: 'Informatika SMA',
    grades: ['Kelas 10', 'Kelas 11', 'Kelas 12']
  },
  'Matematika': {
    base: 'Matematika SMA',
    grades: ['Kelas 10', 'Kelas 11', 'Kelas 12']
  },
  'Matematika Tingkat Lanjut': {
    base: 'Matematika Tingkat Lanjut SMA',
    grades: ['Kelas 11', 'Kelas 12']
  },
  'Matematika Penalaran': {
    base: 'Matematika Penalaran SMA',
    grades: ['Kelas 10', 'Kelas 11', 'Kelas 12']
  },
  'Pendidikan Pancasila': {
    base: 'Pendidikan Pancasila SMA',
    grades: ['Kelas 10', 'Kelas 11', 'Kelas 12']
  },
  'PJOK': {
    base: 'PJOK SMA',
    grades: ['Kelas 10', 'Kelas 11', 'Kelas 12']
  },
  'Sosiologi': {
    base: 'Sosiologi SMA',
    grades: ['Kelas 10', 'Kelas 11', 'Kelas 12']
  }
};

// YouTube Data API v3 search
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
  console.log('=== SHOFI SMA YouTube URL Fix Script V2 ===\n');
  console.log(`Curriculum: ${CURRICULUM_ID}`);
  console.log(`YouTube API Key: ${YOUTUBE_API_KEY.substring(0, 10)}...\n`);
  
  const db = new Client(DB_CONFIG);
  
  try {
    await db.connect();
    console.log('Connected to PostgreSQL database\n');

    // Step 1: Find all SHOFI SMA materials with NULL or invalid videoUrl
    console.log('Step 1: Finding SHOFI SMA materials with NULL/invalid videoUrl...');
    
    const result = await db.query(`
      SELECT id, subject, topic, "gradeLevel", "videoUrl"
      FROM "Material"
      WHERE "curriculumId" = $1
        AND ("videoUrl" IS NULL OR "videoUrl" NOT LIKE '%watch%')
      ORDER BY subject, topic, "gradeLevel"
    `, [CURRICULUM_ID]);

    const materials = result.rows;
    console.log(`Found ${materials.length} materials needing video URLs\n`);

    if (materials.length === 0) {
      console.log('No materials needing video URLs found!');
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
      groupsTotal: uniqueGroups.length,
      updated: 0,
      failed: 0,
      results: [],
      failures: []
    };

    for (const group of uniqueGroups) {
      stats.processed++;
      
      console.log(`[${stats.processed}/${uniqueGroups.length}] ${group.subject} - ${group.topic}`);
      console.log(`  Materials: ${group.materials.length}`);
      
      // Build search query - use grade-appropriate queries
      let searchQuery;
      const subjectConfig = SUBJECT_GRADE_QUERIES[group.subject];
      
      if (subjectConfig) {
        // Use topic + subject + grade query
        const gradeQuery = subjectConfig.grades[Math.floor(Math.random() * subjectConfig.grades.length)];
        searchQuery = `${group.topic} ${subjectConfig.base} Indonesia ${gradeQuery}`;
      } else {
        // Fallback - no specific config
        searchQuery = `${group.topic} ${group.subject} SMA Indonesia`;
      }

      console.log(`  Query: "${searchQuery}"`);

      // Search YouTube
      let videoId = null;
      let videoTitle = null;
      
      try {
        const results = await searchYouTube(searchQuery);
        
        if (results.length === 0) {
          // Try simpler query
          console.log('  No results, trying simpler query...');
          const simpleQuery = `${group.topic} ${group.subject}`;
          const simpleResults = await searchYouTube(simpleQuery);
          
          if (simpleResults.length > 0) {
            console.log(`  Found ${simpleResults.length} results with simple query`);
            results.push(...simpleResults);
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

        // Rate limit between API calls
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
    console.log('=== FINAL REPORT ===\n');
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
    const outputPath = '/home/ubuntu/ai-private-tutor/scripts/fix-shofi-youtube-v2-results.json';
    fs.writeFileSync(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      curriculumId: CURRICULUM_ID,
      apiKeyUsed: YOUTUBE_API_KEY.substring(0, 10) + '...',
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
