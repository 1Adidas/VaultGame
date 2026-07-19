"use client";

export function UnityWebGLPlayer({ buildUrl }: { buildUrl: string }) {
  const src = buildUrl.startsWith("http") ? buildUrl : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}${buildUrl}`;
  return (
    <div className="aspect-[16/10] overflow-hidden rounded-xl border border-zinc-700 bg-black w-full">
      <iframe src={src} className="h-full w-full border-0" allowFullScreen title="Game Demo" />
    </div>
  );
}
