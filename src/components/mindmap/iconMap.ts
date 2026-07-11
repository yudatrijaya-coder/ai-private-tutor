/**
 * Keyword → Lucide icon name mapping for mindmap nodes.
 * Add more patterns as needed. Order matters: first match wins.
 */

const iconMap: Record<string, string> = {
  // Matematika
  matematika: "Calculator",
  mtk: "Calculator",
  bilangan: "Hash",
  geometri: "Shapes",
  aljabar: "Braces",
  statistika: "BarChart3",
  peluang: "Dices",
  kalkulus: "Sigma",
  trigonometri: "Triangle",
  ukuran: "Ruler",
  sudut: "Compass",
  luas: "Maximize2",
  volume: "Box",
  pecahan: "Divide",
  desimal: "Percent",
  persen: "Percent",
  akar: "SquareRoot",
  pangkat: "Square",

  // IPA / Sains
  ipa: "Flask",
  sains: "Flask",
  fisika: "Atom",
  kimia: "Flask",
  biologi: "Microscope",
  tubuh: "Heart",
  organ: "Heart",
  tumbuhan: "Leaf",
  hewan: "PawPrint",
  ekosistem: "Tree",
  lingkungan: "Leaf",
  energi: "Bolt",
  listrik: "Bolt",
  magnet: "Magnet",
  cahaya: "Sun",
  bunyi: "Music",
  gaya: "ArrowUpDown",
  gerak: "Rocket",
  zat: "Beaker",
  makanan: "Apple",
  udara: "Wind",
  air: "Droplets",
  tanah: "Mountain",
  bakteri: "CircleDot",
  virus: "AlertCircle",
  alam: "Tree",
  cuaca: "Cloud",
  musim: "Sun",
  bintang: "Star",
  planet: "Globe",
  "tata surya": "Sun",

  // Bahasa
  bahasa: "BookOpen",
  indonesia: "BookOpen",
  inggris: "BookText",
  membaca: "BookOpen",
  menulis: "PenTool",
  berbicara: "MessageCircle",
  sastra: "Feather",
  puisi: "Feather",
  prosa: "BookText",
  cerita: "BookOpen",
  dongeng: "Sparkles",
  "kosa kata": "BookText",
  "tata bahasa": "Braces",
  ejaan: "Pencil",
  karangan: "PenTool",

  // IPS / Sejarah
  ips: "Globe",
  sejarah: "Landmark",
  geografi: "Map",
  ekonomi: "Dollar",
  sosiologi: "Users",
  budaya: "Palette",
  pahlawan: "Award",
  kerajaan: "Crown",
  peta: "Map",
  benua: "Globe",
  negara: "Flag",
  kota: "Building",
  pasar: "ShoppingCart",
  uang: "Wallet",
  perdagangan: "Truck",

  // PKN
  pkn: "Shield",
  pancasila: "Shield",
  hukum: "Scale",
  hak: "CheckCircle",
  kewajiban: "ClipboardCheck",
  demokrasi: "Vote",
  pemerintah: "Building2",
  konstitusi: "BookText",
  aturan: "Scale",

  // Agama
  agama: "Star",
  islam: "Star",
  kristen: "Church",
  katolik: "Church",
  hindu: "Sun",
  budha: "Moon",
  konghucu: "BookText",
  ibadah: "Heart",
  akhlak: "Heart",
  doa: "Hands",
  kitab: "Book",
  nabi: "Star",
  tuhan: "Sun",
  moral: "Heart",

  // Olahraga
  olahraga: "Trophy",
  olga: "Trophy",
  bola: "CircleDot",
  lari: "Zap",
  renang: "Droplets",
  senam: "Accessibility",
  atletik: "Trophy",
  permainan: "Gamepad",
  kesehatan: "Heart",
  kebugaran: "Dumbbell",
  "bela diri": "Swords",

  // Seni & Kreatif
  seni: "Palette",
  senbud: "Palette",
  musik: "Music",
  lagu: "Music",
  "alat musik": "Headphones",
  tari: "Accessibility",
  lukis: "Brush",
  gambar: "Image",
  drama: "Clapperboard",
  kerajinan: "Puzzle",

  // Umum
  pengertian: "Info",
  definisi: "Info",
  contoh: "FileText",
  jenis: "FolderTree",
  manfaat: "Zap",
  tujuan: "Target",
  fungsi: "Settings2",
  proses: "RefreshCw",
  langkah: "ListChecks",
  ciri: "Search",
  klasifikasi: "FolderTree",
  peran: "Users",
  tokoh: "UserCircle",
  waktu: "Clock",
  tempat: "MapPin",
  alat: "Wrench",
  bahan: "Package",
  hasil: "CheckCircle",
};

/** Resolve a Lucide icon name from a label string */
export function resolveIcon(label: string): string {
  const lower = label.toLowerCase().trim();
  for (const [keyword, icon] of Object.entries(iconMap)) {
    if (lower.includes(keyword)) return icon;
  }
  // Fallback emoji prefix detection
  const emoji = label.match(/^(\p{Emoji})/u);
  if (emoji) return emoji[1]; // return emoji as string
  return "FileText";
}

/** Check if a resolved icon name is actually a Lucide icon */
export function isLucideIcon(name: string): boolean {
  // Lucide icons are PascalCase (no emoji marker)
  return !/^\p{Emoji}/u.test(name) && /^[A-Z]/.test(name);
}
