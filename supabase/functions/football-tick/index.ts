// Football tick: maintains UK/EU football fixtures, drifts odds, simulates live scores, and settles finished matches.
// Hybrid: simulated fixtures now; swap fetchExternalFixtures() for a real API later.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMPETITIONS = [
  "Premier League", "Championship", "League One", "League Two",
  "Scottish Premiership", "Scottish Championship", "Scottish League 1", "Scottish League 2",
  "FA Cup", "EFL Cup", "Scottish Cup",
  "Champions League", "Europa League", "Europa Conference League",
  "UEFA Champions League Women's", "UEFA Europa Cup - Women",
  "La Liga", "La Liga 2", "Bundesliga", "Bundesliga 2", "Serie A", "Serie B",
  "Ligue 1", "Eredivisie", "Primeira Liga", "Belgian Pro League",
  "MLS", "Liga MX", "Brasileirão", "Argentine Primera",
  "Saudi Pro League", "Turkish Süper Lig", "Greek Super League",
  "Australian A-League", "J1 League", "K League 1",
  "World Cup Qualifiers", "Nations League", "International Friendly",
];
const TEAMS_BY_COMP: Record<string, string[]> = {
  "Premier League": ["Arsenal","Man City","Liverpool","Chelsea","Man Utd","Tottenham","Newcastle","Aston Villa","Brighton","West Ham","Everton","Fulham","Crystal Palace","Wolves","Brentford","Bournemouth","Nottm Forest","Leicester","Ipswich","Southampton"],
  "Championship": ["Leeds","Burnley","Sunderland","Sheffield Utd","Norwich","Middlesbrough","Coventry","Bristol City","Hull","Cardiff","Watford","Stoke","QPR","Preston","Swansea","Millwall"],
  "League One": ["Birmingham","Wrexham","Bolton","Reading","Huddersfield","Charlton","Lincoln","Wycombe","Stockport","Barnsley","Peterborough","Blackpool"],
  "League Two": ["Notts County","Bradford","MK Dons","Walsall","Crewe","Gillingham","Port Vale","Salford","Chesterfield","Mansfield","Tranmere","Grimsby"],
  "Scottish Premiership": ["Celtic","Rangers","Hearts","Hibernian","Aberdeen","Motherwell","St Mirren","Kilmarnock","Dundee","St Johnstone","Ross County","Livingston"],
  "Scottish Championship": ["Dundee Utd","Partick Thistle","Raith Rovers","Falkirk","Ayr Utd","Inverness","Dunfermline","Greenock Morton"],
  "Scottish League 1": ["Hamilton","Cove Rangers","Stirling Albion","Queen of South","Alloa","Montrose"],
  "Scottish League 2": ["Stranraer","Dumbarton","Stenhousemuir","Bonnyrigg Rose","Forfar","Elgin City"],
  "FA Cup": ["Arsenal","Liverpool","Man City","Chelsea","Newcastle","Brighton","Leeds","Sunderland","Wrexham","Plymouth"],
  "EFL Cup": ["Arsenal","Liverpool","Newcastle","Tottenham","Man Utd","Chelsea","Brighton","Wolves"],
  "Scottish Cup": ["Celtic","Rangers","Hearts","Hibernian","Aberdeen","Dundee Utd","Falkirk","Inverness"],
  "Champions League": ["Real Madrid","Bayern Munich","Man City","PSG","Barcelona","Inter","Arsenal","Liverpool","Atlético","Dortmund","Juventus","Milan"],
  "Europa League": ["Roma","Tottenham","Lazio","Ajax","Porto","Sevilla","Rangers","Celtic","Lyon","Marseille"],
  "Europa Conference League": ["Aston Villa","Fiorentina","Brugge","AZ Alkmaar","Slavia Prague","Olympiakos","Maccabi Tel Aviv","Gent"],
  "UEFA Champions League Women's": ["Barcelona Femení","Lyon","Chelsea Women","Bayern Women","PSG Women","Arsenal Women","Wolfsburg","Roma Women"],
  "UEFA Europa Cup - Women": ["Man Utd Women","Real Madrid Women","Juventus Women","Atlético Women","Häcken","Brann","St Pölten","Sparta Praha"],
  "La Liga": ["Real Madrid","Barcelona","Atlético","Athletic Bilbao","Real Sociedad","Sevilla","Valencia","Villarreal","Real Betis","Girona"],
  "La Liga 2": ["Levante","Eibar","Sporting Gijón","Las Palmas","Granada","Cádiz","Mirandés","Albacete"],
  "Bundesliga": ["Bayern Munich","Dortmund","Leverkusen","RB Leipzig","Frankfurt","Stuttgart","Wolfsburg","Hoffenheim","Mainz","Freiburg"],
  "Bundesliga 2": ["Hamburger SV","Schalke 04","Hertha Berlin","Köln","Düsseldorf","Hannover","Nürnberg","Karlsruher"],
  "Serie A": ["Inter","Milan","Juventus","Napoli","Roma","Lazio","Atalanta","Fiorentina","Bologna","Torino"],
  "Serie B": ["Sampdoria","Palermo","Cremonese","Spezia","Bari","Brescia","Cosenza","Modena"],
  "Ligue 1": ["PSG","Marseille","Monaco","Lyon","Lille","Nice","Rennes","Lens","Nantes","Strasbourg"],
  "Eredivisie": ["Ajax","PSV","Feyenoord","AZ Alkmaar","Twente","Utrecht","Heerenveen","Sparta Rotterdam"],
  "Primeira Liga": ["Benfica","Porto","Sporting CP","Braga","Vitória","Estoril","Boavista","Famalicão"],
  "Belgian Pro League": ["Anderlecht","Club Brugge","Genk","Standard Liège","Antwerp","Gent","Cercle Brugge","Mechelen"],
  "MLS": ["Inter Miami","LAFC","NYCFC","Atlanta Utd","Seattle Sounders","Portland Timbers","Toronto FC","Philadelphia Union","Columbus Crew","FC Cincinnati"],
  "Liga MX": ["América","Chivas","Cruz Azul","Pumas","Tigres","Monterrey","León","Toluca","Pachuca","Santos Laguna"],
  "Brasileirão": ["Flamengo","Palmeiras","Corinthians","São Paulo","Santos","Fluminense","Botafogo","Grêmio","Internacional","Atlético Mineiro"],
  "Argentine Primera": ["Boca Juniors","River Plate","Racing","Independiente","San Lorenzo","Estudiantes","Vélez","Newell's"],
  "Saudi Pro League": ["Al-Hilal","Al-Nassr","Al-Ittihad","Al-Ahli","Al-Ettifaq","Al-Fateh","Al-Shabab","Al-Taawoun"],
  "Turkish Süper Lig": ["Galatasaray","Fenerbahçe","Beşiktaş","Trabzonspor","Başakşehir","Adana Demirspor","Antalyaspor","Konyaspor"],
  "Greek Super League": ["Olympiacos","Panathinaikos","AEK Athens","PAOK","Aris","Volos","OFI","Asteras"],
  "Australian A-League": ["Sydney FC","Melbourne City","Melbourne Victory","Western Sydney","Newcastle Jets FC","Central Coast Mariners","Brisbane Roar","Adelaide United"],
  "J1 League": ["Vissel Kobe","Yokohama F. Marinos","Kawasaki Frontale","Urawa Reds","Gamba Osaka","FC Tokyo","Kashima Antlers","Sanfrecce Hiroshima"],
  "K League 1": ["Ulsan HD","Pohang Steelers","FC Seoul","Jeonbuk","Suwon Bluewings","Daegu FC","Incheon United","Gangwon FC"],
  "World Cup Qualifiers": ["England","Scotland","Wales","Northern Ireland","Republic of Ireland","France","Germany","Spain","Italy","Brazil","Argentina","Portugal"],
  "Nations League": ["England","France","Spain","Germany","Netherlands","Portugal","Belgium","Croatia","Italy","Denmark"],
  "International Friendly": ["England","Brazil","Argentina","France","Germany","Spain","Portugal","Netherlands","USA","Mexico","Japan","South Korea"],
};

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function generateOdds() {
  // Generate realistic 1X2 odds with ~6% overround
  const homeStrength = 0.3 + Math.random() * 0.5;
  const awayStrength = 0.2 + Math.random() * 0.5;
  const drawStrength = 0.22 + Math.random() * 0.1;
  const total = homeStrength + awayStrength + drawStrength;
  const overround = 1.06;
  return {
    home: +(overround / (homeStrength / total) * (homeStrength / total) === 0 ? 2 : (overround * total / homeStrength)).toFixed(2),
    draw: +(overround * total / drawStrength).toFixed(2),
    away: +(overround * total / awayStrength).toFixed(2),
  };
}

