import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Code, Copy, Check, Zap, Globe, Rocket } from "lucide-react";
import { SiWhatsapp, SiTelegram, SiInstagram, SiSnapchat, SiTiktok, SiYoutube, SiDiscord } from "react-icons/si";
import { useState } from "react";
import { ParticleBackground } from "@/components/ParticleBackground";
import developerImage from "@assets/WhatsApp_Image_2026-02-13_at_8.37.34_AM_1770964796644.jpeg";

export default function Developer() {
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const copyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  const socialLinks = [
    {
      icon: SiWhatsapp,
      label: "واتساب - أساسي",
      value: "01092376753",
      href: "https://wa.me/201092376753",
      gradient: "from-green-500 to-emerald-600",
      bgGlow: "shadow-green-500/20",
      copyable: true,
    },
    {
      icon: SiWhatsapp,
      label: "واتساب - فرعي",
      value: "01201247412",
      href: "https://wa.me/201201247412",
      gradient: "from-green-400 to-green-600",
      bgGlow: "shadow-green-400/20",
      copyable: true,
    },
    {
      icon: SiTelegram,
      label: "تيليجرام",
      value: "@master_e2k",
      href: "https://t.me/master_e2k",
      gradient: "from-sky-400/80 to-blue-500/80",
      bgGlow: "shadow-sky-500/15",
    },
    {
      icon: SiInstagram,
      label: "انستجرام",
      value: "master_e2n",
      href: "https://instagram.com/master_e2n",
      gradient: "from-pink-400/80 via-purple-400/80 to-orange-400/70",
      bgGlow: "shadow-pink-500/15",
    },
    {
      icon: SiDiscord,
      label: "ديسكورد",
      value: "@master_e2n",
      href: "https://discord.com/users/master_e2n",
      gradient: "from-indigo-400/80 to-violet-500/80",
      bgGlow: "shadow-indigo-500/15",
    },
    {
      icon: SiSnapchat,
      label: "سناب شات",
      value: "master_eyad",
      href: "https://snapchat.com/add/master_eyad",
      gradient: "from-amber-300/80 to-amber-400/80",
      bgGlow: "shadow-amber-500/15",
    },
    {
      icon: SiTiktok,
      label: "تيك توك",
      value: "@mastere2n",
      href: "https://tiktok.com/@mastere2n",
      gradient: "from-neutral-600 via-pink-400/80 to-cyan-400/70",
      bgGlow: "shadow-pink-500/10",
    },
    {
      icon: SiYoutube,
      label: "يوتيوب",
      value: "@master_e2",
      href: "https://youtube.com/@master_e2",
      gradient: "from-red-400/80 to-red-600/80",
      bgGlow: "shadow-red-500/15",
    },
  ];

  return (
    <div className="min-h-screen relative">
      <ParticleBackground />

      <div className="relative z-10 py-8 md:py-12 container mx-auto px-4">
        <motion.div
          className="text-center mb-8 md:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-block mb-4"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/80 to-blue-500/70 flex items-center justify-center shadow-lg glow-soft">
              <Code className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
          </motion.div>
          <h2 className="text-2xl md:text-4xl font-black mb-3">
            <span className="text-gradient-gold-animated">التواصل مع المطور</span>
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">تصميم وتطوير مواقع احترافية</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-4xl mx-auto mb-10"
        >
          <Card className="glass-ultra relative overflow-hidden" data-testid="card-developer-hero">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/6 via-transparent to-primary/3 pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 p-5 md:p-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="flex-shrink-0"
              >
                <div className="relative">
                  <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-primary/40 via-sky-500/30 to-cyan-500/20 opacity-50 blur-lg animate-pulse" />
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/50 via-sky-500/40 to-cyan-500/30 opacity-60" />
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden ring-2 ring-primary/30 shadow-2xl">
                    <img
                      src={developerImage}
                      alt="المطور"
                      className="w-full h-full object-cover"
                      data-testid="img-developer"
                    />
                  </div>
                  <motion.div
                    className="absolute -inset-4 rounded-full border border-primary/15"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              </motion.div>

              <div className="flex-1 text-center md:text-right space-y-4">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Badge variant="outline" className="border-primary/20 text-primary">
                    <Rocket className="w-3 h-3 ml-1" />
                    مطور محترف
                  </Badge>
                </div>

                <h3 className="text-lg md:text-xl font-bold leading-relaxed" data-testid="text-developer-headline">
                  عايز موقع احترافي يبيع لك قبل ما تتكلم؟
                </h3>

                <p className="text-muted-foreground text-sm md:text-base leading-relaxed" data-testid="text-developer-desc">
                  أنا متخصص في تصميم وتطوير المواقع السريعة والحديثة اللي تديك شكل قوي قدام عملاءك.
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>أداء عالي</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="w-4 h-4 text-primary" />
                    <span>سرعة فائقة</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Rocket className="w-4 h-4 text-primary" />
                    <span>تجربة مستخدم مميزة</span>
                  </div>
                </div>

                <p className="text-sm font-semibold" data-testid="text-developer-tagline">
                  شغلي مش شكل وبس — أداء، سرعة، وتجربة مستخدم تفرق.
                </p>

                <p className="text-primary font-bold text-base md:text-lg">
                  جاهز تبدأ؟ تواصل دلوقتي.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="max-w-4xl mx-auto mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-6"
          >
            <h3 className="text-xl md:text-2xl font-bold text-gradient-gold">وسائل التواصل</h3>
            <p className="text-muted-foreground text-sm mt-1">اختار المنصة المناسبة وتواصل معي</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {socialLinks.map((link, index) => (
              <motion.div
                key={link.value + link.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.06, type: "spring", stiffness: 200 }}
              >
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                  data-testid={`link-dev-${link.value}`}
                >
                  <Card className={`glass-ultra p-4 text-center h-full transition-all duration-300 shadow-lg ${link.bgGlow}`} data-testid={`card-social-${link.label}`}>
                    <div className="relative mb-3">
                      <div className={`w-14 h-14 md:w-16 md:h-16 mx-auto rounded-2xl bg-gradient-to-br ${link.gradient} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105`}>
                        <link.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                      </div>
                    </div>
                    <p className="font-bold text-sm mb-0.5">{link.label}</p>
                    <p className="text-xs text-muted-foreground truncate" dir="ltr">{link.value}</p>
                    {link.copyable && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          copyNumber(link.value);
                        }}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors"
                        data-testid={`button-copy-dev-${link.value}`}
                      >
                        {copiedNumber === link.value ? (
                          <>
                            <Check className="w-3 h-3 text-green-400" />
                            <span className="text-green-400">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>نسخ الرقم</span>
                          </>
                        )}
                      </button>
                    )}
                  </Card>
                </a>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="max-w-3xl mx-auto"
        >
          <Card className="glass-ultra p-5 md:p-8 text-center relative overflow-hidden" data-testid="card-developer-cta">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/6 via-transparent to-primary/3 pointer-events-none" />
            <div className="relative z-10">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/80 to-green-600/80 flex items-center justify-center shadow-lg">
                <SiWhatsapp className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-2">ابدأ مشروعك الآن</h3>
              <p className="text-muted-foreground text-sm mb-5">
                تواصل معي وخلي موقعك يتكلم عنك
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a href="https://wa.me/201092376753" target="_blank" rel="noopener noreferrer" data-testid="link-dev-cta-whatsapp">
                  <Button className="glow-soft" data-testid="button-dev-whatsapp">
                    <SiWhatsapp className="w-4 h-4 ml-2" />
                    واتساب - 01092376753
                  </Button>
                </a>
                <a href="https://t.me/master_e2k" target="_blank" rel="noopener noreferrer" data-testid="link-dev-cta-telegram">
                  <Button variant="outline" data-testid="button-dev-telegram">
                    <SiTelegram className="w-4 h-4 ml-2" />
                    تيليجرام
                  </Button>
                </a>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
