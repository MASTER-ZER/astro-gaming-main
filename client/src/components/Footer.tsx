import { Link } from "wouter";
import { Crown, Zap, Shield, Headphones } from "lucide-react";
import {
  SiWhatsapp, SiInstagram, SiTiktok, SiTelegram, SiFacebook,
  SiYoutube, SiDiscord, SiX, SiSnapchat,
} from "react-icons/si";
import logoImage from "@assets/IMG-20260310-WA0032_1773642840088.jpg";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

const quickLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/games", label: "الألعاب" },
  { href: "/accounts", label: "الحسابات" },
  { href: "/sell-account", label: "بيع حسابك" },
  { href: "/contact", label: "التواصل" },
  { href: "/developer", label: "المطور" },
];

const features = [
  { icon: Zap, label: "شحن فوري", color: "text-yellow-400" },
  { icon: Shield, label: "ضمان 100%", color: "text-emerald-400" },
  { icon: Headphones, label: "دعم 24/7", color: "text-primary" },
];

interface PublicSettings {
  contact_numbers?: string;
  whatsapp_number?: string;
  telegram_username?: string;
  telegram_link?: string;
  instagram_link?: string;
  tiktok_link?: string;
  facebook_link?: string;
  youtube_link?: string;
  discord_link?: string;
  twitter_link?: string;
  snapchat_link?: string;
  show_contact_numbers?: string;
  show_instagram?: string;
  show_tiktok?: string;
  show_facebook?: string;
  show_telegram?: string;
  show_youtube?: string;
  show_discord?: string;
  show_twitter?: string;
  show_snapchat?: string;
}

const isOn = (v?: string) => v !== "false";

export function Footer() {
  const { data: settings = {} as PublicSettings } = useQuery<PublicSettings>({
    queryKey: ["/api/public/settings"],
    staleTime: 60_000,
  });

  const primaryNumber = (() => {
    try {
      const nums = JSON.parse(settings.contact_numbers || "[]");
      return (nums.find((n: any) => n.primary) || nums[0])?.number || settings.whatsapp_number || "";
    } catch { return settings.whatsapp_number || ""; }
  })();

  const tgLink = settings.telegram_link ||
    (settings.telegram_username ? `https://t.me/${settings.telegram_username}` : "");

  const socialLinks = [
    isOn(settings.show_contact_numbers) && primaryNumber && {
      href: `https://wa.me/${primaryNumber.replace(/[^0-9]/g, "")}`,
      icon: SiWhatsapp, label: "واتساب",
      color: "text-green-400",
      bg: "bg-green-500/10 hover:bg-green-500/20 border-green-500/20 hover:border-green-500/40",
    },
    isOn(settings.show_instagram) && settings.instagram_link && {
      href: settings.instagram_link,
      icon: SiInstagram, label: "إنستجرام",
      color: "text-pink-400",
      bg: "bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/20 hover:border-pink-500/40",
    },
    isOn(settings.show_tiktok) && settings.tiktok_link && {
      href: settings.tiktok_link,
      icon: SiTiktok, label: "تيك توك",
      color: "text-slate-300",
      bg: "bg-slate-500/10 hover:bg-slate-500/20 border-slate-500/20 hover:border-slate-500/40",
    },
    isOn(settings.show_facebook) && settings.facebook_link && {
      href: settings.facebook_link,
      icon: SiFacebook, label: "فيسبوك",
      color: "text-blue-400",
      bg: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 hover:border-blue-500/40",
    },
    isOn(settings.show_telegram) && tgLink && {
      href: tgLink,
      icon: SiTelegram, label: "تيليجرام",
      color: "text-sky-400",
      bg: "bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/20 hover:border-sky-500/40",
    },
    isOn(settings.show_youtube) && settings.youtube_link && {
      href: settings.youtube_link,
      icon: SiYoutube, label: "يوتيوب",
      color: "text-red-400",
      bg: "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 hover:border-red-500/40",
    },
    isOn(settings.show_discord) && settings.discord_link && {
      href: settings.discord_link,
      icon: SiDiscord, label: "ديسكورد",
      color: "text-violet-400",
      bg: "bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20 hover:border-violet-500/40",
    },
    isOn(settings.show_twitter) && settings.twitter_link && {
      href: settings.twitter_link,
      icon: SiX, label: "تويتر",
      color: "text-slate-300",
      bg: "bg-slate-500/10 hover:bg-slate-500/20 border-slate-500/20 hover:border-slate-500/40",
    },
    isOn(settings.show_snapchat) && settings.snapchat_link && {
      href: settings.snapchat_link,
      icon: SiSnapchat, label: "سناب شات",
      color: "text-yellow-400",
      bg: "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20 hover:border-yellow-500/40",
    },
  ].filter(Boolean) as { href: string; icon: React.ElementType; label: string; color: string; bg: string }[];

  return (
    <footer className="relative mt-auto overflow-hidden">
      <hr className="cyber-hr" />

      <div className="glass-panel border-t-0 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/3 via-transparent to-transparent pointer-events-none" />

        <div className="container mx-auto px-4 py-8 md:py-12 relative z-10">
          {/* Trust Features Strip */}
          <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
            {features.map((f) => (
              <div key={f.label} className="trust-chip">
                <f.icon className={`w-3.5 h-3.5 ${f.color}`} />
                {f.label}
              </div>
            ))}
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            {/* Brand Column */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
                  style={{ boxShadow: "0 0 16px rgba(0,144,255,0.2)", border: "1px solid rgba(0,144,255,0.2)" }}
                >
                  <img src={logoImage} alt="Astro" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gradient-gold-animated flex items-center gap-1.5">
                    Astro
                    <Crown className="w-3.5 h-3.5 text-primary" />
                  </h3>
                  <p className="text-[10px] text-muted-foreground/60 tracking-widest uppercase">Gaming Store</p>
                </div>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                أفضل متجر لشحن الألعاب في مصر. نقدم خدماتنا بأسرع وقت وأفضل الأسعار مع ضمان كامل على كل عملية.
              </p>

              {/* Dynamic Social Icons from Contact Settings */}
              {socialLinks.length > 0 && (
                <div className="flex items-center gap-2 mt-5 flex-wrap">
                  {socialLinks.map((social) => (
                    <motion.a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 ${social.bg}`}
                      data-testid={`link-footer-${social.label}`}
                      aria-label={social.label}
                    >
                      <social.icon className={`w-4 h-4 ${social.color}`} />
                    </motion.a>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold mb-4 text-gradient-gold text-sm">روابط سريعة</h4>
              <ul className="space-y-1.5">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-2 text-muted-foreground text-sm px-2 py-1.5 rounded-lg transition-all duration-200 hover:text-foreground hover:bg-white/5 group"
                      data-testid={`footer-link-${link.href.replace("/", "") || "home"}`}
                    >
                      <div className="w-1 h-1 rounded-full bg-primary/30 group-hover:bg-primary transition-colors flex-shrink-0" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-8 pt-5 relative">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
              <p className="text-xs text-muted-foreground/60">
                &copy; {new Date().getFullYear()} <span className="text-gradient-gold font-semibold">Astro</span>. جميع الحقوق محفوظة.
              </p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                <span>Made with</span>
                <span className="text-primary">♥</span>
                <span>in Egypt</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
