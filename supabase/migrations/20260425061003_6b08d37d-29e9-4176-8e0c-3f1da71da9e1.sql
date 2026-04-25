DELETE FROM public.games WHERE slug IN ('html5-slots','crypto-slots','canvas-slots');
INSERT INTO public.games (name, slug, description, image_url, category, is_active, source) VALUES
('Retro Slots','html5-slots','Classic retro-style HTML5 slot machine with cherries, lemons and lucky 7s.','/games/html5-slots/thumbnail.jpg','slots',true,'builtin'),
('Crypto Slots','crypto-slots','5-reel crypto-themed slot machine with Bitcoin and Ethereum symbols.','/games/crypto-slots/thumbnail.jpg','slots',true,'builtin'),
('Fruit Reels','canvas-slots','Juicy 3-reel fruit slot machine with wilds and big payouts.','/games/canvas-slots/thumbnail.jpg','slots',true,'builtin');