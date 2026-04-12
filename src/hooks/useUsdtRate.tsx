import { useState, useEffect } from "react";

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd";
const REFRESH_INTERVAL = 60_000; // 1 minute

export function useUsdtRate() {
  const [rate, setRate] = useState<number>(1.0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchRate = async () => {
      try {
        const res = await fetch(COINGECKO_API);
        const data = await res.json();
        if (mounted && data?.tether?.usd) {
          setRate(data.tether.usd);
        }
      } catch {
        // Keep last known rate on error
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRate();
    const interval = setInterval(fetchRate, REFRESH_INTERVAL);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const toUsd = (usdt: number) => usdt * rate;
  const toUsdt = (usd: number) => usd / rate;

  return { rate, loading, toUsd, toUsdt };
}
