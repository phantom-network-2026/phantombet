import { useNavigate } from "react-router-dom";

interface GameCardProps {
  id: string;
  name: string;
  image_url: string | null;
  category: string;
}

export function GameCard({ id, name, image_url, category }: GameCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/game/${id}`)}
      className="group relative overflow-hidden rounded-xl bg-casino-surface transition-all hover:scale-105 hover:glow-purple focus:outline-none"
    >
      <div className="aspect-square overflow-hidden">
        <img
          src={image_url || "/placeholder.svg"}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform group-hover:scale-110"
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-2">
        <p className="font-display text-sm font-bold truncate">{name}</p>
        <p className="text-[10px] text-muted-foreground capitalize">{category}</p>
      </div>
    </button>
  );
}
