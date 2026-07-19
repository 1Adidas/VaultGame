import { useQuery } from "@tanstack/react-query";
import { api, type ApiResponse } from "@/lib/api/client";
import type { GameListItem } from "@/components/game/GameCard";

export interface GameFilter {
  q?: string;
  categoryId?: string;
  tag?: string;
  minPrice?: number;
  maxPrice?: number;
  maxMinAge?: number;
  minRating?: number;
  featured?: boolean;
  hasDemo?: boolean;
  discounted?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
  status?: string;
}

export function useGames(filter: GameFilter = {}) {
  return useQuery({
    queryKey: ["games", filter],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{ items: GameListItem[]; page: number; pageSize: number; total: number }>>("/games", { params: filter });
      return { games: data.data.items, meta: data.meta };
    },
  });
}

export function useGame(slug: string) {
  return useQuery({
    queryKey: ["game", slug],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Record<string, unknown>>>(`/games/${slug}`);
      return data.data;
    },
    enabled: !!slug,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{ id: string; name: string; slug: string }[]>>("/games/categories");
      return data.data;
    },
  });
}

export function useLibrary() {
  return useQuery({
    queryKey: ["library"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Record<string, unknown>[]>>("/library");
      return data.data;
    },
  });
}

export function useWishlist() {
  return useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<GameListItem[]>>("/wishlist");
      return data.data;
    },
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Record<string, unknown>[]>>("/orders");
      return data.data;
    },
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Record<string, unknown>>>("/admin/dashboard/stats");
      return data.data;
    },
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<{ id: string; name: string; slug: string }[]>>("/games/tags");
      return data.data;
    },
  });
}
