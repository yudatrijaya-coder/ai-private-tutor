export default function MindmapDocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-amber-900 mb-2" style={{ fontFamily: "'Fredoka One', 'Nunito', sans-serif" }}>
          🧠 Mindmap — Peta Konsep Interaktif
        </h1>
        <p className="text-lg text-amber-700 mb-8">
          Visualisasi topik belajar berbasis <strong>React Flow</strong> dengan radial layout, Lucide icons,
          dan per-node CSS animations. Fitur flagship AI Private Tutor.
        </p>

        <Section title="📍 URL & Routing">
          <CodeBlock>{`/student/mindmap/[subject]?id=<materialId>`}</CodeBlock>
          <p className="text-slate-700 mt-2 mb-4">
            Parameter <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">subject</code> adalah
            slug (IPA, Matematika, Bahasa-Indonesia, dll). Material ID diambil dari query string <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">id</code>.
          </p>
          <TroubleCard
            problem="🚧 Menampilkan 'Konten belum tersedia'?"
            solution="Pastikan material di database punya metadata.slides (markdown) atau processedContent. Mindmap otomatis parse dari konten slides."
          />
        </Section>

        <Section title="🧩 Template Format (Markdown)">
          <p className="text-slate-700 mb-3">
            Content mindmap otomatis diparse dari <strong>markdown slides</strong> di database
            (field <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">Material.metadata.slides</code>).
            Formatnya:
          </p>

          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm mb-4 leading-relaxed">{`## Sistem Tata Surya
- Planet dalam (Merkurius, Venus, Bumi, Mars)
- Planet luar (Jupiter, Saturnus, Uranus, Neptunus)
- Asteroid dan Komet

## Gerhana
- Gerhana Matahari
- Gerhana Bulan`}</pre>

          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="bg-amber-100">
                <th className="p-2 text-left border">Elemen</th>
                <th className="p-2 text-left border">Rules</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['## Header', 'Menjadi <strong>Branch node</strong> — level 2 dari center (solid border, color)'],
                ['Bullet - / *', 'Menjadi <strong>Leaf node</strong> — level 3 (solid border, thinner)'],
                ['--- separator', 'Pisah section — branch baru'],
                ['Max leaves/branch', '2 leaf node per branch (agar tidak crowded)'],
              ] as const).map(([el, rule]) => (
                <tr key={el}>
                  <td className="p-2 border font-mono text-sm">{el}</td>
                  <td className="p-2 border text-slate-700">{rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="🏗️ Komponen Architecture">
          <p className="text-slate-700 mb-4">
            Mindmap terdiri dari 6 file yang terbagi dalam 3 layer:
          </p>

          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm mb-6 leading-relaxed">{`src/
├── app/(student)/student/mindmap/[subject]/
│   ├── ReactFlowMindmap.tsx   # Main — layout, edges, ReactFlow wrapper
│   └── page.tsx               # Server component — fetch data, parse, render
├── components/mindmap/
│   ├── CustomNode.tsx         # Node UI — icons, themes, animations, handles
│   ├── iconMap.ts             # Topic → Lucide icon resolver
│   └── animMap.ts             # Per-icon CSS animation definitions
└── lib/
    └── mindmap-template.ts    # parseMindmapFromMarkdown() + createMindmapNodes()`}</pre>

          <div className="grid gap-4 sm:grid-cols-2 mb-4">
            <MiniCard
              title="ReactFlowMindmap.tsx"
              items={[
                'Radial layout — layoutNodes()',
                'Edges with directional handles',
                'Pastel blob SVG background',
                'ReactFlow + MiniMap + Controls',
              ]}
            />
            <MiniCard
              title="CustomNode.tsx"
              items={[
                'Lucide icons per node',
                '3-level theming (SD/SMP/SMA)',
                '4 directional Handle (invisible)',
                'Per-icon CSS animations',
                'Expandable description',
                'Image/icon/description slots',
              ]}
            />
            <MiniCard
              title="mindmap-template.ts"
              items={[
                'parseMindmapFromMarkdown(raw)',
                'createMindmapNodes(center, branches)',
                'Returns MindmapNode[]',
              ]}
            />
            <MiniCard
              title="iconMap.ts + animMap.ts"
              items={[
                'resolveIcon(label) → icon name',
                'isLucideIcon(name) → boolean',
                'getAnimForIcon(icon) → CSS keyframes',
                '16 topics mapped → Lucide icons',
              ]}
            />
          </div>
        </Section>

        <Section title="🎯 Radial Layout Algorithm">
          <p className="text-slate-700 mb-4">
            Layout kustom (tanpa dagre) di fungsi <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">layoutNodes()</code>:
          </p>

          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm mb-4 leading-relaxed">{`centerX = 420, centerY = 380, branchRadius = 360

BRANCHES — evenly spaced 360°, start at 12 o'clock
  angleDeg = (i / N) * 360 - 90

LEAVES — radiate outward from parent branch direction
  wedgeDeg = 360 / N   (each branch gets its own wedge)
  utilization = 70%    (padding between wedges)
  leafAngle = branchAngle + spreadOffset
  leafDistance = branchRadius + 200 + (j × 100)`}</pre>

          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="bg-amber-100">
                <th className="p-2 text-left border">Parameter</th>
                <th className="p-2 text-left border">Value</th>
                <th className="p-2 text-left border">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['branchRadius', '360', 'Jarak center → branch'],
                ['leafBaseDist', '+200', 'Jarak branch → leaf pertama'],
                ['leafStep', '100', 'Penambahan jarak per leaf berikutnya'],
                ['wedgeUtil', '70%', 'Ruang antar wedge leaf (padding)'],
                ['startAngle', '-90°', '12 o\'clock (atas)'],
              ] as const).map(([param, value, desc]) => (
                <tr key={param}>
                  <td className="p-2 border font-mono text-sm">{param}</td>
                  <td className="p-2 border font-mono text-sm">{value}</td>
                  <td className="p-2 border text-slate-700">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="🎨 Visual Hierarchy">
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            <NodeTypeCard
              name="Center Node"
              emoji="🧠"
              bg="linear-gradient(135deg, #FFD93D 0%, #FFB347 100%)"
              border="#E6A800"
              style="Pill (9999px)"
              anim="centerPulse 3s ease-in-out infinite"
              glow="0 0 0 4px rgba(230,168,0,0.25), 0 0 30px rgba(255,179,71,0.35)"
            />
            <NodeTypeCard
              name="Branch Node"
              emoji="🔵"
              bg={`${'[color]'}28`}
              border="Solid [color]"
              style="Rounded 24px"
              anim="Per-icon animation (float/wiggle/spin)"
              glow="0 8px 20px [color]24"
            />
            <NodeTypeCard
              name="Leaf Node"
              emoji="⚪"
              bg={`${'[color]'}12`}
              border="50% opacity [color]"
              style="Rounded 24px"
              anim="None (static)"
              glow="0 4px 12px [color]18"
            />
          </div>

          <p className="text-sm text-slate-500 italic mb-4">
            Warna branch otomatis dari 8-color palette: <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">#FF6B6B, #4ECDC4, #FFD93D, #6BCB77, #A66CFF, #FF8C42, #4D96FF, #FF6BDF</code>
          </p>
        </Section>

        <Section title="🎭 Per-Node CSS Animations">
          <p className="text-slate-700 mb-4">
            Setiap branch node punya animasi CSS unik berdasarkan icon-nya (dari <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">animMap.ts</code>):
          </p>

          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="bg-amber-100">
                <th className="p-2 text-left border">Animation</th>
                <th className="p-2 text-left border">CSS</th>
                <th className="p-2 text-left border">Cocok untuk</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['floatGentle', 'translateY ±6px, 4s ease-in-out', 'Mata Pelajaran umum'],
                ['wiggle', 'rotate ±3°, 2.5s ease-in-out', 'Ikon playful / olahraga'],
                ['spinSlow', 'rotate 360°, 20s linear', 'Ikon teknologi / sains'],
                ['pulseSoft', 'scale 1↔1.05, 3s ease-in-out', 'Ikon penting / utama'],
                ['bounceGentle', 'translateY 0→-8px, 1.5s ease-in-out', 'Ikon interaktif / game'],
                ['centerPulse', 'filter glow + scale, 3s ease-in-out', 'Center node'],
                ['centerSpin', '🧠 rotate 360°, 20s linear', 'Emoji center node'],
              ] as const).map(([anim, css, icon]) => (
                <tr key={anim}>
                  <td className="p-2 border font-mono text-sm font-medium">{anim}</td>
                  <td className="p-2 border font-mono text-xs text-slate-600">{css}</td>
                  <td className="p-2 border text-slate-700">{icon}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="🔄 Directional Edges">
          <p className="text-slate-700 mb-4">
            Edge memilih source/target handle berdasarkan arah geometris antar node — fungsi <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">angleDir(from, to)</code>:
          </p>

          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm mb-4 leading-relaxed">{`function angleDir(from, to) {
  dx = to.x - from.x
  dy = to.y - from.y
  deg = (atan2(dy, dx) * 180/π + 360) % 360

  if (deg >= 315 || deg < 45)  → "right"
  if (deg >= 45  && deg < 135) → "bottom"
  if (deg >= 135 && deg < 225) → "left"
  if (deg >= 225 && deg < 315) → "top"
}`}</pre>

          <p className="text-sm text-slate-500 italic">
            Setiap node punya 4 Handle (top, right, bottom, left) — invisible, dipilih otomatis oleh <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">angleDir()</code>.
          </p>
        </Section>

        <Section title="🎨 Theme System (SD/SMP/SMA)">
          <p className="text-slate-700 mb-4">
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">CustomNode.tsx</code> punya tokens per jenjang:
          </p>

          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-amber-100">
                <th className="p-2 text-left border">Token</th>
                <th className="p-2 text-left border">SD</th>
                <th className="p-2 text-left border">SMP</th>
                <th className="p-2 text-left border">SMA</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['Border radius', '24px', '18px', '14px'],
                ['Padding', '12px 16px', '10px 14px', '10px 14px'],
                ['Font size', '13px', '12px', '12px'],
                ['Font family', 'Nunito', 'Inter', 'Inter'],
                ['Shadow', '0.28', '0.22', '0.18'],
                ['Border width', '2.5px', '2px', '1.5px'],
                ['Backdrop blur', '6px', '4px', '4px'],
              ] as const).map(([token, sd, smp, sma]) => (
                <tr key={token}>
                  <td className="p-2 border font-medium text-sm">{token}</td>
                  <td className="p-2 border text-sm">{sd}</td>
                  <td className="p-2 border text-sm">{smp}</td>
                  <td className="p-2 border text-sm">{sma}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="📦 Data Flow (Parsing Chain)">
          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm mb-2 leading-relaxed">{`Material DB
  └─ metadata.slides  (markdown string)
       │
       ▼
  parseMindmapFromMarkdown(raw)
       │  Split by "---"
       │  Find ## headers → branch nodes
       │  Find bullets → leaf nodes
       ▼
  MindmapNode[]  ──────────────────────────┐
       │                                    │
       ▼                                    ▼
  ReactFlowMindmap                      createMindmapNodes()
       │                                    │
       │  createNodes():                    │  From structured data
       │    center node                     │  (skip parse)
       │    branch nodes (with icons)       │
       │    leaf nodes (max 2/branch)       │
       │                                    │
       │  layoutNodes():                    │
       │    radial quadrant positioning     │
       │                                    │
       │  createEdges():                    │
       │    center → branch (animated)      │
       │    branch → leaf                   │
       ▼
  ReactFlow + CustomNode + CSS animations`}</pre>
        </Section>

        <Section title="🧪 Cara Test / Preview">
          <p className="text-slate-700 mb-3">
            Untuk test mindmap dengan data dummy langsung:
          </p>
          <CodeBlock>{`// 1. Buka URL:
https://senangbelajar.web.id/student/mindmap/ipa?id=<materialId>

// 2. Pastikan material punya metadata.slides:
const material = await prisma.material.findUnique({ where: { id } });
// metadata.slides harus berisi markdown ## + bullets

// 3. Atau via template utility langsung di file:
import { createMindmapNodes } from "@/lib/mindmap-template";

const nodes = createMindmapNodes("IPA", [
  { label: "Sistem Tata Surya", children: ["Planet dalam", "Planet luar"] },
  { label: "Gerhana", children: ["Matahari", "Bulan"] },
]);`}</CodeBlock>
        </Section>

        <Section title="🔧 Tips Development">
          <div className="space-y-3">
            <TroubleCard
              problem="🧠 Ingin ganti layout?"
              solution="Edit fungsi layoutNodes() di ReactFlowMindmap.tsx — ubah branchRadius, leafStep, atau wedgeUtilization. Jangan ganti pendekatan radial."
            />
            <TroubleCard
              problem="🎭 Ingin tambah icon?"
              solution="Tambah mapping di iconMap.ts → resolveIcon() dan animMap.ts → getAnimForIcon(). Format: nama icon kebab-case → Lucide React component."
            />
            <TroubleCard
              problem="🎨 Ingin ubah warna palette?"
              solution="Edit array COLORS di ReactFlowMindmap.tsx. 8 warna, auto-cycle per branch."
            />
            <TroubleCard
              problem="📐 Isi mindmap terlalu penuh?"
              solution="Kurangi max leaf per branch (line rn.children.slice(0, 2)) atau naikkan branchRadius di layoutNodes()."
            />
          </div>
        </Section>

      </div>
    </div>
  )
}

// ─── Components ────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-semibold text-amber-800 mb-4 pb-2 border-b border-amber-200">
        {title}
      </h2>
      {children}
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm mb-4 leading-relaxed">
      {children}
    </pre>
  )
}

function MiniCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="p-4 rounded-xl bg-white border border-amber-200 hover:border-amber-300 hover:shadow-sm transition-all">
      <h4 className="font-semibold text-amber-900 text-sm mb-2">{title}</h4>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="text-xs text-slate-600">• {item}</li>
        ))}
      </ul>
    </div>
  )
}

function NodeTypeCard({
  name,
  emoji,
  bg,
  border,
  style,
  anim,
  glow,
}: {
  name: string
  emoji: string
  bg: string
  border: string
  style: string
  anim: string
  glow: string
}) {
  return (
    <div className="p-4 rounded-xl bg-white border border-amber-200">
      <div className="text-2xl mb-2">{emoji}</div>
      <h4 className="font-semibold text-amber-900 text-sm mb-1">{name}</h4>
      <table className="w-full text-xs">
        <tbody>
          {[
            ['BG', bg],
            ['Border', border],
            ['Style', style],
            ['Anim', anim],
          ].map(([k, v]) => (
            <tr key={k}>
              <td className="pr-2 text-slate-500 align-top">{k}</td>
              <td className="text-slate-700 font-mono text-[10px] leading-tight">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TroubleCard({ problem, solution }: { problem: string; solution: string }) {
  return (
    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
      <p className="font-semibold text-amber-800 text-sm mb-1">{problem}</p>
      <p className="text-amber-700 text-sm">{solution}</p>
    </div>
  )
}
