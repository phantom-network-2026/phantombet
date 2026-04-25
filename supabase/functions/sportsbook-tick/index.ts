// Sportsbook tick: maintains race fixtures, drifts odds, settles finished races.
// Designed to be called every few seconds by the client (or via cron).
// Hybrid: simulated UK fixtures now; swap fetchExternalFixtures() to a real API later.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HORSE_VENUES = ["Ascot", "Newmarket", "Cheltenham", "Aintree", "York", "Goodwood", "Doncaster", "Sandown", "Kempton", "Lingfield"];
const GREYHOUND_VENUES = ["Romford", "Hove", "Nottingham", "Sheffield", "Crayford", "Monmore", "Newcastle", "Sunderland", "Towcester", "Central Park"];
const HORSE_NAMES = ["Thunder Strike","Midnight Express","Royal Crown","Silver Bullet","Galaxy Runner","Storm Chaser","Velvet Knight","Phantom Dash","Golden Arrow","Iron Duke","Lucky Charm","Wild Spirit","Ocean Breeze","Desert Mirage","Fire Dancer","Lightning Bolt","Crimson Tide","Northern Light","Sapphire Star","Brave Heart"];
const GREY_NAMES = ["Swift Paws","Black Lightning","Ginger Snap","Rapid Rocket","Blue Streak","Lucky Larry","Fast Eddie","Mad Max","Nimble Ned","Quicksilver","Speedy Sue","Turbo Tim","Dash Hound","Flash Gordon","Roadrunner","Bolt"];
const TRAINERS = ["J. O'Brien","C. Appleby","W. Haggas","M. Johnston","S. Crisford","R. Hannon","J. Gosden","A. King"];
const DISTANCES_HORSE = ["5f","6f","7f","1m","1m 2f","1m 4f","2m","2m 4f"];
const DISTANCES_GREY = ["280m","380m","480m","515m","640m"];
const GOINGS = ["Good","Good to Soft","Soft","Good to Firm","Firm","Standard"];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.random() * (max - min) + min; }

function generateRunners(type: "horse" | "greyhound") {
  const count = type === "horse" ? 6 + Math.floor(Math.random() * 7) : 6;
  const pool = type === "horse" ? [...HORSE_NAMES] : [...GREY_NAMES];
  const runners: any[] = [];
  // Generate raw "true" probabilities, normalize, add overround margin.
  const strengths = Array.from({ length: count }, () => Math.random() * 0.9 + 0.1);
  const sum = strengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const name = pool.splice(idx, 1)[0] || `Runner ${i + 1}`;
    const trueProb = strengths[i] / sum;
    const winOdds = Math.max(1.5, Math.min(50, +(0.85 / trueProb).toFixed(2)));
    const placeOdds = Math.max(1.1, +(winOdds / 4 + 1).toFixed(2));
    runners.push({
      number: i + 1,
      name,
      jockey_trainer: type === "horse" ? `${pick(["L. Dettori","R. Moore","O. Murphy","W. Buick","H. Doyle"])} / ${pick(TRAINERS)}` : `Trap ${i + 1}`,
      win_odds: winOdds,
      place_odds: placeOdds,
    });
  }
  return runners;
}

async function ensureFixtures(admin: any) {
  const now = Date.now();
  // Keep 12 upcoming races at all times (6 horse + 6 greyhound)
  const { data: upcoming } = await admin.from("races").select("id, race_type").eq("status", "upcoming");
  const horseCount = (upcoming || []).filter((r: any) => r.race_type === "horse").length;
  const greyCount = (upcoming || []).filter((r: any) => r.race_type === "greyhound").length;

  const toCreate: any[] = [];
  for (let i = horseCount; i < 6; i++) {
    const offset = (i + 1) * (3 + Math.floor(Math.random() * 4)); // 3-7 min apart
    toCreate.push({ race_type: "horse", venue: pick(HORSE_VENUES), distance: pick(DISTANCES_HORSE), going: pick(GOINGS), off: now + offset * 60_000 });
  }
  for (let i = greyCount; i < 6; i++) {
    const offset = (i + 1) * (2 + Math.floor(Math.random() * 3)); // 2-5 min apart
    toCreate.push({ race_type: "greyhound", venue: pick(GREYHOUND_VENUES), distance: pick(DISTANCES_GREY), going: "Standard", off: now + offset * 60_000 });
  }

  for (const r of toCreate) {
    const { data: race, error } = await admin.from("races").insert({
      race_type: r.race_type,
      venue: r.venue,
      race_number: 1 + Math.floor(Math.random() * 8),
      race_name: r.race_type === "horse" ? `${r.venue} Stakes` : `${r.venue} A${1 + Math.floor(Math.random() * 9)}`,
      distance: r.distance,
      going: r.going,
      off_time: new Date(r.off).toISOString(),
      status: "upcoming",
    }).select("id").single();
    if (error || !race) continue;
    const runners = generateRunners(r.race_type).map((rn) => ({ ...rn, race_id: race.id }));
    await admin.from("race_runners").insert(runners);
  }
}

