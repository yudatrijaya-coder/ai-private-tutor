#!/usr/bin/env bash
# Probe produksi B-02 / B-04 / C-02.
#
# Usage: bash scripts/probe-b02-c02.sh <studentId> <identifier> <name> <grade> <materialId>
# e.g.   bash scripts/probe-b02-c02.sh 0d3fbf85-... RAIHAN001 Raihan SMP_1 0524c9c7...
#
# The student_session token is minted into a shell variable and never printed.
set -u
cd "$(dirname "$0")/.."
B=https://senangbelajar.web.id

SID="${1:?student uuid}"
IDENT="${2:?studentIdentifier}"
NAME="${3:?name}"
GRADE="${4:?gradeLevel}"
MID="${5:?material id}"

echo "=== C-02 produksi ==="
for p in "/api/auth/callback" "/api/auth/callback?x=1"; do
  echo "  [$(curl -s -o /dev/null -w '%{http_code}' -X POST "$B$p" -H 'Content-Type: application/json' -d '{}')] POST $p  (harus 400)"
done
echo "  [$(curl -s -o /dev/null -w '%{http_code}' -X POST "$B/api/auth/callback/credentials" -H 'Content-Type: application/json' -d '{}')] POST /api/auth/callback/credentials  (harus 302)"

echo ""
echo "=== B-02 produksi: material $MID ==="
T=$(node scripts/mint-student-token.cjs "$SID" "$IDENT" "$NAME" "$GRADE" 2>/dev/null | tail -1)
if [ -z "$T" ]; then
  echo "  (token gagal)"
  exit 1
fi
curl -s "$B/api/students/material/$MID?source=sibi" \
  -H "Cookie: student_session=$T" -o /tmp/mat.json -w '  http=%{http_code}\n'
node -e '
const d = require("/tmp/mat.json");
const pat = /the user wants|analyze the request|deconstruct the|identify the goal|target audience/i;

// Walk the whole response so a leak in ANY field is caught — this is how the
// contaminated `mindmap` field was found in the first place.
const hits = [];
(function walk(o, p) {
  if (Array.isArray(o)) return o.forEach((v, i) => walk(v, `${p}[${i}]`));
  if (o && typeof o === "object") return Object.entries(o).forEach(([k, v]) => walk(v, p ? `${p}.${k}` : k));
  if (typeof o === "string" && pat.test(o)) hits.push(p);
})(d, "");

console.log("  field bocor               :", hits.length ? hits.join(", ") + "  (GAGAL)" : "TIDAK ADA (ok)");
for (const f of ["slides", "mindmap", "content"]) {
  const v = d[f];
  const t = typeof v === "string" ? v : JSON.stringify(v ?? "");
  console.log(`  ${f.padEnd(25)}: ${t.length} char  ${t.slice(0, 60).replace(/\s+/g, " ")}`);
}
'
