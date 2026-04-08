import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { HeroBanner } from "@/components/casino/HeroBanner";
import { CategoryTabs } from "@/components/casino/CategoryTabs";
import { GameCard } from "@/components/casino/GameCard";

// Default game images for when DB is empty
import slotsImg from "@/assets/game-slots.jpg";
import rouletteImg from "@/assets/game-roulette.jpg";
import blackjackImg from "@/assets/game-blackjack.jpg";
import treasureImg from "@/assets/game-treasure.jpg";
import pokerImg from "@/assets/game-poker.jpg";
import slotCowboyImg from "@/assets/game-slot-cowboy.jpg";

const defaultGames = [
  { id: "1", name: "Lucky Sevens", image_url: slotsImg, category: "slots", is_featured: true },
  { id: "2", name: "Royal Roulette", image_url: rouletteImg, category: "table", is_featured: true },
  { id: "3", name: "Blackjack Pro", image_url: blackjackImg, category: "table", is_featured: false },
  { id: "4", name: "Treasure Quest", image_url: treasureImg, category: "jackpot", is_featured: true },
  { id: "5", name: "Poker Nights", image_url: pokerImg, category: "live", is_featured: false },
  { id: "6", name: "Gold Rush Slots", image_url: slotsImg, category: "slots", is_featured: false },
  { id: "7", name: "Diamond Roulette", image_url: rouletteImg, category: "table", is_featured: false },
  { id: "8", name: "Mega Jackpot", image_url: treasureImg, category: "jackpot", is_featured: true },
];

export default function Index() {
  const [games, setGames] = useState(defaultGames);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    supabase
      .from("games")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const imageMap: Record<string, string> = {
            "Slot Cowboy": slotCowboyImg,
          };
          setGames(data.map((g) => ({ ...g, image_url: imageMap[g.name] || g.image_url || slotsImg })));
        }
      });
  }, []);

  const filtered = category === "all" ? games : games.filter((g) => g.category === category);
  const featured = games.filter((g) => g.is_featured);

  return (
    <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
      <Header />
      <HeroBanner />

      {/* Non-KYC Banner */}
      <div className="mx-4 mt-3 rounded-xl border border-[hsl(var(--casino-green))/0.3] bg-[hsl(var(--casino-green))/0.08] p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div className="space-y-1">
            <p className="text-sm font-bold text-[hsl(var(--casino-green))]">100% Non-KYC Casino</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No ID verification required — deposit and withdraw freely with full privacy. 
              <span className="text-[hsl(var(--casino-gold))] font-semibold"> Unlimited withdrawals</span> with no caps or restrictions.
            </p>
          </div>
        </div>
      </div>

      <CategoryTabs activeCategory={category} onCategoryChange={setCategory} />

      {/* Featured Games */}
      {category === "all" && featured.length > 0 && (
        <section className="px-4 mb-6">
          <h3 className="font-display text-lg font-bold mb-3 text-gold">🔥 Featured Games</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {featured.map((game) => (
              <div key={game.id} className="shrink-0 w-36">
                <GameCard {...game} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Games Grid */}
      <section className="px-4">
        <h3 className="font-display text-lg font-bold mb-3">
          {category === "all" ? "All Games" : `${category.charAt(0).toUpperCase() + category.slice(1)} Games`}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((game) => (
            <GameCard key={game.id} {...game} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No games in this category yet.</p>
        )}
      </section>

      <BottomNav />
    </div>
  );
}
