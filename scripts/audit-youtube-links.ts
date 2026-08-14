
import { prisma } from "../src/lib/prisma";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import https from 'https'

// Basic URL validation
function isValidYoutubeUrl(url: string): boolean {
  if (!url) return false;
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return youtubeRegex.test(url);
}

// Fetch youtube page title
async function getYoutubeTitle(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
        // Stop receiving data if we have enough to find the title
        if (data.includes('</title>')) {
          res.destroy();
        }
      });
      res.on('destroy', () => {
        const titleMatch = data.match(/<title>(.*?)<\/title>/);
        const title = titleMatch ? titleMatch[1].replace(/ - YouTube$/, '').trim() : null;
        resolve(title);
      });
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}


// A simple function to check for topic/subject keywords in the video title
function isMismatch(materialName: string, materialSubject: string, videoTitle: string): boolean {
    const materialWords = (materialName.toLowerCase() + ' ' + materialSubject.toLowerCase()).split(/[\s-]+/).filter(w => w.length > 2 && !['dan', 'di', 'ke', 'dari'].includes(w) );
    const titleWords = new Set(videoTitle.toLowerCase().split(/[\s-]+/));
    
    let matches = 0;
    for (const word of materialWords) {
        if (titleWords.has(word)) {
            matches++;
        }
    }
    // If less than 2 words match, flag as potential mismatch
    return matches < 2;
}


async function main() {
  console.log("Starting YouTube link audit for SMP & SMA...");

  const materials = await prisma.material.findMany({
    where: {
      gradeLevel: { in: ["SMP_1", "SMA_2"] },
      videoUrl: { not: null },
      NOT: { videoUrl: "" },
    },
    select: {
      id: true,
      topic: true,
      subject: true,
      gradeLevel: true,
      videoUrl: true,
    },
    orderBy: [{ gradeLevel: "asc" }, { subject: "asc" }, { topic: "asc" }],
  });

  console.log(`Found ${materials.length} materials with YouTube links.`);

  const report = {
    totalChecked: 0,
    invalidUrls: [] as any[],
    fetchFailures: [] as any[],
    mismatches: [] as any[],
    ok: 0,
    lastChecked: new Date().toISOString(),
  };

  for (const [index, material] of materials.entries()) {
    report.totalChecked++;
    
    if ((index + 1) % 50 === 0) {
        console.log(`Checked ${index + 1} of ${materials.length}...`);
    }

    if (!isValidYoutubeUrl(material.videoUrl!)) {
      report.invalidUrls.push({
        materialId: material.id,
        grade: material.gradeLevel,
        subject: material.subject,
        topic: material.topic,
        url: material.videoUrl,
      });
      continue;
    }

    const videoTitle = await getYoutubeTitle(material.videoUrl!);

    if (!videoTitle) {
        report.fetchFailures.push({
            materialId: material.id,
            url: material.videoUrl,
        });
        continue;
    }
    
    if (isMismatch(material.topic, material.subject, videoTitle)) {
        report.mismatches.push({
            materialId: material.id,
            grade: material.gradeLevel,
            subject: material.subject,
            topic: material.topic,
            videoUrl: material.videoUrl,
            retrievedTitle: videoTitle,
        });
    } else {
        report.ok++;
    }
  }

  const reportDir = join(process.cwd(), "audit-reports");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, `${new Date().toISOString().slice(0, 10)}-youtube-audit-real.json`);
  
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("\\n=== YouTube Audit Summary ===");
  console.log(`Total links checked: ${report.totalChecked}`);
  console.log(`OK / Matched: ${report.ok}`);
  console.log(`Invalid URL format: ${report.invalidUrls.length}`);
  console.log(`Title fetch failures: ${report.fetchFailures.length}`);
  console.log(`Potential mismatches found: ${report.mismatches.length}`);
  
  if (report.invalidUrls.length > 0) {
      console.log("\\n--- Invalid URLs (Top 5) ---");
      report.invalidUrls.slice(0, 5).forEach(item => console.log(JSON.stringify(item)));
  }
  if (report.fetchFailures.length > 0) {
      console.log("\\n--- Fetch Failures (Top 5) ---");
      report.fetchFailures.slice(0, 5).forEach(item => console.log(JSON.stringify(item)));
  }
  if (report.mismatches.length > 0) {
      console.log("\\n--- Potential Mismatches (Top 10) ---");
      report.mismatches.slice(0, 10).forEach(item => console.log(JSON.stringify(item)));
  }
  
  console.log(`\\nFull report saved to: ${reportPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
