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
import { resolveIcon, isLucideIcon } from "@/components/mindmap/iconMap";

const COLORS = ["#FF6B6B","#4ECDC4","#FFD93D","#6BCB77","#A66CFF","#FF8C42","#4D96FF","#FF6BDF","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD"];

const nodeTypes = { mindmapNode: CustomNode as any };

interface TopicNode {
  label: string;
  materialId: string;
  children: { label: string }[];
}

interface Props {
  subjectName: string;
  topics: TopicNode[];
  gradeLevel?: string;
}

/** 3-level radial layout: center → topics (ring 1) → sub-topics (ring 2) */
function layoutBigNodes(nodes: Node[]): Node[] {
  const centerX = 420;
  const centerY = 380;
  const topicRadius = 280;
  const leafRingStart = 460;
  const leafStep = 90;

  const positioned = nodes.map((n) => ({ ...n, position: { x: 0, y: 0 } }));

  // Center
  const center = positioned.find((n) => n.id === "center");
  if (center) center.position = { x: centerX - 100, y: centerY - 32 };

  const topicNodes = positioned.filter((n) => n.id.startsWith("topic-"));
  const leafNodes = positioned.filter((n) => n.id.includes("-leaf-"));
  const N = topicNodes.length;
  if (N === 0) return positioned;

  // Level 1: topics on a ring
  topicNodes.forEach((n, i) => {
    const angleDeg = (i / N) * 360 - 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    n.position = {
      x: centerX + topicRadius * Math.cos(angleRad) - 95,
      y: centerY + topicRadius * Math.sin(angleRad) - 28,
    };
  });

  // Level 2: leaves radiate outward from each topic
  const leafGroups: Record<string, typeof leafNodes> = {};
  leafNodes.forEach((n) => {
    const parentId = n.id.replace(/-leaf-\d+$/, "");
    if (!leafGroups[parentId]) leafGroups[parentId] = [];
    leafGroups[parentId].push(n);
  });

  Object.entries(leafGroups).forEach(([parentId, children]) => {
    const parentIndex = topicNodes.findIndex((b) => b.id === parentId);
    if (parentIndex === -1) return;
    const K = children.length;
    if (K === 0) return;

    const branchAngleDeg = (parentIndex / N) * 360 - 90;
    const wedgeDeg = 360 / N;
    const utilization = 0.7;
    const paddedWedge = wedgeDeg * utilization;

    children.forEach((n, j) => {
      const spreadOffset = K > 1 ? ((j / (K - 1)) - 0.5) * paddedWedge : 0;
      const angleDeg = branchAngleDeg + spreadOffset;
      const angleRad = (angleDeg * Math.PI) / 180;
      const distance = leafRingStart + j * leafStep;

      n.position = {
        x: centerX + distance * Math.cos(angleRad) - 95,
        y: centerY + distance * Math.sin(angleRad) - 28,
      };
    });
  });

  return positioned;
}

/** Direction helper for handle placement */
function angleDir(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const deg = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
  if (deg >= 315 || deg < 45) return "right";
  if (deg >= 45 && deg < 135) return "bottom";
  if (deg >= 135 && deg < 225) return "left";
  return "top";
}

/** Klik topic node → navigasi ke mindmap detail */
function topicLink(materialId: string, subject: string): string {
  return `/student/mindmap/${encodeURIComponent(subject)}?id=${materialId}`;
}

export function BigMindmap({ subjectName, topics, gradeLevel }: Props) {
  const theme = gradeLevel === "SD_5" ? "sd" : gradeLevel === "SMP_1" ? "smp" : "sma";

  const { nodes, edges } = useMemo(() => {
    const ns: Node<CustomNodeDataType>[] = [];
    const es: any[] = [];

    // Center node
    ns.push({
      id: "center",
      type: "mindmapNode",
      position: { x: 0, y: 0 },
      data: {
        label: `🧠 ${subjectName}`,
        color: "#FFD93D",
        isCenter: true,
        theme,
      } as CustomNodeDataType,
    });

    // Topic nodes (level 1) + leaf nodes (level 2)
    topics.forEach((topic, i) => {
      const topicId = `topic-${i}`;
      const color = COLORS[i % COLORS.length];
      const iconName = resolveIcon(topic.label);

      ns.push({
        id: topicId,
        type: "mindmapNode",
        position: { x: 0, y: 0 },
        data: {
          label: topic.label,
          color,
          icon: iconName,
          isLucideIcon: isLucideIcon(iconName),
          theme,
          // Description: link ke mindmap detail
          description: `Lihat detail →`,
          imageUrl: `/student/mindmap/${encodeURIComponent(subjectName)}?id=${topic.materialId}`,
        } as CustomNodeDataType,
      });

      // Children (sub-topics) — max 3 per topic
      const subTopics = topic.children.slice(0, 3);
      subTopics.forEach((child, j) => {
        const leafId = `${topicId}-leaf-${j}`;
        const leafIcon = resolveIcon(child.label);
        ns.push({
          id: leafId,
          type: "mindmapNode",
          position: { x: 0, y: 0 },
          data: {
            label: child.label,
            color,
            icon: leafIcon,
            isLucideIcon: isLucideIcon(leafIcon),
            theme,
          } as CustomNodeDataType,
        });
      });
    });

    // Layout
    const positioned = layoutBigNodes(ns);
    const posMap = new Map(positioned.map((n) => [n.id, n.position]));

    // Edges: center → topics
    const centerPos = posMap.get("center")!;
    topics.forEach((_, i) => {
      const topicId = `topic-${i}`;
      const color = COLORS[i % COLORS.length];
      const branchPos = posMap.get(topicId)!;
      const branchDir = angleDir(centerPos, branchPos);

      es.push({
        id: `e-c-${topicId}`,
        source: "center",
        target: topicId,
        sourceHandle: `s-${branchDir}`,
        targetHandle: `t-${angleDir(branchPos, centerPos)}`,
        type: "default",
        style: { stroke: color, strokeWidth: 4.5, strokeOpacity: 0.65 },
        animated: true,
      });

      // Edges: topic → sub-topics
      const subTopics = topics[i].children.slice(0, 3);
      subTopics.forEach((_, j) => {
        const leafId = `${topicId}-leaf-${j}`;
        const leafPos = posMap.get(leafId);
        if (!leafPos) return;

        es.push({
          id: `e-${topicId}-leaf-${j}`,
          source: topicId,
          target: leafId,
          sourceHandle: `s-${branchDir}`,
          targetHandle: `t-${angleDir(leafPos, branchPos)}`,
          type: "default",
          style: { stroke: color, strokeWidth: 3, strokeOpacity: 0.4 },
        });
      });
    });

    return { nodes: positioned, edges: es };
  }, [subjectName, topics, theme]);

  const [flowNodes, , onNodesChange] = useNodesState(nodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(edges);

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    const d = node.data as CustomNodeDataType;
    if (d.imageUrl && node.id.startsWith("topic-")) {
      window.location.href = d.imageUrl;
    }
  };

  return (
    <div className="w-full relative" style={{ height: "calc(100vh - 110px)" }}>
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <radialGradient id="bigblob-pink" cx="20%" cy="15%" r="60%">
              <stop offset="0%" stopColor="#fbc7d4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fbc7d4" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="bigblob-cyan" cx="80%" cy="80%" r="60%">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#bigblob-pink)" />
          <rect width="100%" height="100%" fill="url(#bigblob-cyan)" />
        </svg>
      </div>

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={2}
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
