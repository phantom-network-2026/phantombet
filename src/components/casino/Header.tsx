import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Menu, X, ArrowDownToLine, User, Gamepad2, Settings, ChevronDown, Wallet, TrendingUp } from "lucide-react";
import { Globe } from "lucide-react";
import { FakeWinsTicker } from "./FakeWinsTicker";
import { BalanceDisplay } from "./BalanceDisplay";
import { ProfileAvatar } from "./ProfileAvatar";
import { NotificationBell } from "./NotificationBell";
import { useLanguage, LANGUAGES } from "@/hooks/useLanguage";
import { CurrencyPicker } from "./CurrencyPicker";
import logo from "@/assets/phantom-network-logo.png";

export function Header() {
  const { user, profile, isAdmin, isOwner, hasStaffAccess, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, lang, setLang, currentLanguage } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [langExpanded, setLangExpanded] = useState(false);
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
      <div className="container flex h-14 items-center justify-between overflow-hidden">
        <Link to="/casino" className="flex items-center gap-2 shrink-0">
          <img
            src={logo}
            alt="Phantom Network"
            className="h-9 w-9 shrink-0 drop-shadow-[0_0_10px_hsl(270_70%_60%/0.6)]"
          />
          <div className="leading-tight">
            {!user && (
              <>
                <div className="font-display font-black text-sm sm:text-base tracking-wide bg-gradient-to-r from-casino-gold via-amber-200 to-casino-gold bg-clip-text text-transparent">
                  PHANTOM NETWORK
                </div>
                <div className="text-[9px] tracking-[0.3em] text-muted-foreground -mt-0.5 uppercase">
                  Phantom Casino
                </div>
              </>
            )}
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <BalanceDisplay size="md" />
              <Button variant="gold" size="sm" disabled title="Disabled during testing phase — launching early June 2026" className="opacity-50 cursor-not-allowed">
                {t("deposit")}
              </Button>
              <Button variant="pink" size="sm" disabled title="Disabled during testing phase — launching early June 2026" className="opacity-50 cursor-not-allowed">
                <ArrowDownToLine className="h-4 w-4 mr-1" /> {t("withdraw")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/exchange")} className="text-casino-gold">
                <TrendingUp className="h-4 w-4 mr-1" /> Exchange
              </Button>
              {hasStaffAccess && showCpanelLink && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/cpanel")} className="text-casino-pink">
                  <Shield className="h-4 w-4 mr-1" /> cPanel
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
                {t("login")}
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-8 px-2 text-casino-gold" onClick={() => navigate("/exchange")}>
                <TrendingUp className="h-4 w-4 mr-1" /> Exchange
              </Button>
              <Button variant="gold" size="sm" className="text-xs h-8 px-3" onClick={() => navigate("/signup")}>
                {t("signup")}
              </Button>
            </>
          )}
        </div>

        {/* Mobile: guest auth buttons or user controls + menu toggle */}
        <div className="flex md:hidden items-center gap-1 min-w-0">
          {user ? (
            <>
              <div className="min-w-0 overflow-hidden"><BalanceDisplay size="sm" /></div>
              <NotificationBell />
              <button onClick={() => navigate("/wallet")} className="text-casino-gold shrink-0 p-0.5">
                <Wallet className="h-4 w-4" />
              </button>
              <button onClick={() => navigate("/profile")} className="shrink-0">
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
          <button className="text-foreground shrink-0 p-1" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-3 animate-slide-up">
          {user ? (
            <>
              <Button variant="outline" className="w-full" onClick={() => { navigate("/profile"); setMenuOpen(false); }}>
                <User className="h-4 w-4 mr-1" /> {t("profile")}
              </Button>
              <div className="flex gap-2">
                <Button variant="gold" className="flex-1 opacity-50 cursor-not-allowed" disabled title="Disabled during testing phase">
                  {t("deposit")}
                </Button>
                <Button variant="pink" className="flex-1 opacity-50 cursor-not-allowed" disabled title="Disabled during testing phase">
                  <ArrowDownToLine className="h-4 w-4 mr-1" /> {t("withdraw")}
                </Button>
              </div>
              <Button variant="outline" className="w-full text-casino-gold" onClick={() => { navigate("/exchange"); setMenuOpen(false); }}>
                <TrendingUp className="h-4 w-4 mr-1" /> Exchange
              </Button>
              {hasStaffAccess && (showAdminLink || showCpanelLink || showSlotLink) && (
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full text-casino-pink justify-between"
                    onClick={() => setAdminExpanded(!adminExpanded)}
                  >
                    <span className="flex items-center">
                      <Shield className="h-4 w-4 mr-1" /> {t("admin")}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${adminExpanded ? "rotate-180" : ""}`} />
                  </Button>
                  {adminExpanded && (
                    <div className="ml-6 space-y-1 border-l border-border pl-3">
                      {showCpanelLink && (
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => { navigate("/cpanel"); setMenuOpen(false); }}>
                          <Settings className="h-3.5 w-3.5 mr-2" /> cPanel
                        </Button>
                      )}
                      {showSlotLink && (
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => { navigate("/cpanel?tab=games"); setMenuOpen(false); }}>
                          <Gamepad2 className="h-3.5 w-3.5 mr-2" /> Game Panel
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="w-full justify-start text-sky-400" onClick={() => { navigate("/staff-panel"); setMenuOpen(false); }}>
                        <Shield className="h-3.5 w-3.5 mr-2" /> Staff Panel
                      </Button>
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
                <LogOut className="h-4 w-4 mr-1" /> {t("logout")}
              </Button>

              {/* Language Selector */}
              <div className="space-y-1 border-t border-border pt-3">
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={() => setLangExpanded(!langExpanded)}
                >
                  <span className="flex items-center">
                    <Globe className="h-4 w-4 mr-1" /> {currentLanguage.flag} {t("language")}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${langExpanded ? "rotate-180" : ""}`} />
                </Button>
                {langExpanded && (
                  <div className="ml-2 grid grid-cols-2 gap-1 max-h-52 overflow-y-auto">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => { setLang(l.code); setLangExpanded(false); }}
                        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted ${lang === l.code ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`}
                      >
                        <span>{l.flag}</span>
                        <span className="truncate">{l.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" className="w-full" onClick={() => { navigate("/login"); setMenuOpen(false); }}>
                {t("login")}
              </Button>
              <Button variant="gold" className="w-full" onClick={() => { navigate("/signup"); setMenuOpen(false); }}>
                {t("signup")}
              </Button>
              <Button variant="outline" className="w-full text-casino-gold" onClick={() => { navigate("/exchange"); setMenuOpen(false); }}>
                <TrendingUp className="h-4 w-4 mr-1" /> Exchange
              </Button>

              {/* Language Selector for guests */}
              <div className="space-y-1 border-t border-border pt-3">
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={() => setLangExpanded(!langExpanded)}
                >
                  <span className="flex items-center">
                    <Globe className="h-4 w-4 mr-1" /> {currentLanguage.flag} {t("language")}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${langExpanded ? "rotate-180" : ""}`} />
                </Button>
                {langExpanded && (
                  <div className="ml-2 grid grid-cols-2 gap-1 max-h-52 overflow-y-auto">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => { setLang(l.code); setLangExpanded(false); }}
                        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted ${lang === l.code ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`}
                      >
                        <span>{l.flag}</span>
                        <span className="truncate">{l.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
