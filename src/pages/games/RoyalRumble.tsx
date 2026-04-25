import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { GameChat } from "@/components/casino/GameChat";
import { ChatPopupOverlay } from "@/components/casino/ChatPopupOverlay";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const GAME_URL = "https://royalrumble.floot.app/";
const GAME_TITLE = "Royal Rumble";
const GAME_SLUG = "royal-rumble";
const GAME_ORIGIN = "https://royalrumble.floot.app";

function RoyalRumbleInner() {
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showChat, setShowChat] = useState(false);
  const { user, profile, refreshProfile } = useAuth();

  const profileRef = useRef(profile);
  const userRef = useRef(user);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { userRef.current = user; }, [user]);

  const post = useCallback((msg: any) => {
    iframeRef.current?.contentWindow?.postMessage(msg, GAME_ORIGIN);
  }, []);

  // Settle a transaction server-side. amount: negative=bet, positive=win.
  const settle = useCallback(async (amount: number, outcome: string) => {
    const u = userRef.current;
    if (!u || amount === 0) return null;
    const { data, error } = await supabase.functions.invoke("game-settle", {
      body: { userId: u.id, amount, gameType: GAME_TITLE, outcome },
    });
    if (error) {
      console.error("Royal Rumble settle error:", error);
      return null;
    }
    await refreshProfile();
    return data;
  }, [refreshProfile]);

  // Listen for messages from the Royal Rumble iframe
  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (e.origin !== GAME_ORIGIN) return;
      const data = e.data;
      if (!data || !data.type) return;

      switch (data.type) {
        case "ROYAL_RUMBLE_READY": {
          const balance = profileRef.current?.balance ?? 0;
          post({ type: "SET_BALANCE", balance });
          post({ type: "SET_BET_LIMITS", min: 0.1, max: 5 });
          post({ type: "SET_CONFIG", config: { hideBalance: false } });
          break;
        }
        case "SPIN_RESULT": {
          // payload: { betAmount, totalWin, netResult, balance, bonusTriggered, wins }
          const d = data.data || {};
          const bet = Number(d.betAmount) || 0;
          const win = Number(d.totalWin) || 0;

          // Pre-check balance (server will also enforce)
          if (bet > 0 && (profileRef.current?.balance ?? 0) < bet) {
            toast({ title: "Insufficient balance", variant: "destructive" });
            // Tell game to revert by re-pushing the authoritative balance
            post({ type: "SET_BALANCE", balance: profileRef.current?.balance ?? 0 });
            return;
          }

          // Deduct bet
          if (bet > 0) {
            const r = await settle(-bet, "Royal Rumble bet");
            if (!r) {
              post({ type: "SET_BALANCE", balance: profileRef.current?.balance ?? 0 });
              return;
            }
          }
          // Credit win (totalWin already includes any house adjustments game-side)
          if (win > 0) {
            await settle(win, d.bonusTriggered ? "Royal Rumble bonus win" : "Royal Rumble win");
          }
          // Sync authoritative balance back to the game
          post({ type: "SET_BALANCE", balance: profileRef.current?.balance ?? 0 });
          break;
        }
        case "BONUS_COMPLETE": {
          // Bonus payouts are typically already included via SPIN_RESULT.totalWin.
          // Re-sync just to be safe.
          post({ type: "SET_BALANCE", balance: profileRef.current?.balance ?? 0 });
          break;
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [post, settle]);

  // Push balance updates to the iframe
  useEffect(() => {
    if (profile?.balance !== undefined) {
      post({ type: "SET_BALANCE", balance: profile.balance });
    }
  }, [profile?.balance, post]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex-1 min-h-0 relative">
        <iframe
          ref={iframeRef}
          src={GAME_URL}
          className="w-full h-full border-0"
          title={GAME_TITLE}
          allow="autoplay"
        />
        {showChat && (
          <div className="absolute inset-0 z-40 bg-black/80 flex items-end">
            <div className="w-full h-[60%] bg-card border-t border-border rounded-t-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-sm font-bold text-gold">👑 {GAME_TITLE} Chat</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowChat(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <GameChat gameRoom={GAME_SLUG} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 bg-[#0f0a1e]/95 border-t border-white/10 flex items-center justify-between px-4 py-2 safe-area-bottom">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-white/80 hover:text-white h-9 px-3 text-xs gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Exit
        </Button>
        <span className="text-xs font-display font-bold text-gold truncate max-w-[40%]">👑 {GAME_TITLE}</span>
        <Button variant="ghost" size="sm" onClick={() => setShowChat(!showChat)} className="text-white/80 hover:text-white h-9 px-3 text-xs gap-1.5">
          <MessageSquare className="h-4 w-4" /> Chat
        </Button>
      </div>
    </div>
  );
}

export default function RoyalRumble() {
  return (
    <AuthGuard>
      <RoyalRumbleInner />
    </AuthGuard>
  );
}
