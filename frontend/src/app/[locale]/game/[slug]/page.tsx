"use client";

import { use, useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGame } from "@/hooks/useGames";
import { api, type ApiResponse } from "@/lib/api/client";
import { formatPrice, formatDate, formatDateTimeShort, resolveImageUrl as resolveUrl, resolveVideoUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UnityWebGLPlayer } from "@/components/demo/UnityWebGLPlayer";
import { QRPaymentModal } from "@/components/payment/QRPaymentModal";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth/store";
import {
  Star,
  Trash2,
  UserCircle,
  CheckCircle,
  Gamepad2,
  Heart,
  ChevronRight,
  Play
} from "lucide-react";

function CommentAvatar({
  url,
  name,
  size = "md",
}: {
  url?: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const [hasError, setHasError] = useState(false);
  const resolved = url ? resolveUrl(url) : null;
  const initial = (name || "U").trim().charAt(0).toUpperCase();
  const sizeClass = size === "sm" ? "size-6 text-[10px]" : "size-8 sm:size-9 text-xs";

  if (!resolved || hasError) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-zinc-800 border border-white/10 text-zinc-200 font-bold font-mono flex items-center justify-center shrink-0 select-none shadow-inner`}
        aria-hidden="true"
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt=""
      onError={() => setHasError(true)}
      className={`${sizeClass} rounded-full object-cover ring-1 ring-white/10 shrink-0`}
    />
  );
}

function TrailerPlayer({ url, slug }: { url: string; slug: string }) {
  const [useIframe, setUseIframe] = useState(false);
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const fileId = match ? match[1] : null;

  if (!fileId) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E131E] aspect-video shadow-2xl">
        <video
          src={resolveVideoUrl(url)}
          controls
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (useIframe) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E131E] aspect-[4/3] sm:aspect-video shadow-2xl">
        <iframe
          src={`https://drive.google.com/file/d/${fileId}/preview`}
          className="w-full h-full border-0"
          allow="autoplay"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E131E] aspect-video shadow-2xl">
      <video
        src={resolveVideoUrl(`/uploads/games/${slug}/trailer/${fileId}.mp4`)}
        controls
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover"
        onError={() => setUseIframe(true)}
      />
    </div>
  );
}

