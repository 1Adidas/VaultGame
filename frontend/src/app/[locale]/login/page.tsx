"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth/store";
import { useToastStore } from "@/lib/toast/store";
import { api } from "@/lib/api/client";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Gamepad2, X } from "lucide-react";

export default function LoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const isVi = locale === "vi";
  const isZh = locale === "zh";
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState(1);
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(8).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const rememberMeRef = useRef(rememberMe);
  useEffect(() => {
    rememberMeRef.current = rememberMe;
  }, [rememberMe]);

  const handleDigitChange = (index: number, value: string) => {
    const char = value.slice(-1).toUpperCase();
    if (char && !/^[A-Z0-9]$/.test(char)) return;

    const newDigits = [...codeDigits];
    newDigits[index] = char;
    setCodeDigits(newDigits);

    if (char && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!codeDigits[index] && index > 0) {
        const newDigits = [...codeDigits];
        newDigits[index - 1] = "";
        setCodeDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...codeDigits];
        newDigits[index] = "";
        setCodeDigits(newDigits);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim().toUpperCase().slice(0, 8);
    if (!/^[A-Z0-9]{1,8}$/.test(pastedData)) return;

    const newDigits = [...codeDigits];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setCodeDigits(newDigits);

    const focusIndex = Math.min(pastedData.length, 7);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError("");
    setForgotSuccess("");
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
      setForgotSuccess(
        isVi
          ? "Mã xác nhận đã được gửi đến email của bạn!"
          : isZh
            ? "重置验证码已发送至您的电子邮箱！"
            : "A reset code has been sent to your email!"
      );
      setForgotStep(2);
    } catch (err: any) {
      console.error(err);
      setForgotError(
        err.response?.data?.error?.message ||
          (isVi
            ? "Có lỗi xảy ra, vui lòng kiểm tra email!"
            : isZh
              ? "发生错误，请检查邮箱地址是否正确！"
              : "An error occurred, please verify your email!")
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = codeDigits.join("");
    if (code.length < 8) {
      setForgotError(
        isVi
          ? "Vui lòng nhập đầy đủ 8 ký tự!"
          : isZh
            ? "请输入完整的 8 位验证码！"
            : "Please enter all 8 characters!"
      );
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    setForgotSuccess("");
    try {
      await api.post("/auth/verify-reset-code", { email: forgotEmail, code });
      setForgotSuccess(
        isVi
          ? "Mã xác nhận hợp lệ!"
          : isZh
            ? "验证码验证成功！"
            : "Verification code is valid!"
      );
      setForgotStep(3);
    } catch (err: any) {
      console.error(err);
      setForgotError(
        err.response?.data?.error?.message ||
          (isVi
            ? "Mã xác nhận không hợp lệ hoặc đã hết hạn!"
            : isZh
              ? "验证码无效或已过期！"
              : "Invalid or expired reset code!")
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    const code = codeDigits.join("");
    setForgotLoading(true);
    setForgotError("");
    setForgotSuccess("");
    try {
      await api.post("/auth/reset-password", {
        token: `${forgotEmail}|${code}`,
        newPassword: newPassword.trim()
      });
      alert(
        isVi
          ? "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay."
          : isZh
            ? "重置密码成功！您现在可以使用新密码登录。"
            : "Password reset successfully! You can now log in."
      );
      setShowForgotModal(false);
      setForgotEmail("");
      setCodeDigits(Array(8).fill(""));
      setNewPassword("");
      setForgotStep(1);
    } catch (err: any) {
      console.error(err);
      setForgotError(
        err.response?.data?.error?.message ||
          (isVi
            ? "Có lỗi xảy ra khi đặt lại mật khẩu!"
            : isZh
              ? "重置密码失败，请稍后重试！"
              : "Failed to reset password!")
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleResponse = useCallback(async (response: any) => {
    try {
      await loginWithGoogle(response.credential, rememberMeRef.current);
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
              ? `Đăng nhập thành công! Chào mừng bạn quay trở lại, ${user.fullName}! 🎉`
              : isZh
                ? `登录成功！欢迎回来，${user.fullName}！🎉`
                : `Login successful! Welcome back, ${user.fullName}! 🎉`);
        useToastStore.getState().success(msg);
      }
      const destination = redirectUrl ? decodeURIComponent(redirectUrl) : `/${locale}`;
      const safeDestination = destination.startsWith("/") && !destination.startsWith("//") ? destination : `/${locale}`;
      router.push(safeDestination);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Google sign in failed");
    }
  }, [loginWithGoogle, locale, router, redirectUrl, isVi, isZh]);

  const isGoogleInitialized = useRef(false);

  const initGoogle = useCallback(() => {
    const google = (window as any).google;
    if (google && !isGoogleInitialized.current) {
      const buttonWidth = typeof window !== "undefined" ? Math.min(360, window.innerWidth - 64).toString() : "360";
      google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "395896003561-qamgn8n2ja2ijrfndj6947629fsaqacc.apps.googleusercontent.com",
        callback: handleGoogleResponse,
      });
      google.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        { theme: "outline", size: "large", width: buttonWidth }
      );
      isGoogleInitialized.current = true;
    }
  }, [handleGoogleResponse]);

  useEffect(() => {
    if ((window as any).google) {
      initGoogle();
    }
  }, [initGoogle]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password, rememberMe);
      const user = useAuthStore.getState().user;
      if (user) {
        const isAdmin = user.roles.includes("Admin");
        const msg = isAdmin
          ? (isVi ? `Đăng nhập quyền Quản trị thành công! Chào mừng trở lại, Admin ${user.fullName}! 🛠️` : isZh ? `管理员登录成功！欢迎回来，Admin ${user.fullName}！🛠️` : `Admin login successful! Welcome back, Admin ${user.fullName}! 🛠️`)
          : (isVi ? `Đăng nhập thành công! Chào mừng bạn quay trở lại, ${user.fullName}! 🎉` : isZh ? `登录成功！欢迎回来，${user.fullName}！🎉` : `Login successful! Welcome back, ${user.fullName}! 🎉`);
        useToastStore.getState().success(msg);
      }
      const destination = redirectUrl ? decodeURIComponent(redirectUrl) : `/${locale}`;
      const safeDestination = destination.startsWith("/") && !destination.startsWith("//") ? destination : `/${locale}`;
      router.push(safeDestination);
    } catch {
      setError(isVi ? "Tài khoản hoặc mật khẩu không chính xác." : isZh ? "账号或密码错误，请重试。" : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogle}
      />

      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md space-y-8">
          
          {/* Brand header */}
          <div className="text-center flex flex-col items-center space-y-3">
            <img src="/logo.png" alt="Game Vault Logo" className="size-20 object-contain drop-shadow-xl select-none" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isVi ? "Đăng nhập tài khoản" : isZh ? "登录账户" : "Sign in to your account"}
            </h1>
          </div>

          {/* Form Card */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0E131E] p-7 sm:p-8 shadow-2xl space-y-6">
            <form onSubmit={submit} className="space-y-4">
              
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
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-400 hover:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="size-4 rounded border-zinc-700 bg-zinc-900 text-white focus:ring-0 cursor-pointer"
                  />
                  <span>{isVi ? "Ghi nhớ đăng nhập" : isZh ? "记住我的登录状态" : "Remember me"}</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotStep(1);
                    setForgotEmail("");
                    setCodeDigits(Array(8).fill(""));
                    setNewPassword("");
                    setForgotError("");
                    setForgotSuccess("");
                  }}
                  className="font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  {isVi ? "Quên mật khẩu?" : isZh ? "忘记密码？" : "Forgot password?"}
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                  {error}
                </div>
              )}

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm"
                >
                  <span>{loading ? (isVi ? "Đang đăng nhập..." : isZh ? "正在登录..." : "Signing in...") : (isVi ? "Đăng Nhập" : isZh ? "立即登录" : "Sign In")}</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </form>

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
              <div id="google-signin-btn" />
            </div>

            {/* Switch to Register */}
            <div className="border-t border-white/[0.06] pt-5 text-center text-xs text-zinc-400">
              <span>{isVi ? "Chưa có tài khoản Game Vault? " : isZh ? "还没有 Game Vault 账号？" : "Don't have an account? "}</span>
              <Link
                href={`/${locale}/register`}
                className="font-bold text-white hover:underline ml-1"
              >
                {isVi ? "Đăng ký ngay" : isZh ? "立即注册" : "Create one"}
              </Link>
            </div>
          </div>

          {/* Guarantees */}
          <div className="flex items-center justify-center gap-6 text-[11px] text-zinc-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-zinc-400" />
              <span>{isVi ? "Bảo mật tài khoản 100%" : isZh ? "安全加密连接" : "Encrypted Connection"}</span>
            </div>
            <span>•</span>
            <div>
              <span>Game Vault 2026</span>
            </div>
          </div>

        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0E131E] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <h3 className="text-base font-bold text-white">
                {forgotStep === 3
                  ? (isVi ? "Đặt Lại Mật Khẩu" : isZh ? "重置密码" : "Reset Password")
                  : (isVi ? "Khôi Phục Mật Khẩu" : isZh ? "找回密码" : "Recover Password")}
              </h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded text-zinc-400 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {forgotStep === 1 && (isVi
                ? "Nhập email tài khoản của bạn để nhận mã xác nhận đặt lại mật khẩu."
                : isZh
                  ? "输入您的账号邮箱以接收重置密码验证码。"
                  : "Enter your email to receive a password reset code.")}
              {forgotStep === 2 && (isVi
                ? "Nhập mã xác nhận 8 ký tự được gửi trong hòm thư email của bạn."
                : isZh
                  ? "请输入发送至您邮箱的 8 位验证码。"
                  : "Enter the 8-character verification code from your email.")}
              {forgotStep === 3 && (isVi
                ? "Nhập mật khẩu mới để hoàn tất việc cập nhật tài khoản."
                : isZh
                  ? "请输入新密码以完成账号密码更新。"
                  : "Enter your new password to complete reset.")}
            </p>

            {forgotStep === 1 && (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-white/10 bg-[#080B11] p-3 text-xs sm:text-sm text-white outline-none focus:border-white/30"
                />

                {forgotError && <p className="text-xs text-rose-400">{forgotError}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="btn-secondary text-xs py-2 px-4"
                  >
                    {isVi ? "Đóng" : isZh ? "关闭" : "Close"}
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-primary text-xs py-2 px-4"
                  >
                    {forgotLoading ? (isVi ? "Đang gửi..." : isZh ? "正在发送..." : "Sending...") : (isVi ? "Gửi Mã Xác Nhận" : isZh ? "发送验证码" : "Send Code")}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="flex gap-2 justify-between">
                  {codeDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(index, e)}
                      onPaste={handlePaste}
                      className="w-9 h-11 text-center text-lg font-bold text-white bg-[#080B11] border border-white/10 rounded-xl focus:border-white/40 outline-none uppercase font-mono"
                    />
                  ))}
                </div>

                {forgotSuccess && <p className="text-xs text-emerald-400 font-medium">{forgotSuccess}</p>}
                {forgotError && <p className="text-xs text-rose-400">{forgotError}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="btn-secondary text-xs py-2 px-4"
                  >
                    {isVi ? "Quay lại" : isZh ? "上一步" : "Back"}
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-primary text-xs py-2 px-4"
                  >
                    {forgotLoading ? (isVi ? "Đang kiểm tra..." : isZh ? "正在验证..." : "Verifying...") : (isVi ? "Xác Nhận Mã" : isZh ? "确认验证码" : "Verify Code")}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={isVi ? "Nhập mật khẩu mới..." : isZh ? "输入新密码..." : "Enter new password..."}
                  className="w-full rounded-xl border border-white/10 bg-[#080B11] p-3 text-xs sm:text-sm text-white outline-none focus:border-white/30"
                />

                {forgotSuccess && <p className="text-xs text-emerald-400 font-medium">{forgotSuccess}</p>}
                {forgotError && <p className="text-xs text-rose-400">{forgotError}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(2)}
                    className="btn-secondary text-xs py-2 px-4"
                  >
                    {isVi ? "Quay lại" : isZh ? "上一步" : "Back"}
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-primary text-xs py-2 px-4"
                  >
                    {forgotLoading ? (isVi ? "Đang cập nhật..." : isZh ? "正在更新..." : "Updating...") : (isVi ? "Lưu Mật Khẩu Mới" : isZh ? "保存新密码" : "Save Password")}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
}
