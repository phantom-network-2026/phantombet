import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { HeroBanner } from "@/components/casino/HeroBanner";
import { CategoryTabs } from "@/components/casino/CategoryTabs";
import { GameCard } from "@/components/casino/GameCard";
import { HomeCarousels } from "@/components/casino/HomeCarousels";
import welcomeBannerImg from "@/assets/welcome-phantombet-banner.jpeg";

// Default game images for when DB is empty
import slotsImg from "@/assets/game-slots.jpg";
import rouletteImg from "@/assets/game-roulette.jpg";
import blackjackImg from "@/assets/game-blackjack.jpg";
import treasureImg from "@/assets/game-treasure.jpg";
import pokerImg from "@/assets/game-poker.jpg";
import slotCowboyImg from "@/assets/game-slot-cowboy.jpg";
import prizeReelImg from "@/assets/game-prize-reel.jpg";

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

function PrizeReelBanner() {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/prize-reel")}
      className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-xl overflow-hidden text-left transition-transform active:scale-[0.98] hover:scale-[1.01] animate-border-gold"
      style={{
        background: "linear-gradient(135deg, hsl(270,40%,15%), hsl(280,35%,10%))",
        border: "1px solid hsl(43,80%,45%,0.4)",
        boxShadow: "0 0 20px hsl(270,50%,20%,0.3), 0 0 8px hsl(43,80%,50%,0.1)",
      }}
    >
      <div className="flex items-center gap-3 p-3">
        <div
          className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, hsl(43,80%,50%), hsl(43,70%,35%))",
            boxShadow: "0 0 10px hsl(43,80%,50%,0.4)",
          }}
        >
          <Gift className="h-5 w-5" style={{ color: "hsl(270,40%,8%)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-foreground">🎰 Prize Reel</span>
            <span
              className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
              style={{ background: "hsl(140,60%,40%)", color: "white" }}
            >
              Free
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Spin daily for free prizes — build a 7-day streak for bonus rewards!
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-[hsl(43,80%,55%)]" />
      </div>
    </button>
  );
}

export default function Index() {
  const [games, setGames] = useState(defaultGames);
  const [category, setCategory] = useState("all");
  const [announcement, setAnnouncement] = useState<{ active: boolean; text: string } | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState<{ enabled: boolean; message: string } | null>(null);
  const [homeCarousels, setHomeCarousels] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check admin status
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").then(({ data: roles }) => {
          setIsAdmin(!!(roles && roles.length > 0));
        });
      }
    });

    // Fetch games
    supabase.from("games").select("*").eq("is_active", true).then(({ data }) => {
      if (data && data.length > 0) {
        const imageMap: Record<string, string> = {
          "Slot Cowboy": slotCowboyImg,
          "Prize Reel": prizeReelImg,
        };
        setGames(data.map((g) => ({ ...g, image_url: imageMap[g.name] || g.image_url || slotsImg })));
      }
    });

    // Fetch announcement & maintenance via public settings endpoint
    supabase.functions.invoke("get-public-settings", {
      body: { keys: ["announcement", "maintenance_mode", "home_carousels"] },
    }).then(({ data }) => {
      if (data?.settings) {
        if (data.settings.announcement) setAnnouncement(data.settings.announcement);
        if (data.settings.maintenance_mode) setMaintenanceMode(data.settings.maintenance_mode);
        const hc = data.settings.home_carousels;
        if (hc) {
          // Accept either { carousels: [...] } or a raw array
          const arr = Array.isArray(hc) ? hc : Array.isArray(hc.carousels) ? hc.carousels : [];
          setHomeCarousels(arr);
        }
      }
    });
  }, []);

  // Show maintenance page for non-admins
  if (maintenanceMode?.enabled && !isAdmin) {
    return (
      <div className="min-h-screen gradient-casino-bg flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔧</div>
          <h1 className="font-display text-3xl font-black text-casino-gold mb-4">Under Maintenance</h1>
          <p className="text-muted-foreground">{maintenanceMode.message || "We're performing scheduled maintenance. Please check back soon."}</p>
        </div>
      </div>
    );
  }

  const filtered = category === "all" ? games : category === "games" ? games : games.filter((g) => g.category === category);
  const featured = games.filter((g) => g.is_featured);
  const gamesByCategory = games.reduce<Record<string, typeof games>>((acc, g) => {
    if (!acc[g.category]) acc[g.category] = [];
    acc[g.category].push(g);
    return acc;
  }, {});

  return (
    <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
      <Header />

      {/* Announcement Banner */}
      {announcement?.active && announcement.text && (
        <div className="mx-4 mt-3 rounded-xl bg-casino-gold/10 border border-casino-gold/30 p-3 flex items-center gap-2">
          <span className="text-lg">📢</span>
          <p className="text-sm font-medium flex-1">{announcement.text}</p>
        </div>
      )}

      {/* Welcome Phantom Casino Hero Banner */}
      <div className="mx-4 mt-3 rounded-2xl overflow-hidden border border-casino-gold/40 animate-border-gold">
        <img
          src={welcomeBannerImg}
          alt="Welcome to Phantom Casino — 100% Non-KYC Casino with Live Game Chat"
          className="w-full h-auto block"
          loading="eager"
        />
      </div>

      <HeroBanner />

      {/* Prize Reel Banner */}
      <PrizeReelBanner />

      <CategoryTabs activeCategory={category} onCategoryChange={setCategory} />

      {/* Admin-managed carousels (e.g. EXCLUSIVE GAMES, NEW RELEASES) */}
      {category === "all" && (
        <HomeCarousels carousels={homeCarousels} games={games as any} />
      )}

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

      {/* Games Tab - Categorised sections */}
      {category === "games" ? (
        <section className="px-4 space-y-6">
          {Object.entries(gamesByCategory).map(([cat, catGames]) => (
            <div key={cat}>
              <h3 className="font-display text-lg font-bold mb-3 capitalize">
                {cat === "slots" ? "🎰 Slots" : cat === "table" ? "🃏 Table Games" : cat === "live" ? "🔴 Live" : cat === "jackpot" ? "💎 Jackpot" : cat === "instant" ? "⚡ Instant Wins" : cat === "scratch" ? "🎟️ Scratch Cards" : cat}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {catGames.map((game) => (
                  <GameCard key={game.id} {...game} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
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
      )}

      <BottomNav />
    </div>
  );
}
