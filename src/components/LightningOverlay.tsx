import { useEffect, useRef, useState } from "react";

/**
 * Site-wide lightning + storm glow overlay.
 * Renders fixed behind page content (z-0) and is pointer-events-none.
 */
export function LightningOverlay() {
  const [flash, setFlash] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    let timeout: number;
    const trigger = () => {
      setFlash((f) => f + 1);
      try {
        if (!audioCtxRef.current) {
          const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
          if (Ctx) audioCtxRef.current = new Ctx();
        }
        const ctx = audioCtxRef.current;
        if (ctx) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sawtooth";
          o.frequency.setValueAtTime(60 + Math.random() * 30, ctx.currentTime);
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
          o.connect(g).connect(ctx.destination);
          o.start();
          o.stop(ctx.currentTime + 0.65);
        }
      } catch {}
      timeout = window.setTimeout(trigger, 6000 + Math.random() * 9000);
    };
    timeout = window.setTimeout(trigger, 4000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <svg
        key={flash}
        className="absolute inset-0 w-full h-full animate-bolt-global"
        viewBox="0 0 400 800"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="bolt-glow-global">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d={`M${80 + Math.random() * 240} 0 L${100 + Math.random() * 200} 180 L${80 + Math.random() * 200} 200 L${120 + Math.random() * 180} 420 L${90 + Math.random() * 200} 440 L${130 + Math.random() * 160} 800`}
          stroke="hsl(42 95% 70%)"
          strokeWidth="2"
          fill="none"
          filter="url(#bolt-glow-global)"
          opacity="0.85"
        />
      </svg>
      <div
        key={`f-${flash}`}
        className="absolute inset-0 animate-storm-glow-global"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, hsl(270 80% 55% / 0.22), transparent 60%)",
        }}
      />
      <style>{`
        @keyframes bolt-global {
          0% { opacity: 0; }
          5% { opacity: 1; }
          15% { opacity: 0.2; }
          25% { opacity: 1; }
          35% { opacity: 0; }
          100% { opacity: 0; }
        }
        .animate-bolt-global { animation: bolt-global 0.7s ease-out; }
        @keyframes storm-glow-global {
          0% { opacity: 0; }
          15% { opacity: 1; }
          60% { opacity: 0.3; }
          100% { opacity: 0; }
        }
        .animate-storm-glow-global { animation: storm-glow-global 1.2s ease-out; }
      `}</style>
    </div>
  );
}
