import { useNavigate } from "react-router-dom";
import { Header } from "@/components/casino/Header";
import { BottomNav } from "@/components/casino/BottomNav";
import { GameChat } from "@/components/casino/GameChat";
import { ChatPopupOverlay } from "@/components/casino/ChatPopupOverlay";
import { AuthGuard } from "@/components/casino/AuthGuard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MessageSquare, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useUserBonuses } from "@/hooks/useUserBonuses";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

const STORAGE_GAME_PATH = "/storage/v1/object/public/game-files/";
const BRIDGE_FALLBACK_SRC = "/games/bridge.js";
const STORAGE_BUCKET = "game-files";
const STORAGE_ENTRY_CANDIDATE_DIRS = ["", "dist", "build", "public"] as const;

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
  function hasWebGLSupport(){
    try {
      var canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  function installPhaserCompat(){
    var P = window.Phaser;
    if (!P) return false;
    try {
      var baseCache = P.Cache && P.Cache.BaseCache && P.Cache.BaseCache.prototype;
      if (baseCache && !baseCache.has && typeof baseCache.exists === 'function') {
        baseCache.has = function(key){ return this.exists(key); };
      }
    } catch (e) {}
    return true;
  }

  window.__PHANTOM_PREPARE_PHASER_CONFIG__ = function(config){
    if (!config || !window.Phaser) return config;
    config.render = Object.assign({ antialias: true, pixelArt: false }, config.render || {});
    if ((config.type == null || config.type === window.Phaser.AUTO) && !hasWebGLSupport()) {
      config.type = window.Phaser.CANVAS;
    }
    return config;
  };

  function showRuntimeError(message, details){
    try {
      var existing = document.getElementById('__phantom_storage_game_error__');
      if (existing) existing.remove();
      var overlay = document.createElement('div');
      overlay.id = '__phantom_storage_game_error__';
      overlay.style.position = 'fixed';
      overlay.style.left = '12px';
      overlay.style.right = '12px';
      overlay.style.top = '12px';
      overlay.style.zIndex = '99999';
      overlay.style.padding = '14px 16px';
      overlay.style.borderRadius = '16px';
      overlay.style.background = 'rgba(20,12,40,0.96)';
      overlay.style.color = '#f8fafc';
      overlay.style.font = '12px system-ui, sans-serif';
      overlay.style.border = '1px solid rgba(255,215,0,0.35)';
      overlay.style.boxShadow = '0 14px 36px rgba(0,0,0,0.45)';
      overlay.style.whiteSpace = 'pre-wrap';
      overlay.style.wordBreak = 'break-word';
      overlay.textContent = 'Game runtime error: ' + message + (details ? '\n' + details : '');
      (document.body || document.documentElement).appendChild(overlay);
    } catch (e) {}
  }

  window.addEventListener('error', function(event){
    var message = event && event.message ? event.message : 'Unknown error';
    var details = [];
    if (event && event.filename) details.push(event.filename + ':' + (event.lineno || 0) + ':' + (event.colno || 0));
    if (event && event.error && event.error.stack) details.push(event.error.stack);
    showRuntimeError(message, details.join('\n'));
  });

  window.addEventListener('unhandledrejection', function(event){
    var reason = event && event.reason;
    var message = reason && reason.message ? reason.message : String(reason || 'Unhandled promise rejection');
    var details = reason && reason.stack ? reason.stack : '';
    showRuntimeError(message, details);
  });

  if (!installPhaserCompat()) {
    var compatTimer = setInterval(function(){ if (installPhaserCompat()) clearInterval(compatTimer); }, 16);
    setTimeout(function(){ try { clearInterval(compatTimer); } catch (e) {} }, 15000);
  }
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
  return Boolean(path) && !path.startsWith("data:") && !path.startsWith("blob:");
}

function buildStoragePublicUrl(origin: string, objectPath: string) {
  return `${origin}${STORAGE_GAME_PATH}${objectPath.replace(/^\/+/, "")}`;
}

function isStorageFolder(item: { id?: string | null; metadata?: { mimetype?: string } | null }) {
  return !item.id && !item.metadata?.mimetype;
}

function rankStorageHtmlPath(path: string) {
  const normalized = path.toLowerCase();
  let score = 0;

  if (normalized.endsWith("/index.html")) score += 100;
  if (normalized.includes("/dist/index.html")) score += 25;
  if (normalized.includes("/build/index.html")) score += 20;
  if (normalized.includes("/public/index.html")) score += 10;

  score -= normalized.split("/").length;
  return score;
}

function looksExecutableGameHtml(html: string) {
  return /<script[\s>]/i.test(html) || /<canvas[\s>]/i.test(html) || /<iframe[\s>]/i.test(html);
}

function sanitizeStorageGameScript(source: string) {
  return source
    .replace(/\bthis\.load\.audio(?:Sprite)?\s*\([\s\S]*?\);\s*/g, "")
    .replace(/\bthis\.load\.on\(\s*["']loaderror["'][\s\S]*?\);\s*/g, "")
    .replace(/\.cache\.audio\.has\(/g, ".cache.audio.exists(")
    .replace(/type\s*:\s*Phaser\.AUTO/g, "type: Phaser.AUTO")
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

async function resolveStorageGameHtml(initialSrc: string, slug: string) {
  const storageOrigin = new URL(initialSrc, window.location.origin).origin;
  const triedPaths = new Set<string>();

  const tryPath = async (objectPath: string) => {
    const normalizedPath = objectPath.replace(/^\/+/, "");
    if (triedPaths.has(normalizedPath)) return null;
    triedPaths.add(normalizedPath);

    const entryUrl = buildStoragePublicUrl(storageOrigin, normalizedPath);
    try {
      const html = await fetchStorageAssetText(entryUrl);
      if (!looksExecutableGameHtml(html)) return null;
      return { entryUrl, html };
    } catch {
      return null;
    }
  };

  for (const dir of STORAGE_ENTRY_CANDIDATE_DIRS) {
    const candidate = dir ? `${slug}/${dir}/index.html` : `${slug}/index.html`;
    const resolved = await tryPath(candidate);
    if (resolved) return resolved;
  }

  const candidateHtmlPaths = new Set<string>();
  const foldersToInspect: string[] = [];

  const collectHtmlFiles = async (prefix: string) => {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(prefix, {
      limit: 200,
      sortBy: { column: "name", order: "asc" },
    });

    if (error || !data) return;

    for (const item of data as Array<{ name: string; id?: string | null; metadata?: { mimetype?: string } | null }>) {
      if (!item.name || item.name.startsWith(".")) continue;
      const fullPath = `${prefix}/${item.name}`;

      if (isStorageFolder(item)) {
        foldersToInspect.push(fullPath);
        continue;
      }

      if (item.name.toLowerCase().endsWith(".html")) {
        candidateHtmlPaths.add(fullPath);
      }
    }
  };

  await collectHtmlFiles(slug);
  for (const folder of foldersToInspect) {
    await collectHtmlFiles(folder);
  }

  const rankedPaths = Array.from(candidateHtmlPaths).sort((a, b) => rankStorageHtmlPath(b) - rankStorageHtmlPath(a));
  for (const objectPath of rankedPaths) {
    const resolved = await tryPath(objectPath);
    if (resolved) return resolved;
  }

  throw new Error("Could not find a playable HTML entry file for this installed game.");
}

function copyScriptAttributes(source: HTMLScriptElement, target: HTMLScriptElement) {
  const type = source.getAttribute("type");
  if (type) target.setAttribute("type", type);
  if (source.noModule) target.noModule = true;
  if (source.async) target.async = true;
  if (source.defer) target.defer = true;

  const crossOrigin = source.getAttribute("crossorigin");
  if (crossOrigin) target.setAttribute("crossorigin", crossOrigin);

  const referrerPolicy = source.getAttribute("referrerpolicy");
  if (referrerPolicy) target.setAttribute("referrerpolicy", referrerPolicy);
}

async function prepareStorageGameHtml(html: string, baseHref: string, bridgeSource: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const storageOrigin = new URL(baseHref).origin;
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
        const resolvedHref = new URL(href, baseHref).toString();
        const style = doc.createElement("style");
        style.textContent = `${await fetchStorageAssetText(resolvedHref)}\n/*# sourceURL=${resolvedHref} */`;
        link.replaceWith(style);
      } catch (error) {
        console.warn("Failed to inline stylesheet for storage game:", href, error);
      }
    })
  );

  for (const script of Array.from(doc.querySelectorAll('script[src]')) as HTMLScriptElement[]) {
    const src = script.getAttribute("src") || "";
    if (!isInlineableStorageAsset(src)) continue;
    try {
      const resolvedSrc = new URL(src, baseHref).toString();
      const inlineScript = doc.createElement("script");
      copyScriptAttributes(script, inlineScript);
      const scriptSource = await fetchStorageAssetText(resolvedSrc);
      inlineScript.textContent = `${new URL(resolvedSrc).origin === storageOrigin ? sanitizeStorageGameScript(scriptSource) : scriptSource}\n//# sourceURL=${resolvedSrc}`;
      script.replaceWith(inlineScript);
    } catch (error) {
      console.warn("Failed to inline script for storage game:", src, error);
      script.setAttribute("crossorigin", "anonymous");
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
  const { totalFreeSpins, consumeFreeSpin } = useUserBonuses();
  const [useFreeSpin, setUseFreeSpin] = useState(false);
  const useFreeSpinRef = useRef(false);
  useEffect(() => { useFreeSpinRef.current = useFreeSpin; }, [useFreeSpin]);
  // If inventory drops to zero, auto-disable
  useEffect(() => {
    if (totalFreeSpins <= 0 && useFreeSpin) setUseFreeSpin(false);
  }, [totalFreeSpins, useFreeSpin]);

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
      resolveStorageGameHtml(iframeSrc, slug),
      loadBridgeSource(),
    ])
      .then(async ([resolvedGame, bridgeSource]) => {
        if (!isActive) return;
        const baseHref = resolvedGame.entryUrl.slice(0, resolvedGame.entryUrl.lastIndexOf("/") + 1);
        setIframeHtml(await prepareStorageGameHtml(resolvedGame.html, baseHref, bridgeSource));
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

      // Free spin path: applies only to a bet deduction (negative amount)
      if (amount < 0 && useFreeSpinRef.current) {
        const stake = Math.abs(amount);
        // Only allow free spin to cover stakes up to $0.10 per current rule
        if (stake <= 0.10001) {
          const result = await consumeFreeSpin();
          if (result.success) {
            const balance = profileRef.current?.balance ?? 0;
            toast.success("Free spin used", { description: "Stake covered by your bonus." });
            (sourceWindow as Window).postMessage({
              type: 'SETTLE_RESPONSE', callbackId, success: true, balance, forcedLoss: false,
            }, '*');
            return;
          } else {
            toast.error("No free spins left", { description: "Charging your balance instead." });
            setUseFreeSpin(false);
          }
        } else {
          toast.message("Free spin requires $0.10 bet", {
            description: "Lower your stake to use a free spin.",
          });
        }
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
  }, [refreshProfile, consumeFreeSpin]);

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

        {/* Floating chat popups so messages are visible while playing */}
        {!showChat && (
          <ChatPopupOverlay gameRoom={slug} positionClassName="absolute left-2 right-2 bottom-2 z-30" />
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
        
        {totalFreeSpins > 0 ? (
          <button
            onClick={() => setUseFreeSpin((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
              useFreeSpin
                ? "bg-casino-gold/20 border-casino-gold text-casino-gold"
                : "bg-white/5 border-white/15 text-white/80 hover:bg-white/10"
            }`}
            title="Toggle free spin: when ON, your next $0.10 bet uses a bonus spin"
          >
            <Sparkles className="h-3 w-3" />
            {useFreeSpin ? "Free Spin: ON" : "Use Free Spin"}
            <span className="opacity-70">({totalFreeSpins})</span>
          </button>
        ) : (
          <span className="text-xs font-display font-bold text-gold truncate max-w-[40%]">
            {emoji} {title}
          </span>
        )}

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
