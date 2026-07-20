"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/auth/store";
import { ToastContainer } from "@/components/ui/ToastContainer";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  return (
    <QueryClientProvider client={client}>
      {children}
      <ToastContainer />
    </QueryClientProvider>
  );
}
