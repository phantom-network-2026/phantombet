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
const BRIDGE_FALLBACK_SRC = "/games/bridge.js";

/**
 * Universal Phaser loader hardening:
 *  - Missing audio/image/atlas/spritesheet/json/binary files no longer hang the loader.
 *  - Any loader 404 is converted into a silent skip so the game can still boot.
 *  Safe for non-Phaser games (no-op if Phaser isn't present).
 */
const STORAGE_LOADER_SHIELD_SOURCE = `(function(){
  var installed = false;
  function patch(){
    if (installed) return true;
    var P = window.Phaser;
    if (!P || !P.Loader || !P.Loader.LoaderPlugin) return false;
    installed = true;
    var proto = P.Loader.LoaderPlugin.prototype;
    var origStart = proto.start;
    proto.start = function(){
      try {
        this.on('loaderror', function(file){
          try { console.warn('[PhantomShield] Skipping missing asset:', file && file.key, file && file.src); } catch(e){}
          try { this.nextFile(file, true); } catch(e){}
        }, this);
      } catch(e){}
      return origStart.apply(this, arguments);
    };
    return true;
  }
  if (!patch()) {
    var t = setInterval(function(){ if (patch()) clearInterval(t); }, 16);
    setTimeout(function(){ try { clearInterval(t); } catch(e){} }, 15000);
  }
})();`;

const STORAGE_RUNTIME_SHIELD_SOURCE = `(function(){
  window.__PHANTOM_PREPARE_PHASER_CONFIG__ = function(config){
    if (!config || !window.Phaser) return config;
    var ua = navigator.userAgent || '';
    var isTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    var isMobileWebKit = /iPhone|iPad|iPod/i.test(ua) || isTouchMac;
    config.render = Object.assign({ antialias: true, pixelArt: false }, config.render || {});
    if (isMobileWebKit) {
      config.type = window.Phaser.CANVAS;
    }
    return config;
  };

  window.addEventListener('error', function(event){
    try {
      if (document.getElementById('__phantom_storage_game_error__')) return;
      var overlay = document.createElement('div');
      overlay.id = '__phantom_storage_game_error__';
      overlay.style.position = 'fixed';
      overlay.style.left = '12px';
      overlay.style.right = '12px';
      overlay.style.bottom = '12px';
      overlay.style.zIndex = '99999';
      overlay.style.padding = '10px 12px';
      overlay.style.borderRadius = '12px';
      overlay.style.background = 'rgba(15,10,30,0.92)';
      overlay.style.color = '#f8fafc';
      overlay.style.font = '12px system-ui, sans-serif';
      overlay.style.border = '1px solid rgba(255,215,0,0.35)';
      overlay.textContent = 'Game runtime error: ' + (event && event.message ? event.message : 'Unknown error');
      document.body.appendChild(overlay);
    } catch (e) {}
  });
})();`;

let cachedBridgeSource: Promise<string> | null = null;
function loadBridgeSource(): Promise<string> {
  if (!cachedBridgeSource) {
    cachedBridgeSource = fetch("/games/bridge.js", { cache: "force-cache" })
      .then((r) => (r.ok ? r.text() : ""))
      .catch(() => "");
  }
  return cachedBridgeSource;
}

function isInlineableStorageAsset(path: string) {
  return Boolean(path) && !/^(?:[a-z]+:)?\/\//i.test(path) && !path.startsWith("data:") && !path.startsWith("blob:");
}

