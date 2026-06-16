import { motion } from "framer-motion";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, CreditCard, Upload, Bell, MessageCircle, UserCircle, Shield, Gamepad2, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Gamepad2,
    title: "اختر اللعبة",
    desc: "من الصفحة الرئيسية أو صفحة الألعاب، اختر اللعبة اللي عايز تشحنها (PUBG, TikTok, Roblox, PES Mobile, FIFA Mobile)",
    color: "from-blue-500/70 to-cyan-500/60",
  },
  {
    icon: ShoppingCart,
    title: "اختر الباقة",
    desc: "اختر الباقة المناسبة ليك من الباقات المتاحة. كل باقة فيها الكمية والسعر بالجنيه المصري",
    color: "from-purple-500/70 to-fuchsia-500/60",
  },
  {
    icon: Search,
    title: "أدخل بياناتك",
    desc: "اكتب اسمك ورقم الواتساب وآيدي حسابك في اللعبة أو بيانات تسجيل الدخول حسب نوع الشحن",
    color: "from-green-500/70 to-emerald-500/60",
  },
  {
    icon: CreditCard,
    title: "اختر طريقة الدفع",
    desc: "اختر طريقة الدفع (كاش - Bybit - InstaPay - My Cashi) وحول المبلغ على الرقم الموضح",
    color: "from-amber-500/70 to-orange-500/60",
  },
  {
    icon: Upload,
    title: "ارفع إثبات الدفع",
    desc: "بعد التحويل، ارفع سكرين شوت للتحويلة كإثبات دفع. دي خطوة إجبارية لإتمام الطلب",
    color: "from-primary/70 to-cyan-500/60",
  },
  {
    icon: Bell,
    title: "تابع طلبك",
    desc: "بعد إرسال الطلب هتاخد رقم شحنة. ادخل صفحة 'طلباتي' واكتب رقم الشحنة أو رقم موبايلك لتتبع الحالة",
    color: "from-sky-500/70 to-blue-500/60",
  },
];

const faqs = [
  {
    q: "إيه الفرق بين الشحن بالـ ID والشحن بالـ Account؟",
    a: "الشحن بالـ ID: بتدخل آيدي حسابك بس والشحن بيتم من غير ما حد يدخل على حسابك. الشحن بالـ Account: بتدخل بيانات تسجيل الدخول (إيميل + باسورد) وبندخل على حسابك نشحنه وبعدين نطلع فوراً. ننصحك تغير الباسورد بعد الشحن.",
  },
  {
    q: "كم الوقت المطلوب لتنفيذ الطلب؟",
    a: "في الغالب الطلب بيتنفذ خلال دقائق من استلام إثبات الدفع. في أوقات الذروة ممكن ياخد شوية وقت أكتر.",
  },
  {
    q: "إزاي أتواصل لو حصلت مشكلة؟",
    a: "تقدر تتواصل معانا عن طريق الواتساب من صفحة التواصل، أو تفتح محادثة من صفحة طلباتي على الطلب المعين.",
  },
  {
    q: "إزاي أعرف آيدي حسابي في اللعبة؟",
    a: "كل لعبة ليها طريقة: في PUBG هتلاقي الآيدي في إعدادات الحساب داخل اللعبة. في Roblox و TikTok هو اسم المستخدم بتاعك. ألعاب الأكونت (PES, FIFA, PUBG Account) بتحتاج بيانات تسجيل الدخول.",
  },
  {
    q: "هل بياناتي آمنة؟",
    a: "أيوا، بياناتك محمية تماماً ومبنشاركهاش مع أي حد. لو اخترت شحن بالـ Account، بندخل نشحن وبنطلع فوراً.",
  },
  {
    q: "إيه طرق الدفع المتاحة؟",
    a: "متاح الدفع عن طريق: كاش (فودافون كاش / أورانج كاش)، Bybit، InstaPay، و My Cashi (للسودان).",
  },
];