export default function GameDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug } = use(params);
  const locale = useLocale();
  const isVi = locale === "vi";
  const isZh = locale === "zh";
  const router = useRouter();
  const { data: game, isLoading, refetch } = useGame(slug);
  const { user } = useAuthStore();
  const isAdmin = !!user?.roles?.includes("Admin");
  const prefix = `/${locale}`;

  const [showPay, setShowPay] = useState(false);
  const [orderId, setOrderId] = useState<string>();
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showConfirmBuy, setShowConfirmBuy] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullDesc, setShowFullDesc] = useState(false);

  // Review states
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyComment, setReplyComment] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState("");
  const [editingRating, setEditingRating] = useState<number | null>(null);

  useEffect(() => {
    if (game) {
      setIsWishlisted(!!(game as Record<string, any>).isWishlisted);
    }
  }, [game]);

  // Steam-style keyboard arrow navigation for screenshots
  const galleryImages = ((game as any)?.images as { url: string; isPrimary: boolean }[]) ?? [];
  useEffect(() => {
    if (!galleryImages || galleryImages.length <= 1) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      if (e.key === "ArrowLeft") {
        setSelectedImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
      } else if (e.key === "ArrowRight") {
        setSelectedImageIndex((prev) => (prev + 1) % galleryImages.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [galleryImages]);

  const demoHistoryIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const accumulatedDurationRef = useRef<number>(0);
  const isPlayingDemoRef = useRef<boolean>(false);

  const updateDemoDuration = async (isFinal = false) => {
    if (!demoHistoryIdRef.current || !startTimeRef.current) return;

    const sessionSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    const totalSeconds = accumulatedDurationRef.current + sessionSeconds;

    if (isFinal) {
      accumulatedDurationRef.current = totalSeconds;
      startTimeRef.current = null;
    }

    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/v1/games/demo-play/${demoHistoryIdRef.current}`;
      const payload = JSON.stringify({ durationSeconds: totalSeconds });

      if (typeof window !== "undefined" && window.fetch) {
        await window.fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: (api.defaults.headers.common["Authorization"] as string) || ""
          },
          body: payload,
          keepalive: true
        });
      }
    } catch (err) {
      console.error("Failed to update demo duration:", err);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isPlayingDemoRef.current || !demoHistoryIdRef.current) return;

      if (document.hidden) {
        updateDemoDuration(true);
      } else {
        startTimeRef.current = Date.now();
      }
    };

    const handleBeforeUnload = () => {
      if (isPlayingDemoRef.current && demoHistoryIdRef.current) {
        updateDemoDuration(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      if (isPlayingDemoRef.current && demoHistoryIdRef.current) {
        updateDemoDuration(true);
      }
    };
  }, []);

  const renderCommentText = (text: string, review: any, repliesList: any[]) => {
    if (!text.includes("@")) return text;

    const threadUserNames = [review.userName, ...repliesList.map((r: any) => r.userName)];
    const sortedNames = [...new Set(threadUserNames)]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    const parts: React.ReactNode[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      const atIndex = text.indexOf("@", currentIndex);
      if (atIndex === -1) {
        parts.push(text.substring(currentIndex));
        break;
      }

      if (atIndex > currentIndex) {
        parts.push(text.substring(currentIndex, atIndex));
      }

      let matchedName = "";
      const remainingText = text.substring(atIndex + 1);

      for (const name of sortedNames) {
        if (remainingText.startsWith(name)) {
          matchedName = name;
          break;
        }
      }

      if (matchedName) {
        parts.push(
          <span
            key={atIndex}
            className="inline-flex items-center rounded-md bg-white/10 px-1.5 py-0.5 text-xs font-semibold text-white border border-white/15 mr-1 align-baseline select-all"
          >
            @{matchedName}
          </span>
        );
        currentIndex = atIndex + 1 + matchedName.length;
      } else {
        parts.push("@");
        currentIndex = atIndex + 1;
      }
    }

    return <span>{parts}</span>;
  };

  // Fetch reviews
  const { data: reviews, refetch: refetchReviews } = useQuery({
    queryKey: ["game-reviews", slug],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any[]>>(`/games/${slug}/reviews`);
      return data.data;
    },
    enabled: !!slug
  });

  useEffect(() => {
    const handleScrollToReview = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith("#review-")) {
        const id = hash.substring(1);
        setTimeout(() => {
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("ring-2", "ring-white", "duration-1000");
            setTimeout(() => {
              element.classList.remove("ring-2", "ring-white");
            }, 3000);
          }
        }, 300);
      }
    };

    if (reviews && reviews.length > 0) {
      handleScrollToReview();
    }

    window.addEventListener("hashchange", handleScrollToReview);
    return () => {
      window.removeEventListener("hashchange", handleScrollToReview);
    };
  }, [reviews]);

  if (isLoading) {
    return (
      <div className="w-full space-y-8 animate-pulse">
        <div className="h-[280px] w-full rounded-3xl bg-[#0E131E]" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="aspect-video w-full rounded-2xl bg-[#0E131E]" />
            <div className="h-40 w-full rounded-2xl bg-[#0E131E]" />
          </div>
          <div className="space-y-6">
            <div className="h-64 w-full rounded-2xl bg-[#0E131E]" />
            <div className="h-48 w-full rounded-2xl bg-[#0E131E]" />
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="mx-auto max-w-md py-24 text-center space-y-4">
        <Gamepad2 className="size-16 text-zinc-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">{isVi ? "Không tìm thấy trò chơi" : "Game Not Found"}</h2>
        <p className="text-xs text-zinc-400">
          {isVi ? "Tựa game bạn đang tìm kiếm có thể đã bị gỡ hoặc không tồn tại." : "The game you are looking for may have been removed or does not exist."}
        </p>
        <Link href={`/${locale}/games`}>
          <button className="btn-primary mt-2">{isVi ? "Quay lại Cửa Hàng" : "Return to Store"}</button>
        </Link>
      </div>
    );
  }

  const g = game as Record<string, any>;
  const price = (g.discountPrice as number) ?? (g.price as number);
  const demo = g.demo as { buildUrl: string } | null;
  const images = (g.images as { url: string; isPrimary: boolean }[]) ?? [];

  const buy = async () => {
    if (!user) {
      alert(isVi ? "Vui lòng đăng nhập để mua game!" : "Please log in to purchase the game!");
      router.push(`/${locale}/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    try {
      const { data } = await api.post<ApiResponse<{ id: string; status: string }>>("/orders", { gameIds: [g.id] });
      if (data.data.status === "Paid") {
        alert(isVi ? "Đã thêm game vào thư viện của bạn thành công! 🎉" : "Successfully added game to your library! 🎉");
        refetch();
      } else {
        setOrderId(data.data.id);
        setShowPay(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleWishlist = async () => {
    if (!user) {
      alert(isVi ? "Bạn cần đăng nhập để thực hiện thao tác này." : "You must log in to perform this action.");
      return;
    }
    const previous = isWishlisted;
    setIsWishlisted(!previous);
    try {
      if (previous) {
        await api.delete(`/wishlist/${g.id}`);
      } else {
        await api.post(`/wishlist/${g.id}`);
      }
      refetch();
    } catch {
      setIsWishlisted(previous);
      alert(isVi ? "Thao tác thất bại. Vui lòng thử lại!" : "Action failed. Please try again!");
    }
  };

  const playDemo = async () => {
    try {
      const { data } = await api.post<ApiResponse<{ historyId: string }>>(`/games/${slug}/demo-play`);
      const historyId = data.data.historyId;
      demoHistoryIdRef.current = historyId;
      startTimeRef.current = Date.now();
      accumulatedDurationRef.current = 0;
      isPlayingDemoRef.current = true;
    } catch (err) {
      console.error("Failed to record play demo start:", err);
    }
  };

  const stopDemo = async () => {
    setIsPlayingDemo(false);
    isPlayingDemoRef.current = false;
    await updateDemoDuration(true);
    demoHistoryIdRef.current = null;
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() && !rating) {
      alert(isVi ? "Vui lòng nhập nội dung hoặc đánh giá!" : "Please write a comment or select a rating!");
      return;
    }
    setSubmittingReview(true);
    try {
      const isOwned = Boolean(g.isOwned);
      await api.post(`/games/${g.id}/reviews`, {
        rating: (!isAdmin && isOwned) ? rating : null,
        title: "",
        comment: comment.trim()
      });
      setComment("");
      setRating(null);
      refetchReviews();
      refetch();
      alert(
        isAdmin
          ? (isVi ? "Đã đăng thông báo Ban Quản Trị thành công!" : "Staff notice posted successfully!")
          : (isVi ? "Đã gửi đánh giá thành công!" : "Submitted successfully!")
      );
    } catch (error: any) {
      console.error("Failed to submit review", error);
      alert(error.response?.data?.error?.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const submitReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!replyComment.trim()) return;
    setSubmittingReply(true);
    try {
      await api.post(`/games/${g.id}/reviews`, {
        rating: null,
        title: "",
        comment: replyComment.trim(),
        parentId
      });
      setReplyComment("");
      setReplyingTo(null);
      refetchReviews();
      refetch();
    } catch (error: any) {
      console.error("Failed to submit reply", error);
      alert(error.response?.data?.error?.message || "Failed to submit reply.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const deleteReview = async (reviewId: string) => {
    const msg = isVi ? "Bạn có chắc chắn muốn xóa bình luận này?" : "Are you sure you want to delete this comment?";
    if (!window.confirm(msg)) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      refetchReviews();
      refetch();
    } catch (error: any) {
      console.error("Failed to delete review", error);
      alert(error.response?.data?.error?.message || (isVi ? "Xóa không thành công. Vui lòng kiểm tra quyền truy cập!" : "Failed to delete comment. Please check permissions!"));
    }
  };

  const submitEditReview = async (e: React.FormEvent, reviewId: string) => {
    e.preventDefault();
    try {
      await api.put(`/reviews/${reviewId}`, {
        rating: editingRating,
        comment: editingComment.trim()
      });
      setEditingReviewId(null);
      setEditingComment("");
      setEditingRating(null);
      refetchReviews();
      refetch();
    } catch (error: any) {
      console.error("Failed to edit review", error);
      alert(error.response?.data?.error?.message || "Failed to edit review.");
    }
  };

  const reviewItems = reviews ?? [];
  const myRootReview = reviewItems.find((r: any) => !r.parentId && r.userId === user?.id);
  const isGameOwned = Boolean(g.isOwned);

  const localizedTitle = (locale === "zh" && g.titleZh ? g.titleZh : (locale === "en" && g.titleEn ? g.titleEn : g.title)) as string;
  const localizedShortDesc = (locale === "zh" && g.shortDescriptionZh ? g.shortDescriptionZh : (locale === "en" && g.shortDescriptionEn ? g.shortDescriptionEn : (g.shortDescription || ""))) as string;
  const description = (locale === "zh" && g.descriptionZh ? g.descriptionZh : (locale === "en" && g.descriptionEn ? g.descriptionEn : (g.description || ""))) as string;
  const originalPrice = g.price as number;
  const discountPct =
    g.discountPrice && originalPrice && g.discountPrice < originalPrice
      ? Math.round((1 - (g.discountPrice as number) / originalPrice) * 100)
      : 0;

  const ratingDist = [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    count: reviewItems.filter((r: any) => r.rating === s && !r.parentId).length
  }));
  const maxRatingCount = Math.max(...ratingDist.map((r) => r.count), 1);
  const totalRatingsCount = reviewItems.filter((r: any) => Boolean(r.rating) && !r.parentId).length;
  const totalCommentsCount = reviewItems.filter((r: any) => !r.parentId).length;

  const activeImage = images[selectedImageIndex] ?? images[0];

  return (
    <div className="min-h-screen pb-24 space-y-10">
      
      {/* ─── Breadcrumb Navigation ─── */}
      <div className="w-full">
        <nav className="flex items-center gap-2 text-xs text-zinc-400">
          <Link href={`/${locale}`} className="hover:text-white transition-colors">
            {isVi ? "Trang chủ" : isZh ? "首页" : "Home"}
          </Link>
          <ChevronRight className="size-3 text-zinc-600" />
          <Link href={`/${locale}/games`} className="hover:text-white transition-colors">
            {isVi ? "Tất cả trò chơi" : isZh ? "所有游戏" : "Store"}
          </Link>
          {g.categoryName && (
            <>
              <ChevronRight className="size-3 text-zinc-600" />
              <Link href={`/${locale}/games?category=${g.categoryId || ""}`} className="hover:text-white transition-colors">
                {g.categoryName as string}
              </Link>
            </>
          )}
          <ChevronRight className="size-3 text-zinc-600" />
          <span className="text-zinc-200 truncate font-medium">{localizedTitle}</span>
        </nav>
      </div>

      {/* ─── CINEMATIC HEADER WITH CONTROLLED AMBIENT MASK ─── */}
      <div className="relative overflow-hidden border-y border-white/[0.08] bg-[#0E131E]">
        {/* Soft atmospheric background grading (no cutoffs) */}
        {images[0]?.url && (
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <img
              src={resolveUrl(images[0].url)}
              crossOrigin="anonymous"
              alt=""
              className="w-full h-full object-cover filter blur-3xl opacity-20 scale-125 transform-gpu"
            />
            {/* Deep fade vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#080B11] via-[#080B11]/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#080B11] via-[#080B11]/80 to-transparent" />
          </div>
        )}

        <div className="relative z-10 w-full p-6 sm:p-10">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                {g.categoryName && (
                  <span className="text-xs font-bold uppercase tracking-wider bg-white/10 text-white px-2.5 py-1 rounded-md border border-white/10 backdrop-blur-md">
                    {g.categoryName as string}
                  </span>
                )}
                {demo && (
                  <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                    <Play className="size-3 fill-emerald-400 text-emerald-400" />
                    {isVi ? "WebGL Demo Sẵn Sàng" : "WebGL Demo Ready"}
                  </span>
                )}
                {g.status === "Published" && (
                  <span className="text-xs font-semibold bg-white/5 text-zinc-400 border border-white/5 px-2.5 py-1 rounded-md">
                    {isVi ? "Bản Quyền Chính Hãng" : "Genuine License"}
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                {localizedTitle}
              </h1>

              {localizedShortDesc && (
                <p className="text-sm md:text-base text-zinc-300 font-normal leading-relaxed max-w-2xl">
                  {localizedShortDesc}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                <span className="font-medium text-zinc-300">
                  {isVi ? "Nhà phát triển: " : "Developer: "}<strong className="text-white">{g.developer as string}</strong>
                </span>
                {g.publisher && g.publisher !== g.developer && (
                  <>
                    <span>•</span>
                    <span className="font-medium text-zinc-300">
                      {isVi ? "Nhà phát hành: " : "Publisher: "}<strong className="text-white">{g.publisher as string}</strong>
                    </span>
                  </>
                )}
                {g.releaseDate && (
                  <>
                    <span>•</span>
                    <span>
                      {isVi ? "Phát hành: " : "Released: "}{formatDate(g.releaseDate)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quick rating score badge */}
            {Number(g.avgRating || 0) > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#141B2B] px-4 py-2.5 shadow-xl">
                <div className="text-right">
                  <div className="text-lg font-black text-white flex items-center gap-1 justify-end">
                    <span>{Number(g.avgRating).toFixed(1)}</span>
                    <Star className="size-4 fill-amber-400 text-amber-400" />
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    {totalRatingsCount > 0 ? totalRatingsCount : g.reviewCount} {isVi ? "lượt đánh giá" : isZh ? "条玩家评分" : "ratings"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── MAIN TWO-COLUMN LAYOUT ─── */}
      <div className="w-full">
        <div className="grid gap-10 lg:grid-cols-[1fr_360px] items-start">
          
          {/* ════════ LEFT COLUMN: Media Showcase & Details ════════ */}
          <div className="space-y-8">
            
            {/* Main Stage Viewport (16:9 Aspect Ratio) - Steam Style */}
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E131E] aspect-video shadow-2xl group select-none">
                {activeImage?.url ? (
                  <img
                    src={resolveUrl(activeImage.url)}
                    crossOrigin="anonymous"
                    alt={g.title as string}
                    className="w-full h-full object-cover transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                    <Gamepad2 className="size-16" />
                    <p className="text-xs">{isVi ? "Không có hình ảnh" : "No media available"}</p>
                  </div>
                )}

                {/* Steam-style Left & Right navigation buttons */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Ảnh trước"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-14 rounded-lg bg-black/60 hover:bg-black/85 text-white/80 hover:text-white border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer backdrop-blur-sm"
                    >
                      <span className="text-lg font-light leading-none">‹</span>
                    </button>

                    <button
                      type="button"
                      aria-label="Ảnh tiếp theo"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex((prev) => (prev + 1) % images.length);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-14 rounded-lg bg-black/60 hover:bg-black/85 text-white/80 hover:text-white border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer backdrop-blur-sm"
                    >
                      <span className="text-lg font-light leading-none">›</span>
                    </button>

                    {/* Steam-style Image Counter Pill */}
                    <div className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded-md bg-black/75 border border-white/10 text-[11px] font-mono text-zinc-300 backdrop-blur-sm">
                      {selectedImageIndex + 1} / {images.length}
                    </div>
                  </>
                )}

                {/* Subtle vignette border inside */}
                <div className="absolute inset-0 border border-white/[0.06] rounded-2xl pointer-events-none" />
              </div>

              {/* Quick-Switch Thumbnails Strip with Steam-grade active highlight */}
              {images.length > 1 && (
                <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-none">
                  {images.map((img: { url: string }, i: number) => {
                    const isSelected = i === selectedImageIndex;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedImageIndex(i)}
                        className={`relative flex-shrink-0 w-28 aspect-video rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "border-cyan-400 ring-2 ring-cyan-400/50 scale-[1.02] shadow-lg shadow-cyan-500/10"
                            : "border-white/10 opacity-60 hover:opacity-100 hover:border-white/30"
                        }`}
                      >
                        <img
                          src={resolveUrl(img.url)}
                          crossOrigin="anonymous"
                          alt={`Screenshot ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Official Trailer Video */}
            {g.videos && g.videos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {isVi ? "Trailer Giới Thiệu Chính Thức" : "Official Gameplay Trailer"}
                </h3>
                <TrailerPlayer url={g.videos[0].url} slug={slug} />
              </div>
            )}

            {/* ─── WEBGL DEMO KIOSK (Play directly in browser) ─── */}
            {demo && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0E131E] p-6 space-y-4 shadow-xl">
                <div className="flex justify-between items-center flex-wrap gap-3 border-b border-white/[0.06] pb-4">
                  <div>
                    <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                      {isVi ? "Chơi thử WebGL Demo" : isZh ? "在线免下载 WebGL 试玩" : "Playable WebGL Demo"}
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                        {isVi ? "Miễn Phí" : isZh ? "免费" : "Free"}
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {isVi ? "Trải nghiệm gameplay tức thì trên trình duyệt mà không cần cài đặt." : isZh ? "在浏览器中即刻体验游戏核心玩法，无需下载安装。" : "Test gameplay immediately in your browser without download."}
                    </p>
                  </div>

                  {isPlayingDemo && (
                    <button
                      type="button"
                      onClick={stopDemo}
                      className="btn-secondary text-xs text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
                    >
                      {isVi ? "Dừng Chơi Thử" : isZh ? "退出试玩" : "Stop Demo"}
                    </button>
                  )}
                </div>

                {isPlayingDemo ? (
                  <div className="w-full overflow-hidden rounded-xl border border-white/10">
                    <UnityWebGLPlayer buildUrl={demo.buildUrl} />
                  </div>
                ) : (
                  <div className="relative w-full aspect-[16/9] overflow-hidden rounded-xl border border-white/[0.08] bg-[#080B11] flex flex-col items-center justify-center p-6 group">
                    {images[0]?.url && (
                      <img
                        src={resolveUrl(images[0].url)}
                        crossOrigin="anonymous"
                        alt="Demo background"
                        className="absolute inset-0 w-full h-full object-cover opacity-15 filter blur-sm transition duration-500 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080B11] via-[#080B11]/60 to-transparent" />
                    
                    <div className="relative z-10 flex flex-col items-center gap-4 text-center max-w-sm">
                      <button
                        type="button"
                        onClick={async () => {
                          setIsPlayingDemo(true);
                          await playDemo();
                        }}
                        className="btn-primary size-16 rounded-full flex items-center justify-center text-xl shadow-2xl pl-1"
                        title={isVi ? "Bấm để chơi thử ngay" : isZh ? "点击立即试玩" : "Click to launch demo"}
                      >
                        ▶
                      </button>
                      <div>
                        <p className="font-bold text-white text-base">
                          {isVi ? "Bắt Đầu Chơi Thử" : isZh ? "启动 WebGL 试玩" : "Launch WebGL Demo"}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {isVi ? "Tương thích mượt mà trên Chrome, Edge, Safari và Firefox." : isZh ? "完美兼容 Chrome、Edge、Safari 与 Firefox 等主流桌面浏览器。" : "Runs seamlessly on modern desktop web browsers."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* About This Game */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0E131E] p-6 sm:p-8 space-y-4 shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="size-2 rounded-full bg-white" />
                {isVi ? "Giới Thiệu Trò Chơi" : isZh ? "游戏简介" : "About This Game"}
              </h2>
              <div
                className={`text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap font-normal ${
                  !showFullDesc && description.length > 500 ? "line-clamp-6" : ""
                }`}
              >
                {description || (isVi ? "Chưa có mô tả chi tiết cho tựa game này." : isZh ? "该游戏暂无详细介绍。" : "No detailed description available.")}
              </div>
              {description.length > 500 && (
                <button
                  type="button"
                  onClick={() => setShowFullDesc(!showFullDesc)}
                  className="text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer pt-2"
                >
                  {showFullDesc ? (isVi ? "▲ Thu gọn nội dung" : isZh ? "▲ 收起内容" : "▲ Show less") : (isVi ? "▼ Đọc tiếp giới thiệu" : isZh ? "▼ 展开全部介绍" : "▼ Read full description")}
                </button>
              )}
            </div>

            {/* System Requirements Grid */}
            {!!g.systemRequirements && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0E131E] p-6 sm:p-8 space-y-4 shadow-xl">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  {isVi ? "Cấu hình yêu cầu" : isZh ? "配置需求" : "System Specifications"}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {(() => {
                    try {
                      const reqs = JSON.parse(g.systemRequirements as string);
                      return (
                        <>
                          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3.5 space-y-1">
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                              {isVi ? "Hệ điều hành" : isZh ? "操作系统" : "Operating System"}
                            </span>
                            <p className="text-zinc-200 font-medium">{reqs.os || "Windows 10/11 64-bit"}</p>
                          </div>

                          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3.5 space-y-1">
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                              {isVi ? "Bộ xử lý" : isZh ? "处理器" : "Processor"}
                            </span>
                            <p className="text-zinc-200 font-medium">{reqs.cpu || "Intel Core i5 / AMD Ryzen 5"}</p>
                          </div>

                          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3.5 space-y-1">
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                              {isVi ? "Bộ nhớ RAM" : isZh ? "内存" : "Memory"}
                            </span>
                            <p className="text-zinc-200 font-medium">{reqs.ram_gb ? `${reqs.ram_gb} GB RAM` : "8 GB RAM"}</p>
                          </div>

                          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3.5 space-y-1">
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                              {isVi ? "Card đồ họa" : isZh ? "显卡" : "Graphics"}
                            </span>
                            <p className="text-zinc-200 font-medium">{reqs.gpu || "GTX 1060 / Radeon RX 580"}</p>
                          </div>

                          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3.5 space-y-1 sm:col-span-2">
                            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                              {isVi ? "Dung lượng ổ đĩa trống" : isZh ? "存储空间" : "Storage Space"}
                            </span>
                            <p className="text-zinc-200 font-medium">{reqs.storage_gb ? (isVi ? `${reqs.storage_gb} GB khả dụng` : isZh ? `${reqs.storage_gb} GB 可用空间` : `${reqs.storage_gb} GB available space`) : (isVi ? "Ổ đĩa trống tối thiểu 5 GB" : isZh ? "至少 5 GB 可用空间" : "At least 5 GB available space")}</p>
                          </div>
                        </>
                      );
                    } catch {
                      return <pre className="col-span-2 whitespace-pre-wrap text-zinc-400 text-xs bg-[#080B11] p-3 rounded-xl">{g.systemRequirements as string}</pre>;
                    }
                  })()}
                </div>
              </div>
            )}

            {/* ─── REVIEWS & COMMUNITY FEEDBACK ─── */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0E131E] p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  {isVi ? "Đánh giá & Thảo luận từ cộng đồng" : isZh ? "玩家评价与社区讨论" : "Community Reviews & Discussions"}{" "}
                  <span className="text-xs text-zinc-500 font-normal">
                    ({totalCommentsCount})
                  </span>
                </h2>
              </div>

              {/* Review Input Box, Admin Hub, or User's Existing Review Card */}
              <div>
                {isAdmin ? (
                  /* ─── ADMIN COMMUNITY CONSOLE ─── */
                  <div className="rounded-xl border border-rose-500/20 bg-gradient-to-b from-[#120E16] to-[#080B11] p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider">
                          {isVi ? "Khu Vực Ban Quản Trị" : isZh ? "官方管理团队" : "Staff Console"}
                        </span>
                        <span className="text-xs font-semibold text-zinc-200">
                          {isVi ? "Thông Báo Chính Thức & Điều Hành" : isZh ? "官方公告与社区管理" : "Official Notice & Moderation Desk"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded">
                          {totalCommentsCount} {isVi ? "bài thảo luận" : "threads"}
                        </span>
                      </div>
                    </div>

                    <form onSubmit={submitReview} className="space-y-3">
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={
                          isVi
                            ? "Đăng thông báo chính thức từ Ban Quản Trị (tin tức cập nhật, hướng dẫn kỹ thuật, thông báo bảo trì máy chủ)..."
                            : isZh
                            ? "发布来自管理团队的官方公告（更新说明、技术指引、维护通知等）..."
                            : "Post an official staff announcement (patch notes, technical guidelines, server maintenance)..."
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#070A10] p-3 text-xs sm:text-sm text-zinc-200 outline-none focus:border-rose-500/40 h-24 placeholder:text-zinc-600 transition-colors"
                      />

                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-[11px] text-zinc-500 italic">
                          {isVi
                            ? "Bài đăng của Quản trị viên mang huy hiệu Ban Quản Trị và không làm lệch điểm đánh giá sao của người chơi."
                            : isZh
                            ? "官方人员发布的公告带有官方标识，且不计入社区玩家星级评分。"
                            : "Staff posts carry the verified staff badge and do not affect community star ratings."}
                        </p>
                        <button
                          type="submit"
                          disabled={submittingReview || !comment.trim()}
                          className="bg-white text-black hover:bg-zinc-200 font-bold text-xs py-2 px-4 rounded-lg transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                        >
                          {submittingReview
                            ? (isVi ? "Đang gửi..." : "Submitting...")
                            : (isVi ? "Đăng Thông Báo BQT" : isZh ? "发布官方公告" : "Post Staff Notice")}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : !user ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-[#080B11] p-5 text-center space-y-2">
                    <p className="text-xs text-zinc-400">
                      {isVi
                        ? "Vui lòng đăng nhập để tham gia đánh giá và thảo luận về tựa game này."
                        : isZh
                        ? "请先登录以参与评价和社区讨论。"
                        : "Log in to post reviews and join community discussions."}
                    </p>
                    <Link href={`/${locale}/login`}>
                      <button className="bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white font-medium text-xs py-1.5 px-4 rounded-lg transition mt-1 cursor-pointer">
                        {isVi ? "Đăng Nhập Ngay" : isZh ? "立即登录" : "Log In"}
                      </button>
                    </Link>
                  </div>
                ) : myRootReview ? (
                  /* User ALREADY has a root review */
                  <div className="rounded-xl border border-white/[0.08] bg-[#0A0E18] p-5 space-y-3 relative shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-300 bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded">
                          {isVi ? "Đánh giá của bạn" : isZh ? "你的评价" : "Your Review"}
                        </span>
                        {myRootReview.isVerifiedPurchase && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="size-2.5" />
                            {isVi ? "Đã mua game" : isZh ? "已购正版" : "Verified Owner"}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {formatDateTimeShort(myRootReview.createdAt)}
                        </span>
                      </div>

                      {/* Edit / Delete Actions */}
                      <div className="flex items-center gap-2">
                        {editingReviewId !== myRootReview.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingReviewId(myRootReview.id);
                              setEditingComment(myRootReview.comment);
                              setEditingRating(myRootReview.rating || null);
                            }}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
                          >
                            {isVi ? "Chỉnh sửa" : isZh ? "修改评价" : "Edit"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteReview(myRootReview.id)}
                          className="size-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-white/5 transition cursor-pointer"
                          title={isVi ? "Xóa đánh giá" : "Delete"}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Content or Edit Form */}
                    {editingReviewId === myRootReview.id ? (
                      <form onSubmit={(e) => submitEditReview(e, myRootReview.id)} className="space-y-3 pt-2">
                        {myRootReview.isVerifiedPurchase && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-zinc-400 mr-1">
                              {isVi ? "Số sao:" : "Rating:"}
                            </span>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setEditingRating(editingRating === s ? null : s)}
                                className="cursor-pointer p-0.5 hover:scale-110 active:scale-95 transition-transform"
                              >
                                <Star
                                  className={`size-5 transition-colors ${
                                    s <= (editingRating ?? 0)
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-zinc-600 hover:text-zinc-400"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        )}
                        <textarea
                          required
                          value={editingComment}
                          onChange={(e) => setEditingComment(e.target.value)}
                          className="w-full rounded-lg border border-white/20 bg-[#080B11] p-3 text-xs sm:text-sm text-zinc-200 outline-none focus:border-white/40 h-24"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingReviewId(null)}
                            className="bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-300 text-xs py-1.5 px-3.5 rounded-lg transition cursor-pointer"
                          >
                            {isVi ? "Hủy" : "Cancel"}
                          </button>
                          <button
                            type="submit"
                            className="bg-white text-black hover:bg-zinc-200 font-semibold text-xs py-1.5 px-4 rounded-lg transition active:scale-95 cursor-pointer"
                          >
                            {isVi ? "Lưu thay đổi" : "Save Changes"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-1.5">
                        {myRootReview.rating && (
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`size-3.5 ${
                                  s <= myRootReview.rating ? "fill-amber-400 text-amber-400" : "text-zinc-700"
                                }`}
                              />
                            ))}
                            <span className="text-xs font-mono font-bold text-amber-400 ml-1.5">
                              {myRootReview.rating}.0 / 5.0
                            </span>
                          </div>
                        )}
                        <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                          {myRootReview.comment}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* User has NOT reviewed yet */
                  <form onSubmit={submitReview} className="rounded-xl border border-white/[0.08] bg-[#080B11] p-4 sm:p-5 space-y-4">
                    {/* Notice for non-owners (minimal, zero emojis) */}
                    {!isGameOwned && (
                      <div className="flex items-start gap-3 p-3.5 rounded-lg bg-white/[0.02] border border-white/10 text-xs text-zinc-300">
                        <span className="size-2 rounded-full bg-amber-400 mt-1 shrink-0" />
                        <div className="space-y-0.5">
                          <span className="font-semibold text-zinc-200 block text-xs">
                            {isVi ? "Chưa sở hữu bản quyền" : isZh ? "尚未拥有正版" : "Not Owned"}
                          </span>
                          <span className="text-zinc-400 leading-relaxed block text-[11px]">
                            {isVi
                              ? "Bạn chưa mua tựa game này nên không thể chấm điểm sao. Bạn vẫn có thể gửi bình luận đặt câu hỏi hoặc thảo luận cùng cộng đồng tại đây."
                              : isZh
                              ? "您尚未购买此游戏，因此无法评星。您仍可以在此发表疑问或与社区讨论！"
                              : "You have not purchased this game yet, so star rating is disabled. You can still post questions or community discussions here."}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-300">
                        {isGameOwned
                          ? (isVi ? "Chia sẻ trải nghiệm của bạn về game:" : isZh ? "分享你对这款游戏的评价与心得：" : "Rate and share your thoughts:")
                          : (isVi ? "Gửi câu hỏi hoặc ý kiến thảo luận:" : isZh ? "发表疑问或参与讨论：" : "Post a question or comment:")}
                      </span>

                      {/* Interactive Stars - ONLY for verified owners */}
                      {isGameOwned && (
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setRating(rating === s ? null : s)}
                              onMouseEnter={() => setHoverRating(s)}
                              onMouseLeave={() => setHoverRating(null)}
                              className="cursor-pointer p-0.5 hover:scale-110 active:scale-95 transition-transform"
                            >
                              <Star
                                className={`size-5 transition-colors ${
                                  s <= (hoverRating ?? rating ?? 0)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-zinc-600 hover:text-zinc-400"
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={
                        isGameOwned
                          ? (isVi ? "Trò chơi có đồ họa thế nào? Gameplay có cuốn hút không?..." : isZh ? "画质如何？玩法是否吸引人？写下你的真实评价..." : "Write your review...")
                          : (isVi ? "Đặt câu hỏi hoặc thảo luận về tựa game này cùng cộng đồng..." : isZh ? "留下关于此游戏的问题或与社区讨论..." : "Ask a question or discuss this game...")
                      }
                      className="w-full rounded-lg border border-white/10 bg-[#0E131E] p-3 text-xs sm:text-sm text-zinc-200 outline-none focus:border-white/30 h-24 placeholder:text-zinc-600 transition-colors"
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="bg-white text-black hover:bg-zinc-200 font-semibold text-xs py-2 px-5 rounded-lg transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                        disabled={submittingReview}
                      >
                        {submittingReview
                          ? (isVi ? "Đang gửi..." : isZh ? "正在发布..." : "Submitting...")
                          : isGameOwned
                          ? (isVi ? "Đăng Đánh Giá" : isZh ? "发布评价" : "Post Review")
                          : (isVi ? "Gửi Bình Luận" : isZh ? "发布留言" : "Post Comment")}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Reviews List */}
              <div className="space-y-4 pt-2">
                {reviewItems.length === 0 ? (
                  <p className="text-center py-8 text-xs text-zinc-500">
                    {isVi ? "Chưa có đánh giá nào. Hãy là người đầu tiên trải nghiệm và chia sẻ cảm nghĩ nhé!" : isZh ? "暂无评价。成为第一个体验并分享心得的玩家吧！" : "No reviews yet. Be the first to share your thoughts!"}
                  </p>
                ) : (
                  reviewItems
                    .filter((r: any) => !r.parentId)
                    .map((review: any) => {
                      const isOwner = user?.id === review.userId;
                      const isReviewAdmin = review.userRole === "Admin" || review.userName?.toLowerCase().includes("admin");
                      const replies = reviewItems
                        .filter((r: any) => r.parentId === review.id)
                        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

                      return (
                        <div
                          id={`review-${review.id}`}
                          key={review.id}
                          className="rounded-xl border border-white/[0.06] bg-[#080B11] p-4 sm:p-5 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <Link href={`${prefix}/profile?id=${review.userId}`}>
                                <CommentAvatar url={review.userAvatarUrl} name={review.userName} size="md" />
                              </Link>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Link
                                    href={`${prefix}/profile?id=${review.userId}`}
                                    className="text-xs font-bold text-white hover:underline"
                                  >
                                    {review.userName}
                                  </Link>
                                  {isReviewAdmin && (
                                    <span className="rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider">
                                      {isVi ? "Ban Quản Trị" : isZh ? "官方管理" : "Staff"}
                                    </span>
                                  )}
                                  {review.isVerifiedPurchase && (
                                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-medium text-emerald-400 border border-emerald-500/15">
                                      <CheckCircle className="size-2.5" />
                                      {isVi ? "Đã mua game" : isZh ? "已购正版" : "Verified"}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-zinc-500 font-mono">
                                    {formatDateTimeShort(review.createdAt)}
                                  </span>
                                </div>
                                {review.rating && (
                                  <div className="flex gap-0.5 mt-1">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star
                                        key={s}
                                        className={`size-3 ${
                                          s <= review.rating
                                            ? "fill-amber-400 text-amber-400"
                                            : "text-zinc-700"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {(isOwner || isAdmin) && (
                              <button
                                onClick={() => deleteReview(review.id)}
                                className="text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors p-1 rounded"
                                title={isAdmin && !isOwner ? (isVi ? "Kiểm duyệt: Xóa bình luận này" : "Moderate: Delete review") : (isVi ? "Xóa" : "Delete")}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Comment Text or Edit Form */}
                          {editingReviewId === review.id ? (
                            <form onSubmit={(e) => submitEditReview(e, review.id)} className="space-y-2 pt-2">
                              <textarea
                                required
                                value={editingComment}
                                onChange={(e) => setEditingComment(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-[#0E131E] p-2.5 text-xs text-zinc-200 outline-none focus:border-white/30 h-16"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  className="bg-white text-black hover:bg-zinc-200 font-semibold text-xs py-1.5 px-3.5 rounded-lg transition active:scale-95 cursor-pointer"
                                >
                                  {isVi ? "Lưu" : isZh ? "保存" : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingReviewId(null)}
                                  className="bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-300 text-xs py-1.5 px-3 rounded-lg transition cursor-pointer"
                                >
                                  {isVi ? "Hủy" : isZh ? "取消" : "Cancel"}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                              {renderCommentText(review.comment, review, replies)}
                            </p>
                          )}

                          {/* Action links */}
                          <div className="flex items-center gap-3 pt-1 text-xs text-zinc-400">
                            <button
                              onClick={() => {
                                const show = replyingTo !== review.id;
                                setReplyingTo(show ? review.id : null);
                                setReplyComment(show ? `@${review.userName} ` : "");
                              }}
                              className="hover:text-white transition-colors cursor-pointer"
                            >
                              {isVi ? "Trả lời" : isZh ? "回复" : "Reply"}
                            </button>
                            {isOwner && editingReviewId !== review.id && (
                              <button
                                onClick={() => {
                                  setEditingReviewId(review.id);
                                  setEditingComment(review.comment);
                                  setEditingRating(review.rating || null);
                                }}
                                className="hover:text-white transition-colors cursor-pointer"
                              >
                                {isVi ? "Chỉnh sửa" : isZh ? "编辑" : "Edit"}
                              </button>
                            )}
                          </div>

                          {/* Reply Thread */}
                          {replies.length > 0 && (
                            <div className="ml-4 sm:ml-8 pl-4 border-l border-white/[0.08] space-y-3 pt-2">
                              {replies.map((reply: any) => {
                                const isRepOwner = user?.id === reply.userId;
                                const isReplyAdmin = reply.userRole === "Admin" || reply.userName?.toLowerCase().includes("admin");

                                return (
                                  <div
                                    id={`review-${reply.id}`}
                                    key={reply.id}
                                    className="rounded-lg bg-[#0E131E] border border-white/[0.05] p-3 space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Link href={`${prefix}/profile?id=${reply.userId}`}>
                                          <CommentAvatar url={reply.userAvatarUrl} name={reply.userName} size="sm" />
                                        </Link>
                                        <span className="text-xs font-bold text-white">{reply.userName}</span>
                                        {isReplyAdmin && (
                                          <span className="rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase tracking-wider">
                                            {isVi ? "Ban Quản Trị" : isZh ? "官方管理" : "Staff"}
                                          </span>
                                        )}
                                        <span className="text-[10px] text-zinc-500 font-mono">
                                          {formatDateTimeShort(reply.createdAt)}
                                        </span>
                                      </div>
                                      {(isRepOwner || isAdmin) && (
                                        <button
                                          onClick={() => deleteReview(reply.id)}
                                          className="text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 p-0.5 rounded transition-colors"
                                          title={isAdmin && !isRepOwner ? (isVi ? "Kiểm duyệt: Xóa phản hồi" : "Moderate: Delete reply") : (isVi ? "Xóa" : "Delete")}
                                        >
                                          <Trash2 className="size-3" />
                                        </button>
                                      )}
                                    </div>
                                    {/* Inline Edit or Comment text */}
                                    {editingReviewId === reply.id ? (
                                      <form onSubmit={(e) => submitEditReview(e, reply.id)} className="space-y-2 pt-1">
                                        <textarea
                                          required
                                          value={editingComment}
                                          onChange={(e) => setEditingComment(e.target.value)}
                                          className="w-full rounded-lg border border-white/10 bg-[#080B11] p-2 text-xs text-zinc-200 outline-none focus:border-white/30 h-16"
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            type="submit"
                                            className="bg-white text-black hover:bg-zinc-200 font-semibold text-xs py-1 px-3 rounded-lg transition active:scale-95 cursor-pointer"
                                          >
                                            {isVi ? "Lưu" : isZh ? "保存" : "Save"}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingReviewId(null)}
                                            className="bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-300 text-xs py-1 px-3 rounded-lg transition cursor-pointer"
                                          >
                                            {isVi ? "Hủy" : isZh ? "取消" : "Cancel"}
                                          </button>
                                        </div>
                                      </form>
                                    ) : (
                                      <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                        {renderCommentText(reply.comment, review, replies)}
                                      </p>
                                    )}

                                    {/* Action Links under Reply */}
                                    <div className="flex items-center gap-3 pt-0.5 text-xs text-zinc-400">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReplyingTo(review.id);
                                          setReplyComment(`@${reply.userName} `);
                                        }}
                                        className="hover:text-white transition-colors cursor-pointer"
                                      >
                                        {isVi ? "Trả lời" : isZh ? "回复" : "Reply"}
                                      </button>
                                      {isRepOwner && editingReviewId !== reply.id && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingReviewId(reply.id);
                                            setEditingComment(reply.comment);
                                            setEditingRating(null);
                                          }}
                                          className="hover:text-white transition-colors cursor-pointer"
                                        >
                                          {isVi ? "Chỉnh sửa" : isZh ? "编辑" : "Edit"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Reply Form */}
                          {replyingTo === review.id && user && (
                            <form
                              onSubmit={(e) => submitReply(e, review.id)}
                              className="ml-4 sm:ml-8 mt-3 space-y-2 border-l border-white/[0.08] pl-4"
                            >
                              <textarea
                                required
                                value={replyComment}
                                onChange={(e) => setReplyComment(e.target.value)}
                                placeholder={isVi ? "Nhập phản hồi..." : isZh ? "写下你的回复..." : "Write a response..."}
                                className="w-full rounded-lg border border-white/10 bg-[#0E131E] p-2.5 text-xs text-zinc-200 outline-none focus:border-white/30 h-16"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setReplyingTo(null)}
                                  className="bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-300 text-xs py-1 px-3 rounded-lg transition cursor-pointer"
                                >
                                  {isVi ? "Hủy" : isZh ? "取消" : "Cancel"}
                                </button>
                                <button
                                  type="submit"
                                  className="bg-white text-black hover:bg-zinc-200 font-semibold text-xs py-1 px-3.5 rounded-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
                                  disabled={submittingReply}
                                >
                                  {submittingReply ? (isVi ? "Đang gửi..." : isZh ? "正在发送..." : "Sending...") : (isVi ? "Trả Lời" : isZh ? "发送回复" : "Reply")}
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>

          </div>

          {/* ════════ RIGHT COLUMN: Sticky Purchase Sidebar ════════ */}
          <div className="lg:sticky lg:top-20 space-y-6">
            
            {/* Main Purchase Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0E131E] p-6 space-y-5 shadow-2xl">
              
              {/* Pricing Display */}
              <div>
                {discountPct > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-black text-emerald-400 border border-emerald-500/30">
                        -{discountPct}%
                      </span>
                      <span className="text-xs text-zinc-400 line-through">
                        {formatPrice(originalPrice, g.currency as string)}
                      </span>
                    </div>
                    <div className="text-3xl font-black text-white tracking-tight">
                      {formatPrice(price, g.currency as string)}
                    </div>
                  </div>
                ) : price === 0 ? (
                  <div className="text-3xl font-black text-emerald-400 tracking-tight">
                    {isVi ? "Miễn Phí" : isZh ? "免费" : "Free"}
                  </div>
                ) : (
                  <div className="text-3xl font-black text-white tracking-tight">
                    {formatPrice(price, g.currency as string)}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                {!isAdmin && (
                  <>
                    {g.status === "Archived" ? (
                      <button className="btn-secondary w-full opacity-60 cursor-not-allowed">
                        {isVi ? "Sắp Ra Mắt" : isZh ? "即将发售" : "Coming Soon"}
                      </button>
                    ) : g.isOwned ? (
                      <Link href={`/${locale}/library`} className="block w-full">
                        <button className="btn-secondary w-full flex items-center justify-center gap-2 text-emerald-400 border-emerald-500/20">
                          <CheckCircle className="size-4" />
                          <span>{isVi ? "Đã Sở Hữu (Vào Thư Viện)" : isZh ? "已拥有 (前往游戏库)" : "Owned (Go to Library)"}</span>
                        </button>
                      </Link>
                    ) : !user ? (
                      <Link href={`/${locale}/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`} className="block w-full">
                        <button className="btn-primary w-full text-center">
                          {isVi ? "Đăng Nhập Để Mua" : isZh ? "登录后购买" : "Log in to Purchase"}
                        </button>
                      </Link>
                    ) : (
                      <button
                        onClick={() => {
                          if (price > 0) {
                            setShowConfirmBuy(true);
                          } else {
                            buy();
                          }
                        }}
                        className="btn-primary w-full shadow-xl"
                      >
                        {price === 0
                          ? (isVi ? "Nhận Miễn Phí Vào Thư Viện" : isZh ? "免费添加入库" : "Claim Free to Library")
                          : (isVi ? "Mua Ngay" : isZh ? "立即购买" : "Buy Now")}
                      </button>
                    )}

                    <button
                      onClick={toggleWishlist}
                      className={`btn-secondary w-full flex items-center justify-center gap-2 transition-colors ${
                        isWishlisted ? "text-rose-400 border-rose-500/30 bg-rose-500/10" : ""
                      }`}
                    >
                      <Heart className={`size-4 ${isWishlisted ? "fill-rose-400" : ""}`} />
                      <span>
                        {isWishlisted
                          ? (isVi ? "Đã Lưu Yêu Thích" : isZh ? "已在愿望单" : "Wishlisted")
                          : (isVi ? "Thêm Vào Yêu Thích" : isZh ? "加入愿望单" : "Add to Wishlist")}
                      </span>
                    </button>
                  </>
                )}

                {isAdmin && (
                  <div className="rounded-xl border border-white/5 bg-[#080B11] p-3 text-center text-xs text-zinc-400">
                    {isVi ? "Tài khoản Quản trị viên (Admin Mode)" : isZh ? "管理员账号 (Admin 模式)" : "Administrator Account"}
                  </div>
                )}
              </div>

              {/* Guarantees List */}
              <div className="space-y-2 pt-3 border-t border-white/[0.06] text-[11px] text-zinc-400">
                <div className="flex items-baseline gap-2">
                  <span className="text-zinc-600">•</span>
                  <span>{isVi ? "Bản quyền game kỹ thuật số chính hãng" : isZh ? "100% 官方正版数字游戏授权" : "100% Genuine Digital License"}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-zinc-600">•</span>
                  <span>{isVi ? "Thanh toán VietQR kích hoạt tức thì" : isZh ? "VietQR 极速扫码自动入库" : "Instant Activation via VietQR"}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-zinc-600">•</span>
                  <span>{isVi ? "Chính sách hoàn tiền bảo vệ quyền lợi" : isZh ? "14 天无忧退款保障机制" : "14-Day Refund Protection"}</span>
                </div>
              </div>

            </div>

            {/* Metadata Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0E131E] p-6 space-y-3.5 shadow-xl text-xs">
              <h3 className="font-bold uppercase tracking-wider text-zinc-400 text-[11px]">
                {isVi ? "Thông Tin Chi Tiết" : isZh ? "游戏详细信息" : "Game Specifications"}
              </h3>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                  <span className="text-zinc-400">{isVi ? "Nhà phát triển" : isZh ? "开发商" : "Developer"}</span>
                  <span className="font-semibold text-white">{g.developer as string}</span>
                </div>

                {g.publisher && (
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                    <span className="text-zinc-400">{isVi ? "Nhà phát hành" : isZh ? "发行商" : "Publisher"}</span>
                    <span className="font-semibold text-white">{g.publisher as string}</span>
                  </div>
                )}

                {g.releaseDate && (
                  <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                    <span className="text-zinc-400">{isVi ? "Ngày phát hành" : isZh ? "发售日期" : "Release Date"}</span>
                    <span className="font-semibold text-white">{formatDate(g.releaseDate)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-1 border-b border-white/[0.04]">
                  <span className="text-zinc-400">{isVi ? "Lượt tải game" : isZh ? "下载量" : "Downloads"}</span>
                  <span className="font-semibold text-white">
                    {(g.downloadCount as number ?? 0).toLocaleString()}
                  </span>
                </div>

                {g.minAge > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-zinc-400">{isVi ? "Độ tuổi quy định" : isZh ? "年龄分级" : "Age Rating"}</span>
                    <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded text-[11px]">
                      {g.minAge}+
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags Pills */}
            {((g.tags && g.tags.length > 0) || !!demo) && (
              <div className="rounded-2xl border border-white/[0.08] bg-[#0E131E] p-6 space-y-3 shadow-xl">
                <h3 className="font-bold uppercase tracking-wider text-zinc-400 text-[11px]">
                  {isVi ? "Nhãn Trò Chơi (Tags)" : isZh ? "游戏标签" : "Game Tags"}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {g.tags &&
                    g.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded-lg bg-[#080B11] border border-white/[0.06] px-2.5 py-1 text-xs text-zinc-300 hover:text-white transition-colors select-none"
                      >
                        #{tag}
                      </span>
                    ))}
                  {demo && (
                    <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400 select-none">
                      #WebGL Demo
                    </span>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* ─── Confirm Purchase Modal ─── */}
      {showConfirmBuy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#0E131E] p-6 shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">
                {isVi ? "Xác Nhận Đặt Mua Trò Chơi" : isZh ? "确认购买游戏" : "Confirm Purchase"}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isVi
                  ? `Bạn đang tiến hành mua tựa game "${g.title}" với số tiền ${formatPrice(price, g.currency as string)}. Mã thanh toán VietQR tự động sẽ được tạo ngay sau đây.`
                  : isZh
                  ? `您即将购买《${g.title}》，金额为 ${formatPrice(price, g.currency as string)}。稍后将自动生成 VietQR 付款码。`
                  : `You are about to purchase "${g.title}" for ${formatPrice(price, g.currency as string)}. A dynamic VietQR code will be generated.`}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmBuy(false)}
                className="btn-secondary flex-1"
              >
                {isVi ? "Hủy bỏ" : isZh ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmBuy(false);
                  buy();
                }}
                className="btn-primary flex-1"
              >
                {isVi ? "Tiếp Tục Thanh Toán" : isZh ? "前往支付" : "Proceed to Pay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── VietQR Payment Modal ─── */}
      {showPay && orderId && (
        <QRPaymentModal
          orderId={orderId}
          onClose={() => setShowPay(false)}
          onSuccess={() => {
            setShowPay(false);
            router.push(`/${locale}/library`);
          }}
        />
      )}

    </div>
  );
}
