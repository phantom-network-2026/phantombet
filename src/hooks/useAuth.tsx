import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface ProfileData {
  username: string;
  balance: number;
  real_balance: number;
  mock_balance: number;
  avatar_url: string | null;
  crypto_address: string | null;
  bio: string;
  biggest_win: number;
  biggest_win_game: string;
  social_links: Record<string, string>;
  has_animated_avatar: boolean;
  has_animated_border: boolean;
  border_style: string;
  withdrawal_address: string | null;
  xp: number;
  purchased_borders: string[];
}

export function getLevel(xp: number): number {
  return Math.min(150, Math.max(1, Math.floor((-20 + Math.sqrt(400 + 6 * xp)) / 3)));
}

export function getXpForLevel(level: number): number {
  return 20 * level + 1.5 * level * level;
}

export function getTitle(level: number): string {
  if (level >= 150) return "Veteran";
  if (level >= 80) return "Big Baller";
  if (level >= 50) return "Professional";
  if (level >= 25) return "Amateur";
  return "Rookie";
}

export function getTitleColor(level: number): string {
  if (level >= 150) return "text-red-500";
  if (level >= 80) return "text-purple-400";
  if (level >= 50) return "text-blue-400";
  if (level >= 25) return "text-green-400";
  return "text-muted-foreground";
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: ProfileData | null;
  isAdmin: boolean;
  isOwner: boolean;
  hasStaffAccess: boolean;
  isMockMode: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [hasStaffAccess, setHasStaffAccess] = useState(false);
  const [isMockMode, setIsMockMode] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("get-public-settings", {
          body: { keys: ["wallet_mode"] },
        });
        if (data?.settings?.wallet_mode) {
          setIsMockMode(data.settings.wallet_mode.mock !== false);
        }
      } catch {}
    })();
  }, []);

  const clearProfileState = () => {
    setProfile(null);
    setIsAdmin(false);
    setIsOwner(false);
    setHasStaffAccess(false);
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("username, balance, real_balance, avatar_url, crypto_address, withdrawal_address, bio, biggest_win, biggest_win_game, social_links, has_animated_avatar, has_animated_border, border_style, xp, purchased_borders")
        .eq("user_id", userId)
        .maybeSingle();

      if (data) {
        const mockBal = Number(data.balance) || 0;
        const realBal = Number((data as any).real_balance) || 0;
        setProfile({
          username: data.username || "",
          balance: isMockMode ? mockBal : realBal,
          mock_balance: mockBal,
          real_balance: realBal,
          avatar_url: data.avatar_url,
          crypto_address: data.crypto_address,
          withdrawal_address: data.withdrawal_address,
          bio: (data as any).bio || "",
          biggest_win: Number((data as any).biggest_win) || 0,
          biggest_win_game: (data as any).biggest_win_game || "",
          social_links: (data as any).social_links || {},
          has_animated_avatar: (data as any).has_animated_avatar || false,
          has_animated_border: (data as any).has_animated_border || false,
          border_style: (data as any).border_style || "none",
          xp: Number((data as any).xp) || 0,
          purchased_borders: (data as any).purchased_borders || [],
        });
      } else {
        setProfile(null);
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const userRoles = roles?.map((r) => r.role) ?? [];
      setIsOwner(userRoles.includes("owner"));
      setIsAdmin(userRoles.includes("admin") || userRoles.includes("owner"));
      setHasStaffAccess(userRoles.some((r) => ["admin", "moderator", "staff", "owner"].includes(r)));
    } catch {
      clearProfileState();
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    let mounted = true;

    const applySession = (nextSession: Session | null, fetchUserProfile: boolean) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user && fetchUserProfile) {
        window.setTimeout(() => {
          if (mounted) fetchProfile(nextSession.user.id);
        }, 0);
      }

      if (!nextSession?.user) {
        clearProfileState();
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      applySession(nextSession, event !== "INITIAL_SESSION");
      if (event !== "INITIAL_SESSION") {
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session, !!session?.user);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isMockMode]);

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    return { error };
  };

  const signIn = async (username: string, password: string) => {
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("resolve-username", {
        body: { username },
      });
      if (fnError || !fnData?.email) {
        return { error: { message: "Username not found" } };
      }
      const { error } = await supabase.auth.signInWithPassword({ email: fnData.email, password });
      return { error };
    } catch {
      return { error: { message: "Login failed. Please try again." } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
    setIsOwner(false);
    setHasStaffAccess(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, isAdmin, isOwner, hasStaffAccess, isMockMode, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
