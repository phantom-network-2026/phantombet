import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: { username: string; balance: number; avatar_url: string | null; crypto_address: string | null } | null;
  isAdmin: boolean;
  hasStaffAccess: boolean;
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
  const [hasStaffAccess, setHasStaffAccess] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, balance, avatar_url, crypto_address")
      .eq("user_id", userId)
      .single();
    if (data) setProfile({ username: data.username || "", balance: Number(data.balance), avatar_url: data.avatar_url, crypto_address: data.crypto_address });

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const userRoles = roles?.map((r) => r.role) ?? [];
    setIsAdmin(userRoles.includes("admin"));
    setHasStaffAccess(userRoles.some((r) => ["admin", "moderator", "staff"].includes(r)));
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setHasStaffAccess(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
      // Resolve username to email via edge function
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
    setHasStaffAccess(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, isAdmin, hasStaffAccess, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
