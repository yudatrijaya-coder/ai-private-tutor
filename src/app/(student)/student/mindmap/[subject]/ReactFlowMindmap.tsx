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
import dagre from "@dagrejs/dagre";

import { CustomNode, type CustomNodeDataType } from "@/components/mindmap/CustomNode";

const COLORS = ["#FF6B6B","#4ECDC4","#FFD93D","#6BCB77","#A66CFF","#FF8C42","#4D96FF","#FF6BDF"];

const nodeTypes = { mindmapNode: CustomNode as any };

function layoutNodes(nodes: Node[], edges: any[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 200, ranksep: 360, marginx: 200, marginy: 160 });
  nodes.forEach((n) => g.setNode(n.id, { width: n.data?.isCenter ? 200 : 190, height: n.data?.isCenter ? 64 : 56 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const positioned = nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: pos.x - (n.data?.isCenter ? 100 : 95),
        y: pos.y - (n.data?.isCenter ? 32 : 28),
      },
    };
  });

  const center = positioned.find((n) => n.id === "center");
  if (center) center.position = { x: 80, y: 360 - 32 };

  const branches = positioned.filter((n) => n.id !== "center" && !n.id.includes("-leaf-"));
  const leafs = positioned.filter((n) => n.id.includes("-leaf-"));

  const totalBranches = branches.length;
  const spreadHeight = Math.max(totalBranches * 140, 400);
  const startY = 360 - spreadHeight / 2;
  branches.forEach((n, i) => {
    const gap = spreadHeight / Math.max(totalBranches - 1, 1);
    n.position = {
      x: 340 + Math.floor(i / 4) * 320,
      y: startY + i * gap,
    };
  });

  leafs.forEach((n, i) => {
    const parentIndex = Math.min(Math.floor(i / 2), Math.max(branches.length - 1, 0));
    const parent = branches[parentIndex];
    const col = i % 2;
    n.position = {
      x: (parent?.position?.x ?? 340) + 300 + col * 260,
      y: (parent?.position?.y ?? 360) + (col === 0 ? -28 : 28),
    };
  });

  return positioned;
}

function buildEdges(rawNodes: { id: string; children: { label: string }[] }[], centerId: string) {
  const edges: any[] = [];
  rawNodes.forEach((rn, i) => {
    const color = COLORS[i % COLORS.length];
    edges.push({
      id: `e-c-${rn.id}`, source: centerId, target: rn.id, type: "default",
      style: { stroke: color, strokeWidth: 2.8, strokeOpacity: 0.7 },
      animated: true,
    });
    rn.children.slice(0, 2).forEach((child, j) => {
      edges.push({
        id: `e-${rn.id}-leaf-${j}`,
        source: rn.id,
        target: `${rn.id}-leaf-${j}`,
        type: "default",
        style: { stroke: color, strokeWidth: 1.8, strokeOpacity: 0.42 },
      });
    });
  });
  return edges;
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
    return { nodes: layoutNodes(ns, []), edges: buildEdges(rawNodes, "center") };
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
