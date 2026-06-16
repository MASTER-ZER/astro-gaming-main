import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, X, Copy, Check, Phone, CreditCard, Loader2, Package, Tag, ChevronLeft, Upload, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCustomer } from "@/hooks/useCustomer";
import { CustomerLoginModal } from "@/components/CustomerLoginModal";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { SardarbItem, SardarbOrder } from "@shared/schema";

const CATEGORIES = ["الكل", "سكن", "آيتم", "كود", "أخرى"];

function ItemCard({ item, onBuy }: { item: SardarbItem; onBuy: (item: SardarbItem) => void }) {
  const discount = item.originalPrice && item.originalPrice > item.price
    ? Math.round((1 - item.price / item.originalPrice) * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        background: "linear-gradient(160deg, rgba(10,18,42,0.95), rgba(4,6,18,0.98))",
        border: "1px solid rgba(168,85,247,0.1)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}
      onClick={() => onBuy(item)}
      data-testid={`card-sardarb-${item.id}`}
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ paddingTop: "75%" }}>
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(168,85,247,0.08)" }}
          >
            <Package className="w-10 h-10 text-purple-400/30" />
          </div>
        )}
        {discount && (
          <div
            className="absolute top-2 right-2 text-[11px] font-black px-2 py-0.5 rounded-full"
            style={{ background: "rgba(239,68,68,0.9)", color: "white" }}
          >
            -{discount}%
          </div>
        )}
        {item.stock <= 3 && item.stock > 0 && (
          <div
            className="absolute top-2 left-2 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(245,158,11,0.85)", color: "white" }}
          >
            {item.stock} متبقي
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div
          className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1.5"
          style={{ background: "rgba(168,85,247,0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.2)" }}
        >
          {item.category}
        </div>
        <h3 className="font-bold text-white text-sm leading-tight mb-2 line-clamp-2">{item.title}</h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-black text-primary">{item.price}</span>
            <span className="text-xs text-white/40 mr-1">جنيه</span>
            {item.originalPrice && item.originalPrice > item.price && (
              <span className="text-xs text-white/25 line-through mr-1">{item.originalPrice}</span>
            )}
          </div>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,144,255,0.15)", border: "1px solid rgba(0,144,255,0.2)" }}
          >
            <ShoppingBag className="w-4 h-4 text-primary" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BuyModal({
  item,
  onClose,
  paymentMethods,
}: {
  item: SardarbItem;
  onClose: () => void;
  paymentMethods: any[];
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

  const buyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/sardarb/order", {
        itemId: item.id, paymentMethod: selectedPayment, senderPhone, paymentProofUrl,
      });
    },
    onSuccess: () => {
      toast({ title: "تم إرسال الطلب ✅", description: "سيتم مراجعة طلبك وإرسال الكود قريباً" });
      queryClient.invalidateQueries({ queryKey: ["/api/sardarb/my-orders"] });
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
          border: "1px solid rgba(168,85,247,0.2)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
        }}
      >
        <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.6), rgba(0,144,255,0.4), transparent)" }} />
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-white text-base">{item.title}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/80 hover:bg-white/10 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: "rgba(0,144,255,0.08)", border: "1px solid rgba(0,144,255,0.15)" }}>
            <Tag className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-bold text-white">{item.price} جنيه</span>
            {item.originalPrice && item.originalPrice > item.price && (
              <span className="text-xs text-white/30 line-through">{item.originalPrice} جنيه</span>
            )}
          </div>

          {/* Payment method */}
          <div className="mb-4">
            <p className="text-xs text-white/50 mb-2 font-bold">طريقة الدفع</p>
            <div className="space-y-2">
              {paymentMethods.map(pm => (
                <button
                  key={pm.id}
                  onClick={() => setSelectedPayment(pm.name)}
                  data-testid={`button-payment-${pm.id}`}
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
                          data-testid={`button-copy-pm-sardarb-${pm.id}`}
                          className="w-5 h-5 rounded flex items-center justify-center transition-all"
                          style={{ background: "rgba(168,85,247,0.15)" }}
                        >
                          {copiedAccount === pm.id
                            ? <Check className="w-3 h-3 text-green-400" />
                            : <Copy className="w-3 h-3 text-purple-400" />}
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
              style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)" }}
            >
              <p className="text-[11px] text-white/40 mb-1.5">حوّل المبلغ إلى هذا الرقم:</p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-base font-mono font-black text-white" dir="ltr">{selectedMethod.accountNumber}</p>
                <button
                  onClick={(e) => copyAccount(e, selectedMethod.accountNumber, `sel-${selectedMethod.id}`)}
                  data-testid="button-copy-selected-sardarb"
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold transition-all"
                  style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.35)", color: "#fff" }}
                >
                  {copiedAccount === `sel-${selectedMethod.id}` ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedAccount === `sel-${selectedMethod.id}` ? "تم" : "نسخ"}
                </button>
              </div>
              <p className="text-xs text-purple-400 mt-1.5 font-bold">{item.price} جنيه</p>
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
                data-testid="input-sender-phone"
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
                  <span className="text-xs text-purple-400 hover:underline">تغيير</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} data-testid="input-change-sardarb-proof" />
                </label>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <div className="p-4 rounded-xl text-center border-2 border-dashed transition-colors"
                  style={{ borderColor: "rgba(168,85,247,0.2)", background: "rgba(168,85,247,0.04)" }}>
                  {isUploading
                    ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-purple-400" />
                    : <><Upload className="w-5 h-5 mx-auto mb-1 text-white/30" /><p className="text-xs text-white/40">اضغط لرفع صورة التحويل</p></>}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} data-testid="input-sardarb-proof" />
              </label>
            )}
          </div>

          <Button
            onClick={() => buyMutation.mutate()}
            disabled={!selectedPayment || !senderPhone || buyMutation.isPending}
            data-testid="button-confirm-purchase"
            className="w-full h-11 rounded-xl font-bold"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f1fb1)",
              boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
              border: "none",
            }}
          >
            {buyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <ShoppingBag className="w-4 h-4 ml-2" />}
            تأكيد الشراء
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MyOrdersPanel() {
  const { data: orders = [] } = useQuery<(SardarbOrder & { item?: SardarbItem })[]>({
    queryKey: ["/api/sardarb/my-orders"],
  });
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (orders.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-black text-white/60 mb-3 flex items-center gap-2">
        <Package className="w-4 h-4" /> طلباتي من السرداب
      </h2>
      <div className="space-y-2">
        {orders.map(order => (
          <div
            key={order.id}
            className="p-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            data-testid={`card-my-sardarb-${order.id}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-sm font-bold text-white">{order.item?.title || "منتج"}</p>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: order.status === "delivered" ? "rgba(52,211,153,0.12)" : order.status === "pending" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                  color: order.status === "delivered" ? "#34d399" : order.status === "pending" ? "#f59e0b" : "#f87171",
                }}
              >
                {order.status === "pending" ? "⏳ قيد المراجعة" : order.status === "confirmed" ? "✅ مؤكد" : order.status === "delivered" ? "🎉 مُسلَّم" : "❌ ملغي"}
              </span>
            </div>
            {order.status === "delivered" && order.deliveredCode && (
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="flex-1 px-3 py-2 rounded-xl text-sm font-mono font-bold text-white text-center tracking-widest"
                  style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)" }}
                >
                  {order.deliveredCode}
                </div>
                <button
                  onClick={() => copyCode(order.deliveredCode!, order.id)}
                  data-testid={`button-copy-code-${order.id}`}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                  style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}
                >
                  {copied === order.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-green-400" />}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Sardarb() {
  const { isLoggedIn } = useCustomer();
  const [showLogin, setShowLogin] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SardarbItem | null>(null);
  const [activeCategory, setActiveCategory] = useState("الكل");

  const { data: items = [], isLoading } = useQuery<SardarbItem[]>({
    queryKey: ["/api/sardarb/items"],
  });

  const { data: paymentMethods = [] } = useQuery<any[]>({
    queryKey: ["/api/payment-methods"],
  });

  const filtered = activeCategory === "الكل" ? items : items.filter(i => i.category === activeCategory);

  const handleBuy = (item: SardarbItem) => {
    if (!isLoggedIn) { setShowLogin(true); return; }
    setSelectedItem(item);
  };

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: "linear-gradient(160deg, #02040e 0%, #06091a 100%)" }}>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(79,31,177,0.2))", border: "1px solid rgba(168,85,247,0.3)" }}
            >
              <ShoppingBag className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">السرداب</h1>
              <p className="text-xs text-white/35">أكواد السكنات والآيتمات الحصرية</p>
            </div>
          </div>
        </motion.div>

        {/* My orders */}
        {isLoggedIn && <MyOrdersPanel />}

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              data-testid={`button-category-${cat}`}
              className="shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-200"
              style={{
                background: activeCategory === cat ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.05)",
                border: activeCategory === cat ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(255,255,255,0.08)",
                color: activeCategory === cat ? "#a855f7" : "rgba(255,255,255,0.4)",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-purple-400/40 border-t-purple-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-14 h-14 text-purple-400/20 mx-auto mb-4" />
            <p className="text-white/40 font-bold">لا توجد منتجات في هذه الفئة</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <ItemCard item={item} onBuy={handleBuy} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Buy Modal */}
      <AnimatePresence>
        {selectedItem && (
          <BuyModal
            item={selectedItem}
            paymentMethods={paymentMethods}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>

      <CustomerLoginModal open={showLogin} onClose={() => setShowLogin(false)} />
    </div>
  );
}
