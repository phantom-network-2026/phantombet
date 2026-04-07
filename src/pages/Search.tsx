import { useState, useEffect } from "react";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { GameCard } from "@/components/casino/GameCard";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";

import slotsImg from "@/assets/game-slots.jpg";
import rouletteImg from "@/assets/game-roulette.jpg";
import blackjackImg from "@/assets/game-blackjack.jpg";
import treasureImg from "@/assets/game-treasure.jpg";
import pokerImg from "@/assets/game-poker.jpg";

const allGames = [
  { id: "1", name: "Lucky Sevens", image_url: slotsImg, category: "slots" },
  { id: "2", name: "Royal Roulette", image_url: rouletteImg, category: "table" },
  { id: "3", name: "Blackjack Pro", image_url: blackjackImg, category: "table" },
  { id: "4", name: "Treasure Quest", image_url: treasureImg, category: "jackpot" },
  { id: "5", name: "Poker Nights", image_url: pokerImg, category: "live" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const filtered = allGames.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
      <Header />
      <div className="container max-w-2xl py-6 px-4">
        <div className="relative mb-6">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games..."
            className="pl-10 bg-secondary border-border"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((game) => (
            <GameCard key={game.id} {...game} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No games found.</p>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
