"use client";

import { useEffect, useState } from "react";

function normalizeDemoSrc(buildUrl: string): string {
  const localBackendMatch = buildUrl.match(/^https?:\/\/(?:localhost|127\.0\.0\.1):5000(\/uploads\/.*)$/i);
  if (localBackendMatch) {
    return localBackendMatch[1];
  }
  if (buildUrl.startsWith("/uploads/")) {
    return buildUrl;
  }
  if (buildUrl.startsWith("http")) {
    return buildUrl;
  }
  const normalized = buildUrl.startsWith("/") ? buildUrl : `/${buildUrl}`;
  return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}${normalized}`;
}

export function UnityWebGLPlayer({ buildUrl }: { buildUrl: string }) {
  const src = normalizeDemoSrc(buildUrl);
  const [insecureOriginWarning, setInsecureOriginWarning] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setInsecureOriginWarning(true);
    }
  }, []);

  return (
    <div className="space-y-2 w-full">
      {insecureOriginWarning && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Lưu ý: Trình duyệt chỉ bật Cross-Origin Isolation / SharedArrayBuffer (bắt buộc với Godot 4 đa luồng) khi truy cập qua <code>http://localhost:3000</code> hoặc <code>HTTPS</code>.
        </div>
      )}
      <div className="aspect-[16/10] overflow-hidden rounded-xl border border-zinc-700 bg-black w-full">
        <iframe
          src={src}
          className="h-full w-full border-0"
          allow="cross-origin-isolated; autoplay; fullscreen; gamepad; clipboard-read; clipboard-write"
          allowFullScreen
          title="Game Demo"
        />
      </div>
    </div>
  );
}
