import { useMemo } from "react";

interface SparklineProps {
  seed: string;
  positive?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

// Deterministic pseudo-random sparkline based on a string seed (e.g., coin symbol).
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function Sparkline({ seed, positive = true, width = 120, height = 36, className }: SparklineProps) {
  const points = useMemo(() => {
    const n = 24;
    const seedHash = hash(seed);
    const vals: number[] = [];
    let v = 50;
    for (let i = 0; i < n; i++) {
      const r = ((seedHash * (i + 1) * 9301 + 49297) % 233280) / 233280;
      const drift = positive ? 0.6 : -0.6;
      v += (r - 0.5) * 14 + drift;
      v = Math.max(10, Math.min(90, v));
      vals.push(v);
    }
    return vals;
  }, [seed, positive]);

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const path = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;

  const stroke = positive ? "hsl(var(--casino-green))" : "hsl(var(--exchange-red))";
  const fillId = `spark-${seed.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${fillId})`} />
      <path d={path} stroke={stroke} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}