"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useAuthStore } from "@/lib/auth/store";
import { Button, Card, Input } from "@/components/ui/button";
import { api } from "@/lib/api/client";

export default function LoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState(1); // 1: send email, 2: verify code, 3: enter new password
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(8).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleDigitChange = (index: number, value: string) => {
    const char = value.slice(-1).toUpperCase();
    if (char && !/^[A-Z0-9]$/.test(char)) return;

    const newDigits = [...codeDigits];
    newDigits[index] = char;
    setCodeDigits(newDigits);

    // Auto-focus next input
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
      setForgotSuccess(locale === "vi" ? "Mã xác nhận đã được gửi đến email của bạn!" : "A reset code has been sent to your email!");
      setForgotStep(2);
    } catch (err: any) {
      console.error(err);
      setForgotError(err.response?.data?.error?.message || (locale === "vi" ? "Có lỗi xảy ra, vui lòng kiểm tra email!" : "An error occurred, please verify your email!"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = codeDigits.join("");
    if (code.length < 8) {
      setForgotError(locale === "vi" ? "Vui lòng nhập đầy đủ 8 ký tự!" : "Please enter all 8 characters!");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    setForgotSuccess("");
    try {
      await api.post("/auth/verify-reset-code", { email: forgotEmail, code });
      setForgotSuccess(locale === "vi" ? "Mã xác nhận hợp lệ!" : "Verification code is valid!");
      setForgotStep(3);
    } catch (err: any) {
      console.error(err);
      setForgotError(err.response?.data?.error?.message || (locale === "vi" ? "Mã xác nhận không hợp lệ hoặc đã hết hạn!" : "Invalid or expired reset code!"));
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
      alert(locale === "vi" ? "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay." : "Password reset successfully! You can now log in.");
      setShowForgotModal(false);
      setForgotEmail("");
      setCodeDigits(Array(8).fill(""));
      setNewPassword("");
      setForgotStep(1);
    } catch (err: any) {
      console.error(err);
      setForgotError(err.response?.data?.error?.message || (locale === "vi" ? "Có lỗi xảy ra khi đặt lại mật khẩu!" : "Failed to reset password!"));
    } finally {
      setForgotLoading(false);
    }
  };

  const rememberMeRef = useRef(rememberMe);
  useEffect(() => {
    rememberMeRef.current = rememberMe;
  }, [rememberMe]);

  const handleGoogleResponse = useCallback(async (response: any) => {
    try {
      await loginWithGoogle(response.credential, rememberMeRef.current);
      router.push(`/${locale}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Google sign in failed");
    }
  }, [loginWithGoogle, locale, router]);

  const isGoogleInitialized = useRef(false);

  const initGoogle = useCallback(() => {
    const google = (window as any).google;
    if (google && !isGoogleInitialized.current) {
      const buttonWidth = typeof window !== "undefined" ? Math.min(350, window.innerWidth - 64).toString() : "350";
      google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
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
    try {
      await login(email, password, rememberMe);
      router.push(`/${locale}`);
    } catch {
      setError("Invalid credentials");
    }
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initGoogle}
      />
      <Card className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div className="flex items-center justify-between gap-4 min-h-[44px]">
            <label htmlFor="rememberMe" className="flex items-center gap-3 py-2 cursor-pointer select-none min-h-[44px]">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-5 rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-violet-500 focus:ring-offset-zinc-950 cursor-pointer"
              />
              <span className="text-sm text-zinc-400">
                {locale === "vi" ? "Ghi nhớ đăng nhập" : "Remember me"}
              </span>
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
              className="text-sm font-semibold text-violet-400 hover:text-violet-300 transition cursor-pointer min-h-[44px] px-2 flex items-center"
            >
              {locale === "vi" ? "Quên mật khẩu?" : "Forgot password?"}
            </button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full h-12 md:h-10 text-base md:text-sm cursor-pointer">Login</Button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-800" />
          </div>
          <span className="relative bg-zinc-900 px-3 text-xs uppercase text-zinc-500 select-none">
            {locale === "vi" ? "Hoặc đăng nhập bằng" : "Or continue with"}
          </span>
        </div>

        <div className="flex justify-center w-full min-h-[44px]">
          <div id="google-signin-btn" />
        </div>
      </Card>

      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">
                {forgotStep === 3 
                  ? (locale === "vi" ? "Đặt lại mật khẩu" : "Reset Password") 
                  : (locale === "vi" ? "Quên mật khẩu" : "Forgot Password")}
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                {forgotStep === 1 && (locale === "vi" 
                  ? "Nhập email tài khoản của bạn để nhận mã xác nhận đặt lại mật khẩu." 
                  : "Enter your account email to receive a password reset verification code.")}
                {forgotStep === 2 && (locale === "vi" 
                  ? "Nhập mã xác nhận 8 ký tự được gửi trong email của bạn." 
                  : "Enter the 8-character verification code sent to your email.")}
                {forgotStep === 3 && (locale === "vi" 
                  ? "Nhập mật khẩu mới để tiến hành đặt lại mật khẩu tài khoản của bạn." 
                  : "Enter your new password to reset your account password.")}
              </p>
            </div>

            {forgotStep === 1 && (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                    {locale === "vi" ? "Địa chỉ Email" : "Email Address"}
                  </label>
                  <Input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="example@gamevault.com"
                  />
                </div>

                {forgotError && <p className="text-xs text-red-400">{forgotError}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    disabled={forgotLoading}
                    className="text-xs border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    {locale === "vi" ? "Đóng" : "Close"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="text-xs bg-violet-650 hover:bg-violet-600 text-white font-semibold flex items-center gap-1.5"
                  >
                    {forgotLoading && <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />}
                    {locale === "vi" ? "Gửi mã xác nhận" : "Request Code"}
                  </Button>
                </div>
              </form>
            )}

            {forgotStep === 2 && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                    {locale === "vi" ? "Mã xác nhận (8 ký tự)" : "Verification Code (8 chars)"}
                  </label>
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
                        className="w-10 h-12 text-center text-lg font-bold text-white bg-zinc-950 border border-zinc-800 rounded-xl focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none uppercase font-mono transition"
                      />
                    ))}
                  </div>
                </div>

                {forgotSuccess && <p className="text-xs text-green-400 font-medium">{forgotSuccess}</p>}
                {forgotError && <p className="text-xs text-red-400">{forgotError}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setForgotStep(1)}
                    disabled={forgotLoading}
                    className="text-xs border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    {locale === "vi" ? "Quay lại" : "Back"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="text-xs bg-violet-650 hover:bg-violet-600 text-white font-semibold flex items-center gap-1.5"
                  >
                    {forgotLoading && <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />}
                    {locale === "vi" ? "Kiểm tra mã" : "Verify Code"}
                  </Button>
                </div>
              </form>
            )}

            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                    {locale === "vi" ? "Mật khẩu mới" : "New Password"}
                  </label>
                  <Input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={locale === "vi" ? "Nhập mật khẩu mới..." : "Enter new password..."}
                  />
                </div>

                {forgotSuccess && <p className="text-xs text-green-400 font-medium">{forgotSuccess}</p>}
                {forgotError && <p className="text-xs text-red-400">{forgotError}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setForgotStep(2)}
                    disabled={forgotLoading}
                    className="text-xs border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    {locale === "vi" ? "Quay lại" : "Back"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={forgotLoading}
                    className="text-xs bg-violet-650 hover:bg-violet-600 text-white font-semibold flex items-center gap-1.5"
                  >
                    {forgotLoading && <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />}
                    {locale === "vi" ? "Xác nhận đặt lại" : "Reset Password"}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
