import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { GameChat } from "@/components/casino/GameChat";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IframeGameProps {
  title: string;
  slug: string;
  description?: string;
  emoji?: string;
}

function IframeGameInner({ title, slug, description, emoji }: IframeGameProps) {
  const navigate = useNavigate();
  const [fullscreen, setFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null);
  const { user, profile, refreshProfile } = useAuth();

  const sendBalanceToIframe = useCallback((iframe: HTMLIFrameElement | null, balance: number) => {
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'INIT_BALANCE', balance }, '*');
    }
  }, []);

  const handleSettle = useCallback(async (
    amount: number,
    gameType: string,
    outcome: string,
    callbackId: number,
    sourceWindow: MessageEventSource | null
  ) => {
    if (!user || !sourceWindow) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        (sourceWindow as Window).postMessage({
          type: 'SETTLE_RESPONSE',
          callbackId,
          success: false,
          error: 'Not authenticated'
        }, '*');
        return;
      }

      const { data, error } = await supabase.functions.invoke('game-settle', {
        body: {
          userId: user.id,
          amount,
          gameType,
          outcome
        }
      });

      if (error) {
        console.error('Game settle error:', error);
        (sourceWindow as Window).postMessage({
          type: 'SETTLE_RESPONSE',
          callbackId,
          success: false,
          error: 'Settlement failed'
        }, '*');
        return;
      }

      // Handle force_loss
      if (data?.forced_loss) {
        // Refresh profile to get actual balance
        await refreshProfile();
        (sourceWindow as Window).postMessage({
          type: 'SETTLE_RESPONSE',
          callbackId,
          success: true,
          balance: profile?.balance ?? 0,
          forcedLoss: true
        }, '*');
        return;
      }

      const newBalance = data?.balance ?? 0;

      // Refresh profile to sync
      await refreshProfile();

      (sourceWindow as Window).postMessage({
        type: 'SETTLE_RESPONSE',
        callbackId,
        success: true,
        balance: newBalance
      }, '*');
    } catch (err) {
      console.error('Game settle exception:', err);
      (sourceWindow as Window).postMessage({
        type: 'SETTLE_RESPONSE',
        callbackId,
        success: false,
        error: 'Settlement failed'
      }, '*');
    }
  }, [user, profile, refreshProfile]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || !data.type) return;

      if (data.type === 'GAME_READY') {
        // Send current balance to the game
        const balance = profile?.balance ?? 0;
        (event.source as Window)?.postMessage({ type: 'INIT_BALANCE', balance }, '*');
      }

      if (data.type === 'DEDUCT_BET') {
        // Deduct bet: negative amount
        handleSettle(
          -Math.abs(data.amount),
          data.gameType || title,
          'Bet placed',
          data.callbackId,
          event.source
        );
      }

      if (data.type === 'CREDIT_WIN') {
        // Credit win: positive amount
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
  }, [profile, handleSettle, title]);

  // When profile balance changes, update the iframe
  useEffect(() => {
    if (profile?.balance !== undefined) {
      const iframe = fullscreen ? fullscreenIframeRef.current : iframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'BALANCE_UPDATED',
          balance: profile.balance
        }, '*');
      }
    }
  }, [profile?.balance, fullscreen]);

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
          ref={fullscreenIframeRef}
          src={`/games/${slug}/index.html`}
          className="w-full h-full border-0"
          title={title}
          allow="autoplay"
        />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col gradient-casino-bg overflow-hidden">
      <Header />
      {/* Top bar: back, title, fullscreen */}
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0">
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <h1 className="font-display text-sm font-bold text-gold truncate mx-2">
          {emoji && `${emoji} `}{title}
        </h1>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setFullscreen(true)}>
          <Maximize2 className="h-3.5 w-3.5 mr-1" /> Full
        </Button>
      </div>

      {/* Main content area - fills remaining space */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row md:gap-4 px-3 pb-2">
        {/* Game iframe - fills available height */}
        <div className="flex-1 min-h-0 rounded-xl overflow-hidden bg-card border border-border">
          <iframe
            ref={iframeRef}
            src={`/games/${slug}/index.html`}
            className="w-full h-full border-0"
            title={title}
            allow="autoplay"
          />
        </div>

        {/* Chat - collapsible on mobile, sidebar on desktop */}
        <div className="shrink-0 mt-2 md:mt-0 md:w-72 md:h-full md:overflow-y-auto">
          <GameChat gameRoom={slug} />
        </div>
      </div>

      <BottomNav />
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
