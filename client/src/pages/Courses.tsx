import { ParticleBackground } from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, CheckCircle, Sparkles, MessageCircle, Crown, Star, Zap } from "lucide-react";
import { coursesData } from "@/lib/gameData";

export default function Courses() {
  const handleOrderCourse = (courseTitle: string) => {
    const message = encodeURIComponent(`مرحباً، أريد الاستفسار عن ${courseTitle}`);
    window.open(`https://wa.me/+201553389396?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen relative">
      <ParticleBackground />

      <div className="relative z-10 py-8 md:py-12 container mx-auto px-4">
        <motion.div
          className="text-center mb-8 md:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-block mb-4"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-cyan-600 flex items-center justify-center shadow-lg glow-gold">
              <GraduationCap className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
          </motion.div>
          <h1 className="text-2xl md:text-4xl font-black mb-3">
            <span className="text-gradient-gold-animated">الدورات التدريبية</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            تعلم مهارات جديدة واكتسب خبرات قيمة من خلال كورساتنا المميزة
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 md:mb-12"
        >
          <Card className="glass-ultra p-4 md:p-8 glow-gold-mega max-w-3xl mx-auto relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
            <div className="absolute top-2 right-2 md:top-4 md:right-4">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                <Star className="w-6 h-6 md:w-8 md:h-8 text-primary/30" />
              </motion.div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary animate-pulse" />
                <Badge className="bg-primary text-primary-foreground px-3 py-1">
                  <Crown className="w-3 h-3 ml-1" />
                  عرض خاص
                </Badge>
              </div>
              <h2 className="text-lg md:text-2xl font-black mb-2">
                اشتري كورس الفيسبوك + التصميم
              </h2>
              <p className="text-muted-foreground text-sm md:text-base mb-4">
                واحصل على كورس شحن الألعاب مجاناً!
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground line-through">8000 جنيه</p>
                  <p className="text-2xl md:text-3xl font-black text-gradient-gold-animated">8000 جنيه</p>
                  <p className="text-xs md:text-sm text-green-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    + كورس الشحن مجاناً (1500 جنيه)
                  </p>
                </div>
                <Button
                  className="glow-gold-mega w-full sm:w-auto mobile-touch-feedback"
                  onClick={() => handleOrderCourse("عرض الكورسات الثلاثة")}
                  data-testid="button-order-bundle"
                >
                  <MessageCircle className="w-4 h-4 ml-2" />
                  استفسر الآن
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {coursesData.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1, type: "spring" }}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className="glass-ultra hover-elevate h-full flex flex-col mobile-touch-feedback group">
                <div className="p-4 md:p-6 flex-1">
                  <motion.div 
                    className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-3xl md:text-4xl mb-4 group-hover:scale-110 transition-transform"
                    whileHover={{ rotate: [0, -5, 5, 0] }}
                  >
                    {course.icon}
                  </motion.div>
                  <h3 className="text-lg md:text-xl font-bold mb-2 group-hover:text-primary transition-colors">{course.title}</h3>
                  <p className="text-muted-foreground text-sm md:text-base mb-4">{course.description}</p>

                  <div className="space-y-2 mb-4 md:mb-6">
                    {course.features.map((feature, i) => (
                      <motion.div 
                        key={i} 
                        className="flex items-center gap-2 text-xs md:text-sm"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                      >
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        </div>
                        <span>{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="p-4 md:p-6 pt-0 mt-auto">
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-2xl md:text-3xl font-black text-gradient-gold-animated">{course.price}</p>
                      <p className="text-xs md:text-sm text-muted-foreground">جنيه مصري</p>
                    </div>
                  </div>

                  <Button
                    className="w-full glow-gold mobile-touch-feedback"
                    onClick={() => handleOrderCourse(course.title)}
                    data-testid={`button-order-course-${course.id}`}
                  >
                    <MessageCircle className="w-4 h-4 ml-2" />
                    تواصل للحجز
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 md:mt-12"
        >
          <Card className="glass-ultra p-4 md:p-6 max-w-2xl mx-auto">
            <h2 className="text-lg md:text-xl font-bold mb-4 text-center text-gradient-gold">لماذا كورساتنا؟</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { icon: GraduationCap, label: "محتوى احترافي", color: "from-blue-500 to-cyan-500" },
                { icon: MessageCircle, label: "دعم مستمر", color: "from-green-500 to-emerald-500" },
                { icon: Zap, label: "تعلم سريع", color: "from-yellow-500 to-orange-500" },
                { icon: Crown, label: "شهادة إتمام", color: "from-purple-500 to-pink-500" },
              ].map((item) => (
                <motion.div 
                  key={item.label} 
                  className="text-center p-3 md:p-4 glass-premium rounded-xl mobile-touch-feedback"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className={`w-10 h-10 md:w-12 md:h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                    <item.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">{item.label}</p>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
