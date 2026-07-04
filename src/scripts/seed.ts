import { prisma } from '../lib/prisma';
import {
  GradeLevel,
  StudentStatus,
  PersonaType,
  MaterialStatus,
  DeliveryType,
  SessionType,
  SessionStatus,
  AgentType,
  JobStatus,
  Prisma,
} from '../generated/prisma/client';

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clean existing data in correct order (respecting FK constraints)
  console.log('🧹 Clearing existing data...');
  await prisma.progressSnap.deleteMany();
  await prisma.agentLog.deleteMany();
  await prisma.scheduleSession.deleteMany();
  await prisma.sessionState.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.material.deleteMany();
  await prisma.curriculum.deleteMany();
  await prisma.persona.deleteMany();
  await prisma.student.deleteMany();

  // ── Personas ──────────────────────────────────────────────
  console.log('👤 Creating personas...');
  const personas = await Promise.all([
    prisma.persona.create({
      data: {
        type: PersonaType.KAK_BUDI,
        name: 'Kak Budi',
        greeting: 'Halo adik! Ayo belajar bareng Kak Budi!',
        description: 'Persona ramah untuk siswa SD, menggunakan bahasa sederhana dan ceria',
        toneRules: {
          style: 'cheerful',
          language: 'simple',
          useEmoji: true,
          vocabularyLevel: 'basic',
        },
        forbiddenTopics: ['politik', 'dewasa'],
      },
    }),
    prisma.persona.create({
      data: {
        type: PersonaType.KAK_DEWI,
        name: 'Kak Dewi',
        greeting: 'Hai! Kak Dewi siap bantu kamu belajar',
        description: 'Persona suportif untuk siswa SMP, bahasa santai tapi tetap edukatif',
        toneRules: {
          style: 'supportive',
          language: 'casual',
          useEmoji: true,
          vocabularyLevel: 'intermediate',
        },
        forbiddenTopics: ['politik', 'dewasa'],
      },
    }),
    prisma.persona.create({
      data: {
        type: PersonaType.KAK_RAKA,
        name: 'Kak Raka',
        greeting: 'Siap belajar? Kita gas pol!',
        description: 'Persona energik untuk siswa SMA, bahasa gaul dan memotivasi',
        toneRules: {
          style: 'energetic',
          language: 'slang',
          useEmoji: true,
          vocabularyLevel: 'advanced',
        },
        forbiddenTopics: ['politik'],
      },
    }),
  ]);
  console.log(`   ✓ ${personas.length} personas created\n`);

  // ── Students ─────────────────────────────────────────────
  console.log('🎓 Creating students...');

  const andi = await prisma.student.create({
    data: {
      studentId: 'ANDI001',
      name: 'Andi',
      gradeLevel: GradeLevel.SD_5,
      persona: PersonaType.KAK_BUDI,
      characterPreference: 'mbappe',
      interests: 'bola, sepak bola, Mbappe',
      status: StudentStatus.ACTIVE,
      scheduleConfig: {
        preferredTime: '06:30',
        timezone: 'Asia/Jakarta',
        sessionDuration: 15,
      },
    },
  });

  const sari = await prisma.student.create({
    data: {
      studentId: 'SARI001',
      name: 'Sari',
      gradeLevel: GradeLevel.SMP_1,
      persona: PersonaType.KAK_DEWI,
      characterPreference: 'lisa',
      interests: 'k-pop, dance, Lisa BLACKPINK',
      status: StudentStatus.ACTIVE,
      scheduleConfig: {
        preferredTime: '06:30',
        timezone: 'Asia/Jakarta',
        sessionDuration: 15,
      },
    },
  });

  const budi = await prisma.student.create({
    data: {
      studentId: 'BUDI001',
      name: 'Budi',
      gradeLevel: GradeLevel.SMA_2,
      persona: PersonaType.KAK_RAKA,
      interests: 'coding, game, matematika',
      status: StudentStatus.ACTIVE,
      scheduleConfig: {
        preferredTime: '06:30',
        timezone: 'Asia/Jakarta',
        sessionDuration: 15,
      },
    },
  });

  console.log(`   ✓ Andi (SD/5 - Kak Budi)`);
  console.log(`   ✓ Sari (SMP/1 - Kak Dewi)`);
  console.log(`   ✓ Budi (SMA/2 - Kak Raka)\n`);

  // ── Curricula & Materials ────────────────────────────────
  console.log('📚 Creating curricula and materials...');

  // Helper: create curriculum with materials
  async function createCurriculumWithMaterials(
    studentId: string,
    gradeLevel: GradeLevel,
    subjects: { subject: string; topic: string; subTopic?: string; content: string }[],
    version = 1
  ) {
    const curriculum = await prisma.curriculum.create({
      data: {
        studentId,
        gradeLevel,
        version,
        changelog: `Initial curriculum v${version}`,
        metadata: { createdBy: 'seed-script', totalSubjects: subjects.length },
      },
    });

    const materials = await Promise.all(
      subjects.map((s, idx) =>
        prisma.material.create({
          data: {
            curriculumId: curriculum.id,
            topic: s.topic,
            subTopic: s.subTopic ?? null,
            subject: s.subject,
            gradeLevel,
            weekOrder: Math.floor(idx / 2) + 1,
            priority: idx + 1,
            delivery: DeliveryType.TEXT,
            status: MaterialStatus.READY,
            processedContent: s.content,
            metadata: { source: 'seed', generatedAt: new Date().toISOString() },
          },
        })
      )
    );

    return { curriculum, materials };
  }

  // ── ANDI: SD/5 ──
  await createCurriculumWithMaterials(andi.id, GradeLevel.SD_5, [
    {
      subject: 'Matematika',
      topic: 'Pecahan',
      subTopic: 'Pengertian Pecahan',
      content: `Pecahan adalah bilangan yang menyatakan bagian dari suatu keseluruhan. 
Pecahan ditulis dalam bentuk a/b, di mana a disebut pembilang dan b disebut penyebut. 
Pembilang menunjukkan jumlah bagian yang diambil, sedangkan penyebut menunjukkan jumlah total bagian yang sama besar.
Contoh: jika sebuah pizza dipotong menjadi 8 bagian sama besar dan kita mengambil 3 bagian, maka pecahannya adalah 3/8.
Kita dapat menjumlahkan pecahan yang memiliki penyebut sama dengan menjumlahkan pembilangnya saja.
Untuk pecahan dengan penyebut berbeda, kita harus menyamakan penyebut terlebih dahulu dengan mencari KPK dari kedua penyebut.`,
    },
    {
      subject: 'Matematika',
      topic: 'Penjumlahan',
      subTopic: 'Penjumlahan Bilangan Bulat',
      content: `Penjumlahan adalah operasi dasar matematika yang menggabungkan dua atau lebih bilangan menjadi satu bilangan yang disebut jumlah.
Dalam penjumlahan bilangan bulat, kita dapat menggunakan garis bilangan untuk membantu visualisasi.
Contoh: 5 + 3 = 8. Mulai dari angka 5, melangkah maju 3 langkah, sampai di angka 8.
Sifat-sifat penjumlahan meliputi sifat komutatif (a + b = b + a), sifat asosiatif ((a + b) + c = a + (b + c)), dan sifat identitas (a + 0 = a).
Latihan rutin akan membantu meningkatkan kecepatan dan ketepatan dalam berhitung penjumlahan.`,
    },
    {
      subject: 'Bahasa Indonesia',
      topic: 'Membaca Pemahaman',
      subTopic: 'Ide Pokok Paragraf',
      content: `Membaca pemahaman adalah kemampuan untuk memahami isi dari suatu bacaan. 
Langkah pertama dalam memahami bacaan adalah menemukan ide pokok setiap paragraf. 
Ide pokok adalah gagasan utama yang menjadi dasar pengembangan sebuah paragraf.
Ide pokok biasanya terletak di awal paragraf (deduktif), di akhir paragraf (induktif), atau di tengah paragraf.
Setelah menemukan ide pokok, kita dapat menemukan ide-ide penjelas yang mendukung ide pokok tersebut.
Untuk meningkatkan kemampuan membaca pemahaman, biasakan membaca setiap hari dan mencatat hal-hal penting dari bacaan.`,
    },
    {
      subject: 'IPA',
      topic: 'Sistem Pencernaan',
      subTopic: 'Organ Pencernaan Manusia',
      content: `Sistem pencernaan manusia berfungsi untuk memecah makanan menjadi zat-zat gizi yang dapat diserap oleh tubuh.
Organ-organ pencernaan terdiri dari mulut, kerongkongan, lambung, usus halus, usus besar, dan anus.
Di dalam mulut, makanan dicerna secara mekanik oleh gigi dan kimiawi oleh enzim amilase dalam air liur.
Lambung menghasilkan asam lambung dan enzim pepsin yang mencerna protein.
Usus halus merupakan tempat penyerapan zat gizi utama, di mana vili-vili usus menyerap nutrisi ke dalam aliran darah.
Usus besar menyerap air dan mineral, serta membentuk feses yang akan dikeluarkan melalui anus.`,
    },
  ]);
  console.log('   ✓ Andi: Matematika (Pecahan, Penjumlahan), Bahasa Indonesia (Membaca Pemahaman), IPA (Sistem Pencernaan)');

  // ── SARI: SMP/1 ──
  await createCurriculumWithMaterials(sari.id, GradeLevel.SMP_1, [
    {
      subject: 'Matematika',
      topic: 'Aljabar',
      subTopic: 'Bentuk Aljabar',
      content: `Aljabar adalah cabang matematika yang menggunakan huruf atau simbol untuk mewakili bilangan yang belum diketahui nilainya.
Bentuk aljabar terdiri dari koefisien, variabel, dan konstanta. Contoh: 3x + 5, di mana 3 adalah koefisien, x adalah variabel, dan 5 adalah konstanta.
Operasi pada bentuk aljabar meliputi penjumlahan, pengurangan, perkalian, dan pembagian suku-suku aljabar.
Suku-suku yang sejenis dapat dijumlahkan atau dikurangkan, yaitu suku-suku yang memiliki variabel dan pangkat yang sama.
Contoh: 2x + 3x = 5x, tetapi 2x + 3y tidak dapat dijumlahkan karena variabelnya berbeda.
Persamaan aljabar digunakan untuk menyelesaikan berbagai masalah sehari-hari dengan mencari nilai variabel yang memenuhi persamaan.`,
    },
    {
      subject: 'Bahasa Inggris',
      topic: 'Tenses',
      subTopic: 'Simple Present & Present Continuous',
      content: `Tenses adalah bentuk waktu dalam bahasa Inggris yang menunjukkan kapan suatu kejadian terjadi.
Simple Present Tense digunakan untuk menyatakan fakta umum, kebiasaan, atau kejadian yang terjadi berulang kali.
Rumus: Subject + Verb 1 (s/es) + Object. Contoh: "She reads books every day."
Present Continuous Tense digunakan untuk menyatakan kejadian yang sedang berlangsung saat ini.
Rumus: Subject + is/am/are + Verb-ing + Object. Contoh: "She is reading a book now."
Perbedaan utama: Simple Present untuk kebiasaan umum, Present Continuous untuk aksi yang sedang terjadi saat berbicara.
Kata keterangan waktu seperti "every day", "always", "now", "at the moment" membantu menentukan tense yang tepat.`,
    },
    {
      subject: 'IPA',
      topic: 'Sistem Pernapasan',
      subTopic: 'Organ Pernapasan Manusia',
      content: `Sistem pernapasan manusia berfungsi untuk memasukkan oksigen ke dalam tubuh dan mengeluarkan karbon dioksida.
Organ pernapasan meliputi hidung, faring, laring, trakea, bronkus, bronkiolus, dan alveolus.
Udara masuk melalui hidung, di mana rambut-rambut hidung menyaring kotoran dan selaput lendir melembabkan udara.
Trakea atau batang tenggorokan bercabang menjadi dua bronkus yang menuju ke paru-paru kanan dan kiri.
Bronkus bercabang lagi menjadi bronkiolus yang ujungnya berupa alveolus, tempat pertukaran gas terjadi.
Di alveolus, oksigen berdifusi ke dalam kapiler darah dan karbon dioksida berdifusi keluar dari darah untuk dikeluarkan.
Proses pernapasan terdiri dari inspirasi (menghirup) dan ekspirasi (menghembuskan) yang diatur oleh kontraksi diafragma dan otot antar tulang rusuk.`,
    },
    {
      subject: 'IPS',
      topic: 'Kerajaan Hindu-Buddha',
      subTopic: 'Kerajaan-Kerajaan di Indonesia',
      content: `Kerajaan Hindu-Buddha berkembang pesat di Indonesia sejak abad ke-4 hingga abad ke-15 Masehi.
Kerajaan Kutai di Kalimantan Timur merupakan kerajaan Hindu tertua di Indonesia, berdiri sekitar abad ke-4 M.
Kerajaan Sriwijaya di Sumatera Selatan (abad ke-7 hingga ke-13 M) merupakan kerajaan maritim Buddha terkuat yang menguasai jalur perdagangan Selat Malaka.
Kerajaan Majapahit di Jawa Timur (abad ke-13 hingga ke-15 M) mencapai puncak kejayaan di bawah pemerintahan Hayam Wuruk dengan Patih Gajah Mada.
Gajah Mada terkenal dengan Sumpah Palapanya yang bertekad menyatukan Nusantara.
Peninggalan kerajaan Hindu-Buddha meliputi candi-candi megah seperti Candi Borobudur (Buddha) dan Candi Prambanan (Hindu), serta prasasti-prasasti yang menjadi sumber sejarah berharga.`,
    },
  ]);
  console.log('   ✓ Sari: Matematika (Aljabar), Bahasa Inggris (Tenses), IPA (Sistem Pernapasan), IPS (Kerajaan Hindu-Buddha)');

  // ── BUDI: SMA/2 ──
  await createCurriculumWithMaterials(budi.id, GradeLevel.SMA_2, [
    {
      subject: 'Matematika',
      topic: 'Fungsi Komposisi',
      subTopic: 'Pengertian dan Operasi Fungsi Komposisi',
      content: `Fungsi komposisi adalah penggabungan dua fungsi secara berurutan sehingga menghasilkan fungsi baru.
Jika fungsi f memetakan himpunan A ke himpunan B, dan fungsi g memetakan himpunan B ke himpunan C, maka komposisi fungsi g ∘ f (dibaca "g bundaran f") memetakan A langsung ke C.
Rumus: (g ∘ f)(x) = g(f(x)). Artinya, fungsi f dikerjakan terlebih dahulu, kemudian hasilnya dimasukkan ke fungsi g.
Sifat fungsi komposisi: tidak komutatif (g ∘ f ≠ f ∘ g), tetapi bersifat asosiatif (h ∘ (g ∘ f) = (h ∘ g) ∘ f).
Untuk mencari fungsi komposisi, substitusikan seluruh variabel pada fungsi luar dengan fungsi dalam.
Domain fungsi komposisi adalah semua x pada domain f sehingga f(x) berada pada domain g.`,
    },
    {
      subject: 'Fisika',
      topic: 'Hukum Newton',
      subTopic: 'Hukum I, II, dan III Newton',
      content: `Hukum Newton tentang gerak merupakan dasar mekanika klasik yang menjelaskan hubungan antara gaya dan gerak benda.
Hukum I Newton (Hukum Kelembaman): "Setiap benda akan tetap dalam keadaan diam atau bergerak lurus beraturan kecuali ada gaya yang bekerja padanya." Dirumuskan sebagai ΣF = 0.
Hukum II Newton: "Percepatan suatu benda sebanding dengan resultan gaya yang bekerja padanya dan berbanding terbalik dengan massanya." Dirumuskan sebagai F = m × a.
Hukum III Newton (Hukum Aksi-Reaksi): "Setiap aksi menimbulkan reaksi yang sama besar tetapi berlawanan arah." Dirumuskan sebagai F_aksi = -F_reaksi.
Contoh aplikasi: saat kita berjalan, kaki mendorong tanah ke belakang (aksi), dan tanah mendorong kaki ke depan (reaksi).
Penerapan Hukum Newton ditemukan dalam kehidupan sehari-hari seperti mobil yang direm, roket yang diluncurkan, dan olahraga.`,
    },
    {
      subject: 'Kimia',
      topic: 'Ikatan Kimia',
      subTopic: 'Ikatan Ion dan Kovalen',
      content: `Ikatan kimia adalah gaya yang mengikat atom-atom sehingga membentuk senyawa. Ikatan kimia terjadi karena atom-atom ingin mencapai kestabilan (konfigurasi gas mulia).
Ikatan ion terbentuk karena serah terima elektron antara atom logam (melepas elektron → kation) dan non-logam (menerima elektron → anion). Contoh: NaCl (Na⁺ dan Cl⁻).
Ikatan kovalen terbentuk karena pemakaian bersama pasangan elektron antara atom-atom non-logam. Contoh: H₂O, CO₂, CH₄.
Ikatan kovalen dapat berupa ikatan tunggal (satu pasang elektron), ikatan rangkap dua (dua pasang), atau ikatan rangkap tiga (tiga pasang).
Perbedaan utama: ikatan ion terjadi antara logam dan non-logam dengan perbedaan keelektronegatifan besar, sedangkan ikatan kovalen terjadi antar non-logam dengan perbedaan keelektronegatifan kecil atau nol.
Sifat senyawa ion: titik leleh tinggi, larut dalam air, dapat menghantarkan listrik dalam bentuk lelehan atau larutan. Senyawa kovalen: titik leleh rendah, tidak selalu larut dalam air, umumnya tidak menghantarkan listrik.`,
    },
    {
      subject: 'Biologi',
      topic: 'Sistem Ekskresi',
      subTopic: 'Organ Ekskresi Manusia',
      content: `Sistem ekskresi manusia berfungsi untuk mengeluarkan zat-zat sisa metabolisme yang tidak diperlukan tubuh.
Organ ekskresi meliputi ginjal (menyaring darah dan menghasilkan urine), kulit (mengeluarkan keringat), paru-paru (mengeluarkan CO₂), dan hati (mengeluarkan empedu dan urea).
Ginjal terdiri dari jutaan nefron yang berfungsi menyaring darah melalui tiga tahap: filtrasi (penyaringan), reabsorpsi (penyerapan kembali), dan augmentasi (pengeluaran zat sisa).
Kulit mengeluarkan keringat melalui kelenjar keringat yang mengandung air, garam, dan urea, membantu mengatur suhu tubuh.
Paru-paru mengeluarkan karbon dioksida dan uap air sebagai hasil respirasi seluler.
Hati mengubah amonia (racun) menjadi urea yang kemudian dikeluarkan ginjal, serta menghasilkan empedu yang membantu pencernaan lemak.
Gangguan pada sistem ekskresi meliputi batu ginjal, nefritis, diabetes insipidus, dan penyakit kulit.`,
    },
  ]);
  console.log('   ✓ Budi: Matematika (Fungsi Komposisi), Fisika (Hukum Newton), Kimia (Ikatan Kimia), Biologi (Sistem Ekskresi)');
  console.log('');

  // ── Schedule Sessions ─────────────────────────────────────
  console.log('📅 Creating schedule sessions...');

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function setTime(date: Date, hours: number, minutes: number): Date {
    const d = new Date(date);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  function getDayName(date: Date): string {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[date.getDay()];
  }

  const students = [andi, sari, budi];
  let sessionCount = 0;

  // 2-3 hari kemarin = COMPLETED, sisanya SCHEDULED
  // Today is the reference point. Sessions in the past 2-3 days should be COMPLETED.
  // We'll set: day -3 and -2 as COMPLETED, day -1 (yesterday) as COMPLETED too, today onward as SCHEDULED

  for (const student of students) {
    // Generate for 7 days: from 3 days ago to 3 days in the future (covering 7 days total)
    for (let dayOffset = -3; dayOffset <= 3; dayOffset++) {
      const date = addDays(todayStart, dayOffset);
      const dayName = getDayName(date);

      // DAILY session at 06:30 (15 min)
      const isPast = dayOffset < 0; // yesterday or before -> COMPLETED
      // Also mark today as SCHEDULED since it hasn't happened yet at seed time
      const isCompleted = dayOffset < 0; // only past days are completed

      await prisma.scheduleSession.create({
        data: {
          studentId: student.id,
          type: SessionType.DAILY,
          topic: 'Daily Review',
          subject: 'General',
          scheduledAt: setTime(date, 6, 30),
          durationMin: 15,
          status: isCompleted ? SessionStatus.COMPLETED : SessionStatus.SCHEDULED,
          completedAt: isCompleted ? setTime(date, 6, 45) : null,
          metadata: { day: dayName, seedGenerated: true },
        },
      });
      sessionCount++;

      // INTENSIVE session on Mon/Wed/Fri at 16:00 (120 min)
      if (['Senin', 'Rabu', 'Jumat'].includes(dayName)) {
        await prisma.scheduleSession.create({
          data: {
            studentId: student.id,
            type: SessionType.INTENSIVE,
            topic: 'Intensive Study',
            subject: 'All Subjects',
            scheduledAt: setTime(date, 16, 0),
            durationMin: 120,
            status: isCompleted ? SessionStatus.COMPLETED : SessionStatus.SCHEDULED,
            completedAt: isCompleted ? setTime(date, 18, 0) : null,
            metadata: { day: dayName, seedGenerated: true },
          },
        });
        sessionCount++;
      }
    }
  }
  console.log(`   ✓ ${sessionCount} sessions created across ${students.length} students\n`);

  // ── AgentLogs ─────────────────────────────────────────────
  console.log('📋 Creating agent logs...');

  const agentTypes = Object.values(AgentType);
  const jobStatuses = Object.values(JobStatus);
  const actions = ['generate_draft', 'scrape', 'render', 'grade', 'review', 'schedule', 'notify', 'analyze', 'summarize', 'translate'];

  const agentLogs: {
    agentType: AgentType;
    action: string;
    jobId: string;
    studentId: string | null;
    status: JobStatus;
    input: Prisma.InputJsonValue;
    output: Prisma.InputJsonValue;
    createdAt: Date;
  }[] = [];

  for (let i = 0; i < 12; i++) {
    const daysAgo = Math.floor(Math.random() * 3);
    const hoursAgo = Math.floor(Math.random() * 24);
    const agentType = agentTypes[Math.floor(Math.random() * agentTypes.length)];
    const status = jobStatuses[Math.floor(Math.random() * jobStatuses.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const randomStudent = students[Math.floor(Math.random() * students.length)];

    const createdAt = new Date(now.getTime() - daysAgo * 86400000 - hoursAgo * 3600000);
    const updatedAt = new Date(createdAt.getTime() + Math.floor(Math.random() * 3600000));

    agentLogs.push({
      agentType,
      action,
      jobId: `job-${i + 1}-${Date.now()}`,
      studentId: randomStudent.id,
      status,
      input: { task: action, timestamp: createdAt.toISOString() } as Prisma.InputJsonValue,
      output: status === JobStatus.COMPLETED
        ? ({ result: `${action} completed successfully`, processedAt: updatedAt.toISOString() } as Prisma.InputJsonValue)
        : ({} as Prisma.InputJsonValue),
      createdAt,
    });
  }

  // Add a few FAILED logs for variety
  agentLogs.push({
    agentType: AgentType.CONTENT,
    action: 'scrape',
    jobId: `job-failed-1`,
    studentId: andi.id,
    status: JobStatus.FAILED,
    input: { task: 'scrape', url: 'https://example.com/math-pecahan' } as Prisma.InputJsonValue,
    output: {} as Prisma.InputJsonValue,
    createdAt: new Date(now.getTime() - 86400000),
  });
  agentLogs.push({
    agentType: AgentType.MEDIA,
    action: 'render',
    jobId: `job-failed-2`,
    studentId: budi.id,
    status: JobStatus.FAILED,
    input: { task: 'render', template: 'physics-video' } as Prisma.InputJsonValue,
    output: {} as Prisma.InputJsonValue,
    createdAt: new Date(now.getTime() - 2 * 86400000),
  });
  agentLogs.push({
    agentType: AgentType.TUTOR,
    action: 'grade',
    jobId: `job-active-1`,
    studentId: sari.id,
    status: JobStatus.ACTIVE,
    input: { task: 'grade', quizId: 'sample-quiz-1' } as Prisma.InputJsonValue,
    output: {} as Prisma.InputJsonValue,
    createdAt: new Date(now.getTime() - 3600000),
  });

  for (const log of agentLogs) {
    await prisma.agentLog.create({
      data: {
        agentType: log.agentType,
        action: log.action,
        jobId: log.jobId,
        studentId: log.studentId,
        status: log.status,
        input: log.input,
        output: log.output,
        createdAt: log.createdAt,
      },
    });
  }
  console.log(`   ✓ ${agentLogs.length} agent logs created\n`);

  // ── ProgressSnaps ─────────────────────────────────────────
  console.log('📊 Creating progress snapshots...');

  // Andi: IPA bagus (70-90%), Bahasa jelek (20-40%), Matematika medium (50-70%)
  // Sari: Matematika (50-70%), Inggris (80-95%)
  // Budi: Fisika (40-60%), Kimia (30-50%)

  function randomBetween(min: number, max: number, decimals = 2): number {
    const val = min + Math.random() * (max - min);
    return parseFloat(val.toFixed(decimals));
  }

  const progressData: Record<string, Record<string, { mastery: number; minMastery: number; maxMastery: number }>> = {
    andi: {
      IPA: { mastery: 0, minMastery: 0.7, maxMastery: 0.9 },
      'Bahasa Indonesia': { mastery: 0, minMastery: 0.2, maxMastery: 0.4 },
      Matematika: { mastery: 0, minMastery: 0.5, maxMastery: 0.7 },
    },
    sari: {
      Matematika: { mastery: 0, minMastery: 0.5, maxMastery: 0.7 },
      'Bahasa Inggris': { mastery: 0, minMastery: 0.8, maxMastery: 0.95 },
      IPA: { mastery: 0, minMastery: 0.6, maxMastery: 0.8 },
    },
    budi: {
      Fisika: { mastery: 0, minMastery: 0.4, maxMastery: 0.6 },
      Kimia: { mastery: 0, minMastery: 0.3, maxMastery: 0.5 },
      Biologi: { mastery: 0, minMastery: 0.5, maxMastery: 0.7 },
    },
  };

  const snapCounts: Record<string, number> = { andi: 0, sari: 0, budi: 0 };

  for (const [studentKey, student] of [
    ['andi', andi] as const,
    ['sari', sari] as const,
    ['budi', budi] as const,
  ]) {
    const subjects = progressData[studentKey];
    for (const [subject, range] of Object.entries(subjects)) {
      // 5 daily snapshots (last 5 days)
      for (let day = 4; day >= 0; day--) {
        const snapDate = addDays(todayStart, -day);
        // Add some progression trend: later dates have slightly higher mastery
        const trend = (5 - day) / 5; // 0.2, 0.4, 0.6, 0.8, 1.0
        const mastery = randomBetween(range.minMastery, range.maxMastery) * (0.8 + 0.2 * trend);

        await prisma.progressSnap.create({
          data: {
            studentId: student.id,
            subject,
            topic: subject,
            mastery: Math.min(mastery, 1.0),
            quizCount: Math.floor(randomBetween(1, 5)),
            totalScore: Math.floor(randomBetween(10, 50)),
            totalMax: 50,
            studyMinutes: Math.floor(randomBetween(10, 45)),
            snapDate,
          },
        });
        snapCounts[studentKey]++;
      }
    }
  }
  console.log(`   ✓ Andi: ${snapCounts.andi} snaps (IPA↑, Bahasa↓, Matematika medium)`);
  console.log(`   ✓ Sari: ${snapCounts.sari} snaps (Matematika medium, Inggris↑)`);
  console.log(`   ✓ Budi: ${snapCounts.budi} snaps (Fisika medium, Kimia↓)`);
  console.log('');

  // ── Summary ──────────────────────────────────────────────
  const totalStudents = await prisma.student.count();
  const totalCurricula = await prisma.curriculum.count();
  const totalMaterials = await prisma.material.count();
  const totalSessions = await prisma.scheduleSession.count();
  const totalAgentLogs = await prisma.agentLog.count();
  const totalProgressSnaps = await prisma.progressSnap.count();
  const totalPersonas = await prisma.persona.count();

  console.log('═══════════════════════════════════════════');
  console.log('✅ SEED COMPLETE');
  console.log('═══════════════════════════════════════════');
  console.log(`   Personas:       ${totalPersonas}`);
  console.log(`   Students:       ${totalStudents}`);
  console.log(`   Curricula:      ${totalCurricula}`);
  console.log(`   Materials:      ${totalMaterials}`);
  console.log(`   ScheduleSess:   ${totalSessions}`);
  console.log(`   AgentLogs:      ${totalAgentLogs}`);
  console.log(`   ProgressSnaps:  ${totalProgressSnaps}`);
  console.log('═══════════════════════════════════════════\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
