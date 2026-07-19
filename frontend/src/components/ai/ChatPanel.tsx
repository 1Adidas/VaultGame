"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { api, type ApiResponse } from "@/lib/api/client";
import { Button, Input } from "@/components/ui/button";
import { GameCard, type GameListItem } from "@/components/game/GameCard";
import ReactMarkdown from "react-markdown";
import { useAuthStore } from "@/lib/auth/store";
import { Trash2, Plus, MessageSquare } from "lucide-react";
import { formatDateTimeShort, resolveImageUrl } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  games?: GameListItem[];
}

export function ChatPanel() {
  const t = useTranslations("ai");
  const locale = useLocale();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string>();
  const [loading, setLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [botAvatar, setBotAvatar] = useState("/uploads/ai/default-bot.png");
  const [sessions, setSessions] = useState<{ id: string; title: string; date: string }[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);

  const parseGames = (queryResultStr: string): GameListItem[] => {
    try {
      const rawRows = JSON.parse(queryResultStr);
      if (!Array.isArray(rawRows)) return [];
      return rawRows.map((r: any) => ({
        id: r.Id ?? r.id,
        title: r.Title ?? r.title,
        slug: r.Slug ?? r.slug,
        shortDescription: r.ShortDescription ?? r.shortDescription ?? "",
        price: r.Price ?? r.price ?? 0,
        discountPrice: r.DiscountPrice !== null ? (r.DiscountPrice ?? r.discountPrice) : undefined,
        currency: r.Currency ?? r.currency ?? "VND",
        avgRating: r.AvgRating ?? r.avgRating ?? 0,
        primaryImageUrl: r.PrimaryImageUrl ?? r.primaryImageUrl ?? undefined,
        categoryName: r.CategoryName ?? r.categoryName ?? "",
        hasDemo: r.HasDemo ?? r.hasDemo ?? false
      }));
    } catch (e) {
      console.error("Failed to parse games from history query result", e);
      return [];
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const { data } = await api.get<ApiResponse<any[]>>("/ai/history");
      if (data?.data) {
        setAllMessages(data.data);

        // Group by SessionId
        const grouped = data.data.reduce((acc: any, item: any) => {
          if (!acc[item.sessionId]) {
            acc[item.sessionId] = [];
          }
          acc[item.sessionId].push(item);
          return acc;
        }, {});

        const sessionList = Object.keys(grouped).map((sid) => {
          const msgs = grouped[sid];
          const userMsgs = msgs.filter((m: any) => m.role === "user");
          const title = userMsgs.length > 0
            ? userMsgs[userMsgs.length - 1].question
            : locale === "vi" ? "Cuộc hội thoại" : "Chat Session";

          const latestMsg = msgs[0];
          return {
            id: sid,
            title: title.length > 25 ? title.substring(0, 25) + "..." : title,
            date: formatDateTimeShort(latestMsg.createdAt),
            timestamp: new Date(latestMsg.createdAt).getTime()
          };
        });

        sessionList.sort((a, b) => b.timestamp - a.timestamp);
        setSessions(sessionList);
      }
    } catch (err) {
      console.error("Failed to load AI history", err);
    }
  };

  const loadSession = (sid: string) => {
    setSessionId(sid);
    const sessionMsgs = allMessages
      .filter((m: any) => m.sessionId === sid)
      .reverse();

    const formattedMsgs = sessionMsgs.map((m: any) => {
      let parsedGames: GameListItem[] | undefined = undefined;
      if (m.queryResult) {
        parsedGames = parseGames(m.queryResult);
      }
      return {
        role: m.role as "user" | "assistant",
        content: m.role === "user" ? m.question : m.answer,
        games: parsedGames && parsedGames.length > 0 ? parsedGames : undefined
      };
    });

    setMessages(formattedMsgs);
  };

  const deleteSession = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    const confirmMsg = locale === "vi" ? "Bạn có chắc muốn xóa phiên chat này không?" : "Are you sure you want to delete this chat session?";
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.delete(`/ai/history/${sid}`);
      if (sessionId === sid) {
        startNewChat();
      }
      fetchHistory();
    } catch (err) {
      console.error("Failed to delete session", err);
      alert(locale === "vi" ? "Xóa phiên chat thất bại" : "Failed to delete session");
    }
  };

  const startNewChat = () => {
    setSessionId(undefined);
    let welcomeContent = "";
    if (user) {
      if (user.roles.includes("Admin")) {
        welcomeContent = locale === "vi"
          ? `Xin chào Quản trị viên **${user.fullName}**! Rất vinh hạnh được hỗ trợ ngài quản trị hệ thống GameVault hôm nay. Ngài cần em tra cứu thông tin gì về hệ thống, thống kê doanh thu hay thông tin người dùng ạ?`
          : `Hello Administrator **${user.fullName}**! It is an honor to assist you in managing the GameVault system today. What system queries, revenue stats, or user details would you like me to find?`;
      } else {
        welcomeContent = locale === "vi"
          ? `Xin chào **${user.fullName}**! Chúc bạn có một ngày mua sắm game thật vui vẻ. Em là Trợ lý AI của GameVault, em hiểu về thư viện game đã mua, danh sách yêu thích và các bình luận của bạn. Bạn muốn em hỗ trợ gì hôm nay ạ?`
          : `Hello **${user.fullName}**! Have a great day shopping for games. I am GameVault's AI Assistant, and I am aware of your purchased library, wishlist, and reviews. How can I help you today?`;
      }
    } else {
      welcomeContent = locale === "vi"
        ? "Xin chào Khách quý! Chào mừng bạn đến với GameVault. Em là Trợ lý AI của cửa hàng. Bạn có thể hỏi em bất cứ điều gì về các tựa game, hoặc đăng nhập để em có thể xem thư viện game và cá nhân hóa gợi ý tốt nhất cho bạn nhé!"
        : "Hello Guest! Welcome to GameVault. I am the store's AI Assistant. You can ask me anything about the games, or log in so I can access your library and personalize recommendations for you!";
    }

    setMessages([
      {
        role: "assistant",
        content: welcomeContent,
      },
    ]);
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  // Load AI assistant avatar on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const { data } = await api.get<ApiResponse<{ avatarUrl: string }>>("/ai/settings");
        if (data?.data?.avatarUrl) {
          setBotAvatar(data.data.avatarUrl);
        }
      } catch (err) {
        console.error("Failed to load AI settings", err);
      }
    }
    loadSettings();
  }, []);

  const getAbsoluteUrl = (url: string) => {
    return resolveImageUrl(url);
  };

  // Set initial welcome message
  useEffect(() => {
    let welcomeContent = "";
    if (user) {
      if (user.roles.includes("Admin")) {
        welcomeContent = locale === "vi"
          ? `Xin chào Quản trị viên **${user.fullName}**! Rất vinh hạnh được hỗ trợ ngài quản trị hệ thống GameVault hôm nay. Ngài cần em tra cứu thông tin gì về hệ thống, thống kê doanh thu hay thông tin người dùng ạ?`
          : `Hello Administrator **${user.fullName}**! It is an honor to assist you in managing the GameVault system today. What system queries, revenue stats, or user details would you like me to find?`;
      } else {
        welcomeContent = locale === "vi"
          ? `Xin chào **${user.fullName}**! Chúc bạn có một ngày mua sắm game thật vui vẻ. Em là Trợ lý AI của GameVault, em hiểu về thư viện game đã mua, danh sách yêu thích và các bình luận của bạn. Bạn muốn em hỗ trợ gì hôm nay ạ?`
          : `Hello **${user.fullName}**! Have a great day shopping for games. I am GameVault's AI Assistant, and I am aware of your purchased library, wishlist, and reviews. How can I help you today?`;
      }
    } else {
      welcomeContent = locale === "vi"
        ? "Xin chào Khách quý! Chào mừng bạn đến với GameVault. Em là Trợ lý AI của cửa hàng. Bạn có thể hỏi em bất cứ điều gì về các tựa game, hoặc đăng nhập để em có thể xem thư viện game và cá nhân hóa gợi ý tốt nhất cho bạn nhé!"
        : "Hello Guest! Welcome to GameVault. I am the store's AI Assistant. You can ask me anything about the games, or log in so I can access your library and personalize recommendations for you!";
    }

    setMessages([
      {
        role: "assistant",
        content: welcomeContent,
      },
    ]);
  }, [locale, user]);

  const getSuggestions = () => {
    const base = [
      locale === "vi" ? "Game hành động nào hay nhất?" : "Which action game is the best?",
      locale === "vi" ? "Game nào dưới 200k?" : "Games under 200k?",
      locale === "vi" ? "Cách chơi thử game WebGL?" : "How to play WebGL demos?",
      locale === "vi" ? "Làm sao để tải game đã mua?" : "How to download purchased games?"
    ];
    if (user) {
      if (user.roles.includes("Admin")) {
        base.push(
          locale === "vi" ? "Thống kê hệ thống?" : "System statistics?"
        );
      } else {
        base.push(
          locale === "vi" ? "Tôi đã mua bao nhiêu game rồi?" : "How many games have I purchased?",
          locale === "vi" ? "Tôi đang wishlist game nào?" : "What's in my wishlist?",
          locale === "vi" ? "Xem các đánh giá tôi đã viết" : "Show reviews I wrote"
        );
      }
    }
    return base;
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim()) return;
    const question = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setLoading(true);
    try {
      const { data } = await api.post<
        ApiResponse<{ sessionId: string; answer: string; games?: GameListItem[] }>
      >("/ai/chat", {
        message: question,
        locale,
        sessionId,
      });
      setSessionId(data.data.sessionId);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.data.answer,
          games: data.data.games ?? undefined,
        },
      ]);
      fetchHistory();
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            locale === "vi"
              ? "Có lỗi xảy ra khi xử lý câu hỏi. Vui lòng thử lại."
              : "Error processing request. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[75vh] md:h-[85vh] w-full rounded-2xl border border-zinc-800 bg-zinc-950/40 overflow-hidden shadow-2xl backdrop-blur-xl relative">
      {/* Sidebar Backdrop for Mobile */}
      {user && showSidebarMobile && (
        <div
          className="absolute inset-0 z-30 bg-black/60 md:hidden backdrop-blur-sm transition-opacity duration-200"
          onClick={() => setShowSidebarMobile(false)}
        />
      )}

      {/* Sidebar - Sessions List */}
      {user && (
        <div className={`absolute inset-y-0 left-0 w-64 border-r border-zinc-800/80 bg-zinc-950 flex flex-col h-full shrink-0 transition-transform duration-200 z-40 md:relative md:translate-x-0 md:flex ${showSidebarMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
          {/* New Chat Button */}
          <div className="p-3 border-b border-zinc-800/80">
            <button
              onClick={() => { startNewChat(); setShowSidebarMobile(false); }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white py-2.5 px-4 text-xs font-semibold transition-all shadow-md hover:shadow-violet-900/30 cursor-pointer min-h-[40px]"
            >
              <Plus className="size-4" />
              {locale === "vi" ? "Cuộc hội thoại mới" : "New Chat"}
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <p className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              {locale === "vi" ? "Lịch sử trò chuyện" : "Chat History"}
            </p>
            {sessions.length === 0 ? (
              <p className="px-3 py-4 text-xs text-zinc-600 text-center italic">
                {locale === "vi" ? "Chưa có cuộc trò chuyện nào" : "No chat history"}
              </p>
            ) : (
              sessions.map((s) => {
                const isActive = sessionId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => { loadSession(s.id); setShowSidebarMobile(false); }}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium cursor-pointer transition-all border min-h-[44px] md:min-h-0 ${isActive
                      ? "bg-violet-600/10 text-violet-300 border-violet-500/20 font-semibold"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/40 border-transparent"
                      }`}
                  >
                    <div className="flex flex-col overflow-hidden w-full pr-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className={`size-3.5 shrink-0 ${isActive ? "text-violet-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                        <span className="truncate flex-1 font-semibold">{s.title}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-1 pl-[22px]">{s.date}</span>
                    </div>
                    <button
                      onClick={(e) => deleteSession(e, s.id)}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-0.5"
                      title={locale === "vi" ? "Xóa cuộc hội thoại" : "Delete session"}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-900/10 w-full">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-zinc-800/60 px-5 py-3 bg-zinc-900/20 min-h-[52px]">
          {user && (
            <button
              onClick={() => setShowSidebarMobile(!showSidebarMobile)}
              className="md:hidden text-zinc-400 hover:text-violet-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-center min-h-[40px] min-w-[40px]"
              title={locale === "vi" ? "Lịch sử chat" : "Chat history"}
            >
              <MessageSquare className="size-5" />
            </button>
          )}
          <h2 className="text-sm font-bold text-zinc-100 flex-1 truncate">{t("title")}</h2>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <img
                  src={getAbsoluteUrl(botAvatar)}
                  alt="AI Assistant"
                  className="w-8 h-8 rounded-full border border-zinc-700/50 object-cover shrink-0 mt-0.5"
                />
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user"
                  ? "bg-violet-700/60 text-white rounded-br-sm"
                  : "bg-zinc-800 text-zinc-100 rounded-bl-sm"
                  }`}
              >
                <ReactMarkdown
                  components={{
                    strong: ({ node, ...props }) => <strong className="font-bold text-violet-300" {...props} />,
                    p: ({ node, ...props }) => <p className="whitespace-pre-wrap mb-2 last:mb-0" {...props} />
                  }}
                >
                  {m.content}
                </ReactMarkdown>

                {m.games && m.games.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {m.games.map((g) => (
                      <GameCard key={g.id} game={g} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <img
                src={getAbsoluteUrl(botAvatar)}
                alt="AI Assistant"
                className="w-8 h-8 rounded-full border border-zinc-700/50 object-cover shrink-0 mt-0.5"
              />
              <div className="rounded-2xl rounded-bl-sm bg-zinc-800 px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Questions (FAQ) */}
        <div className="px-4 py-2.5 bg-zinc-950/20 border-t border-zinc-800/40 flex flex-col gap-1.5">
          <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
            {locale === "vi" ? "Gợi ý câu hỏi:" : "Suggested Questions:"}
          </p>
          <div className="flex overflow-x-auto gap-2 pb-1.5 w-full scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {getSuggestions().map((q) => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                className="shrink-0 rounded-full border border-zinc-800 px-3.5 py-2 text-[12px] md:text-[11px] text-zinc-400 hover:border-violet-500
                  hover:text-violet-300 transition-colors bg-zinc-950/40 hover:bg-zinc-900 min-h-[38px] md:min-h-0 flex items-center cursor-pointer select-none"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input bar */}
        <div className="border-t border-zinc-800/60 bg-zinc-950/20 px-4 py-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("placeholder")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                e.preventDefault();
                send();
              }
            }}
            disabled={loading}
            className="flex-1 bg-zinc-950/40 border-zinc-850 h-11"
          />
          <Button onClick={send} disabled={loading || !input.trim()} className="h-11 px-4 text-sm font-semibold cursor-pointer">
            {t("send")}
          </Button>
        </div>
      </div>
    </div>
  );
}