const loginTypeGuide = [
  {
    icon: Search,
    title: "شحن بالـ ID",
    points: [
      "الطريقة الأسرع والأأمن",
      "بتدخل آيدي حسابك بس",
      "مفيش حاجة بتتغير في حسابك",
      "مناسب لمعظم الألعاب",
    ],
    color: "from-green-500/15 to-emerald-500/10",
    border: "border-green-500/20",
  },
  {
    icon: Shield,
    title: "شحن بالـ Account",
    points: [
      "لازم تدخل إيميل + باسورد",
      "لازم تختار طريقة الربط (فيسبوك، جوجل، الخ)",
      "غير الباسورد بعد الشحن",
      "بياناتك محمية ومبنحفظهاش",
    ],
    color: "from-amber-500/15 to-yellow-500/10",
    border: "border-amber-500/20",
  },
];

export default function Guide() {
  return (
    <div className="min-h-screen relative">
      <ParticleBackground />

      <div className="relative z-10 py-6 sm:py-8 md:py-12 container mx-auto px-3 sm:px-4">
        <motion.div
          className="text-center mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary/70 to-blue-500/60 flex items-center justify-center">
            <HelpCircle className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black mb-1.5">
            <span className="text-gradient-gold-animated">دليل استخدام الموقع</span>
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">خطوات بسيطة لشحن حسابك في دقائق</p>
        </motion.div>

        <div className="max-w-3xl mx-auto mb-8 sm:mb-10">
          <motion.h2
            className="text-lg font-bold mb-4 flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <ShoppingCart className="w-5 h-5 text-primary" />
            خطوات الشحن
          </motion.h2>

          <div className="space-y-3">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="glass-premium p-4 rounded-xl flex items-start gap-3"
                data-testid={`card-guide-step-${i + 1}`}
              >
                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                    <step.icon className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 border-primary/20 text-primary">
                    {i + 1}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base mb-1">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto mb-8 sm:mb-10">
          <motion.h2
            className="text-lg font-bold mb-4 flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Shield className="w-5 h-5 text-primary" />
            أنواع تسجيل الدخول
          </motion.h2>

          <div className="grid sm:grid-cols-2 gap-3">
            {loginTypeGuide.map((type, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.07 }}
                className={`glass-premium p-4 rounded-xl border ${type.border}`}
                data-testid={`card-login-type-guide-${i}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center`}>
                    <type.icon className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-bold text-sm">{type.title}</h3>
                </div>
                <ul className="space-y-1.5">
                  {type.points.map((point, j) => (
                    <li key={j} className="text-xs sm:text-sm text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary mt-0.5 text-[10px]">&#9679;</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto mb-8 sm:mb-10">
          <motion.h2
            className="text-lg font-bold mb-4 flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
          >
            <MessageCircle className="w-5 h-5 text-primary" />
            أسئلة شائعة
          </motion.h2>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="glass-card rounded-xl p-4"
                data-testid={`card-faq-${i}`}
              >
                <h4 className="font-bold text-sm mb-1.5 text-primary">{faq.q}</h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="max-w-3xl mx-auto"
        >
          <div className="glass-ultra p-5 sm:p-6 rounded-xl text-center relative overflow-hidden" data-testid="card-guide-cta">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-transparent to-primary/2 pointer-events-none" />
            <div className="relative z-10">
              <UserCircle className="w-10 h-10 mx-auto mb-3 text-primary" />
              <h3 className="text-base sm:text-lg font-bold mb-1.5">جاهز تبدأ؟</h3>
              <p className="text-muted-foreground text-xs sm:text-sm mb-4">
                اختر لعبتك وابدأ الشحن الآن
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/games">
                  <Button className="glow-soft w-full sm:w-auto" data-testid="button-guide-start">
                    <Gamepad2 className="w-4 h-4 ml-2" />
                    ابدأ الشحن
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" className="w-full sm:w-auto" data-testid="button-guide-contact">
                    <MessageCircle className="w-4 h-4 ml-2" />
                    تواصل معنا
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
