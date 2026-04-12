import { useRef, useCallback } from "react";

/** Web Audio API–based roulette sound effects */
export function useRouletteAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playTone = useCallback((freq: number, type: OscillatorType, dur: number, vol = 0.12) => {
    if (!enabledRef.current) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {}
  }, [getCtx]);

  /** Chip placed on table */
  const chipPlace = useCallback(() => {
    playTone(1200, "sine", 0.08, 0.15);
    setTimeout(() => playTone(800, "sine", 0.06, 0.08), 30);
  }, [playTone]);

  /** Wheel starts spinning */
  const spinStart = useCallback(() => {
    if (!enabledRef.current) return;
    try {
      const ctx = getCtx();
      // Whoosh sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 1.0);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch {}
  }, [getCtx]);

  /** Ball clicking sounds during spin */
  const ballClick = useCallback(() => {
    playTone(2400 + Math.random() * 600, "sine", 0.03, 0.06);
  }, [playTone]);

  /** Ball lands in slot */
  const ballLand = useCallback(() => {
    playTone(600, "sine", 0.15, 0.2);
    setTimeout(() => playTone(400, "sine", 0.2, 0.15), 80);
    setTimeout(() => playTone(300, "sine", 0.15, 0.1), 160);
  }, [playTone]);

  /** Win fanfare */
  const winSound = useCallback(() => {
    if (!enabledRef.current) return;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, "square", 0.25, 0.1), i * 120);
    });
  }, [playTone]);

  /** Lose sound */
  const loseSound = useCallback(() => {
    playTone(300, "sawtooth", 0.3, 0.08);
    setTimeout(() => playTone(200, "sawtooth", 0.4, 0.06), 150);
  }, [playTone]);

  /** Clear bets sound */
  const clearSound = useCallback(() => {
    playTone(600, "triangle", 0.1, 0.08);
    setTimeout(() => playTone(400, "triangle", 0.1, 0.06), 60);
  }, [playTone]);

  /** Simulate ball ticking during spin (call in a loop) */
  const startBallTicks = useCallback(() => {
    if (!enabledRef.current) return null;
    let interval = 80;
    let count = 0;
    const maxTicks = 40;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (count >= maxTicks) return;
      ballClick();
      count++;
      // Slow down gradually
      interval = Math.min(400, interval * 1.08);
      timer = setTimeout(tick, interval);
    };

    // Start after a brief delay
    timer = setTimeout(tick, 500);

    return () => clearTimeout(timer);
  }, [ballClick]);

  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    return enabledRef.current;
  }, []);

  return {
    chipPlace,
    spinStart,
    ballClick,
    ballLand,
    winSound,
    loseSound,
    clearSound,
    startBallTicks,
    toggle,
    isEnabled: () => enabledRef.current,
  };
}