async function driftOdds(admin: any) {
  // Drift odds for all upcoming races within next 8 minutes
  const { data: races } = await admin.from("races").select("id").eq("status", "upcoming")
    .lte("off_time", new Date(Date.now() + 8 * 60_000).toISOString());
  if (!races?.length) return;
  for (const race of races) {
    const { data: runners } = await admin.from("race_runners").select("id, win_odds, place_odds").eq("race_id", race.id);
    if (!runners) continue;
    for (const rn of runners) {
      const driftPct = (Math.random() - 0.5) * 0.12; // ±6%
      const newWin = Math.max(1.5, Math.min(100, +((rn.win_odds * (1 + driftPct))).toFixed(2)));
      const newPlace = Math.max(1.1, +((newWin / 4 + 1)).toFixed(2));
      await admin.from("race_runners").update({ win_odds: newWin, place_odds: newPlace }).eq("id", rn.id);
    }
  }
}

async function startAndSettleRaces(admin: any) {
  const nowIso = new Date().toISOString();
  // Move upcoming -> live
  await admin.from("races").update({ status: "live" }).lte("off_time", nowIso).eq("status", "upcoming");
  // Settle live races whose off_time was >90s ago
  const { data: liveRaces } = await admin.from("races").select("id")
    .eq("status", "live").lte("off_time", new Date(Date.now() - 90_000).toISOString());
  if (!liveRaces?.length) return;
  for (const race of liveRaces) {
    const { data: runners } = await admin.from("race_runners").select("number, win_odds").eq("race_id", race.id).order("number");
    if (!runners?.length) continue;
    // Simulate finish weighted by inverse odds
    const weights = runners.map((r: any) => 1 / r.win_odds);
    const order: number[] = [];
    const pool = runners.map((r: any) => r.number);
    const w = [...weights];
    while (pool.length) {
      const total = w.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      let i = 0;
      while (r > 0 && i < w.length) { r -= w[i]; if (r > 0) i++; }
      i = Math.min(i, w.length - 1);
      order.push(pool[i]); pool.splice(i, 1); w.splice(i, 1);
    }
    const winners = order.slice(0, 3);
    await admin.from("races").update({ status: "settled", winners }).eq("id", race.id);
    // Update finishing positions
    for (let i = 0; i < order.length; i++) {
      await admin.from("race_runners").update({ finishing_position: i + 1 }).eq("race_id", race.id).eq("number", order[i]);
    }
    // Settle bets
    await settleBets(admin, race.id, winners);
  }

  // Cleanup races settled more than 30 min ago
  await admin.from("races").delete().eq("status", "settled").lte("updated_at", new Date(Date.now() - 30 * 60_000).toISOString());
}

async function settleBets(admin: any, raceId: string, winners: number[]) {
  const { data: bets } = await admin.from("sports_bets").select("*").eq("race_id", raceId).eq("status", "pending");
  if (!bets?.length) return;
  const [w1, w2, w3] = winners;
  for (const bet of bets) {
    const sel: number[] = bet.selections;
    let payout = 0;
    let status: "won" | "lost" | "partial" = "lost";
    if (bet.bet_type === "win") {
      if (sel[0] === w1) { payout = bet.stake * bet.odds_taken; status = "won"; }
    } else if (bet.bet_type === "place") {
      if (winners.includes(sel[0])) { payout = bet.stake * bet.odds_taken; status = "won"; }
    } else if (bet.bet_type === "each_way") {
      // stake is total (split half win / half place). odds_taken = win odds, place pays at 1/4 odds
      const halfStake = bet.stake / 2;
      if (sel[0] === w1) payout += halfStake * bet.odds_taken;
      if (winners.includes(sel[0])) payout += halfStake * (1 + (bet.odds_taken - 1) / 4);
      if (payout > 0) status = sel[0] === w1 ? "won" : "partial";
    } else if (bet.bet_type === "forecast") {
      if (sel[0] === w1 && sel[1] === w2) { payout = bet.stake * bet.odds_taken; status = "won"; }
    } else if (bet.bet_type === "tricast") {
      if (sel[0] === w1 && sel[1] === w2 && sel[2] === w3) { payout = bet.stake * bet.odds_taken; status = "won"; }
    }
    payout = +payout.toFixed(2);
    await admin.from("sports_bets").update({ status, payout, settled_at: new Date().toISOString() }).eq("id", bet.id);
    if (payout > 0) {
      // Credit user's mock balance
      const { data: profile } = await admin.from("profiles").select("balance").eq("user_id", bet.user_id).single();
      if (profile) {
        await admin.from("profiles").update({ balance: Number(profile.balance) + payout }).eq("user_id", bet.user_id);
        await admin.from("transactions").insert({
          user_id: bet.user_id, type: "sportsbook_win", amount: payout,
          description: `${bet.bet_type.toUpperCase()} bet won`,
        });
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await ensureFixtures(admin);
    await startAndSettleRaces(admin);
    await driftOdds(admin);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});