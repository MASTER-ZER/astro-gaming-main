import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, Gamepad2, MessageCircle, Package, HelpCircle, Wallet, User, LogOut, Code, ShoppingCart, Headphones, UserCircle, TrendingUp, X, Users, Trophy, ShoppingBag, Smartphone, Crown } from "lucide-react";
import { useState, useEffect } from "react";
import { useCustomer } from "@/hooks/useCustomer";
import { CustomerLoginModal } from "@/components/CustomerLoginModal";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import logoImage from "@assets/IMG-20260310-WA0032_1773642840088.jpg";
import { useCart } from "@/lib/cart";

const navLinks = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/games", label: "الألعاب", icon: Gamepad2 },
  { href: "/accounts", label: "الحسابات", icon: UserCircle },
  { href: "/community", label: "المجتمع", icon: Users },
  { href: "/competitions", label: "مسابقات", icon: Trophy },
  { href: "/sardarb", label: "السرداب", icon: ShoppingBag },
  { href: "/virtual-numbers", label: "الأرقام الفيك", icon: Smartphone },
  { href: "/royal-broker", label: "طلبات خاصة", icon: Crown },
  { href: "/leaderboard", label: "المتصدرين", icon: Trophy },
  { href: "/sell-account", label: "بيع حسابك", icon: TrendingUp },
  { href: "/my-orders", label: "طلباتي", icon: Package },
  { href: "/guide", label: "الدليل", icon: HelpCircle },
  { href: "/contact", label: "التواصل", icon: MessageCircle },
  { href: "/developer", label: "المطور", icon: Code },
];

