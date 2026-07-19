"use client";

import { useState } from "react";
import { useGames, useCategories, useTags } from "@/hooks/useGames";
import { GameGrid } from "@/components/game/GameCard";
import { Button, Card, Input } from "@/components/ui/button";
import {
  Filter, Star, RefreshCw, Search,
  ChevronRight, Sparkles, DollarSign, ShieldAlert
} from "lucide-react";
import { useLocale } from "next-intl";

export default function GamesPage() {
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>();
  const [selectedTag, setSelectedTag] = useState<string>();
  const [minPrice, setMinPrice] = useState<number>();
  const [maxPrice, setMaxPrice] = useState<number>();
  const [minRating, setMinRating] = useState<number>();
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [maxMinAge, setMaxMinAge] = useState<number>();
  const [hasDemo, setHasDemo] = useState<boolean | undefined>(undefined);
  const [discounted, setDiscounted] = useState<boolean | undefined>(undefined);
  const [sort, setSort] = useState("newest");
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

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
    pageSize: 20
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

  return (
    <div className="w-full lg:w-[100vw] max-w-[1600px] lg:relative lg:left-1/2 lg:-translate-x-1/2 px-4 md:px-8 py-6 md:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Toggle Filters Button for Mobile */}
      <div className="lg:hidden w-full">
        <Button
          type="button"
          onClick={() => setShowFiltersMobile(!showFiltersMobile)}
          className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 h-11 text-sm font-semibold rounded-xl text-zinc-200 cursor-pointer"
        >
          <Filter className="size-4 text-violet-400" />
          {showFiltersMobile 
            ? (locale === "vi" ? "Ẩn bộ lọc tìm kiếm" : "Hide search filters") 
            : (locale === "vi" ? "Hiện bộ lọc tìm kiếm" : "Show search filters")
          }
        </Button>
      </div>

      {/* Sidebar Filters */}
      <aside className={`w-full lg:w-80 shrink-0 space-y-6 ${showFiltersMobile ? "block" : "hidden lg:block"}`}>
        <Card className="p-6 bg-zinc-900/50 border-white/5 backdrop-blur shadow-xl space-y-6 rounded-2xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Filter className="size-5 text-violet-400" />
              {locale === "vi" ? "Bộ lọc tìm kiếm" : "Filters"}
            </h2>
            {(search || categoryId || selectedTag || minPrice !== undefined || maxPrice !== undefined || minRating || maxMinAge || hasDemo !== undefined || discounted !== undefined || sort !== "newest") && (
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition"
              >
                <RefreshCw className="size-3.5" />
                {locale === "vi" ? "Xóa bộ lọc" : "Clear All"}
              </button>
            )}
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {locale === "vi" ? "Tìm kiếm trò chơi" : "Search"}
            </label>
            <div className="relative">
              <Input
                placeholder={locale === "vi" ? "Nhập tên game..." : "Search games..."}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pr-10 bg-zinc-950/50 border-white/10"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-violet-400 transition">
                <Search className="size-4" />
              </button>
            </div>
          </form>

          {/* Sort By */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {locale === "vi" ? "Sắp xếp theo" : "Sort By"}
            </label>
            <select
              className="w-full rounded-lg border border-white/10 bg-zinc-950 p-2.5 text-sm text-zinc-300 outline-none focus:border-violet-500 transition"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">{locale === "vi" ? "Mới nhất" : "Newest"}</option>
              <option value="rating">{locale === "vi" ? "Đánh giá cao nhất" : "Top rated"}</option>
              <option value="price_asc">{locale === "vi" ? "Giá: Thấp đến Cao" : "Price: Low to High"}</option>
              <option value="price_desc">{locale === "vi" ? "Giá: Cao đến Thấp" : "Price: High to Low"}</option>
            </select>
          </div>

          {/* Categories list */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              {locale === "vi" ? "Thể loại game" : "Categories"}
            </label>
            <div className="space-y-1">
              <button
                onClick={() => setCategoryId(undefined)}
                className={`w-full text-left px-3 py-2.5 md:py-2 rounded-lg text-sm flex items-center justify-between transition cursor-pointer min-h-[44px] md:min-h-0 ${!categoryId
                  ? "bg-violet-600/10 text-violet-400 font-semibold border border-violet-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
              >
                <span>{locale === "vi" ? "Tất cả thể loại" : "All categories"}</span>
                <ChevronRight className="size-3.5" />
              </button>
              {(categories ?? []).map((c) => {
                const isActive = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategoryId(isActive ? undefined : c.id)}
                    className={`w-full text-left px-3 py-2.5 md:py-2 rounded-lg text-sm flex items-center justify-between transition cursor-pointer min-h-[44px] md:min-h-0 ${isActive
                      ? "bg-violet-600/10 text-violet-400 font-semibold border border-violet-500/20"
                      : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                      }`}
                  >
                    <span>{c.name}</span>
                    <ChevronRight className="size-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              {locale === "vi" ? "Khoảng giá (VND)" : "Price Range"}
            </label>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minPrice ?? ""}
                  onChange={(e) => setMinPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="bg-zinc-950/50 border-white/10 pl-6 text-xs"
                />
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-zinc-500" />
              </div>
              <span className="text-zinc-500 text-xs">to</span>
              <div className="relative flex-1">
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxPrice ?? ""}
                  onChange={(e) => setMaxPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="bg-zinc-950/50 border-white/10 pl-6 text-xs"
                />
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-zinc-500" />
              </div>
            </div>
            {/* Presets */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button type="button" onClick={() => handlePricePreset("free")} className="px-2.5 py-1 text-[11px] rounded bg-zinc-950 hover:bg-violet-600/10 hover:text-violet-400 border border-white/5 text-zinc-400 font-medium transition">
                {locale === "vi" ? "Miễn phí" : "Free"}
              </button>
              <button type="button" onClick={() => handlePricePreset("under100")} className="px-2.5 py-1 text-[11px] rounded bg-zinc-950 hover:bg-violet-600/10 hover:text-violet-400 border border-white/5 text-zinc-400 font-medium transition">
                {locale === "vi" ? "Dưới 100K" : "Under 100K"}
              </button>
              <button type="button" onClick={() => handlePricePreset("100to500")} className="px-2.5 py-1 text-[11px] rounded bg-zinc-950 hover:bg-violet-600/10 hover:text-violet-400 border border-white/5 text-zinc-400 font-medium transition">
                100K - 500K
              </button>
              <button type="button" onClick={() => handlePricePreset("over500")} className="px-2.5 py-1 text-[11px] rounded bg-zinc-950 hover:bg-violet-600/10 hover:text-violet-400 border border-white/5 text-zinc-400 font-medium transition">
                {locale === "vi" ? "Trên 500K" : "Above 500K"}
              </button>
            </div>
          </div>

          {/* Star Rating Filter */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                {locale === "vi" ? "Đánh giá sao" : "Rating Filter"}
              </label>
              {minRating && (
                <span className="text-[11px] text-zinc-500 font-medium">
                  {locale === "vi" ? `Từ ${minRating} sao trở xuống` : `${minRating}★ & Below`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-950/40 p-2.5 rounded-xl border border-white/5 w-fit">
              {[1, 2, 3, 4, 5].map((s) => {
                const isFilled = s <= (hoverRating ?? minRating ?? 0);
                return (
                  <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setMinRating(minRating === s ? undefined : s)}
                    className="p-2.5 md:p-1 hover:scale-110 active:scale-95 transition-all outline-none cursor-pointer flex items-center justify-center"
                    title={locale === "vi" ? `Lọc từ ${s} sao trở xuống` : `Filter ${s} stars & below`}
                  >
                    <Star
                      className={`size-6 transition-all duration-150 ${isFilled
                          ? "fill-yellow-400 text-yellow-400 filter drop-shadow-[0_0_4px_rgba(250,204,21,0.4)]"
                          : "text-zinc-700 hover:text-zinc-500"
                        }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Age limits */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              {locale === "vi" ? "Giới hạn độ tuổi" : "Age Restriction"}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[0, 12, 16, 18].map((age) => {
                const isActive = maxMinAge === age;
                return (
                  <button
                    key={age}
                    type="button"
                    onClick={() => setMaxMinAge(isActive ? undefined : age)}
                    className={`px-4 py-2.5 md:px-3 md:py-1.5 rounded-lg text-sm md:text-xs font-semibold border transition cursor-pointer min-h-[44px] md:min-h-0 ${isActive
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "border-white/5 bg-zinc-950 text-zinc-400 hover:text-white"
                      }`}
                  >
                    {age === 0 ? (locale === "vi" ? "Mọi lứa tuổi" : "All Ages") : `${age}+`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags cloud */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              {locale === "vi" ? "Chọn nhãn (Tags)" : "Tags"}
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {/* Virtual WebGL Demo tag */}
              <button
                type="button"
                onClick={() => setHasDemo(hasDemo === true ? undefined : true)}
                className={`px-3.5 py-2 md:px-2.5 md:py-1 rounded-full text-sm md:text-xs border font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[38px] md:min-h-0 ${hasDemo === true
                  ? "bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-900/20"
                  : "border-violet-500/30 bg-violet-950/20 text-violet-300 hover:text-white hover:bg-violet-600/10"
                  }`}
              >
                <span>WebGL Demo</span>
                {hasDemo === true && <span className="size-1.5 rounded-full bg-white animate-ping" />}
              </button>

              {/* Discounted filter */}
              <button
                type="button"
                onClick={() => setDiscounted(discounted === true ? undefined : true)}
                className={`px-3.5 py-2 md:px-2.5 md:py-1 rounded-full text-sm md:text-xs border font-bold transition flex items-center gap-1.5 cursor-pointer min-h-[38px] md:min-h-0 ${discounted === true
                  ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-900/20"
                  : "border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:text-white hover:bg-emerald-600/10"
                  }`}
              >
                <span>{locale === "vi" ? "Đang giảm giá" : "On Sale"}</span>
                {discounted === true && <span className="size-1.5 rounded-full bg-white animate-ping" />}
              </button>

              {tags && tags.map((tag) => {
                const isActive = selectedTag === tag.slug;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setSelectedTag(isActive ? undefined : tag.slug)}
                    className={`px-3.5 py-2 md:px-2.5 md:py-1 rounded-full text-sm md:text-xs border font-medium transition cursor-pointer min-h-[38px] md:min-h-0 ${isActive
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "border-white/5 bg-zinc-950 text-zinc-400 hover:text-white"
                      }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </aside>

      {/* Main Grid Area */}
      <div className="flex-1 space-y-6">
        {/* Statistics bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/30 border border-white/5 rounded-2xl px-6 py-4 backdrop-blur">
          <span className="text-sm text-zinc-400">
            {locale === "vi"
              ? `Tìm thấy ${data?.games?.length ?? 0} trò chơi phù hợp`
              : `Found ${data?.games?.length ?? 0} matching games`
            }
          </span>
          {sort === "newest" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-violet-400 font-semibold uppercase tracking-wider">
              <Sparkles className="size-3.5" />
              {locale === "vi" ? "Bộ sưu tập mới nhất" : "New Releases"}
            </span>
          )}
        </div>

        {/* Content list */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="bg-zinc-900/20 border-white/5 rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {data?.games?.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900/10 border border-white/5 rounded-2xl space-y-3">
                <ShieldAlert className="size-12 text-zinc-600 mx-auto" />
                <h3 className="text-lg font-bold text-zinc-200">{locale === "vi" ? "Không tìm thấy trò chơi nào" : "No Games Found"}</h3>
                <p className="text-sm text-zinc-500 max-w-sm mx-auto">{locale === "vi" ? "Hãy thử điều chỉnh lại bộ lọc tìm kiếm hoặc xóa các lựa chọn hiện tại." : "Try expanding your filters or clearing them to find games."}</p>
                <Button onClick={clearFilters} className="bg-violet-600 hover:bg-violet-500 text-white mt-4">{locale === "vi" ? "Đặt lại bộ lọc" : "Reset Filters"}</Button>
              </div>
            ) : (
              <GameGrid games={data?.games ?? []} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
