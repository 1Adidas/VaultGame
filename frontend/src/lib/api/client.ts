import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const api = axios.create({ baseURL: `${API_URL}/api/v1` });

let accessToken: string | null = null;
let refreshToken: string | null = null;
let rememberSession = true;
let refreshPromise: Promise<string | null> | null = null;

export const setTokens = (access: string | null, refresh: string | null, remember: boolean = true) => {
  accessToken = access;
  refreshToken = refresh;
  rememberSession = remember;
  if (typeof window !== "undefined") {
    if (access) {
      if (remember) {
        localStorage.setItem("gv_access", access);
        localStorage.setItem("gv_remember", "true");
        sessionStorage.removeItem("gv_access");
      } else {
        sessionStorage.setItem("gv_access", access);
        localStorage.removeItem("gv_access");
        localStorage.setItem("gv_remember", "false");
      }
    } else {
      localStorage.removeItem("gv_access");
      sessionStorage.removeItem("gv_access");
    }
    
    if (refresh) {
      if (remember) {
        localStorage.setItem("gv_refresh", refresh);
        sessionStorage.removeItem("gv_refresh");
      } else {
        sessionStorage.setItem("gv_refresh", refresh);
        localStorage.removeItem("gv_refresh");
      }
    } else {
      localStorage.removeItem("gv_refresh");
      sessionStorage.removeItem("gv_refresh");
      localStorage.removeItem("gv_remember");
    }
  }
};

export const loadTokens = () => {
  if (typeof window !== "undefined") {
    const remember = localStorage.getItem("gv_remember") !== "false";
    rememberSession = remember;
    if (remember) {
      accessToken = localStorage.getItem("gv_access");
      refreshToken = localStorage.getItem("gv_refresh");
    } else {
      accessToken = sessionStorage.getItem("gv_access");
      refreshToken = sessionStorage.getItem("gv_refresh");
    }
  }
};

api.interceptors.request.use((config) => {
  if (!accessToken && typeof window !== "undefined") loadTokens();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;
    let loc = "vi";
    if (pathname.startsWith("/en") || pathname === "/en") loc = "en";
    else if (pathname.startsWith("/zh") || pathname === "/zh") loc = "zh";
    config.headers["Accept-Language"] = loc;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const requestUrl = String(original?.url ?? "");
    const isAuthAttempt =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/google") ||
      requestUrl.includes("/auth/refresh");

    if (error.response?.status === 401 && refreshToken && !original?._retry && !isAuthAttempt) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_URL}/api/v1/auth/refresh`, { refreshToken })
            .then(({ data }) => {
              const newAccess = data?.data?.accessToken ?? null;
              const newRefresh = data?.data?.refreshToken ?? null;
              if (newAccess && newRefresh) {
                setTokens(newAccess, newRefresh, rememberSession);
                return newAccess as string;
              }
              setTokens(null, null);
              return null;
            })
            .catch(() => {
              setTokens(null, null);
              return null;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const nextToken = await refreshPromise;
        if (nextToken) {
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${nextToken}`;
          return api(original);
        }
      } catch {
        setTokens(null, null);
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { page: number; pageSize: number; total: number };
  error?: { code: string; message: string };
}
