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
 *
 * Supports two section styles:
 *   1. --- separated sections (each has one ## heading + bullets)
 *   2. Flat markdown with multiple ## headings (no --- separators)
 *      In this case, each ## heading starts a new branch,
 *      with its following bullet lines as children.
 */
export function parseMindmapFromMarkdown(raw: string): MindmapNode[] {
  const nodes: MindmapNode[] = [];

  // Strategy 1 (PREFERRED): split on ## headings directly (line-by-line).
  // This produces proper multi-branch mindmaps from hierarchical slides
  // that use ## sections without --- separators.
  {
    const lines = raw.split("\n");
    let currentHeading: string | null = null;
    let currentChildren: { label: string }[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const headingMatch = trimmed.match(/^##\s+(.+)/);
      if (headingMatch) {
        // Save previous heading
        if (currentHeading && currentChildren.length > 0) {
          nodes.push({ id: "", label: currentHeading, children: [...currentChildren] });
        }
        currentHeading = headingMatch[1].trim();
        currentChildren = [];
      } else if (currentHeading && (/^[-*]/.test(trimmed) || /^\d\./.test(trimmed))) {
        const childLabel = trimmed.replace(/^[-*\d.]\s*/, "").trim();
        if (childLabel.length > 0) {
          currentChildren.push({ label: childLabel });
        }
      }
    }

    // Don't forget the last heading
    if (currentHeading && currentChildren.length > 0) {
      nodes.push({ id: "", label: currentHeading, children: [...currentChildren] });
    }
  }

  // If Strategy 1 produced only 1 branch with many children, it might be
  // because the text uses --- section separators instead of multiple ## headings.
  // Fall back to---splitting, which groups bullets to their section heading.
  if (nodes.length <= 1) {
    const altNodes: MindmapNode[] = [];
    nodes.length = 0; // clear

    const sections = raw.split("\n---\n").map((s) => s.trim()).filter(Boolean);
    for (const sec of sections) {
      const lines = sec.split("\n").filter((l) => l.trim());
      const h = lines.find((l) => l.startsWith("## "));
      if (!h) continue;
      const label = h.replace(/^##\s*/, "").trim();
      const children = lines
        .filter((l) => /^[-*]/.test(l) || /^\d\./.test(l))
        .map((l) => ({ label: l.replace(/^[-*\d.]\s*/, "").trim() }))
        .filter((c) => c.label.length > 0);
      if (label) altNodes.push({ id: "", label, children });
    }

    // Use alt result only if it produces more branches than Strategy 1
    if (altNodes.length > 1) {
      nodes.push(...altNodes);
    }
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
