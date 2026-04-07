import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { GameCard } from "@/components/casino/GameCard";

import slotsImg from "@/assets/game-slots.jpg";
import rouletteImg from "@/assets/game-roulette.jpg";
import treasureImg from "@/assets/game-treasure.jpg";
import pokerImg from "@/assets/game-poker.jpg";

const defaultByCategory: Record<string, any[]> = {
  slots: [
    { id: "1", name: "Lucky Sevens", image_url: slotsImg, category: "slots" },
    { id: "6", name: "Gold Rush Slots", image_url: slotsImg, category: "slots" },
  ],
  live: [
    { id: "5", name: "Poker Nights", image_url: pokerImg, category: "live" },
  ],
  table: [
    { id: "2", name: "Royal Roulette", image_url: rouletteImg, category: "table" },
  ],
  jackpot: [
    { id: "4", name: "Treasure Quest", image_url: treasureImg, category: "jackpot" },
  ],
};

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const [games, setGames] = useState(defaultByCategory[category || ""] || []);

  useEffect(() => {
    if (!category) return;
    supabase
      .from("games")
      .select("*")
      .eq("category", category as any)
      .eq("is_active", true)
      .then(({ data }) => {
        if (data && data.length > 0) setGames(data);
      });
  }, [category]);
        if (data && data.length > 0) setGames(data);
      });
  }, [category]);

  return (
    <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
      <Header />
      <div className="container py-6 px-4">
        <h1 className="font-display text-2xl font-black text-gold mb-4 capitalize">
          {category} Games
        </h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {games.map((game: any) => (
            <GameCard key={game.id} {...game} />
          ))}
        </div>
        {games.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No games in this category yet.</p>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
