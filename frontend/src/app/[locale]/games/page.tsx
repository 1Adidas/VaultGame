"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useGames, useCategories, useTags } from "@/hooks/useGames";
import { GameGrid } from "@/components/game/GameCard";
import { Star, Search, ChevronRight, X, Check } from "lucide-react";
import { useLocale } from "next-intl";

export default function GamesPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const isVi = locale === "vi";
  const isZh = locale === "zh";

  const initFree = searchParams.get("free") === "true";
  const initDiscounted = searchParams.get("discounted") === "true";
  const initHasDemo = searchParams.get("hasDemo") === "true";
  const initCategory = searchParams.get("categoryId") || undefined;
  const initSort = searchParams.get("sort") || "newest";
  const initQ = searchParams.get("q") || "";

  const [q, setQ] = useState(initQ);
  const [search, setSearch] = useState(initQ);
  const [categoryId, setCategoryId] = useState<string | undefined>(initCategory);
  const [selectedTag, setSelectedTag] = useState<string>();
  const [minPrice, setMinPrice] = useState<number | undefined>(initFree ? 0 : undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(initFree ? 0 : undefined);
  const [minRating, setMinRating] = useState<number>();
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [maxMinAge, setMaxMinAge] = useState<number>();
  const [hasDemo, setHasDemo] = useState<boolean | undefined>(initHasDemo ? true : undefined);
  const [discounted, setDiscounted] = useState<boolean | undefined>(initDiscounted ? true : undefined);
  const [sort, setSort] = useState(initSort);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Sync state reactively whenever URL searchParams change (e.g. clicking between WebGL Demo and Deals tabs)
  useEffect(() => {
    const hasDemoParam = searchParams.get("hasDemo") === "true";
    const discountedParam = searchParams.get("discounted") === "true";
    const freeParam = searchParams.get("free") === "true";
    const catParam = searchParams.get("categoryId") || undefined;
    const sortParam = searchParams.get("sort") || "newest";
    const qParam = searchParams.get("q") || "";

    setHasDemo(hasDemoParam ? true : undefined);
    setDiscounted(discountedParam ? true : undefined);
    if (freeParam) {
      setMinPrice(0);
      setMaxPrice(0);
    } else if (!searchParams.has("minPrice") && !searchParams.has("free")) {
      setMinPrice(undefined);
      setMaxPrice(undefined);
    }
    setCategoryId(catParam);
    setSort(sortParam);
    setQ(qParam);
    setSearch(qParam);
  }, [searchParams]);

  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  const { data, isLoading } = useGames({
    q: search,
    categoryId,
    tag: selectedTag,
    minPrice,
    maxPrice,
    minRating,
    maxMinAge,
    hasDemo,
    discounted,
    sort,
    pageSize: 24
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(q);
  };

  const clearFilters = () => {
    setQ("");
    setSearch("");
    setCategoryId(undefined);
    setSelectedTag(undefined);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setMinRating(undefined);
    setMaxMinAge(undefined);
    setHasDemo(undefined);
    setDiscounted(undefined);
    setSort("newest");
  };

  const handlePricePreset = (preset: string) => {
    if (preset === "free") {
      setMinPrice(0);
      setMaxPrice(0);
    } else if (preset === "under100") {
      setMinPrice(0);
      setMaxPrice(100000);
    } else if (preset === "100to500") {
      setMinPrice(100000);
      setMaxPrice(500000);
    } else if (preset === "over500") {
      setMinPrice(500000);
      setMaxPrice(undefined);
    }
  };

  const hasActiveFilters = Boolean(
    search ||
    categoryId ||
    selectedTag ||
    minPrice !== undefined ||
    maxPrice !== undefined ||
    minRating ||
    maxMinAge ||
    hasDemo !== undefined ||
    discounted !== undefined ||
    sort !== "newest"
  );

  return (
    <div className="w-full space-y-8 pb-28 sm:pb-36">
      
      {/* ─── Header & Search Title ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {isVi ? "Kho Game Bản Quyền" : isZh ? "正版数字游戏商城" : "Digital Storefront"}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            {isVi ? "Tất Cả Trò Chơi" : isZh ? "探索全部游戏" : "Explore All Games"}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            {isVi
              ? "Khám phá danh mục game đầy đủ với bản quyền chính hãng và bản chơi thử WebGL tức thì."
              : isZh
              ? "探索海量官方正版数字游戏，支持 WebGL 浏览器免安装即时试玩。"
              : "Discover genuine digital licenses and instantly playable WebGL browser demos."}
          </p>
        </div>

        {/* Mobile Filter Toggle Button */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <span>
              {showFiltersMobile
                ? isVi
                  ? "Ẩn Bộ Lọc"
                  : isZh
                  ? "收起筛选"
                  : "Hide Filters"
                : isVi
                ? "Bộ Lọc & Tìm Kiếm"
                : isZh
                ? "筛选与搜索"
                : "Filter & Search"}
            </span>
          </button>
        </div>
      </div>

      {/* ─── Main Content Layout (Sidebar + Grid) ─── */}
      <div className="grid gap-8 lg:grid-cols-[280px_1fr] items-start">
        
        {/* ════════ SIDEBAR FILTERS ════════ */}
        <aside
          className={`space-y-6 ${
            showFiltersMobile ? "block" : "hidden lg:block"
          }`}
        >
          <div className="rounded-2xl border border-white/[0.08] bg-[#0E131E] p-5 space-y-6 shadow-xl">
            
            {/* Header with Clear button */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h2 className="text-sm font-semibold text-white tracking-tight">
                {isVi ? "Bộ lọc tìm kiếm" : isZh ? "条件筛选" : "Filters"}
              </h2>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  {isVi ? "Đặt lại" : isZh ? "重置" : "Reset"}
                </button>
              )}
            </div>

            {/* Keyword Search */}
            <form onSubmit={handleSearch} className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {isVi ? "Từ khóa tên game" : isZh ? "搜索游戏名称" : "Game Search"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={isVi ? "Nhập tên tựa game..." : isZh ? "输入游戏名称..." : "Search by title..."}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#080B11] px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-white/30"
                />
                <button
                  type="submit"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                >
                  <Search className="size-3.5" />
                </button>
              </div>
            </form>

            {/* Sort Options */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {isVi ? "Sắp xếp theo" : isZh ? "排序方式" : "Sort By"}
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#080B11] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="newest">{isVi ? "Mới cập nhật nhất" : isZh ? "最新上架" : "New Releases"}</option>
                <option value="rating">{isVi ? "Đánh giá cao nhất" : isZh ? "评分最高" : "Highest Rated"}</option>
                <option value="price_asc">{isVi ? "Giá: Thấp đến Cao" : isZh ? "价格：从低到高" : "Price: Low to High"}</option>
                <option value="price_desc">{isVi ? "Giá: Cao đến Thấp" : isZh ? "价格：从高到低" : "Price: High to Low"}</option>
              </select>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {isVi ? "Thể loại trò chơi" : isZh ? "游戏分类" : "Categories"}
              </label>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setCategoryId(undefined)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                    !categoryId
                      ? "bg-white text-black font-bold"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span>{isVi ? "Tất cả thể loại" : isZh ? "全部分类" : "All Categories"}</span>
                  <ChevronRight className="size-3" />
                </button>
                {(categories ?? []).map((c) => {
                  const isActive = categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(isActive ? undefined : c.id)}
                      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-white text-black font-bold"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span>{c.name}</span>
                      <ChevronRight className="size-3" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Presets & Inputs */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {isVi ? "Khoảng giá (VND)" : isZh ? "价格区间" : "Price Range"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePricePreset("free")}
                  className="rounded-lg border border-white/5 bg-[#080B11] px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
                >
                  {isVi ? "Miễn Phí" : isZh ? "免费" : "Free"}
                </button>
                <button
                  type="button"
                  onClick={() => handlePricePreset("under100")}
                  className="rounded-lg border border-white/5 bg-[#080B11] px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
                >
                  {isVi ? "Dưới 100K" : isZh ? "100K 以下" : "Under 100K"}
                </button>
                <button
                  type="button"
                  onClick={() => handlePricePreset("100to500")}
                  className="rounded-lg border border-white/5 bg-[#080B11] px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
                >
                  100K - 500K
                </button>
                <button
                  type="button"
                  onClick={() => handlePricePreset("over500")}
                  className="rounded-lg border border-white/5 bg-[#080B11] px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
                >
                  {isVi ? "Trên 500K" : isZh ? "500K 以上" : "Over 500K"}
                </button>
              </div>
            </div>

            {/* Quick Special Filters (WebGL Demo & On Sale) */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {isVi ? "Tính năng đặc biệt" : isZh ? "特色亮点" : "Special Highlights"}
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setHasDemo(hasDemo === true ? undefined : true)}
                  className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    hasDemo === true
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-white/5 bg-[#080B11] text-zinc-400 hover:text-white hover:border-white/15"
                  }`}
                >
                  <span>{isVi ? "WebGL Demo Chơi Thử" : isZh ? "支持 WebGL 免下载试玩" : "Playable WebGL Demo"}</span>
                  {hasDemo === true && <Check className="size-3.5 text-emerald-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setDiscounted(discounted === true ? undefined : true)}
                  className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    discounted === true
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                      : "border-white/5 bg-[#080B11] text-zinc-400 hover:text-white hover:border-white/15"
                  }`}
                >
                  <span>{isVi ? "Đang Giảm Giá" : isZh ? "特惠折扣中" : "Special Deals"}</span>
                  {discounted === true && <Check className="size-3.5 text-amber-400" />}
                </button>
              </div>
            </div>

            {/* Rating Stars */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {isVi ? "Đánh giá sao tối thiểu" : isZh ? "最低用户评分" : "Minimum Rating"}
              </label>
              <div className="flex items-center gap-1 bg-[#080B11] border border-white/5 rounded-xl p-2.5 justify-center">
                {[1, 2, 3, 4, 5].map((s) => {
                  const isFilled = s <= (hoverRating ?? minRating ?? 0);
                  return (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setMinRating(minRating === s ? undefined : s)}
                      className="cursor-pointer p-1 hover:scale-110 active:scale-95 transition-transform"
                    >
                      <Star
                        className={`size-4 ${
                          isFilled ? "fill-amber-400 text-amber-400" : "text-zinc-700 hover:text-zinc-500"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags Cloud */}
            {tags && tags.length > 0 && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {isVi ? "Nhãn trò chơi" : isZh ? "热门标签" : "Popular Tags"}
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto scrollbar-none">
                  {tags.map((tag) => {
                    const isActive = selectedTag === tag.slug;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setSelectedTag(isActive ? undefined : tag.slug)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                          isActive
                            ? "bg-white text-black font-bold"
                            : "bg-[#080B11] border border-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        #{tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </aside>

        {/* ════════ MAIN STOREFRONT GRID ════════ */}
        <div className="space-y-6">
          
          {/* Active summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0E131E] px-6 py-4 shadow-xl">
            <span className="text-xs sm:text-sm text-zinc-400 font-medium">
              {isVi
                ? `Hiển thị ${data?.games?.length ?? 0} tựa game sẵn sàng`
                : isZh
                ? `共展示 ${data?.games?.length ?? 0} 款就绪游戏`
                : `Showing ${data?.games?.length ?? 0} titles ready`}
            </span>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
                >
                  <X className="size-3" />
                  <span>{isVi ? "Xóa bộ lọc" : isZh ? "清除筛选" : "Clear filters"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Games list or Empty state */}
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-[4/3] rounded-2xl bg-[#0E131E] border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : !data?.games || data.games.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0E131E] p-14 text-center space-y-4 shadow-xl">
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-white tracking-tight">
                  {isVi ? "Không tìm thấy trò chơi phù hợp" : isZh ? "未找到符合条件的游戏" : "No Games Found"}
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  {isVi
                    ? "Hãy thử thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc hiện tại."
                    : isZh
                    ? "请尝试更改搜索关键词或重置当前筛选条件。"
                    : "Try broadening your search keywords or clear current filter options."}
                </p>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 rounded-full text-xs font-medium text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.08] transition active:scale-[0.98] cursor-pointer"
              >
                {isVi ? "Đặt lại bộ lọc" : isZh ? "重置所有筛选" : "Reset Filters"}
              </button>
            </div>
          ) : (
            <GameGrid games={data.games} />
          )}

        </div>

      </div>

    </div>
  );
}
