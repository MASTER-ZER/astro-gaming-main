import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useCustomer } from "@/hooks/useCustomer";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, Shield, Clock, CheckCircle2, XCircle, Upload,
  Eye, EyeOff, Copy, Check, AlertCircle, Loader2, Star, CreditCard,
  Smartphone, Lock, Unlock, Package, User, Phone, Wallet, ArrowRight,
  FileText, BadgeCheck, Banknote, TimerReset, CircleDot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Account, PaymentMethod } from "@shared/schema";

// ─── Status Config ───────────────────────────────────────────────────────────
const ACCOUNT_ORDER_STATUSES = [
  { key: "payment_pending",   label: "تم إنشاء الطلب",         icon: CircleDot,    color: "#6366f1" },
  { key: "payment_review",    label: "قيد مراجعة الدفع",       icon: Clock,        color: "#f59e0b" },
  { key: "payment_confirmed", label: "تم تأكيد الدفع",         icon: BadgeCheck,   color: "#10b981" },
  { key: "credentials_sent",  label: "تم إرسال بيانات الحساب", icon: Unlock,       color: "#0ea5e9" },
  { key: "completed",         label: "تمت العملية بنجاح",      icon: CheckCircle2, color: "#22c55e" },
  { key: "cancelled",         label: "تم إلغاء الطلب",         icon: XCircle,      color: "#ef4444" },
];

const PAYOUT_STATUSES: Record<string, { label: string; color: string }> = {
  pending_confirmation: { label: "بانتظار تأكيد المشتري",   color: "#f59e0b" },
  ready_for_payout:    { label: "جاهز للسحب",               color: "#10b981" },
  info_received:       { label: "تم استلام رقم فودافون",    color: "#0ea5e9" },
  payout_sent:         { label: "تم تحويل المستحقات",        color: "#22c55e" },
};

const LINKING_LABELS: Record<string, string> = {
  email: "إيميل", facebook: "فيسبوك", google: "جوجل",
  phone: "رقم هاتف", apple: "Apple ID", other: "أخرى", tiktok: "تيك توك",
};

