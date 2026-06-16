import { ParticleBackground } from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Facebook, MessageCircle, ExternalLink, CheckCircle, Users, Zap, UserCheck, HeadphonesIcon } from "lucide-react";
import { guaranteeLinks } from "@/lib/gameData";

export default function Guarantee() {
  return (
    <div className="min-h-screen relative">
      <ParticleBackground />

      <div className="relative z-10 py-6 sm:py-8 md:py-12 container mx-auto px-3 sm:px-4">
        <motion.div
          className="text-center mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 sm:w-18 sm:h-18 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 sm:w-9 sm:h-9 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">ضمان التعامل</h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            نحن ملتزمون بتقديم أفضل خدمة لعملائنا. تصفح روابط الضمان وانضم لمجتمعنا للتأكد من مصداقيتنا.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="glass-ultra p-4 sm:p-5 rounded-xl glow-soft">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600/70 rounded-xl flex items-center justify-center shrink-0">
                  <Facebook className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-bold mb-1.5">منشور الضمان على فيسبوك</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm mb-3">
                    تصفح منشور الضمان الرسمي على صفحتنا للتأكد من مصداقيتنا وقراءة تقييمات العملاء
                  </p>
                  <a
                    href={guaranteeLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="glow-soft text-xs sm:text-sm" data-testid="link-facebook-guarantee">
                      <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                      فتح المنشور
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-lg sm:text-xl font-bold mb-3 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-500" />
              جروبات الواتساب
            </h2>
            <p className="text-muted-foreground text-xs sm:text-sm mb-4">
              انضم لجروباتنا على واتساب للتواصل المباشر ومتابعة آخر العروض والتحديثات
            </p>

            <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
              {guaranteeLinks.whatsappGroups.map((link, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.06 }}
                >
                  <div className="glass-card p-3 sm:p-4 rounded-xl hover-elevate">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-green-600/70 rounded-full flex items-center justify-center shrink-0">
                        <MessageCircle className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">جروب واتساب {index + 1}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">انضم الآن للمجتمع</p>
                      </div>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="outline" className="border-green-500/20" data-testid={`link-whatsapp-${index + 1}`}>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="glass-premium p-4 sm:p-5 rounded-xl">
              <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                لماذا تثق بنا؟
              </h2>

              <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
                {[
                  { icon: Shield, title: "ضمان 100%", description: "ضمان كامل على جميع عمليات الشحن" },
                  { icon: Zap, title: "سرعة التنفيذ", description: "شحن فوري خلال دقائق معدودة" },
                  { icon: UserCheck, title: "+10,000 عميل", description: "آلاف العملاء السعداء يثقون بنا" },
                  { icon: HeadphonesIcon, title: "دعم مستمر", description: "فريق دعم متواجد على مدار الساعة" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-2.5 p-3 rounded-lg bg-white/3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="text-center"
          >
            <div className="glass-ultra p-5 sm:p-6 rounded-xl glow-soft">
              <Users className="w-10 h-10 text-primary mx-auto mb-3" />
              <h2 className="text-lg sm:text-xl font-bold mb-1.5">انضم لعائلة ASTRO</h2>
              <p className="text-muted-foreground text-xs sm:text-sm mb-4">
                كن جزءا من مجتمعنا واستمتع بأفضل العروض والخدمات
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge className="bg-primary/12 text-primary border-primary/20 px-3 py-1 text-xs">
                  عروض حصرية
                </Badge>
                <Badge className="bg-primary/12 text-primary border-primary/20 px-3 py-1 text-xs">
                  دعم أولوية
                </Badge>
                <Badge className="bg-primary/12 text-primary border-primary/20 px-3 py-1 text-xs">
                  أخبار أولا
                </Badge>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
