"use client";

import { useToastStore } from "@/lib/toast/store";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";
        
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 p-4 rounded-2xl backdrop-blur-md border shadow-2xl transition-all duration-300 transform translate-y-0 scale-100 pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-300
              ${
                isSuccess
                  ? "bg-zinc-900/90 border-emerald-500/20 text-zinc-100"
                  : isError
                  ? "bg-zinc-900/90 border-rose-500/20 text-zinc-100"
                  : "bg-zinc-900/90 border-violet-500/20 text-zinc-100"
              }`}
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              {isSuccess && <CheckCircle2 className="size-5 text-emerald-400" />}
              {isError && <XCircle className="size-5 text-rose-400" />}
              {toast.type === "info" && <Info className="size-5 text-violet-400" />}
            </div>

            {/* Message */}
            <div className="flex-grow text-sm font-medium leading-snug">
              {toast.message}
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 transition p-1 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
