import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Zap, Shield, Headphones, Sparkles, MessageCircle, ChevronLeft, BadgeCheck } from "lucide-react";
import logoImage from "@assets/IMG-20260310-WA0032_1773642840088.jpg";
import { motion, useReducedMotion } from "framer-motion";

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const trustItems = [
  { icon: BadgeCheck, label: "موثوق 100%" },
  { icon: Zap, label: "شحن فوري" },
  { icon: Shield, label: "دفع آمن" },
  { icon: Headphones, label: "دعم 24/7" },
];

const featureCards = [
  { icon: Zap, label: "شحن فوري", sub: "خلال دقائق", color: "text-yellow-400", bg: "rgba(250,204,21,0.07)", border: "rgba(250,204,21,0.14)" },
  { icon: Shield, label: "ضمان كامل", sub: "100% آمن", color: "text-emerald-400", bg: "rgba(52,211,153,0.07)", border: "rgba(52,211,153,0.14)" },
  { icon: Headphones, label: "دعم 24/7", sub: "دائماً معك", color: "text-primary", bg: "rgba(0,144,255,0.07)", border: "rgba(0,144,255,0.16)" },
];

export function HeroSection() {
  const shouldReduce = useReducedMotion();

  return (
    <section className="relative min-h-[82vh] flex items-center py-10 sm:py-12 md:py-16 overflow-hidden">
      {/* Ambient background — static, no animation */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{
            background: "radial-gradient(circle, #0090ff 0%, transparent 65%)",
            transform: "translate(-20%, -25%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{
            background: "radial-gradient(circle, #0060cc 0%, transparent 65%)",
            transform: "translate(25%, 30%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,144,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,144,255,1) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/50" />
      </div>

      <div className="container mx-auto px-3 sm:px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col items-center text-center mb-10 md:mb-0 md:flex-row md:text-right md:items-center gap-8 md:gap-14">

            {/* Logo Side */}
            <motion.div
              className="relative flex-shrink-0 order-1 md:order-2"
              initial={shouldReduce ? {} : { opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
            >
              <div className="relative">
                {/* Static glow ring — no animation */}
                <div
                  className="absolute inset-0 rounded-3xl pointer-events-none"
                  style={{
                    boxShadow: "0 0 48px rgba(0,144,255,0.18), 0 0 80px rgba(0,100,255,0.08)",
                    borderRadius: "24px",
                  }}
                />
                {/* Subtle border ring */}
                <div
                  className="absolute rounded-3xl pointer-events-none"
                  style={{
                    inset: "-10px",
                    border: "1px solid rgba(0,144,255,0.12)",
                    borderRadius: "32px",
                  }}
                />
                <div
                  className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72 rounded-3xl overflow-hidden z-10"
                  style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,144,255,0.15)" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-primary/4 z-10 pointer-events-none" />
                  <img
                    src={logoImage}
                    alt="ASTRO"
                    className="w-full h-full object-cover"
                    loading="eager"
                    data-testid="img-hero-logo"
                  />
                </div>
              </div>
            </motion.div>

            {/* Content Side */}
            <motion.div
              className="flex-1 order-2 md:order-1"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {/* Badge */}
              <motion.div variants={itemVariants}>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                  style={{ background: "rgba(0,144,255,0.08)", border: "1px solid rgba(0,144,255,0.18)" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-xs font-semibold text-primary/90">المتجر الأول في مصر</span>
                </div>
              </motion.div>

              {/* Headline */}
              <motion.div variants={itemVariants}>
                <h1 className="font-black mb-1 leading-none tracking-tight" style={{ fontSize: "clamp(3rem, 9vw, 5.5rem)" }}>
                  <span className="text-gradient-gold-animated">ASTRO</span>
                </h1>
                <p className="text-sm font-semibold tracking-[0.2em] text-primary/50 mb-2 uppercase">Gaming Platform</p>
              </motion.div>

              {/* Sub */}
              <motion.div variants={itemVariants}>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md mb-6 mx-auto md:mx-0 leading-relaxed">
                  اشحن ألعابك المفضلة بأفضل الأسعار وأسرع خدمة — فوري، آمن، موثوق.
                  <br />
                  <span className="text-primary/70 font-medium text-xs">PUBG · TikTok · Roblox · FIFA · Free Fire</span>
                </p>
              </motion.div>

              {/* CTAs */}
              <motion.div variants={itemVariants}>
                <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-3 mb-7">
                  <Link href="/games" className="w-full sm:w-auto">
                    <motion.button
                      whileHover={shouldReduce ? {} : { scale: 1.02, y: -1 }}
                      whileTap={shouldReduce ? {} : { scale: 0.97 }}
                      className="w-full sm:w-auto hero-cta-primary px-7 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                      data-testid="button-browse-games"
                    >
                      <Sparkles className="w-4 h-4" />
                      تصفح الألعاب الآن
                      <ChevronLeft className="w-4 h-4" />
                    </motion.button>
                  </Link>
                  <Link href="/contact" className="w-full sm:w-auto">
                    <motion.button
                      whileHover={shouldReduce ? {} : { scale: 1.01, y: -1 }}
                      whileTap={shouldReduce ? {} : { scale: 0.97 }}
                      className="w-full sm:w-auto px-7 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition-colors duration-200"
                      style={{ borderColor: "rgba(0,144,255,0.22)", background: "rgba(0,144,255,0.04)", color: "rgba(200,230,255,0.85)" }}
                      data-testid="button-contact-us"
                    >
                      <MessageCircle className="w-4 h-4" />
                      تواصل معنا
                    </motion.button>
                  </Link>
                </div>
              </motion.div>

              {/* Feature Cards */}
              <motion.div variants={itemVariants}>
                <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto md:mx-0">
                  {featureCards.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl p-3 text-center"
                      style={{ background: item.bg, border: `1px solid ${item.border}` }}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: item.bg }}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <p className="text-xs font-bold leading-tight mb-0.5 text-white/90">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Stats Row */}
          <motion.div
            className="mt-12 md:mt-14 grid grid-cols-2 sm:grid-cols-4 gap-3"
            initial={shouldReduce ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {[
              { label: "عميل سعيد", value: "10K+", icon: "😊" },
              { label: "لعبة متاحة", value: "50+", icon: "🎮" },
              { label: "طلب مكتمل", value: "50K+", icon: "✅" },
              { label: "رضا العملاء", value: "99%", icon: "⭐" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={shouldReduce ? {} : { y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="stat-widget rounded-2xl p-4 text-center cursor-default"
              >
                <div className="text-2xl mb-1">{stat.icon}</div>
                <p className="text-xl sm:text-2xl font-black text-gradient-gold-animated">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Trust Strip */}
          <motion.div
            className="mt-8 flex items-center justify-center gap-3 flex-wrap"
            initial={shouldReduce ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            {trustItems.map((item) => (
              <div key={item.label} className="trust-chip">
                <item.icon className="w-3 h-3 text-primary flex-shrink-0" />
                {item.label}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
