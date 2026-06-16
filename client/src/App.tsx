import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import TrustPulseTicker from "@/components/TrustPulseTicker";
import { CustomerProvider, useCustomer } from "@/hooks/useCustomer";
import { CustomerLoginModal } from "@/components/CustomerLoginModal";
import { BottomNav } from "@/components/BottomNav";
import { CartProvider } from "@/lib/cart";
import { createContext, useContext, useState, useEffect, lazy, Suspense } from "react";
import { useToast } from "@/hooks/use-toast";
import { Wrench, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Eagerly loaded (critical path) ── */
import Home from "@/pages/Home";
import Games from "@/pages/Games";
import GameDetail from "@/pages/GameDetail";

/* ── Lazily loaded (non-critical) ── */
const Order           = lazy(() => import("@/pages/Order"));
const MyOrders        = lazy(() => import("@/pages/MyOrders"));
const Chat            = lazy(() => import("@/pages/Chat"));
const Contact         = lazy(() => import("@/pages/Contact"));
const Guide           = lazy(() => import("@/pages/Guide"));
const BotPanel        = lazy(() => import("@/pages/BotPanel"));
const WalletDeposit   = lazy(() => import("@/pages/WalletDeposit"));
const CustomerDashboard = lazy(() => import("@/pages/CustomerDashboard"));
const Developer       = lazy(() => import("@/pages/Developer"));
const SellAccount     = lazy(() => import("@/pages/SellAccount"));
const Accounts        = lazy(() => import("@/pages/Accounts"));
const AccountOrder    = lazy(() => import("@/pages/AccountOrder"));
const AccountTracking = lazy(() => import("@/pages/AccountTracking"));
const Cart            = lazy(() => import("@/pages/Cart"));
const SupportChat     = lazy(() => import("@/pages/SupportChat"));
const Community       = lazy(() => import("@/pages/Community"));
const PostDetail        = lazy(() => import("@/pages/PostDetail"));
const CompleteProfile   = lazy(() => import("@/pages/CompleteProfile"));
const Leaderboard       = lazy(() => import("@/pages/Leaderboard"));
const Competitions      = lazy(() => import("@/pages/Competitions"));
const Sardarb           = lazy(() => import("@/pages/Sardarb"));
const VirtualNumbers    = lazy(() => import("@/pages/VirtualNumbers"));
const RoyalBroker       = lazy(() => import("@/pages/RoyalBroker"));
const NotFound          = lazy(() => import("@/pages/not-found"));

/* ── Admin (lazily loaded, only for admins) ── */
const AdminLayout         = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminDashboard      = lazy(() => import("@/pages/admin/Dashboard"));
const AdminAnalytics      = lazy(() => import("@/pages/admin/Analytics"));
const AdminOrders         = lazy(() => import("@/pages/admin/Orders"));
const AdminGames          = lazy(() => import("@/pages/admin/Games"));
const AdminPayments       = lazy(() => import("@/pages/admin/Payments"));
const AdminSettings       = lazy(() => import("@/pages/admin/Settings"));
const AdminChat           = lazy(() => import("@/pages/admin/Chat"));
const AdminWalletRequests = lazy(() => import("@/pages/admin/WalletRequests"));
const AdminUsers          = lazy(() => import("@/pages/admin/Users"));
const AdminSellRequests   = lazy(() => import("@/pages/admin/SellRequests"));
const AdminSupportChat    = lazy(() => import("@/pages/admin/SupportChat"));
const AdminAccountOrders     = lazy(() => import("@/pages/admin/AccountOrders"));
const AdminCommunityPosts    = lazy(() => import("@/pages/admin/CommunityPosts"));
const AdminCommunityComments = lazy(() => import("@/pages/admin/CommunityComments"));
const AdminDiscountCodes     = lazy(() => import("@/pages/admin/DiscountCodes"));
const AdminModerators        = lazy(() => import("@/pages/admin/Moderators"));
const AdminCompetitions      = lazy(() => import("@/pages/admin/Competitions"));
const AdminSardarb           = lazy(() => import("@/pages/admin/Sardarb"));
const AdminVirtualNumbers    = lazy(() => import("@/pages/admin/VirtualNumbers"));
const AdminBroker            = lazy(() => import("@/pages/admin/BrokerAdmin"));
const AdminAllOrders         = lazy(() => import("@/pages/admin/AllOrders"));

/* ── Page loading fallback ── */
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="w-7 h-7 text-primary/50 animate-spin" />
    </div>
  );
}

interface SiteSettings {
  maintenance_mode?: string;
  enable_whatsapp_support?: string;
  enable_social_links?: string;
  enable_payment_proof?: string;
  enable_order_tracking?: string;
  site_name?: string;
  site_description?: string;
  welcome_message?: string;
  support_hours?: string;
  [key: string]: string | undefined;
}

const SiteSettingsContext = createContext<SiteSettings>({});
export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <div className="text-center p-8 max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Wrench className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-4 text-foreground">الموقع تحت الصيانة</h1>
        <p className="text-muted-foreground mb-2">نقوم حالياً بتحديث الموقع لتقديم خدمة أفضل</p>
        <p className="text-muted-foreground text-sm">سنعود قريباً إن شاء الله</p>
        <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-sm text-muted-foreground">للتواصل معنا:</p>
          <a href="https://wa.me/+201553389396" className="text-primary font-medium text-sm" target="_blank" rel="noopener noreferrer" data-testid="link-maintenance-whatsapp">
            واتساب: 01553389396
          </a>
        </div>
      </div>
    </div>
  );
}

