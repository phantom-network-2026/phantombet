import { useEffect, useState } from "react";

/**
 * Site-wide lightning + storm glow overlay.
 * Renders fixed behind page content (z-0) and is pointer-events-none.
 */
export function LightningOverlay() {
  const [flash, setFlash] = useState(0);
  const [variant, setVariant] = useState<"gold" | "blue" | "white">("gold");

  useEffect(() => {
    let timeout: number;
    const trigger = () => {
      const variants: Array<"gold" | "blue" | "white"> = ["gold", "blue", "white", "blue", "gold"];
      setVariant(variants[Math.floor(Math.random() * variants.length)]);
      setFlash((f) => f + 1);
      timeout = window.setTimeout(trigger, 2000 + Math.random() * 3500);
    };
    timeout = window.setTimeout(trigger, 1500);
    return () => window.clearTimeout(timeout);
  }, []);

  const boltColor =
    variant === "blue" ? "hsl(210 100% 65%)" : variant === "white" ? "hsl(0 0% 100%)" : "hsl(42 95% 70%)";
  const glowColor =
    variant === "blue"
      ? "hsl(210 100% 60% / 0.28)"
      : variant === "white"
      ? "hsl(210 30% 90% / 0.25)"
      : "hsl(270 80% 55% / 0.22)";

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      style={{
        // Fade bolts away from the center so they never sit on top of content.
        WebkitMaskImage:
          "radial-gradient(ellipse 60% 70% at 50% 50%, transparent 0%, transparent 35%, rgba(0,0,0,0.6) 70%, black 100%)",
        maskImage:
          "radial-gradient(ellipse 60% 70% at 50% 50%, transparent 0%, transparent 35%, rgba(0,0,0,0.6) 70%, black 100%)",
      }}
    >
      <svg
        key={flash}
        className="absolute inset-0 w-full h-full animate-bolt-global opacity-80"
        viewBox="0 0 400 800"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="bolt-glow-global">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d={`M${80 + Math.random() * 240} 0 L${100 + Math.random() * 200} 180 L${80 + Math.random() * 200} 200 L${120 + Math.random() * 180} 420 L${90 + Math.random() * 200} 440 L${130 + Math.random() * 160} 800`}
          stroke={boltColor}
          strokeWidth="2.2"
          fill="none"
          filter="url(#bolt-glow-global)"
          opacity="0.9"
        />
      </svg>
      <div
        key={`f-${flash}`}
        className="absolute inset-0 animate-storm-glow-global"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${glowColor}, transparent 60%)`,
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
