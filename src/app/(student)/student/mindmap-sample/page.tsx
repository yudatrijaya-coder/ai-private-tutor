"use client";

import { useMemo } from "react";
import { ReactFlow, MiniMap, Controls, useNodesState, useEdgesState, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CustomNode, type CustomNodeDataType } from "@/components/mindmap/CustomNode";
import { resolveIcon, isLucideIcon } from "@/components/mindmap/iconMap";

const COLORS = ["#FF6B6B","#4ECDC4","#FFD93D","#6BCB77","#A66CFF","#FF8C42","#4D96FF","#FF6BDF"];
const nodeTypes = { mindmapNode: CustomNode as any };

// Sample data: MTL - Suku Banyak
const SAMPLE_NODES = [
  { id: "root", label: "Matematika Tingkat Lanjut", children: [
    { label: "Polinomial", description: "Pengertian • Derajat • Syarat" },
    { label: "Teorema Sisa", description: "Pembagian • Algoritma • Faktor" },
    { label: "Teorema Faktor", description: "Akar-akar • Vieta • Aplikasi" },
  ]},
  { id: "branch-1", label: "Operasi Polinomial", children: [
    { label: "Penjumlahan", description: "Suku sejenis" },
    { label: "Perkalian", description: "Distributif" },
  ]},
  { id: "branch-2", label: "Diskriminan", children: [
    { label: "D > 0", description: "Dua akar real" },
    { label: "D = 0", description: "Akar kembar" },
  ]},
];

function layoutNodes(nodes: Node[]): Node[] {
  const centerX = 420, centerY = 380, branchRadius = 360;
  const positioned = nodes.map(n => ({ ...n, position: { x: 0, y: 0 } }));
  const center = positioned.find(n => n.id === "center");
  if (center) center.position = { x: centerX - 100, y: centerY - 32 };
  const branches = positioned.filter(n => n.id !== "center" && !n.id.includes("-leaf-"));
  const leafs = positioned.filter(n => n.id.includes("-leaf-"));
  const N = branches.length;
  if (N === 0) return positioned;
  branches.forEach((n, i) => {
    const angleDeg = (i / N) * 360 - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    n.position = { x: centerX + branchRadius * Math.cos(angleRad) - 95, y: centerY + branchRadius * Math.sin(angleRad) - 28 };
  });
  const leafGroups: Record<string, typeof leafs> = {};
  leafs.forEach(n => {
    const parentId = n.id.replace(/-leaf-\d+$/, "");
    if (!leafGroups[parentId]) leafGroups[parentId] = [];
    leafGroups[parentId].push(n);
  });
  Object.entries(leafGroups).forEach(([parentId, children]) => {
    const parentIndex = branches.findIndex(b => b.id === parentId);
    if (parentIndex === -1) return;
    const K = children.length;
    if (K === 0) return;
    const branchAngleDeg = (parentIndex / N) * 360 - 90;
    const wedgeDeg = 360 / N;
    const utilization = 0.7;
    const paddedWedge = wedgeDeg * utilization;
    children.forEach((n, j) => {
      const spreadOffset = (K > 1) ? ((j / (K - 1)) - 0.5) * paddedWedge : 0;
      const angleDeg = branchAngleDeg + spreadOffset;
      const angleRad = (angleDeg * Math.PI) / 180;
      const distance = (branchRadius + 200) + j * 100;
      n.position = { x: centerX + distance * Math.cos(angleRad) - 95, y: centerY + distance * Math.sin(angleRad) - 28 };
    });
  });
  return positioned;
}

function angleDir(from: {x:number, y:number}, to: {x:number, y:number}): string {
  const deg = ((Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI) + 360) % 360;
  if (deg >= 315 || deg < 45) return "right";
  if (deg >= 45 && deg < 135) return "bottom";
  if (deg >= 135 && deg < 225) return "left";
  return "top";
}

