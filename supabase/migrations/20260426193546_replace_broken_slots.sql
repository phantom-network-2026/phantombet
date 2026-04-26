-- Replace broken Construct 3 slots with new bridge-integrated React versions.
-- Wallet sync was impossible on the old games (compiled engines with no exposed bet/win API).

-- 1. Repoint Crazy Monkey Slot to new React slot (bridge-integrated)
UPDATE public.games
   SET name = 'Crazy Monkey',
       slug = 'crazy-monkey',
       description = 'Swing through the jungle for banana-fuelled wins!'
 WHERE slug = 'crazy-monkey-slot';

-- 2. Repoint Christmas Casino to new Christmas Magic
UPDATE public.games
   SET name = 'Christmas Magic',
       slug = 'christmas-magic',
       description = 'Festive spins, gifts and jackpots — Santa pays out!'
 WHERE slug = 'christmas-casino';

-- 3. Repoint Fruit Cocktail Slot to new bridge version
UPDATE public.games
   SET name = 'Fruit Cocktail',
       slug = 'fruit-cocktail',
       description = 'Classic fruit reels with a juicy twist!'
 WHERE slug = 'fruit-cocktail-slot';

-- 4. Hide remaining Construct 3 games whose wallet cannot sync.
--    They will be re-added as bridge-integrated React slots in future passes.
UPDATE public.games
   SET is_active = false
 WHERE slug IN (
   'crazy-monkey-casino',
   'fruit-cocktail-casino',
   'mysterious-night-slot',
   'mysterious-night-casino',
   'wolf-forest',
   'pirate-bay',
   'xmas-slot',
   'canvas-slots'
 );
