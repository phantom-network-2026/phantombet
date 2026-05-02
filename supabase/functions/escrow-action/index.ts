import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FEE_PERCENT = 10;
const AUTO_RELEASE_DAYS = 7;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const action = body.action as string;
    const dealId = body.deal_id as string | undefined;

    // Helper: fetch deal + check role
    async function getDeal(id: string) {
      const { data, error } = await admin
        .from("escrow_deals")
        .select("id, sender_id, receiver_id, sender_username, receiver_username, amount_usdt, fee_amount, total_locked, payout_amount, status, delivered_at, auto_release_at, title")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) throw new Error("Deal not found");
      return data;
    }

    async function isStaff(uid: string) {
      const { data } = await admin.from("user_roles").select("role").eq("user_id", uid);
      const roles = (data || []).map((r: any) => r.role);
      return roles.includes("admin") || roles.includes("owner") || roles.includes("staff");
    }

    async function logEvent(deal_id: string, actor_id: string | null, event_type: string, detail?: string, metadata: Record<string, unknown> = {}) {
      await admin.from("escrow_events").insert({ deal_id, actor_id, event_type, detail, metadata });
    }

    async function notify(user_id: string, title: string, content: string) {
      // Best-effort notification via broadcast-like activity feed
      await admin.from("activity_feed").insert({
        user_id, username: "escrow", activity_type: "escrow", title, detail: content,
      }).then(() => {}, () => {});
    }

    // ============ CREATE ============
    if (action === "create") {
      const { receiver_username, title, description, amount_usdt } = body;
      if (!receiver_username || !title || !description || !amount_usdt) {
        return json({ error: "Missing fields" }, 400);
      }
      const amount = Number(amount_usdt);
      if (!Number.isFinite(amount) || amount <= 0) return json({ error: "Invalid amount" }, 400);
      if (amount > 10000) return json({ error: "Maximum deal amount is 10,000 USDT" }, 400);

      // Resolve receiver
      const { data: receiver } = await admin
        .from("profiles")
        .select("user_id, username")
        .eq("username", receiver_username)
        .maybeSingle();
      if (!receiver) return json({ error: "Receiver username not found" }, 404);
      if (receiver.user_id === user.id) return json({ error: "Cannot create a deal with yourself" }, 400);

      // Get sender's profile + username
      const { data: sender } = await admin
        .from("profiles")
        .select("user_id, username, real_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!sender) return json({ error: "Sender profile not found" }, 404);

      const fee = +(amount * (FEE_PERCENT / 100)).toFixed(6);
      const totalLocked = +(amount + fee).toFixed(6);
      const payout = +(amount).toFixed(6);

      if (Number(sender.real_balance) < totalLocked) {
        return json({ error: `Insufficient USDT. You need ${totalLocked} (amount + ${FEE_PERCENT}% fee)` }, 400);
      }

      // Lock funds: deduct totalLocked from sender's real_balance
      const { error: balErr } = await admin
        .from("profiles")
        .update({ real_balance: Number(sender.real_balance) - totalLocked })
        .eq("user_id", user.id);
      if (balErr) return json({ error: "Failed to lock funds" }, 500);

      const { data: deal, error: dErr } = await admin
        .from("escrow_deals")
        .insert({
          sender_id: user.id,
          receiver_id: receiver.user_id,
          sender_username: sender.username,
          receiver_username: receiver.username,
          title, description,
          amount_usdt: amount,
          fee_percent: FEE_PERCENT,
          fee_amount: fee,
          total_locked: totalLocked,
          payout_amount: payout,
          status: "pending",
        })
        .select("id")
        .single();

      if (dErr || !deal) {
        // Refund the lock if insert failed
        await admin.from("profiles").update({ real_balance: Number(sender.real_balance) }).eq("user_id", user.id);
        return json({ error: "Failed to create deal" }, 500);
      }

      await logEvent(deal.id, user.id, "created", `Locked ${totalLocked} USDT (${amount} + ${fee} fee)`);
      await notify(receiver.user_id, "New escrow deal", `${sender.username} sent you a ${amount} USDT escrow deal: ${title}`);
      return json({ deal_id: deal.id });
    }

    if (!dealId) return json({ error: "deal_id required" }, 400);
    const deal = await getDeal(dealId);
    const isSender = deal.sender_id === user.id;
    const isReceiver = deal.receiver_id === user.id;
    const staff = await isStaff(user.id);
    if (!isSender && !isReceiver && !staff) return json({ error: "Not a party to this deal" }, 403);

    // ============ ACCEPT (receiver agrees) ============
    if (action === "accept") {
      if (!isReceiver) return json({ error: "Only the receiver can accept" }, 403);
      if (deal.status !== "pending") return json({ error: "Deal is not pending" }, 400);
      await admin.from("escrow_deals").update({ status: "accepted" }).eq("id", deal.id);
      await logEvent(deal.id, user.id, "accepted");
      await notify(deal.sender_id, "Escrow accepted", `${deal.receiver_username} accepted your deal "${deal.title}". Funds are locked.`);
      return json({ ok: true });
    }

    // ============ DECLINE / CANCEL (before acceptance) ============
    if (action === "cancel") {
      if (!["pending", "accepted"].includes(deal.status)) {
        return json({ error: "Cannot cancel at this stage" }, 400);
      }
      // Sender can cancel only while pending; receiver can decline while pending; either can mutual-cancel via dispute when accepted
      if (deal.status === "pending") {
        if (!isSender && !isReceiver) return json({ error: "Forbidden" }, 403);
      } else if (deal.status === "accepted") {
        // Only allow cancel if both parties haven't shipped — treat as refund
        if (!isSender) return json({ error: "Only sender can cancel an accepted deal before shipping" }, 403);
      }
      // Refund the lock to sender
      const { data: senderProf } = await admin.from("profiles").select("real_balance").eq("user_id", deal.sender_id).maybeSingle();
      const newBal = Number(senderProf?.real_balance || 0) + Number(deal.total_locked);
      await admin.from("profiles").update({ real_balance: newBal }).eq("user_id", deal.sender_id);
      await admin.from("escrow_deals").update({ status: "cancelled", cancelled_reason: body.reason || null, resolved_at: new Date().toISOString() }).eq("id", deal.id);
      await logEvent(deal.id, user.id, "cancelled", body.reason || null);
      await notify(isSender ? deal.receiver_id : deal.sender_id, "Escrow cancelled", `Deal "${deal.title}" was cancelled. Funds refunded to sender.`);
      return json({ ok: true });
    }

    // ============ MARK SHIPPED (receiver/seller adds postage proof) ============
    if (action === "mark_shipped") {
      if (!isReceiver) return json({ error: "Only the seller (receiver) can mark shipped" }, 403);
      if (deal.status !== "accepted") return json({ error: "Deal must be accepted first" }, 400);
      const { tracking_number, tracking_carrier, proof_file_path, proof_caption } = body;
      if (!tracking_number && !proof_file_path) {
        return json({ error: "Provide a tracking number or upload proof of postage" }, 400);
      }
      if (proof_file_path) {
        await admin.from("escrow_proofs").insert({
          deal_id: deal.id, uploaded_by: user.id, kind: "postage",
          file_path: proof_file_path, caption: proof_caption || null,
        });
      }
      if (tracking_number) {
        await admin.from("escrow_proofs").insert({
          deal_id: deal.id, uploaded_by: user.id, kind: "tracking",
          text_value: tracking_number, caption: tracking_carrier || null,
        });
      }
      await admin.from("escrow_deals").update({
        status: "shipped",
        tracking_number: tracking_number || null,
        tracking_carrier: tracking_carrier || null,
      }).eq("id", deal.id);
      await logEvent(deal.id, user.id, "shipped", tracking_number ? `Tracking: ${tracking_number}` : "Postage proof uploaded");
      await notify(deal.sender_id, "Item shipped", `${deal.receiver_username} shipped your item for "${deal.title}".`);
      return json({ ok: true });
    }

    // ============ MARK DELIVERED (receiver/seller uploads delivery photo/video — starts 7-day window) ============
    if (action === "mark_delivered") {
      if (!isReceiver) return json({ error: "Only the seller (receiver) can mark delivered" }, 403);
      if (!["accepted", "shipped"].includes(deal.status)) return json({ error: "Deal not in shippable state" }, 400);
      const { proof_file_path, proof_kind, proof_caption } = body;
      if (!proof_file_path) return json({ error: "Photo or video proof of delivery is required" }, 400);
      const kind = proof_kind === "delivery_video" ? "delivery_video" : "delivery_photo";
      await admin.from("escrow_proofs").insert({
        deal_id: deal.id, uploaded_by: user.id, kind,
        file_path: proof_file_path, caption: proof_caption || null,
      });
      const now = new Date();
      const auto = new Date(now.getTime() + AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000);
      await admin.from("escrow_deals").update({
        status: "delivered",
        delivered_at: now.toISOString(),
        auto_release_at: auto.toISOString(),
      }).eq("id", deal.id);
      await logEvent(deal.id, user.id, "delivered", `Auto-release in ${AUTO_RELEASE_DAYS} days unless disputed`);
      await notify(deal.sender_id, "Delivery proof uploaded", `${deal.receiver_username} marked "${deal.title}" delivered. You have ${AUTO_RELEASE_DAYS} days to confirm or dispute.`);
      return json({ ok: true });
    }

    // ============ BUYER UPLOADS PROOF (optional photo of received item) ============
    if (action === "upload_proof") {
      if (!isSender && !isReceiver) return json({ error: "Forbidden" }, 403);
      const { proof_file_path, proof_kind, proof_caption, text_value } = body;
      if (!proof_file_path && !text_value) return json({ error: "Nothing to upload" }, 400);
      const allowed = ["delivery_photo", "delivery_video", "postage", "tracking", "other"];
      const kind = allowed.includes(proof_kind) ? proof_kind : "other";
      await admin.from("escrow_proofs").insert({
        deal_id: deal.id, uploaded_by: user.id, kind,
        file_path: proof_file_path || null,
        text_value: text_value || null,
        caption: proof_caption || null,
      });
      await logEvent(deal.id, user.id, "note", `Uploaded ${kind} proof`);
      return json({ ok: true });
    }

    // ============ CONFIRM RECEIVED (buyer releases funds early) ============
    if (action === "confirm_received") {
      if (!isSender) return json({ error: "Only the buyer (sender) can confirm" }, 403);
      if (!["shipped", "delivered"].includes(deal.status)) return json({ error: "Deal not yet shipped/delivered" }, 400);
      // Release payout to receiver
      const { data: rProf } = await admin.from("profiles").select("real_balance").eq("user_id", deal.receiver_id).maybeSingle();
      const newBal = Number(rProf?.real_balance || 0) + Number(deal.payout_amount);
      await admin.from("profiles").update({ real_balance: newBal }).eq("user_id", deal.receiver_id);
      await admin.from("escrow_deals").update({ status: "released", resolved_at: new Date().toISOString(), resolved_by: user.id }).eq("id", deal.id);
      await logEvent(deal.id, user.id, "confirmed_received", `Released ${deal.payout_amount} USDT to seller`);
      await notify(deal.receiver_id, "Escrow released", `${deal.sender_username} confirmed receipt. ${deal.payout_amount} USDT released.`);
      return json({ ok: true });
    }

    // ============ OPEN DISPUTE ============
    if (action === "dispute") {
      if (!isSender && !isReceiver) return json({ error: "Forbidden" }, 403);
      if (!["accepted", "shipped", "delivered"].includes(deal.status)) {
        return json({ error: "Cannot dispute at this stage" }, 400);
      }
      const reason = (body.reason || "").toString().slice(0, 1000);
      await admin.from("escrow_deals").update({ status: "disputed" }).eq("id", deal.id);
      await logEvent(deal.id, user.id, "disputed", reason);
      // Notify the other party
      const other = isSender ? deal.receiver_id : deal.sender_id;
      await notify(other, "Escrow dispute opened", `Deal "${deal.title}" is in dispute. Staff will review.`);
      return json({ ok: true });
    }

    // ============ STAFF: RESOLVE (release or refund) ============
    if (action === "resolve") {
      if (!staff) return json({ error: "Staff only" }, 403);
      const decision = body.decision as "release" | "refund";
      const notes = (body.notes || "").toString().slice(0, 1000);
      if (!["release", "refund"].includes(decision)) return json({ error: "Invalid decision" }, 400);
      if (!["disputed", "delivered", "shipped", "accepted"].includes(deal.status)) {
        return json({ error: "Deal already resolved" }, 400);
      }

      if (decision === "release") {
        const { data: rProf } = await admin.from("profiles").select("real_balance").eq("user_id", deal.receiver_id).maybeSingle();
        const newBal = Number(rProf?.real_balance || 0) + Number(deal.payout_amount);
        await admin.from("profiles").update({ real_balance: newBal }).eq("user_id", deal.receiver_id);
        await admin.from("escrow_deals").update({ status: "released", resolved_at: new Date().toISOString(), resolved_by: user.id, resolution_notes: notes }).eq("id", deal.id);
        await logEvent(deal.id, user.id, "resolved_release", notes);
      } else {
        const { data: sProf } = await admin.from("profiles").select("real_balance").eq("user_id", deal.sender_id).maybeSingle();
        const newBal = Number(sProf?.real_balance || 0) + Number(deal.total_locked);
        await admin.from("profiles").update({ real_balance: newBal }).eq("user_id", deal.sender_id);
        await admin.from("escrow_deals").update({ status: "refunded", resolved_at: new Date().toISOString(), resolved_by: user.id, resolution_notes: notes }).eq("id", deal.id);
        await logEvent(deal.id, user.id, "resolved_refund", notes);
      }
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || "Internal error" }, 500);
  }
});