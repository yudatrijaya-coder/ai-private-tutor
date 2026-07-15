"use client";

import { useState, useRef, useEffect } from "react";

export default function VideoPlayer({ src, fallbackEmoji }: { src: string; fallbackEmoji: string }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Check if file exists by fetching headers
    fetch(src, { method: "HEAD" })
      .then((res) => {
        if (!res.ok) setError(true);
        else setLoaded(true);
      })
      .catch(() => setError(true));
  }, [src]);

  if (error) {
    return (
      <div className="flex items-center justify-center text-center p-4 h-full bg-gradient-to-br from-purple-100 to-indigo-200">
        <div>
          <span className="text-4xl">{fallbackEmoji}</span>
          <p className="text-xs text-gray-500 mt-2">Video belum siap</p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className="w-full h-full object-cover"
      preload="none"
      controls
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
