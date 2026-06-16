import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useCustomer, customerFetch } from "@/hooks/useCustomer";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ParticleBackground } from "@/components/ParticleBackground";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingBag, TrendingUp, ChevronRight, CheckCircle2, Clock,
  XCircle, Unlock, Shield, Banknote, Loader2, ArrowLeft,
  Package, BadgeCheck, CircleDot, Phone, DollarSign, Star,
  Eye, RefreshCw
} from "lucide-react";

// ─── Status configs ───────────────────────────────────────────────────────────
const BUYER_STATUS: Record<string, { label: string; color: string; icon: any }> = {
  payment_pending:   { label: "انتظار الدفع",          color: "#f59e0b", icon: CircleDot },
  payment_review:    { label: "مراجعة الدفع",           color: "#f97316", icon: Clock },
  payment_confirmed: { label: "تم تأكيد الدفع",         color: "#10b981", icon: BadgeCheck },
  credentials_sent:  { label: "تم إرسال بيانات الحساب", color: "#0ea5e9", icon: Unlock },
  completed:         { label: "تمت العملية بنجاح",      color: "#22c55e", icon: CheckCircle2 },
  cancelled:         { label: "ملغي",                   color: "#ef4444", icon: XCircle },
};

const SELLER_STEPS = [
  { key: "submitted",  label: "تم تقديم الطلب",       icon: Package },
  { key: "approved",   label: "تمت الموافقة والنشر",   icon: BadgeCheck },
  { key: "sold",       label: "تم بيع الحساب",         icon: ShoppingBag },
  { key: "payout",     label: "تم صرف المستحقات",      icon: Banknote },
];

const PAYOUT_MAP: Record<string, { label: string; color: string }> = {
  pending_confirmation: { label: "بانتظار تأكيد المشتري", color: "#f59e0b" },
  ready_for_payout:     { label: "جاهز للسحب",            color: "#10b981" },
  info_received:        { label: "تم استلام الرقم",        color: "#0ea5e9" },
  payout_sent:          { label: "تم تحويل المستحقات",     color: "#22c55e" },
};

