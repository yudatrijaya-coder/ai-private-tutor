"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { CustomNode, type CustomNodeDataType } from "@/components/mindmap/CustomNode";

const COLORS = ["#FF6B6B","#4ECDC4","#FFD93D","#6BCB77","#A66CFF","#FF8C42","#4D96FF","#FF6BDF"];

const nodeTypes = { mindmapNode: CustomNode as any };

/** Radial quadrant layout — every branch gets its own wedge, leaves spread within it. */
function layoutNodes(nodes: Node[], _edges: any[]): Node[] {
  const centerX = 420;
  const centerY = 380;
  const branchRadius = 360;

  const positioned = nodes.map((n) => ({ ...n, position: { x: 0, y: 0 } }));

  // Center node
  const center = positioned.find((n) => n.id === "center");
  if (center) {
    center.position = { x: centerX - 100, y: centerY - 32 };
  }

  const branches = positioned.filter((n) => n.id !== "center" && !n.id.includes("-leaf-"));
  const leafs = positioned.filter((n) => n.id.includes("-leaf-"));
  const N = branches.length;
  if (N === 0) return positioned;

  // Branches — evenly spaced around circle, starting at 12 o'clock (-90°)
  branches.forEach((n, i) => {
    const angleDeg = (i / N) * 360 - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    n.position = {
      x: centerX + branchRadius * Math.cos(angleRad) - 95,
      y: centerY + branchRadius * Math.sin(angleRad) - 28,
    };
  });

  // Group leaves by parent branch
  const leafGroups: Record<string, typeof leafs> = {};
  leafs.forEach((n) => {
    const parentId = n.id.replace(/-leaf-\d+$/, "");
    if (!leafGroups[parentId]) leafGroups[parentId] = [];
    leafGroups[parentId].push(n);
  });

  // Leaves — radiate outward from their parent branch
  Object.entries(leafGroups).forEach(([parentId, children]) => {
    const parentIndex = branches.findIndex((b) => b.id === parentId);
    if (parentIndex === -1) return;
    const K = children.length;
    if (K === 0) return;

    const branchAngleDeg = (parentIndex / N) * 360 - 90;
    const wedgeDeg = 360 / N;
    const utilization = 0.7;
    const paddedWedge = wedgeDeg * utilization;
    const margin = (wedgeDeg - paddedWedge) / 2;

    children.forEach((n, j) => {
      // Angle: slight spread within wedge, centered on branch direction
      const spreadOffset = (K > 1) ? ((j / (K - 1)) - 0.5) * paddedWedge : 0;
      const angleDeg = branchAngleDeg + spreadOffset;
      const angleRad = (angleDeg * Math.PI) / 180;

      // Distance: fan outward from just past branch outward — not locked to a single ring
      const distStart = branchRadius + 200;
      const distStep = 100;
      const distance = distStart + j * distStep;

      n.position = {
        x: centerX + distance * Math.cos(angleRad) - 95,
        y: centerY + distance * Math.sin(angleRad) - 28,
      };
    });
  });

  return positioned;
}

/** Pick cardinal direction from node A → node B for handle selection */
function angleDir(from: {x:number, y:number}, to: {x:number, y:number}): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const deg = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
  if (deg >= 315 || deg < 45) return "right";
  if (deg >= 45 && deg < 135) return "bottom";
  if (deg >= 135 && deg < 225) return "left";
  return "top";
}

interface Props { centerTitle: string; rawNodes: { id: string; label: string; children: { label: string }[] }[]; }

export function ReactFlowMindmap({ centerTitle, rawNodes }: Props) {
  const { nodes, edges } = useMemo(() => {
    const ns: Node<CustomNodeDataType>[] = [];
    ns.push({
      id: "center",
      type: "mindmapNode",
      position: { x: 0, y: 0 },
      data: { label: `🧠 ${centerTitle}`, color: "#FFD93D", isCenter: true, theme: "sd" } as CustomNodeDataType,
    });
    rawNodes.forEach((rn, i) => {
      const color = COLORS[i % COLORS.length];
      ns.push({
        id: rn.id,
        type: "mindmapNode",
        position: { x: 0, y: 0 },
        data: { label: rn.label, color, icon: rn.label, theme: "sd", description: rn.children.map(c => c.label).join(" • ") } as CustomNodeDataType,
      });
      rn.children.slice(0, 2).forEach((child, j) => {
        ns.push({
          id: `${rn.id}-leaf-${j}`,
          type: "mindmapNode",
          position: { x: 0, y: 0 },
          data: { label: child.label, color, icon: child.label, theme: "sd" } as CustomNodeDataType,
        });
      });
    });

    const positioned = layoutNodes(ns, []);

    // Position lookup
    const posMap = new Map(positioned.map(n => [n.id, n.position]));

    // Edges with directional handles
    const edges: any[] = [];
    rawNodes.forEach((rn, i) => {
      const color = COLORS[i % COLORS.length];
      const centerPos = posMap.get("center")!;
      const branchPos = posMap.get(rn.id)!;
      const branchDir = angleDir(centerPos, branchPos); // consistent radial direction
      edges.push({
        id: `e-c-${rn.id}`, source: "center", target: rn.id,
        sourceHandle: `s-${branchDir}`,
        targetHandle: `t-${angleDir(branchPos, centerPos)}`,
        type: "default",
        style: { stroke: color, strokeWidth: 3.5, strokeOpacity: 0.65 },
        animated: true,
      });
      rn.children.slice(0, 2).forEach((child, j) => {
        const leafId = `${rn.id}-leaf-${j}`;
        const leafPos = posMap.get(leafId)!;
        edges.push({
          id: `e-${rn.id}-leaf-${j}`,
          source: rn.id,
          target: leafId,
          sourceHandle: `s-${branchDir}`, // use branch's radial direction, not leaf-specific
          targetHandle: `t-${angleDir(leafPos, branchPos)}`,
          type: "default",
          style: { stroke: color, strokeWidth: 2.2, strokeOpacity: 0.4 },
        });
      });
    });

    return { nodes: positioned, edges };
  }, [centerTitle, rawNodes]);

  const [flowNodes, , onNodesChange] = useNodesState(nodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(edges);

  return (
    <div className="w-full relative" style={{ height: "calc(100vh - 110px)" }}>
      {/* Background dekoratif — dot grid + gradient blobs pastel */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="1.5" fill="#c084fc" opacity="0.18" />
            </pattern>
            <radialGradient id="blob-pink" cx="20%" cy="15%" r="60%">
              <stop offset="0%" stopColor="#fbc7d4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fbc7d4" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="blob-cyan" cx="80%" cy="80%" r="60%">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="blob-blue" cx="60%" cy="10%" r="50%">
              <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
          <rect width="100%" height="100%" fill="url(#blob-pink)" />
          <rect width="100%" height="100%" fill="url(#blob-cyan)" />
          <rect width="100%" height="100%" fill="url(#blob-blue)" />
        </svg>
      </div>

      <ReactFlow
        nodes={flowNodes} edges={flowEdges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3} maxZoom={2}
        attributionPosition="bottom-left"
        style={{ background: "transparent", position: "relative", zIndex: 1 }}
      >
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeColor={(n: any) => n.data?.color || "#ccc"}
          nodeColor={(n: any) => n.data?.isCenter ? "#FFD93D" : n.data?.color + "40"}
          nodeBorderRadius={6}
          style={{ borderRadius: 10 }}
        />
      </ReactFlow>
    </div>
  );
}
