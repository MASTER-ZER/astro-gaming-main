import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, X, Phone, Check, Loader2, Copy, MessageSquare, ChevronRight, Upload, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCustomer } from "@/hooks/useCustomer";
import { CustomerLoginModal } from "@/components/CustomerLoginModal";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { VirtualNumberCountry, VirtualNumberOrder } from "@shared/schema";

function CountryCard({ country, onSelect }: { country: VirtualNumberCountry; onSelect: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      data-testid={`card-country-${country.id}`}
      className="w-full p-4 rounded-2xl flex items-center gap-4 transition-all duration-200 group text-right"
      style={{
        background: "linear-gradient(160deg, rgba(10,18,42,0.95), rgba(4,6,18,0.98))",
        border: "1px solid rgba(0,144,255,0.1)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      <span className="text-4xl leading-none">{country.countryFlag}</span>
      <div className="flex-1 text-right">
        <p className="font-black text-white text-base">{country.countryName}</p>
        <p className="text-xs text-white/40 mt-0.5">{country.countryCode}</p>
      </div>
      <div className="text-left">
        <p className="font-black text-primary text-lg leading-none">{country.price}</p>
        <p className="text-[11px] text-white/30">جنيه</p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors -scale-x-100" />
    </motion.button>
  );
}

function OrderModal({
  country,
  paymentMethods,
  onClose,
}: {
  country: VirtualNumberCountry;
  paymentMethods: any[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const selectedMethod = paymentMethods.find(pm => pm.name === selectedPayment);

  const copyAccount = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedAccount(id);
    toast({ title: "تم النسخ ✅", description: "تم نسخ الرقم" });
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
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
      setIsUploading(false);
    }
  };

  const orderMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/virtual-numbers/order", {
        countryId: country.id, paymentMethod: selectedPayment, senderPhone, paymentProofUrl,
      });
    },
    onSuccess: () => {
      toast({ title: "تم إرسال الطلب ✅", description: "سيتم التحقق وإرسال الرقم قريباً عبر الرسائل" });
      queryClient.invalidateQueries({ queryKey: ["/api/virtual-numbers/my-orders"] });
      onClose();
    },
    onError: (e: any) => {
      toast({ title: "خطأ", description: e.message || "حدث خطأ", variant: "destructive" });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-4 pt-4 pb-24 md:pb-4"
      dir="rtl"
      style={{ background: "rgba(2,4,14,0.88)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="w-full max-w-md rounded-3xl overflow-y-auto max-h-[85vh] md:max-h-[90vh]"
        style={{
          background: "linear-gradient(160deg, rgba(10,18,42,0.99), rgba(4,6,18,0.99))",
          border: "1px solid rgba(0,144,255,0.18)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        }}
      >
        <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(0,144,255,0.6), rgba(100,50,255,0.4), transparent)" }} />
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{country.countryFlag}</span>
              <div>
                <h3 className="font-black text-white">{country.countryName}</h3>
                <p className="text-xs text-white/40">{country.countryCode} · {country.price} جنيه</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/10 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 rounded-xl mb-4 text-sm text-white/50 leading-relaxed" style={{ background: "rgba(0,144,255,0.06)", border: "1px solid rgba(0,144,255,0.12)" }}>
            <Smartphone className="w-4 h-4 text-primary inline ml-1.5" />
            حوّل المبلغ ثم أرسل الطلب. سيصلك الرقم عبر رسائل الموقع. بعدها اطلب كود التحقق من صفحة طلباتي.
          </div>

          {/* Payment */}
          <div className="mb-4">
            <p className="text-xs text-white/50 mb-2 font-bold">طريقة الدفع</p>
            <div className="space-y-2">
              {paymentMethods.map(pm => (
                <button
                  key={pm.id}
                  onClick={() => setSelectedPayment(pm.name)}
                  data-testid={`button-payment-vn-${pm.id}`}
                  className="w-full p-3 rounded-xl flex items-center gap-3 transition-all duration-200"
                  style={{
                    background: selectedPayment === pm.name ? "rgba(0,144,255,0.12)" : "rgba(255,255,255,0.04)",
                    border: selectedPayment === pm.name ? "1px solid rgba(0,144,255,0.35)" : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <span className="text-lg">{pm.icon}</span>
                  <div className="text-right flex-1">
                    <p className="text-sm font-bold text-white">{pm.nameAr}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-white/40 font-mono" dir="ltr">{pm.accountNumber}</p>
                      {pm.accountNumber && (
                        <button
                          onClick={(e) => copyAccount(e, pm.accountNumber, pm.id)}
                          data-testid={`button-copy-pm-vn-${pm.id}`}
                          className="w-5 h-5 rounded flex items-center justify-center transition-all"
                          style={{ background: "rgba(0,144,255,0.15)" }}
                        >
                          {copiedAccount === pm.id
                            ? <Check className="w-3 h-3 text-green-400" />
                            : <Copy className="w-3 h-3 text-primary" />}
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedPayment === pm.name && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Selected method highlighted box */}
          {selectedMethod && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl"
              style={{ background: "rgba(0,144,255,0.08)", border: "1px solid rgba(0,144,255,0.25)" }}
            >
              <p className="text-[11px] text-white/40 mb-1.5">حوّل المبلغ إلى هذا الرقم:</p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-base font-mono font-black text-white" dir="ltr">{selectedMethod.accountNumber}</p>
                <button
                  onClick={(e) => copyAccount(e, selectedMethod.accountNumber, `sel-${selectedMethod.id}`)}
                  data-testid="button-copy-selected-vn"
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold transition-all"
                  style={{ background: "rgba(0,144,255,0.2)", border: "1px solid rgba(0,144,255,0.35)", color: "#fff" }}
                >
                  {copiedAccount === `sel-${selectedMethod.id}` ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedAccount === `sel-${selectedMethod.id}` ? "تم" : "نسخ"}
                </button>
              </div>
              <p className="text-xs text-primary mt-1.5 font-bold">{country.price} جنيه</p>
            </motion.div>
          )}

          {/* Sender phone */}
          <div className="mb-3">
            <p className="text-xs text-white/50 mb-2 font-bold">رقم المحول منه <span className="text-red-400">*</span></p>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
              <input
                type="tel"
                value={senderPhone}
                onChange={e => setSenderPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                dir="ltr"
                data-testid="input-vn-sender-phone"
                className="w-full h-11 pr-9 pl-4 rounded-xl text-sm bg-white/5 border border-white/10 outline-none focus:border-primary/50 text-white placeholder:text-white/20"
              />
            </div>
          </div>

          {/* Payment proof upload */}
          <div className="mb-5">
            <p className="text-xs text-white/50 mb-2 font-bold">إثبات الدفع (سكرين التحويل)</p>
            {paymentProofUrl ? (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}>
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-xs text-green-400 flex-1">تم رفع الإثبات بنجاح</span>
                <label className="cursor-pointer">
                  <span className="text-xs text-primary hover:underline">تغيير</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} data-testid="input-change-vn-proof" />
                </label>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <div className="p-4 rounded-xl text-center border-2 border-dashed transition-colors"
                  style={{ borderColor: "rgba(0,144,255,0.2)", background: "rgba(0,144,255,0.04)" }}>
                  {isUploading
                    ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                    : <><Upload className="w-5 h-5 mx-auto mb-1 text-white/30" /><p className="text-xs text-white/40">اضغط لرفع صورة التحويل</p></>}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} data-testid="input-vn-proof" />
              </label>
            )}
          </div>

          <Button
            onClick={() => orderMutation.mutate()}
            disabled={!selectedPayment || !senderPhone || orderMutation.isPending}
            data-testid="button-confirm-vn-order"
            className="w-full h-11 rounded-xl font-bold"
            style={{
              background: "linear-gradient(135deg, #0090ff, #0050d0)",
              boxShadow: "0 4px 24px rgba(0,144,255,0.35)",
              border: "none",
            }}
          >
            {orderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Smartphone className="w-4 h-4 ml-2" />}
            إرسال الطلب وانتظار الرقم
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MyVNOrders() {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const { data: orders = [] } = useQuery<(VirtualNumberOrder & { country?: VirtualNumberCountry })[]>({
    queryKey: ["/api/virtual-numbers/my-orders"],
  });

  const otpMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest("POST", `/api/virtual-numbers/request-otp/${orderId}`);
    },
    onSuccess: () => {
      toast({ title: "تم الطلب ✅", description: "سيُرسل كود التحقق قريباً عبر الرسائل" });
      queryClient.invalidateQueries({ queryKey: ["/api/virtual-numbers/my-orders"] });
    },
    onError: (e: any) => {
      toast({ title: "خطأ", description: e.message || "حدث خطأ", variant: "destructive" });
    },
  });

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const statusInfo = (s: string) => {
    const map: Record<string, { label: string; color: string }> = {
      pending_payment: { label: "⏳ انتظار التحويل", color: "#f59e0b" },
      confirmed: { label: "✅ مؤكد", color: "#34d399" },
      number_sent: { label: "📱 الرقم جاهز", color: "#0090ff" },
      code_requested: { label: "🔐 انتظار الكود", color: "#a855f7" },
      code_sent: { label: "✅ الكود جاهز", color: "#34d399" },
      completed: { label: "🎉 مكتمل", color: "#34d399" },
      cancelled: { label: "❌ ملغي", color: "#f87171" },
    };
    return map[s] || { label: s, color: "rgba(255,255,255,0.4)" };
  };

  if (orders.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-black text-white/60 mb-3 flex items-center gap-2">
        <Smartphone className="w-4 h-4" /> طلباتي من الأرقام الفيك
      </h2>
      <div className="space-y-3">
        {orders.map(order => {
          const st = statusInfo(order.status);
          return (
            <div
              key={order.id}
              className="p-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              data-testid={`card-vn-order-${order.id}`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{order.country?.countryFlag}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{order.country?.countryName}</p>
                    <p className="text-xs text-white/30">{order.orderNumber}</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${st.color}18`, color: st.color }}>
                  {st.label}
                </span>
              </div>

              {/* Virtual Number */}
              {order.virtualNumber && (
                <div className="mb-3">
                  <p className="text-[11px] text-white/40 mb-1.5">رقمك الفيك</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded-xl text-sm font-mono font-bold text-white text-center" style={{ background: "rgba(0,144,255,0.08)", border: "1px solid rgba(0,144,255,0.2)" }}>
                      {order.virtualNumber}
                    </div>
                    <button
                      onClick={() => copyText(order.virtualNumber!, `num-${order.id}`)}
                      data-testid={`button-copy-number-${order.id}`}
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(0,144,255,0.1)", border: "1px solid rgba(0,144,255,0.2)" }}
                    >
                      {copied === `num-${order.id}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-primary" />}
                    </button>
                  </div>
                </div>
              )}

              {/* OTP Code */}
              {order.otpCode && (
                <div className="mb-3">
                  <p className="text-[11px] text-white/40 mb-1.5">كود التحقق</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded-xl text-sm font-mono font-bold text-white text-center tracking-widest" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}>
                      {order.otpCode}
                    </div>
                    <button
                      onClick={() => copyText(order.otpCode!, `otp-${order.id}`)}
                      data-testid={`button-copy-otp-${order.id}`}
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}
                    >
                      {copied === `otp-${order.id}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-green-400" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Request OTP button */}
              {order.status === "number_sent" && (
                <Button
                  size="sm"
                  onClick={() => otpMutation.mutate(order.id)}
                  disabled={otpMutation.isPending}
                  data-testid={`button-request-otp-${order.id}`}
                  className="w-full h-9 rounded-xl text-xs font-bold mt-1"
                  style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.35)", color: "#a855f7" }}
                >
                  {otpMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <MessageSquare className="w-3 h-3 ml-1" />}
                  طلب كود التحقق
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function VirtualNumbers() {
  const { isLoggedIn } = useCustomer();
  const [showLogin, setShowLogin] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<VirtualNumberCountry | null>(null);

  const { data: countries = [], isLoading } = useQuery<VirtualNumberCountry[]>({
    queryKey: ["/api/virtual-numbers/countries"],
  });

  const { data: paymentMethods = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods"],
  });

  const handleSelect = (country: VirtualNumberCountry) => {
    if (!isLoggedIn) { setShowLogin(true); return; }
    setSelectedCountry(country);
  };

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: "linear-gradient(160deg, #02040e 0%, #06091a 100%)" }}>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(0,144,255,0.25), rgba(100,50,255,0.2))", border: "1px solid rgba(0,144,255,0.3)" }}
            >
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">الأرقام الفيك</h1>
              <p className="text-xs text-white/35">أرقام مؤقتة لتسجيل الحسابات</p>
            </div>
          </div>
        </motion.div>

        {/* How it works */}
        <div className="p-4 rounded-2xl mb-6" style={{ background: "rgba(0,144,255,0.05)", border: "1px solid rgba(0,144,255,0.1)" }}>
          <p className="text-xs font-bold text-primary/70 mb-2">كيف يعمل؟</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {["اختر الدولة", "ادفع وأرسل", "استلم الرقم", "اطلب الكود"].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "rgba(0,144,255,0.15)", color: "#0090ff" }}>{i + 1}</div>
                <span className="text-[10px] text-white/40">{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* My orders */}
        {isLoggedIn && <MyVNOrders />}

        {/* Countries */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
          </div>
        ) : countries.length === 0 ? (
          <div className="text-center py-20">
            <Smartphone className="w-14 h-14 text-primary/20 mx-auto mb-4" />
            <p className="text-white/40 font-bold">لا توجد دول متاحة حالياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {countries.map((country, i) => (
              <motion.div key={country.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                <CountryCard country={country} onSelect={() => handleSelect(country)} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedCountry && (
          <OrderModal
            country={selectedCountry}
            paymentMethods={paymentMethods}
            onClose={() => setSelectedCountry(null)}
          />
        )}
      </AnimatePresence>

      <CustomerLoginModal open={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
}
