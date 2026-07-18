/**
 * Set YouTube URLs for all 47 Kimia materials (2 videos per topic)
 */

const DB_CONFIG = {
  host: 'localhost',
  user: 'tutor',
  password: 'tutor123',
  database: 'ai_private_tutor',
};

const CURRICULUM_ID = '98f0274e-4e39-45f5-9c79-3632c5717b27';

const TOPIC_VIDEOS = {
  'Termokimia': [
    'https://www.youtube.com/watch?v=FjNThpLAkOY',
    'https://www.youtube.com/watch?v=9D6WGcLf7UU',
  ],
  'Laju Reaksi': [
    'https://www.youtube.com/watch?v=JWRH5mibIws',
    'https://www.youtube.com/watch?v=lE3-HOasaU8',
  ],
  'Kesetimbangan Kimia': [
    'https://www.youtube.com/watch?v=oDR1CJHEq9A',
    'https://www.youtube.com/watch?v=xD8TFFL9TRA',
  ],
  'Asam dan Basa': [
    'https://www.youtube.com/watch?v=e_0mceAEvks',
    'https://www.youtube.com/watch?v=4aJckRYT-mk',
  ],
  'Larutan Penyangga': [
    'https://www.youtube.com/watch?v=b0xsz9Zrq20',
    'https://www.youtube.com/watch?v=N-0aZuKpgzE',
  ],
  'Hidrolisis Garam': [
    'https://www.youtube.com/watch?v=w3VkBDgOadg',
    'https://www.youtube.com/watch?v=x8cItpmNLb0',
  ],
  'Titrasi Asam-Basa': [
    'https://www.youtube.com/watch?v=EqMVS53UDNw',
    'https://www.youtube.com/watch?v=UoPKs_nCVSs',
  ],
  'Hidrokarbon dan Minyak Bumi': [
    'https://www.youtube.com/watch?v=22-S9htSXqU',
    'https://www.youtube.com/watch?v=64Ns-OU0wnQ',
  ],
};

const { Client } = require('pg');

async function update() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  let updated = 0;

  for (const [topic, urls] of Object.entries(TOPIC_VIDEOS)) {
    // Get all material IDs for this topic
    const mats = await client.query(
      `SELECT id, "subTopic" FROM "Material" WHERE "curriculumId" = $1 AND subject = 'Kimia' AND topic = $2 ORDER BY "subTopic"`,
      [CURRICULUM_ID, topic]
    );

    for (let i = 0; i < mats.rows.length; i++) {
      const vidIdx = i < 2 ? i : i % 2; // cycle: first 2 sub-topik get unique, rest cycle
      await client.query(
        `UPDATE "Material" SET "videoUrl" = $1 WHERE id = $2`,
        [urls[vidIdx], mats.rows[i].id]
      );
      updated++;
    }
    console.log(`✅ ${topic}: ${mats.rows.length} materials → ${urls.join(', ')}`);
  }

  console.log(`\n✅ Total: ${updated} YouTube URLs set`);
  await client.end();
}

update().catch(console.error);
