import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import IframeGame from "@/components/casino/IframeGame";
import { Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET = "game-files";

// Built-in games that have their own dedicated React route (not iframe-based)
const NATIVE_ROUTES: Record<string, string> = {
  "blackjack": "/blackjack",
  "scratch-card": "/scratch-card",
  "slot-cowboy": "/slot-cowboy",
  "roulette": "/roulette",
  "penny-roulette": "/penny-roulette",
  "prize-reel": "/prize-reel",
  "royal-rumble": "/royal-rumble",
};

interface GameRow {
  name: string;
  slug: string | null;
  source: string;
  category: string;
}

export default function PlayGame() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameRow | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    supabase
      .from("games")
      .select("name, slug, source, category")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setError("Game not found");
          return;
        }
        const row = data as GameRow;
        const slug = row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        // Redirect built-ins with native React routes
        if (NATIVE_ROUTES[slug]) {
          navigate(NATIVE_ROUTES[slug], { replace: true });
          return;
        }
        setGame({ ...row, slug });
      });
  }, [id, navigate]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white gap-3">
        <p className="text-lg font-display">{error}</p>
        <button onClick={() => navigate("/games")} className="text-gold underline text-sm">
          Back to Games
        </button>
      </div>
    );
  }

  if (!game || !game.slug) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  // Storage games are served directly from public bucket URL.
  // Built-in games load from /games/{slug}/index.html (public folder).
  const src =
    game.source === "storage"
      ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${game.slug}/index.html`
      : `/games/${game.slug}/index.html`;

  return <IframeGame title={game.name} slug={game.slug} src={src} emoji="🎮" />;
}
