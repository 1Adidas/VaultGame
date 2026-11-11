"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth/store";
import { useToastStore } from "@/lib/toast/store";
import { Gamepad2, ArrowRight, ShieldCheck, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const isVi = locale === "vi";
  const isZh = locale === "zh";
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { success: toastSuccess, error: toastError } = useToastStore();

  const handleGoogleResponse = useCallback(async (response: any) => {
    try {
      await loginWithGoogle(response.credential, true);
      const user = useAuthStore.getState().user;
      if (user) {
        const isAdmin = user.roles.includes("Admin");
        const msg = isAdmin
          ? (isVi
              ? `Đăng nhập quyền Quản trị thành công! Chào mừng trở lại, Admin ${user.fullName}! 🛠️`
              : isZh
                ? `管理员登录成功！欢迎回来，Admin ${user.fullName}！🛠️`
                : `Admin login successful! Welcome back, Admin ${user.fullName}! 🛠️`)
          : (isVi
              ? `Chào mừng bạn gia nhập Game Vault, ${user.fullName}! 🎉`
              : isZh
                ? `欢迎加入 Game Vault，${user.fullName}！🎉`
                : `Welcome to Game Vault, ${user.fullName}! 🎉`);
        toastSuccess(msg);
      }
      router.push(`/${locale}`);
    } catch (err: any) {
      console.error(err);
      toastError(err.response?.data?.error?.message || "Google registration failed");
    }
  }, [loginWithGoogle, locale, router, isVi, isZh, toastSuccess, toastError]);

  const envGoogleClientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim();
  const isGoogleAuthConfigured =
    Boolean(envGoogleClientId) && !/^your([_\s]|$)/i.test(envGoogleClientId);

  const isGoogleInitialized = useRef(false);

  const initGoogle = useCallback(() => {
    if (!isGoogleAuthConfigured) return;
    const google = (window as any).google;
    if (google && !isGoogleInitialized.current) {
      const buttonWidth = typeof window !== "undefined" ? Math.min(360, window.innerWidth - 64).toString() : "360";
      google.accounts.id.initialize({
        client_id: envGoogleClientId,
        callback: handleGoogleResponse,
      });
      const btnContainer = document.getElementById("google-signup-btn");
      if (btnContainer) {
        google.accounts.id.renderButton(
          btnContainer,
          { theme: "outline", size: "large", width: buttonWidth, text: "signup_with" }
        );
        isGoogleInitialized.current = true;
      }
    }
  }, [envGoogleClientId, isGoogleAuthConfigured, handleGoogleResponse]);

  useEffect(() => {
    if (isGoogleAuthConfigured && (window as any).google) {
      initGoogle();
    }
  }, [isGoogleAuthConfigured, initGoogle]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, fullName);
      toastSuccess(
        isVi
          ? "Đăng ký tài khoản thành công! Chào mừng bạn đến với Game Vault! 🚀"
          : isZh
            ? "账号注册成功！欢迎来到 Game Vault！🚀"
            : "Account registered successfully! Welcome to Game Vault! 🚀"
      );
      router.push(`/${locale}`);
    } catch (err: any) {
      console.error(err);
      toastError(
        err.response?.data?.error?.message ||
          (isVi
            ? "Đăng ký thất bại! Vui lòng kiểm tra lại thông tin."
            : isZh
              ? "注册失败！请检查输入的信息。"
              : "Registration failed! Please verify your information.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      {/* Google OAuth SDK Script */}
      {isGoogleAuthConfigured && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={initGoogle}
        />
      )}

      <div className="w-full max-w-md space-y-8">
        
        {/* Brand header */}
        <div className="text-center flex flex-col items-center space-y-3">
          <img src="/logo.png" alt="Game Vault Logo" className="size-20 object-contain drop-shadow-xl select-none" />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isVi ? "Tạo tài khoản" : isZh ? "注册账户" : "Create an account"}
          </h1>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/[0.08] bg-[#0E131E] p-7 sm:p-8 shadow-2xl space-y-6">
          <form onSubmit={submit} className="space-y-4">
            
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {isVi ? "Họ và tên" : isZh ? "姓名 / 昵称" : "Full Name"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder={isVi ? "Ví dụ: Nguyễn Văn A" : isZh ? "例如：张三" : "e.g. John Doe"}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#080B11] px-4 py-2.5 pl-10 text-xs sm:text-sm text-white placeholder:text-zinc-600 outline-none focus:border-white/30"
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {isVi ? "Địa chỉ Email" : isZh ? "电子邮箱" : "Email Address"}
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#080B11] px-4 py-2.5 pl-10 text-xs sm:text-sm text-white placeholder:text-zinc-600 outline-none focus:border-white/30"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                {isVi ? "Mật khẩu" : isZh ? "登录密码" : "Password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#080B11] px-4 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-white placeholder:text-zinc-600 outline-none focus:border-white/30"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 pt-0.5">
                {isVi ? "Tối thiểu 6 ký tự bảo mật." : isZh ? "密码至少需要 6 个字符。" : "Minimum 6 characters."}
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm cursor-pointer"
              >
                <span>{loading ? (isVi ? "Đang xử lý..." : isZh ? "正在注册..." : "Creating...") : (isVi ? "Đăng Ký Tài Khoản" : isZh ? "立即注册" : "Register")}</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </form>

          {isGoogleAuthConfigured && (
            <>
              {/* Divider */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/[0.08]" />
                </div>
                <span className="relative bg-[#0E131E] px-3 text-[10px] uppercase font-bold tracking-wider text-zinc-500 select-none">
                  {isVi ? "Hoặc" : isZh ? "或者" : "Or"}
                </span>
              </div>

              {/* Google OAuth container */}
              <div className="flex justify-center w-full min-h-[44px]">
                <div id="google-signup-btn" />
              </div>
            </>
          )}

          {/* Bottom Switch Link */}
          <div className="border-t border-white/[0.06] pt-5 text-center text-xs text-zinc-400">
            <span>{isVi ? "Đã có tài khoản Game Vault? " : isZh ? "已有 Game Vault 账号？" : "Already have an account? "}</span>
            <Link
              href={`/${locale}/login`}
              className="font-bold text-white hover:underline ml-1"
            >
              {isVi ? "Đăng nhập ngay" : isZh ? "立即登录" : "Sign in"}
            </Link>
          </div>
        </div>

        {/* Guarantees */}
        <div className="flex items-center justify-center gap-6 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-zinc-400" />
            <span>{isVi ? "Bảo mật tuyệt đối" : isZh ? "安全加密连接" : "Secure Authentication"}</span>
          </div>
          <span>•</span>
          <div>
            <span>{isVi ? "Bản quyền chính hãng" : isZh ? "正版数字授权" : "Genuine Licenses"}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
