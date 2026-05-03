import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useCurrency, CURRENCIES } from "@/hooks/useCurrency";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function CurrencyPicker() {
  const { currency, setCurrency, current } = useCurrency();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Select display currency"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary"
        >
          <span className="font-bold text-casino-gold">{current.symbol}</span>
          <span className="hidden xs:inline">{current.code}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-44 p-1">
        <div className="flex flex-col">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => { setCurrency(c.code); setOpen(false); }}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted ${currency === c.code ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`}
            >
              <span>{c.flag}</span>
              <span className="font-bold w-5">{c.symbol}</span>
              <span className="truncate">{c.code} — {c.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}