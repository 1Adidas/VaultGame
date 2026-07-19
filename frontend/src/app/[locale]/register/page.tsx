"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { Button, Card, Input } from "@/components/ui/button";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register(email, password, fullName);
    router.push(`/${locale}`);
  };

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold">{t("registerTitle")}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input placeholder={t("fullName")} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Input type="email" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input type="password" placeholder={t("password")} value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" className="w-full">Register</Button>
      </form>
    </Card>
  );
}
