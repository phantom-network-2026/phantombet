import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

type FormField = {
  id: string;
  label: string;
  type: "text" | "email" | "url" | "textarea";
  required?: boolean;
  placeholder?: string;
};

const KNOWN_COLUMNS = new Set([
  "email", "project_name", "symbol", "network", "contract_address",
  "website", "whitepaper_url", "description", "team_info", "social_links",
]);

const FALLBACK_FIELDS: FormField[] = [
  { id: "project_name", label: "Project Name", type: "text", required: true, placeholder: "e.g. Phantom Token" },
  { id: "symbol", label: "Symbol / Ticker", type: "text", required: true, placeholder: "e.g. PHX" },
  { id: "email", label: "Contact Email", type: "email", required: true, placeholder: "team@yourproject.com" },
  { id: "description", label: "Project Description", type: "textarea", required: true, placeholder: "Tell us about your project..." },
];

export function CoinListingForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [fields, setFields] = useState<FormField[]>(FALLBACK_FIELDS);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_public_setting", { p_key: "coin_listing_form_fields" });
      const arr = (data as any)?.fields;
      if (Array.isArray(arr) && arr.length > 0) setFields(arr);
    })();
  }, []);

  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    // Validate required
    for (const f of fields) {
      if (f.required && !(values[f.id] || "").trim()) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    if (!values.email || !/^\S+@\S+\.\S+$/.test(values.email)) {
      toast.error("A valid email is required");
      return;
    }
    setSubmitting(true);

    // Map known columns; everything else goes into extra_data
    const row: any = {
      email: values.email,
      project_name: values.project_name || values.projectName || "Untitled",
      symbol: values.symbol || "",
      extra_data: {} as Record<string, string>,
    };
    const extra: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      if (KNOWN_COLUMNS.has(k)) row[k] = v;
      else extra[k] = v;
    }
    row.extra_data = extra;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) row.applicant_user_id = user.id;

    const { error } = await supabase.from("coin_listing_applications").insert(row);
    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit. Please try again.");
      return;
    }
    setSubmitted(true);
    toast.success("Application submitted! Our team will review it.");
    onSubmitted?.();
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-casino-gold/40 bg-card p-6 text-center space-y-3 animate-fade-in">
        <CheckCircle2 className="h-12 w-12 text-casino-gold mx-auto" />
        <h3 className="font-display text-lg font-black text-casino-gold">Application Received</h3>
        <p className="text-sm text-muted-foreground">
          Thanks! Our admins will review your listing request and contact you at <b className="text-foreground">{values.email}</b>.
        </p>
        <Button variant="outline" size="sm" onClick={() => { setSubmitted(false); setValues({}); }}>
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-casino-pink/40 bg-gradient-to-br from-casino-pink/10 to-casino-gold/10 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-casino-gold" />
          <h3 className="font-display font-black text-casino-gold">List Your Coin / Token — FREE</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          We never charge listing fees. Submit your project info below and our team will get back to you.
        </p>
      </div>

      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.id} className="space-y-1">
            <Label className="text-xs">
              {f.label}{f.required && <span className="text-casino-pink ml-1">*</span>}
            </Label>
            {f.type === "textarea" ? (
              <Textarea
                value={values[f.id] || ""}
                onChange={(e) => set(f.id, e.target.value)}
                placeholder={f.placeholder}
                className="bg-card border-border text-sm min-h-[80px]"
              />
            ) : (
              <Input
                type={f.type}
                value={values[f.id] || ""}
                onChange={(e) => set(f.id, e.target.value)}
                placeholder={f.placeholder}
                className="bg-card border-border text-sm"
              />
            )}
          </div>
        ))}
      </div>

      <Button variant="gold" className="w-full" onClick={submit} disabled={submitting}>
        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</> : "Submit Listing Application"}
      </Button>
    </div>
  );
}