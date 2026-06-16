import { HeroSection } from "@/components/HeroSection";
import { GameCard } from "@/components/GameCard";
import { ParticleBackground } from "@/components/ParticleBackground";

import { trackPageView } from "@/lib/analytics";
import {
  Gamepad2, TrendingUp, Users, CheckCircle, Loader2, Zap, Shield, Coins,
  Crown, Star, UserCircle, ShoppingCart, ArrowLeft, Tag, Percent, BadgeDollarSign,
  Clock, Headphones, Sparkles, ChevronLeft
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, useEffect, useState, useMemo } from "react";
import type { Game, Package, Account } from "@shared/schema";

/* ─── Reusable Scroll-Reveal Section ─── */
function SectionReveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={shouldReduce ? {} : { opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Animated Number Counter ─── */
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (!isInView || shouldReduce) { setCount(value); return; }
    let start = 0;
    const end = value;
    if (end === 0) return;
    const duration = 1500;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, value, shouldReduce]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ─── Section Title ─── */
function SectionTitle({ icon: Icon, title, subtitle, gradient = "from-primary/70 to-cyan-500/60" }: {
  icon: React.ElementType; title: string; subtitle: string; gradient?: string;
}) {
  return (
    <div className="text-center mb-8 sm:mb-10">
      <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
        style={{ boxShadow: "0 0 32px rgba(0,144,255,0.15), inset 0 1px 0 rgba(255,255,255,0.06)" }}
      >
        <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
      </div>
      <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-1.5">
        <span className="text-gradient-gold-animated">{title}</span>
      </h2>
      <p className="text-muted-foreground text-sm">{subtitle}</p>
    </div>
  );
}

export default function Home() {
  const shouldReduce = useReducedMotion();

  const { data: games = [], isLoading: gamesLoading } = useQuery<Game[]>({ queryKey: ["/api/games"] });
  const { data: packages = [] } = useQuery<Package[]>({ queryKey: ["/api/packages"] });
  const { data: allAccounts = [] } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });

  const latestAccounts = allAccounts
    .filter((a: any) => a.isActive && !a.isSold)
    .slice(-3)
    .reverse();

  const activeGames = games.filter(g => g.isActive !== false);

  const [recentGameSlugs, setRecentGameSlugs] = useState<string[]>([]);
  useEffect(() => {
    const stored: string[] = JSON.parse(localStorage.getItem("astro_recent_games") || "[]");
    setRecentGameSlugs(stored);
    trackPageView("/");
  }, []);

  const recentGames = useMemo(() =>
    recentGameSlugs
      .map(slug => activeGames.find(g => g.slug === slug))
      .filter(Boolean)
      .slice(0, 5) as Game[],
    [recentGameSlugs, activeGames]
  );

  const todayActivity = useMemo(() => {
    const now = new Date();
    return 28 + now.getHours() * 4 + Math.floor(now.getMinutes() / 15);
  }, []);

  const getPackageCount = (gameId: string) => {
    return packages.filter(p => p.gameId === gameId).length;
  };

  const getMinPrice = (gameId: string): number | null => {
    const gamePkgs = packages.filter(p => p.gameId === gameId && p.isActive !== false);
    if (!gamePkgs.length) return null;
    return Math.min(...gamePkgs.map(p => p.price));
  };

  const features = [
    { icon: Zap, title: "شحن فوري", description: "خلال دقائق معدودة بعد تأكيد الدفع بدون أي تأخير", color: "#facc15", grad: "from-yellow-500/20 to-yellow-600/5" },
    { icon: Shield, title: "ضمان كامل", description: "ضمان 100% على جميع عمليات الشحن مع دعم فني متواصل", color: "#34d399", grad: "from-emerald-500/20 to-emerald-600/5" },
    { icon: Coins, title: "أسعار تنافسية", description: "أفضل الأسعار في السوق مع عروض وخصومات مستمرة", color: "#0090ff", grad: "from-primary/20 to-primary/5" },
  ];

  const stats = [
    { value: 10000, suffix: "+", label: "عميل سعيد", icon: Users },
    { value: 50000, suffix: "+", label: "عملية شحن", icon: Zap },
    { value: activeGames.length, suffix: "+", label: "لعبة متاحة", icon: Gamepad2 },
    { value: 99, suffix: "%", label: "رضا العملاء", icon: Star },
  ];

  return (
    <div className="min-h-screen relative">
      <ParticleBackground />

      <div className="relative z-10">
        {/* ── Hero ── */}
        <HeroSection />

        {/* ── Trust Strip ── */}
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { icon: Zap,        label: "شحن فوري",      sub: "خلال دقائق",  color: "#facc15" },
              { icon: Shield,     label: "دفع آمن 100%",  sub: "ضمان كامل",   color: "#34d399" },
              { icon: Headphones, label: "دعم 24/7",       sub: "نرد فوراً",   color: "#0090ff" },
              { icon: Users,      label: "+10,000 عميل",  sub: "يثقون بنا",   color: "#a78bfa" },
            ].map((item) => (
              <div key={item.label} className="trust-badge-pro" data-testid={`badge-trust-${item.label}`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}18` }}>
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white/90 truncate">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground/65">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick Recharge (personalized) ── */}
        {recentGames.length > 0 && (
          <div className="container mx-auto px-3 sm:px-4 pb-2">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="glass-widget rounded-2xl p-4 border border-primary/10"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-4 bg-primary rounded-full" />
                <p className="text-sm font-bold text-white/85">استمر من حيث توقفت</p>
                <span className="text-[10px] text-muted-foreground/55 mr-auto">آخر ألعابك</span>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {recentGames.map((game: any) => (
                  <Link key={game.slug} href={`/games/${game.slug}`}>
                    <div className="quick-game-chip" data-testid={`chip-recent-${game.slug}`}>
                      <span className="text-xl">{game.icon}</span>
                      <p className="text-[10px] font-semibold text-white/75 text-center leading-tight">{game.nameAr}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        <hr className="cyber-hr mx-8" />

        {/* ── Games Grid ── */}
        <section className="py-12 sm:py-16 container mx-auto px-3 sm:px-4">
          <SectionReveal>
            <SectionTitle icon={Gamepad2} title="الألعاب المتاحة" subtitle="اختر لعبتك وابدأ الشحن الآن" />
            <div className="flex justify-center -mt-4 mb-6">
              <span className="live-chip" data-testid="chip-live-activity">
                <span className="live-dot" />
                {todayActivity}+ عملية شحن اليوم
              </span>
            </div>
          </SectionReveal>

          {gamesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-36 sm:h-44 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
              {activeGames.map((game, index) => (
                <GameCard
                  key={game.id}
                  id={game.id}
                  name={game.name}
                  nameAr={game.nameAr}
                  slug={game.slug}
                  icon={game.icon}
                  image={game.image || undefined}
                  color={game.color}
                  packagesCount={getPackageCount(game.id)}
                  minPrice={getMinPrice(game.id)}
                  index={index}
                />
              ))}
            </div>
          )}
        </section>

        <hr className="cyber-hr mx-8" />

        {/* ── Accounts Preview ── */}
        {latestAccounts.length > 0 && (
          <section className="py-12 sm:py-16 container mx-auto px-3 sm:px-4">
            <SectionReveal>
              <SectionTitle icon={UserCircle} title="حسابات للبيع" subtitle="أحدث الحسابات المعروضة في المتجر" />
            </SectionReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {latestAccounts.map((account: any, i: number) => (
                <SectionReveal key={account.id} delay={i * 0.08}>
                  <motion.div
                    whileHover={shouldReduce ? {} : { y: -4, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="glass-widget rounded-2xl overflow-hidden group cursor-pointer"
                  >
                    {account.images?.[0] && (
                      <div className="w-full h-36 overflow-hidden relative">
                        <img
                          src={account.images[0]}
                          alt={account.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm truncate text-white/90">{account.title}</h3>
                          <p className="text-xs text-muted-foreground">{account.gameType || account.game?.nameAr}</p>
                        </div>
                        {account.rank && (
                          <Badge className="bg-primary/15 text-primary border border-primary/25 text-[10px] flex-shrink-0 font-bold">
                            {account.rank}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-gradient-gold-animated">{account.price} ج</p>
                        <Link href="/accounts">
                          <motion.button
                            whileHover={shouldReduce ? {} : { scale: 1.05 }}
                            whileTap={shouldReduce ? {} : { scale: 0.95 }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                            style={{ background: "linear-gradient(135deg, hsl(205 100% 50%), hsl(215 100% 55%))", boxShadow: "0 3px 12px rgba(0,144,255,0.35)" }}
                          >
                            <ShoppingCart className="w-3 h-3" />
                            عرض
                          </motion.button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                </SectionReveal>
              ))}
            </div>

            <SectionReveal>
              <div className="text-center">
                <Link href="/accounts">
                  <motion.button
                    whileHover={shouldReduce ? {} : { scale: 1.03 }}
                    whileTap={shouldReduce ? {} : { scale: 0.97 }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200"
                    style={{ borderColor: "rgba(0,144,255,0.3)", background: "rgba(0,144,255,0.06)", color: "rgba(200,230,255,0.85)" }}
                    data-testid="button-view-all-accounts"
                  >
                    عرض كل الحسابات
                    <ArrowLeft className="w-4 h-4" />
                  </motion.button>
                </Link>
              </div>
            </SectionReveal>
          </section>
        )}

        <hr className="cyber-hr mx-8" />

        {/* ── Sell Account CTA ── */}
        <section className="py-12 sm:py-16 container mx-auto px-3 sm:px-4">
          <SectionReveal>
            <div className="relative rounded-3xl overflow-hidden glass-module p-6 sm:p-8 md:p-10">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20"
                  style={{ background: "radial-gradient(circle, rgba(0,144,255,0.3) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
                <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-10"
                  style={{ background: "radial-gradient(circle, rgba(250,204,21,0.3) 0%, transparent 70%)", transform: "translate(-30%, 30%)" }} />
              </div>

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-right">
                <motion.div
                  whileHover={shouldReduce ? {} : { rotate: [0, -5, 5, 0], scale: 1.05 }}
                  transition={{ duration: 0.4 }}
                  className="flex-shrink-0"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center mx-auto"
                    style={{ background: "linear-gradient(135deg, rgba(0,144,255,0.3), rgba(250,204,21,0.2))", border: "1px solid rgba(250,204,21,0.25)", boxShadow: "0 0 40px rgba(250,204,21,0.15)" }}
                  >
                    <BadgeDollarSign className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-400" />
                  </div>
                </motion.div>

                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-2">
                    <span className="text-gradient-gold-animated">بيع حسابك وتكسّب الفلوس!</span>
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base mb-5 max-w-xl">
                    عندك حساب مش محتاجه؟ حوّله لفلوس! أرسل طلبك وفريقنا يراجعه ويعرضه في المتجر بأمان تام.
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-5">
                    {[
                      { icon: Percent, text: "عمولة 4% فقط", color: "text-emerald-400" },
                      { icon: Shield, text: "ضمان أمان كامل", color: "text-primary" },
                      { icon: Zap, text: "إجراءات سريعة", color: "text-yellow-400" },
                    ].map(item => (
                      <div key={item.text} className="trust-chip">
                        <item.icon className={`w-3 h-3 ${item.color}`} />
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/sell-account">
                    <motion.button
                      whileHover={shouldReduce ? {} : { scale: 1.04, y: -2 }}
                      whileTap={shouldReduce ? {} : { scale: 0.97 }}
                      className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-bold text-sm text-white"
                      style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)", boxShadow: "0 4px 20px rgba(245,158,11,0.4), inset 0 1px 0 rgba(255,255,255,0.2)" }}
                      data-testid="button-sell-account-cta"
                    >
                      <Tag className="w-4 h-4" />
                      ابدأ البيع الآن
                    </motion.button>
                  </Link>
                </div>
              </div>
            </div>
          </SectionReveal>
        </section>

        <hr className="cyber-hr mx-8" />

        {/* ── Why Us — iPhone Widget Style ── */}
        <section className="py-12 sm:py-16 relative overflow-hidden">
          <div className="absolute inset-0 section-glow-top pointer-events-none" />
          <div className="container mx-auto px-3 sm:px-4 relative z-10">
            <SectionReveal>
              <SectionTitle icon={Crown} title="لماذا ASTRO؟" subtitle="نقدم لك أفضل تجربة شحن ألعاب" />
            </SectionReveal>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 max-w-4xl mx-auto">
              {features.map((feature, i) => (
                <SectionReveal key={feature.title} delay={i * 0.1}>
                  <motion.div
                    whileHover={shouldReduce ? {} : { y: -6, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    className="feature-card rounded-2xl p-5 sm:p-6 text-center cursor-default h-full"
                  >
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${feature.grad} flex items-center justify-center`}
                      style={{ border: `1px solid ${feature.color}30`, boxShadow: `0 0 24px ${feature.color}20` }}
                    >
                      <feature.icon className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: feature.color }} />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold mb-2 text-white/90">{feature.title}</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{feature.description}</p>
                  </motion.div>
                </SectionReveal>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 section-glow-bottom pointer-events-none" />
        </section>

        <hr className="cyber-hr mx-8" />

        {/* ── Stats ── */}
        <section className="py-12 sm:py-16 container mx-auto px-3 sm:px-4">
          <SectionReveal>
            <SectionTitle icon={TrendingUp} title="إحصائياتنا" subtitle="أرقام تتحدث عن جودة خدماتنا" />
          </SectionReveal>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {stats.map((stat, i) => (
              <SectionReveal key={stat.label} delay={i * 0.08}>
                <motion.div
                  whileHover={shouldReduce ? {} : { y: -4, scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="stat-widget rounded-2xl p-4 sm:p-5 text-center cursor-default"
                >
                  <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-gradient-gold-animated mb-0.5">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="text-muted-foreground text-[10px] sm:text-xs">{stat.label}</p>
                </motion.div>
              </SectionReveal>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-12 sm:py-16 relative overflow-hidden">
          <div className="absolute inset-0 section-glow-top pointer-events-none" />
          <div className="container mx-auto px-3 sm:px-4 text-center relative z-10">
            <SectionReveal>
              <div className="glass-module p-6 sm:p-10 md:p-12 rounded-3xl max-w-2xl mx-auto relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/4" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                </div>

                <div className="relative z-10">
                  <motion.div
                    animate={shouldReduce ? {} : { scale: [1, 1.08, 1], boxShadow: ["0 0 20px rgba(0,144,255,0.2)", "0 0 40px rgba(0,144,255,0.4)", "0 0 20px rgba(0,144,255,0.2)"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/25"
                  >
                    <Sparkles className="w-8 h-8 text-primary" />
                  </motion.div>

                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-2">
                    <span className="text-gradient-gold-animated">جاهز للشحن؟</span>
                  </h2>
                  <p className="text-muted-foreground mb-7 text-sm sm:text-base max-w-md mx-auto">
                    اختر لعبتك المفضلة واحصل على العملات والجواهر فوراً بأفضل الأسعار
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-7">
                    {[
                      { icon: CheckCircle, text: "دفع آمن" },
                      { icon: Zap, text: "شحن فوري" },
                      { icon: Shield, text: "دعم 24/7" },
                      { icon: Clock, text: "متاح دائماً" },
                    ].map((item) => (
                      <div key={item.text} className="trust-chip">
                        <item.icon className="w-3 h-3 text-primary" />
                        {item.text}
                      </div>
                    ))}
                  </div>
                  <Link href="/games">
                    <motion.button
                      whileHover={shouldReduce ? {} : { scale: 1.04, y: -2 }}
                      whileTap={shouldReduce ? {} : { scale: 0.97 }}
                      className="hero-cta-primary inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-base text-white"
                      data-testid="button-final-cta"
                    >
                      <Gamepad2 className="w-5 h-5" />
                      تصفح الألعاب الآن
                      <ChevronLeft className="w-4 h-4" />
                    </motion.button>
                  </Link>
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>
      </div>
    </div>
  );
}
