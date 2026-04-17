-- Map known built-in games to their actual folder names
UPDATE public.games SET slug = 'blackjack', source = 'builtin' WHERE name = 'Blackjack';
UPDATE public.games SET slug = 'scratch-card', source = 'builtin' WHERE name = 'Lucky Scratch Card';
UPDATE public.games SET slug = 'slot-cowboy', source = 'builtin' WHERE name = 'Slot Cowboy';
UPDATE public.games SET slug = 'roulette', source = 'builtin' WHERE name = 'Roulette';
UPDATE public.games SET slug = 'penny-roulette', source = 'builtin' WHERE name = 'Penny Roulette';
UPDATE public.games SET slug = 'prize-reel', source = 'builtin' WHERE name = 'Prize Reel';
UPDATE public.games SET slug = 'chicken-cross', source = 'builtin' WHERE name = 'Chicken Cross';
UPDATE public.games SET slug = 'scratch-royale', source = 'builtin' WHERE name = 'Scratch Royale';
UPDATE public.games SET slug = 'crypto-call', source = 'builtin' WHERE name = 'Crypto Call';
UPDATE public.games SET slug = 'cut-wire-pro', source = 'builtin' WHERE name = 'Cut Wire Pro';
UPDATE public.games SET slug = 'head-and-tail', source = 'builtin' WHERE name = 'Head & Tail';
UPDATE public.games SET slug = 'hero-casino', source = 'builtin' WHERE name = 'Hero Casino';
UPDATE public.games SET slug = 'meter-crash', source = 'builtin' WHERE name = 'Meter Crash';
UPDATE public.games SET slug = 'dream-11', source = 'builtin' WHERE name = 'Dream 11';
UPDATE public.games SET slug = 'jackpot-highway', source = 'builtin' WHERE name = 'Jackpot Highway';
UPDATE public.games SET slug = 'marvel-betting', source = 'builtin' WHERE name = 'Marvel Betting';
UPDATE public.games SET slug = 'neon-bounce', source = 'builtin' WHERE name = 'Neon Bounce';
UPDATE public.games SET slug = 'plane-crash', source = 'builtin' WHERE name = 'Plane Crash';
UPDATE public.games SET slug = 'plinko-pro', source = 'builtin' WHERE name = 'Plinko Pro';
UPDATE public.games SET slug = 'race-kings', source = 'builtin' WHERE name = 'Race Kings';
UPDATE public.games SET slug = 'royal-derby', source = 'builtin' WHERE name = 'Royal Derby';
UPDATE public.games SET slug = 'royal-heist', source = 'builtin' WHERE name = 'Royal Heist';
UPDATE public.games SET slug = 'safe-door', source = 'builtin' WHERE name = 'Safe Door';
UPDATE public.games SET slug = 'spin-wheel-royale', source = 'builtin' WHERE name = 'Spin Wheel Royale';
UPDATE public.games SET slug = 'stack-up-casino', source = 'builtin' WHERE name = 'Stack Up Casino';
UPDATE public.games SET slug = 'stake-mines', source = 'builtin' WHERE name = 'Stake Mines';
UPDATE public.games SET slug = 'scatter-bomb', source = 'builtin' WHERE name = 'Scatter Bomb';

-- Mark recent custom uploads as storage-based
UPDATE public.games SET slug = 'slot-game', source = 'storage' WHERE name = 'Slot Game' AND slug IS NULL;
UPDATE public.games SET slug = 'total-rumble', source = 'storage' WHERE name = 'Total Rumble' AND slug IS NULL;

-- Generic fallback for any remaining: derive slug from name
UPDATE public.games 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;