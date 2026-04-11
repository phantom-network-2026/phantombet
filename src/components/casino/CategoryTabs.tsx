import { useState } from "react";

const categories = [
  { id: "all", label: "Home" },
  { id: "games", label: "Games" },
  { id: "slots", label: "Slots" },
  { id: "table", label: "Table" },
  { id: "instant", label: "Instant Wins" },
  
  { id: "jackpot", label: "Jackpot" },
];

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto px-4 py-3 scrollbar-hide">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-display font-semibold transition-all ${
            activeCategory === cat.id
              ? "gradient-gold text-accent-foreground glow-gold"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
