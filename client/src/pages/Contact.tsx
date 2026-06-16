import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { SiInstagram, SiTiktok, SiYoutube, SiWhatsapp } from "react-icons/si";
import logoImage from "@assets/IMG-20260310-WA0032_1773642840088.jpg";

interface Settings {
  instagram_link?: string;
  tiktok_link?: string;
  youtube_link?: string;
  whatsapp_channel?: string;
}

const DEFAULT_LINKS = {
  instagram: "https://www.instagram.com/astro_mostafa?igsh=cjFhMjVyM2NyM2Fr",
  tiktok: "https://www.tiktok.com/@astro__freefire?_r=1&_t=ZS-94jfH4cyk2W",
  youtube: "https://youtube.com/@astro_1_freefire?si=iKO50bV_qOSTlLcL",
  whatsapp: "https://whatsapp.com/channel/0029Vainyau5Ui2YMW0Pqg36",
};

export default function Contact() {
  const { data: settings = {} as Settings } = useQuery<Settings>({
    queryKey: ["/api/public/settings"],
  });

  const instagram = settings.instagram_link || DEFAULT_LINKS.instagram;
  const tiktok = settings.tiktok_link || DEFAULT_LINKS.tiktok;
  const youtube = settings.youtube_link || DEFAULT_LINKS.youtube;
  const whatsapp = settings.whatsapp_channel || DEFAULT_LINKS.whatsapp;

  const socials = [
    {
      icon: <SiInstagram className="w-7 h-7" />,
      label: "إنستجرام",
      handle: "@astro_mostafa",
      url: instagram,
      gradient: "from-purple-600 via-pink-500 to-orange-400",
      glow: "rgba(236,72,153,0.3)",
      desc: "تابعنا على إنستجرام",
    },
    {
      icon: <SiTiktok className="w-7 h-7" />,
      label: "تيك توك",
      handle: "@astro__freefire",
      url: tiktok,
      gradient: "from-slate-800 via-slate-700 to-slate-600",
      glow: "rgba(255,255,255,0.15)",
      desc: "شاهد مقاطعنا",
    },
    {
      icon: <SiYoutube className="w-7 h-7" />,
      label: "يوتيوب",
      handle: "@astro_1_freefire",
      url: youtube,
      gradient: "from-red-700 via-red-600 to-red-500",
      glow: "rgba(239,68,68,0.3)",
      desc: "قناتنا الرسمية",
    },
    {
      icon: <SiWhatsapp className="w-7 h-7" />,
      label: "قناة الواتساب",
      handle: "ASTRO Gaming",
      url: whatsapp,
      gradient: "from-green-700 via-green-600 to-green-500",
      glow: "rgba(34,197,94,0.3)",
      desc: "انضم لقناتنا",
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      dir="rtl"
      style={{ background: "linear-gradient(160deg, #02040e 0%, #06091a 100%)" }}
    >
      <div className="max-w-lg mx-auto w-full px-4 py-10">

        {/* Logo + Header */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-20 h-20 rounded-3xl overflow-hidden mb-4"
            style={{ boxShadow: "0 0 40px rgba(212,175,55,0.25)", border: "2px solid rgba(212,175,55,0.3)" }}
          >
            <img src={logoImage} alt="ASTRO" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">تواصل معنا</h1>
          <p className="text-sm text-white/35 text-center">تابعنا على منصات التواصل الاجتماعي</p>
          <div className="h-px w-24 mt-4" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)" }} />
        </div>

        {/* Social Cards */}
        <div className="space-y-3">
          {socials.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`link-social-${s.label}`}
              className="flex items-center gap-4 p-4 rounded-2xl transition-all active:scale-[0.98] hover:scale-[1.01]"
              style={{
                background: "linear-gradient(160deg, rgba(10,18,42,0.9), rgba(4,6,18,0.95))",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: `0 4px 24px ${s.glow}20`,
                textDecoration: "none",
              }}
            >
              {/* Icon */}
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shrink-0`}
                style={{ boxShadow: `0 4px 16px ${s.glow}` }}
              >
                {s.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-base leading-tight">{s.label}</p>
                <p className="text-sm text-white/40 mt-0.5 truncate" dir="ltr">{s.handle}</p>
                <p className="text-xs text-white/25 mt-0.5">{s.desc}</p>
              </div>

              {/* Arrow */}
              <ExternalLink className="w-4 h-4 text-white/20 shrink-0" />
            </a>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-white/20 mt-10">
          ASTRO Gaming © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
