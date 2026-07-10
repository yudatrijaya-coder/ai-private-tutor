"use client";

import { Handle, Position } from "@xyflow/react";
import { useState } from "react";

export type CustomNodeDataType = {
  label: string;
  color: string;
  isCenter?: boolean;
  icon?: string;
  imageUrl?: string;
  description?: string;
  theme?: "sd" | "smp" | "sma";
};

export function CustomNode({ data }: { data: unknown }) {
  const d = data as CustomNodeDataType;
  const isCenter = d.isCenter ?? false;
  const theme = d.theme ?? "sd";
  const [expanded, setExpanded] = useState(false);

  const tokens = {
    sd: {
      borderRadius: isCenter ? "9999px" : "24px",
      padding: isCenter ? "14px 26px" : "12px 16px",
      fontSize: isCenter ? "16px" : "13px",
      fontFamily: "'Nunito', sans-serif",
      shadowIntensity: 0.28,
      borderWidth: "2.5px",
      backdrop: "blur(6px)",
    },
    smp: {
      borderRadius: isCenter ? "9999px" : "18px",
      padding: isCenter ? "12px 24px" : "10px 14px",
      fontSize: isCenter ? "15px" : "12px",
      fontFamily: "'Inter', sans-serif",
      shadowIntensity: 0.22,
      borderWidth: "2px",
      backdrop: "blur(4px)",
    },
    sma: {
      borderRadius: isCenter ? "9999px" : "14px",
      padding: isCenter ? "12px 24px" : "10px 14px",
      fontSize: isCenter ? "15px" : "12px",
      fontFamily: "'Inter', sans-serif",
      shadowIntensity: 0.18,
      borderWidth: "1.5px",
      backdrop: "blur(4px)",
    },
  } as const;

  const t = tokens[theme];
  const bg = isCenter
    ? "linear-gradient(135deg, #FFD93D 0%, #FFB347 100%)"
    : `${d.color}18`;
  const border = isCenter ? "#E6A800" : d.color;

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        className="font-bold transition-all duration-150 hover:scale-105 cursor-pointer"
        onClick={() => !isCenter && setExpanded(!expanded)}
        style={{
          background: bg,
          border: `${t.borderWidth} solid ${border}`,
          borderRadius: t.borderRadius,
          color: isCenter ? "#fff" : "#2F2A1E",
          boxShadow: isCenter
            ? "0 10px 24px rgba(230, 168, 0, 0.28)"
            : `0 8px 20px ${d.color}24`,
          maxWidth: isCenter ? 200 : 240,
          padding: t.padding,
          fontSize: t.fontSize,
          fontFamily: t.fontFamily,
          backdropFilter: isCenter ? "none" : t.backdrop,
        }}
      >
        {/* Image slot */}
        {d.imageUrl && (
          <div className="flex justify-center mb-2">
            <img
              src={d.imageUrl}
              alt=""
              className="w-20 h-20 object-cover rounded-xl border border-white/40 shadow-sm"
              loading="lazy"
            />
          </div>
        )}

        {/* Icon badge + Label */}
        <div className="flex items-center gap-2 justify-center">
          {d.icon && !isCenter && (
            <span
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white text-xs font-bold shrink-0"
              style={{ background: d.color }}
            >
              {d.icon.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="leading-tight text-center break-words">{d.label}</span>
        </div>

        {/* Expanded description */}
        {expanded && d.description && !isCenter && (
          <div className="mt-2 pt-2 border-t border-white/30 text-xs leading-relaxed font-normal opacity-80 text-left">
            {d.description}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}