async function ensureFixtures(admin: any) {
  const now = Date.now();
  const { data: upcoming } = await admin.from("football_matches").select("id").in("status", ["upcoming", "live"]);
  const target = 40;
  const need = Math.max(0, target - (upcoming?.length || 0));
  for (let i = 0; i < need; i++) {
    const comp = pick(COMPETITIONS);
    const teams = TEAMS_BY_COMP[comp];
    if (!teams || teams.length < 2) continue;
    const home = pick(teams);
    let away = pick(teams);
    let attempts = 0;
    while (away === home && attempts < 10) { away = pick(teams); attempts++; }
    if (away === home) continue;
    // Spread fixtures over the next ~6 hours
    const offsetMin = 1 + Math.floor(Math.random() * 360);
    const o = generateOdds();
    await admin.from("football_matches").insert({
      competition: comp,
      home_team: home,
      away_team: away,
      kickoff_time: new Date(now + offsetMin * 60_000).toISOString(),
      home_odds: Math.max(1.2, Math.min(15, o.home)),
      draw_odds: Math.max(2.5, Math.min(8, o.draw)),
      away_odds: Math.max(1.2, Math.min(15, o.away)),
      status: "upcoming",
    });
  }
}

async function driftOdds(admin: any) {
  const { data: matches } = await admin.from("football_matches").select("id, home_odds, draw_odds, away_odds")
    .eq("status", "upcoming")
    .lte("kickoff_time", new Date(Date.now() + 10 * 60_000).toISOString());
  if (!matches?.length) return;
  for (const m of matches) {
    const drift = () => (Math.random() - 0.5) * 0.10; // ±5%
    await admin.from("football_matches").update({
      home_odds: Math.max(1.2, Math.min(20, +(m.home_odds * (1 + drift())).toFixed(2))),
      draw_odds: Math.max(2.5, Math.min(10, +(m.draw_odds * (1 + drift())).toFixed(2))),
      away_odds: Math.max(1.2, Math.min(20, +(m.away_odds * (1 + drift())).toFixed(2))),
    }).eq("id", m.id);
  }
}

