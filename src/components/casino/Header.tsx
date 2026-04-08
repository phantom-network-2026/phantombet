import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut, Shield, Menu, X, ArrowDownToLine } from "lucide-react";
import logo from "@/assets/bitbet-logo.svg";

export function Header() {
  const { user, profile, isAdmin, hasStaffAccess, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="BitBet" className="h-10 w-10" />
          <span className="font-display text-xl font-bold text-gold">BitBet</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5">
                <Wallet className="h-4 w-4 text-casino-gold" />
                <span className="font-display font-bold text-casino-gold">
                  ${profile?.balance?.toFixed(2) ?? "0.00"}
                </span>
              </div>
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

        {/* Mobile menu toggle */}
        <button className="md:hidden text-foreground" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-3 animate-slide-up">
          {user ? (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
                <Wallet className="h-4 w-4 text-casino-gold" />
                <span className="font-display font-bold text-casino-gold">
                  ${profile?.balance?.toFixed(2) ?? "0.00"}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="gold" className="flex-1" onClick={() => { navigate("/deposit"); setMenuOpen(false); }}>
                  Deposit
                </Button>
                <Button variant="pink" className="flex-1" onClick={() => { navigate("/withdraw"); setMenuOpen(false); }}>
                  <ArrowDownToLine className="h-4 w-4 mr-1" /> Withdraw
                </Button>
              </div>
              {hasStaffAccess && (
                <Button variant="ghost" className="w-full text-casino-pink" onClick={() => { navigate("/admin"); setMenuOpen(false); }}>
                  <Shield className="h-4 w-4 mr-1" /> Admin Panel
                </Button>
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
