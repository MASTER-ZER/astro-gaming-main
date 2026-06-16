import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Search, Handshake, Plus, X, Check, Loader2, Phone, ChevronRight,
  Shield, Clock, Star, Upload, Eye, EyeOff, Wallet, Info, CheckCircle2, Copy, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCustomer } from "@/hooks/useCustomer";
import { CustomerLoginModal } from "@/components/CustomerLoginModal";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { BrokerRequest, BrokerOffer } from "@shared/schema";
import { MultipleImageUploader } from "@/components/ImageUploader";

// ── Commission Calculator ────────────────────────────────────────────────────
function CommissionCalc({ maxPrice, commissionType, onChangeType }: {
  maxPrice: number;
  commissionType: string;
  onChangeType: (t: string) => void;
}) {
  const c6 = Math.round(maxPrice * 0.06);
  const buyerC = commissionType === "buyer_all" ? c6 : Math.round(c6 / 2);
  const total = maxPrice + buyerC;

  if (!maxPrice) return null;
  return (
    <div className="p-4 rounded-2xl space-y-3 mt-2" style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)" }}>
      <p className="text-xs font-bold text-yellow-400/80 flex items-center gap-1.5">
        <Wallet className="w-3.5 h-3.5" /> حساب العمولة
      </p>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-white/50">
          <span>سعر الحساب</span><span>{maxPrice.toLocaleString()} جنيه</span>
        </div>
        <div className="flex justify-between text-yellow-400/70">
          <span>عمولة الوساطة ({commissionType === "buyer_all" ? "6%" : "3%"})</span>
          <span>+ {buyerC.toLocaleString()} جنيه</span>
        </div>
        <div className="flex justify-between font-black text-white pt-1 border-t border-white/10">
          <span>المجموع</span><span>{total.toLocaleString()} جنيه</span>
        </div>
      </div>
      {commissionType !== "buyer_all" && (
        <div className="text-xs text-white/30 flex items-start gap-1.5">
          <Info className="w-3 h-3 mt-0.5 shrink-0" />
          البائع يدفع 3% عمولة منفصلة بعد البيع
        </div>
      )}
      <button
        type="button"
        onClick={() => onChangeType(commissionType === "buyer_all" ? "split" : "buyer_all")}
        className="w-full text-xs py-2 rounded-xl font-bold transition-all"
        style={{
          background: commissionType === "buyer_all" ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.05)",
          border: commissionType === "buyer_all" ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(255,255,255,0.1)",
          color: commissionType === "buyer_all" ? "#34d399" : "rgba(255,255,255,0.4)",
        }}
      >
        {commissionType === "buyer_all"
          ? "✅ أتحمل العمولة كاملة (6%) — يُغري البائع أكثر"
          : "تحمّل العمولة كاملاً (6%) لتسريع الحصول على الحساب"}
      </button>
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "⏳ قيد المراجعة", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    approved: { label: "✅ معتمد", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
    matched: { label: "🎯 وجدنا تطابق!", color: "#0090ff", bg: "rgba(0,144,255,0.12)" },
    in_escrow: { label: "🔒 في الضمان", color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
    delivered: { label: "📦 جاهز للاستلام", color: "#34d399", bg: "rgba(52,211,153,0.15)" },
    completed: { label: "🎉 مكتمل", color: "#34d399", bg: "rgba(52,211,153,0.1)" },
    cancelled: { label: "❌ ملغي", color: "#f87171", bg: "rgba(239,68,68,0.1)" },
    pending_review: { label: "⏳ قيد المراجعة", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    accepted: { label: "✅ مقبول", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
    rejected: { label: "❌ مرفوض", color: "#f87171", bg: "rgba(239,68,68,0.1)" },
  };
  const s = map[status] || { label: status, color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.06)" };
  return (
    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Create Request Form (Buyer) ───────────────────────────────────────────────
function CreateRequestForm({ onClose, paymentMethods }: { onClose: () => void; paymentMethods: any[] }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    gameName: "", description: "", minPrice: "", maxPrice: "",
    paymentMethod: "", senderPhone: "", commissionType: "split",
  });
  const [images, setImages] = useState<string[]>([]);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const selectedMethod = paymentMethods.find(pm => pm.name === form.paymentMethod);

  const copyAccount = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedAccount(id);
    toast({ title: "تم النسخ ✅", description: "تم نسخ الرقم" });
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingProof(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: fd });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      setPaymentProofUrl(data.objectPath);
      toast({ title: "تم رفع الصورة ✅" });
    } catch {
      toast({ title: "خطأ", description: "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setIsUploadingProof(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/broker/requests", {
      ...form,
      minPrice: Number(form.minPrice),
      maxPrice: Number(form.maxPrice),
      referenceImages: images,
      paymentProofUrl,
    }),
    onSuccess: () => {
      toast({ title: "تم إرسال طلبك 👑", description: "سيتم مراجعته وإعلامك عبر الرسائل" });
      queryClient.invalidateQueries({ queryKey: ["/api/broker/my-requests"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const maxPrice = Number(form.maxPrice);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-4 pt-4 pb-24 md:pb-4"
      style={{ background: "rgba(2,4,14,0.9)" }} dir="rtl"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        className="w-full max-w-lg rounded-3xl overflow-y-auto max-h-[85vh] md:max-h-[90vh]"
        style={{
          background: "linear-gradient(160deg, rgba(10,18,42,0.99), rgba(4,6,18,0.99))",
          border: "1px solid rgba(212,175,55,0.2)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        }}
      >
        <div className="h-0.5" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.7), transparent)" }} />
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              <h2 className="font-black text-white">طلب خاص جديد</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-white/40 mb-1 block">اسم اللعبة *</label>
              <input value={form.gameName} onChange={e => set("gameName", e.target.value)} placeholder="Free Fire, PUBG, COD..." className="input-field" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">السعر الأدنى *</label>
              <input type="number" value={form.minPrice} onChange={e => set("minPrice", e.target.value)} placeholder="مثال: 1500" className="input-field" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">السعر الأقصى *</label>
              <input type="number" value={form.maxPrice} onChange={e => set("maxPrice", e.target.value)} placeholder="مثال: 3000" className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-white/40 mb-1 block">وصف ما تبحث عنه *</label>
              <textarea
                value={form.description}
                onChange={e => set("description", e.target.value)}
                rows={3}
                placeholder="مثال: حساب فري فاير ليفل 70+، سكنات نادرة، رينك داياموند..."
                className="input-field resize-none"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-white/40 mb-1 block">صور مرجعية (اختياري)</label>
              <MultipleImageUploader values={images} onChange={setImages} maxImages={4} label="صور مرجعية" />
            </div>
          </div>

          {/* Commission Calculator */}
          <CommissionCalc
            maxPrice={maxPrice}
            commissionType={form.commissionType}
            onChangeType={(t) => set("commissionType", t)}
          />

          {/* Payment method */}
          <div>
            <label className="text-xs text-white/40 mb-2 block">طريقة الدفع</label>
            <div className="space-y-2">
              {paymentMethods.map(pm => (
                <button key={pm.id} type="button" onClick={() => set("paymentMethod", pm.name)}
                  className="w-full p-3 rounded-xl flex items-center gap-3 transition-all"
                  style={{
                    background: form.paymentMethod === pm.name ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.04)",
                    border: form.paymentMethod === pm.name ? "1px solid rgba(212,175,55,0.35)" : "1px solid rgba(255,255,255,0.07)",
                  }}>
                  <span className="text-lg">{pm.icon}</span>
                  <div className="text-right flex-1">
                    <p className="text-sm font-bold text-white">{pm.nameAr}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-white/40 font-mono" dir="ltr">{pm.accountNumber}</p>
                      {pm.accountNumber && (
                        <button
                          type="button"
                          onClick={(e) => copyAccount(e, pm.accountNumber, pm.id)}
                          data-testid={`button-copy-pm-broker-${pm.id}`}
                          className="w-5 h-5 rounded flex items-center justify-center transition-all"
                          style={{ background: "rgba(212,175,55,0.15)" }}
                        >
                          {copiedAccount === pm.id
                            ? <Check className="w-3 h-3 text-green-400" />
                            : <Copy className="w-3 h-3 text-yellow-400" />}
                        </button>
                      )}
                    </div>
                  </div>
                  {form.paymentMethod === pm.name && <Check className="w-4 h-4 text-yellow-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Selected method highlighted box */}
          {selectedMethod && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl"
              style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)" }}
            >
              <p className="text-[11px] text-white/40 mb-1.5">حوّل المبلغ إلى هذا الرقم:</p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-base font-mono font-black text-white" dir="ltr">{selectedMethod.accountNumber}</p>
                <button
                  type="button"
                  onClick={(e) => copyAccount(e, selectedMethod.accountNumber, `sel-${selectedMethod.id}`)}
                  data-testid="button-copy-selected-broker"
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold transition-all"
                  style={{ background: "rgba(212,175,55,0.2)", border: "1px solid rgba(212,175,55,0.35)", color: "#fff" }}
                >
                  {copiedAccount === `sel-${selectedMethod.id}` ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedAccount === `sel-${selectedMethod.id}` ? "تم" : "نسخ"}
                </button>
              </div>
              {maxPrice > 0 && <p className="text-xs text-yellow-400 mt-1.5 font-bold">{maxPrice + Math.round(maxPrice * 0.06)} جنيه (شامل العمولة)</p>}
            </motion.div>
          )}

          <div>
            <label className="text-xs text-white/40 mb-1 block">رقم التحويل <span className="text-red-400">*</span></label>
            <input value={form.senderPhone} onChange={e => set("senderPhone", e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" className="input-field" />
          </div>

          {/* Payment proof upload */}
          <div>
            <label className="text-xs text-white/40 mb-2 block">إثبات الدفع (سكرين التحويل)</label>
            {paymentProofUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}>
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-xs text-green-400 flex-1">تم رفع الإثبات بنجاح</span>
                <label className="cursor-pointer">
                  <span className="text-xs text-yellow-400 hover:underline">تغيير</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleProofChange} data-testid="input-change-broker-proof" />
                </label>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <div className="p-4 rounded-xl text-center border-2 border-dashed transition-colors"
                  style={{ borderColor: "rgba(212,175,55,0.2)", background: "rgba(212,175,55,0.04)" }}>
                  {isUploadingProof
                    ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-yellow-400" />
                    : <><Upload className="w-5 h-5 mx-auto mb-1 text-white/30" /><p className="text-xs text-white/40">اضغط لرفع صورة التحويل</p></>}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleProofChange} disabled={isUploadingProof} data-testid="input-broker-proof" />
              </label>
            )}
          </div>

          <Button
            onClick={() => createMutation.mutate()}
            disabled={!form.gameName || !form.description || !form.minPrice || !form.maxPrice || !form.paymentMethod || !form.senderPhone || createMutation.isPending}
            className="w-full h-12 rounded-2xl font-black text-base"
            style={{
              background: "linear-gradient(135deg, #d4af37, #b8860b)",
              border: "none",
              boxShadow: "0 4px 24px rgba(212,175,55,0.35)",
              color: "#0a0c14",
            }}
          >
            {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Crown className="w-5 h-5 ml-2" />}
            إرسال طلب الوساطة
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Submit Offer Form (Seller) ────────────────────────────────────────────────
function SubmitOfferForm({ request, onClose }: { request: any; onClose: () => void }) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [accountImages, setAccountImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    accountDescription: "", accountLevel: "", accountRank: "", accountSkins: "",
    linkingType: "email", accountEmail: "", accountPhone: "", accountPassword: "",
    sellerPrice: String(request.minPrice),
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submitMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/broker/offers", {
      requestId: request.id, ...form, sellerPrice: Number(form.sellerPrice), accountImages,
    }),
    onSuccess: () => {
      toast({ title: "تم تقديم عرضك ✅", description: "سيتم مراجعته من الأدمن" });
      queryClient.invalidateQueries({ queryKey: ["/api/broker/my-offers"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-4 pt-4 pb-24 md:pb-4"
      style={{ background: "rgba(2,4,14,0.9)" }} dir="rtl"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        className="w-full max-w-lg rounded-3xl overflow-y-auto max-h-[85vh] md:max-h-[90vh]"
        style={{
          background: "linear-gradient(160deg, rgba(10,18,42,0.99), rgba(4,6,18,0.99))",
          border: "1px solid rgba(0,144,255,0.2)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        }}
      >
        <div className="h-0.5" style={{ background: "linear-gradient(90deg, transparent, rgba(0,144,255,0.6), transparent)" }} />
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-white">تقديم عرض</h2>
              <p className="text-xs text-white/40">{request.gameName} · ميزانية {request.minPrice?.toLocaleString()}-{request.maxPrice?.toLocaleString()} جنيه</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Account info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-white/40 mb-1 block">وصف الحساب *</label>
              <textarea value={form.accountDescription} onChange={e => set("accountDescription", e.target.value)} rows={3} placeholder="ليفل، سكنات، إنجازات..." className="input-field resize-none" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">الليفل</label>
              <input value={form.accountLevel} onChange={e => set("accountLevel", e.target.value)} placeholder="مثال: 75" className="input-field" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">الرينك</label>
              <input value={form.accountRank} onChange={e => set("accountRank", e.target.value)} placeholder="مثال: Diamond" className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-white/40 mb-1 block">السكنات والآيتمات</label>
              <input value={form.accountSkins} onChange={e => set("accountSkins", e.target.value)} placeholder="اذكر أبرز السكنات..." className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-white/40 mb-1 block">صور الحساب (اختياري)</label>
              <MultipleImageUploader values={accountImages} onChange={setAccountImages} maxImages={6} label="صور الحساب" />
            </div>
          </div>

          {/* Credentials */}
          <div className="p-3 rounded-xl space-y-3" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
            <p className="text-xs font-bold text-purple-400/80 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> بيانات الربط (يراها الأدمن فقط)
            </p>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">نوع الربط</label>
              <div className="flex gap-2">
                {["email", "phone"].map(t => (
                  <button key={t} type="button" onClick={() => set("linkingType", t)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: form.linkingType === t ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.05)",
                      border: form.linkingType === t ? "1px solid rgba(168,85,247,0.35)" : "1px solid rgba(255,255,255,0.08)",
                      color: form.linkingType === t ? "#a855f7" : "rgba(255,255,255,0.4)",
                    }}>
                    {t === "email" ? "📧 إيميل" : "📱 رقم هاتف"}
                  </button>
                ))}
              </div>
            </div>
            {form.linkingType === "email" ? (
              <div>
                <label className="text-xs text-white/40 mb-1 block">الإيميل</label>
                <input value={form.accountEmail} onChange={e => set("accountEmail", e.target.value)} placeholder="example@gmail.com" dir="ltr" className="input-field" />
              </div>
            ) : (
              <div>
                <label className="text-xs text-white/40 mb-1 block">رقم الهاتف</label>
                <input value={form.accountPhone} onChange={e => set("accountPhone", e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" className="input-field" />
              </div>
            )}
            <div>
              <label className="text-xs text-white/40 mb-1 block">كلمة السر</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={form.accountPassword} onChange={e => set("accountPassword", e.target.value)} placeholder="••••••••" dir="ltr" className="input-field" />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Seller price */}
          <div>
            <label className="text-xs text-white/40 mb-1 block">سعرك المطلوب (جنيه)</label>
            <input type="number" value={form.sellerPrice} onChange={e => set("sellerPrice", e.target.value)} className="input-field" />
            <p className="text-xs text-white/30 mt-1">* عمولة 3% ستُخصم من هذا المبلغ عند الإتمام</p>
          </div>

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!form.accountDescription || !form.sellerPrice || submitMutation.isPending}
            className="w-full h-12 rounded-2xl font-black"
            style={{ background: "linear-gradient(135deg, #0090ff, #0050d0)", border: "none", boxShadow: "0 4px 20px rgba(0,144,255,0.35)" }}
          >
            {submitMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <CheckCircle2 className="w-5 h-5 ml-2" />}
            تقديم العرض
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Open Request Card (Seller view) ─────────────────────────────────────────
function RequestCard({ request, onOffer }: { request: any; onOffer: () => void }) {
  const c6 = Math.round(request.maxPrice * 0.03);
  const sellerNet = request.maxPrice - (request.sellerCommission || c6);
  const isBuyerAllIn = request.commissionType === "buyer_all";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 cursor-default"
      style={{
        background: "linear-gradient(160deg, rgba(10,18,42,0.95), rgba(4,6,18,0.98))",
        border: "1px solid rgba(212,175,55,0.12)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
      data-testid={`card-broker-request-${request.id}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-yellow-400/80 font-black text-sm">{request.gameName}</span>
            {isBuyerAllIn && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}>
                🎁 صفر عمولة للبائع
              </span>
            )}
          </div>
          <p className="text-xs text-white/40">{request.orderNumber}</p>
        </div>
        <div className="text-left shrink-0">
          <p className="text-sm font-black text-primary">{request.minPrice?.toLocaleString()} - {request.maxPrice?.toLocaleString()}</p>
          <p className="text-[11px] text-white/30">جنيه</p>
        </div>
      </div>
      <p className="text-sm text-white/65 leading-relaxed mb-3">{request.description}</p>
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/30 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {new Date(request.createdAt).toLocaleDateString("ar-EG")}
        </div>
        <Button
          size="sm"
          onClick={onOffer}
          data-testid={`button-offer-${request.id}`}
          className="h-8 px-4 rounded-xl text-xs font-bold"
          style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37" }}
        >
          عندي الطلب! 🎯
        </Button>
      </div>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
type Tab = "buyer" | "seller" | "my";

export default function RoyalBroker() {
  const { isLoggedIn } = useCustomer();
  const [showLogin, setShowLogin] = useState(false);
  const [tab, setTab] = useState<Tab>("buyer");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [offerRequest, setOfferRequest] = useState<any>(null);

  const { data: openRequests = [], isLoading: requestsLoading } = useQuery<any[]>({
    queryKey: ["/api/broker/requests"],
  });

  const { data: myRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/broker/my-requests"],
    enabled: isLoggedIn,
  });

  const { data: myOffers = [] } = useQuery<BrokerOffer[]>({
    queryKey: ["/api/broker/my-offers"],
    enabled: isLoggedIn,
  });

  const { data: paymentMethods = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods"],
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/broker/requests/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broker/my-requests"] });
    },
  });

  const handleAction = (fn: () => void) => {
    if (!isLoggedIn) { setShowLogin(true); return; }
    fn();
  };

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "buyer", label: "أبحث عن حساب", icon: Search },
    { id: "seller", label: "عندي حساب", icon: Handshake },
    { id: "my", label: "طلباتي", icon: Star },
  ];

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: "linear-gradient(160deg, #02040e 0%, #06091a 100%)" }}>
      {/* Global styles */}
      <style>{`.input-field{width:100%;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:white;font-size:14px;outline:none;} .input-field:focus{border-color:rgba(212,175,55,0.5);}`}</style>

      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.3), rgba(180,130,20,0.2))", border: "1px solid rgba(212,175,55,0.35)" }}
            >
              <Crown className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">طلبات خاصة 👑</h1>
              <p className="text-xs text-white/35">وساطة مضمونة · ضمان كامل · عمولة 6% فقط</p>
            </div>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-4 gap-2 mt-4 p-3 rounded-2xl" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.1)" }}>
            {[["ضع مواصفاتك", "1"], ["بائع يطابق", "2"], ["ضمان الموقع", "3"], ["تسليم مضمون", "4"]].map(([label, num]) => (
              <div key={num} className="flex flex-col items-center gap-1 text-center">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(212,175,55,0.15)", color: "#d4af37" }}>{num}</div>
                <span className="text-[10px] text-white/35 leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              data-testid={`tab-broker-${t.id}`}
              className="flex-1 py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              style={{
                background: tab === t.id ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
                border: tab === t.id ? "1px solid rgba(212,175,55,0.35)" : "1px solid rgba(255,255,255,0.07)",
                color: tab === t.id ? "#d4af37" : "rgba(255,255,255,0.35)",
              }}
            >
              <t.icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>

        {/* TAB: Buyer */}
        {tab === "buyer" && (
          <div className="space-y-4">
            <Button
              onClick={() => handleAction(() => setShowCreateForm(true))}
              data-testid="button-create-request"
              className="w-full h-13 rounded-2xl font-black text-base mb-2"
              style={{
                background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(180,130,20,0.15))",
                border: "1px solid rgba(212,175,55,0.35)",
                color: "#d4af37",
                boxShadow: "0 4px 20px rgba(212,175,55,0.15)",
              }}
            >
              <Plus className="w-5 h-5 ml-2" /> ضع مواصفاتك الآن 👑
            </Button>

            {/* Info cards */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Shield, label: "ضمان كامل", sub: "أموالك محمية" },
                { icon: Clock, label: "سريع", sub: "مطابقة خلال 24h" },
                { icon: Star, label: "موثوق", sub: "بائعون معتمدون" },
              ].map((c, i) => (
                <div key={i} className="p-3 rounded-2xl text-center" style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.08)" }}>
                  <c.icon className="w-5 h-5 text-yellow-400/60 mx-auto mb-1" />
                  <p className="text-xs font-bold text-white/70">{c.label}</p>
                  <p className="text-[10px] text-white/30">{c.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: Seller */}
        {tab === "seller" && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl text-sm text-white/50 leading-relaxed" style={{ background: "rgba(0,144,255,0.05)", border: "1px solid rgba(0,144,255,0.1)" }}>
              <Info className="w-4 h-4 text-primary inline ml-1.5" />
              عندك حساب؟ ابحث في الطلبات وقدّم عرضك. الموقع يضمن حصولك على فلوسك.
            </div>

            {requestsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary/40 animate-spin" /></div>
            ) : openRequests.length === 0 ? (
              <div className="text-center py-16 text-white/30">لا توجد طلبات مفتوحة حالياً</div>
            ) : (
              openRequests.map((req, i) => (
                <motion.div key={req.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <RequestCard
                    request={req}
                    onOffer={() => handleAction(() => setOfferRequest(req))}
                  />
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* TAB: My orders */}
        {tab === "my" && (
          <div className="space-y-4">
            {!isLoggedIn ? (
              <div className="text-center py-16">
                <Crown className="w-12 h-12 text-yellow-400/20 mx-auto mb-3" />
                <p className="text-white/40 mb-3">سجّل دخولك لرؤية طلباتك</p>
                <Button onClick={() => setShowLogin(true)} style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37" }}>
                  تسجيل الدخول
                </Button>
              </div>
            ) : (
              <>
                {/* My Requests (as buyer) */}
                {myRequests.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-white/40 mb-2 flex items-center gap-1.5"><Search className="w-3.5 h-3.5" /> طلباتي كمشتري</h3>
                    <div className="space-y-3">
                      {myRequests.map(req => (
                        <div key={req.id} className="p-4 rounded-2xl space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-white text-sm">{req.gameName}</p>
                              <p className="text-xs text-white/30">{req.orderNumber}</p>
                            </div>
                            <StatusBadge status={req.status} />
                          </div>
                          <p className="text-xs text-white/50">{req.description}</p>
                          <div className="flex items-center justify-between text-xs text-white/30">
                            <span>{req.minPrice?.toLocaleString()} - {req.maxPrice?.toLocaleString()} جنيه</span>
                            <span>{new Date(req.createdAt).toLocaleDateString("ar-EG")}</span>
                          </div>
                          {/* Account credentials (if delivered) */}
                          {req.status === "delivered" && (
                            <Button
                              size="sm"
                              onClick={() => confirmMutation.mutate(req.id)}
                              disabled={confirmMutation.isPending}
                              className="w-full h-9 rounded-xl text-xs font-bold"
                              style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399" }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 ml-1.5" />
                              تأكيد الاستلام وإنهاء الضمان
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* My Offers (as seller) */}
                {myOffers.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-white/40 mb-2 flex items-center gap-1.5"><Handshake className="w-3.5 h-3.5" /> عروضي كبائع</h3>
                    <div className="space-y-3">
                      {myOffers.map(offer => (
                        <div key={offer.id} className="p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="font-bold text-white text-sm">{offer.gameName}</p>
                              <p className="text-xs text-white/30">{offer.sellerPrice?.toLocaleString()} جنيه</p>
                            </div>
                            <StatusBadge status={offer.status} />
                          </div>
                          <p className="text-xs text-white/50 line-clamp-2">{offer.accountDescription}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {myRequests.length === 0 && myOffers.length === 0 && (
                  <div className="text-center py-16 text-white/30">
                    <Crown className="w-12 h-12 text-yellow-400/20 mx-auto mb-3" />
                    لا توجد طلبات أو عروض بعد
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateForm && (
          <CreateRequestForm onClose={() => setShowCreateForm(false)} paymentMethods={paymentMethods} />
        )}
        {offerRequest && (
          <SubmitOfferForm request={offerRequest} onClose={() => setOfferRequest(null)} />
        )}
      </AnimatePresence>

      <CustomerLoginModal open={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
}
