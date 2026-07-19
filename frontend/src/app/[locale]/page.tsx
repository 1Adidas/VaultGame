"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useGames } from "@/hooks/useGames";
import { GameGrid } from "@/components/game/GameCard";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const t = useTranslations("home");
  const locale = useLocale();
  const { data: featuredData, isLoading: featuredLoading } = useGames({ featured: true, pageSize: 8 });
  const { data: comingSoonData, isLoading: comingSoonLoading } = useGames({ status: "Archived", pageSize: 8 });
  const { data: freeGamesData, isLoading: freeGamesLoading } = useGames({ maxPrice: 0, pageSize: 8 });
  const { data: discountedGamesData, isLoading: discountedGamesLoading } = useGames({ discounted: true, pageSize: 8 });

  return (
    <div>
      <section className="mb-8 md:mb-12 rounded-2xl bg-gradient-to-r from-violet-900/40 to-zinc-900 p-6 md:p-10">
        <h1 className="text-3xl font-bold md:text-5xl">{t("hero")}</h1>
        <p className="mt-3 max-w-xl text-xs md:text-sm text-zinc-400">{t("subtitle")}</p>
        <div className="mt-5 flex gap-3">
          <Link href={`/${locale}/games`}><Button size="sm" className="md:h-10 md:px-4 md:py-2">{t("browse")}</Button></Link>
          <Link href={`/${locale}/ai-chat`}><Button variant="outline" size="sm" className="md:h-10 md:px-4 md:py-2">AI Assistant</Button></Link>
        </div>
      </section>

      <h2 className="mb-6 text-2xl font-bold">{t("featured")}</h2>
      {featuredLoading ? <p>Loading...</p> : <GameGrid games={featuredData?.games ?? []} />}

      <h2 className="mt-12 mb-6 text-2xl font-bold">{t("discountedGames")}</h2>
      {discountedGamesLoading ? <p>Loading...</p> : <GameGrid games={discountedGamesData?.games ?? []} />}

      <h2 className="mt-12 mb-6 text-2xl font-bold">{t("freeGames")}</h2>
      {freeGamesLoading ? <p>Loading...</p> : <GameGrid games={freeGamesData?.games ?? []} />}

      <h2 className="mt-12 mb-6 text-2xl font-bold">{t("comingSoon")}</h2>
      {comingSoonLoading ? <p>Loading...</p> : <GameGrid games={comingSoonData?.games ?? []} />}
    </div>
  );
}
