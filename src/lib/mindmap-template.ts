/**
 * Mindmap Template Utility
 * =========================
 * Converts structured markdown content into mindmap node data.
 *
 * ## Template Format (Markdown)
 *
 * ```markdown
 * ## Judul Topik
 * - Sub topik 1
 * - Sub topik 2
 *
 * ## Judul Topik Lain
 * - Sub topik A
 * - Sub topik B
 * - Sub topik C
 * ```
 *
 * Setiap `##` menjadi **Branch node**.
 * Setiap bullet (`-` / `*` / `1.`) menjadi **Leaf node** dari branch di atasnya.
 *
 * ## Cara Pakai
 *
 * ```ts
 * import { parseMindmapFromMarkdown } from "@/lib/mindmap-template";
 *
 * const rawNodes = parseMindmapFromMarkdown(slidesMarkdown);
 * // → [{ id: "branch-0", label: "Judul Topik", children: [{ label: "Sub topik 1" }, ...] }, ...]
 * ```
 */

export interface MindmapNode {
  id: string;
  label: string;
  children: { label: string }[];
}

/**
 * Parse markdown content into mindmap nodes.
 * Works with standard slide format (## headers + bullet lists).
 */
export function parseMindmapFromMarkdown(raw: string): MindmapNode[] {
  const sections = raw.split("\n---\n").map((s) => s.trim()).filter(Boolean);
  const nodes: MindmapNode[] = [];

  for (const sec of sections) {
    const lines = sec.split("\n").filter((l) => l.trim());
    const h = lines.find((l) => l.startsWith("## "));
    if (!h) continue;
    const label = h.replace(/^##\s*/, "").trim();
    const children = lines
      .filter((l) => /^[-*]/.test(l) || /^\d\./.test(l))
      .map((l) => ({ label: l.replace(/^[-*\d.]\s*/, "").trim() }))
      .filter((c) => c.label.length > 0);
    if (label) nodes.push({ id: "", label, children });
  }

  // Assign sequential IDs
  nodes.forEach((n, i) => {
    n.id = `branch-${i}`;
  });

  return nodes;
}

/**
 * Create mindmap data directly from structured data (bypass parse).
 * Useful when content is already in node format.
 */
export function createMindmapNodes(
  centerTitle: string,
  branches: { label: string; children: string[] }[]
): MindmapNode[] {
  return branches.map((b, i) => ({
    id: `branch-${i}`,
    label: b.label,
    children: b.children.map((c) => ({ label: c })),
  }));
}
