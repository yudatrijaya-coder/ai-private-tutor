"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface ChatItem {
  id: string;
  role: string;
  content: string;
  source: string | null;
  createdAt: Date;
}

export function ChatView({ chats }: { chats: ChatItem[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="rounded-xl p-4 space-y-3 overflow-y-auto"
      style={{
        backgroundColor: "var(--su-bg-card)",
        border: "1px solid var(--su-border)",
        maxHeight: "70vh",
      }}
    >
      {chats.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--su-text-dim)" }}>
          Belum ada riwayat chat.
        </p>
      ) : (
        chats.map((chat, i) => {
          const isUser = chat.role === "user";
          const showDate =
            i === 0 ||
            format(new Date(chat.createdAt), "yyyy-MM-dd") !==
              format(new Date(chats[i - 1].createdAt), "yyyy-MM-dd");

          return (
            <div key={chat.id}>
              {/* Date separator */}
              {showDate && (
                <div className="flex justify-center my-4">
                  <span
                    className="text-xs px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: "var(--su-bg-hover)",
                      color: "var(--su-text-dim)",
                    }}
                  >
                    {format(new Date(chat.createdAt), "EEEE, d MMMM yyyy", { locale: id })}
                  </span>
                </div>
              )}

              <div
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                  style={{
                    backgroundColor: isUser
                      ? "var(--su-primary)"
                      : "var(--su-bg-hover)",
                    color: isUser ? "#fff" : "var(--su-text)",
                    borderBottomRightRadius: isUser ? "4px" : "12px",
                    borderBottomLeftRadius: isUser ? "12px" : "4px",
                  }}
                >
                  <p style={{ whiteSpace: "pre-wrap" }}>{chat.content}</p>
                  <div
                    className="text-[10px] mt-1 opacity-60 flex items-center gap-2"
                    style={{ textAlign: isUser ? "right" : "left" }}
                  >
                    <span>
                      {format(new Date(chat.createdAt), "HH:mm")}
                    </span>
                    {chat.source && (
                      <span>
                        {chat.source === "telegram" ? "📱" : "🌐"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </div>
  );
}
