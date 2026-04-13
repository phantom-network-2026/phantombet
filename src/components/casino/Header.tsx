import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Menu, X, ArrowDownToLine, User, Gamepad2, Settings, ChevronDown, Wallet } from "lucide-react";
import { FakeWinsTicker } from "./FakeWinsTicker";
import { BalanceDisplay } from "./BalanceDisplay";
import { ProfileAvatar } from "./ProfileAvatar";
import { NotificationBell } from "./NotificationBell";
import logo from "@/assets/phantombet-logo.png";

export function Header() {
  const { user, profile, isAdmin, isOwner, hasStaffAccess, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [panelVis, setPanelVis] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!hasStaffAccess && !isOwner) return;
    (async () => {
      try {
        if (isOwner || isAdmin) {
          // Admins/owners can read site_settings directly
          const { data } = await supabase.from("site_settings").select("value").eq("key", "panel_visibility").maybeSingle();
          if (data?.value) setPanelVis(data.value as Record<string, boolean>);
        } else {
          // Staff use public settings endpoint
          const { data } = await supabase.functions.invoke("get-public-settings", { body: { keys: ["panel_visibility"] } });
          if (data?.settings?.panel_visibility) setPanelVis(data.settings.panel_visibility);
        }
      } catch {}
    })();
  }, [hasStaffAccess, isOwner, isAdmin]);

  const showAdminLink = isOwner || (panelVis.admin_panel_visible !== false);
  const showCpanelLink = isOwner || (panelVis.cpanel_visible !== false);
  const showSlotLink = isOwner || (panelVis.slot_panel_visible !== false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <FakeWinsTicker />
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 shrink-0">
          <div className="overflow-hidden shrink-0" style={{ height: 48, width: 68, marginTop: -18, marginBottom: -10 }}>
            <img src={logo} alt="PhantomBet" className="block w-full h-auto max-w-none" />
          </div>
          {!user && (
            <div className="overflow-hidden shrink-0" style={{ height: 18, width: 120 }}>
              <img src={logo} alt="PhantomBet" className="block w-full h-auto max-w-none" style={{ transform: 'translateY(-70%)' }} />
            </div>
          )}
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <BalanceDisplay size="md" />
              <Button variant="gold" size="sm" onClick={() => navigate("/deposit")}>
                Deposit
              </Button>
              <Button variant="pink" size="sm" onClick={() => navigate("/withdraw")}>
                <ArrowDownToLine className="h-4 w-4 mr-1" /> Withdraw
              </Button>
              {hasStaffAccess && showAdminLink && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-casino-pink">
                  <Shield className="h-4 w-4 mr-1" /> Admin
                </Button>
              )}
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={() => navigate("/wallet")} className="text-casino-gold p-1">
                <Wallet className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="text-casino-gold p-1">
                <ProfileAvatar
                  avatarUrl={profile?.avatar_url}
                  username={profile?.username}
                  borderStyle={profile?.border_style}
                  hasAnimatedBorder={profile?.has_animated_border}
                  hasAnimatedAvatar={profile?.has_animated_avatar}
                  size="sm"
                />
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-xs h-8 px-2" onClick={() => navigate("/login")}>
                Log In
              </Button>
              <Button variant="gold" size="sm" className="text-xs h-8 px-3" onClick={() => navigate("/signup")}>
                Sign Up
              </Button>
            </>
          )}
        </div>

        {/* Mobile: guest auth buttons or user controls + menu toggle */}
        <div className="flex md:hidden items-center gap-2">
          {user ? (
            <>
              <BalanceDisplay size="sm" />
              <button onClick={() => navigate("/wallet")} className="text-casino-gold">
                <Wallet className="h-5 w-5" />
              </button>
              <button onClick={() => navigate("/profile")}>
                <ProfileAvatar
                  avatarUrl={profile?.avatar_url}
                  username={profile?.username}
                  borderStyle={profile?.border_style}
                  hasAnimatedBorder={profile?.has_animated_border}
                  hasAnimatedAvatar={profile?.has_animated_avatar}
                  size="sm"
                />
              </button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => navigate("/login")}>
                Log In
              </Button>
              <Button variant="gold" size="sm" className="h-8 px-3 text-xs" onClick={() => navigate("/signup")}>
                Sign Up
              </Button>
            </>
          )}
          <button className="text-foreground shrink-0" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-3 animate-slide-up">
          {user ? (
            <>
              <Button variant="outline" className="w-full" onClick={() => { navigate("/profile"); setMenuOpen(false); }}>
                <User className="h-4 w-4 mr-1" /> My Profile
              </Button>
              <div className="flex gap-2">
                <Button variant="gold" className="flex-1" onClick={() => { navigate("/deposit"); setMenuOpen(false); }}>
                  Deposit
                </Button>
                <Button variant="pink" className="flex-1" onClick={() => { navigate("/withdraw"); setMenuOpen(false); }}>
                  <ArrowDownToLine className="h-4 w-4 mr-1" /> Withdraw
                </Button>
              </div>
              {hasStaffAccess && (showAdminLink || showCpanelLink || showSlotLink) && (
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full text-casino-pink justify-between"
                    onClick={() => setAdminExpanded(!adminExpanded)}
                  >
                    <span className="flex items-center">
                      <Shield className="h-4 w-4 mr-1" /> Admin Panel
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${adminExpanded ? "rotate-180" : ""}`} />
                  </Button>
                  {adminExpanded && (
                    <div className="ml-6 space-y-1 border-l border-border pl-3">
                      {showAdminLink && (
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => { navigate("/admin"); setMenuOpen(false); }}>
                          <Shield className="h-3.5 w-3.5 mr-2" /> Admin Panel
                        </Button>
                      )}
                      {showCpanelLink && (
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => { navigate("/cpanel"); setMenuOpen(false); }}>
                          <Settings className="h-3.5 w-3.5 mr-2" /> cPanel
                        </Button>
                      )}
                      {showSlotLink && (
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => { navigate("/cpanel?tab=games"); setMenuOpen(false); }}>
                          <Gamepad2 className="h-3.5 w-3.5 mr-2" /> Slot Panel
                        </Button>
                      )}
                      {isOwner && (
                        <Button variant="ghost" size="sm" className="w-full justify-start text-casino-gold" onClick={() => { navigate("/owner-panel"); setMenuOpen(false); }}>
                          <Shield className="h-3.5 w-3.5 mr-2" /> Owner Panel
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
              <Button variant="ghost" className="w-full" onClick={() => { signOut(); setMenuOpen(false); }}>
                <LogOut className="h-4 w-4 mr-1" /> Log Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="w-full" onClick={() => { navigate("/login"); setMenuOpen(false); }}>
                Log In
              </Button>
              <Button variant="gold" className="w-full" onClick={() => { navigate("/signup"); setMenuOpen(false); }}>
                Sign Up
              </Button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
