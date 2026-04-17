import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { GameChat } from "@/components/casino/GameChat";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface IframeGameProps {
  title: string;
  slug: string;
  description?: string;
  emoji?: string;
  /** Optional override for the iframe URL (used when game lives in cloud storage instead of /games) */
  src?: string;
}

function IframeGameInner({ title, slug, description, emoji, src }: IframeGameProps) {
  const iframeSrc = src || `/games/${slug}/index.html`;
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showChat, setShowChat] = useState(false);
  const { user, profile, refreshProfile } = useAuth();

  // Use refs to avoid stale closures
  const profileRef = useRef(profile);
  const userRef = useRef(user);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { userRef.current = user; }, [user]);

  const handleSettle = useCallback(async (
    amount: number,
    gameType: string,
    outcome: string,
    callbackId: number,
    sourceWindow: MessageEventSource | null
  ) => {
    const currentUser = userRef.current;
    if (!currentUser || !sourceWindow) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        (sourceWindow as Window).postMessage({
          type: 'SETTLE_RESPONSE', callbackId, success: false, error: 'Not authenticated'
        }, '*');
        return;
      }

      const { data, error } = await supabase.functions.invoke('game-settle', {
        body: { userId: currentUser.id, amount, gameType, outcome }
      });

      if (error) {
        console.error('Game settle error:', error);
        (sourceWindow as Window).postMessage({
          type: 'SETTLE_RESPONSE', callbackId, success: false, error: 'Settlement failed'
        }, '*');
        return;
      }

      // Refresh profile to sync header balance
      await refreshProfile();

      const newBalance = data?.balance ?? profileRef.current?.balance ?? 0;

      (sourceWindow as Window).postMessage({
        type: 'SETTLE_RESPONSE',
        callbackId,
        success: true,
        balance: newBalance,
        forcedLoss: data?.forced_loss || false
      }, '*');
    } catch (err) {
      console.error('Game settle exception:', err);
      (sourceWindow as Window).postMessage({
        type: 'SETTLE_RESPONSE', callbackId, success: false, error: 'Settlement failed'
      }, '*');
    }
  }, [refreshProfile]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || !data.type) return;

      if (data.type === 'GAME_READY') {
        const balance = profileRef.current?.balance ?? 0;
        (event.source as Window)?.postMessage({ type: 'INIT_BALANCE', balance }, '*');
      }

      if (data.type === 'DEDUCT_BET') {
        handleSettle(
          -Math.abs(data.amount),
          data.gameType || title,
          'Bet placed',
          data.callbackId,
          event.source
        );
      }

      if (data.type === 'CREDIT_WIN') {
        handleSettle(
          Math.abs(data.amount),
          data.gameType || title,
          data.outcome || 'Win',
          data.callbackId,
          event.source
        );
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleSettle, title]);

  // When profile balance changes, update the iframe
  useEffect(() => {
    if (profile?.balance !== undefined) {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'BALANCE_UPDATED',
          balance: profile.balance
        }, '*');
      }
    }
  }, [profile?.balance]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Game iframe - takes all available space */}
      <div className="flex-1 min-h-0 relative">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className="w-full h-full border-0"
          title={title}
          allow="autoplay"
        />

        {/* Chat overlay */}
        {showChat && (
          <div className="absolute inset-0 z-40 bg-black/80 flex items-end">
            <div className="w-full h-[60%] bg-card border-t border-border rounded-t-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-sm font-bold text-gold">{emoji} {title} Chat</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowChat(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <GameChat gameRoom={slug} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation bar */}
      <div className="shrink-0 bg-[#0f0a1e]/95 border-t border-white/10 flex items-center justify-between px-4 py-2 safe-area-bottom">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-white/80 hover:text-white h-9 px-3 text-xs gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit
        </Button>
        
        <span className="text-xs font-display font-bold text-gold truncate max-w-[40%]">
          {emoji} {title}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowChat(!showChat)}
          className="text-white/80 hover:text-white h-9 px-3 text-xs gap-1.5"
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </Button>
      </div>
    </div>
  );
}

export default function IframeGame(props: IframeGameProps) {
  return (
    <AuthGuard>
      <IframeGameInner {...props} />
    </AuthGuard>
  );
}
