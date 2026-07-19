#!/usr/bin/env node
const { execSync } = require("child_process");

// Get all mindmap data from DB
const raw = execSync(`
  sudo -u postgres psql -d ai_private_tutor -t -A -F'¬' \\
    -c "SELECT id, metadata->>'mindmap' FROM \\\"Material\\\" WHERE metadata->'mindmap' IS NOT NULL AND metadata->'mindmap' LIKE '{%'"
`, { encoding: "utf8", shell: "/bin/bash" });

const rows = raw.trim().split("\n").filter(Boolean).map(l => {
  const delim = l.indexOf("¬");
  if (delim < 0) return null;
  return { id: l.slice(0, delim).trim(), mindmap: l.slice(delim + 1) };
}).filter(Boolean);

console.log(`Found ${rows.length} mindmaps in {nodes,connections} format`);

let count = 0;
for (const row of rows) {
  if (!row.mindmap) continue;
  try {
    const mm = JSON.parse(row.mindmap);
    if (!mm.nodes || !mm.connections) continue;
    
    const branchNodes = mm.nodes.filter(n => n.id !== "center");
    const nodes = [];
    for (const n of branchNodes) {
      const connections = mm.connections.filter(c => c.source === n.id || c.target === n.id);
      const children = [];
      for (const conn of connections) {
        const target = mm.nodes.find(nn => nn.id === (conn.source === n.id ? conn.target : conn.source));
        if (target && target.id !== "center") {
          children.push({ label: target.text || " " });
        }
      }
      nodes.push({ id: n.id, label: n.text || " ", children: children.slice(0, 2) });
    }
    
    const newJSON = JSON.stringify(nodes);
    const cmd = `sudo -u postgres psql -d ai_private_tutor -c "UPDATE \\\"Material\\\" SET metadata = jsonb_set(metadata, '{mindmap}', \\$$` + newJSON + `\\$\\$::jsonb) WHERE id = '${row.id}'"`;
    execSync(cmd, { encoding: "utf8", shell: "/bin/bash" });
    count++;
  } catch(e) {
    // skip
  }
}

console.log(`Converted ${count} mindmaps`);