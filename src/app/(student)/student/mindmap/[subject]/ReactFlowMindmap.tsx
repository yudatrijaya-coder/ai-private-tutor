"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

import { Globe2, Compass, Flame, Map, Sun, Mountain, Ship, Bird, BookOpen, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  geografis: Globe2, astronomis: Compass, maritim: Ship, agraris: Mountain,
  cincin: Flame, api: Flame, pasifik: Globe2, unik: Bird, potensi: Sun,
  peta: Map, budaya: BookOpen, bersejarah: BookOpen,
};

function getIcon(name: string): LucideIcon | null {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(ICON_MAP)) if (lower.includes(key)) return icon;
  return null;
}

const COLORS = ["#FF6B6B","#4ECDC4","#FFD93D","#6BCB77","#A66CFF","#FF8C42","#4D96FF","#FF6BDF"];

interface NodeData { label: string; color: string; isCenter?: boolean; icon?: string; }

function MindmapNode({ data }: { data: NodeData }) {
  const isCenter = data.isCenter;
  const IconComp = data.icon ? getIcon(data.icon) : null;
  const bg = isCenter
    ? "linear-gradient(135deg, #FFD93D 0%, #FFB347 100%)"
    : `${data.color}18`;
  const border = isCenter ? "#E6A800" : data.color;
  const shadow = isCenter
    ? "0 10px 24px rgba(230, 168, 0, 0.28)"
    : `0 8px 20px ${data.color}24`;

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        className="font-bold transition-all duration-150 hover:scale-105"
        style={{
          background: bg,
          border: `2px solid ${border}`,
          borderRadius: isCenter ? "999px" : "20px",
          color: isCenter ? "#fff" : "#2F2A1E",
          boxShadow: shadow,
          maxWidth: isCenter ? 180 : 220,
          padding: isCenter ? "12px 22px" : "10px 14px",
          fontSize: isCenter ? "15px" : "12px",
          fontFamily: "'Nunito', sans-serif",
          backdropFilter: isCenter ? "none" : "blur(4px)",
        }}
      >
        <div className="flex items-center gap-2 justify-center">
          {IconComp && !isCenter && <IconComp size={16} color={data.color} strokeWidth={2.5} />}
          <span className="leading-tight text-center">{data.label}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { mindmapNode: MindmapNode };

function layoutNodes(nodes: Node[], edges: any[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 140, ranksep: 120, marginx: 100, marginy: 100 });
  nodes.forEach((n) => g.setNode(n.id, { width: n.data?.isCenter ? 250 : 220, height: n.data?.isCenter ? 80 : 68 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const positioned = nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: {
        x: pos.x - (n.data?.isCenter ? 125 : 110),
        y: pos.y - (n.data?.isCenter ? 40 : 34),
      },
    };
  });

  const center = positioned.find((n) => n.id === "center");
  const branches = positioned.filter((n) => n.id !== "center" && !n.id.includes("-leaf-"));
  const leafs = positioned.filter((n) => n.id.includes("-leaf-"));

  const centerX = 540;
  const centerY = 330;
  if (center) center.position = { x: centerX - 125, y: centerY - 40 };

  // Place branches in a wide 2-row arc to prevent vertical stacking.
  const perRow = Math.ceil(branches.length / 2);
  branches.forEach((n, i) => {
    const row = i < perRow ? 0 : 1;
    const col = i % perRow;
    n.position = {
      x: 160 + col * 280,
      y: row === 0 ? 120 : 420,
    };
  });

  // Keep only one or two leaf snippets per branch and place them beside their parent.
  leafs.slice(0, branches.length * 2).forEach((n, i) => {
    const parentIndex = Math.min(Math.floor(i / 2), Math.max(branches.length - 1, 0));
    const parent = branches[parentIndex] || branches[0];
    const side = i % 2 === 0 ? 1 : -1;
    n.position = {
      x: (parent?.position?.x ?? centerX) + (side === 1 ? 180 : -10),
      y: (parent?.position?.y ?? centerY) + (i % 2 === 0 ? 92 : 138),
    };
  });

  return positioned;
}

function buildEdges(rawNodes: { id: string; children: { label: string }[] }[], centerId: string) {
  const edges: any[] = [];
  rawNodes.forEach((rn, i) => {
    const color = COLORS[i % COLORS.length];
    edges.push({
      id: `e-c-${rn.id}`, source: centerId, target: rn.id, type: "smoothstep",
      style: { stroke: color, strokeWidth: 2.8, strokeOpacity: 0.7 },
    });
    rn.children.slice(0, 2).forEach((child, j) => {
      edges.push({
        id: `e-${rn.id}-leaf-${j}`,
        source: rn.id,
        target: `${rn.id}-leaf-${j}`,
        type: "smoothstep",
        style: { stroke: color, strokeWidth: 1.8, strokeOpacity: 0.42 },
      });
    });
  });
  return edges;
}

interface Props { centerTitle: string; rawNodes: { id: string; label: string; children: { label: string }[] }[]; }

export function ReactFlowMindmap({ centerTitle, rawNodes }: Props) {
  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = [];
    ns.push({
      id: "center",
      type: "mindmapNode",
      position: { x: 0, y: 0 },
      data: { label: `🧠 ${centerTitle}`, color: "#FFD93D", isCenter: true },
    });
    rawNodes.forEach((rn, i) => {
      const color = COLORS[i % COLORS.length];
      ns.push({
        id: rn.id,
        type: "mindmapNode",
        position: { x: 0, y: 0 },
        data: { label: rn.label, color, icon: rn.label },
      });
      rn.children.slice(0, 2).forEach((child, j) => {
        ns.push({
          id: `${rn.id}-leaf-${j}`,
          type: "mindmapNode",
          position: { x: 0, y: 0 },
          data: { label: child.label, color, icon: child.label },
        });
      });
    });
    return { nodes: layoutNodes(ns, []), edges: buildEdges(rawNodes, "center") };
  }, [centerTitle, rawNodes]);

  const [flowNodes, , onNodesChange] = useNodesState(nodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(edges);

  return (
    <div className="w-full relative" style={{ height: "calc(100vh - 110px)" }}>
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-15" style={{ zIndex: 0 }}>
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <pattern id="gf" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="#333" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gf)" />
        </svg>
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-gradient-to-br from-pink-400 via-purple-300 to-blue-200 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-gradient-to-tr from-cyan-400 via-sky-300 to-indigo-200 blur-3xl animate-pulse" style={{ animationDelay: "3s" }} />
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