// ─── Image Preview Modal ─────────────────────────────────────────────────────
function ImagePreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button onClick={() => setScale(s => Math.min(s + 0.5, 5))} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl font-bold">+</button>
        <button onClick={() => { setScale(1); setPos({ x: 0, y: 0 }); }} className="px-3 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm">إعادة</button>
        <button onClick={() => setScale(s => Math.max(s - 0.5, 0.5))} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xl font-bold">−</button>
        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-white ml-2">✕</button>
      </div>
      <div className="text-white/40 text-xs absolute bottom-4 left-1/2 -translate-x-1/2">اسحب للتحريك • اضغط خارج الصورة للإغلاق</div>
      <div
        className="overflow-hidden w-[90vw] h-[80vh] flex items-center justify-center"
        onMouseDown={(e) => { setDragging(true); dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }; }}
        onMouseMove={(e) => { if (!dragging) return; setPos({ x: dragStart.current.px + e.clientX - dragStart.current.x, y: dragStart.current.py + e.clientY - dragStart.current.y }); }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        <img
          src={src}
          alt="معاينة"
          style={{ transform: `scale(${scale}) translate(${pos.x / scale}px, ${pos.y / scale}px)`, transition: dragging ? "none" : "transform 0.2s", maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain", userSelect: "none" }}
          draggable={false}
        />
      </div>
    </div>
  );
}

// ─── Status Timeline ─────────────────────────────────────────────────────────
function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const steps = ACCOUNT_ORDER_STATUSES.filter(s => s.key !== "cancelled");
  const isCancelled = currentStatus === "cancelled";
  const currentIdx = steps.findIndex(s => s.key === currentStatus);

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl border border-red-500/20 bg-red-500/10">
        <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-red-400">تم إلغاء الطلب</p>
          <p className="text-xs text-red-400/60">تواصل مع الدعم للاستفسار</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isDone = i < currentIdx || currentStatus === "completed";
        const isCurrent = i === currentIdx && currentStatus !== "completed";
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-stretch gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${isDone || isCurrent ? "ring-2 ring-offset-2 ring-offset-background" : ""}`}
                style={{
                  background: isDone ? step.color : isCurrent ? `${step.color}30` : "rgba(255,255,255,0.05)",
                  ["--tw-ring-color" as any]: step.color,
                  borderColor: isCurrent ? step.color : "transparent",
                  border: isCurrent ? `2px solid ${step.color}` : "2px solid transparent",
                }}
              >
                <Icon className="w-4 h-4" style={{ color: isDone || isCurrent ? (isDone ? "#fff" : step.color) : "rgba(255,255,255,0.3)" }} />
              </div>
              {i < steps.length - 1 && (
                <div className="w-0.5 flex-1 my-1 rounded-full" style={{ background: i < currentIdx ? steps[i].color : "rgba(255,255,255,0.08)", minHeight: "20px" }} />
              )}
            </div>
            <div className={`pb-4 pt-1 flex-1 min-w-0 ${i === steps.length - 1 ? "pb-0" : ""}`}>
              <p className={`text-sm font-semibold leading-tight ${isDone || isCurrent ? "text-white" : "text-white/30"}`}>
                {step.label}
              </p>
              {isCurrent && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs mt-0.5" style={{ color: step.color }}>
                  جارٍ التنفيذ...
                </motion.p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AccountOrder() {
  const { accountId } = useParams<{ accountId: string }>();
  const [, setLocation] = useLocation();
  const { customer, isLoggedIn } = useCustomer();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"details" | "payment" | "proof" | "tracking">("details");
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [senderPhone, setSenderPhone] = useState(customer?.phone || "");
  const [buyerName, setBuyerName] = useState(customer?.name || "");
  const [buyerPhone, setBuyerPhone] = useState(customer?.phone || "");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [copied, setCopied] = useState(false);
  const [vodafoneCash, setVodafoneCash] = useState("");
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  const { data: account, isLoading: loadingAccount } = useQuery<Account & { game?: any }>({
    queryKey: ["/api/accounts", accountId],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${accountId}`);
      if (!res.ok) throw new Error("الحساب غير موجود");
      return res.json();
    },
    enabled: !!accountId,
  });

  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

  const { data: myOrders = [], refetch: refetchOrders } = useQuery<any[]>({
    queryKey: ["/api/customer/account-orders"],
    enabled: isLoggedIn,
  });

  const existingOrder = myOrders.find((o: any) => o.accountId === accountId);
  const trackingOrder = currentOrderId ? myOrders.find((o: any) => o.id === currentOrderId) : existingOrder;

  const createOrderMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/account-orders", data),
    onSuccess: async (order: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/account-orders"] });
      setCurrentOrderId(order.id);
      setStep("proof");
      toast({ title: "✅ تم إنشاء الطلب", description: `رقم الطلب: ${order.orderNumber}` });
    },
    onError: (err: any) => {
      toast({ title: "❌ خطأ", description: err.message || "فشل في إنشاء الطلب", variant: "destructive" });
    },
  });

  const uploadProofMutation = useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: any }) =>
      apiRequest("PATCH", `/api/account-orders/${orderId}/upload-proof`, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/account-orders"] });
      await refetchOrders();
      setStep("tracking");
      toast({ title: "📸 تم رفع الإثبات", description: "سيتم مراجعة الدفع قريباً" });
    },
    onError: (err: any) => {
      toast({ title: "❌ خطأ", description: err.message, variant: "destructive" });
    },
  });

  const confirmReceiptMutation = useMutation({
    mutationFn: (orderId: string) => apiRequest("POST", `/api/customer/account-orders/${orderId}/confirm-receipt`, {}),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/account-orders"] });
      await refetchOrders();
      toast({ title: "🎉 تم التأكيد!", description: "شكراً لتأكيدك. تم إضافة 100 نقطة لحسابك!" });
    },
  });

  const payoutInfoMutation = useMutation({
    mutationFn: ({ orderId, vodafoneCashNumber }: { orderId: string; vodafoneCashNumber: string }) =>
      apiRequest("POST", `/api/customer/account-orders/${orderId}/payout-info`, { vodafoneCashNumber }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/account-orders"] });
      await refetchOrders();
      toast({ title: "📱 تم الحفظ", description: "سيتم التحويل قريباً" });
    },
  });

  const handleFileUpload = async (file: File) => {
    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadResponse.ok) throw new Error("فشل الرفع");
      const uploadData = await uploadResponse.json();
      setProofUrl(uploadData.objectPath || uploadData.url || uploadData.filePath);
    } catch {
      toast({ title: "خطأ في رفع الصورة", variant: "destructive" });
    } finally {
      setUploadingProof(false);
    }
  };

  const handleCopyCredentials = () => {
    if (trackingOrder?.credentialsDelivered) {
      navigator.clipboard.writeText(trackingOrder.credentialsDelivered);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Lock className="w-16 h-16 text-white/20 mx-auto" />
          <p className="text-white/60">يجب تسجيل الدخول لشراء الحسابات</p>
          <Button onClick={() => setLocation("/accounts")}>العودة</Button>
        </div>
      </div>
    );
  }

  if (loadingAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-white/60">الحساب غير موجود</p>
          <Button variant="outline" onClick={() => setLocation("/accounts")}>العودة للحسابات</Button>
        </div>
      </div>
    );
  }

  const buyerPrice = Math.ceil(account.price * 1.04);
  const activeOrderMethods = paymentMethods.filter((m: any) => m.isActive);

  // If there's an existing order, go to tracking
  const displayStep = (existingOrder && step === "details") ? "tracking" : step;

  return (
    <div className="min-h-screen pb-20" style={{ background: "linear-gradient(135deg, #060814 0%, #0a0f1e 50%, #060814 100%)" }}>
      {previewImg && <ImagePreviewModal src={previewImg} onClose={() => setPreviewImg(null)} />}

      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/8" style={{ background: "rgba(6,8,20,0.85)" }}>
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => setLocation("/accounts")} className="w-8 h-8 rounded-xl bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors">
            <ChevronLeft className="w-4 h-4 text-white/70" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white truncate">شراء حساب</h1>
            <p className="text-[10px] text-white/40 truncate">{account.title}</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/25">
            <Shield className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-semibold text-primary">مشتريات آمنة</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-lg space-y-4">

        {/* Account Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl overflow-hidden border border-white/10" style={{ background: "linear-gradient(160deg, rgba(99,102,241,0.12) 0%, rgba(6,8,20,0.95) 100%)" }}>
          {/* Images */}
          {account.images && account.images.length > 0 && (
            <div className={`grid gap-1 p-2 ${account.images.length === 1 ? "grid-cols-1" : account.images.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
              {account.images.slice(0, 3).map((img, i) => (
                <div key={i} className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group" onClick={() => setPreviewImg(img)}>
                  <img src={img} alt={`صورة ${i + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-black text-white">{account.title}</h2>
                {account.game && <p className="text-xs text-white/40 mt-0.5">{account.game.nameAr || account.game.name}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-black" style={{ background: "linear-gradient(135deg, #fde68a, #fbbf24)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{buyerPrice}</div>
                <div className="text-[10px] text-white/35">جنيه</div>
              </div>
            </div>

            {account.description && <p className="text-xs text-white/50 leading-relaxed">{account.description}</p>}

            <div className="flex flex-wrap gap-1.5">
              {account.rank && <Badge variant="secondary" className="text-[10px]"><Star className="w-2.5 h-2.5 mr-1" />{account.rank}</Badge>}
              {account.linkingMethod && <Badge variant="outline" className="text-[10px] border-white/15">{LINKING_LABELS[account.linkingMethod] || account.linkingMethod}</Badge>}
              {account.features?.slice(0, 3).map((f, i) => <Badge key={i} variant="outline" className="text-[10px] border-primary/25 text-primary/70">{f}</Badge>)}
            </div>

            {account.isSold && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400 font-semibold">هذا الحساب تم بيعه مسبقاً</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Steps */}
        <AnimatePresence mode="wait">

          {/* ── STEP: DETAILS (Select Payment) ── */}
          {displayStep === "details" && !account.isSold && (
            <motion.div key="details" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">

              {/* Buyer Info */}
              <div className="p-4 rounded-2xl border border-white/10 bg-white/3 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  بيانات المشتري
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-white/40 mb-1 block">الاسم</Label>
                    <Input
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="اسمك"
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/25 text-sm h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-white/40 mb-1 block">رقم الواتساب</Label>
                    <Input
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      dir="ltr"
                      className="bg-white/5 border-white/15 text-white placeholder:text-white/25 text-sm h-9"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  اختر وسيلة الدفع
                </h3>
                <div className="space-y-2">
                  {activeOrderMethods.map((method: any) => (
                    <motion.button
                      key={method.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedPayment(method)}
                      className={`w-full p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${selectedPayment?.id === method.id ? "border-primary/60 bg-primary/12" : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"}`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center text-lg flex-shrink-0">
                        {method.icon === "vodafone" ? "📱" : method.icon === "instapay" ? "💳" : "💰"}
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-sm font-bold text-white">{method.nameAr}</p>
                        <p className="text-xs text-white/40">{method.accountNumber}</p>
                      </div>
                      {method.accountName && <p className="text-[10px] text-white/30">{method.accountName}</p>}
                      {selectedPayment?.id === method.id && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-white" /></div>}
                    </motion.button>
                  ))}
                </div>
              </div>

              {selectedPayment && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/8">
                  <p className="text-xs font-semibold text-amber-400 mb-1">📋 تعليمات الدفع</p>
                  <p className="text-xs text-white/60">حوّل مبلغ <strong className="text-white">{buyerPrice} جنيه</strong> إلى رقم:</p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(selectedPayment.accountNumber); toast({ title: "تم النسخ!" }); }}
                    className="mt-1.5 flex items-center gap-2 text-sm font-black text-white hover:text-primary transition-colors"
                  >
                    <span dir="ltr">{selectedPayment.accountNumber}</span>
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {selectedPayment.accountName && <p className="text-[10px] text-white/35 mt-1">باسم: {selectedPayment.accountName}</p>}
                </motion.div>
              )}

              <Button
                className="w-full h-12 rounded-2xl font-black text-sm"
                disabled={!selectedPayment || !buyerName.trim() || !buyerPhone.trim() || createOrderMutation.isPending}
                onClick={() => {
                  setSenderPhone(buyerPhone);
                  createOrderMutation.mutate({
                    accountId: account.id,
                    paymentMethod: selectedPayment!.nameAr,
                    buyerName: buyerName.trim(),
                    buyerPhone: buyerPhone.trim(),
                  });
                }}
              >
                {createOrderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <ArrowRight className="w-4 h-4 ml-2" />}
                {createOrderMutation.isPending ? "جارٍ الإنشاء..." : "تأكيد الطلب ورفع الإثبات"}
              </Button>
            </motion.div>
          )}

          {/* ── STEP: UPLOAD PROOF ── */}
          {displayStep === "proof" && (
            <motion.div key="proof" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/8 flex items-start gap-3">
                <Upload className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-blue-300">ارفع إثبات الدفع</p>
                  <p className="text-xs text-blue-300/60 mt-0.5">ارفع Screenshot لتأكيد تحويل المبلغ</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-white/60 mb-2 block">صورة إثبات الدفع</Label>
                <label className={`flex flex-col items-center justify-center gap-2 w-full h-32 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${proofUrl ? "border-green-500/40 bg-green-500/8" : "border-white/15 hover:border-white/30 bg-white/3"}`}>
                  {uploadingProof ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white/40" />
                  ) : proofUrl ? (
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle2 className="w-8 h-8 text-green-400" />
                      <p className="text-xs text-green-400">تم الرفع بنجاح</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="w-8 h-8 text-white/20" />
                      <p className="text-xs text-white/40">اضغط لاختيار صورة</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                </label>
              </div>

              <div>
                <Label className="text-xs text-white/60 mb-2 block">رقم هاتف المُحوِّل (اختياري)</Label>
                <Input
                  placeholder="01XXXXXXXXX"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/25"
                  dir="ltr"
                />
              </div>

              <Button
                className="w-full h-12 rounded-2xl font-black text-sm"
                disabled={!proofUrl || uploadProofMutation.isPending}
                onClick={() => {
                  const orderId = currentOrderId || existingOrder?.id;
                  if (!orderId) return;
                  uploadProofMutation.mutate({ orderId, data: { paymentProofUrl: proofUrl, senderPhone } });
                }}
              >
                {uploadProofMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <FileText className="w-4 h-4 ml-2" />}
                {uploadProofMutation.isPending ? "جارٍ الإرسال..." : "إرسال الإثبات"}
              </Button>
            </motion.div>
          )}

          {/* ── STEP: TRACKING ── */}
          {(displayStep === "tracking" || (existingOrder && displayStep !== "details" && displayStep !== "payment" && displayStep !== "proof")) && trackingOrder && (
            <motion.div key="tracking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* Order Number */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/3">
                <div>
                  <p className="text-[10px] text-white/40">رقم الطلب</p>
                  <p className="text-sm font-black text-white font-mono">{trackingOrder.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/40">المبلغ</p>
                  <p className="text-base font-black text-amber-400">{trackingOrder.totalAmount} ج</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="p-4 rounded-2xl border border-white/10 bg-white/2">
                <h4 className="text-xs font-bold text-white/60 mb-4 flex items-center gap-2">
                  <TimerReset className="w-3.5 h-3.5" />
                  حالة الطلب
                </h4>
                <StatusTimeline currentStatus={trackingOrder.accountOrderStatus || trackingOrder.status || "payment_pending"} />
              </div>

              {/* Credentials Box */}
              {trackingOrder.credentialsDelivered && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-green-500/30 bg-green-500/8 overflow-hidden">
                  <div className="flex items-center justify-between p-3.5 border-b border-green-500/15">
                    <div className="flex items-center gap-2">
                      <Unlock className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-bold text-green-300">بيانات الحساب</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowCredentials(!showCredentials)} className="text-xs text-white/40 hover:text-white flex items-center gap-1">
                        {showCredentials ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showCredentials ? "إخفاء" : "إظهار"}
                      </button>
                      <button onClick={handleCopyCredentials} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "تم النسخ" : "نسخ"}
                      </button>
                    </div>
                  </div>
                  <div className="p-3.5">
                    {showCredentials ? (
                      <pre className="text-xs text-green-200 whitespace-pre-wrap font-mono leading-relaxed">{trackingOrder.credentialsDelivered}</pre>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-white/30">
                        <Lock className="w-3.5 h-3.5" />
                        <span>اضغط "إظهار" لعرض البيانات</span>
                      </div>
                    )}
                  </div>

                  {/* Confirm receipt button */}
                  {trackingOrder.accountOrderStatus === "credentials_sent" && (
                    <div className="p-3.5 pt-0">
                      <Button
                        className="w-full h-10 rounded-xl font-bold text-xs bg-green-600 hover:bg-green-700"
                        disabled={confirmReceiptMutation.isPending}
                        onClick={() => confirmReceiptMutation.mutate(trackingOrder.id)}
                      >
                        {confirmReceiptMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" /> : <CheckCircle2 className="w-3.5 h-3.5 ml-1" />}
                        تأكيد استلام الحساب
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Upload proof if still pending */}
              {(trackingOrder.accountOrderStatus === "payment_pending" || !trackingOrder.paymentProofUrl) && trackingOrder.accountOrderStatus !== "cancelled" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/8">
                  <p className="text-xs font-semibold text-amber-400 mb-3 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    لم يتم رفع إثبات الدفع بعد
                  </p>
                  <Button size="sm" className="w-full rounded-xl font-bold text-xs h-9" onClick={() => setStep("proof")}>
                    <Upload className="w-3.5 h-3.5 ml-1" />
                    رفع إثبات الدفع
                  </Button>
                </motion.div>
              )}

              {/* Payout info for seller (account source = seller) */}
              {trackingOrder.accountOrderStatus === "completed" && trackingOrder.account?.source === "seller_request" && !trackingOrder.vodafoneCashNumber && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/8 space-y-3">
                  <p className="text-sm font-bold text-purple-300 flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    بيانات سحب المستحقات
                  </p>
                  <p className="text-xs text-white/50">أدخل رقم فودافون كاش لاستلام مستحقاتك</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="01XXXXXXXXX"
                      value={vodafoneCash}
                      onChange={(e) => setVodafoneCash(e.target.value)}
                      className="bg-white/5 border-white/15 text-white text-sm h-9"
                      dir="ltr"
                    />
                    <Button
                      size="sm"
                      className="rounded-xl font-bold text-xs h-9 flex-shrink-0 px-4"
                      disabled={!vodafoneCash || payoutInfoMutation.isPending}
                      onClick={() => payoutInfoMutation.mutate({ orderId: trackingOrder.id, vodafoneCashNumber: vodafoneCash })}
                    >
                      {payoutInfoMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "حفظ"}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Payout status */}
              {trackingOrder.payoutStatus && PAYOUT_STATUSES[trackingOrder.payoutStatus] && (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/10 bg-white/3">
                  <Wallet className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] text-white/35">حالة المستحقات</p>
                    <p className="text-xs font-semibold" style={{ color: PAYOUT_STATUSES[trackingOrder.payoutStatus].color }}>
                      {PAYOUT_STATUSES[trackingOrder.payoutStatus].label}
                    </p>
                  </div>
                </div>
              )}

              <Button variant="outline" className="w-full border-white/15 text-white/60 hover:text-white rounded-2xl" onClick={() => setLocation("/accounts")}>
                العودة للحسابات
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
