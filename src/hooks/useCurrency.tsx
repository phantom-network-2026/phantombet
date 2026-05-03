import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type CurrencyCode = "USD" | "GBP" | "EUR";

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  /** Rate relative to USD (1 USD = rate units of currency). Display-only. */
  rate: number;
}

export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸", rate: 1.0 },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧", rate: 0.79 },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺", rate: 0.92 },
];

const STORAGE_KEY = "phantom_currency";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  current: Currency;
  /** Convert a USD amount to selected currency value (number). */
  convert: (usd: number) => number;
  /** Format a USD amount as a string in selected currency, e.g. "£12.34". */
  format: (usd: number, fractionDigits?: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window === "undefined") return "USD";
    const saved = window.localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    return saved && CURRENCIES.some((c) => c.code === saved) ? saved : "USD";
  });

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    try { window.localStorage.setItem(STORAGE_KEY, c); } catch {}
  }, []);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const v = e.newValue as CurrencyCode;
        if (CURRENCIES.some((c) => c.code === v)) setCurrencyState(v);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const current = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];

  const convert = useCallback((usd: number) => (usd || 0) * current.rate, [current]);
  const format = useCallback(
    (usd: number, fractionDigits = 2) =>
      `${current.symbol}${convert(usd).toFixed(fractionDigits)}`,
    [convert, current],
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, current, convert, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}