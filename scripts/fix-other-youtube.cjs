/**
 * Fix YouTube URLs for Anton (04e06244) and Syifa (d4c8f21a) curricula
 * 
 * Finds all materials with NULL videoUrl from both curricula,
 * groups by (subject, topic), searches YouTube API v3,
 * verifies via oEmbed, and updates videoUrl.
 * 
 * DB: PostgreSQL localhost, user=tutor, password=tutor123, database=ai_private_tutor
 * YouTube API: AIzaSyDoLUc4CO2oeRTR-fd2iu_0Elb11htyx0Q
 * oEmbed: https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v={id}&format=json
 */

const { Client } = require('pg');
const https = require('https');
const fs = require('fs');

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'tutor',
  password: 'tutor123',
  database: 'ai_private_tutor'
};

// Curriculum IDs
const CURRICULUM_IDS = [
  '04e06244-63ff-4a0c-8698-3610edf8d9cd', // Anton SD_5
  'd4c8f21a-6e62-4553-be51-0b6df08eb960'  // Syifa SD_5
];

const YOUTUBE_API_KEY = 'AIzaSyDoLUc4CO2oeRTR-fd2iu_0Elb11htyx0Q';

// Grade-specific query templates for Indonesian SD curriculum
const GRADE_QUERY_TEMPLATES = {
  'SD_5': {
    'Matematika': 'Matematika SD Kelas 4 5 6 Indonesia Kurikulum Merdeka',
    'Bahasa Indonesia': 'Bahasa Indonesia SD Kelas 4 5 Indonesia',
    'IPAS': 'IPA IPS SD Kelas 4 5 6 Indonesia Kurikulum Merdeka',
    'PJOK': 'PJOK Penjas SD Kelas 4 5 6 Indonesia',
    'Pendidikan Pancasila': 'Pendidikan Pancasila PKn SD Kelas 4 5 Indonesia',
    'Seni Musik': 'Seni Musik SD Kelas 4 5 6 Indonesia',
    'Bahasa Inggris': 'Bahasa Inggris English SD Kelas 4 5 Indonesia'
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
      key: YOUTUBE_API_KEY,
      videoDuration: 'medium' // Prefer ~5-15 min educational videos
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
    req.setTimeout(15000, () => {
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

// Sleep for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Build search query based on subject and topic
function buildSearchQuery(subject, topic, gradeLevel) {
  const templates = GRADE_QUERY_TEMPLATES[gradeLevel] || {};
  const gradeQuery = templates[subject] || `${subject} SD Indonesia Kurikulum Merdeka`;
  
  // Construct focused search query
  return `${topic} ${gradeQuery}`.substring(0, 100);
}

// Main execution
async function main() {
  console.log('=== YouTube URL Fix for Anton & Syifa (SD_5) ===\n');
  console.log(`Curricula: ${CURRICULUM_IDS.join(', ')}\n`);
  
  const db = new Client(DB_CONFIG);
  
  const stats = {
    processed: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    results: [],
    failures: []
  };

  try {
    await db.connect();
    console.log('Connected to PostgreSQL database\n');

    // Step 1: Find all materials with NULL videoUrl from both curricula
    console.log('Step 1: Finding materials with NULL videoUrl...');
    
    const placeholders = CURRICULUM_IDS.map((_, i) => `$${i + 1}`).join(', ');
    const result = await db.query(`
      SELECT m.id, m."subject", m.topic, m."subTopic", m."gradeLevel", m."videoUrl", c.id as "curriculumId"
      FROM "Material" m
      JOIN "Curriculum" c ON c.id = m."curriculumId"
      WHERE c.id IN (${placeholders})
        AND (m."videoUrl" IS NULL OR m."videoUrl" = '' OR m."videoUrl" = 'null')
      ORDER BY m."subject", m.topic, m."subTopic"
    `, CURRICULUM_IDS);

    const materials = result.rows;
    console.log(`Found ${materials.length} materials with NULL/empty videoUrl\n`);

    if (materials.length === 0) {
      console.log('✓ All materials already have videoUrl populated!');
      console.log('\nChecking current status...');
      
      // Show summary of existing videoUrls
      const summary = await db.query(`
        SELECT m."subject", COUNT(*) as total, 
               SUM(CASE WHEN m."videoUrl" IS NOT NULL AND m."videoUrl" != '' THEN 1 ELSE 0 END) as with_video
        FROM "Material" m
        JOIN "Curriculum" c ON c.id = m."curriculumId"
        WHERE c.id IN (${placeholders})
        GROUP BY m."subject"
        ORDER BY m."subject"
      `, CURRICULUM_IDS);
      
      console.log('\nCurrent videoUrl status by subject:');
      for (const row of summary.rows) {
        console.log(`  ${row.subject}: ${row.with_video}/${row.total} with video`);
      }
      
      stats.skipped = materials.length;
    } else {
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
      
      for (const group of uniqueGroups) {
        stats.processed++;
        
        console.log(`[${stats.processed}/${uniqueGroups.length}] ${group.subject} - ${group.topic}`);
        
        // Build search query
        const searchQuery = buildSearchQuery(group.subject, group.topic, group.gradeLevel);
        console.log(`  Query: "${searchQuery}"`);

        // Search YouTube
        let videoId = null;
        let videoTitle = null;
        
        try {
          const results = await searchYouTube(searchQuery);
          
          if (results.length === 0) {
            // Try simpler query
            console.log('  No results, trying simpler query...');
            const simpleQuery = `${group.topic} ${group.subject} Indonesia`;
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
                console.log(`  ✓ Found valid video: ${videoId} - "${videoTitle}"`);
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

            console.log(`  ✓ Updated ${updateResult.rowCount} materials with ${watchUrl}\n`);

          } catch (err) {
            console.log(`  ✗ Error updating: ${err.message}\n`);
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
          console.log(`  ✗ FAILED: No valid video found\n`);
        }
      }
    }

    // Final Report
    console.log('\n=== FINAL REPORT ===\n');
    console.log(`Topics processed: ${stats.processed}`);
    console.log(`Materials updated: ${stats.updated}`);
    console.log(`Materials failed: ${stats.failed}`);
    console.log(`Materials skipped (already have video): ${stats.skipped}`);
    
    if (stats.results.length > 0) {
      console.log(`\n=== SAMPLE RESULTS ===\n`);
      
      for (const r of stats.results.slice(0, 10)) {
        console.log(`✓ ${r.subject} - ${r.topic}`);
        console.log(`  Video: http://www.youtube.com/watch?v=${r.videoId}`);
        console.log(`  Title: "${r.videoTitle}"`);
        console.log(`  Updated: ${r.materialsUpdated} material(s)\n`);
      }
    }

    if (stats.failures.length > 0) {
      console.log('\n=== FAILED TOPICS (no video found) ===\n');
      for (const f of stats.failures) {
        console.log(`✗ ${f.subject} - ${f.topic} (${f.materials || f.error})`);
      }
    }

    // Save results to file
    const outputPath = '/home/ubuntu/ai-private-tutor/scripts/fix-other-youtube-results.json';
    fs.writeFileSync(outputPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      curriculumIds: CURRICULUM_IDS,
      stats,
      summary: {
        topicsProcessed: stats.processed,
        materialsUpdated: stats.updated,
        materialsFailed: stats.failed,
        materialsSkipped: stats.skipped
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