async function progressMatches(admin: any) {
  const nowIso = new Date().toISOString();
  // Move upcoming -> live
  await admin.from("football_matches").update({ status: "live", minute: 1 })
    .lte("kickoff_time", nowIso).eq("status", "upcoming");

  // Progress live matches
  const { data: live } = await admin.from("football_matches").select("*").eq("status", "live");
  if (!live?.length) return;
  for (const m of live) {
    // ~6 ticks per match (every 5s = 30s real time = full match). Use tick = +15 minutes per call.
    const newMinute = m.minute + 15;
    let homeScore = m.home_score;
    let awayScore = m.away_score;
    // Goal probability per tick weighted by inverse odds
    const homeChance = Math.min(0.35, 0.7 / m.home_odds);
    const awayChance = Math.min(0.35, 0.7 / m.away_odds);
    if (Math.random() < homeChance) homeScore++;
    if (Math.random() < awayChance) awayScore++;

    if (newMinute >= 90) {
      const result = homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw";
      await admin.from("football_matches").update({
        status: "finished", minute: 90, home_score: homeScore, away_score: awayScore, result,
      }).eq("id", m.id);
      await settleBets(admin, m.id, result);
    } else {
      await admin.from("football_matches").update({
        minute: newMinute, home_score: homeScore, away_score: awayScore,
      }).eq("id", m.id);
    }
  }

  // Cleanup matches finished >30 min ago
  await admin.from("football_matches").delete().eq("status", "finished")
    .lte("updated_at", new Date(Date.now() - 30 * 60_000).toISOString());
}

async function settleBets(admin: any, matchId: string, result: "home" | "draw" | "away") {
  const { data: bets } = await admin.from("football_bets").select("*").eq("match_id", matchId).eq("status", "pending");
  if (!bets?.length) return;
  for (const bet of bets) {
    const won = bet.selection === result;
    const payout = won ? +(bet.stake * bet.odds_taken).toFixed(2) : 0;
    await admin.from("football_bets").update({
      status: won ? "won" : "lost", payout, settled_at: new Date().toISOString(),
    }).eq("id", bet.id);
    if (won) {
      const { data: profile } = await admin.from("profiles").select("balance").eq("user_id", bet.user_id).single();
      if (profile) {
        await admin.from("profiles").update({ balance: Number(profile.balance) + payout }).eq("user_id", bet.user_id);
        await admin.from("transactions").insert({
          user_id: bet.user_id, type: "sportsbook_win", amount: payout,
          description: `Football ${bet.selection.toUpperCase()} bet won`,
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
    await progressMatches(admin);
    await driftOdds(admin);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});