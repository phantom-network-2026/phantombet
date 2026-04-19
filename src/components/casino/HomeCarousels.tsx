import { useEffect, useState } from "react";
import { GameCard } from "./GameCard";

type Game = {
  id: string;
  name: string;
  slug?: string | null;
  image_url?: string | null;
  category?: string;
  is_featured?: boolean;
};

type CarouselItem = { slug?: string; name?: string; size?: "wide" | "normal" };
type Carousel = {
  title: string;
  subtitle?: string;
  emoji?: string;
  items: (string | CarouselItem)[];
};

interface Props {
  carousels: Carousel[];
  games: Game[];
}

/**
 * Renders dynamic homepage carousels driven by the `home_carousels` site_setting.
 * Each carousel references games by slug or name; the first item can be marked
 * `size: "wide"` to display as a hero card.
 */
export function HomeCarousels({ carousels, games }: Props) {
  if (!carousels?.length) return null;

  const findGame = (ref: string | CarouselItem): { game: Game | null; size: "wide" | "normal" } => {
    if (typeof ref === "string") {
      const g = games.find(
        (x) => x.slug === ref || x.name?.toLowerCase() === ref.toLowerCase()
      );
      return { game: g || null, size: "normal" };
    }
    const key = ref.slug || ref.name || "";
    const g = games.find(
      (x) => x.slug === key || x.name?.toLowerCase() === key.toLowerCase()
    );
    return { game: g || null, size: ref.size || "normal" };
  };

  return (
    <>
      {carousels.map((c, idx) => {
        const resolved = (c.items || []).map(findGame).filter((r) => r.game);
        if (!resolved.length) return null;
        const wide = resolved.find((r) => r.size === "wide");
        const rest = resolved.filter((r) => r !== wide);

        return (
          <section key={idx} className="px-4 mb-6">
            <h3 className="font-display text-lg font-bold mb-3 text-gold flex items-center gap-2">
              {c.emoji && <span>{c.emoji}</span>}
              {c.title}
            </h3>
            {c.subtitle && (
              <p className="text-xs text-muted-foreground -mt-2 mb-3">{c.subtitle}</p>
            )}

            {wide && wide.game && (
              <div className="mb-3">
                <div className="rounded-2xl overflow-hidden border border-casino-gold/30 shadow-[0_0_25px_hsl(43_80%_50%/0.15)]">
                  <GameCard {...(wide.game as any)} />
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {rest.map((r, i) => (
                  <div key={i} className="shrink-0 w-36">
                    <GameCard {...(r.game as any)} />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
