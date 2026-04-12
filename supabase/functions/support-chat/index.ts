import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are PhantomBet's friendly AI support assistant. You help users with questions about the platform.

KEY INFORMATION:
- PhantomBet is an online casino platform
- Deposits: Minimum $5 USDT (TRC-20). Users get a unique TRON deposit address. Deposits are auto-detected every 2 minutes.
- Withdrawals: Minimum $10. Users must set a withdrawal address in their profile. Withdrawals are processed automatically.
- Welcome Bonus: New users receive $100 in demo/mock funds to try games
- Daily Spin: Users can spin once every 24 hours for free prizes ($5-$1000). 7-day streaks give 2x rewards.
- Games: Slots, table games, scratch cards, instant games, jackpot games, and live games
- Progression: Users earn 10 XP per $1 deposited or won. Titles: Rookie (1-24), Amateur (25-49), Professional (50-79), Big Baller (80-149), Veteran (150)
- Profile: Users can customize avatars, borders, bio, and social links
- Friends: Users can add friends and send direct messages

COMMON ISSUES & SOLUTIONS:
- "Deposit not showing": Deposits take up to 2 minutes to detect. Ensure you sent USDT on the TRC-20 network (not ERC-20). Minimum is $5.
- "Can't withdraw": Check that withdrawal address is set in profile. Minimum withdrawal is $10. Ensure sufficient balance.
- "Balance wrong": Balance updates may take a moment. Try refreshing the page.
- "Account locked": Contact admin through the platform.
- "Game not loading": Try clearing browser cache or using a different browser.
- "Bonus not received": New accounts automatically receive $100 demo balance. This is mock funds for trying games.

RULES:
- Be helpful, concise, and friendly
- If you can't solve an issue, suggest the user contact support through the platform
- Never share technical details about house edge, win probabilities, or internal systems
- Never promise specific outcomes or guaranteed wins
- Keep responses short and actionable`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("support-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
