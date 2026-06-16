import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useCart, CartItem } from "@/lib/cart";
import { useCustomer, customerFetch } from "@/hooks/useCustomer";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ParticleBackground } from "@/components/ParticleBackground";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ShoppingCart, Trash2, ArrowRight, Loader2, Upload, CheckCircle,
  Copy, Wallet, AlertCircle, Plus, Minus, Edit2, Check, X
} from "lucide-react";
import type { PaymentMethod } from "@shared/schema";
import { paymentMethodsData } from "@/lib/gameData";
import { useSiteSettings } from "@/App";
import { CustomerLoginModal } from "@/components/CustomerLoginModal";

export default function Cart() {
  const { items, removeItem, updateItem, clearCart, totalPrice, itemCount } = useCart();
  const { customer, isLoggedIn, refreshCustomer } = useCustomer();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const siteSettings = useSiteSettings();

  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [paymentType, setPaymentType] = useState<"direct" | "wallet">("direct");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"cart" | "payment" | "success">("cart");
  const [showLogin, setShowLogin] = useState(false);
  const [successOrders, setSuccessOrders] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

  const displayPaymentMethods = paymentMethods.length > 0 ? paymentMethods : paymentMethodsData;
  const walletBalance = customer?.balance || 0;
  const selectedMethod = displayPaymentMethods.find(m => m.id === paymentMethod);
  const enablePaymentProof = siteSettings.enable_payment_proof !== "false";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setPaymentProofUrl(data.objectPath);
      toast({ title: "تم رفع الصورة" });
    } catch {
      toast({ title: "خطأ في رفع الصورة", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ" });
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (paymentType === "wallet" && walletBalance < totalPrice) {
        throw new Error(`رصيد المحفظة غير كافٍ. الرصيد: ${walletBalance} ج`);
      }
      if (paymentType === "direct" && enablePaymentProof && !paymentProofUrl) {
        throw new Error("يجب رفع إثبات الدفع");
      }
      if (!paymentMethod) throw new Error("يجب اختيار طريقة الدفع");

      // Validate items have required info
      for (const item of items) {
        if (item.loginType === "id" && !item.playerId) {
          throw new Error(`يجب إدخال الآيدي لـ ${item.gameNameAr}`);
        }
        if (item.loginType === "account" && !item.accountUsername) {
          throw new Error(`يجب إدخال اسم المستخدم لـ ${item.gameNameAr}`);
        }
        if (item.loginType === "account" && !item.linkingMethod) {
          throw new Error(`يجب اختيار نوع الربط لـ ${item.gameNameAr}`);
        }
      }

      const res = await customerFetch("/api/orders/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(item => ({
            packageId: item.packageId,
            loginType: item.loginType,
            playerId: item.playerId || null,
            accountUsername: item.accountUsername || null,
            accountPassword: item.accountPassword || null,
            linkingMethod: item.linkingMethod || null,
            quantity: item.quantity,
          })),
          paymentMethod,
          paymentProofUrl: paymentType === "wallet" ? null : paymentProofUrl,
          senderPhone: senderPhone || null,
          paymentType,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "فشل في إرسال الطلبات");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSuccessOrders(data.orders);
      clearCart();
      setStep("success");
      refreshCustomer();
      queryClient.invalidateQueries({ queryKey: ["/api/customer/orders"] });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  if (step === "success") {
    return (
      <div className="min-h-screen relative" dir="rtl">
        <ParticleBackground />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md">
            <div className="glass-card rounded-3xl p-8 text-center border border-green-500/20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-black mb-2">تم إرسال طلباتك! 🎉</h2>
              <p className="text-muted-foreground text-sm mb-6">تم استلام {successOrders.length} طلب وجاري المعالجة</p>
              <div className="space-y-2 mb-6 text-right">
                {successOrders.map(order => (
                  <div key={order.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{order.gameName || "طلب"}</span>
                    <Badge className="text-xs bg-primary/20 text-primary border-0">{order.orderNumber}</Badge>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 glow-soft" onClick={() => setLocation("/my-orders")}>
                  <ShoppingCart className="w-4 h-4 ml-2" />
                  تتبع الطلبات
                </Button>
                <Button variant="outline" className="flex-1 border-white/15" onClick={() => setLocation("/games")}>
                  تسوق أكثر
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen relative" dir="rtl">
        <ParticleBackground />
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/5 border border-primary/15 flex items-center justify-center">
              <ShoppingCart className="w-10 h-10 text-primary/40" />
            </div>
            <h2 className="text-2xl font-black mb-2">السلة فارغة</h2>
            <p className="text-muted-foreground mb-6">أضف باقات من الألعاب للبدء</p>
            <Link href="/games">
              <Button className="glow-soft">
                <ArrowRight className="w-4 h-4 ml-2" />
                تصفح الألعاب
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" dir="rtl">
      <ParticleBackground />
      <div className="relative z-10 container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
          <Link href="/games">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-black">سلة التسوق</h1>
            <p className="text-xs text-muted-foreground">{itemCount} عنصر · الإجمالي {totalPrice} ج</p>
          </div>
        </motion.div>

        {/* Cart Items */}
        <div className="space-y-3 mb-6">
          <AnimatePresence>
            {items.map((item, index) => (
              <motion.div
                key={item.cartId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <CartItemCard
                  item={item}
                  isEditing={editingItemId === item.cartId}
                  editValues={editValues}
                  onEditStart={() => {
                    setEditingItemId(item.cartId);
                    setEditValues({
                      playerId: item.playerId || "",
                      accountUsername: item.accountUsername || "",
                      accountPassword: item.accountPassword || "",
                      linkingMethod: item.linkingMethod || "",
                    });
                  }}
                  onEditSave={() => {
                    updateItem(item.cartId, {
                      playerId: editValues.playerId || undefined,
                      accountUsername: editValues.accountUsername || undefined,
                      accountPassword: editValues.accountPassword || undefined,
                      linkingMethod: editValues.linkingMethod || undefined,
                    });
                    setEditingItemId(null);
                  }}
                  onEditCancel={() => setEditingItemId(null)}
                  onEditChange={(key, val) => setEditValues(prev => ({ ...prev, [key]: val }))}
                  onRemove={() => removeItem(item.cartId)}
                  onQtyChange={(qty) => updateItem(item.cartId, { quantity: qty })}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Payment Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-4 border border-white/10 mb-4">
          <h3 className="font-bold text-sm mb-4">طريقة الدفع</h3>

          {/* Wallet option */}
          {isLoggedIn && (
            <div
              onClick={() => { setPaymentType("wallet"); setPaymentMethod("wallet"); }}
              className={`p-3 rounded-xl border cursor-pointer mb-3 transition-all ${paymentType === "wallet" ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/20"}`}
              data-testid="payment-wallet"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">المحفظة</span>
                  {walletBalance < totalPrice ? (
                    <Badge className="text-[10px] bg-red-500/20 text-red-400 border-0">رصيد غير كافٍ</Badge>
                  ) : (
                    <Badge className="text-[10px] bg-green-500/20 text-green-400 border-0">كافٍ للدفع</Badge>
                  )}
                </div>
                <span className="text-sm font-bold text-primary">{walletBalance} ج</span>
              </div>
            </div>
          )}

          <div onClick={() => setPaymentType("direct")} className={`cursor-pointer`}>
            {paymentType === "direct" && (
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                {displayPaymentMethods.filter((m: any) => m.isActive !== false).map(method => (
                  <div
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${paymentMethod === method.id ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/20"}`}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value={method.id} id={`pm-${method.id}`} className="flex-shrink-0" />
                      <span className="text-base">{method.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{method.nameAr}</p>
                        {method.accountNumber && paymentMethod === method.id && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-primary font-mono">{method.accountNumber}</span>
                            <button onClick={(e) => { e.stopPropagation(); copyToClipboard(method.accountNumber!); }} className="text-muted-foreground hover:text-primary">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {(method as PaymentMethod).accountName && paymentMethod === method.id && (
                          <p className="text-xs text-muted-foreground">{(method as PaymentMethod).accountName}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
            {paymentType === "wallet" && (
              <div
                onClick={() => setPaymentType("direct")}
                className="p-3 rounded-xl border border-dashed border-white/15 text-center text-xs text-muted-foreground cursor-pointer hover:border-white/25"
              >
                أو اختر طريقة دفع أخرى
              </div>
            )}
          </div>

          {/* Payment proof */}
          {paymentType === "direct" && enablePaymentProof && paymentMethod && (
            <div className="mt-4 space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">رقم المرسل (اختياري)</Label>
                <Input
                  value={senderPhone}
                  onChange={e => setSenderPhone(e.target.value)}
                  placeholder="رقم محفظتك"
                  className="glass-input text-sm"
                  data-testid="input-sender-phone"
                />
              </div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">إثبات الدفع</Label>
              <div
                onClick={() => fileRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${paymentProofUrl ? "border-green-500/40 bg-green-500/5" : "border-white/15 hover:border-primary/40"}`}
                data-testid="upload-payment-proof"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                ) : paymentProofUrl ? (
                  <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    تم رفع الصورة
                  </div>
                ) : (
                  <div>
                    <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">انقر لرفع إثبات الدفع</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </div>
          )}
        </motion.div>

        {/* Total & Submit */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-4 border border-primary/15">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground text-sm">الإجمالي</span>
            <span className="text-2xl font-black text-primary">{totalPrice} <span className="text-sm font-normal text-muted-foreground">ج</span></span>
          </div>
          {paymentType === "wallet" && walletBalance < totalPrice && (
            <div className="flex items-center gap-2 text-red-400 text-xs mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              رصيد غير كافٍ - الرصيد: {walletBalance} ج، المطلوب: {totalPrice} ج
            </div>
          )}
          <Button
            className="w-full glow-soft text-sm font-bold py-5"
            disabled={
              checkoutMutation.isPending ||
              !paymentMethod ||
              (paymentType === "direct" && enablePaymentProof && !paymentProofUrl) ||
              (paymentType === "wallet" && walletBalance < totalPrice)
            }
            onClick={() => { if (!isLoggedIn) { setShowLogin(true); return; } checkoutMutation.mutate(); }}
            data-testid="button-checkout"
          >
            {checkoutMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري الإرسال...</>
            ) : (
              <><CheckCircle className="w-4 h-4 ml-2" />تأكيد الطلب ({items.length} عنصر)</>
            )}
          </Button>
        </motion.div>
      </div>
      <CustomerLoginModal open={showLogin} onOpenChange={setShowLogin} />
    </div>
  );
}

interface CartItemCardProps {
  item: CartItem;
  isEditing: boolean;
  editValues: Record<string, string>;
  onEditStart: () => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onEditChange: (key: string, val: string) => void;
  onRemove: () => void;
  onQtyChange: (qty: number) => void;
}

function CartItemCard({ item, isEditing, editValues, onEditStart, onEditSave, onEditCancel, onEditChange, onRemove, onQtyChange }: CartItemCardProps) {
  const hasPlayerInfo = item.loginType === "id"
    ? !!item.playerId
    : !!item.accountUsername;

  return (
    <div className="glass-card rounded-2xl p-4 border border-white/10">
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          {item.gameIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">{item.gameNameAr}</p>
              <p className="text-xs text-muted-foreground">{item.packageName}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-black text-primary">{item.packagePrice * item.quantity} ج</p>
              {item.quantity > 1 && <p className="text-[10px] text-muted-foreground">{item.packagePrice} × {item.quantity}</p>}
            </div>
          </div>

          {/* Player info */}
          {!isEditing && (
            <div className="mt-2 flex items-center gap-2">
              {hasPlayerInfo ? (
                <Badge className="text-[10px] bg-green-500/15 text-green-400 border-green-500/20 font-normal">
                  {item.loginType === "id" ? `ID: ${item.playerId}` : `@${item.accountUsername}`}
                </Badge>
              ) : (
                <Badge className="text-[10px] bg-red-500/15 text-red-400 border-red-500/20 font-normal">
                  <AlertCircle className="w-2.5 h-2.5 ml-1" />
                  يجب إدخال البيانات
                </Badge>
              )}
            </div>
          )}

          {/* Edit form */}
          <AnimatePresence>
            {isEditing && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-2 overflow-hidden">
                {item.loginType === "id" ? (
                  <Input
                    placeholder={`آيدي ${item.gameNameAr}`}
                    value={editValues.playerId || ""}
                    onChange={e => onEditChange("playerId", e.target.value)}
                    className="glass-input text-sm h-9"
                    data-testid={`input-playerid-${item.cartId}`}
                  />
                ) : (
                  <>
                    <Input
                      placeholder="اسم المستخدم / الإيميل"
                      value={editValues.accountUsername || ""}
                      onChange={e => onEditChange("accountUsername", e.target.value)}
                      className="glass-input text-sm h-9"
                      data-testid={`input-username-${item.cartId}`}
                    />
                    <Input
                      placeholder="كلمة السر"
                      type="password"
                      value={editValues.accountPassword || ""}
                      onChange={e => onEditChange("accountPassword", e.target.value)}
                      className="glass-input text-sm h-9"
                      data-testid={`input-password-${item.cartId}`}
                    />
                    <select
                      value={editValues.linkingMethod || ""}
                      onChange={e => onEditChange("linkingMethod", e.target.value)}
                      className={`w-full glass-input text-sm h-9 rounded-lg border bg-white/5 px-3 text-right ${!editValues.linkingMethod ? "border-red-500/40" : "border-white/10"}`}
                      data-testid={`select-linking-${item.cartId}`}
                    >
                      <option value="">نوع الربط (مطلوب) *</option>
                      <option value="فيسبوك">فيسبوك</option>
                      <option value="جوجل / جيميل">جوجل / جيميل</option>
                      <option value="X (تويتر)">X (تويتر)</option>
                      <option value="ابل">ابل (Apple)</option>
                      <option value="كونامي">كونامي (Konami)</option>
                      <option value="ضيف">ضيف (Guest)</option>
                      <option value="رقم هاتف">رقم هاتف</option>
                      <option value="إيميل">إيميل</option>
                      <option value="VK">VK</option>
                      <option value="LINE">LINE</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button onClick={() => onQtyChange(Math.max(1, item.quantity - 1))} className="w-6 h-6 rounded-md bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors" data-testid={`btn-qty-minus-${item.cartId}`}>
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
              <button onClick={() => onQtyChange(Math.min(10, item.quantity + 1))} className="w-6 h-6 rounded-md bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors" data-testid={`btn-qty-plus-${item.cartId}`}>
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              {isEditing ? (
                <>
                  <button onClick={onEditSave} className="w-7 h-7 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500/30 transition-colors" data-testid={`btn-save-${item.cartId}`}>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={onEditCancel} className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors" data-testid={`btn-cancel-edit-${item.cartId}`}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button onClick={onEditStart} className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors" data-testid={`btn-edit-${item.cartId}`}>
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={onRemove} className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors" data-testid={`btn-remove-${item.cartId}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
