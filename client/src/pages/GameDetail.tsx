import { useParams, Link, useLocation } from "wouter";
import { trackGameOpen, trackPackageClick } from "@/lib/analytics";
import { paymentMethodsData } from "@/lib/gameData";
import { getGameImage } from "@/lib/gameImages";
import { ParticleBackground } from "@/components/ParticleBackground";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Zap, Loader2, ShoppingCart, Check, Flame, Gem, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import type { Game, Package, PaymentMethod } from "@shared/schema";
import { useCart } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCustomer } from "@/hooks/useCustomer";
import { CustomerLoginModal } from "@/components/CustomerLoginModal";

/* ─── Badge Assignment Logic ─── */
function getPackageBadge(index: number, total: number): { label: string; labelEn: string; icon: typeof Flame; color: string; glow: string } | null {
  if (total <= 1) return null;
  const mid = Math.floor(total / 2);
  const twoThirds = Math.round(total * 0.65);
  if (index === mid) return { label: "الأكثر طلباً", labelEn: "Most Popular", icon: Flame, color: "#ff6b35", glow: "rgba(255,107,53,0.45)" };
  if (total >= 4 && index === twoThirds && twoThirds !== mid)
    return { label: "أفضل قيمة", labelEn: "Best Value", icon: Gem, color: "#0090ff", glow: "rgba(0,144,255,0.45)" };
  if (total >= 6 && index === 1)
    return { label: "Gamer Pick", labelEn: "Gamer Pick", icon: Star, color: "#34d399", glow: "rgba(52,211,153,0.35)" };
  return null;
}

function isFeatured(index: number, total: number) {
  return total > 1 && index === Math.floor(total / 2);
}

