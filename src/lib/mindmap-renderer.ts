/**
 * Render mindmap data as an SVG image that can be converted to PNG.
 * Uses the MindmapNode structure from mindmap-template.ts.
 *
 * Layout: radial mindmap with center → branches → leaves
 * - Center node = subject/topic
 * - Branch nodes (level 1) = main concepts
 * - Leaf nodes (level 2) = details
 */

export interface MindmapNode {
  id?: string;
  label: string;
  children?: { label: string }[];
}

/** Color palette for branches */
const BRANCH_COLORS = [
  { bg: "#818cf8", text: "#ffffff" },  // indigo
  { bg: "#34d399", text: "#ffffff" },  // emerald
  { bg: "#fbbf24", text: "#1e293b" },  // amber
  { bg: "#f472b6", text: "#ffffff" },  // pink
  { bg: "#fb923c", text: "#ffffff" },  // orange
  { bg: "#06b6d4", text: "#ffffff" },  // cyan
  { bg: "#a78bfa", text: "#ffffff" },  // violet
  { bg: "#ec4899", text: "#ffffff" },  // rose
  { bg: "#14b8a6", text: "#ffffff" },  // teal
  { bg: "#f97316", text: "#ffffff" },  // dark orange
];

/**
 * Generate SVG string for mindmap data.
 */
export function mindmapToSvg(
  nodes: MindmapNode[],
  title: string,
): string {
  const centerX = 500;
  const centerY = 400;
  const branchRadius = 220;
  const leafRadius = 140;
  const centerRadius = 55;
  const branchNodeR = 40;
  const leafNodeR = 14;

  // Only show top 6 branches to avoid overcrowding
  const visibleBranches = nodes.slice(0, 6);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800" width="1000" height="800">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.12"/>
    </filter>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="6" flood-opacity="0.25"/>
    </filter>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1000" height="800" fill="url(#bgGrad)" rx="16"/>

  <!-- Title -->
  <text x="500" y="45" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="22" font-weight="bold">${escapeXml(title)}</text>
  <line x1="200" y1="62" x2="800" y2="62" stroke="#334155" stroke-width="1" opacity="0.5"/>

  <!-- Center node -->
  <circle cx="${centerX}" cy="${centerY}" r="${centerRadius}" fill="#3b82f6" filter="url(#glow)"/>
  <text x="${centerX}" y="${centerY - 2}" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold">📚</text>
  <text x="${centerX}" y="${centerY + 16}" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="10">Materi</text>
`;

  const numBranches = visibleBranches.length;
  // Distribute branches evenly around the circle (start from top-right)
  const angleOffset = -Math.PI / 2;
  const angleStep = (2 * Math.PI) / Math.max(numBranches, 1);

  for (let i = 0; i < numBranches; i++) {
    const angle = angleOffset + i * angleStep;
    const bx = centerX + Math.cos(angle) * branchRadius;
    const by = centerY + Math.sin(angle) * branchRadius;
    const color = BRANCH_COLORS[i % BRANCH_COLORS.length];

    // Line from center to branch
    svg += `  <line x1="${centerX + Math.cos(angle) * centerRadius}" y1="${centerY + Math.sin(angle) * centerRadius}" x2="${bx}" y2="${by}" stroke="#475569" stroke-width="2" opacity="0.6"/>\n`;

    // Branch node (rounded rect)
    const label = visibleBranches[i].label;
    const labelWidth = Math.max(label.length * 8, 60);
    const rx = labelWidth / 2 + 12;
    const ry = 20;

    svg += `  <rect x="${bx - rx}" y="${by - ry}" width="${rx * 2}" height="${ry * 2}" rx="12" fill="${color.bg}" filter="url(#shadow)"/>\n`;
    svg += `  <text x="${bx}" y="${by + 5}" text-anchor="middle" fill="${color.text}" font-family="sans-serif" font-size="13" font-weight="bold">${escapeXml(label)}</text>\n`;

    // Leaf children
    const children = visibleBranches[i].children || [];
    const visibleChildren = children.slice(0, 8);
    const numLeaves = visibleChildren.length;

    // Determine leaf radius offset — spread leaves out
    for (let j = 0; j < numLeaves; j++) {
      const leafAngle = angle + (j - (numLeaves - 1) / 2) * 0.35;
      const lx = bx + Math.cos(leafAngle) * leafRadius;
      const ly = by + Math.sin(leafAngle) * leafRadius;

      // Line from branch to leaf
      svg += `  <line x1="${bx + Math.cos(leafAngle) * ry}" y1="${by + Math.sin(leafAngle) * ry}" x2="${lx}" y2="${ly}" stroke="#334155" stroke-width="1.5" opacity="0.4"/>\n`;

      // Leaf node (circle)
      svg += `  <circle cx="${lx}" cy="${ly}" r="${leafNodeR}" fill="${color.bg}" opacity="0.85"/>\n`;

      // Leaf text
      const childLabel = visibleChildren[j].label;
      const truncatedLabel = childLabel.length > 20 ? childLabel.substring(0, 18) + "..." : childLabel;
      svg += `  <text x="${lx}" y="${ly + 3}" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="8" font-weight="bold">${escapeXml(truncatedLabel)}</text>\n`;
    }
  }

  svg += `</svg>`;
  return svg;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
