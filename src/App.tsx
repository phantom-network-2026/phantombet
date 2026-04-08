import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
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
            <Route path="/friends" element={<Friends />} />
            <Route path="/messages/:friendId" element={<Messages />} />
            <Route path="/scratch-card" element={<ScratchCard />} />
            <Route path="/blackjack" element={<Blackjack />} />
            <Route path="/slot-cowboy" element={<SlotCowboy />} />
            <Route path="/roulette" element={<Roulette />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
