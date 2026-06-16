import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Package, MessageCircle, Clock, CheckCircle, XCircle, Loader2, Bell, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Link, useLocation } from "wouter";
import { useCustomer, customerFetch } from "@/hooks/useCustomer";
import { XPAnimation } from "@/components/XPAnimation";
import { calculateLevelInfo } from "@/lib/levelSystem";

interface OrderWithDetails {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  status: string;
  totalAmount: number;
  loginType: string | null;
  playerId: string;
  createdAt: string;
  game?: { nameAr: string; icon: string; color: string } | null;
  package?: { amount: string } | null;
}

const statusMap: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "قيد المراجعة", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25", icon: Clock },
  processing: { label: "جاري التنفيذ", color: "bg-blue-500/15 text-blue-400 border-blue-500/25", icon: Loader2 },
  completed: { label: "مكتمل", color: "bg-green-500/15 text-green-400 border-green-500/25", icon: CheckCircle },
  cancelled: { label: "ملغي", color: "bg-red-500/15 text-red-400 border-red-500/25", icon: XCircle },
};

export default function MyOrders() {
  const { customer, isLoggedIn, isLoading: authLoading } = useCustomer();
  const [, navigate] = useLocation();
  const [showXP, setShowXP] = useState(false);
  const prevCompletedRef = useRef<number>(-1);
  const [prevCompleted, setPrevCompleted] = useState<number>(-1);

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/customer/orders"],
    enabled: isLoggedIn,
    refetchInterval: 20000,
    queryFn: async () => {
      const res = await customerFetch("/api/customer/orders");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const completedOrders = orders.filter(o => o.status === "completed").length;

  useEffect(() => {
    if (completedOrders > 0 && prevCompletedRef.current === -1) {
      prevCompletedRef.current = completedOrders;
      setPrevCompleted(completedOrders);
      return;
    }
    if (prevCompletedRef.current !== -1 && completedOrders > prevCompletedRef.current) {
      setPrevCompleted(prevCompletedRef.current);
      setShowXP(true);
      prevCompletedRef.current = completedOrders;
    } else {
      prevCompletedRef.current = completedOrders;
    }
  }, [completedOrders]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center relative" dir="rtl">
        <ParticleBackground />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center glass-card rounded-2xl p-8 max-w-sm mx-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">يجب تسجيل الدخول</h2>
          <p className="text-muted-foreground text-sm mb-5">سجل دخولك لعرض طلباتك ومتابعة حالة الشحن</p>
          <Link href="/">
            <Button className="w-full glow-soft" data-testid="button-login-redirect">
              تسجيل الدخول
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const levelInfo = calculateLevelInfo(completedOrders);

  return (
    <div className="min-h-screen relative">
      <ParticleBackground />

      <XPAnimation
        show={showXP}
        previousOrders={prevCompleted}
        currentOrders={completedOrders}
        onComplete={() => setShowXP(false)}
      />

      <div className="relative z-10 py-6 sm:py-8 md:py-12 container mx-auto px-3 sm:px-4 max-w-3xl" dir="rtl">
        <motion.div
          className="text-center mb-6 sm:mb-8"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/70 to-blue-500/60 flex items-center justify-center mb-3 glow-soft">
            <Package className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-1.5">
            <span className="text-gradient-gold-animated">طلباتي</span>
          </h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">أهلاً {customer?.name || customer?.username}</span>
            <span className="text-sm" style={{ color: levelInfo.color }}>{levelInfo.icon} {levelInfo.rank}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {ordersLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            </div>
          ) : orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-10 rounded-2xl text-center"
            >
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm mb-4">لا توجد طلبات بعد</p>
              <Link href="/games">
                <Button className="glow-soft" data-testid="button-start-shopping">
                  ابدأ التسوق الآن
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-2.5">
              <AnimatePresence>
                {orders.map((order, idx) => {
                  const st = statusMap[order.status] || statusMap.pending;
                  const StatusIcon = st.icon;
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="glass-card rounded-xl p-3 sm:p-4"
                      data-testid={`card-order-${order.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${order.game?.color || "from-gray-500 to-gray-700"} flex items-center justify-center text-base flex-shrink-0`}>
                            {order.game?.icon || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs sm:text-sm">{order.game?.nameAr || "طلب"}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">{order.package?.amount || ""}</p>
                            <p className="text-[10px] text-muted-foreground" dir="ltr">#{order.orderNumber}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className={`text-[10px] ${st.color}`}>
                            <StatusIcon className="w-3 h-3 ml-1" />
                            {st.label}
                          </Badge>
                          <p className="text-xs sm:text-sm font-bold text-primary">{order.totalAmount} ج.م</p>
                          {order.status === "completed" && (
                            <span className="text-[10px] text-amber-400">+100 XP ✨</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2.5 pt-2.5 border-t border-white/6 flex items-center justify-between flex-wrap gap-2">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <Link href={`/chat/${order.id}`}>
                          <Button size="sm" variant="outline" className="text-xs" data-testid={`button-chat-${order.id}`}>
                            <MessageCircle className="w-3 h-3 ml-1" />
                            محادثة
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