function sanitizeStorageGameScript(source: string) {
  return source
    .replace(/\bthis\.load\.audio(?:Sprite)?\s*\([\s\S]*?\);\s*/g, "")
    .replace(/\bthis\.load\.on\(\s*["']loaderror["'][\s\S]*?\);\s*/g, "")
    .replace(/type\s*:\s*Phaser\.AUTO/g, "type: (window.__PHANTOM_PREPARE_PHASER_CONFIG__ ? Phaser.CANVAS : Phaser.AUTO)")
    .replace(
      /new\s+Phaser\.Game\(\s*config\s*\)/g,
      "new Phaser.Game(window.__PHANTOM_PREPARE_PHASER_CONFIG__ ? window.__PHANTOM_PREPARE_PHASER_CONFIG__(config) : config)"
    );
}

async function fetchStorageAssetText(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load asset (${response.status})`);
  }
  return response.text();
}

async function prepareStorageGameHtml(html: string, baseHref: string, bridgeSource: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const head = doc.head || doc.documentElement.insertBefore(doc.createElement("head"), doc.body ?? null);

  Array.from(doc.querySelectorAll("base")).forEach((node) => node.remove());
  Array.from(doc.querySelectorAll('script[src]')).forEach((script) => {
    const src = script.getAttribute("src") || "";
    if (/bridge\.js(?:[?#].*)?$/i.test(src)) {
      script.remove();
    }
  });

  await Promise.all(
    Array.from(doc.querySelectorAll('link[rel="stylesheet"][href]')).map(async (link) => {
      const href = link.getAttribute("href") || "";
      if (!isInlineableStorageAsset(href)) return;
      try {
        const style = doc.createElement("style");
        style.textContent = await fetchStorageAssetText(new URL(href, baseHref).toString());
        link.replaceWith(style);
      } catch (error) {
        console.warn("Failed to inline stylesheet for storage game:", href, error);
      }
    })
  );

  for (const script of Array.from(doc.querySelectorAll('script[src]'))) {
    const src = script.getAttribute("src") || "";
    if (!isInlineableStorageAsset(src)) continue;
    try {
      const inlineScript = doc.createElement("script");
      inlineScript.textContent = sanitizeStorageGameScript(
        await fetchStorageAssetText(new URL(src, baseHref).toString())
      );
      script.replaceWith(inlineScript);
    } catch (error) {
      console.warn("Failed to inline script for storage game:", src, error);
    }
  }

  const base = doc.createElement("base");
  base.setAttribute("href", baseHref);
  head.prepend(base);

  const bridgeScript = doc.createElement("script");
  if (bridgeSource) {
    bridgeScript.textContent = bridgeSource;
  } else {
    bridgeScript.setAttribute("src", BRIDGE_FALLBACK_SRC);
  }
  head.appendChild(bridgeScript);

  const shieldScript = doc.createElement("script");
  shieldScript.textContent = STORAGE_LOADER_SHIELD_SOURCE;
  head.appendChild(shieldScript);

  const runtimeShieldScript = doc.createElement("script");
  runtimeShieldScript.textContent = STORAGE_RUNTIME_SHIELD_SOURCE;
  head.appendChild(runtimeShieldScript);

  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
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
  const [iframeError, setIframeError] = useState<string | null>(null);
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
    setIframeError(null);

    Promise.all([
      fetch(iframeSrc, { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw new Error(`Failed to load game HTML (${response.status})`);
        return response.text();
      }),
      loadBridgeSource(),
    ])
      .then(async ([html, bridgeSource]) => {
        if (!isActive) return;
        const baseHref = iframeSrc.slice(0, iframeSrc.lastIndexOf("/") + 1);
        setIframeHtml(await prepareStorageGameHtml(html, baseHref, bridgeSource));
        setIsIframeLoading(false);
      })
      .catch((error) => {
        console.error("Failed to prepare storage game iframe:", error);
        if (!isActive) return;
        setIframeHtml(null);
        setIframeError(error?.message || "Could not load this game.");
        setIsIframeLoading(false);
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
        ) : isStorageGame && iframeError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white p-6 text-center gap-2">
            <p className="text-gold font-display">Game failed to load</p>
            <p className="text-xs text-white/60 max-w-sm">{iframeError}</p>
          </div>
        ) : isStorageGame && !iframeHtml ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={isStorageGame ? undefined : iframeSrc}
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