export default function GameDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { addItem } = useCart();
  const { toast } = useToast();
  const { isLoggedIn } = useCustomer();
  const [showLogin, setShowLogin] = useState(false);

  const [addToCartPkg, setAddToCartPkg] = useState<any>(null);
  const [cartPlayerId, setCartPlayerId] = useState("");
  const [cartUsername, setCartUsername] = useState("");
  const [cartPassword, setCartPassword] = useState("");
  const [cartLinking, setCartLinking] = useState("");
  const [activeLoginType, setActiveLoginType] = useState<"id" | "account">("id");

  useEffect(() => {
    if (!slug) return;
    const key = "astro_recent_games";
    const current: string[] = JSON.parse(localStorage.getItem(key) || "[]");
    const updated = [slug, ...current.filter((s) => s !== slug)].slice(0, 5);
    localStorage.setItem(key, JSON.stringify(updated));
    trackGameOpen(slug);
  }, [slug]);

  const { data: games = [], isLoading: gamesLoading } = useQuery<Game[]>({ queryKey: ["/api/games"] });
  const { data: allPackages = [], isLoading: packagesLoading } = useQuery<Package[]>({ queryKey: ["/api/packages"] });
  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({ queryKey: ["/api/payment-methods"] });

  const isLoading = gamesLoading || packagesLoading;

  const game = games.find((g) => g.slug === slug);

  const packages = game ? allPackages.filter((p) => p.gameId === game.id) : [];

  const displayPaymentMethods = paymentMethods.length > 0 ? paymentMethods : paymentMethodsData;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-primary" />
        </motion.div>
        <p className="text-muted-foreground text-sm animate-pulse">جاري التحميل…</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-premium p-8 rounded-2xl">
          <h1 className="text-xl font-bold mb-4">اللعبة غير موجودة</h1>
          <Link href="/games">
            <Button>
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للألعاب
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Detect which loginTypes exist among packages
  const hasIdPackages = packages.some((p: any) => p.loginType === "id" || p.loginType == null);
  const hasAccountPackages = packages.some((p: any) => p.loginType === "account");
  const hasBothTypes = hasIdPackages && hasAccountPackages;

  // Default to first available type
  const defaultType: "id" | "account" = hasIdPackages ? "id" : "account";
  const resolvedLoginType: "id" | "account" = hasBothTypes ? activeLoginType : defaultType;

  // Filter packages by active login type when both exist
  const filteredPackages = hasBothTypes
    ? packages.filter((p: any) => p.loginType === resolvedLoginType || (resolvedLoginType === "id" && !p.loginType))
    : packages;

  const categories = Array.from(new Set(filteredPackages.map((p: any) => p.category).filter(Boolean)));
  const hasCategories = categories.length > 0;
  const loginType = addToCartPkg?.loginType || resolvedLoginType;

  const handleOrder = (packageId: string) => {
    if (!isLoggedIn) { setShowLogin(true); return; }
    setLocation(`/order/${game.slug}/${packageId}`);
  };

  const openAddToCart = (pkg: any) => {
    trackPackageClick(pkg.name || pkg.amount, slug);
    if (!isLoggedIn) { setShowLogin(true); return; }
    setAddToCartPkg(pkg);
    setCartPlayerId(""); setCartUsername(""); setCartPassword(""); setCartLinking("");
  };

  const confirmAddToCart = () => {
    if (!addToCartPkg) return;
    if (loginType === "account" && !cartLinking) {
      toast({ title: "يجب اختيار نوع الربط", description: "اختر نوع الربط قبل الإضافة للسلة", variant: "destructive" });
      return;
    }
    addItem({
      gameId: game.id, gameName: game.name, gameNameAr: game.nameAr,
      gameSlug: game.slug, gameIcon: game.icon,
      packageId: addToCartPkg.id, packageName: addToCartPkg.name || addToCartPkg.amount,
      packageAmount: addToCartPkg.amount, packagePrice: addToCartPkg.price,
      loginType, quantity: 1,
      playerId: loginType === "id" ? cartPlayerId : undefined,
      accountUsername: loginType === "account" ? cartUsername : undefined,
      accountPassword: loginType === "account" ? cartPassword : undefined,
      linkingMethod: loginType === "account" ? cartLinking : undefined,
    });
    toast({ title: "تمت الإضافة للسلة! 🛒", description: `${addToCartPkg.name || addToCartPkg.amount} - ${addToCartPkg.price} ج` });
    setAddToCartPkg(null);
  };

  const fallbackImage = getGameImage(slug!);
  const gameImage = game.image || fallbackImage;
  const minPrice = packages.length ? Math.min(...(packages as any[]).map((p: any) => p.price)) : null;

  return (
    <div className="min-h-screen relative" dir="rtl">
      <ParticleBackground />

      <div className="relative z-10">
        {/* ── Cinematic Hero ── */}
        <div className="relative overflow-hidden" style={{ minHeight: "300px" }}>
          {/* Background image */}
          {gameImage ? (
            <motion.img
              src={gameImage}
              alt={game.nameAr}
              className="w-full h-full object-cover absolute inset-0"
              style={{ objectPosition: "center 25%", height: "100%" }}
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : (
            <div className={`w-full h-full absolute inset-0 bg-gradient-to-br ${game.color}`} />
          )}

          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-[#060810]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 80%, rgba(0,100,255,0.18) 0%, transparent 55%)" }} />

          {/* Electric top line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          {/* Content */}
          <div className="relative z-10 container mx-auto px-4 sm:px-6 flex flex-col justify-between" style={{ minHeight: "300px" }}>
            {/* Breadcrumb */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="pt-5"
            >
              <Link href="/games" className="inline-flex items-center text-white/60 hover:text-white transition-colors text-xs gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" />
                جميع الألعاب
              </Link>
            </motion.div>

            {/* Game info */}
            <motion.div
              className="mt-auto pb-7"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-end gap-4">
                {gameImage && (
                  <div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0"
                    style={{ border: "2px solid rgba(255,255,255,0.2)", boxShadow: "0 0 24px rgba(0,0,0,0.6)" }}
                  >
                    <img src={gameImage} alt={game.nameAr} className="w-full h-full object-cover" />
                  </div>
                )}

                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">{game.name}</p>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white drop-shadow-2xl leading-tight">
                    {game.nameAr}
                  </h1>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span
                      className="text-[10px] px-2.5 py-1 rounded-full font-bold text-white"
                      style={{ background: "rgba(0,144,255,0.3)", border: "1px solid rgba(0,144,255,0.4)" }}
                    >
                      {packages.length} باقة
                    </span>
                    <span
                      className="text-[10px] px-2.5 py-1 rounded-full text-white/70"
                      style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      ⚡ شحن فوري
                    </span>
                    {minPrice && (
                      <span
                        className="text-[10px] px-2.5 py-1 rounded-full font-bold"
                        style={{ background: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.3)", color: "#facc15" }}
                      >
                        من {minPrice} ج
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Packages ── */}
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">

          {/* Login type tab switcher — only if both types exist */}
          {hasBothTypes && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex mb-7 rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "4px",
                gap: "4px",
              }}
              dir="rtl"
            >
              <button
                onClick={() => setActiveLoginType("id")}
                data-testid="tab-login-id"
                className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all duration-200"
                style={{
                  background: resolvedLoginType === "id"
                    ? "linear-gradient(135deg, rgba(0,144,255,0.25), rgba(0,80,200,0.15))"
                    : "transparent",
                  color: resolvedLoginType === "id" ? "#fff" : "rgba(255,255,255,0.35)",
                  border: resolvedLoginType === "id" ? "1px solid rgba(0,144,255,0.35)" : "1px solid transparent",
                  boxShadow: resolvedLoginType === "id" ? "0 2px 12px rgba(0,144,255,0.2)" : "none",
                }}
              >
                🎮 شحن بالآيدي
              </button>
              <button
                onClick={() => setActiveLoginType("account")}
                data-testid="tab-login-account"
                className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all duration-200"
                style={{
                  background: resolvedLoginType === "account"
                    ? "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(100,50,200,0.15))"
                    : "transparent",
                  color: resolvedLoginType === "account" ? "#fff" : "rgba(255,255,255,0.35)",
                  border: resolvedLoginType === "account" ? "1px solid rgba(168,85,247,0.35)" : "1px solid transparent",
                  boxShadow: resolvedLoginType === "account" ? "0 2px 12px rgba(168,85,247,0.2)" : "none",
                }}
              >
                👤 شحن بالأكونت
              </button>
            </motion.div>
          )}

          {hasCategories ? (
            <div className="space-y-10">
              {categories.map((category, catIndex) => {
                const catPkgs = [...filteredPackages]
                  .filter((p: any) => p.category === category)
                  .sort((a: any, b: any) => (a.sortOrder ?? a.sort_order ?? 0) - (b.sortOrder ?? b.sort_order ?? 0));

                return (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: catIndex * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* Category header */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-1 h-5 bg-primary rounded-full" />
                      <Zap className="w-4 h-4 text-primary" />
                      <h2 className="text-sm sm:text-base font-black text-white/85 tracking-wide">{category}</h2>
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-primary/20 to-transparent" />
                      <span className="text-[10px] text-muted-foreground/50">{catPkgs.length} باقة</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 sm:gap-x-4 gap-y-5 sm:gap-y-6 pt-5">
                      {catPkgs.map((pkg: any, i: number) => (
                        <SmartPricingCard
                          key={pkg.id}
                          pkg={pkg}
                          index={i}
                          total={catPkgs.length}
                          onOrder={() => handleOrder(pkg.id)}
                          onAddToCart={() => openAddToCart(pkg)}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {filteredPackages.length > 0 && (
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-1 h-5 bg-primary rounded-full" />
                  <Zap className="w-4 h-4 text-primary" />
                  <h2 className="text-sm sm:text-base font-black text-white/85">اختر الباقة المناسبة</h2>
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent via-primary/20 to-transparent" />
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 sm:gap-x-4 gap-y-5 sm:gap-y-6 pt-5">
                {[...filteredPackages]
                  .sort((a: any, b: any) => a.price - b.price)
                  .map((pkg: any, i: number, arr) => (
                    <SmartPricingCard
                      key={pkg.id}
                      pkg={pkg}
                      index={i}
                      total={arr.length}
                      onOrder={() => handleOrder(pkg.id)}
                      onAddToCart={() => openAddToCart(pkg)}
                    />
                  ))}
              </div>
            </motion.div>
          )}

          {/* Payment methods */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-10"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-primary/60 rounded-full" />
              <h3 className="text-sm font-bold text-muted-foreground">طرق الدفع المتاحة</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {displayPaymentMethods.map((method) => (
                <Badge
                  key={method.id}
                  variant="secondary"
                  className="bg-white/5 border border-white/10 px-3 py-1.5 text-xs sm:text-sm"
                >
                  <span className="text-base sm:text-lg ml-1.5">{method.icon}</span>
                  {method.nameAr}
                </Badge>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Add to Cart Sheet ── */}
      <Sheet open={!!addToCartPkg} onOpenChange={(open) => !open && setAddToCartPkg(null)}>
        <SheetContent side="bottom" className="glass-card border-t border-white/10 rounded-t-3xl" dir="rtl">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-right flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              أضف للسلة — {addToCartPkg?.name || addToCartPkg?.amount}
            </SheetTitle>
            <p className="text-xs text-muted-foreground text-right">{game.nameAr} · {addToCartPkg?.price} ج</p>
          </SheetHeader>

          <div className="space-y-3 pb-4">
            {loginType === "id" ? (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  آيدي اللعبة <span className="text-muted-foreground/60">(يمكن تعديله لاحقاً)</span>
                </label>
                <Input
                  value={cartPlayerId}
                  onChange={(e) => setCartPlayerId(e.target.value)}
                  placeholder="مثال: 123456789"
                  className="glass-input"
                  data-testid="input-cart-playerid"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">اسم المستخدم / الإيميل</label>
                  <Input value={cartUsername} onChange={(e) => setCartUsername(e.target.value)} placeholder="username@email.com" className="glass-input" data-testid="input-cart-username" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">كلمة السر</label>
                  <Input type="password" value={cartPassword} onChange={(e) => setCartPassword(e.target.value)} placeholder="••••••••" className="glass-input" data-testid="input-cart-password" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">نوع الربط <span className="text-red-400">*</span></label>
                  <select
                    value={cartLinking}
                    onChange={(e) => setCartLinking(e.target.value)}
                    className={`w-full rounded-lg border bg-white/5 px-3 py-2 text-sm text-right outline-none focus:border-primary/50 transition-colors ${!cartLinking ? "border-red-500/40" : "border-white/10"}`}
                    data-testid="select-cart-linking"
                  >
                    <option value="">اختر نوع الربط (مطلوب)</option>
                    <option value="فيسبوك">فيسبوك</option>
                    <option value="جوجل / جيميل">جوجل / جيميل</option>
                    <option value="X (تويتر)">X (تويتر)</option>
                    <option value="ابل">ابل (Apple)</option>
                    <option value="كونامي">كونامي (Konami)</option>
                    <option value="ضيف">ضيف (Guest)</option>
                    <option value="رقم هاتف">رقم هاتف</option>
                    <option value="إيميل">إيميل</option>
                    <option value="VK">VK</option>
                    <option value="LINE">LINE</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
              </>
            )}
            <p className="text-[11px] text-muted-foreground/50">يمكنك التعديل على البيانات لاحقاً من صفحة السلة</p>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 hero-cta-primary" onClick={confirmAddToCart} data-testid="button-confirm-add-cart">
                <Check className="w-4 h-4 ml-2" />
                أضف للسلة
              </Button>
              <Button variant="outline" className="border-white/15" onClick={() => setAddToCartPkg(null)} data-testid="button-cancel-add-cart">
                إلغاء
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <CustomerLoginModal open={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
}

/* ─── Smart Pricing Card ─── */
interface SmartPricingCardProps {
  pkg: { id: string; name?: string; amount: string; price: number; category?: string };
  index: number;
  total: number;
  onOrder: () => void;
  onAddToCart: () => void;
}

const CARD_COLORS = [
  { from: "#1d4ed8", to: "#1e3a8a", accent: "rgba(29,78,216,0.6)" },
  { from: "#7c3aed", to: "#4c1d95", accent: "rgba(124,58,237,0.6)" },
  { from: "#0891b2", to: "#164e63", accent: "rgba(8,145,178,0.6)" },
  { from: "#d97706", to: "#92400e", accent: "rgba(217,119,6,0.6)" },
  { from: "#059669", to: "#064e3b", accent: "rgba(5,150,105,0.6)" },
  { from: "#dc2626", to: "#991b1b", accent: "rgba(220,38,38,0.6)" },
  { from: "#db2777", to: "#831843", accent: "rgba(219,39,119,0.6)" },
  { from: "#ea580c", to: "#7c2d12", accent: "rgba(234,88,12,0.6)" },
];

function SmartPricingCard({ pkg, index, total, onOrder, onAddToCart }: SmartPricingCardProps) {
  const displayName = pkg.name || pkg.amount;
  const badge = getPackageBadge(index, total);
  const featured = isFeatured(index, total);
  const colors = CARD_COLORS[index % CARD_COLORS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.06,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: featured ? -10 : -7, scale: featured ? 1.04 : 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`relative flex flex-col ${featured ? "z-10" : ""}`}
      style={{
        transformOrigin: "center bottom",
        paddingTop: "1.375rem",
      }}
    >
      {/* Badge — always reserve space, show only if exists */}
      <div className="absolute top-0 left-0 right-0 flex justify-center z-30 -translate-y-1/2 h-5">
        {badge && (
          <div
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black text-white tracking-wide whitespace-nowrap"
            style={{
              background: `linear-gradient(135deg, ${badge.color}, ${badge.color}cc)`,
              boxShadow: `0 2px 12px ${badge.glow}, 0 0 0 1.5px ${badge.color}55`,
            }}
          >
            <badge.icon className="w-2.5 h-2.5 flex-shrink-0" />
            {badge.labelEn}
          </div>
        )}
      </div>

      <div
        className="relative rounded-2xl overflow-hidden cursor-pointer flex flex-col group h-full"
        style={{
          background: `linear-gradient(160deg, ${colors.from}18 0%, ${colors.to}0d 50%, rgba(6,8,20,0.95) 100%)`,
          border: featured
            ? `1.5px solid ${colors.from}70`
            : `1px solid ${colors.from}35`,
          boxShadow: featured
            ? `0 8px 32px rgba(0,0,0,0.5), 0 0 24px ${colors.accent}`
            : `0 4px 20px rgba(0,0,0,0.4)`,
        }}
        data-testid={`card-package-${pkg.id}`}
      >
        {/* Bottom accent bar (replaces top bar to avoid interfering with badge) */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{
            background: `linear-gradient(90deg, transparent, ${colors.from}80, ${colors.to}80, transparent)`,
          }}
        />

        {/* Hover overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: `linear-gradient(160deg, ${colors.from}22 0%, ${colors.to}15 100%)` }}
        />

        {/* Hover border glow */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ boxShadow: `inset 0 0 0 1.5px ${colors.from}80` }}
        />

        <div className="relative z-10 p-3 pt-4 flex flex-col gap-2.5 flex-1">
          {/* Package name */}
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-bold text-white/90 leading-snug line-clamp-2">
              {displayName}
            </p>
            {pkg.category && (
              <p className="text-[9px] text-muted-foreground/50 mt-0.5 truncate">{pkg.category}</p>
            )}
          </div>

          {/* Price — center highlight */}
          <div className="text-center py-1">
            <div
              className={`font-black leading-none transition-all duration-300 group-hover:scale-110 ${featured ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"}`}
              style={{
                background: "linear-gradient(135deg, #fde68a, #fbbf24, #f59e0b)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: `drop-shadow(0 0 ${featured ? "12px" : "8px"} rgba(251,191,36,0.55))`,
              }}
            >
              {pkg.price}
            </div>
            <div className="text-[10px] text-white/35 tracking-widest mt-0.5">جنيه</div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={onOrder}
              className="w-full py-2 rounded-xl text-[11px] sm:text-xs font-black text-white transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${colors.from}EE, ${colors.to}CC)`,
                boxShadow: `0 3px 14px ${colors.accent}`,
              }}
              data-testid={`button-order-${pkg.id}`}
            >
              <Zap className="w-3 h-3" />
              اطلب الآن
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
              className="w-full py-1.5 rounded-xl text-[10px] sm:text-[11px] font-medium text-white/40 hover:text-white/80 border border-white/8 hover:border-white/20 hover:bg-white/5 transition-all duration-200 flex items-center justify-center gap-1"
              data-testid={`button-addcart-${pkg.id}`}
            >
              <ShoppingCart className="w-2.5 h-2.5" />
              سلة
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