export default function MindmapSamplePage() {
  const { nodes, edges } = useMemo(() => {
    const ns: Node<CustomNodeDataType>[] = [];
    ns.push({ id: "center", type: "mindmapNode", position: { x: 0, y: 0 }, data: { label: "🧠 Suku Banyak", color: "#FFD93D", isCenter: true, theme: "sd" } as CustomNodeDataType });
    SAMPLE_NODES.forEach((rn, i) => {
      const color = COLORS[i % COLORS.length];
      const iconName = resolveIcon(rn.label);
      ns.push({ id: rn.id, type: "mindmapNode", position: { x: 0, y: 0 }, data: { label: rn.label, color, icon: iconName, isLucideIcon: isLucideIcon(iconName), theme: "sd", description: rn.children.map(c => c.label).join(" • ") } as CustomNodeDataType });
      rn.children.slice(0, 2).forEach((child, j) => {
        const leafIcon = resolveIcon(child.label);
        ns.push({ id: `${rn.id}-leaf-${j}`, type: "mindmapNode", position: { x: 0, y: 0 }, data: { label: child.label, color, icon: leafIcon, isLucideIcon: isLucideIcon(leafIcon), theme: "sd" } as CustomNodeDataType });
      });
    });
    const positioned = layoutNodes(ns);
    const posMap = new Map(positioned.map(n => [n.id, n.position]));
    const es: any[] = [];
    SAMPLE_NODES.forEach((rn, i) => {
      const color = COLORS[i % COLORS.length];
      const cPos = posMap.get("center")!, bPos = posMap.get(rn.id)!;
      const branchDir = angleDir(cPos, bPos);
      es.push({ id: `e-c-${rn.id}`, source: "center", target: rn.id, sourceHandle: `s-${branchDir}`, targetHandle: `t-${angleDir(bPos, cPos)}`, type: "default", style: { stroke: color, strokeWidth: 4.5, strokeOpacity: 0.65 }, animated: true });
      rn.children.slice(0, 2).forEach((child, j) => {
        const leafId = `${rn.id}-leaf-${j}`;
        const leafPos = posMap.get(leafId)!;
        es.push({ id: `e-${rn.id}-leaf-${j}`, source: rn.id, target: leafId, sourceHandle: `s-${branchDir}`, targetHandle: `t-${angleDir(leafPos, bPos)}`, type: "default", style: { stroke: color, strokeWidth: 3.2, strokeOpacity: 0.4 } });
      });
    });
    return { nodes: positioned, edges: es };
  }, []);

  const [flowNodes, , onNodesChange] = useNodesState(nodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(edges);

  return (
    <div className="w-full relative" style={{ height: "calc(100vh - 110px)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <radialGradient id="blob-pink" cx="20%" cy="15%" r="60%"><stop offset="0%" stopColor="#fbc7d4" stopOpacity="0.35" /><stop offset="100%" stopColor="#fbc7d4" stopOpacity="0" /></radialGradient>
            <radialGradient id="blob-cyan" cx="80%" cy="80%" r="60%"><stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.3" /><stop offset="100%" stopColor="#a7f3d0" stopOpacity="0" /></radialGradient>
            <radialGradient id="blob-blue" cx="60%" cy="10%" r="50%"><stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.25" /><stop offset="100%" stopColor="#bfdbfe" stopOpacity="0" /></radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#blob-pink)" />
          <rect width="100%" height="100%" fill="url(#blob-cyan)" />
          <rect width="100%" height="100%" fill="url(#blob-blue)" />
        </svg>
      </div>
      <ReactFlow nodes={flowNodes} edges={flowEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.15 }} minZoom={0.3} maxZoom={2} attributionPosition="bottom-left" style={{ background: "transparent", position: "relative", zIndex: 1 }}>
        <Controls showInteractive={false} />
        <MiniMap nodeStrokeColor={(n: any) => n.data?.color || "#ccc"} nodeColor={(n: any) => n.data?.isCenter ? "#FFD93D" : n.data?.color + "40"} nodeBorderRadius={6} style={{ borderRadius: 10 }} />
      </ReactFlow>
    </div>
  );
}
