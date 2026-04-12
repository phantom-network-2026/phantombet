import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Shield, Menu, X, ArrowDownToLine, User, Gamepad2, Settings, ChevronDown } from "lucide-react";
import { FakeWinsTicker } from "./FakeWinsTicker";
import { BalanceDisplay } from "./BalanceDisplay";
import logo from "@/assets/phantombet-logo.png";

export function Header() {
  const { user, profile, isAdmin, hasStaffAccess, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <FakeWinsTicker />
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="PhantomBet" className="h-8 w-8" />
          <span className="font-display text-lg font-bold text-gold hidden sm:inline">PhantomBet</span>
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
              {hasStaffAccess && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="text-casino-pink">
                  <Shield className="h-4 w-4 mr-1" /> Admin
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="text-casino-gold p-1">
                <Avatar className="h-7 w-7">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className="bg-secondary text-casino-gold text-xs">{profile?.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                Log In
              </Button>
              <Button variant="gold" size="sm" onClick={() => navigate("/signup")}>
                Sign Up
              </Button>
            </>
          )}
        </div>

        {/* Mobile: balance + profile + menu toggle */}
        <div className="flex md:hidden items-center gap-2">
          {user && (
            <>
              <BalanceDisplay size="sm" />
              <button onClick={() => navigate("/profile")}>
                <Avatar className="h-7 w-7">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                  <AvatarFallback className="bg-secondary text-casino-gold text-xs">{profile?.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
              </button>
            </>
          )}
          <button className="text-foreground" onClick={() => setMenuOpen(!menuOpen)}>
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
              {hasStaffAccess && (
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
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => { navigate("/admin"); setMenuOpen(false); }}>
                        <Shield className="h-3.5 w-3.5 mr-2" /> Admin Panel
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => { navigate("/cpanel"); setMenuOpen(false); }}>
                        <Settings className="h-3.5 w-3.5 mr-2" /> cPanel
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => { navigate("/cpanel?tab=games"); setMenuOpen(false); }}>
                        <Gamepad2 className="h-3.5 w-3.5 mr-2" /> Slot Panel
                      </Button>
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
