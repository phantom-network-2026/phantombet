INSERT INTO public.games (name, slug, category, source, is_active, is_featured, description)
VALUES ('Pirate Plunder', 'pirate-plunder', 'slots', 'native', true, true, 'Sail the seven seas! 6x4 reels with jackpots and bonus rounds.')
ON CONFLICT (id) DO NOTHING;