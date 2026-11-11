"use client";

import { Suspense, useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FloatingAiDock } from "@/components/ai/FloatingAiDock";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#070A10] text-zinc-100 flex flex-col selection:bg-cyan-500/30 selection:text-white">
      {/* 1. Left Gaming Rail / Sidebar */}
      <Suspense fallback={null}>
        <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </Suspense>

      {/* 2. Main Execution Stage (Offset for desktop sidebar) */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 transition-all duration-300">
        
        {/* Top App Header with Live OmniSearch & Actions */}
        <Navbar onToggleSidebar={() => setSidebarOpen(true)} />

        {/* Expansive Main Content Canvas */}
        <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-8 py-8 min-w-0">
          {children}
        </main>

        {/* Platform Footer */}
        <Footer />
      </div>

      {/* 3. Floating AI Game Copilot */}
      <FloatingAiDock />
    </div>
  );
}
