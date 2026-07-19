"use client";

import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center font-sans antialiased">
        <div className="text-center space-y-4">
          <h1 className="text-9xl font-black bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-2xl font-bold text-white">404 - Page Not Found</h2>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto">
            The page you are looking for does not exist or has been moved.
          </p>
          <Link
            href="/vi"
            className="inline-block mt-4 rounded-lg bg-violet-650 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-600 transition"
          >
            Go back home / Quay về trang chủ
          </Link>
        </div>
      </body>
    </html>
  );
}
