"use client";

import { useLocale } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const locale = useLocale();
  const isVi = locale === "vi";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-9xl font-black bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
        404
      </h1>
      <h2 className="text-2xl font-bold text-white mt-4">
        {isVi ? "Không tìm thấy trang" : "Page Not Found"}
      </h2>
      <p className="text-zinc-400 text-sm mt-2 max-w-md">
        {isVi
          ? "Đường dẫn bạn truy cập không tồn tại hoặc đã bị di chuyển."
          : "The page you are looking for does not exist or has been moved."}
      </p>
      <Link href={`/${locale}`} className="mt-6">
        <Button className="bg-violet-650 hover:bg-violet-600 text-white font-semibold">
          {isVi ? "Quay lại Trang chủ" : "Back to Home"}
        </Button>
      </Link>
    </div>
  );
}
