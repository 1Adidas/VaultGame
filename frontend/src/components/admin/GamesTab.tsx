"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useAdminStats, useCategories } from "@/hooks/useGames";
import { useAuthStore } from "@/lib/auth/store";
import { api, type ApiResponse } from "@/lib/api/client";
import { formatPrice, formatDate, formatDateTime, resolveImageUrl } from "@/lib/utils";
import { Button, Card, Input } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Gamepad2, ShoppingBag, Users as UsersIcon,
  DollarSign, HelpCircle, Upload, Trash2, Edit, CheckCircle2,
  XCircle, ToggleLeft, ToggleRight, Info, PlusCircle, Save, ExternalLink,
  Bot, AlertTriangle, BarChart3, TrendingUp, Clock, ArrowUpRight, Download, Settings,
  Sparkles, Globe, Loader2, Languages, Image as ImageIcon, Film, HardDrive,
  Package, CreditCard, Shield, RefreshCw
} from "lucide-react";
import { DropzoneFileInput } from "./DropzoneFileInput";
import { generateSlug } from "./adminUtils";

export default function GamesTab() {
  const locale = useLocale();
  const { data: categories } = useCategories();

  // Queries
  const { data: gamesList, refetch: refetchGames } = useQuery({
    queryKey: ["admin-games-list"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any[]>>("/admin/games");
      return data.data;
    }
  });

  const { data: tagsList } = useQuery({
    queryKey: ["admin-tags-list"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any[]>>("/games/tags");
      return data.data;
    }
  });

  // Editor states
  const [editingGame, setEditingGame] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedGameForUpload, setSelectedGameForUpload] = useState<any | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [titleZh, setTitleZh] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionZh, setDescriptionZh] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [shortDescriptionEn, setShortDescriptionEn] = useState("");
  const [shortDescriptionZh, setShortDescriptionZh] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [activeLangTab, setActiveLangTab] = useState<"vi" | "en" | "zh">("vi");
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(true);
  const [multilangViewMode, setMultilangViewMode] = useState<"columns" | "tabs">("columns");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [developer, setDeveloper] = useState("");
  const [publisher, setPublisher] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [price, setPrice] = useState(0);
  const [discountPrice, setDiscountPrice] = useState<number | undefined>(undefined);
  const [minAge, setMinAge] = useState(0);
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState("Draft");

  // Requirements
  const [os, setOs] = useState("");
  const [cpu, setCpu] = useState("");
  const [ram, setRam] = useState("");
  const [gpu, setGpu] = useState("");
  const [storage, setStorage] = useState("");

  // Selected Tags
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Upload fields - separate per asset type
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [assetFiles, setAssetFiles] = useState<{
    image: File | null;
    screenshots: File[];
    trailer: File | null;
    demo: File | null;
    installer: File | null;
  }>({ image: null, screenshots: [], trailer: null, demo: null, installer: null });

  // Direct asset upload state during Create/Edit
  const [isSubmittingGame, setIsSubmittingGame] = useState(false);
  const [submittingProgress, setSubmittingProgress] = useState("");
  const [newGameAssets, setNewGameAssets] = useState<{
    cover: File | null;
    screenshots: File[];
    trailer: File | null;
    demo: File | null;
    installer: File | null;
  }>({ cover: null, screenshots: [], trailer: null, demo: null, installer: null });

  const openUploadModal = (g: any) => {
    setSelectedGameForUpload(g);
    setAssetFiles({ image: null, screenshots: [], trailer: null, demo: null, installer: null });
    api.get(`/admin/games/${g.id}`).then((res) => {
      const fullGame = res.data.data;
      const primaryImage = fullGame.images?.find((i: any) => i.isPrimary) || fullGame.images?.[0];
      const screenshots = fullGame.images?.filter((i: any) => !i.isPrimary && i.id !== primaryImage?.id) || [];
      setSelectedGameForUpload((prev: any) => {
        if (!prev || prev.id !== g.id) return prev;
        return {
          ...prev,
          ...fullGame,
          hasCover: !!primaryImage?.url,
          coverUrl: primaryImage?.url,
          screenshots: screenshots,
          hasTrailer: g.hasTrailer ?? (fullGame.videos && fullGame.videos.length > 0),
          hasDemo: g.hasDemo ?? (fullGame.demo != null),
          hasFile: fullGame.hasFile ?? g.hasFile,
        };
      });
    }).catch((err) => console.error("Failed to load game assets for modal:", err));
  };

  const startEdit = (g: any) => {
    // Load full details via admin endpoint (works for any status)
    api.get(`/admin/games/${g.id}`).then((res) => {
      const fullGame = res.data.data;
      const primaryImage = fullGame.images?.find((i: any) => i.isPrimary) || fullGame.images?.[0];
      const screenshots = fullGame.images?.filter((i: any) => !i.isPrimary && i.id !== primaryImage?.id) || [];
      setEditingGame({
        ...fullGame,
        hasCover: !!primaryImage?.url,
        hasTrailer: g.hasTrailer ?? (fullGame.videos && fullGame.videos.length > 0),
        hasDemo: g.hasDemo ?? (fullGame.demo != null),
        hasFile: fullGame.hasFile ?? g.hasFile,
        coverUrl: primaryImage?.url,
        screenshots: screenshots,
        trailerUrl: fullGame.videos?.[0]?.url,
        demoUrl: fullGame.demo?.buildUrl,
      });
      setIsCreating(false);
      setNewGameAssets({ cover: null, screenshots: [], trailer: null, demo: null, installer: null });

      setTitle(fullGame.title || "");
      setTitleEn(fullGame.titleEn || "");
      setTitleZh(fullGame.titleZh || "");
      setSlug(fullGame.slug || "");
      setDescription(fullGame.description || "");
      setDescriptionEn(fullGame.descriptionEn || "");
      setDescriptionZh(fullGame.descriptionZh || "");
      setShortDescription(fullGame.shortDescription || "");
      setShortDescriptionEn(fullGame.shortDescriptionEn || "");
      setShortDescriptionZh(fullGame.shortDescriptionZh || "");

      // Find Category IDs by names
      const categoryNames = fullGame.categoryName
        ? fullGame.categoryName.split(",").map((name: string) => name.trim())
        : [];
      const currentCategoryIds = (categories ?? [])
        .filter((c: any) => categoryNames.includes(c.name))
        .map((c: any) => c.id);
      setSelectedCategoryIds(currentCategoryIds);

      setDeveloper(fullGame.developer || "");
      setPublisher(fullGame.publisher || "");
      setReleaseDate(fullGame.releaseDate || "");
      setPrice(fullGame.price || 0);
      setDiscountPrice(fullGame.discountPrice ?? undefined);
      setMinAge(fullGame.minAge || 0);
      setIsFeatured(fullGame.isFeatured || false);
      setStatus(fullGame.status || "Draft");

      // Parse requirements
      try {
        const reqs = JSON.parse(fullGame.systemRequirements || "{}");
        setOs(reqs.os || "");
        setCpu(reqs.cpu || "");
        setRam(reqs.ram_gb?.toString() || "");
        setGpu(reqs.gpu || "");
        setStorage(reqs.storage_gb?.toString() || "");
      } catch {
        setOs(""); setCpu(""); setRam(""); setGpu(""); setStorage("");
      }

      // Map tags
      const currentTagIds = (tagsList ?? [])
        .filter((t: any) => fullGame.tags?.includes(t.name))
        .map((t: any) => t.id);
      setSelectedTagIds(currentTagIds);
    }).catch(() => {
      alert("Failed to load game details. Try again.");
    });
  };

  const startCreate = () => {
    setEditingGame(null);
    setIsCreating(true);
    setNewGameAssets({ cover: null, screenshots: [], trailer: null, demo: null, installer: null });

    setTitle(""); setTitleEn(""); setTitleZh(""); setSlug("");
    setDescription(""); setDescriptionEn(""); setDescriptionZh("");
    setShortDescription(""); setShortDescriptionEn(""); setShortDescriptionZh("");
    setSelectedCategoryIds([]);
    setDeveloper(""); setPublisher(""); setReleaseDate("");
    setPrice(0); setDiscountPrice(undefined); setMinAge(0);
    setIsFeatured(false); setStatus("Draft");
    setOs(""); setCpu(""); setRam(""); setGpu(""); setStorage("");
    setSelectedTagIds([]);
  };

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();

    const curTitleEn = titleEn || title;
    const curTitleZh = titleZh || title;
    let curDescEn = descriptionEn;
    let curDescZh = descriptionZh;
    let curShortEn = shortDescriptionEn;
    let curShortZh = shortDescriptionZh;

    // Auto-translate before save if fields are missing
    if (autoTranslateEnabled && (description.trim() || shortDescription.trim()) && (!curDescEn || !curDescZh || !curShortEn || !curShortZh)) {
      setSubmittingProgress("Đang tự động dịch mô tả game sang Tiếng Anh & Tiếng Trung...");
      try {
        const { data } = await api.post<ApiResponse<{
          vi: { title: string; description: string; shortDescription: string };
          en: { title: string; description: string; shortDescription: string };
          zh: { title: string; description: string; shortDescription: string };
        }>>("/admin/games/translate", {
          sourceLocale: "vi",
          title,
          description,
          shortDescription
        });
        if (data?.data) {
          const t = data.data;
          if (!curDescEn && t.en?.description) curDescEn = t.en.description;
          if (!curShortEn && t.en?.shortDescription) curShortEn = t.en.shortDescription;
          if (!curDescZh && t.zh?.description) curDescZh = t.zh.description;
          if (!curShortZh && t.zh?.shortDescription) curShortZh = t.zh.shortDescription;

          if (t.en?.description) setDescriptionEn(t.en.description);
          if (t.en?.shortDescription) setShortDescriptionEn(t.en.shortDescription);
          if (t.zh?.description) setDescriptionZh(t.zh.description);
          if (t.zh?.shortDescription) setShortDescriptionZh(t.zh.shortDescription);
        }
      } catch (err) {
        console.warn("Auto translate pre-save error:", err);
      }
    }

    const reqJson = JSON.stringify({
      os, cpu, ram_gb: ram ? parseInt(ram) : null, gpu, storage_gb: storage ? parseInt(storage) : null
    });

    const payload = {
      title, slug, description, shortDescription,
      titleEn: curTitleEn || null, descriptionEn: curDescEn || null, shortDescriptionEn: curShortEn || null,
      titleZh: curTitleZh || null, descriptionZh: curDescZh || null, shortDescriptionZh: curShortZh || null,
      categoryIds: selectedCategoryIds, developer, publisher: publisher || null,
      releaseDate: releaseDate || null, price, discountPrice: discountPrice || null,
      minAge, isFeatured, status: status || "Draft", systemRequirements: reqJson, tagIds: selectedTagIds
    };

    const MAX_GAME_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB
    if (newGameAssets.installer && newGameAssets.installer.size > MAX_GAME_FILE_SIZE) {
      alert(locale === "vi" 
        ? `Tệp cài đặt game "${newGameAssets.installer.name}" vượt quá dung lượng tối đa cho phép là 3GB!` 
        : `Game installer "${newGameAssets.installer.name}" exceeds 3GB limit!`);
      return;
    }
    if (newGameAssets.demo && newGameAssets.demo.size > MAX_GAME_FILE_SIZE) {
      alert(locale === "vi" 
        ? `Tệp demo WebGL "${newGameAssets.demo.name}" vượt quá dung lượng tối đa cho phép là 3GB!` 
        : `WebGL demo "${newGameAssets.demo.name}" exceeds 3GB limit!`);
      return;
    }

    setIsSubmittingGame(true);
    setSubmittingProgress("Đang lưu thông tin trò chơi...");

    try {
      let savedGameId: string | null = null;
      if (isCreating) {
        const res = await api.post<ApiResponse<any>>("/admin/games", payload);
        savedGameId = res?.data?.data?.id;
      } else {
        await api.put(`/admin/games/${editingGame.id}`, payload);
        savedGameId = editingGame.id;
      }

      // Upload selected game assets directly to Drive
      if (savedGameId) {
        if (newGameAssets.cover) {
          setSubmittingProgress("Đang tải ảnh bìa lên Google Drive...");
          const form = new FormData();
          form.append("file", newGameAssets.cover);
          form.append("type", "cover");
          await api.post(`/admin/games/${savedGameId}/upload`, form);
        }
        if (newGameAssets.screenshots && newGameAssets.screenshots.length > 0) {
          for (let s = 0; s < newGameAssets.screenshots.length; s++) {
            setSubmittingProgress(`Đang tải ảnh gameplay ${s + 1}/${newGameAssets.screenshots.length} lên Google Drive...`);
            const form = new FormData();
            form.append("file", newGameAssets.screenshots[s]);
            form.append("type", "screenshot");
            await api.post(`/admin/games/${savedGameId}/upload`, form);
          }
        }
        if (newGameAssets.trailer) {
          setSubmittingProgress("Đang tải video trailer lên Google Drive...");
          const form = new FormData();
          form.append("file", newGameAssets.trailer);
          form.append("type", "trailer");
          await api.post(`/admin/games/${savedGameId}/upload`, form);
        }
        if (newGameAssets.demo) {
          setSubmittingProgress("Đang xử lý & tải demo WebGL lên Google Drive...");
          const form = new FormData();
          form.append("file", newGameAssets.demo);
          form.append("type", "demo");
          await api.post(`/admin/games/${savedGameId}/upload`, form);
        }
        if (newGameAssets.installer) {
          setSubmittingProgress("Đang tải tệp cài đặt lên Google Drive...");
          const form = new FormData();
          form.append("file", newGameAssets.installer);
          form.append("type", "installer");
          await api.post(`/admin/games/${savedGameId}/upload`, form);
        }
      }

      alert(isCreating ? "Đã tạo trò chơi và tải lên tài nguyên thành công!" : "Đã lưu thông tin trò chơi và tài nguyên thành công!");
      setIsCreating(false);
      setEditingGame(null);
      setNewGameAssets({ cover: null, screenshots: [], trailer: null, demo: null, installer: null });
      refetchGames();
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || "Lỗi khi lưu trò chơi. Vui lòng đảm bảo Game Slug là duy nhất.";
      alert(`Lỗi: ${msg}`);
    } finally {
      setIsSubmittingGame(false);
      setSubmittingProgress("");
    }
  };

  const handleAutoTranslate = async (sourceLang: "vi" | "en" | "zh", silent = false) => {
    let srcTitle = "";
    let srcDesc = "";
    let srcShort = "";

    if (sourceLang === "vi") {
      srcTitle = title;
      srcDesc = description;
      srcShort = shortDescription;
    } else if (sourceLang === "en") {
      srcTitle = titleEn;
      srcDesc = descriptionEn;
      srcShort = shortDescriptionEn;
    } else if (sourceLang === "zh") {
      srcTitle = titleZh;
      srcDesc = descriptionZh;
      srcShort = shortDescriptionZh;
    }

    if (!srcDesc.trim() && !srcShort.trim()) {
      if (!silent) {
        alert("Vui lòng nhập mô tả ngắn hoặc mô tả chi tiết trước khi dịch tự động!");
      }
      return;
    }

    // Giữ nguyên tên game gốc không dịch thương hiệu
    if (srcTitle) {
      if (!title) setTitle(srcTitle);
      if (!titleEn) setTitleEn(srcTitle);
      if (!titleZh) setTitleZh(srcTitle);
    }

    if (sourceLang === "vi" && srcTitle && !slug) {
      setSlug(generateSlug(srcTitle));
    }

    setIsTranslating(true);
    try {
      const { data } = await api.post<ApiResponse<{
        vi: { title: string; description: string; shortDescription: string };
        en: { title: string; description: string; shortDescription: string };
        zh: { title: string; description: string; shortDescription: string };
      }>>("/admin/games/translate", {
        sourceLocale: sourceLang,
        title: srcTitle,
        description: srcDesc,
        shortDescription: srcShort
      });

      if (data?.data) {
        const t = data.data;
        // Điền chính xác vào từng khung ngôn ngữ tương ứng
        if (sourceLang !== "vi" && t.vi) {
          if (t.vi.description) setDescription(t.vi.description);
          if (t.vi.shortDescription) setShortDescription(t.vi.shortDescription);
        }
        if (sourceLang !== "en" && t.en) {
          if (t.en.description) setDescriptionEn(t.en.description);
          if (t.en.shortDescription) setShortDescriptionEn(t.en.shortDescription);
        }
        if (sourceLang !== "zh" && t.zh) {
          if (t.zh.description) setDescriptionZh(t.zh.description);
          if (t.zh.shortDescription) setShortDescriptionZh(t.zh.shortDescription);
        }

        if (!silent) {
          alert("Đã dịch tự động mô tả game thành công sang các ngôn ngữ còn lại!");
        }
      }
    } catch (err: any) {
      console.error("Auto-translate error:", err);
      if (!silent) {
        alert(`Lỗi dịch tự động: ${err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || "Không thể kết nối dịch vụ AI"}`);
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDeleteGame = async (id: string, gameTitle?: string) => {
    const confirmMsg = locale === "vi"
      ? `Bạn có chắc chắn muốn xóa vĩnh viễn tựa game "${gameTitle || id}" khỏi hệ thống không? Toàn bộ dữ liệu liên quan sẽ bị xóa sạch.`
      : locale === "zh"
      ? `您确定要从系统中彻底删除游戏 "${gameTitle || id}" 吗？所有关联数据将被永久删除。`
      : `Are you sure you want to permanently delete "${gameTitle || id}" from the system? All associated data will be removed.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.delete(`/admin/games/${id}`);
      refetchGames();
      alert(
        locale === "vi"
          ? "Đã xóa trò chơi thành công!"
          : locale === "zh"
          ? "游戏删除成功！"
          : "Game deleted successfully."
      );
    } catch (error: any) {
      console.error("Delete game error:", error);
      const errMsg = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || "Unknown error";
      alert(
        locale === "vi"
          ? `Lỗi khi xóa trò chơi: ${errMsg}`
          : locale === "zh"
          ? `删除游戏失败: ${errMsg}`
          : `Failed to delete game: ${errMsg}`
      );
    }
  };

  const handleUploadSingleAsset = async (type: "image" | "trailer" | "demo" | "installer") => {
    const file = assetFiles[type];
    if (!file || !selectedGameForUpload) {
      alert(locale === "vi" ? "Vui lòng chọn tệp trước khi bấm Tải lên!" : "Please select a file to upload first!");
      return;
    }

    const MAX_GAME_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB
    if (file.size > MAX_GAME_FILE_SIZE) {
      alert(locale === "vi" 
        ? `Tệp "${file.name}" vượt quá dung lượng tối đa cho phép là 3GB!` 
        : `File "${file.name}" exceeds the 3GB limit!`);
      return;
    }

    setUploadingType(type);
    const form = new FormData();
    form.append("file", file);
    form.append("type", type);

    try {
      const res = await api.post(`/admin/games/${selectedGameForUpload.id}/upload`, form);
      alert(locale === "vi" ? "Tải lên tài nguyên thành công!" : "Asset uploaded successfully!");
      
      // Clear file for this type
      setAssetFiles(prev => ({ ...prev, [type]: null }));

      // Sync local drawer state immediately
      setSelectedGameForUpload((prev: any) => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (type === "image") {
          updated.hasCover = true;
          if (res?.data?.data?.url) updated.coverUrl = res.data.data.url;
        } else if (type === "trailer") {
          updated.hasTrailer = true;
        } else if (type === "demo") {
          updated.hasDemo = true;
        } else if (type === "installer") {
          updated.hasFile = true;
        }
        return updated;
      });

      refetchGames();
    } catch (error: any) {
      console.error("Upload asset error:", error);
      const msg = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || "Lỗi tải tệp lên";
      alert(locale === "vi" ? `Lỗi tải lên tài nguyên: ${msg}` : `Error uploading asset: ${msg}`);
    } finally {
      setUploadingType(null);
    }
  };

  const handleUploadScreenshots = async () => {
    if (!assetFiles.screenshots || assetFiles.screenshots.length === 0 || !selectedGameForUpload) {
      alert(locale === "vi" ? "Vui lòng chọn ít nhất một ảnh gameplay!" : "Please select at least one gameplay screenshot!");
      return;
    }

    setUploadingType("screenshot");
    try {
      for (let i = 0; i < assetFiles.screenshots.length; i++) {
        const file = assetFiles.screenshots[i];
        const form = new FormData();
        form.append("file", file);
        form.append("type", "screenshot");
        await api.post(`/admin/games/${selectedGameForUpload.id}/upload`, form);
      }
      alert(locale === "vi" ? `Đã tải lên thành công ${assetFiles.screenshots.length} ảnh gameplay!` : `Successfully uploaded ${assetFiles.screenshots.length} screenshots!`);
      setAssetFiles(prev => ({ ...prev, screenshots: [] }));

      // Reload screenshots list for modal
      const res = await api.get(`/admin/games/${selectedGameForUpload.id}`);
      const fullGame = res.data.data;
      const primaryImage = fullGame.images?.find((i: any) => i.isPrimary) || fullGame.images?.[0];
      const screenshots = fullGame.images?.filter((i: any) => !i.isPrimary && i.id !== primaryImage?.id) || [];
      setSelectedGameForUpload((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          screenshots: screenshots,
        };
      });
      refetchGames();
    } catch (error: any) {
      console.error("Upload screenshots error:", error);
      const msg = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || "Lỗi tải ảnh";
      alert(locale === "vi" ? `Lỗi tải lên ảnh gameplay: ${msg}` : `Error uploading screenshots: ${msg}`);
    } finally {
      setUploadingType(null);
    }
  };

  const handleRemoveAsset = async (gameId: string, assetType: string, extraId?: string) => {
    const assetNames: Record<string, string> = {
      cover: locale === "vi" ? "ảnh bìa" : "cover image",
      trailer: locale === "vi" ? "trailer video" : "trailer video",
      demo: locale === "vi" ? "bản chơi thử WebGL" : "WebGL demo build",
      installer: locale === "vi" ? "tệp cài đặt game" : "installer files",
      screenshot: locale === "vi" ? "ảnh gameplay này" : "this gameplay screenshot"
    };

    const confirmMsg = locale === "vi"
      ? `Bạn có chắc chắn muốn gỡ bỏ hoàn toàn ${assetNames[assetType] || assetType} khỏi hệ thống và Google Drive?`
      : `Are you sure you want to completely remove ${assetNames[assetType] || assetType} from the system and Google Drive?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (assetType === "screenshot" && extraId) {
        await api.delete(`/admin/games/${gameId}/images/${extraId}`);
      } else {
        await api.delete(`/admin/games/${gameId}/${assetType}`);
      }
      alert(locale === "vi" ? "Gỡ bỏ thành công khỏi máy và Google Drive!" : "Asset removed successfully from server & Drive!");
      
      // Update editingGame if open
      setEditingGame((prev: any) => {
        if (!prev || prev.id !== gameId) return prev;
        const updated = { ...prev };
        if (assetType === "cover") {
          updated.hasCover = false;
          updated.coverUrl = null;
        } else if (assetType === "screenshot" && extraId) {
          updated.screenshots = (updated.screenshots || []).filter((s: any) => s.id !== extraId);
        } else if (assetType === "trailer") {
          updated.hasTrailer = false;
          updated.trailerUrl = null;
        } else if (assetType === "demo") {
          updated.hasDemo = false;
          updated.demoUrl = null;
        } else if (assetType === "installer") {
          updated.hasFile = false;
        }
        return updated;
      });

      // Update local drawer state so checklist and actions sync immediately
      setSelectedGameForUpload((prev: any) => {
        if (!prev || prev.id !== gameId) return prev;
        const updated = { ...prev };
        if (assetType === "cover") {
          updated.hasCover = false;
          updated.coverUrl = null;
        } else if (assetType === "trailer") {
          updated.hasTrailer = false;
        } else if (assetType === "demo") {
          updated.hasDemo = false;
        } else if (assetType === "installer") {
          updated.hasFile = false;
        }
        return updated;
      });

      refetchGames();
    } catch (error) {
      console.error(error);
      alert(locale === "vi" ? "Không thể gỡ bỏ tệp." : "Failed to remove asset.");
    }
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const games = gamesList ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Danh Mục Trò Chơi</h1>
          <p className="text-sm text-zinc-400 mt-1">Tạo mới, chỉnh sửa thông tin và quản lý tài nguyên game (ảnh bìa, trailer, bản chơi thử, file cài đặt).</p>
        </div>
        {!isCreating && !editingGame && (
          <Button onClick={startCreate} className="bg-violet-600 hover:bg-violet-500 text-white gap-2 font-medium">
            <PlusCircle className="size-4" />
            Thêm trò chơi mới
          </Button>
        )}
      </div>

      {/* Forms Area */}
      {(isCreating || editingGame) && (
        <Card className="p-6 bg-zinc-900/40 border-violet-500/10 backdrop-blur">
          <h2 className="text-xl font-bold text-white mb-6">
            {isCreating ? "Thêm Trò Chơi Mới" : `Chỉnh sửa trò chơi: ${editingGame.title}`}
          </h2>
          <form onSubmit={handleSaveGame} className="space-y-6">

            {/* Multilingual Content */}
            <div className="space-y-4 p-5 bg-[#0C1019] rounded-2xl border border-white/[0.08]">
              {/* Header & Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                    Nội dung đa ngôn ngữ
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Nhập tiếng Việt, AI sẽ tự động tạo bản dịch tiếng Anh và tiếng Trung tương ứng.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoTranslateEnabled}
                      onChange={(e) => setAutoTranslateEnabled(e.target.checked)}
                      className="accent-violet-500 rounded size-3.5 cursor-pointer"
                    />
                    <span>Tự động dịch khi nhập xong</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleAutoTranslate("vi", false)}
                    disabled={isTranslating}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-white/[0.08] hover:bg-white/[0.12] text-zinc-100 border border-white/[0.1] transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin text-zinc-400" />
                        <span>Đang dịch...</span>
                      </>
                    ) : (
                      <span>Dịch sang Tiếng Anh & Tiếng Trung</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Language Selector Segmented Control */}
              <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setActiveLangTab("vi")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeLangTab === "vi" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Tiếng Việt
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLangTab("en")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeLangTab === "en" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLangTab("zh")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      activeLangTab === "zh" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    中文
                  </button>
                </div>

                {/* View Mode Toggle */}
                <div className="hidden lg:flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setMultilangViewMode("columns")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      multilangViewMode === "columns" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    3 Cột
                  </button>
                  <button
                    type="button"
                    onClick={() => setMultilangViewMode("tabs")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      multilangViewMode === "tabs" ? "bg-white/[0.12] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Từng Tab
                  </button>
                </div>
              </div>

              {/* Active Tab View OR 3-Column View */}
              {multilangViewMode === "columns" ? (
                <div className="grid gap-4 lg:grid-cols-3">
                  {/* Column 1: Tiếng Việt */}
                  <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <span className="text-xs font-semibold text-zinc-200">Tiếng Việt</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Bản gốc</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-zinc-400 font-medium">Tên game (Title)</label>
                        <span className="text-[10px] text-zinc-500 italic">Giữ nguyên gốc</span>
                      </div>
                      <Input
                        required
                        value={title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTitle(val);
                          if (!titleEn || titleEn === title) setTitleEn(val);
                          if (!titleZh || titleZh === title) setTitleZh(val);
                          if (isCreating) {
                            setSlug(generateSlug(val));
                          }
                        }}
                        placeholder="Ví dụ: Survival On Earth"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400 font-medium">Mô tả ngắn</label>
                      <Input
                        value={shortDescription}
                        onChange={(e) => setShortDescription(e.target.value)}
                        onBlur={() => {
                          if (autoTranslateEnabled && shortDescription.trim() && (!shortDescriptionEn || !shortDescriptionZh)) {
                            handleAutoTranslate("vi", true);
                          }
                        }}
                        placeholder="Tóm tắt ngắn gọn hiển thị trên thẻ game..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400 font-medium">Mô tả chi tiết</label>
                      <textarea
                        required
                        className="w-full h-36 rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-200 outline-none focus:border-white/30"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={() => {
                          if (autoTranslateEnabled && description.trim() && (!descriptionEn || !descriptionZh)) {
                            handleAutoTranslate("vi", true);
                          }
                        }}
                        placeholder="Giới thiệu chi tiết cốt truyện, gameplay..."
                      />
                    </div>
                  </div>

                  {/* Column 2: English */}
                  <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <span className="text-xs font-semibold text-zinc-200">English</span>
                      <span className="text-[10px] text-zinc-500 font-mono">EN</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-zinc-400 font-medium">Title (EN)</label>
                        <span className="text-[10px] text-zinc-500 italic">Same brand name</span>
                      </div>
                      <Input
                        value={titleEn}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTitleEn(val);
                          if (!title) setTitle(val);
                          if (!titleZh) setTitleZh(val);
                        }}
                        placeholder="e.g. Survival On Earth"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400 font-medium">Short Description (EN)</label>
                      <Input
                        value={shortDescriptionEn}
                        onChange={(e) => setShortDescriptionEn(e.target.value)}
                        onBlur={() => {
                          if (autoTranslateEnabled && shortDescriptionEn.trim() && (!shortDescription || !shortDescriptionZh)) {
                            handleAutoTranslate("vi", true);
                          }
                        }}
                        placeholder="Brief summary for game cards..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400 font-medium">Description (EN)</label>
                      <textarea
                        className="w-full h-36 rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-200 outline-none focus:border-white/30"
                        value={descriptionEn}
                        onChange={(e) => setDescriptionEn(e.target.value)}
                        onBlur={() => {
                          if (autoTranslateEnabled && descriptionEn.trim() && (!description || !descriptionZh)) {
                            handleAutoTranslate("vi", true);
                          }
                        }}
                        placeholder="English narrative and gameplay details..."
                      />
                    </div>
                  </div>

                  {/* Column 3: Chinese */}
                  <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <span className="text-xs font-semibold text-zinc-200">中文</span>
                      <span className="text-[10px] text-zinc-500 font-mono">ZH</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-zinc-400 font-medium">游戏名称 (Title ZH)</label>
                        <span className="text-[10px] text-zinc-500 italic">保持原名称</span>
                      </div>
                      <Input
                        value={titleZh}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTitleZh(val);
                          if (!title) setTitle(val);
                          if (!titleEn) setTitleEn(val);
                        }}
                        placeholder="保持游戏原英文名，如：Survival On Earth"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400 font-medium">简短描述 (Short Description ZH)</label>
                      <Input
                        value={shortDescriptionZh}
                        onChange={(e) => setShortDescriptionZh(e.target.value)}
                        onBlur={() => {
                          if (autoTranslateEnabled && shortDescriptionZh.trim() && (!shortDescription || !shortDescriptionEn)) {
                            handleAutoTranslate("vi", true);
                          }
                        }}
                        placeholder="游戏卡片简要概览..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400 font-medium">详细描述 (Description ZH)</label>
                      <textarea
                        className="w-full h-36 rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-200 outline-none focus:border-white/30"
                        value={descriptionZh}
                        onChange={(e) => setDescriptionZh(e.target.value)}
                        onBlur={() => {
                          if (autoTranslateEnabled && descriptionZh.trim() && (!description || !descriptionEn)) {
                            handleAutoTranslate("vi", true);
                          }
                        }}
                        placeholder="中文游戏背景故事及玩法介绍..."
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Tabbed View */
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-4">
                  {activeLangTab === "vi" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <span className="text-xs font-semibold text-zinc-200">Tiếng Việt (Bản gốc)</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-zinc-400 font-medium">Tên game (Title)</label>
                          <span className="text-[10px] text-zinc-500 italic">Giữ nguyên gốc</span>
                        </div>
                        <Input
                          required
                          value={title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTitle(val);
                            if (!titleEn || titleEn === title) setTitleEn(val);
                            if (!titleZh || titleZh === title) setTitleZh(val);
                            if (isCreating) {
                              setSlug(generateSlug(val));
                            }
                          }}
                          placeholder="Ví dụ: Survival On Earth"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-medium">Mô tả ngắn</label>
                        <Input
                          value={shortDescription}
                          onChange={(e) => setShortDescription(e.target.value)}
                          onBlur={() => {
                            if (autoTranslateEnabled && shortDescription.trim() && (!shortDescriptionEn || !shortDescriptionZh)) {
                              handleAutoTranslate("vi", true);
                            }
                          }}
                          placeholder="Mô tả tóm tắt hiển thị trên card..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-medium">Mô tả chi tiết</label>
                        <textarea
                          required
                          className="w-full h-36 rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-200 outline-none focus:border-white/30"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          onBlur={() => {
                            if (autoTranslateEnabled && description.trim() && (!descriptionEn || !descriptionZh)) {
                              handleAutoTranslate("vi", true);
                            }
                          }}
                          placeholder="Mô tả chi tiết về thế giới game, cốt truyện..."
                        />
                      </div>
                    </div>
                  )}

                  {activeLangTab === "en" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <span className="text-xs font-semibold text-zinc-200">English (EN)</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-zinc-400 font-medium">Title (EN)</label>
                          <span className="text-[10px] text-zinc-500 italic">Same brand name</span>
                        </div>
                        <Input
                          value={titleEn}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTitleEn(val);
                            if (!title) setTitle(val);
                            if (!titleZh) setTitleZh(val);
                          }}
                          placeholder="English game title..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-medium">Short Description (EN)</label>
                        <Input
                          value={shortDescriptionEn}
                          onChange={(e) => setShortDescriptionEn(e.target.value)}
                          onBlur={() => {
                            if (autoTranslateEnabled && shortDescriptionEn.trim() && (!shortDescription || !shortDescriptionZh)) {
                              handleAutoTranslate("vi", true);
                            }
                          }}
                          placeholder="Summary in English..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400 font-medium">Description (EN)</label>
                        <textarea
                          className="w-full h-36 rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-200 outline-none focus:border-white/30"
                          value={descriptionEn}
                          onChange={(e) => setDescriptionEn(e.target.value)}
                          onBlur={() => {
                            if (autoTranslateEnabled && descriptionEn.trim() && (!description || !descriptionZh)) {
                              handleAutoTranslate("vi", true);
                            }
                          }}
                          placeholder="Full narrative in English..."
                        />
                      </div>
                    </div>
                  )}

                  {activeLangTab === "zh" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                        <span className="text-xs font-semibold text-zinc-200">中文 (ZH)</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-zinc-400">游戏名称 (Title ZH)</label>
                          <span className="text-[10px] text-zinc-500 italic">保持原名称</span>
                        </div>
                        <Input
                          value={titleZh}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTitleZh(val);
                            if (!title) setTitle(val);
                            if (!titleEn) setTitleEn(val);
                          }}
                          placeholder="保持游戏原英文名，如：Survival On Earth"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400">简短描述 (Short Description ZH)</label>
                        <Input
                          value={shortDescriptionZh}
                          onChange={(e) => setShortDescriptionZh(e.target.value)}
                          onBlur={() => {
                            if (autoTranslateEnabled && shortDescriptionZh.trim() && (!shortDescription || !shortDescriptionEn)) {
                              handleAutoTranslate("zh", true);
                            }
                          }}
                          placeholder="中文简短描述..."
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400">详细描述 (Description ZH)</label>
                        <textarea
                          className="w-full h-36 rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-300 outline-none focus:border-emerald-500"
                          value={descriptionZh}
                          onChange={(e) => setDescriptionZh(e.target.value)}
                          onBlur={() => {
                            if (autoTranslateEnabled && descriptionZh.trim() && (!description || !descriptionEn)) {
                              handleAutoTranslate("zh", true);
                            }
                          }}
                          placeholder="详细中文游戏介绍..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* General Metadata - Game Slug */}
            <div className="p-5 bg-zinc-950/60 rounded-2xl border border-white/5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <span>Đường dẫn URL (Game Slug)</span>
                    <span className="text-zinc-500">*</span>
                  </label>
                  <span className="text-[11px] text-zinc-500">Tự động sinh từ tên game, có thể tùy chỉnh</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs text-zinc-500 font-mono">
                    /game/
                  </div>
                  <Input
                    required
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                    placeholder="survival-on-earth"
                    className="pl-16 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-300 font-semibold">Chọn thể loại trò chơi</label>
              <div className="flex flex-wrap gap-2">
                {(categories ?? []).map((cat: any) => {
                  const selected = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${selected
                        ? "bg-violet-600 border-violet-500 text-white"
                        : "border-white/5 bg-zinc-950 text-zinc-400 hover:text-white"
                        }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Financials & Developer details */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Giá bán gốc (VNĐ)</label>
                <Input type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Giá khuyến mãi (VNĐ - Tùy chọn)</label>
                <Input type="number" value={discountPrice ?? ""} onChange={(e) => setDiscountPrice(e.target.value ? parseFloat(e.target.value) : undefined)} placeholder="Không có" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Nhà phát triển (Developer)</label>
                <Input required value={developer} onChange={(e) => setDeveloper(e.target.value)} placeholder="Tên studio hoặc cá nhân" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Nhà phát hành (Publisher - Tùy chọn)</label>
                <Input value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="Tên nhà phát hành" />
              </div>
            </div>

            {/* Limits & Flags */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Ngày phát hành (Release Date)</label>
                <Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="[color-scheme:dark]" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Độ tuổi tối thiểu (Tuổi)</label>
                <Input type="number" value={minAge} onChange={(e) => setMinAge(parseInt(e.target.value))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400">Trạng thái phát hành (Status)</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-9 rounded-md border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-200 outline-none focus:border-violet-500 cursor-pointer"
                >
                  <option value="Draft">Bản nháp (Draft)</option>
                  <option value="Published">Đã phát hành (Published)</option>
                  <option value="Archived">Lưu trữ (Archived)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 pt-6">
                <div className="flex items-center gap-2">
                  <input id="isFeatured" type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="size-4 rounded text-violet-600 bg-zinc-950 border-white/10 cursor-pointer" />
                  <label htmlFor="isFeatured" className="text-sm text-zinc-300 select-none cursor-pointer">Đánh dấu là Game Nổi Bật (Featured)</label>
                </div>
                {isFeatured && status !== "Published" && (
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Trò chơi cần ở trạng thái Đã phát hành (Published) để hiển thị tại mục nổi bật.
                  </p>
                )}
              </div>
            </div>

            {/* System Requirements */}
            <div className="p-4 bg-zinc-950/40 rounded-2xl border border-white/5 space-y-4">
              <h3 className="font-semibold text-violet-400 text-sm">Yêu Cầu Cấu Hình Hệ Thống (Khuyến nghị)</h3>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Hệ điều hành (OS)</label>
                  <Input value={os} onChange={(e) => setOs(e.target.value)} placeholder="Windows 10 / 11" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Vi xử lý (CPU)</label>
                  <Input value={cpu} onChange={(e) => setCpu(e.target.value)} placeholder="Intel Core i5 / AMD Ryzen 5" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Bộ nhớ RAM (GB)</label>
                  <Input type="number" value={ram} onChange={(e) => setRam(e.target.value)} placeholder="8" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Card đồ họa (GPU)</label>
                  <Input value={gpu} onChange={(e) => setGpu(e.target.value)} placeholder="NVIDIA GTX 1060" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-zinc-400">Ổ cứng trống (GB)</label>
                  <Input type="number" value={storage} onChange={(e) => setStorage(e.target.value)} placeholder="20" />
                </div>
              </div>
            </div>

            {/* Tags Selection */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-300 font-semibold">Chọn nhãn đính kèm (Tags)</label>
              <div className="flex flex-wrap gap-2">
                {(tagsList ?? []).map((tag: any) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${selected
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

            {/* Game Assets Section */}
            <div className="space-y-4 p-5 bg-[#0C1019] rounded-2xl border border-white/[0.08]">
              <div>
                <h4 className="text-sm font-semibold text-zinc-100 tracking-tight">
                  Tệp tài nguyên game
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Đính kèm tệp để tự động tải lên Google Drive ngay khi tạo hoặc lưu trò chơi. Xóa tệp sẽ đồng thời gỡ khỏi máy chủ và đám mây.
                </p>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Cover Image */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.14] transition space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">Ảnh bìa chính</span>
                      <span className="text-[10px] text-zinc-500 font-mono">JPG, PNG, WebP</span>
                    </div>

                    {/* Existing Cover Image Preview */}
                    {editingGame?.hasCover && editingGame?.coverUrl ? (
                      <div className="flex items-center justify-between gap-2.5 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={resolveImageUrl(editingGame.coverUrl)}
                            referrerPolicy="no-referrer"
                            alt={editingGame.title || "Ảnh bìa"}
                            className="size-9 rounded-md object-cover border border-white/10 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-[11px] font-medium text-emerald-400 block truncate">Đã có ảnh bìa</span>
                            <span className="text-[10px] text-zinc-500 block truncate">Google Drive</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(editingGame.id, "cover")}
                          className="text-[11px] font-medium text-red-400 hover:text-red-300 hover:underline shrink-0 cursor-pointer"
                        >
                          Gỡ bỏ
                        </button>
                      </div>
                    ) : (
                      <div className="py-1 text-[11px] text-zinc-500">
                        Chưa có ảnh bìa
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/[0.06]">
                    <span className="text-[10px] text-zinc-400 block mb-1.5">
                      {editingGame?.hasCover ? "Tải lên ảnh mới để thay thế:" : "Chọn ảnh từ máy tính:"}
                    </span>
                    <DropzoneFileInput
                      accept="image/*"
                      files={newGameAssets.cover}
                      formatHint="PNG, JPG, WebP"
                      onSelect={(files) => setNewGameAssets(prev => ({ ...prev, cover: files?.[0] || null }))}
                      onClear={() => setNewGameAssets(prev => ({ ...prev, cover: null }))}
                    />
                  </div>
                </div>

                {/* 2. Trailer Video */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.14] transition space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">Video trailer</span>
                      <span className="text-[10px] text-zinc-500 font-mono">MP4, WebM</span>
                    </div>

                    {/* Existing Trailer Video Info */}
                    {editingGame?.hasTrailer ? (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <div className="min-w-0">
                          <span className="text-[11px] font-medium text-emerald-400 block truncate">Đã có video trailer</span>
                          <span className="text-[10px] text-zinc-500 block truncate">Google Drive</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(editingGame.id, "trailer")}
                          className="text-[11px] font-medium text-red-400 hover:text-red-300 hover:underline shrink-0 cursor-pointer"
                        >
                          Gỡ bỏ
                        </button>
                      </div>
                    ) : (
                      <div className="py-1 text-[11px] text-zinc-500">
                        Chưa có trailer
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/[0.06]">
                    <span className="text-[10px] text-zinc-400 block mb-1.5">
                      {editingGame?.hasTrailer ? "Tải lên trailer mới để thay thế:" : "Chọn tệp từ máy tính:"}
                    </span>
                    <DropzoneFileInput
                      accept="video/mp4,video/webm"
                      files={newGameAssets.trailer}
                      formatHint="MP4, WebM (H.264)"
                      onSelect={(files) => setNewGameAssets(prev => ({ ...prev, trailer: files?.[0] || null }))}
                      onClear={() => setNewGameAssets(prev => ({ ...prev, trailer: null }))}
                    />
                  </div>
                </div>

                {/* 3. WebGL Demo */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.14] transition space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">Bản chơi thử WebGL</span>
                      <span className="text-[10px] text-zinc-500 font-mono">ZIP build</span>
                    </div>

                    {/* Existing Demo Build Info */}
                    {editingGame?.hasDemo ? (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <div className="min-w-0">
                          <span className="text-[11px] font-medium text-emerald-400 block truncate">Build WebGL sẵn sàng</span>
                          <span className="text-[10px] text-zinc-500 block truncate">Chơi thử trên web</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(editingGame.id, "demo")}
                          className="text-[11px] font-medium text-red-400 hover:text-red-300 hover:underline shrink-0 cursor-pointer"
                        >
                          Gỡ bỏ
                        </button>
                      </div>
                    ) : (
                      <div className="py-1 text-[11px] text-zinc-500">
                        Chưa có bản demo
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/[0.06]">
                    <span className="text-[10px] text-zinc-400 block mb-1.5">
                      {editingGame?.hasDemo ? "Tải lên build .zip mới để cập nhật:" : "Chọn tệp .zip từ máy tính:"}
                    </span>
                    <DropzoneFileInput
                      accept=".zip,application/zip"
                      files={newGameAssets.demo}
                      formatHint="ZIP build WebGL (Unity, Godot, HTML5 — Tối đa 3GB)"
                      onSelect={(files) => setNewGameAssets(prev => ({ ...prev, demo: files?.[0] || null }))}
                      onClear={() => setNewGameAssets(prev => ({ ...prev, demo: null }))}
                    />
                  </div>
                </div>

                {/* 4. Installer Package */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.14] transition space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200">Gói cài đặt game</span>
                      <span className="text-[10px] text-zinc-500 font-mono">EXE, ZIP (Tối đa 3GB)</span>
                    </div>

                    {/* Existing Installer Info */}
                    {editingGame?.hasFile ? (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                        <div className="min-w-0">
                          <span className="text-[11px] font-medium text-emerald-400 block truncate">Đã có gói cài đặt</span>
                          <span className="text-[10px] text-zinc-500 block truncate">Google Drive</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(editingGame.id, "installer")}
                          className="text-[11px] font-medium text-red-400 hover:text-red-300 hover:underline shrink-0 cursor-pointer"
                        >
                          Gỡ bỏ
                        </button>
                      </div>
                    ) : (
                      <div className="py-1 text-[11px] text-zinc-500">
                        Chưa có gói cài đặt
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/[0.06]">
                    <span className="text-[10px] text-zinc-400 block mb-1.5">
                      {editingGame?.hasFile ? "Tải lên bộ cài mới để thay thế:" : "Chọn tệp từ máy tính:"}
                    </span>
                    <DropzoneFileInput
                      accept=".zip,.exe,.rar,.7z"
                      files={newGameAssets.installer}
                      formatHint="EXE, ZIP, RAR, 7Z (Tối đa 3GB)"
                      onSelect={(files) => setNewGameAssets(prev => ({ ...prev, installer: files?.[0] || null }))}
                      onClear={() => setNewGameAssets(prev => ({ ...prev, installer: null }))}
                    />
                  </div>
                </div>
              </div>

              {/* 5. Steam-Style Gameplay Screenshots Gallery */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3 pt-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                  <div>
                    <h5 className="text-xs font-semibold text-zinc-200">
                      Bộ sưu tập ảnh Gameplay (Steam Gallery)
                    </h5>
                    <p className="text-[11px] text-zinc-500">
                      Hiển thị trong thanh trình chiếu ảnh khi người chơi xem chi tiết trò chơi. Bấm xem từng ảnh dạng carousel.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-white/[0.04] self-start sm:self-auto">
                    {editingGame?.screenshots?.length || 0} ảnh hiện có
                  </span>
                </div>

                {/* Existing Screenshots Grid */}
                {editingGame?.screenshots && editingGame.screenshots.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                    {editingGame.screenshots.map((s: any, idx: number) => (
                      <div
                        key={s.id || idx}
                        className="group relative aspect-video rounded-lg overflow-hidden border border-white/[0.08] bg-[#0E131E]"
                      >
                        <img
                          src={resolveImageUrl(s.url)}
                          referrerPolicy="no-referrer"
                          alt={`Gameplay ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveAsset(editingGame.id, "screenshot", s.id)}
                            className="px-2 py-1 rounded text-[10px] font-medium bg-red-600/90 hover:bg-red-600 text-white cursor-pointer transition shadow-md"
                          >
                            Gỡ ảnh
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new screenshots dropzone */}
                <div className="pt-2">
                  <span className="text-[10px] text-zinc-400 block mb-1.5">
                    Thêm ảnh chụp màn hình gameplay mới (có thể chọn nhiều ảnh cùng lúc):
                  </span>
                  <DropzoneFileInput
                    accept="image/*"
                    multiple={true}
                    files={newGameAssets.screenshots}
                    label="Nhấp hoặc kéo thả nhiều ảnh gameplay vào đây"
                    formatHint="PNG, JPG, WebP"
                    onSelect={(files) => {
                      if (!files) return;
                      const arr = Array.from(files);
                      setNewGameAssets(prev => ({
                        ...prev,
                        screenshots: [...prev.screenshots, ...arr],
                      }));
                    }}
                    onClear={() => setNewGameAssets(prev => ({ ...prev, screenshots: [] }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => { setIsCreating(false); setEditingGame(null); }}
                disabled={isSubmittingGame}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] transition active:scale-[0.98] cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmittingGame}
                className="px-5 py-2 rounded-xl text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 shadow-sm transition active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmittingGame ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-white" />
                    <span>{submittingProgress || "Đang xử lý..."}</span>
                  </>
                ) : (
                  <span>{isCreating ? "Tạo trò chơi & Tải tài nguyên" : "Lưu thông tin trò chơi"}</span>
                )}
              </button>
            </div>

          </form>
        </Card>
      )}

      {/* Dedicated Asset Upload Manager - macOS Media Inspector */}
      {selectedGameForUpload && (
        <Card className="p-6 bg-[#0E121B] border border-white/[0.08] backdrop-blur-xl shadow-2xl space-y-6 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Quản lý tài nguyên game
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Tải lên và đồng bộ từng tệp lưu trữ trên Google Drive cho tựa game:{" "}
                <span className="font-medium text-white">{selectedGameForUpload.title}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedGameForUpload(null)}
              className="self-start sm:self-auto px-4 py-1.5 rounded-full text-xs font-medium text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition active:scale-[0.98] cursor-pointer"
            >
              Hoàn tất
            </button>
          </div>

          {/* 4 Separate Asset Upload Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            
            {/* 1. Cover Image */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Ảnh bìa</h4>
                    <p className="text-[11px] text-zinc-500 font-mono">JPG, PNG, WebP</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                    selectedGameForUpload.hasCover
                      ? "bg-white/[0.08] text-white/90 border border-white/[0.12]"
                      : "text-zinc-600 bg-white/[0.02] border border-white/[0.04]"
                  }`}>
                    {selectedGameForUpload.hasCover ? "Đã có tệp" : "Chưa có"}
                  </span>
                </div>

                {selectedGameForUpload.hasCover && selectedGameForUpload.coverUrl && (
                  <div className="relative w-full h-28 rounded-lg overflow-hidden border border-white/[0.08] my-2 group">
                    <img
                      src={resolveImageUrl(selectedGameForUpload.coverUrl)}
                      referrerPolicy="no-referrer"
                      alt="Cover preview"
                      className="size-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveAsset(selectedGameForUpload.id, "cover")}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-300 hover:text-white bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 transition cursor-pointer"
                      >
                        Gỡ bỏ ảnh bìa
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                <DropzoneFileInput
                  accept="image/png,image/jpeg,image/webp"
                  files={assetFiles.image}
                  formatHint="PNG, JPG, WebP"
                  onSelect={(files) => setAssetFiles(prev => ({ ...prev, image: files?.[0] ?? null }))}
                  onClear={() => setAssetFiles(prev => ({ ...prev, image: null }))}
                />
                <button
                  type="button"
                  onClick={() => handleUploadSingleAsset("image")}
                  disabled={uploadingType === "image" || !assetFiles.image}
                  className="w-full py-2 rounded-xl text-xs font-medium text-white bg-white/[0.1] hover:bg-white/[0.15] disabled:opacity-40 disabled:hover:bg-white/[0.1] border border-white/[0.08] transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploadingType === "image" ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Đang tải ảnh lên...</span>
                    </>
                  ) : (
                    <span>Tải lên ảnh bìa</span>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Video Trailer */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Video trailer</h4>
                    <p className="text-[11px] text-zinc-500 font-mono">MP4, WebM</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                    selectedGameForUpload.hasTrailer
                      ? "bg-white/[0.08] text-white/90 border border-white/[0.12]"
                      : "text-zinc-600 bg-white/[0.02] border border-white/[0.04]"
                  }`}>
                    {selectedGameForUpload.hasTrailer ? "Đã có tệp" : "Chưa có"}
                  </span>
                </div>

                {selectedGameForUpload.hasTrailer && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] my-2">
                    <span className="text-xs text-zinc-300">
                      Video trailer đã sẵn sàng
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAsset(selectedGameForUpload.id, "trailer")}
                      className="text-xs font-medium text-red-400 hover:text-red-300 px-2 py-1 rounded transition cursor-pointer"
                    >
                      Gỡ bỏ
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                <DropzoneFileInput
                  accept="video/mp4,video/webm"
                  files={assetFiles.trailer}
                  formatHint="MP4, WebM"
                  onSelect={(files) => setAssetFiles(prev => ({ ...prev, trailer: files?.[0] ?? null }))}
                  onClear={() => setAssetFiles(prev => ({ ...prev, trailer: null }))}
                />
                <button
                  type="button"
                  onClick={() => handleUploadSingleAsset("trailer")}
                  disabled={uploadingType === "trailer" || !assetFiles.trailer}
                  className="w-full py-2 rounded-xl text-xs font-medium text-white bg-white/[0.1] hover:bg-white/[0.15] disabled:opacity-40 disabled:hover:bg-white/[0.1] border border-white/[0.08] transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploadingType === "trailer" ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Đang tải video lên...</span>
                    </>
                  ) : (
                    <span>Tải lên trailer</span>
                  )}
                </button>
              </div>
            </div>

            {/* 3. Unity WebGL Demo */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Bản chơi thử WebGL</h4>
                    <p className="text-[11px] text-zinc-500 font-mono">ZIP build WebGL (Unity, Godot, HTML5 — index.html hoặc *.html)</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                    selectedGameForUpload.hasDemo
                      ? "bg-white/[0.08] text-white/90 border border-white/[0.12]"
                      : "text-zinc-600 bg-white/[0.02] border border-white/[0.04]"
                  }`}>
                    {selectedGameForUpload.hasDemo ? "Đã có tệp" : "Chưa có"}
                  </span>
                </div>

                {selectedGameForUpload.hasDemo && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] my-2">
                    <span className="text-xs text-zinc-300">
                      WebGL Demo sẵn sàng để chơi thử
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAsset(selectedGameForUpload.id, "demo")}
                      className="text-xs font-medium text-red-400 hover:text-red-300 px-2 py-1 rounded transition cursor-pointer"
                    >
                      Gỡ bỏ
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-zinc-400 mt-1">
                  Hệ thống tự động giải nén file .zip và cấu hình để khách hàng chơi thử ngay trên trình duyệt.
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                <DropzoneFileInput
                  accept=".zip"
                  files={assetFiles.demo}
                  formatHint="ZIP build WebGL (Tối đa 3GB)"
                  onSelect={(files) => setAssetFiles(prev => ({ ...prev, demo: files?.[0] ?? null }))}
                  onClear={() => setAssetFiles(prev => ({ ...prev, demo: null }))}
                />
                <button
                  type="button"
                  onClick={() => handleUploadSingleAsset("demo")}
                  disabled={uploadingType === "demo" || !assetFiles.demo}
                  className="w-full py-2 rounded-xl text-xs font-medium text-white bg-white/[0.1] hover:bg-white/[0.15] disabled:opacity-40 disabled:hover:bg-white/[0.1] border border-white/[0.08] transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploadingType === "demo" ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Đang tải và giải nén demo...</span>
                    </>
                  ) : (
                    <span>Tải lên WebGL demo</span>
                  )}
                </button>
              </div>
            </div>

            {/* 4. Game Installer */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Gói cài đặt game</h4>
                    <p className="text-[11px] text-zinc-500 font-mono">ZIP, EXE, RAR, 7Z, MSI (Tối đa 3GB)</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                    selectedGameForUpload.hasFile
                      ? "bg-white/[0.08] text-white/90 border border-white/[0.12]"
                      : "text-zinc-600 bg-white/[0.02] border border-white/[0.04]"
                  }`}>
                    {selectedGameForUpload.hasFile ? "Đã có tệp" : "Chưa có"}
                  </span>
                </div>

                {selectedGameForUpload.hasFile && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] my-2">
                    <span className="text-xs text-zinc-300">
                      Gói cài đặt đã sẵn sàng tải về
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAsset(selectedGameForUpload.id, "installer")}
                      className="text-xs font-medium text-red-400 hover:text-red-300 px-2 py-1 rounded transition cursor-pointer"
                    >
                      Gỡ bỏ
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-zinc-400 mt-1">
                  Khách hàng mua game thành công sẽ được mở khóa tải về tệp này trong Thư viện cá nhân.
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                <DropzoneFileInput
                  accept=".zip,.exe,.rar,.7z,.msi"
                  files={assetFiles.installer}
                  formatHint="EXE, ZIP, RAR, 7Z (Tối đa 3GB)"
                  onSelect={(files) => setAssetFiles(prev => ({ ...prev, installer: files?.[0] ?? null }))}
                  onClear={() => setAssetFiles(prev => ({ ...prev, installer: null }))}
                />
                <button
                  type="button"
                  onClick={() => handleUploadSingleAsset("installer")}
                  disabled={uploadingType === "installer" || !assetFiles.installer}
                  className="w-full py-2 rounded-xl text-xs font-medium text-white bg-white/[0.1] hover:bg-white/[0.15] disabled:opacity-40 disabled:hover:bg-white/[0.1] border border-white/[0.08] transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploadingType === "installer" ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Đang tải file cài đặt...</span>
                    </>
                  ) : (
                    <span>Tải lên gói cài đặt</span>
                  )}
                </button>
              </div>
            </div>

            {/* 5. Gameplay Screenshots (Steam Gallery) */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-4 md:col-span-2">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5 mb-3">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">
                      Bộ sưu tập ảnh Gameplay (Steam Gallery)
                    </h4>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      PNG, JPG, WebP - Cho phép tải lên nhiều ảnh gameplay để tạo thanh trượt chuyển ảnh và dải thumbnail như Steam
                    </p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                    selectedGameForUpload.screenshots && selectedGameForUpload.screenshots.length > 0
                      ? "bg-white/[0.08] text-white/90 border border-white/[0.12]"
                      : "text-zinc-600 bg-white/[0.02] border border-white/[0.04]"
                  }`}>
                    {selectedGameForUpload.screenshots?.length || 0} ảnh hiện có
                  </span>
                </div>

                {/* Existing Screenshots Grid */}
                {selectedGameForUpload.screenshots && selectedGameForUpload.screenshots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pb-2">
                    {selectedGameForUpload.screenshots.map((s: any, idx: number) => (
                      <div
                        key={s.id || idx}
                        className="group relative aspect-video rounded-lg overflow-hidden border border-white/[0.08] bg-[#0E131E]"
                      >
                        <img
                          src={resolveImageUrl(s.url)}
                          referrerPolicy="no-referrer"
                          alt={`Gameplay ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveAsset(selectedGameForUpload.id, "screenshot", s.id)}
                            className="px-2 py-1 rounded text-[10px] font-medium bg-red-600/90 hover:bg-red-600 text-white cursor-pointer transition shadow-md"
                          >
                            Gỡ ảnh
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-dashed border-white/[0.06] text-center text-xs text-zinc-500 mb-2">
                    Chưa có ảnh gameplay nào. Hãy chọn nhiều ảnh chụp trò chơi bên dưới để tạo thanh trượt ảnh giống Steam!
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                <DropzoneFileInput
                  accept="image/png,image/jpeg,image/webp"
                  multiple={true}
                  files={assetFiles.screenshots}
                  label="Nhấp hoặc kéo thả nhiều ảnh gameplay vào đây (chọn nhiều ảnh cùng lúc)"
                  formatHint="PNG, JPG, WebP"
                  onSelect={(files) => {
                    if (!files) return;
                    const arr = Array.from(files);
                    setAssetFiles(prev => ({ ...prev, screenshots: [...prev.screenshots, ...arr] }));
                  }}
                  onClear={() => setAssetFiles(prev => ({ ...prev, screenshots: [] }))}
                />
                <button
                  type="button"
                  onClick={handleUploadScreenshots}
                  disabled={uploadingType === "screenshot" || !assetFiles.screenshots || assetFiles.screenshots.length === 0}
                  className="w-full py-2.5 rounded-xl text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 border border-violet-500/30 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/20"
                >
                  {uploadingType === "screenshot" ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Đang tải ảnh gameplay lên...</span>
                    </>
                  ) : (
                    <span>Tải lên {assetFiles.screenshots?.length ? `${assetFiles.screenshots.length} ảnh gameplay đã chọn` : "ảnh gameplay"}</span>
                  )}
                </button>
              </div>
            </div>

          </div>
        </Card>
      )}

      {/* Games Table List */}
      {!isCreating && !editingGame && !selectedGameForUpload && (
        <Card className="p-4 sm:p-6 bg-zinc-900/40 border-white/5 backdrop-blur">
          <div className="w-full overflow-x-auto scrollbar-thin pb-2">
            <table className="w-full min-w-[1020px] text-left text-sm text-zinc-400">
              <thead>
                <tr className="border-b border-white/5 text-zinc-500 font-semibold">
                  <th className="py-3 px-3 min-w-[220px]">Tên Trò Chơi</th>
                  <th className="py-3 px-3 whitespace-nowrap">Thể Loại</th>
                  <th className="py-3 px-3 whitespace-nowrap">Giá Bán</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">Lượt Tải</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">Chơi Thử</th>
                  <th className="py-3 px-2 text-center whitespace-nowrap">Yêu Thích</th>
                  <th className="py-3 px-3 whitespace-nowrap">Trạng Thái</th>
                  <th className="py-3 px-3 whitespace-nowrap">Tài Nguyên</th>
                  <th className="py-3 px-3 text-right whitespace-nowrap min-w-[140px]">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {games.map((g: any) => (
                  <tr key={g.id} className="hover:text-white transition group">
                    <td className="py-4 px-3 font-semibold text-zinc-200">
                      <div className="flex items-center gap-3">
                        {g.coverUrl ? (
                          <img
                            src={resolveImageUrl(g.coverUrl)}
                            referrerPolicy="no-referrer"
                            alt={g.title}
                            className="size-12 rounded-lg object-cover border border-white/10 flex-shrink-0"
                          />
                        ) : (
                          <div className="size-12 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center flex-shrink-0">
                            <Gamepad2 className="size-5 text-zinc-600" />
                          </div>
                        )}
                        <div className="min-w-[140px] max-w-[220px]">
                          <span className="font-semibold text-zinc-100 block truncate" title={g.title}>{g.title}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">{g.categoryName || "Chưa phân loại"}</td>
                    <td className="py-4 px-3 font-medium text-violet-300 whitespace-nowrap">{formatPrice(g.price, g.currency)}</td>
                    <td className="py-4 px-2 text-center">{g.downloadCount}</td>
                    <td className="py-4 px-2 text-center">{g.demoPlayCount || 0}</td>
                    <td className="py-4 px-2 text-center">{g.wishlistCount}</td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <select
                        value={g.status || "Draft"}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          try {
                            await api.patch(`/admin/games/${g.id}/status`, { status: newStatus });
                            refetchGames();
                          } catch (err: any) {
                            alert("Lỗi khi cập nhật trạng thái: " + (err?.response?.data?.error?.message || err?.response?.data?.message || err?.message));
                          }
                        }}
                        className={`text-xs font-medium px-3 py-1 rounded-full border outline-none cursor-pointer transition appearance-none text-center ${
                          g.status === "Published"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:border-emerald-500/40"
                            : g.status === "Draft"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/25 hover:border-amber-500/40"
                            : "bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        <option value="Draft" className="bg-[#18181b] text-amber-300">Bản nháp</option>
                        <option value="Published" className="bg-[#18181b] text-emerald-300">Đã phát hành</option>
                        <option value="Archived" className="bg-[#18181b] text-zinc-400">Lưu trữ</option>
                      </select>
                    </td>
                    <td className="py-4 px-3 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          { label: "Bìa", active: g.hasCover },
                          { label: "Trailer", active: g.hasTrailer },
                          { label: "Demo", active: g.hasDemo },
                          { label: "Bộ cài", active: g.hasFile },
                        ].map((res) => (
                          <span
                            key={res.label}
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors ${
                              res.active
                                ? "bg-white/[0.08] text-white/90 border border-white/[0.12]"
                                : "text-zinc-600 bg-white/[0.02] border border-white/[0.04]"
                            }`}
                          >
                            {res.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-3 text-right whitespace-nowrap min-w-[150px]">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition">
                        {g.status === "Published" ? (
                          <Link href={`/${locale}/game/${g.slug}`} target="_blank">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Xem trang game ngoài Store"
                              className="hover:bg-emerald-500/10 hover:text-emerald-400 p-2"
                            >
                              <ExternalLink className="size-4" />
                            </Button>
                          </Link>
                        ) : (
                          <Button variant="ghost" size="sm" className="p-2 opacity-30 cursor-not-allowed" disabled title="Chỉ xem được khi đã Published">
                            <ExternalLink className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openUploadModal(g)}
                          title="Tải lên tài nguyên (Ảnh bìa, Ảnh gameplay, Demo, Installer)"
                          className="hover:bg-violet-500/10 hover:text-violet-400 p-2"
                        >
                          <Upload className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(g)}
                          title="Chỉnh sửa thông tin"
                          className="hover:bg-violet-500/10 hover:text-violet-400 p-2"
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGame(g.id, g.title)}
                          title="Xóa trò chơi"
                          className="hover:bg-red-500/10 hover:text-red-400 p-2"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

