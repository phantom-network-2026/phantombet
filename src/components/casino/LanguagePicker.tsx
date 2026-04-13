import { useState } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { useLanguage, LANGUAGES } from "@/hooks/useLanguage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function LanguagePicker() {
  const { lang, setLang, currentLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Globe className="h-3.5 w-3.5" />
          <span>{currentLanguage.flag}</span>
          <span className="hidden xs:inline">{currentLanguage.name}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-64 p-2">
        <div className="grid grid-cols-2 gap-1 max-h-60 overflow-y-auto">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted ${lang === l.code ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`}
            >
              <span>{l.flag}</span>
              <span className="truncate">{l.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}