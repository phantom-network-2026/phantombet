import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { usePresence } from "@/hooks/usePresence";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Admin from "./pages/Admin.tsx";
import GameDetail from "./pages/GameDetail.tsx";
import Promotions from "./pages/Promotions.tsx";
import Deposit from "./pages/Deposit.tsx";
import Withdraw from "./pages/Withdraw.tsx";
import SearchPage from "./pages/Search.tsx";
import CategoryPage from "./pages/CategoryPage.tsx";
import Friends from "./pages/Friends.tsx";
import Messages from "./pages/Messages.tsx";
import ScratchCard from "./pages/ScratchCard.tsx";
import Blackjack from "./pages/Blackjack.tsx";
import SlotCowboy from "./pages/SlotCowboy.tsx";
import Roulette from "./pages/Roulette.tsx";
import Profile from "./pages/Profile.tsx";
import GamesPage from "./pages/Games.tsx";
import PrizeReel from "./pages/PrizeReel.tsx";
import CPanel from "./pages/CPanel.tsx";
import OwnerPanel from "./pages/OwnerPanel.tsx";
import PennyRoulette from "./pages/PennyRoulette.tsx";
import Help from "./pages/Help.tsx";
import Exchange from "./pages/Exchange.tsx";
import Wallet from "./pages/Wallet.tsx";

// New HTML5 games
import ChickenCross from "./pages/games/ChickenCross.tsx";
import ScratchRoyale from "./pages/games/ScratchRoyale.tsx";
import CryptoCall from "./pages/games/CryptoCall.tsx";
import CutWirePro from "./pages/games/CutWirePro.tsx";
import HeadAndTail from "./pages/games/HeadAndTail.tsx";
import HeroCasino from "./pages/games/HeroCasino.tsx";
import MeterCrash from "./pages/games/MeterCrash.tsx";
import Dream11 from "./pages/games/Dream11.tsx";
import JackpotHighway from "./pages/games/JackpotHighway.tsx";
import MarvelBetting from "./pages/games/MarvelBetting.tsx";
import NeonBounce from "./pages/games/NeonBounce.tsx";
import PlaneCrash from "./pages/games/PlaneCrash.tsx";
import PlinkoPro from "./pages/games/PlinkoPro.tsx";
import RaceKings from "./pages/games/RaceKings.tsx";
import RoyalDerby from "./pages/games/RoyalDerby.tsx";
import RoyalHeist from "./pages/games/RoyalHeist.tsx";
import SafeDoor from "./pages/games/SafeDoor.tsx";
import SpinWheelRoyale from "./pages/games/SpinWheelRoyale.tsx";
import StackUpCasino from "./pages/games/StackUpCasino.tsx";
import StakeMines from "./pages/games/StakeMines.tsx";
import ScatterBomb from "./pages/games/ScatterBomb.tsx";

const queryClient = new QueryClient();

function PresenceTracker({ children }: { children: React.ReactNode }) {
  usePresence();
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PresenceTracker>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/game/:id" element={<GameDetail />} />
              <Route path="/promotions" element={<Promotions />} />
              <Route path="/deposit" element={<Deposit />} />
              <Route path="/withdraw" element={<Withdraw />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/category/:category" element={<CategoryPage />} />
              <Route path="/games" element={<GamesPage />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/messages/:friendId" element={<Messages />} />
              <Route path="/scratch-card" element={<ScratchCard />} />
              <Route path="/blackjack" element={<Blackjack />} />
              <Route path="/slot-cowboy" element={<SlotCowboy />} />
              <Route path="/roulette" element={<Roulette />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/prize-reel" element={<PrizeReel />} />
              <Route path="/cpanel" element={<CPanel />} />
              <Route path="/owner-panel" element={<OwnerPanel />} />
              <Route path="/penny-roulette" element={<PennyRoulette />} />
              <Route path="/help" element={<Help />} />
              <Route path="/exchange" element={<Exchange />} />
              <Route path="/wallet" element={<Wallet />} />
              {/* New HTML5 games */}
              <Route path="/chicken-cross" element={<ChickenCross />} />
              <Route path="/scratch-royale" element={<ScratchRoyale />} />
              <Route path="/crypto-call" element={<CryptoCall />} />
              <Route path="/cut-wire-pro" element={<CutWirePro />} />
              <Route path="/head-and-tail" element={<HeadAndTail />} />
              <Route path="/hero-casino" element={<HeroCasino />} />
              <Route path="/meter-crash" element={<MeterCrash />} />
              <Route path="/dream-11" element={<Dream11 />} />
              <Route path="/jackpot-highway" element={<JackpotHighway />} />
              <Route path="/marvel-betting" element={<MarvelBetting />} />
              <Route path="/neon-bounce" element={<NeonBounce />} />
              <Route path="/plane-crash" element={<PlaneCrash />} />
              <Route path="/plinko-pro" element={<PlinkoPro />} />
              <Route path="/race-kings" element={<RaceKings />} />
              <Route path="/royal-derby" element={<RoyalDerby />} />
              <Route path="/royal-heist" element={<RoyalHeist />} />
              <Route path="/safe-door" element={<SafeDoor />} />
              <Route path="/spin-wheel-royale" element={<SpinWheelRoyale />} />
              <Route path="/stack-up-casino" element={<StackUpCasino />} />
              <Route path="/stake-mines" element={<StakeMines />} />
              <Route path="/scatter-bomb" element={<ScatterBomb />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PresenceTracker>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
