import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { GameChat } from "@/components/casino/GameChat";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

export default function SlotCowboy() {
  const navigate = useNavigate();
  const [fullscreen, setFullscreen] = useState(false);

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFullscreen(false)}
          className="absolute top-2 right-2 z-50 text-white bg-black/50 hover:bg-black/70"
        >
          <Minimize2 className="h-4 w-4 mr-1" /> Exit Fullscreen
        </Button>
        <iframe
          src="/games/slot-cowboy/index.html"
          className="w-full h-full border-0"
          title="Slot Cowboy"
          allow="autoplay"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-casino-bg pb-20 md:pb-0">
      <Header />
      <div className="container max-w-4xl py-4 px-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setFullscreen(true)}>
            <Maximize2 className="h-4 w-4 mr-1" /> Fullscreen
          </Button>
        </div>
        <div className="rounded-2xl overflow-hidden bg-card border border-border">
          <div className="aspect-[16/9] w-full">
            <iframe
              src="/games/slot-cowboy/index.html"
              className="w-full h-full border-0"
              title="Slot Cowboy"
              allow="autoplay"
            />
          </div>
          <div className="p-4 text-center">
            <h1 className="font-display text-2xl font-black text-gold">🤠 Slot Cowboy</h1>
            <p className="text-muted-foreground text-sm mt-1">Spin the reels and ride to riches!</p>
          </div>
        </div>

        <div className="mt-4">
          <GameChat gameRoom="slot-cowboy" />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
