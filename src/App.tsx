import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { AuthProvider } from "./hooks/useAuth";
import { GameServerProvider } from "./hooks/useGameServer";
import { WebBluetoothProvider, useWebBluetooth } from "./hooks/useWebBluetooth";

const queryClient = new QueryClient();

const GameServerWithBluetooth = ({ children }: { children: React.ReactNode }) => {
  const webBluetooth = useWebBluetooth();
  return (
    <GameServerProvider webBluetooth={webBluetooth}>
      {children}
    </GameServerProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WebBluetoothProvider>
            <GameServerWithBluetooth>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </GameServerWithBluetooth>
          </WebBluetoothProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;