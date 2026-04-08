import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { GameCard } from "@/components/casino/GameCard";

import slotsImg from "@/assets/game-slots.jpg";
import rouletteImg from "@/assets/game-roulette.jpg";
import blackjackImg from "@/assets/game-blackjack.jpg";
import treasureImg from "@/assets/game-treasure.jpg";
import pokerImg from "@/assets/game-poker.jpg";
import slotCowboyImg from "@/assets/game-slot-cowboy.jpg";

const imageMap: Record<string, string> = {
  "Slot Cowboy": slotCowboyImg,
};

const CATEGORY_LABELS: Record<string, string> = {
  slots: "🎰 Slots",
  table: "🃏 Table Games",
  live: "🔴 Live",
  jackpot: "💎 Jackpot",
  scratch: "🎟️ Scratch Cards",
  instant: "⚡ Instant Wins",
};

const defaultGames = [
  { id: "1", name: "Lucky Sevens", image_url: slotsImg, category: "slots" },
  { id: "2", name: "Royal Roulette", image_url: rouletteImg, category: "table" },
  { id: "3", name: "Blackjack Pro", image_url: blackjackImg, category: "table" },
  { id: "4", name: "Treasure Quest", image_url: treasureImg, category: "jackpot" },
  { id: "5", name: "Poker Nights", image_url: pokerImg, category: "live" },
];

export default function GamesPage() {
  const [games, setGames] = useState(defaultGames);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("games")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setGames(data.map((g) => ({
            ...g,
            image_url: imageMap[g.name] || g.image_url || slotsImg,
          })));
        }
      });
  }, []);

  const gamesByCategory = games.reduce<Record<string, typeof games>>((acc, g) => {
    if (!acc[g.category]) acc[g.category] = [];
    acc[g.category].push(g);
    return acc;
  }, {});

  const categories = Object.keys(gamesByCategory);
  const displayCategories = activeCategory ? [activeCategory] : categories;

  return (
    <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
      <Header />
      <div className="container py-4 px-4 space-y-6">
        <h1 className="font-display text-2xl font-black text-gold">All Games</h1>

        {/* Category filter pills */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-display font-semibold transition-all ${
              !activeCategory ? "gradient-gold text-accent-foreground glow-gold" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-display font-semibold transition-all ${
                activeCategory === cat ? "gradient-gold text-accent-foreground glow-gold" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Games by category */}
        {displayCategories.map((cat) => (
          <section key={cat}>
            <h3 className="font-display text-lg font-bold mb-3">
              {CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {gamesByCategory[cat]?.map((game) => (
                <GameCard key={game.id} {...game} />
              ))}
            </div>
          </section>
        ))}

        {games.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No games available yet.</p>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