export function Header() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { customer, isLoggedIn, logout } = useCustomer();
  const { itemCount } = useCart();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/customer/inbox/unread-count"],
    enabled: isLoggedIn,
    refetchInterval: 60000,
  });
  const unreadCount = unreadData?.count || 0;

  const { data: chatUnreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/support/unread"],
    queryFn: async () => {
      const token = localStorage.getItem("customer_token") || sessionStorage.getItem("customer_token");
      if (!token) return { count: 0 };
      const res = await fetch("/api/support/unread", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    enabled: isLoggedIn,
    refetchInterval: 60000,
  });
  const chatUnreadCount = chatUnreadData?.count || 0;

  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-colors duration-200 ${scrolled ? "glass-header-solid" : "glass-header"}`}
      >
        <div className="container mx-auto px-3 sm:px-4">
          <div className={`flex items-center gap-2 sm:gap-4 transition-all duration-200 ${scrolled ? "h-13" : "h-14 sm:h-16"}`}>

            {/* Left: Nav */}
            <div className="flex-1 flex items-center">
              <nav className="hidden md:flex items-center gap-0.5">
                {navLinks.map((link) => {
                  const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
                  return (
                    <Link key={link.href} href={link.href}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`relative text-xs px-3 py-1.5 rounded-lg transition-colors duration-150 ${
                          isActive
                            ? "text-primary bg-primary/8 font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        }`}
                        data-testid={`nav-${link.href.replace("/", "") || "home"}`}
                      >
                        <link.icon className="w-3.5 h-3.5 ml-1" />
                        {link.label}
                        {isActive && (
                          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Center: Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0" data-testid="link-logo">
              <div
                className={`rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-primary/25 shadow-lg transition-all duration-200 ${scrolled ? "w-8 h-8" : "w-9 h-9 sm:w-10 sm:h-10"}`}
              >
                <img src={logoImage} alt="ASTRO" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <h1
                  className="font-extrabold text-gradient-gold-animated tracking-wide leading-tight transition-all duration-200"
                  style={{ fontSize: scrolled ? "1rem" : "1.15rem" }}
                >
                  ASTRO
                </h1>
                {!scrolled && (
                  <p className="text-[9px] text-muted-foreground/60 -mt-0.5 hidden sm:block tracking-widest uppercase">
                    Gaming Store
                  </p>
                )}
              </div>
            </Link>

            {/* Right: Actions */}
            <div className="flex-1 flex items-center justify-end gap-1">
              {isLoggedIn && (
                <Link href="/support-chat">
                  <Button variant="ghost" size="icon" className="relative w-8 h-8 rounded-lg" data-testid="button-support-chat">
                    <Headphones className="w-4 h-4" />
                    {chatUnreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-[9px] bg-red-500 text-white border-0">
                        {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              )}
              <Link href="/cart">
                <Button variant="ghost" size="icon" className="relative w-8 h-8 rounded-lg" data-testid="button-cart">
                  <ShoppingCart className="w-4 h-4" />
                  {itemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-[9px] bg-primary text-white border-0">
                      {itemCount > 9 ? "9+" : itemCount}
                    </Badge>
                  )}
                </Button>
              </Link>

              {isLoggedIn && customer ? (
                <div className="hidden md:flex items-center gap-1.5">
                  <Link href="/wallet">
                    <Button variant="outline" size="sm" className="gap-1.5 border-primary/20 hover:border-primary/40 h-8 px-2.5 text-xs rounded-lg" data-testid="button-wallet">
                      <Wallet className="w-3.5 h-3.5 text-primary" />
                      <span className="font-bold text-primary">{customer.balance}</span>
                      <span className="text-muted-foreground">ج</span>
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="gap-1.5 relative h-8 px-2.5 text-xs rounded-lg" data-testid="button-dashboard">
                      <User className="w-3.5 h-3.5" />
                      {customer.username}
                      {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 flex items-center justify-center text-[9px] bg-primary text-white border-0">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={logout} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-red-400" data-testid="button-logout">
                    <LogOut className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="hidden md:block">
                  <Button
                    size="sm"
                    onClick={() => setShowLogin(true)}
                    className="hero-cta-primary h-8 px-4 text-xs rounded-lg"
                    data-testid="button-login"
                  >
                    <User className="w-3.5 h-3.5 ml-1" />
                    دخول
                  </Button>
                </div>
              )}

              <Button variant="ghost" size="icon" className="md:hidden w-8 h-8 rounded-lg" onClick={() => setIsOpen(true)} data-testid="button-mobile-menu">
                <Menu className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed top-0 right-0 bottom-0 z-[70] w-72 flex flex-col md:hidden"
            style={{
              background: "rgba(4, 8, 20, 0.99)",
              borderLeft: "1px solid rgba(0, 144, 255, 0.12)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.6)",
            }}
            dir="rtl"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-primary/8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-primary/25 flex-shrink-0">
                  <img src={logoImage} alt="ASTRO" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gradient-gold-animated">ASTRO</h2>
                  <p className="text-[10px] text-muted-foreground/60 tracking-widest">GAMING STORE</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Info */}
            {isLoggedIn && customer && (
              <div className="mx-4 mt-3 space-y-2">
                <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                  <div
                    className="p-3 rounded-xl flex items-center justify-between cursor-pointer hover:border-primary/30 transition-colors duration-150 active:scale-[0.98]"
                    style={{ background: "rgba(0,144,255,0.05)", border: "1px solid rgba(0,144,255,0.12)" }}
                    data-testid="mobile-link-profile"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">{customer.username}</p>
                        <p className="text-[10px] text-primary/60">عرض البروفايل ←</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
                      <Wallet className="w-3 h-3 text-primary" />
                      <span className="text-xs font-black text-primary">{customer.balance}</span>
                      <span className="text-[10px] text-muted-foreground">ج</span>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Nav Links */}
            <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
              {navLinks.map((link) => {
                const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
                return (
                  <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)}>
                    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-150 cursor-pointer ${
                      isActive
                        ? "bg-primary/12 border border-primary/20 text-primary"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    }`} data-testid={`mobile-nav-${link.href.replace("/", "") || "home"}`}>
                      <link.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                      <span className={`text-sm font-medium ${isActive ? "font-semibold" : ""}`}>{link.label}</span>
                      {isActive && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                    </div>
                  </Link>
                );
              })}
              {isLoggedIn && (
                <Link href="/support-chat" onClick={() => setIsOpen(false)}>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors duration-150 cursor-pointer" data-testid="mobile-nav-support-chat">
                    <Headphones className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">الدعم الفني</span>
                    {chatUnreadCount > 0 && (
                      <Badge className="mr-auto bg-red-500 text-white text-[9px] h-4 px-1 border-0">{chatUnreadCount}</Badge>
                    )}
                  </div>
                </Link>
              )}
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-primary/8">
              {isLoggedIn ? (
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-red-500/8 hover:text-red-400 transition-colors duration-150"
                  onClick={() => { logout(); setIsOpen(false); }}
                  data-testid="mobile-button-logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">تسجيل الخروج</span>
                </button>
              ) : (
                <button
                  className="w-full hero-cta-primary py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm text-white"
                  onClick={() => { setShowLogin(true); setIsOpen(false); }}
                  data-testid="mobile-button-login"
                >
                  <User className="w-4 h-4" />
                  دخول / تسجيل
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <CustomerLoginModal open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
}
