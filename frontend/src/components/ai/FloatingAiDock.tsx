"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { X, RotateCcw } from "lucide-react";
import { api, type ApiResponse } from "@/lib/api/client";
import { formatPrice, resolveImageUrl } from "@/lib/utils";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth/store";

interface NormalizedGame {
  id: string;
  title: string;
  slug: string;
  price: number;
  discountPrice?: number;
  currency: string;
  avgRating: number;
  reviewCount: number;
  categoryName: string;
  shortDescription?: string;
  primaryImageUrl?: string;
  hasDemo: boolean;
}

interface MiniMessage {
  role: "user" | "assistant";
  content: string;
  games?: NormalizedGame[];
}

export function FloatingAiDock() {
  const locale = useLocale();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isVi = locale === "vi";
  const isZh = locale === "zh";

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const initialGreeting: MiniMessage = {
    role: "assistant",
    content: isVi
      ? "Xin chào! Tôi là THE VOID — trợ lý game bản quyền của GameVault. Bạn đang tìm kiếm thể loại game nào? (Ví dụ: Game hành động, kinh dị, game dưới 100.000đ hoặc có WebGL Demo)"
      : isZh
      ? "你好！我是 THE VOID 智能游戏助手。你正在寻找什么类型的正版游戏？（例如：动作大作、特惠折扣或支持 WebGL 网页试玩）"
      : "Greetings! I am THE VOID — your tactical gaming advisor. What genre, budget, or experience are you looking for today?",
  };

  const [messages, setMessages] = useState<MiniMessage[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = isVi
    ? [
        "Game hành động kịch tính",
        "Game có WebGL Demo chơi thử",
        "Game dưới 100.000đ",
        "Game sát thủ & điệp viên",
      ]
    : isZh
    ? [
        "动作冒险大作",
        "支持 WebGL 网页试玩",
        "特惠折扣游戏",
        "潜行与刺客主题",
      ]
    : [
        "Action AAA titles",
        "Games with WebGL Demo",
        "Under 100,000 VND",
        "Stealth & assassin games",
      ];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Hide dock if we are inside admin section or if user is an Admin
  // Dynamic UI overlays detection (WebGL demo playing, QR payment modal, Fullscreen)
  const [isOverlayActive, setIsOverlayActive] = useState(false);

  useEffect(() => {
    const checkOverlays = () => {
      const isFullscreen = Boolean(typeof document !== "undefined" && document.fullscreenElement);
      const isDemoPlaying = Boolean(typeof document !== "undefined" && document.querySelector('iframe[title="Game Demo"]'));
      const isQrOpen = Boolean(typeof document !== "undefined" && document.querySelector('[data-qr-modal="true"]'));
      setIsOverlayActive(isFullscreen || isDemoPlaying || isQrOpen);
    };

    checkOverlays();

    if (typeof document !== "undefined") {
      document.addEventListener("fullscreenchange", checkOverlays);
      const observer = new MutationObserver(checkOverlays);
      observer.observe(document.body, { childList: true, subtree: true });

      return () => {
        document.removeEventListener("fullscreenchange", checkOverlays);
        observer.disconnect();
      };
    }
  }, []);

  // Hide dock if we are inside admin section, auth pages, orders page, user is Admin, or overlay is active
  const isHiddenRoute = Boolean(
    pathname?.includes("/admin") ||
    pathname?.includes("/login") ||
    pathname?.includes("/register") ||
    pathname?.includes("/orders") ||
    user?.roles?.includes("Admin")
  );

  if (isHiddenRoute || isOverlayActive) {
    return null;
  }

  const normalizeGame = (r: any): NormalizedGame => ({
    id: String(r.Id ?? r.id ?? ""),
    title: String(r.Title ?? r.title ?? "Unknown Title"),
    slug: String(r.Slug ?? r.slug ?? ""),
    price: Number(r.Price ?? r.price ?? 0),
    discountPrice: r.DiscountPrice !== null && r.DiscountPrice !== undefined
      ? Number(r.DiscountPrice ?? r.discountPrice)
      : (r.discountPrice !== null && r.discountPrice !== undefined ? Number(r.discountPrice) : undefined),
    currency: String(r.Currency ?? r.currency ?? "VND"),
    avgRating: Number(r.AvgRating ?? r.avgRating ?? 0),
    reviewCount: Number(r.ReviewCount ?? r.reviewCount ?? 0),
    categoryName: String(r.CategoryName ?? r.categoryName ?? ""),
    shortDescription: r.ShortDescription ?? r.shortDescription ?? undefined,
    primaryImageUrl: r.PrimaryImageUrl ?? r.primaryImageUrl ?? undefined,
    hasDemo: Boolean(r.HasDemo ?? r.hasDemo ?? false),
  });

  const parseGames = (queryResultStr: string): NormalizedGame[] => {
    try {
      const rawRows = JSON.parse(queryResultStr);
      if (!Array.isArray(rawRows)) return [];
      return rawRows.map(normalizeGame);
    } catch {
      return [];
    }
  };

  const executeSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: textToSend }]);
    setLoading(true);

    try {
      const { data } = await api.post<ApiResponse<any>>("/ai/chat", {
        message: textToSend,
        locale,
        sessionId: sessionId || undefined,
      });

      if (data?.data) {
        if (data.data.sessionId) {
          setSessionId(data.data.sessionId);
        }
        const rawGames = data.data.games ?? (data.data.queryResult ? parseGames(data.data.queryResult) : []);
        const foundGames: NormalizedGame[] = Array.isArray(rawGames) ? rawGames.map(normalizeGame) : [];

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data.data.answer ||
              (isVi
                ? "Dạ đây là những tựa game phù hợp nhất với tiêu chí của bạn:"
                : isZh
                ? "为您推荐以下最契合需求的正版游戏："
                : "Here are the most matching games for you:"),
            games: foundGames,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isVi
            ? "Hệ thống THE VOID tạm thời bận. Bạn vui lòng thử lại sau giây lát nhé!"
            : isZh
            ? "THE VOID 连接暂时中断，请稍后重试。"
            : "THE VOID connection interrupted. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSend(input);
  };

  const handleResetSession = () => {
    setSessionId(null);
    setMessages([initialGreeting]);
  };

  const isSendable = Boolean(input.trim()) && !loading;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Trigger Button: Gaming HUD Minimalist Tile */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3.5 h-14 pl-4 pr-5 rounded-2xl bg-[#090D18]/95 border border-white/20 hover:border-cyan-400/70 backdrop-blur-xl text-white shadow-2xl shadow-black/90 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          title="THE VOID"
        >
          {/* Cyan Glow Accent Stripe */}
          <div className="w-1.5 h-7 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(0,242,254,0.7)] group-hover:shadow-[0_0_14px_rgba(0,242,254,1)] transition-all" />

          {/* Logo GameVault */}
          <div className="size-8 rounded-lg bg-[#0C101A] border border-cyan-500/30 flex items-center justify-center p-1 shadow-[0_0_10px_rgba(0,242,254,0.25)]">
            <img src="/logo.png" alt="THE VOID" className="size-full object-contain" />
          </div>

          {/* Title & Tag Stack */}
          <div className="flex flex-col text-left">
            <span className="text-sm font-extrabold tracking-wider font-mono uppercase text-zinc-100 group-hover:text-cyan-300 transition-colors">
              THE VOID
            </span>
            <span className="text-xs font-mono font-medium tracking-wide text-zinc-300 uppercase">
              {isVi ? "Trợ lý AI" : isZh ? "AI 助手" : "AI Assistant"}
            </span>
          </div>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="flex flex-col w-[390px] sm:w-[450px] h-[600px] max-h-[88vh] rounded-2xl border border-white/20 bg-[#090D18]/95 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(0,242,254,0.08)] overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.1] bg-[#0E1424]/95 px-4 sm:px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-[#0C101A] border border-cyan-500/40 flex items-center justify-center p-1.5 shadow-[0_0_12px_rgba(0,242,254,0.25)]">
                <img src="/logo.png" alt="THE VOID" className="size-full object-contain" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold tracking-wide text-white uppercase font-mono">
                  THE VOID
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetSession}
                className="size-8 flex items-center justify-center text-zinc-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                title={isVi ? "Làm mới hội thoại" : isZh ? "重置会话" : "Reset chat"}
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="size-8 flex items-center justify-center text-zinc-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                title={isVi ? "Đóng cửa sổ" : "Close window"}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-sm scrollbar-thin scrollbar-thumb-white/15">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <span
                  className={`text-xs font-mono font-bold tracking-widest uppercase mb-1.5 ${
                    m.role === "user" ? "text-zinc-300" : "text-cyan-300"
                  }`}
                >
                  {m.role === "user" ? (isVi ? "BẠN" : isZh ? "你" : "YOU") : "THE VOID"}
                </span>

                <div
                  className={`max-w-[90%] rounded-2xl p-4 leading-relaxed ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 font-bold rounded-tr-none shadow-md shadow-cyan-950/40 text-sm"
                      : "bg-[#111728] border border-white/[0.1] text-zinc-100 rounded-tl-none shadow-sm text-sm"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.content}</p>
                </div>

                {/* Render Mini Game Cards inside Chat */}
                {m.games && m.games.length > 0 && (
                  <div className="mt-3.5 space-y-2.5 w-full max-w-[96%]">
                    {m.games.slice(0, 4).map((g) => {
                      const effectivePrice = g.discountPrice ?? g.price;
                      const isFree = effectivePrice === 0;
                      const discountPercent =
                        g.discountPrice !== undefined && g.discountPrice < g.price && g.price > 0
                          ? Math.round(((g.price - g.discountPrice) / g.price) * 100)
                          : 0;

                      return (
                        <Link
                          key={g.id}
                          href={`/${locale}/game/${g.slug}`}
                          className="group flex items-center gap-3.5 p-3 rounded-xl bg-[#111728] border border-white/10 hover:border-cyan-400/50 hover:bg-[#161F36] transition-all cursor-pointer shadow-sm"
                        >
                          {/* Thumbnail */}
                          <div className="size-14 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/10">
                            {g.primaryImageUrl ? (
                              <img
                                src={resolveImageUrl(g.primaryImageUrl)}
                                crossOrigin="anonymous"
                                alt={g.title}
                                className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="size-full flex items-center justify-center text-xs font-mono text-zinc-500 font-bold">
                                GAME
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 text-left">
                            {/* Title & Badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-bold text-sm text-zinc-100 group-hover:text-cyan-300 transition-colors truncate">
                                {g.title}
                              </h5>
                              {isFree && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase">
                                  {isVi ? "Chơi ngay" : isZh ? "免费畅玩" : "Free"}
                                </span>
                              )}
                              {discountPercent > 0 && (
                                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  -{discountPercent}%
                                </span>
                              )}
                              {g.hasDemo && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 uppercase">
                                  Demo WebGL
                                </span>
                              )}
                            </div>

                            {/* Meta: Category & Rating */}
                            <div className="flex items-center gap-2 text-xs text-zinc-300 mt-1">
                              {g.categoryName && (
                                <span className="font-medium text-zinc-300">{g.categoryName}</span>
                              )}
                              {g.categoryName && g.avgRating > 0 && (
                                <span className="text-zinc-500">•</span>
                              )}
                              {g.avgRating > 0 ? (
                                <span className="text-amber-400 font-semibold flex items-center gap-1">
                                  ★ {g.avgRating.toFixed(1)}
                                  {g.reviewCount > 0 && (
                                    <span className="text-zinc-400 font-normal">({g.reviewCount})</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-zinc-400">Mới cập nhật</span>
                              )}
                            </div>

                            {/* Price Row (Honest, clean, no fake button) */}
                            <div className="flex items-baseline gap-2 mt-1.5">
                              {isFree ? (
                                <span className="text-sm font-black text-emerald-400 uppercase tracking-wide">
                                  {isVi ? "Miễn phí" : isZh ? "免费" : "Free"}
                                </span>
                              ) : (
                                <>
                                  <span className="text-sm font-black text-emerald-400">
                                    {formatPrice(effectivePrice, g.currency)}
                                  </span>
                                  {discountPercent > 0 && (
                                    <span className="text-xs text-zinc-400 line-through">
                                      {formatPrice(g.price, g.currency)}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Quick Suggestion Prompts if only initial message */}
            {messages.length === 1 && !loading && (
              <div className="pt-2">
                <span className="text-xs font-mono text-zinc-300 uppercase tracking-wider block mb-2.5 font-semibold">
                  {isVi ? "Khám phá nhanh:" : isZh ? "快捷探索：" : "Quick prompts:"}
                </span>
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((promptText, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => executeSend(promptText)}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/15 hover:border-cyan-400/50 hover:bg-white/10 text-xs text-zinc-200 hover:text-white transition-all text-left font-medium cursor-pointer"
                    >
                      {promptText}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* High-tech Loading State - Zero Icon Clutter */}
            {loading && (
              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#111728] border border-white/[0.08] text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-cyan-400 tracking-wider uppercase font-semibold">
                    {isVi ? "Oracle đang phân tích kho dữ liệu..." : isZh ? "Oracle 正在检索游戏库..." : "Oracle is analyzing library..."}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-[pulse_1.2s_ease-in-out_infinite]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form onSubmit={handleFormSubmit} className="p-3.5 sm:p-4 border-t border-white/[0.1] bg-[#0E1424]/95 flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isVi ? "Hỏi thể loại, giá tiền, tựa game..." : isZh ? "输入游戏类型、预算或名称..." : "Ask genre, budget, or titles..."}
                className="flex-1 h-11 rounded-xl bg-[#060A14] border border-white/15 px-4 text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-cyan-400/80 transition-colors"
              />
              <button
                type="submit"
                disabled={!isSendable}
                className={`h-11 px-5 rounded-xl font-mono font-extrabold text-xs flex items-center justify-center transition-all uppercase tracking-wider ${
                  isSendable
                    ? "bg-[#00F2FE] hover:bg-[#38bdf8] text-slate-950 shadow-[0_0_16px_rgba(0,242,254,0.45)] hover:shadow-[0_0_24px_rgba(0,242,254,0.65)] active:scale-95 cursor-pointer"
                    : "bg-white/[0.06] text-zinc-500 border border-white/10 cursor-not-allowed opacity-75"
                }`}
              >
                {isVi ? "Gửi" : isZh ? "发送" : "Send"}
              </button>
            </div>
          </form>

        </div>
      )}
    </div>
  );
}
