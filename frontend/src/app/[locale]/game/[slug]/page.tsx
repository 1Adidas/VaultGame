"use client";

import { use, useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGame } from "@/hooks/useGames";
import { api, type ApiResponse } from "@/lib/api/client";
import { formatPrice, formatDate, formatDateTimeShort, resolveImageUrl as resolveUrl, resolveVideoUrl } from "@/lib/utils";
import { Button, Card } from "@/components/ui/button";
import { UnityWebGLPlayer } from "@/components/demo/UnityWebGLPlayer";
import { QRPaymentModal } from "@/components/payment/QRPaymentModal";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth/store";
import { Star, Trash2, Calendar, MessageSquare, Download, UserCircle, CheckCircle, Gamepad2, Settings } from "lucide-react";

function TrailerPlayer({ url, slug }: { url: string; slug: string }) {
  const [useIframe, setUseIframe] = useState(false);
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const fileId = match ? match[1] : null;

  if (!fileId) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 aspect-video shadow-lg">
        <video
          src={resolveVideoUrl(url)}
          controls autoPlay muted loop playsInline
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (useIframe) {
    return (
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 aspect-[4/3] sm:aspect-video shadow-lg">
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
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 aspect-video shadow-lg">
      <video
        src={resolveVideoUrl(`/uploads/games/${slug}/trailer/${fileId}.mp4`)}
        controls autoPlay muted loop playsInline
        className="w-full h-full object-cover"
        onError={() => setUseIframe(true)}
      />
    </div>
  );
}

export default function GameDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = use(params);
  const t = useTranslations("game");
  const router = useRouter();
  const { data: game, isLoading, refetch } = useGame(slug);
  const { user } = useAuthStore();
  const prefix = `/${locale}`;

  const [showPay, setShowPay] = useState(false);
  const [orderId, setOrderId] = useState<string>();
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showConfirmBuy, setShowConfirmBuy] = useState(false);

  useEffect(() => {
    if (game) {
      setIsWishlisted(!!(game as Record<string, any>).isWishlisted);
    }
  }, [game]);

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
            "Authorization": api.defaults.headers.common["Authorization"] as string || ""
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
            className="inline-flex items-center rounded-md bg-violet-500/10 px-1.5 py-0.5 text-xs font-semibold text-violet-400 border border-violet-500/20 mr-1 align-baseline select-all"
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
            element.classList.add("ring-2", "ring-violet-500", "duration-1000");
            setTimeout(() => {
              element.classList.remove("ring-2", "ring-violet-500");
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
      <div className="mx-auto max-w-7xl px-4 py-8 animate-pulse space-y-8">
        {/* Banner Skeleton */}
        <div className="h-[300px] w-full rounded-3xl bg-zinc-900/50" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main content column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="h-[250px] w-full rounded-2xl bg-zinc-900/50" />
            <div className="h-[200px] w-full rounded-2xl bg-zinc-900/50" />
          </div>

          {/* Sidebar column */}
          <div className="space-y-6">
            <div className="h-[220px] w-full rounded-2xl bg-zinc-900/50" />
            <div className="h-[180px] w-full rounded-2xl bg-zinc-900/50" />
          </div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-zinc-400">Game not found</p>
      </div>
    );
  }

  const g = game as Record<string, any>;
  const price = (g.discountPrice as number) ?? (g.price as number);
  const demo = g.demo as { buildUrl: string } | null;
  const images = (g.images as { url: string; isPrimary: boolean }[]) ?? [];

  const buy = async () => {
    try {
      const { data } = await api.post<ApiResponse<{ id: string; status: string }>>("/orders", { gameIds: [g.id] });
      if (data.data.status === "Paid") {
        alert(locale === "vi" ? "Đã thêm game vào thư viện của bạn thành công! 🎉" : "Successfully added game to your library! 🎉");
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
      alert(locale === "vi" ? "Bạn cần đăng nhập để thực hiện thao tác này." : "You must log in to perform this action.");
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
      alert(locale === "vi" ? "Thao tác thất bại. Vui lòng thử lại!" : "Action failed. Please try again!");
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
      alert(locale === "vi" ? "Vui lòng nhập bình luận hoặc đánh giá!" : "Please write a comment or select a rating!");
      return;
    }
    setSubmittingReview(true);
    try {
      await api.post(`/games/${g.id}/reviews`, {
        rating: rating,
        title: "",
        comment: comment.trim()
      });
      setComment("");
      setRating(null);
      refetchReviews();
      refetch();
      alert(locale === "vi" ? "Đã bình luận thành công!" : "Review submitted successfully!");
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
    const msg = locale === "vi" ? "Bạn có chắc chắn muốn xóa bình luận này?" : "Are you sure you want to delete this comment?";
    if (!window.confirm(msg)) return;
    try {
      await api.delete(`/reviews/${reviewId}`);
      refetchReviews();
      refetch();
    } catch (error) {
      console.error("Failed to delete review", error);
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
  const isAdmin = user?.roles.includes("Admin");


  const description = (locale === "en" && g.descriptionEn ? g.descriptionEn : g.description) as string ?? "";
  const originalPrice = g.price as number;
  const discountPct = g.discountPrice && originalPrice && g.discountPrice < originalPrice
    ? Math.round((1 - (g.discountPrice as number) / originalPrice) * 100) : 0;

  const ratingDist = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: reviewItems.filter((r: any) => r.rating === s && !r.parentId).length
  }));
  const maxRatingCount = Math.max(...ratingDist.map(r => r.count), 1);

  const activeImage = images[selectedImageIndex] ?? images[0];

  return (
    <div className="min-h-screen -mt-4">
      {/* ▬▬▬ HERO BANNER ▬▬▬ */}
      <div className="relative overflow-hidden" style={{ height: "300px" }}>
        {images[0]?.url && (
          <img
            src={resolveUrl(images[0].url)}
            crossOrigin="anonymous"
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-30 select-none pointer-events-none"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-950" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 h-full flex items-end pb-10">
          <div className="flex items-end gap-6">
            {images[0]?.url && (
              <div className="hidden sm:block flex-shrink-0 w-36 h-48 md:w-44 md:h-60 rounded-2xl overflow-hidden border border-white/15 shadow-2xl shadow-black/70 -mb-10">
                <img src={resolveUrl(images[0].url)} crossOrigin="anonymous" alt={g.title as string} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="pb-1">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {g.categoryName && (
                  <span className="text-xs font-semibold bg-violet-600/80 text-white px-2.5 py-1 rounded-full backdrop-blur">
                    {g.categoryName as string}
                  </span>
                )}
                {demo && (
                  <span className="text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2.5 py-1 rounded-full backdrop-blur animate-pulse">
                    WebGL Demo
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-xl">
                {g.title as string}
              </h1>
              <p className="text-zinc-400 mt-2 text-sm font-medium">
                {g.developer as string}
                {g.publisher && g.publisher !== g.developer && ` • ${g.publisher as string}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ▬▬▬ MAIN CONTENT ▬▬▬ */}
      <div className="mx-auto max-w-7xl px-4 pt-14 sm:pt-16 pb-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px] items-start">

          {/* ─── LEFT: Media + Description ─── */}
          <div className="space-y-5">
            {/* Main image viewer */}
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 aspect-video shadow-2xl">
              {activeImage?.url ? (
                <img
                  src={resolveUrl(activeImage.url)}
                  crossOrigin="anonymous"
                  alt={g.title as string}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Gamepad2 className="size-16 text-zinc-700" />
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {images.map((img: { url: string }, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImageIndex(i)}
                    className={`flex-shrink-0 w-24 aspect-video rounded-xl overflow-hidden border-2 transition-all duration-150 ${i === selectedImageIndex
                      ? "border-violet-500 ring-2 ring-violet-500/30 scale-105"
                      : "border-white/5 hover:border-violet-500/40 opacity-70 hover:opacity-100"
                      }`}
                  >
                    <img src={resolveUrl(img.url)} crossOrigin="anonymous" alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Trailer */}
            {g.videos && g.videos.length > 0 && (
              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Trailer</p>
                <TrailerPlayer url={g.videos[0].url} slug={slug} />
              </div>
            )}

            {/* About card */}
            <div className="rounded-2xl border border-white/5 bg-zinc-900/30 backdrop-blur p-6">
              <h2 className="text-base font-bold text-white mb-3">
                {locale === "vi" ? "Về trò chơi này" : "About This Game"}
              </h2>
              <p className={`text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap ${!showFullDesc && description.length > 500 ? "line-clamp-6" : ""
                }`}>
                {description}
              </p>
              {description.length > 500 && (
                <button
                  type="button"
                  onClick={() => setShowFullDesc(!showFullDesc)}
                  className="mt-3 text-xs text-violet-400 hover:text-violet-300 font-semibold transition flex items-center gap-1"
                >
                  {showFullDesc
                    ? (locale === "vi" ? "▲ Thu gọn" : "▲ Show less")
                    : (locale === "vi" ? "▼ Xem thêm" : "▼ Read more")}
                </button>
              )}
            </div>

            {/* System Requirements */}
            {!!g.systemRequirements && (
              <div className="rounded-2xl border border-white/5 bg-zinc-900/30 backdrop-blur p-6">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Settings className="size-4 text-violet-400" />
                  {t("requirements") || "System Requirements"}
                </h2>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(() => {
                    try {
                      const reqs = JSON.parse(g.systemRequirements as string);
                      return (
                        <>
                          <div className="rounded-xl bg-zinc-950/60 border border-white/5 p-3">
                            <span className="block text-violet-400 font-semibold mb-1 text-[11px] uppercase tracking-wide">OS</span>
                            <span className="text-zinc-300">{reqs.os || "N/A"}</span>
                          </div>
                          <div className="rounded-xl bg-zinc-950/60 border border-white/5 p-3">
                            <span className="block text-violet-400 font-semibold mb-1 text-[11px] uppercase tracking-wide">CPU</span>
                            <span className="text-zinc-300">{reqs.cpu || "N/A"}</span>
                          </div>
                          <div className="rounded-xl bg-zinc-950/60 border border-white/5 p-3">
                            <span className="block text-violet-400 font-semibold mb-1 text-[11px] uppercase tracking-wide">RAM</span>
                            <span className="text-zinc-300">{reqs.ram_gb ? `${reqs.ram_gb} GB` : "N/A"}</span>
                          </div>
                          <div className="rounded-xl bg-zinc-950/60 border border-white/5 p-3">
                            <span className="block text-violet-400 font-semibold mb-1 text-[11px] uppercase tracking-wide">GPU</span>
                            <span className="text-zinc-300">{reqs.gpu || "N/A"}</span>
                          </div>
                          <div className="rounded-xl bg-zinc-950/60 border border-white/5 p-3 col-span-2">
                            <span className="block text-violet-400 font-semibold mb-1 text-[11px] uppercase tracking-wide">Storage</span>
                            <span className="text-zinc-300">{reqs.storage_gb ? `${reqs.storage_gb} GB available` : "N/A"}</span>
                          </div>
                        </>
                      );
                    } catch {
                      return <pre className="col-span-2 whitespace-pre-wrap text-zinc-400 text-xs">{g.systemRequirements as string}</pre>;
                    }
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* ——— RIGHT: Sticky Purchase Sidebar ——— */}
          <div className="lg:sticky lg:top-5 space-y-4">

            {/* Rating summary card */}
            {reviewItems.filter((r: any) => !r.parentId && r.rating).length > 0 && (
              <div className="rounded-2xl border border-white/5 bg-zinc-900/60 backdrop-blur p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl font-black text-white">
                    {g.avgRating ? Number(g.avgRating).toFixed(1) : "—"}
                  </span>
                  <div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`size-4 ${s <= Math.round(Number(g.avgRating || 0)) ? "fill-yellow-400 text-yellow-400" : "fill-zinc-700 text-zinc-700"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {g.reviewCount} {locale === "vi" ? "đánh giá" : "reviews"}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {ratingDist.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500 w-3 text-right">{star}</span>
                      <Star className="size-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full transition-all"
                          style={{ width: `${(count / maxRatingCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-zinc-600 w-4 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase card */}
            <div className="rounded-2xl border border-white/5 bg-zinc-900/80 backdrop-blur p-5 space-y-4">
              <div>
                {discountPct > 0 && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-green-500 text-white text-xs font-black px-2 py-0.5 rounded-md">
                      -{discountPct}%
                    </span>
                    <span className="text-zinc-500 text-sm line-through">
                      {formatPrice(originalPrice, g.currency as string)}
                    </span>
                  </div>
                )}
                <p className="text-3xl font-black text-white">{formatPrice(price, g.currency as string)}</p>
              </div>
              {!isAdmin && (
                <>
                  {g.status === "Archived" ? (
                    <Button className="w-full bg-zinc-800 text-zinc-400 cursor-not-allowed h-11" disabled>
                      {locale === "vi" ? "Sắp ra mắt" : "Coming Soon"}
                    </Button>
                  ) : g.isOwned ? (
                    <Button className="w-full bg-zinc-800 text-zinc-400 cursor-not-allowed h-11" disabled>
                      <CheckCircle className="size-4 mr-2" />
                      {t("owned") || "Owned"}
                    </Button>
                  ) : (
                    <Button 
                      className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold h-11 text-base shadow-lg shadow-violet-900/40 transition" 
                      onClick={() => {
                        if (price > 0) {
                          setShowConfirmBuy(true);
                        } else {
                          buy();
                        }
                      }}
                    >
                      {price === 0 
                        ? (locale === "vi" ? "Thêm vào thư viện (Miễn phí)" : "Add to Library (Free)") 
                        : (t("buy") || "Buy Now")}
                    </Button>
                  )}
                  <Button 
                    variant={isWishlisted ? "default" : "outline"} 
                    className={`w-full transition-all duration-300 ${isWishlisted ? "bg-rose-600 hover:bg-rose-500 text-white border-transparent" : ""}`} 
                    onClick={toggleWishlist}
                  >
                    {isWishlisted 
                      ? (locale === "vi" ? "❤️ Đã yêu thích" : "❤️ Wishlisted") 
                      : (locale === "vi" ? "🤍 Yêu thích" : "🤍 Add to Wishlist")}
                  </Button>
                </>
              )}
              {isAdmin && (
                <div className="text-sm text-zinc-400 bg-zinc-950/60 border border-white/5 rounded-xl p-3 text-center">
                  {locale === "vi" ? "Tài khoản quản trị viên không thể mua game" : "Administrator account cannot purchase games"}
                </div>
              )}
              {demo && (
                <p className="text-xs text-zinc-500 flex items-center gap-1.5 pt-1 border-t border-white/5">
                  <Gamepad2 className="size-3.5 text-violet-400 flex-shrink-0" />
                  {locale === "vi" ? "Game này có bản chơi thử WebGL miễn phí" : "Free WebGL demo available"}
                </p>
              )}
            </div>

            {/* Info metadata */}
            <div className="rounded-2xl border border-white/5 bg-zinc-900/30 backdrop-blur p-5">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                {locale === "vi" ? "Thông tin game" : "Game Info"}
              </p>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500 flex-shrink-0">{locale === "vi" ? "Nhà phát triển" : "Developer"}</span>
                  <span className="text-zinc-200 font-medium text-right">{g.developer as string}</span>
                </div>
                {g.publisher && g.publisher !== g.developer && (
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-500 flex-shrink-0">{locale === "vi" ? "Nhà phát hành" : "Publisher"}</span>
                    <span className="text-zinc-200 font-medium text-right">{g.publisher as string}</span>
                  </div>
                )}
                {g.releaseDate && (
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-500 flex-shrink-0">{locale === "vi" ? "Phát hành" : "Release Date"}</span>
                    <span className="text-zinc-200 font-medium text-right">{formatDate(g.releaseDate)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500 flex-shrink-0">{locale === "vi" ? "Lượt tải" : "Downloads"}</span>
                  <span className="text-zinc-200 font-medium text-right flex items-center gap-1">
                    <Download className="size-3.5 text-zinc-500" />
                    {(g.downloadCount as number ?? 0).toLocaleString()}
                  </span>
                </div>
                {g.minAge > 0 && (
                  <div className="flex justify-between gap-2">
                    <span className="text-zinc-500 flex-shrink-0">{locale === "vi" ? "Độ tuổi" : "Min Age"}</span>
                    <span className="text-zinc-200 font-medium bg-zinc-800 px-2 py-0.5 rounded text-xs">{g.minAge}+</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {((g.tags && g.tags.length > 0) || !!demo) && (
              <div className="rounded-2xl border border-white/5 bg-zinc-900/30 backdrop-blur p-5">
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.tags && g.tags.map((tag: string) => (
                    <span key={tag} className="inline-flex items-center rounded-lg bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-300 border border-zinc-700/50 hover:border-violet-500/50 hover:text-violet-300 transition-colors cursor-default select-none">
                      #{tag}
                    </span>
                  ))}
                  {demo && (
                    <span className="inline-flex items-center rounded-lg bg-violet-600/15 px-2.5 py-1 text-xs font-bold text-violet-300 border border-violet-500/30 cursor-default select-none">
                      #WebGL Demo
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ————— DEMO SECTION ————— */}
        {demo && (
          <div className="mt-8 rounded-2xl border border-white/5 bg-zinc-900/20 backdrop-blur p-6 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Gamepad2 className="size-5 text-violet-400" />
                {locale === "vi" ? "Chơi thử bản Demo (WebGL)" : "Play Game Demo (WebGL)"}
              </h2>
              {isPlayingDemo && (
                <Button variant="outline" size="sm" onClick={stopDemo}
                  className="text-xs bg-red-950/20 text-red-400 border-red-500/25 hover:bg-red-600 hover:text-white cursor-pointer">
                  {locale === "vi" ? "Dừng chơi thử" : "Stop Demo"}
                </Button>
              )}
            </div>
            {isPlayingDemo ? (
              <div className="w-full">
                <UnityWebGLPlayer buildUrl={demo.buildUrl} />
              </div>
            ) : (
              <div className="relative w-full aspect-[16/10] overflow-hidden rounded-xl border border-white/5 bg-zinc-950 flex flex-col items-center justify-center p-6 group shadow-lg">
                {images[0]?.url && (
                  <img src={resolveUrl(images[0].url)} alt="Demo background"
                    className="absolute inset-0 w-full h-full object-cover opacity-15 blur-[2px] transition duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
                <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                  <button type="button"
                    onClick={async () => { setIsPlayingDemo(true); await playDemo(); }}
                    className="size-16 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-900/40 transition duration-300 group-hover:scale-110 active:scale-95 cursor-pointer font-bold text-xl pl-1"
                  >▶</button>
                  <div>
                    <p className="font-semibold text-white text-lg">{locale === "vi" ? "Bắt đầu chơi thử" : "Start Demo"}</p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                      {locale === "vi" ? "Bản chơi thử chạy trực tiếp trên trình duyệt bằng WebGL" : "Play the WebGL demo directly in your browser"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ————— REVIEWS ————— */}
        <div className="mt-10 border-t border-white/5 pt-10">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <MessageSquare className="size-6 text-violet-400" />
            {locale === "vi" ? "Bình luận & Đánh giá" : "Comments & Reviews"} ({reviewItems.filter((r: any) => !r.parentId).length})
          </h2>

          <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
            <div className="space-y-4">
              {reviewItems.length === 0 ? (
                <p className="text-zinc-500 py-6 text-center border border-white/5 bg-zinc-900/10 rounded-xl">
                  {locale === "vi" ? "Chưa có bình luận nào. Hãy là người đầu tiên đóng góp ý kiến!" : "No reviews yet. Be the first to share your thoughts!"}
                </p>
              ) : (
                reviewItems
                  .filter((r: any) => !r.parentId)
                  .map((review: any) => {
                    const avatar = review.userAvatarUrl
                      ? (review.userAvatarUrl.startsWith("http") ? review.userAvatarUrl : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}${review.userAvatarUrl}`)
                      : null;
                    const isOwner = user?.id === review.userId;
                    const replies = reviewItems.filter((r: any) => r.parentId === review.id).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                    return (
                      <div id={`review-${review.id}`} key={review.id} className="rounded-2xl border border-white/5 bg-zinc-900/20 hover:bg-zinc-900/30 transition-colors p-5 backdrop-blur">
                        <div className="flex gap-4 justify-between items-start">
                          <div className="flex gap-4">
                            <Link href={`${prefix}/profile?id=${review.userId}`} className="cursor-pointer flex-shrink-0 group/avatar">
                              {avatar ? (<img src={avatar} crossOrigin="anonymous" alt={review.userName} className="size-10 rounded-full object-cover ring-1 ring-violet-500/20 group-hover/avatar:ring-violet-500/40 transition" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />) : (<UserCircle className="size-10 text-zinc-600 group-hover/avatar:text-violet-400 transition" />)}
                            </Link>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link href={`${prefix}/profile?id=${review.userId}`} className="font-semibold text-white text-sm hover:text-violet-400 hover:underline transition">{review.userName}</Link>
                                {review.userName.toLowerCase().includes("admin") && (<span className="inline-flex items-center rounded bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold text-violet-400 border border-violet-500/10 uppercase tracking-wider select-none">Admin</span>)}
                                {review.isVerifiedPurchase && (<span className="inline-flex items-center gap-1 rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-400 border border-green-500/10"><CheckCircle className="size-2.5" />{locale === "vi" ? "Đã mua game" : "Verified Purchase"}</span>)}
                                <span className="text-xs text-zinc-500">{formatDateTimeShort(review.createdAt)}</span>
                              </div>
                              {editingReviewId === review.id ? (
                                <form onSubmit={(e) => submitEditReview(e, review.id)} className="mt-3 flex flex-col gap-2">
                                  {review.parentId === null && (
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <button key={s} type="button" onClick={() => setEditingRating(editingRating === s ? null : s)} className="focus:outline-none">
                                          <Star className={`size-4 ${s <= (editingRating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-zinc-700"}`} />
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <textarea required value={editingComment} onChange={(e) => setEditingComment(e.target.value)} className="w-full rounded-lg border border-white/10 bg-zinc-950 p-2 text-sm text-zinc-300 outline-none focus:border-violet-500 h-20" />
                                  <div className="flex gap-2">
                                    <Button type="submit" size="sm" className="bg-violet-600 hover:bg-violet-500 text-white">{locale === "vi" ? "Lưu" : "Save"}</Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingReviewId(null)}>{locale === "vi" ? "Hủy" : "Cancel"}</Button>
                                  </div>
                                </form>
                              ) : (
                                <>
                                  {review.rating && (<div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((s) => (<Star key={s} className={`size-3.5 ${s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-zinc-700"}`} />))}</div>)}
                                  <p className="text-zinc-300 text-sm mt-2 leading-relaxed whitespace-pre-wrap">{renderCommentText(review.comment, review, replies)}</p>
                                  <div className="mt-3 flex items-center gap-3">
                                    <button onClick={() => { const show = replyingTo !== review.id; setReplyingTo(show ? review.id : null); setReplyComment(show ? `@${review.userName} ` : ""); }} className="text-xs font-medium text-zinc-400 hover:text-violet-400 transition">
                                      {locale === "vi" ? "Trả lời" : "Reply"}
                                    </button>
                                    {isOwner && (
                                      <button onClick={() => { setEditingReviewId(review.id); setEditingComment(review.comment); setEditingRating(review.rating || null); }} className="text-xs font-medium text-zinc-400 hover:text-violet-400 transition">
                                        {locale === "vi" ? "Chỉnh sửa" : "Edit"}
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          {(isOwner || isAdmin) && (<button onClick={() => deleteReview(review.id)} className="text-zinc-500 hover:text-red-400 p-1 transition"><Trash2 className="size-4" /></button>)}
                        </div>
                        {replies.length > 0 && (
                          <div className="mt-6 ml-4 sm:ml-6 pl-4 sm:pl-6 border-l border-white/10 space-y-4">
                            {replies.map((reply: any) => {
                              const repAvatar = reply.userAvatarUrl ? (reply.userAvatarUrl.startsWith("http") ? reply.userAvatarUrl : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}${reply.userAvatarUrl}`) : null;
                              const isRepOwner = user?.id === reply.userId;
                              const isRepAdmin = reply.userName.toLowerCase().includes("admin");
                              return (
                                <div id={`review-${reply.id}`} key={reply.id} className="relative bg-zinc-950/20 hover:bg-zinc-950/30 border border-white/5 rounded-xl p-4 transition-all group flex gap-3 justify-between items-start">
                                  <div className="flex gap-3">
                                    <Link href={`${prefix}/profile?id=${reply.userId}`} className="cursor-pointer flex-shrink-0 group/avatar">
                                      {repAvatar ? (<img src={repAvatar} alt={reply.userName} className="size-8 rounded-full object-cover ring-1 ring-violet-500/10 group-hover/avatar:ring-violet-500/30 transition" referrerPolicy="no-referrer" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />) : (<UserCircle className="size-8 text-zinc-600 group-hover/avatar:text-violet-400 transition" />)}
                                    </Link>
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Link href={`${prefix}/profile?id=${reply.userId}`} className="font-semibold text-white text-xs hover:text-violet-400 hover:underline transition">{reply.userName}</Link>
                                        {isRepAdmin && (<span className="inline-flex items-center rounded bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold text-violet-400 border border-violet-500/10 uppercase tracking-wider select-none">Admin</span>)}
                                        <span className="text-[10px] text-zinc-500">{formatDateTimeShort(reply.createdAt)}</span>
                                      </div>
                                      {editingReviewId === reply.id ? (
                                        <form onSubmit={(e) => submitEditReview(e, reply.id)} className="mt-2 flex flex-col gap-2">
                                          <textarea required value={editingComment} onChange={(e) => setEditingComment(e.target.value)} className="w-full rounded-lg border border-white/10 bg-zinc-950 p-2 text-sm text-zinc-300 outline-none focus:border-violet-500 h-20" />
                                          <div className="flex gap-2">
                                            <Button type="submit" size="sm" className="bg-violet-600 hover:bg-violet-500 text-white">{locale === "vi" ? "Lưu" : "Save"}</Button>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingReviewId(null)}>{locale === "vi" ? "Hủy" : "Cancel"}</Button>
                                          </div>
                                        </form>
                                      ) : (
                                        <>
                                          <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">{renderCommentText(reply.comment, review, replies)}</p>
                                          <div className="flex items-center gap-3 mt-1">
                                            <button onClick={() => { setReplyingTo(review.id); setReplyComment(`@${reply.userName} `); }} className="text-xs font-medium text-zinc-400 hover:text-violet-400 transition block">
                                              {locale === "vi" ? "Trả lời" : "Reply"}
                                            </button>
                                            {isRepOwner && (
                                              <button onClick={() => { setEditingReviewId(reply.id); setEditingComment(reply.comment); setEditingRating(null); }} className="text-xs font-medium text-zinc-400 hover:text-violet-400 transition block">
                                                {locale === "vi" ? "Chỉnh sửa" : "Edit"}
                                              </button>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {(isRepOwner || isAdmin) && (<button onClick={() => deleteReview(reply.id)} className="text-zinc-600 hover:text-red-400 p-1 transition opacity-0 group-hover:opacity-100"><Trash2 className="size-3.5" /></button>)}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {replyingTo === review.id && user && (
                          <div className="mt-4 ml-14">
                            <form onSubmit={(e) => submitReply(e, review.id)} className="flex flex-col gap-2">
                              <textarea required value={replyComment} onChange={(e) => setReplyComment(e.target.value)} placeholder={locale === "vi" ? "Viết phản hồi..." : "Write a reply..."} className="w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-300 outline-none focus:border-violet-500 h-20" />
                              <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>{locale === "vi" ? "Hủy" : "Cancel"}</Button>
                                <Button type="submit" size="sm" className="bg-violet-600 hover:bg-violet-500" disabled={submittingReply}>{submittingReply ? (locale === "vi" ? "Đang gửi..." : "Sending...") : (locale === "vi" ? "Gửi" : "Reply")}</Button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Write review */}
            <div>
              {user ? (
                <Card className="p-6 bg-zinc-900/50 backdrop-blur border-violet-500/10">
                  <h3 className="font-bold text-white text-lg mb-4">{locale === "vi" ? "Viết bình luận" : "Write a Review"}</h3>
                  <form onSubmit={submitReview} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400 font-medium block">{locale === "vi" ? "Đánh giá bằng sao (tùy chọn)" : "Rating stars (optional)"}</label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button key={s} type="button" onClick={() => setRating(rating === s ? null : s)} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(null)} className="focus:outline-none transition-transform active:scale-95">
                            <Star className={`size-6 transition ${s <= (hoverRating ?? rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-zinc-700 hover:text-zinc-500"}`} />
                          </button>
                        ))}
                        {rating && (<button type="button" onClick={() => setRating(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 ml-2">{locale === "vi" ? "Xóa" : "Clear"}</button>)}
                      </div>
                    </div>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={locale === "vi" ? "Nhập bình luận của bạn tại đây..." : "Type your comment here..."} className="w-full rounded-lg border border-white/5 bg-zinc-950 p-3 text-sm text-zinc-300 outline-none focus:border-violet-500 h-28" />
                    <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white" disabled={submittingReview}>
                      {submittingReview ? (locale === "vi" ? "Đang đăng..." : "Submitting...") : (locale === "vi" ? "Đăng bình luận" : "Post Comment")}
                    </Button>
                  </form>
                </Card>
              ) : (
                <Card className="p-6 bg-zinc-900/30 text-center border-dashed border-white/5 py-8">
                  <p className="text-zinc-500 text-sm">{locale === "vi" ? "Vui lòng đăng nhập để có thể viết đánh giá hoặc bình luận game này." : "Please log in to write a review or comment on this game."}</p>
                  <Button variant="outline" className="mt-4 w-full" onClick={() => router.push(`/${locale}/login`)}>{locale === "vi" ? "Đăng nhập ngay" : "Log In"}</Button>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {showConfirmBuy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-md space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">
                {locale === "vi" ? "Xác nhận mua game" : "Confirm Purchase"}
              </h3>
              <p className="text-sm text-zinc-400 mt-2">
                {locale === "vi" 
                  ? `Bạn có chắc chắn muốn mua tựa game "${g.title}" với giá ${formatPrice(price, g.currency as string)} không?`
                  : `Are you sure you want to purchase "${g.title}" for ${formatPrice(price, g.currency as string)}?`}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmBuy(false)}
                className="flex-grow rounded-xl border border-white/10 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2.5 font-bold transition text-sm cursor-pointer"
              >
                {locale === "vi" ? "Hủy bỏ" : "Cancel"}
              </button>
              <button
                onClick={() => {
                  setShowConfirmBuy(false);
                  buy();
                }}
                className="flex-grow rounded-xl bg-violet-600 hover:bg-violet-500 text-white py-2.5 font-bold transition text-sm shadow-lg shadow-violet-900/20 cursor-pointer"
              >
                {locale === "vi" ? "Xác nhận" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPay && orderId && (
        <QRPaymentModal orderId={orderId} onClose={() => setShowPay(false)} onSuccess={() => { setShowPay(false); router.push(`/${locale}/library`); }} />
      )}
    </div>
  );
}
