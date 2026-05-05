import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BottomNav } from "@/components/casino/BottomNav";
import heroBanner from "@/assets/hero-marketplace-banner.jpg";
import { Heart, Plus, Search, ShoppingBag, Star, Tag, Wrench, Zap, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  category: string;
  listing_type: string;
  price_usd: number;
  accepted_currencies: string[];
  images: string[];
  status: string;
  like_count: number;
  created_at: string;
}

const CATEGORIES = ["all", "digital", "physical", "services", "gaming", "design", "code", "other"];

export default function Marketplace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState<"all" | "good" | "service">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "digital",
    listing_type: "good",
    price_usd: "",
    image_url: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("marketplace_listings")
      .select("id,seller_id,title,description,category,listing_type,price_usd,accepted_currencies,images,status,like_count,created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(60);
    setListings((data as Listing[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("marketplace_likes").select("listing_id").eq("user_id", user.id).then(({ data }) => {
      setLikedIds(new Set((data || []).map((r: any) => r.listing_id).filter(Boolean)));
    });
  }, [user]);

  const toggleLike = async (listing: Listing) => {
    if (!user) { toast("Sign in to like"); return; }
    const isLiked = likedIds.has(listing.id);
    if (isLiked) {
      await supabase.from("marketplace_likes").delete().eq("user_id", user.id).eq("listing_id", listing.id);
      setLikedIds(s => { const n = new Set(s); n.delete(listing.id); return n; });
      setListings(ls => ls.map(l => l.id === listing.id ? { ...l, like_count: Math.max(0, l.like_count - 1) } : l));
    } else {
      const { error } = await supabase.from("marketplace_likes").insert({ user_id: user.id, listing_id: listing.id });
      if (error) { toast.error(error.message); return; }
      setLikedIds(s => new Set(s).add(listing.id));
      setListings(ls => ls.map(l => l.id === listing.id ? { ...l, like_count: l.like_count + 1 } : l));
    }
  };

  const createListing = async () => {
    if (!user) { toast("Sign in to list"); navigate("/signup"); return; }
    if (!form.title.trim() || !form.price_usd) { toast.error("Title and price required"); return; }
    const { error } = await supabase.from("marketplace_listings").insert({
      seller_id: user.id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      listing_type: form.listing_type,
      price_usd: Number(form.price_usd),
      images: form.image_url ? [form.image_url] : [],
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Listing published");
    setCreateOpen(false);
    setForm({ title: "", description: "", category: "digital", listing_type: "good", price_usd: "", image_url: "" });
    load();
  };

  const filtered = listings.filter(l => {
    if (category !== "all" && l.category !== category) return false;
    if (type !== "all" && l.listing_type !== type) return false;
    if (search && !l.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const buy = async (listing: Listing) => {
    if (!user) { toast("Sign in to buy"); navigate("/signup"); return; }
    if (user.id === listing.seller_id) { toast.error("You can't buy your own listing"); return; }
    const { error } = await supabase.from("marketplace_orders").insert({
      listing_id: listing.id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      amount_usd: listing.price_usd,
      currency: listing.accepted_currencies?.[0] || "USDT",
      status: "pending",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Order placed — funds held in escrow");
  };

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <img src={heroBanner} alt="Phantom Marketplace — buy and sell with crypto" className="w-full h-auto block" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-casino-gold/50 bg-black/60 backdrop-blur px-2.5 py-1 text-[9px] tracking-[0.25em] uppercase text-casino-gold mb-2">
            <Zap className="w-3 h-3" /> Phantom Marketplace
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-black bg-gradient-to-r from-casino-gold via-amber-200 to-casino-gold bg-clip-text text-transparent leading-tight">
            Buy & sell anything. Paid in crypto.
          </h1>
          <p className="text-xs sm:text-sm text-foreground/85 mt-1 max-w-xl">
            Goods, gigs and digital downloads — escrow-protected, no KYC.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="gold" size="sm" onClick={() => user ? setCreateOpen(true) : navigate("/signup")}>
              <Plus className="w-3 h-3 mr-1" /> List item
            </Button>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <div className="px-4 mt-4 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search marketplace..."
            className="pl-9 bg-secondary/60"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "good", "service"] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border transition ${
                type === t ? "bg-casino-gold text-black border-casino-gold" : "border-border text-muted-foreground"
              }`}
            >
              {t === "all" ? "All" : t === "good" ? <><Tag className="w-3 h-3 inline mr-1" />Goods</> : <><Wrench className="w-3 h-3 inline mr-1" />Services</>}
            </button>
          ))}
          <div className="w-px bg-border mx-1" />
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] capitalize border transition ${
                category === c ? "bg-primary/30 border-primary text-foreground" : "border-border text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* LISTINGS */}
      <div className="px-4 mt-4">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Loading marketplace…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No listings yet. Be the first to list.</p>
            <Button variant="gold" size="sm" className="mt-3" onClick={() => user ? setCreateOpen(true) : navigate("/signup")}>
              <Plus className="w-3 h-3 mr-1" /> Create listing
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(l => (
              <div key={l.id} className="group rounded-xl border border-border bg-card overflow-hidden hover:border-casino-gold/50 transition">
                <div className="aspect-square bg-secondary/40 relative overflow-hidden">
                  {l.images?.[0] ? (
                    <img src={l.images[0]} alt={l.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      {l.listing_type === "service" ? <Wrench className="w-8 h-8" /> : <Tag className="w-8 h-8" />}
                    </div>
                  )}
                  <button
                    onClick={() => toggleLike(l)}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 backdrop-blur flex items-center justify-center"
                  >
                    <Heart className={`w-3.5 h-3.5 ${likedIds.has(l.id) ? "fill-casino-pink text-casino-pink" : "text-white"}`} />
                  </button>
                  <span className="absolute top-2 left-2 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-black/60 text-casino-gold border border-casino-gold/40">
                    {l.listing_type}
                  </span>
                </div>
                <div className="p-2.5">
                  <h3 className="text-xs font-bold truncate">{l.title}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-black text-casino-gold">${Number(l.price_usd).toFixed(2)}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {l.like_count}
                    </span>
                  </div>
                  <Button size="sm" variant="gold" className="w-full mt-2 h-7 text-[11px]" onClick={() => buy(l)}>
                    Buy with crypto <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create listing</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Type</Label>
                <Select value={form.listing_type} onValueChange={v => setForm({ ...form, listing_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c !== "all").map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Price (USD)</Label>
              <Input type="number" step="0.01" value={form.price_usd} onChange={e => setForm({ ...form, price_usd: e.target.value })} />
            </div>
            <div>
              <Label>Image URL (optional)</Label>
              <Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
            </div>
            <Button variant="gold" className="w-full" onClick={createListing}>Publish listing</Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}