function RequireLogin({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useCustomer();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <div className="min-h-[30vh]" />
        <CustomerLoginModal
          open={true}
          onClose={() => setLocation("/")}
        />
      </>
    );
  }

  return <>{children}</>;
}

function PublicRouter() {
  const [location] = useLocation();
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/games" component={Games} />
            <Route path="/games/:slug" component={GameDetail} />
            <Route path="/order/:slug/:packageId">
              {() => <RequireLogin><Order /></RequireLogin>}
            </Route>
            <Route path="/cart">
              {() => <RequireLogin><Cart /></RequireLogin>}
            </Route>
            <Route path="/my-orders">
              <RequireLogin><MyOrders /></RequireLogin>
            </Route>
            <Route path="/chat/:orderId">
              <RequireLogin><Chat /></RequireLogin>
            </Route>
            <Route path="/contact" component={Contact} />
            <Route path="/guide" component={Guide} />
            <Route path="/wallet">
              <RequireLogin><WalletDeposit /></RequireLogin>
            </Route>
            <Route path="/dashboard">
              <RequireLogin><CustomerDashboard /></RequireLogin>
            </Route>
            <Route path="/support-chat">
              <RequireLogin><SupportChat /></RequireLogin>
            </Route>
            <Route path="/accounts" component={Accounts} />
            <Route path="/account-order/:accountId" component={AccountOrder} />
            <Route path="/account-tracking" component={AccountTracking} />
            <Route path="/sell-account" component={SellAccount} />
            <Route path="/community" component={Community} />
            <Route path="/community/:id" component={PostDetail} />
            <Route path="/leaderboard" component={Leaderboard} />
            <Route path="/competitions" component={Competitions} />
            <Route path="/sardarb" component={Sardarb} />
            <Route path="/virtual-numbers" component={VirtualNumbers} />
            <Route path="/royal-broker" component={RoyalBroker} />
            <Route path="/complete-profile" component={CompleteProfile} />
            <Route path="/developer" component={Developer} />
            <Route component={NotFound} />
          </Switch>
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
}

function AdminRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminLayout>
        <Switch>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/analytics" component={AdminAnalytics} />
          <Route path="/admin/orders" component={AdminOrders} />
          <Route path="/admin/games" component={AdminGames} />
          <Route path="/admin/payments" component={AdminPayments} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route path="/admin/chat" component={AdminChat} />
          <Route path="/admin/support" component={AdminSupportChat} />
          <Route path="/admin/wallet-requests" component={AdminWalletRequests} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/sell-requests" component={AdminSellRequests} />
          <Route path="/admin/account-orders" component={AdminAccountOrders} />
          <Route path="/admin/community/posts" component={AdminCommunityPosts} />
          <Route path="/admin/community/comments" component={AdminCommunityComments} />
          <Route path="/admin/discount-codes" component={AdminDiscountCodes} />
          <Route path="/admin/moderators" component={AdminModerators} />
          <Route path="/admin/competitions" component={AdminCompetitions} />
          <Route path="/admin/all-orders" component={AdminAllOrders} />
          <Route path="/admin/sardarb" component={AdminSardarb} />
          <Route path="/admin/virtual-numbers" component={AdminVirtualNumbers} />
          <Route path="/admin/broker" component={AdminBroker} />
          <Route component={AdminDashboard} />
        </Switch>
      </AdminLayout>
    </Suspense>
  );
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function GoogleLoginHandler() {
  const { login, refreshCustomer } = useCustomer();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleLogin = params.get("google_login");
    const googleError = params.get("google_error");
    const token = params.get("token");

    if (googleLogin === "success" && token) {
      localStorage.setItem("customer_token", token);
      refreshCustomer().then(() => {
        toast({ title: "مرحباً! 👋", description: "تم تسجيل الدخول بجوجل بنجاح" });
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("google_login");
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
    }

    if (googleError) {
      const messages: Record<string, string> = {
        no_code: "فشل الاتصال بجوجل",
        token_failed: "فشل الحصول على بيانات جوجل",
        no_profile: "لم يتم الحصول على بياناتك من جوجل",
        banned: "تم حظر هذا الحساب",
        server_error: "خطأ في الخادم، حاول مرة أخرى",
      };
      toast({ title: "خطأ", description: messages[googleError] || "حدث خطأ ما", variant: "destructive" });
      const url = new URL(window.location.href);
      url.searchParams.delete("google_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  return null;
}

function AppContent() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith("/admin");
  const isBotRoute = location === "/bot";

  const { data: siteSettings = {} } = useQuery<SiteSettings>({
    queryKey: ["/api/public/settings"],
    refetchInterval: 60000,
  });

  const isMaintenanceMode = siteSettings.maintenance_mode === "true" && !isAdminRoute && !isBotRoute;

  return (
    <SiteSettingsContext.Provider value={siteSettings}>
      <CustomerProvider>
        <GoogleLoginHandler />
        <ScrollToTop />
        {isMaintenanceMode ? (
          <MaintenancePage />
        ) : isBotRoute ? (
          <Suspense fallback={<PageLoader />}><BotPanel /></Suspense>
        ) : isAdminRoute ? (
          <AdminRouter />
        ) : (
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 pb-16 md:pb-0">
              <PublicRouter />
            </main>
            <TrustPulseTicker />
            <Footer />
            <BottomNav />
          </div>
        )}
      </CustomerProvider>
    </SiteSettingsContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
