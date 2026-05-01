import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  text: string;
  className?: string;
}

/**
 * Renders text with @username mentions highlighted and linked to the user's profile.
 * Resolves usernames -> user_ids in a single batched lookup.
 */
export function MentionText({ text, className }: Props) {
  const navigate = useNavigate();
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const mentionRegex = /@([a-zA-Z0-9_]{2,32})/g;
  const matches = Array.from(text.matchAll(mentionRegex)).map((m) => m[1]);

  useEffect(() => {
    const unique = Array.from(new Set(matches));
    const missing = unique.filter((u) => !(u in userMap));
    if (missing.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("profiles_public" as any)
        .select("user_id, username")
        .in("username", missing) as { data: any[] | null };
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => { if (p.username) map[p.username] = p.user_id; });
      // Mark unresolved as "" so we don't re-fetch every render
      missing.forEach((u) => { if (!(u in map)) map[u] = ""; });
      setUserMap((prev) => ({ ...prev, ...map }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Split into segments
  const parts: Array<{ text: string; mention?: string }> = [];
  let last = 0;
  for (const m of text.matchAll(mentionRegex)) {
    const start = m.index!;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: m[0], mention: m[1] });
    last = start + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });

  return (
    <span className={className}>
      {parts.map((p, i) => {
        if (!p.mention) return <span key={i}>{p.text}</span>;
        const uid = userMap[p.mention];
        if (uid) {
          return (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); navigate(`/user/${uid}`); }}
              className="text-casino-gold font-bold hover:underline"
            >
              {p.text}
            </button>
          );
        }
        return <span key={i} className="text-muted-foreground">{p.text}</span>;
      })}
    </span>
  );
}