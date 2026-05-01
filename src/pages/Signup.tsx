import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import WelcomeBanner from "@/components/casino/WelcomeBanner";
import SignupPrivacyBanner from "@/components/casino/SignupPrivacyBanner";
import logo from "@/assets/phantombet-logo.png";
import { Copy, Shield, AlertTriangle } from "lucide-react";
import { LanguagePicker } from "@/components/casino/LanguagePicker";
import { toast } from "sonner";
import ConnectingSplash from "@/components/casino/ConnectingSplash";

const WORD_LIST = [
  "alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel","india","juliet",
  "kilo","lima","mike","november","oscar","papa","quebec","romeo","sierra","tango",
  "uniform","victor","whiskey","xray","yankee","zulu","anchor","blaze","cipher","dawn",
  "ember","frost","ghost","hawk","iron","jade","knight","lotus","myth","nexus",
  "onyx","prism","quest","raven","storm","titan","ultra","venom","wraith","zenith",
  "apex","bolt","crest","drift","edge","flame","grit","haze","ink","jolt",
  "keen","lumen","mist","nova","orbit","pulse","reef","sage","tide","vibe",
  "warp","axle","bliss","cove","dusk","flux","gleam","haven","isle","jewel",
  "karma","lark","maze","neon","opal","peak","quartz","ridge","silk","thorn",
  "vale","wren","arc","brim","clay","dune","fern","glen","hue","ivy",
];

function generateSeedPhrase(): string {
  const words: string[] = [];
  const used = new Set<number>();
  while (words.length < 10) {
    const idx = Math.floor(Math.random() * WORD_LIST.length);
    if (!used.has(idx)) {
      used.add(idx);
      words.push(WORD_LIST[idx]);
    }
  }
  return words.join(" ");
}

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedBonus, setSelectedBonus] = useState("");
  const [step, setStep] = useState<"form" | "seed" | "verify">("form");
  const [confirmed, setConfirmed] = useState(false);
  const [verifyWord, setVerifyWord] = useState("");
  const [verifyIndex, setVerifyIndex] = useState(0);
  const [showSplash, setShowSplash] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const seedPhrase = useMemo(() => generateSeedPhrase(), []);
  const seedWords = seedPhrase.split(" ");

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    // Generate a random verification word index
    setVerifyIndex(Math.floor(Math.random() * 10));
    setStep("seed");
  };

  const handleCopySeed = () => {
    navigator.clipboard.writeText(seedPhrase);
    toast.success("Recovery key copied to clipboard!");
  };

  const handleConfirmSeed = () => {
    if (!confirmed) {
      toast.error("Please confirm you've saved your recovery key");
      return;
    }
    setStep("verify");
  };

  const handleVerify = async () => {
    if (verifyWord.toLowerCase().trim() !== seedWords[verifyIndex].toLowerCase()) {
      setError(`Incorrect! Word #${verifyIndex + 1} doesn't match.`);
      return;
    }
    setError("");
    setLoading(true);
    
    // Generate a random internal email
    const internalEmail = `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}+${Date.now()}@phantombet.internal`;
    
    const { error: signUpError } = await signUp(internalEmail, password, username);
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Save seed phrase (hashed server-side) via edge function
    await supabase.functions.invoke("set-seed-phrase", {
      body: { seed_phrase: seedPhrase },
    });

    setLoading(false);
    setShowSplash(true);
  };

  if (step === "verify") {
    return (
      <div className="relative min-h-screen gradient-casino-bg flex items-center justify-center p-4">
        {showSplash && (
          <ConnectingSplash onComplete={() => navigate("/casino")} />
        )}
        <div className="absolute top-4 right-4 z-10">
          <LanguagePicker />
        </div>
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <img src={logo} alt="PhantomBet" className="h-16 w-16 mx-auto mb-3" />
            <h1 className="font-display text-2xl font-black text-gold">Verify Your Key</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Enter word <span className="text-casino-gold font-bold">#{verifyIndex + 1}</span> from your recovery key
            </p>
          </div>

          <div className="rounded-xl bg-card border border-casino-gold/30 p-4 space-y-4">
            <div>
              <Label>Word #{verifyIndex + 1}</Label>
              <Input
                value={verifyWord}
                onChange={(e) => setVerifyWord(e.target.value)}
                placeholder={`Enter word #${verifyIndex + 1}`}
                className="bg-secondary border-border mt-1"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button variant="gold" className="w-full" onClick={handleVerify} disabled={loading}>
              {loading ? "Creating account..." : "Verify & Create Account"}
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep("seed")}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "seed") {
    return (
      <div className="relative min-h-screen gradient-casino-bg flex items-center justify-center p-4">
        <div className="absolute top-4 right-4 z-10">
          <LanguagePicker />
        </div>
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <img src={logo} alt="PhantomBet" className="h-16 w-16 mx-auto mb-3" />
            <h1 className="font-display text-2xl font-black text-gold">Your Recovery Key</h1>
            <p className="text-muted-foreground text-sm mt-1">Save this key — it's the ONLY way to recover your account</p>
          </div>

          <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive font-medium">
              If you lose this key, you will PERMANENTLY lose access to your account. There is no other recovery method.
            </p>
          </div>

          <div className="rounded-xl bg-card border border-casino-gold/30 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-casino-gold" />
              <p className="text-xs font-bold text-casino-gold">10-WORD RECOVERY KEY</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {seedWords.map((word, i) => (
                <div key={i} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                  <span className="text-[10px] text-muted-foreground font-mono w-4">{i + 1}.</span>
                  <span className="text-sm font-bold text-foreground">{word}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={handleCopySeed}>
              <Copy className="h-3 w-3 mr-2" /> Copy to Clipboard
            </Button>
          </div>

          <div className="flex items-start gap-2 px-1">
            <Checkbox
              id="confirm-seed"
              checked={confirmed}
              onCheckedChange={(c) => setConfirmed(!!c)}
            />
            <label htmlFor="confirm-seed" className="text-xs text-muted-foreground cursor-pointer">
              I have saved my recovery key securely. I understand this is the ONLY way to recover my account.
            </label>
          </div>

          <Button variant="gold" className="w-full" onClick={handleConfirmSeed} disabled={!confirmed}>
            Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen gradient-casino-bg flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 z-10">
        <LanguagePicker />
      </div>
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <img src={logo} alt="PhantomBet" className="h-16 w-16 mx-auto mb-3" />
          <h1 className="font-display text-3xl font-black text-gold">Join PhantomBet</h1>
          <p className="text-muted-foreground text-sm mt-1">Create your account & start winning</p>
        </div>

        <WelcomeBanner variant="signup" onBonusSelect={setSelectedBonus} selectedBonus={selectedBonus} />

        <SignupPrivacyBanner />

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="bg-secondary border-border" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={1} className="bg-secondary border-border" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="gold" className="w-full">
            Continue
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-casino-gold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
