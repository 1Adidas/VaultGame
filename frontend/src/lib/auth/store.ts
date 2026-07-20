import { create } from "zustand";
import { api, loadTokens, setTokens, type ApiResponse } from "@/lib/api/client";

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  roles: string[];
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginWithGoogle: (idToken: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  updateUser: (updatedUser) => set((state) => ({
    user: state.user ? { ...state.user, ...updatedUser } : null
  })),
  hydrate: async () => {
    loadTokens();
    const token = typeof window !== "undefined" ? (localStorage.getItem("gv_access") || sessionStorage.getItem("gv_access")) : null;
    if (token) {
      try {
        const { data } = await api.get<ApiResponse<User>>("/users/profile");
        set({ user: data.data });
        
        // Show welcome back toast (only once per browser session, not on F5 refresh!)
        if (typeof window !== "undefined" && !sessionStorage.getItem("gv_welcomed")) {
          sessionStorage.setItem("gv_welcomed", "true");
          const user = data.data;
          const isAdmin = user.roles.includes("Admin");
          const { useToastStore } = await import("@/lib/toast/store");
          const isEn = window.location.pathname.startsWith("/en") || window.location.pathname === "/en";
          
          const msg = isAdmin
            ? (isEn ? `Welcome back, Admin ${user.fullName}! 🛠️` : `Chào mừng trở lại, Admin ${user.fullName}! 🛠️`)
            : (isEn ? `Welcome back, ${user.fullName}! 👋` : `Chào mừng trở lại, ${user.fullName}! 👋`);
            
          useToastStore.getState().success(msg);
        }
      } catch {
        setTokens(null, null);
        set({ user: null });
      }
    }
  },
  login: async (email, password, rememberMe = true) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<ApiResponse<{ accessToken: string; refreshToken: string; user: User }>>("/auth/login", { email, password });
      setTokens(data.data.accessToken, data.data.refreshToken, rememberMe);
      if (typeof window !== "undefined") sessionStorage.setItem("gv_welcomed", "true");
      set({ user: data.data.user });
    } finally {
      set({ isLoading: false });
    }
  },
  loginWithGoogle: async (idToken, rememberMe = true) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<ApiResponse<{ accessToken: string; refreshToken: string; user: User }>>("/auth/google", { idToken });
      setTokens(data.data.accessToken, data.data.refreshToken, rememberMe);
      if (typeof window !== "undefined") sessionStorage.setItem("gv_welcomed", "true");
      set({ user: data.data.user });
    } finally {
      set({ isLoading: false });
    }
  },
  register: async (email, password, fullName) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post<ApiResponse<{ accessToken: string; refreshToken: string; user: User }>>("/auth/register", { email, password, fullName });
      setTokens(data.data.accessToken, data.data.refreshToken, true);
      set({ user: data.data.user });
    } finally {
      set({ isLoading: false });
    }
  },
  logout: async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    setTokens(null, null);
    if (typeof window !== "undefined") sessionStorage.removeItem("gv_welcomed");
    set({ user: null });
  },
}));
