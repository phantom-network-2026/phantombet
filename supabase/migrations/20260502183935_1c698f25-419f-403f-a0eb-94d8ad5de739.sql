
-- ============= ESCROW SERVICE =============

-- Status enum
CREATE TYPE public.escrow_status AS ENUM (
  'pending',      -- created, awaiting receiver acceptance
  'accepted',     -- both parties agreed, funds locked
  'shipped',      -- sender provided proof of postage
  'delivered',    -- sender provided proof of delivery (starts 7-day window)
  'disputed',     -- either party opened a dispute (frozen)
  'released',     -- funds released to receiver (seller)
  'refunded',     -- funds returned to sender (buyer)
  'cancelled',    -- cancelled before acceptance, no funds moved
  'expired'       -- pending too long, auto-cancelled
);

CREATE TYPE public.escrow_proof_kind AS ENUM (
  'postage',          -- proof of posting / handover to courier
  'tracking',         -- tracking number/link
  'delivery_photo',   -- photo of the delivered item
  'delivery_video',   -- video of unboxing / delivery
  'other'
);

CREATE TYPE public.escrow_event_type AS ENUM (
  'created','accepted','declined','cancelled',
  'shipped','delivered','confirmed_received',
  'disputed','resolved_release','resolved_refund',
  'auto_released','expired','note'
);

-- Main deals table
CREATE TABLE public.escrow_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,           -- buyer (pays)
  receiver_id uuid NOT NULL,         -- seller (delivers goods/services)
  sender_username text NOT NULL,
  receiver_username text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  amount_usdt numeric(18,6) NOT NULL CHECK (amount_usdt > 0),
  fee_percent numeric(5,2) NOT NULL DEFAULT 10.00,
  fee_amount numeric(18,6) NOT NULL DEFAULT 0,
  total_locked numeric(18,6) NOT NULL DEFAULT 0,  -- amount + fee held from sender
  payout_amount numeric(18,6) NOT NULL DEFAULT 0, -- what receiver gets on release
  tracking_number text,
  tracking_carrier text,
  status escrow_status NOT NULL DEFAULT 'pending',
  delivered_at timestamptz,           -- when delivery proof was submitted (starts 7-day window)
  auto_release_at timestamptz,        -- delivered_at + 7 days
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  cancelled_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sender_id <> receiver_id)
);

CREATE INDEX idx_escrow_deals_sender ON public.escrow_deals(sender_id, created_at DESC);
CREATE INDEX idx_escrow_deals_receiver ON public.escrow_deals(receiver_id, created_at DESC);
CREATE INDEX idx_escrow_deals_status ON public.escrow_deals(status);
CREATE INDEX idx_escrow_deals_auto_release ON public.escrow_deals(auto_release_at) WHERE status = 'delivered';

-- Proofs (postage, tracking, delivery photo/video)
CREATE TABLE public.escrow_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.escrow_deals(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  kind escrow_proof_kind NOT NULL,
  file_path text,                -- path in escrow-proofs bucket (private)
  text_value text,               -- e.g. tracking number / link / note
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_escrow_proofs_deal ON public.escrow_proofs(deal_id, created_at DESC);

-- Audit log
CREATE TABLE public.escrow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.escrow_deals(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type escrow_event_type NOT NULL,
  detail text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_escrow_events_deal ON public.escrow_events(deal_id, created_at);

ALTER TABLE public.escrow_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_events ENABLE ROW LEVEL SECURITY;

-- Helper to check if the caller is a party to a deal (avoid recursion via security definer)
CREATE OR REPLACE FUNCTION public.is_escrow_party(_deal_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.escrow_deals d
    WHERE d.id = _deal_id AND (d.sender_id = _user_id OR d.receiver_id = _user_id)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_escrow_party(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_escrow_party(uuid, uuid) TO authenticated;

-- Deals RLS: only the two parties + staff can view; only staff/service can update
CREATE POLICY "Parties or staff view deals"
  ON public.escrow_deals FOR SELECT TO authenticated
  USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'staff')
  );

-- All inserts/updates happen via edge functions running service_role; no direct write policies for users.

-- Proofs: only parties (and staff) can read; only parties (and staff) can insert their own proofs
CREATE POLICY "Parties or staff view proofs"
  ON public.escrow_proofs FOR SELECT TO authenticated
  USING (
    public.is_escrow_party(deal_id, auth.uid())
    OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Parties insert own proofs"
  ON public.escrow_proofs FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND public.is_escrow_party(deal_id, auth.uid())
  );

-- Events: parties + staff can read; inserts happen via service role
CREATE POLICY "Parties or staff view events"
  ON public.escrow_events FOR SELECT TO authenticated
  USING (
    public.is_escrow_party(deal_id, auth.uid())
    OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'staff')
  );

-- updated_at trigger
CREATE TRIGGER update_escrow_deals_updated_at
  BEFORE UPDATE ON public.escrow_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= STORAGE BUCKET FOR PROOFS (PRIVATE) =============
INSERT INTO storage.buckets (id, name, public)
VALUES ('escrow-proofs', 'escrow-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: <deal_id>/<uploader_user_id>/<filename>
-- Read: parties to the deal or staff
CREATE POLICY "Escrow parties or staff read proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'escrow-proofs'
    AND (
      public.is_escrow_party(((storage.foldername(name))[1])::uuid, auth.uid())
      OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'staff')
    )
  );

-- Write: a party uploads to their own subfolder of a deal they belong to
CREATE POLICY "Escrow parties upload own proofs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'escrow-proofs'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.is_escrow_party(((storage.foldername(name))[1])::uuid, auth.uid())
  );

-- Delete own (only the uploader)
CREATE POLICY "Escrow uploaders delete own proofs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'escrow-proofs'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
