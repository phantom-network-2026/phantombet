import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { GameChat } from "@/components/casino/GameChat";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MessageSquare, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_GAME_PATH = "/storage/v1/object/public/game-files/";

const STORAGE_AUDIO_BYPASS_SCRIPT = `<script>(function(){
  function install(){
    if (!window.Phaser?.Loader?.LoaderPlugin || window.__phantomStorageAudioPatched) return false;
    window.__phantomStorageAudioPatched = true;
    const proto = window.Phaser.Loader.LoaderPlugin.prototype;
    proto.audio = function(){ return this; };
    proto.audioSprite = function(){ return this; };
    return true;
  }

  if (!install()) {
    const timer = window.setInterval(() => {
      if (install()) window.clearInterval(timer);
    }, 0);
  }
})();</script>`;

function extractLocalScriptPaths(html: string) {
  return Array.from(html.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi))
    .map((match) => match[1])
    .filter((path) => !/^(https?:)?\/\//i.test(path) && !path.startsWith("data:") && !/bridge\.js$/i.test(path));
}

function extractAudioAssets(scriptContent: string) {
  return Array.from(
    scriptContent.matchAll(/\.audio\s*\(\s*["'][^"']+["']\s*,\s*(?:\[\s*)?["']([^"']+)["']/gi),
  ).map((match) => match[1]);
}

async function assetExists(url: string) {
  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

async function shouldDisableStorageGameAudio(html: string, baseHref: string) {
  const scriptPaths = extractLocalScriptPaths(html);
  if (!scriptPaths.length) return false;

  const allAudioAssets = new Set<string>();

  for (const scriptPath of scriptPaths) {
    try {
      const response = await fetch(new URL(scriptPath, baseHref).toString(), { cache: "no-store" });
      if (!response.ok) continue;
      const scriptContent = await response.text();
      extractAudioAssets(scriptContent).forEach((assetPath) => allAudioAssets.add(assetPath));
    } catch {
      continue;
    }
  }

  if (!allAudioAssets.size) return false;

  const assetChecks = await Promise.all(
    Array.from(allAudioAssets).map((assetPath) => assetExists(new URL(assetPath, baseHref).toString())),
  );

  return assetChecks.some((exists) => !exists);
}

function prepareStorageGameHtml(html: string, baseHref: string, options?: { disableAudio?: boolean }) {
  const baseTag = `<base href="${baseHref}">`;
  const bridgeTag = `<script src="bridge.js"></script>`;

  let patched = html
    .replace(/<base[^>]*>\s*/i, "")
    .replace(/<script[^>]*src=["'][^"']*bridge\.js["'][^>]*><\/script>\s*/gi, "");

  if (options?.disableAudio) {
    if (/<script[^>]*src=["'][^"']*phaser[^"']*["'][^>]*><\/script>/i.test(patched)) {
      patched = patched.replace(
        /(<script[^>]*src=["'][^"']*phaser[^"']*["'][^>]*><\/script>)/i,
        `$1\n${STORAGE_AUDIO_BYPASS_SCRIPT}`,
      );
    } else if (/<head[^>]*>/i.test(patched)) {
      patched = patched.replace(/<head([^>]*)>/i, `<head$1>\n  ${STORAGE_AUDIO_BYPASS_SCRIPT}`);
    } else {
      patched = `${STORAGE_AUDIO_BYPASS_SCRIPT}${patched}`;
    }
  }

  if (/<head[^>]*>/i.test(patched)) {
    return patched.replace(/<head([^>]*)>/i, `<head$1>\n  ${baseTag}\n  ${bridgeTag}`);
  }

  if (/<html[^>]*>/i.test(patched)) {
    return patched.replace(/<html([^>]*)>/i, `<html$1>\n<head>\n  ${baseTag}\n  ${bridgeTag}\n</head>`);
  }

  return `<head>${baseTag}${bridgeTag}</head>${patched}`;
}

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
  const isStorageGame = Boolean(src?.includes(STORAGE_GAME_PATH));
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showChat, setShowChat] = useState(false);
  const [iframeHtml, setIframeHtml] = useState<string | null>(null);
  const [isIframeLoading, setIsIframeLoading] = useState(isStorageGame);
  const { user, profile, refreshProfile } = useAuth();

  // Use refs to avoid stale closures
  const profileRef = useRef(profile);
  const userRef = useRef(user);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    let isActive = true;

    if (!isStorageGame) {
      setIframeHtml(null);
      setIsIframeLoading(false);
      return () => {
        isActive = false;
      };
    }

    setIsIframeLoading(true);
    setIframeHtml(null);

    fetch(iframeSrc, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load game HTML (${response.status})`);
        }

        const html = await response.text();
        const baseHref = iframeSrc.slice(0, iframeSrc.lastIndexOf("/") + 1);
        const disableAudio = await shouldDisableStorageGameAudio(html, baseHref);
        if (isActive) {
          setIframeHtml(prepareStorageGameHtml(html, baseHref, { disableAudio }));
          setIsIframeLoading(false);
        }
      })
      .catch((error) => {
        console.error("Failed to prepare storage game iframe:", error);
        if (isActive) {
          setIframeHtml(null);
          setIsIframeLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [iframeSrc, isStorageGame]);

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
        {isStorageGame && isIframeLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={iframeHtml ? undefined : iframeSrc}
            srcDoc={iframeHtml ?? undefined}
            className="w-full h-full border-0"
            title={title}
            allow="autoplay"
          />
        )}

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