// ─── Buyer Card ───────────────────────────────────────────────────────────────
function BuyerOrderCard({ order, onView }: { order: any; onView: () => void }) {
  const st = BUYER_STATUS[order.accountOrderStatus || "payment_pending"];
  const Icon = st?.icon || CircleDot;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border border-white/8 bg-white/3 overflow-hidden"
      data-testid={`buyer-order-${order.id}`}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${st?.color || "#6366f1"}, transparent)` }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-sm">{order.account?.title || "حساب"}</p>
            <p className="text-[11px] text-white/40 mt-0.5">{new Date(order.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <Badge className="border-0 text-[10px] flex items-center gap-1" style={{ background: `${st?.color}20`, color: st?.color }}>
            <Icon className="w-2.5 h-2.5" />
            {st?.label}
          </Badge>
        </div>

        {/* Mini timeline */}
        <div className="flex items-center gap-1 mb-3">
          {["payment_pending", "payment_review", "payment_confirmed", "credentials_sent", "completed"].map((key, i) => {
            const steps = ["payment_pending", "payment_review", "payment_confirmed", "credentials_sent", "completed"];
            const currentIdx = steps.indexOf(order.accountOrderStatus || "payment_pending");
            const isCancelled = order.accountOrderStatus === "cancelled";
            const isDone = i <= currentIdx && !isCancelled;
            const s = BUYER_STATUS[key];
            return (
              <div key={key} className="flex items-center flex-1">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: isDone ? s.color : "rgba(255,255,255,0.06)", border: `1.5px solid ${isDone ? s.color : "rgba(255,255,255,0.12)"}` }}>
                  {isDone && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                {i < 4 && <div className="h-0.5 flex-1" style={{ background: isDone && i < currentIdx ? s.color : "rgba(255,255,255,0.08)" }} />}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-base font-black text-amber-400">{order.totalPrice} جنيه</p>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-white/60 hover:text-white" onClick={onView}>
            <Eye className="w-3 h-3" />
            تفاصيل
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Seller Card ──────────────────────────────────────────────────────────────
function SellerRequestCard({ req, onPayoutInfo }: { req: any; onPayoutInfo: (req: any) => void }) {
  const sellerStep = req.status === "rejected" ? -1
    : !req.isSold ? (req.status === "approved" ? 1 : 0)
    : req.payoutStatus === "payout_sent" ? 3
    : 2;

  const isRejected = req.status === "rejected";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border border-white/8 bg-white/3 overflow-hidden"
      data-testid={`seller-req-${req.id}`}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-sm">{req.accountTitle || req.title}</p>
            <p className="text-[11px] text-white/40 mt-0.5">{req.gameType || req.game || ""}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40">مستحقاتك</p>
            <p className="text-sm font-black text-green-400">{req.sellerPrice} ج</p>
          </div>
        </div>

        {isRejected ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/15">
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-400">تم رفض الطلب</p>
              {req.adminNote && <p className="text-[10px] text-red-400/60 mt-0.5">{req.adminNote}</p>}
            </div>
          </div>
        ) : (
          <>
            {/* Seller timeline */}
            <div className="flex items-center gap-1 mb-3">
              {SELLER_STEPS.map((step, i) => {
                const isDone = i <= sellerStep;
                const isCurrent = i === sellerStep && sellerStep < 3;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="relative w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isDone ? "linear-gradient(135deg, #a855f7, #7c3aed)" : "rgba(255,255,255,0.05)",
                        border: `1.5px solid ${isDone ? "#a855f7" : "rgba(255,255,255,0.1)"}`,
                        boxShadow: isCurrent ? "0 0 10px #a855f760" : "none",
                      }}>
                      <Icon className="w-3 h-3" style={{ color: isDone ? "#fff" : "rgba(255,255,255,0.25)" }} />
                    </div>
                    {i < SELLER_STEPS.length - 1 && (
                      <div className="h-0.5 flex-1 mx-0.5 rounded-full" style={{ background: isDone && i < sellerStep ? "linear-gradient(90deg, #a855f7, #7c3aed)" : "rgba(255,255,255,0.08)" }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Current step label */}
            <div className="mb-3">
              {sellerStep < 3 && (
                <p className="text-[11px]" style={{ color: "#a855f7" }}>
                  {sellerStep === 0 && "طلبك قيد المراجعة من الأدمن"}
                  {sellerStep === 1 && "حسابك منشور على المنصة وينتظر المشتري"}
                  {sellerStep === 2 && "🎉 تم بيع الحساب! جارٍ تحضير مستحقاتك"}
                </p>
              )}
              {sellerStep === 3 && (
                <p className="text-[11px] text-green-400">✅ تم تحويل المستحقات بنجاح</p>
              )}
            </div>

            {/* Payout status badge */}
            {req.payoutStatus && PAYOUT_MAP[req.payoutStatus] && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/3 border border-white/8 mb-3">
                <Banknote className="w-3.5 h-3.5 flex-shrink-0" style={{ color: PAYOUT_MAP[req.payoutStatus].color }} />
                <div>
                  <p className="text-[10px] text-white/40">حالة الصرف</p>
                  <p className="text-xs font-semibold" style={{ color: PAYOUT_MAP[req.payoutStatus].color }}>
                    {PAYOUT_MAP[req.payoutStatus].label}
                  </p>
                </div>
              </div>
            )}

            {/* Vodafone cash input for payout */}
            {req.isSold && !req.vodafoneCashNumber && req.payoutOrderId && (
              <Button
                size="sm"
                className="w-full h-8 text-xs rounded-xl bg-purple-600/30 border border-purple-500/30 text-purple-300 hover:bg-purple-600/50"
                onClick={() => onPayoutInfo(req)}
              >
                <Phone className="w-3 h-3 ml-1" />
                أدخل رقم فودافون كاش لاستلام مستحقاتك
              </Button>
            )}

            {req.vodafoneCashNumber && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-green-500/8 border border-green-500/15">
                <Phone className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/40">رقم الاستلام</p>
                  <p className="text-xs font-mono text-green-300">{req.vodafoneCashNumber}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AccountTracking() {
  const [, setLocation] = useLocation();
  const { isLoggedIn } = useCustomer();
  const { toast } = useToast();
  const [tab, setTab] = useState<"buyer" | "seller">("buyer");
  const [payoutModal, setPayoutModal] = useState<any>(null);
  const [vodafoneCash, setVodafoneCash] = useState("");

  const { data: accountOrders = [], isLoading: loadingOrders, refetch: refetchOrders } = useQuery<any[]>({
    queryKey: ["/api/customer/account-orders"],
    enabled: isLoggedIn,
    queryFn: async () => {
      const res = await customerFetch("/api/customer/account-orders");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { data: sellRequests = [], isLoading: loadingSell, refetch: refetchSell } = useQuery<any[]>({
    queryKey: ["/api/customer/sell-requests"],
    enabled: isLoggedIn,
    queryFn: async () => {
      const res = await customerFetch("/api/customer/sell-requests");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const payoutInfoMutation = useMutation({
    mutationFn: ({ orderId, vodafoneCashNumber }: { orderId: string; vodafoneCashNumber: string }) =>
      apiRequest("POST", `/api/customer/account-orders/${orderId}/payout-info`, { vodafoneCashNumber }),
    onSuccess: () => {
      toast({ title: "✅ تم حفظ رقمك! سيتم التحويل قريباً" });
      setPayoutModal(null);
      setVodafoneCash("");
      refetchSell();
      queryClient.invalidateQueries({ queryKey: ["/api/customer/sell-requests"] });
    },
    onError: () => toast({ title: "خطأ في الحفظ", variant: "destructive" }),
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-3 opacity-50" />
          <p className="text-white/60 mb-4">سجّل دخولك لعرض طلباتك</p>
          <Button onClick={() => setLocation("/")}>الرئيسية</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <ParticleBackground />

      {/* Payout Modal */}
      {payoutModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setPayoutModal(null); }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm rounded-3xl border border-purple-500/20 bg-[#0f0f1a] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                <Phone className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-bold text-sm">بيانات استلام المستحقات</p>
                <p className="text-[11px] text-white/40">مستحقاتك: <strong className="text-green-400">{payoutModal.sellerPrice} جنيه</strong></p>
              </div>
            </div>
            <div>
              <p className="text-xs text-white/50 mb-2">أدخل رقم فودافون كاش</p>
              <Input
                placeholder="01XXXXXXXXX"
                value={vodafoneCash}
                onChange={(e) => setVodafoneCash(e.target.value)}
                className="bg-white/5 border-white/15 text-white text-sm h-11 rounded-xl font-mono"
                dir="ltr"
                maxLength={11}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 text-white/50" onClick={() => setPayoutModal(null)}>إلغاء</Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                disabled={vodafoneCash.length < 10 || payoutInfoMutation.isPending}
                onClick={() => payoutInfoMutation.mutate({ orderId: payoutModal.payoutOrderId, vodafoneCashNumber: vodafoneCash })}
              >
                {payoutInfoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ الرقم"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-md">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" className="w-9 h-9 p-0 rounded-xl" onClick={() => setLocation("/dashboard")}>
            <ChevronRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-black">تتبع طلبات الحسابات</h1>
            <p className="text-[11px] text-white/40">المشتري والبائع</p>
          </div>
        </div>

        {/* Tab Switch */}
        <div className="flex gap-2 p-1.5 rounded-2xl bg-white/4 border border-white/6 mb-6">
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "buyer" ? "bg-primary text-black shadow-lg" : "text-white/50 hover:text-white"}`}
            onClick={() => setTab("buyer")}
            data-testid="tab-buyer"
          >
            <ShoppingBag className="w-4 h-4" />
            مشتري
            {accountOrders.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${tab === "buyer" ? "bg-black/20" : "bg-white/10"}`}>{accountOrders.length}</span>
            )}
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "seller" ? "bg-purple-600 text-white shadow-lg" : "text-white/50 hover:text-white"}`}
            onClick={() => setTab("seller")}
            data-testid="tab-seller"
          >
            <TrendingUp className="w-4 h-4" />
            بائع
            {sellRequests.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${tab === "seller" ? "bg-white/20" : "bg-white/10"}`}>{sellRequests.length}</span>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Buyer Tab ── */}
          {tab === "buyer" && (
            <motion.div key="buyer" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              {loadingOrders ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : accountOrders.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-8 h-8 text-primary opacity-50" />
                  </div>
                  <p className="text-white/50 text-sm">لم تشتري أي حساب بعد</p>
                  <Button size="sm" className="glow-soft rounded-xl" onClick={() => setLocation("/accounts")}>
                    تصفح الحسابات
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-white/40">{accountOrders.length} طلب</p>
                    <button className="text-xs text-primary/60 hover:text-primary flex items-center gap-1" onClick={() => refetchOrders()}>
                      <RefreshCw className="w-3 h-3" />تحديث
                    </button>
                  </div>
                  {accountOrders.map((order) => (
                    <BuyerOrderCard
                      key={order.id}
                      order={order}
                      onView={() => setLocation(`/account-order/${order.accountId}`)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Seller Tab ── */}
          {tab === "seller" && (
            <motion.div key="seller" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {loadingSell ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                </div>
              ) : sellRequests.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto">
                    <TrendingUp className="w-8 h-8 text-purple-400 opacity-50" />
                  </div>
                  <p className="text-white/50 text-sm">لم تبع أي حساب بعد</p>
                  <Button size="sm" className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setLocation("/sell-account")}>
                    بيع حساب
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-white/40">{sellRequests.length} طلب بيع</p>
                    <button className="text-xs text-purple-400/60 hover:text-purple-400 flex items-center gap-1" onClick={() => refetchSell()}>
                      <RefreshCw className="w-3 h-3" />تحديث
                    </button>
                  </div>

                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: "قيد المراجعة", count: sellRequests.filter(r => r.status === "pending").length, color: "#f59e0b" },
                      { label: "منشور", count: sellRequests.filter(r => r.status === "approved" && !r.isSold).length, color: "#10b981" },
                      { label: "تم البيع", count: sellRequests.filter(r => r.isSold).length, color: "#a855f7" },
                    ].map(stat => (
                      <div key={stat.label} className="rounded-xl p-2.5 text-center" style={{ background: `${stat.color}12`, border: `1px solid ${stat.color}25` }}>
                        <p className="text-lg font-black" style={{ color: stat.color }}>{stat.count}</p>
                        <p className="text-[9px] text-white/40">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {sellRequests.map((req) => (
                    <SellerRequestCard
                      key={req.id}
                      req={req}
                      onPayoutInfo={(r) => { setPayoutModal(r); setVodafoneCash(r.vodafoneCashNumber || ""); }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom links */}
        <div className="mt-8 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 border-white/10 text-white/50 rounded-xl" onClick={() => setLocation("/accounts")}>
            تصفح الحسابات
          </Button>
          <Button variant="outline" size="sm" className="flex-1 border-white/10 text-white/50 rounded-xl" onClick={() => setLocation("/sell-account")}>
            بيع حساب
          </Button>
        </div>
      </div>
    </div>
  );
}
