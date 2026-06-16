import { useParams, Link, useLocation } from "wouter";
import { paymentMethodsData } from "@/lib/gameData";
import { ParticleBackground } from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Upload, CheckCircle, Copy, Loader2, AlertCircle, Minus, Plus, ShieldAlert, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import type { Game, Package, PaymentMethod } from "@shared/schema";
import { useCustomer, customerFetch } from "@/hooks/useCustomer";
import { useSiteSettings } from "@/App";
import { Wallet } from "lucide-react";

interface PlayerIdRule {
  pattern: RegExp;
  minLength: number;
  maxLength: number;
  hint: string;
  example: string;
}

const playerIdRules: Record<string, PlayerIdRule> = {
  "pubg-id": { pattern: /^\d{5,12}$/, minLength: 5, maxLength: 12, hint: "آيدي PUBG يتكون من 5-12 رقم فقط", example: "5123456789" },
  "pubg-kr": { pattern: /^\d{5,12}$/, minLength: 5, maxLength: 12, hint: "آيدي PUBG الكورية يتكون من 5-12 رقم فقط", example: "5123456789" },
  "pubg-account": { pattern: /^.{3,30}$/, minLength: 3, maxLength: 30, hint: "أدخل بيانات الحساب", example: "account@email.com" },
  "pes-mobile": { pattern: /^.{3,30}$/, minLength: 3, maxLength: 30, hint: "أدخل بيانات حساب PES", example: "player12345" },
  "fifa-mobile": { pattern: /^.{3,30}$/, minLength: 3, maxLength: 30, hint: "أدخل بيانات حساب FIFA Mobile", example: "player12345" },
  "tiktok": { pattern: /^@?[a-zA-Z0-9_.]{2,30}$/, minLength: 2, maxLength: 30, hint: "اسم مستخدم TikTok يتكون من 2-30 حرف (حروف وأرقام و_ و.)", example: "@username" },
  "roblox": { pattern: /^[a-zA-Z0-9_]{3,20}$/, minLength: 3, maxLength: 20, hint: "اسم مستخدم Roblox يتكون من 3-20 حرف (حروف وأرقام و_)", example: "Player_123" },
  "freefire": { pattern: /^.{3,30}$/, minLength: 3, maxLength: 30, hint: "أدخل بيانات حساب فري فاير", example: "account@email.com" },
  "freefire-id": { pattern: /^\d{5,12}$/, minLength: 5, maxLength: 12, hint: "آيدي فري فاير يتكون من 5-12 رقم فقط", example: "1234567890" },
};

const defaultIdRule: PlayerIdRule = { pattern: /^.{3,30}$/, minLength: 3, maxLength: 30, hint: "الآيدي يتكون من 3-30 حرف/رقم", example: "12345678" };

function validatePlayerId(slug: string, value: string): { valid: boolean; message: string } {
  const rule = playerIdRules[slug] || defaultIdRule;
  if (!value.trim()) return { valid: false, message: "هذا الحقل مطلوب" };
  if (value.length < rule.minLength) return { valid: false, message: `الآيدي قصير جداً (الحد الأدنى ${rule.minLength} حروف)` };
  if (value.length > rule.maxLength) return { valid: false, message: `الآيدي طويل جداً (الحد الأقصى ${rule.maxLength} حروف)` };
  if (!rule.pattern.test(value)) return { valid: false, message: rule.hint };
  return { valid: true, message: "الآيدي يبدو صحيح" };
}

function validatePhone(value: string): { valid: boolean; message: string } {
  if (!value.trim()) return { valid: false, message: "رقم الهاتف مطلوب" };
  const cleaned = value.replace(/[\s\-()]/g, "");
  if (cleaned.length < 10) return { valid: false, message: "الرقم قصير جداً (10 أرقام على الأقل)" };
  if (cleaned.length > 15) return { valid: false, message: "الرقم طويل جداً (15 رقم كحد أقصى)" };
  if (!/^\+?\d{10,15}$/.test(cleaned)) return { valid: false, message: "أدخل رقم هاتف صحيح (أرقام فقط)" };
  if (/^01[0-9]{9}$/.test(cleaned)) return { valid: true, message: "رقم مصري صحيح" };
  if (/^09[0-9]{8}$/.test(cleaned)) return { valid: true, message: "رقم سوداني صحيح" };
  return { valid: true, message: "رقم الهاتف مقبول" };
}

function validateEmail(value: string): { valid: boolean; message: string } {
  if (!value.trim()) return { valid: true, message: "" };
  if (value.length < 5) return { valid: false, message: "البريد الإلكتروني قصير جداً" };
  if (value.length > 100) return { valid: false, message: "البريد الإلكتروني طويل جداً" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return { valid: false, message: "أدخل بريد إلكتروني صحيح مثل example@gmail.com" };
  return { valid: true, message: "البريد الإلكتروني صحيح" };
}

export default function Order() {
  const { slug, packageId } = useParams<{ slug: string; packageId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { customer, isLoggedIn, refreshCustomer } = useCustomer();
  const siteSettings = useSiteSettings();
  const paymentProofRequired = siteSettings.enable_payment_proof !== "false";

  const { data: games = [], isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const { data: allPackages = [], isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
  });

  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

  const isLoading = gamesLoading || packagesLoading;

  const game = games.find((g) => g.slug === slug);

  const packages = game ? allPackages.filter((p) => p.gameId === game.id) : [];

  const selectedPackage = packages.find((p: any) => p.id === packageId);

  const displayPaymentMethods = paymentMethods.length > 0 ? paymentMethods : paymentMethodsData;

  const effectiveLoginType: "id" | "account" | "both" = (() => {
    const pkgType = selectedPackage && (selectedPackage as any).loginType;
    if (pkgType && pkgType !== "inherit" && pkgType !== "" && pkgType !== null) return pkgType;
    const gameType = game && (game as any).loginType;
    if (gameType && gameType !== "" && gameType !== null) return gameType;
    return "both";
  })();

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    playerId: "",
    playerUsername: "",
    playerPassword: "",
    loginType: "id" as "id" | "account",
    linkingMethod: "" as string,
    linkingMethodOther: "",
    notes: "",
    quantity: 1,
    paymentMethod: "",
    senderPhone: "",
  });

  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (isLoggedIn && customer && !prefilled) {
      setFormData(prev => ({
        ...prev,
        customerName: customer.name || prev.customerName,
        customerPhone: customer.phone || prev.customerPhone,
      }));

      if (game?.id) {
        customerFetch("/api/customer/game-ids").then(res => {
          if (res.ok) {
            res.json().then((gameIds: any[]) => {
              const saved = gameIds.find((g: any) => g.gameId === game.id);
              if (saved) {
                setFormData(prev => ({ ...prev, playerId: saved.playerId }));
              }
            });
          }
        }).catch(() => {});
      }

      setPrefilled(true);
    }
  }, [isLoggedIn, customer, game?.id, prefilled]);

  useEffect(() => {
    if (effectiveLoginType === "id") {
      setFormData(prev => ({ ...prev, loginType: "id" }));
    } else if (effectiveLoginType === "account") {
      setFormData(prev => ({ ...prev, loginType: "account" }));
    }
  }, [effectiveLoginType]);

  const [idVerified, setIdVerified] = useState<boolean | null>(null);
  const [idVerifying, setIdVerifying] = useState(false);

  const linkingMethods = [
    { value: "فيسبوك", label: "فيسبوك" },
    { value: "جوجل / جيميل", label: "جوجل / جيميل" },
    { value: "X (تويتر)", label: "X (تويتر)" },
    { value: "ابل", label: "ابل (Apple)" },
    { value: "كونامي", label: "كونامي (Konami)" },
    { value: "ضيف", label: "ضيف (Guest)" },
    { value: "رقم هاتف", label: "رقم هاتف" },
    { value: "إيميل", label: "إيميل" },
    { value: "VK", label: "VK" },
    { value: "LINE", label: "LINE" },
    { value: "other", label: "أخرى" },
  ];

  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState(1);

  const phoneValidation = validatePhone(formData.customerPhone);
  const emailValidation = validateEmail(formData.customerEmail);
  const idValidation = slug ? validatePlayerId(slug, formData.playerId) : { valid: false, message: "" };
  const currentIdRule = (slug ? playerIdRules[slug] : null) || defaultIdRule;

  const handleVerifyId = () => {
    setIdVerifying(true);
    setTimeout(() => {
      const result = validatePlayerId(slug || "", formData.playerId);
      setIdVerified(result.valid);
      setIdVerifying(false);
      toast({
        title: result.valid ? "تم التحقق" : "خطأ في الآيدي",
        description: result.valid ? "صيغة الآيدي تبدو صحيحة" : result.message,
        variant: result.valid ? "default" : "destructive",
      });
    }, 800);
  };

  const [createdOrderNumber, setCreatedOrderNumber] = useState<string>("");
  const [orderNumberCopied, setOrderNumberCopied] = useState(false);

  const [paymentType, setPaymentType] = useState<"direct" | "wallet">("direct");

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/orders", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      setCreatedOrderNumber(data.orderNumber || "");
      toast({
        title: "تم إرسال الطلب",
        description: "سيتم مراجعة طلبك والتواصل معك قريباً",
      });
      setStep(4);

      if (isLoggedIn && game?.id && formData.loginType === "id" && formData.playerId) {
        customerFetch("/api/customer/game-ids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: game.id, playerId: formData.playerId }),
        }).catch(() => {});
      }
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل إرسال الطلب، حاول مرة أخرى",
        variant: "destructive",
      });
    },
  });

  const walletOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await customerFetch("/api/orders/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      setCreatedOrderNumber(data.orderNumber || "");
      toast({
        title: "تم إرسال الطلب",
        description: "تم خصم المبلغ من المحفظة وإرسال الطلب بنجاح",
      });
      setStep(4);

      queryClient.invalidateQueries({ queryKey: ["/api/customer/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/orders"] });
      refreshCustomer();

      if (isLoggedIn && game?.id && formData.loginType === "id" && formData.playerId) {
        customerFetch("/api/customer/game-ids", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId: game.id, playerId: formData.playerId }),
        }).catch(() => {});
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل إرسال الطلب",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!game || !selectedPackage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">الباقة غير موجودة</h1>
          <Link href="/games">
            <Button>
              <ArrowRight className="w-4 h-4 ml-2" />
              العودة للألعاب
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedPaymentMethod = displayPaymentMethods.find(
    (m) => m.id === formData.paymentMethod
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      setPaymentProofUrl(data.objectPath);
      toast({
        title: "تم رفع الصورة",
        description: "تم رفع إثبات الدفع بنجاح",
      });
    } catch {
      toast({
        title: "خطأ",
        description: "فشل رفع الصورة، حاول مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "تم النسخ",
      description: "تم نسخ الرقم إلى الحافظة",
    });
  };

  const totalPrice = selectedPackage ? selectedPackage.price * formData.quantity : 0;

  const handleSubmit = () => {
    const playerField = formData.loginType === "id" ? formData.playerId : formData.playerPassword;
    const usernameValid = formData.loginType === "id" || formData.playerUsername;
    const linkingValid = formData.loginType === "id" || formData.linkingMethod;
    if (!formData.customerName || !formData.customerPhone || !playerField || !usernameValid || !linkingValid || !formData.paymentMethod) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    if (!phoneValidation.valid) {
      toast({ title: "خطأ", description: phoneValidation.message, variant: "destructive" });
      return;
    }

    if (formData.customerEmail && !emailValidation.valid) {
      toast({ title: "خطأ", description: emailValidation.message, variant: "destructive" });
      return;
    }

    if (formData.loginType === "id" && !idValidation.valid) {
      toast({ title: "خطأ", description: idValidation.message, variant: "destructive" });
      return;
    }

    if (formData.loginType === "account" && !formData.linkingMethod) {
      toast({ title: "خطأ", description: "يجب اختيار طريقة ربط الحساب", variant: "destructive" });
      return;
    }

    if (formData.loginType === "account" && formData.linkingMethod === "other" && !formData.linkingMethodOther) {
      toast({ title: "خطأ", description: "اكتب طريقة الربط الأخرى", variant: "destructive" });
      return;
    }

    const selectedMethod = displayPaymentMethods.find(m => m.id === formData.paymentMethod);
    const paymentMethodName = selectedMethod
      ? `${selectedMethod.nameAr} - ${selectedMethod.accountNumber}`
      : formData.paymentMethod;

    const finalLinkingMethod = formData.loginType === "account"
      ? (formData.linkingMethod === "other" ? `أخرى: ${formData.linkingMethodOther}` : formData.linkingMethod)
      : null;

    createOrderMutation.mutate({
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail || null,
      gameId: game.id,
      packageId: selectedPackage.id,
      playerId: formData.loginType === "id" ? formData.playerId : formData.playerPassword,
      accountUsername: formData.loginType === "account" ? formData.playerUsername : null,
      loginType: formData.loginType,
      linkingMethod: finalLinkingMethod,
      quantity: formData.quantity,
      paymentMethod: paymentMethodName,
      paymentProofUrl,
      senderPhone: formData.senderPhone || null,
      totalAmount: totalPrice,
      notes: formData.notes || null,
      status: "pending",
    });
  };

  return (
    <div className="min-h-screen relative">
      <ParticleBackground />

      <div className="relative z-10 py-6 sm:py-8 md:py-12 container mx-auto px-3 sm:px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 sm:mb-8"
        >
          <Link
            href={`/games/${game.slug}`}
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-3 text-sm"
          >
            <ArrowRight className="w-4 h-4 ml-1" />
            العودة لـ {game.nameAr}
          </Link>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">إتمام الطلب</h1>
          <p className="text-muted-foreground text-sm">اتبع الخطوات لإتمام عملية الشحن</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 sm:mb-8"
        >
          <div className="glass-card-gold rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-lg bg-gradient-to-br ${game.color} flex items-center justify-center text-xl sm:text-2xl flex-shrink-0`}>
                {game.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold">{game.nameAr}</h3>
                <p className="text-muted-foreground">{selectedPackage.amount}</p>
                {formData.quantity > 1 && (
                  <p className="text-xs text-muted-foreground">الكمية: {formData.quantity}</p>
                )}
              </div>
              <div className="text-left">
                <p className="text-2xl font-black text-gradient-gold">{totalPrice}</p>
                <p className="text-sm text-muted-foreground">جنيه</p>
                {formData.quantity > 1 && (
                  <p className="text-[10px] text-muted-foreground">{selectedPackage.price} × {formData.quantity}</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex justify-center mb-5 sm:mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step >= s
                      ? "bg-primary text-primary-foreground glow-soft"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 h-1 mx-1 rounded transition-all ${
                      step > s ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {step === 4 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="glass-card-gold rounded-xl p-5 sm:p-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">تم إرسال طلبك بنجاح!</h2>
              <p className="text-muted-foreground mb-4">
                سيتم مراجعة طلبك والتواصل معك خلال دقائق عبر الواتساب
              </p>

              {createdOrderNumber && (
                <div className="glass-card rounded-lg p-4 mb-6 inline-block mx-auto" data-testid="card-order-number">
                  <p className="text-xs text-muted-foreground mb-1">رقم الشحنة (احفظه للتتبع)</p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-lg sm:text-xl font-black text-primary tracking-wider" dir="ltr" data-testid="text-order-number">
                      {createdOrderNumber}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(createdOrderNumber);
                        setOrderNumberCopied(true);
                        toast({ title: "تم النسخ", description: "تم نسخ رقم الشحنة" });
                        setTimeout(() => setOrderNumberCopied(false), 2000);
                      }}
                      data-testid="button-copy-order-number"
                    >
                      {orderNumberCopied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    استخدم هذا الرقم في صفحة "طلباتي" لتتبع حالة طلبك
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/my-orders">
                  <Button variant="outline" className="w-full sm:w-auto">
                    تتبع طلبي
                  </Button>
                </Link>
                <Link href="/games">
                  <Button variant="outline" className="w-full sm:w-auto">
                    تصفح المزيد من الألعاب
                  </Button>
                </Link>
                <Link href="/">
                  <Button className="w-full sm:w-auto glow-soft">
                    العودة للرئيسية
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="glass-card rounded-xl p-4 sm:p-6">
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-bold mb-4">بيانات التواصل</h2>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customerName">الاسم *</Label>
                    <Input
                      id="customerName"
                      placeholder="أدخل اسمك"
                      value={formData.customerName}
                      onChange={(e) =>
                        setFormData({ ...formData, customerName: e.target.value })
                      }
                      className="mt-1"
                      data-testid="input-customer-name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="customerPhone">رقم الهاتف (واتساب) *</Label>
                    <Input
                      id="customerPhone"
                      type="tel"
                      placeholder="01xxxxxxxxx"
                      value={formData.customerPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, customerPhone: e.target.value })
                      }
                      className={`mt-1 ${formData.customerPhone && !phoneValidation.valid ? "border-red-500/50 focus-visible:ring-red-500/30" : formData.customerPhone && phoneValidation.valid ? "border-green-500/50 focus-visible:ring-green-500/30" : ""}`}
                      data-testid="input-customer-phone"
                    />
                    {formData.customerPhone && (
                      <p className={`text-xs mt-1 ${phoneValidation.valid ? "text-green-400" : "text-red-400"}`} data-testid="text-phone-validation">
                        {phoneValidation.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="customerEmail">البريد الإلكتروني (اختياري)</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      placeholder="example@email.com"
                      value={formData.customerEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, customerEmail: e.target.value })
                      }
                      className={`mt-1 ${formData.customerEmail && !emailValidation.valid ? "border-red-500/50 focus-visible:ring-red-500/30" : formData.customerEmail && emailValidation.valid ? "border-green-500/50 focus-visible:ring-green-500/30" : ""}`}
                      data-testid="input-customer-email"
                    />
                    {formData.customerEmail && emailValidation.message && (
                      <p className={`text-xs mt-1 ${emailValidation.valid ? "text-green-400" : "text-red-400"}`} data-testid="text-email-validation">
                        {emailValidation.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="mb-2 block">نوع تسجيل الدخول *</Label>
                    {effectiveLoginType === "both" ? (
                      <div className="flex gap-3 mb-3">
                        <Button
                          type="button"
                          variant={formData.loginType === "id" ? "default" : "outline"}
                          className={`flex-1 ${formData.loginType === "id" ? "glow-soft" : ""}`}
                          onClick={() => setFormData({ ...formData, loginType: "id", playerId: "", playerUsername: "", playerPassword: "" })}
                          data-testid="button-login-type-id"
                        >
                          ID - آيدي اللاعب
                        </Button>
                        <Button
                          type="button"
                          variant={formData.loginType === "account" ? "default" : "outline"}
                          className={`flex-1 ${formData.loginType === "account" ? "glow-soft" : ""}`}
                          onClick={() => setFormData({ ...formData, loginType: "account", playerId: "", playerUsername: "", playerPassword: "" })}
                          data-testid="button-login-type-account"
                        >
                          حساب - Account
                        </Button>
                      </div>
                    ) : (
                      <div className="mb-3">
                        <Badge variant="outline" className="text-xs">
                          {effectiveLoginType === "id" ? "ID - آيدي اللاعب" : "حساب - Account"}
                        </Badge>
                      </div>
                    )}

                    {formData.loginType === "id" ? (
                      <div className="space-y-2">
                        <Label htmlFor="playerId">Player ID / آيدي اللاعب *</Label>
                        <div className="flex gap-2">
                          <Input
                            id="playerId"
                            placeholder={`مثال: ${currentIdRule.example}`}
                            value={formData.playerId}
                            onChange={(e) => {
                              setFormData({ ...formData, playerId: e.target.value });
                              setIdVerified(null);
                            }}
                            className={`flex-1 ${formData.playerId && !idValidation.valid ? "border-red-500/50 focus-visible:ring-red-500/30" : idVerified === true ? "border-green-500/50 focus-visible:ring-green-500/30" : ""}`}
                            data-testid="input-player-id"
                          />
                          <Button
                            type="button"
                            variant={idVerified === true ? "default" : "outline"}
                            onClick={handleVerifyId}
                            disabled={!formData.playerId || idVerifying}
                            className={idVerified === true ? "bg-green-600 border-green-600" : ""}
                            data-testid="button-verify-id"
                          >
                            {idVerifying ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : idVerified === true ? (
                              <>
                                <CheckCircle className="w-4 h-4 ml-1" />
                                تم
                              </>
                            ) : (
                              <>
                                <Search className="w-4 h-4 ml-1" />
                                تحقق
                              </>
                            )}
                          </Button>
                        </div>
                        {formData.playerId && (
                          <p className={`text-xs ${idValidation.valid ? "text-green-400" : "text-red-400"}`} data-testid="text-id-validation">
                            {idValidation.message}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {currentIdRule.hint}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="playerUsername">اسم المستخدم / الإيميل / الرقم *</Label>
                          <Input
                            id="playerUsername"
                            placeholder="أدخل إيميل أو رقم الحساب"
                            value={formData.playerUsername}
                            onChange={(e) =>
                              setFormData({ ...formData, playerUsername: e.target.value })
                            }
                            className="mt-1"
                            data-testid="input-player-username"
                          />
                        </div>
                        <div>
                          <Label htmlFor="playerPassword">كلمة مرور الحساب *</Label>
                          <Input
                            id="playerPassword"
                            type="password"
                            placeholder="أدخل كلمة مرور الحساب"
                            value={formData.playerPassword}
                            onChange={(e) =>
                              setFormData({ ...formData, playerPassword: e.target.value })
                            }
                            className="mt-1"
                            data-testid="input-player-password"
                          />
                        </div>
                        <div>
                          <Label>طريقة ربط الحساب * <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 mr-1">إجباري</Badge></Label>
                          <Select
                            value={formData.linkingMethod}
                            onValueChange={(value) => setFormData({ ...formData, linkingMethod: value })}
                          >
                            <SelectTrigger className={`mt-1 ${!formData.linkingMethod ? "border-amber-500/30" : ""}`} data-testid="select-linking-method">
                              <SelectValue placeholder="اختر طريقة الربط (مطلوب)" />
                            </SelectTrigger>
                            <SelectContent>
                              {linkingMethods.map((method) => (
                                <SelectItem key={method.value} value={method.value}>
                                  {method.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!formData.linkingMethod && (
                            <p className="text-xs text-amber-400 mt-1">يجب اختيار طريقة ربط الحساب لإتمام الطلب</p>
                          )}
                          {formData.linkingMethod === "other" && (
                            <div className="mt-2">
                              <Input
                                placeholder="اكتب طريقة الربط الأخرى"
                                value={formData.linkingMethodOther}
                                onChange={(e) => setFormData({ ...formData, linkingMethodOther: e.target.value })}
                                className={!formData.linkingMethodOther ? "border-amber-500/30" : ""}
                                data-testid="input-linking-method-other"
                              />
                              {!formData.linkingMethodOther && (
                                <p className="text-xs text-amber-400 mt-1">اكتب طريقة الربط</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                    <Input
                      id="notes"
                      placeholder="أي ملاحظات إضافية للطلب..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="mt-1"
                      data-testid="input-notes"
                    />
                  </div>

                  <div>
                    <Label>الكمية</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                        disabled={formData.quantity <= 1}
                        data-testid="button-quantity-minus"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={99}
                        value={formData.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setFormData({ ...formData, quantity: Math.max(1, Math.min(99, val)) });
                        }}
                        className="w-20 text-center"
                        data-testid="input-quantity"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setFormData({ ...formData, quantity: Math.min(99, formData.quantity + 1) })}
                        disabled={formData.quantity >= 99}
                        data-testid="button-quantity-plus"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      {formData.quantity > 1 && (
                        <p className="text-sm text-muted-foreground">
                          الإجمالي: <span className="font-bold text-primary">{totalPrice} ج.م</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full glow-soft"
                  onClick={() => setStep(2)}
                  disabled={
                    !formData.customerName ||
                    !formData.customerPhone ||
                    !phoneValidation.valid ||
                    (formData.customerEmail ? !emailValidation.valid : false) ||
                    !(formData.loginType === "id"
                      ? (formData.playerId && idValidation.valid)
                      : (formData.playerUsername && formData.playerPassword && formData.linkingMethod && (formData.linkingMethod !== "other" || formData.linkingMethodOther)))
                  }
                  data-testid="button-next-step-1"
                >
                  التالي: اختيار طريقة الدفع
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-bold mb-4">اختر طريقة الدفع</h2>

                {isLoggedIn && customer && (
                  <div
                    className={`rounded-lg border p-4 cursor-pointer transition-all mb-4 ${
                      paymentType === "wallet"
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setPaymentType(paymentType === "wallet" ? "direct" : "wallet")}
                    data-testid="button-wallet-payment"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">الدفع من المحفظة</p>
                        <p className="text-sm text-muted-foreground">
                          رصيدك: <span className={`font-bold ${customer.balance >= totalPrice ? "text-green-400" : "text-red-400"}`}>{customer.balance} جنيه</span>
                        </p>
                      </div>
                      {paymentType === "wallet" && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    {paymentType === "wallet" && customer.balance < totalPrice && (
                      <div className="mt-2 p-2 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-red-400">رصيدك غير كافي. تحتاج {totalPrice - customer.balance} جنيه إضافية.</p>
                        <div className="flex gap-2 mt-1">
                          <Link href="/wallet">
                            <Button variant="link" size="sm" className="text-primary text-xs p-0 h-auto" data-testid="link-deposit">
                              إيداع رصيد
                            </Button>
                          </Link>
                          <Button variant="link" size="sm" className="text-muted-foreground text-xs p-0 h-auto" onClick={() => setPaymentType("direct")} data-testid="button-switch-direct">
                            أو ادفع مباشرة
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {paymentType === "wallet" && isLoggedIn && customer && customer.balance >= totalPrice ? (
                  <div className="space-y-4">
                    <div className="glass-card rounded-lg bg-green-500/10 border border-green-500/20 p-4">
                      <p className="text-sm text-green-400 font-medium mb-1">سيتم خصم {totalPrice} جنيه من محفظتك</p>
                      <p className="text-xs text-muted-foreground">الرصيد بعد الخصم: {customer.balance - totalPrice} جنيه</p>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep(1)} className="flex-1">السابق</Button>
                      <Button
                        className="flex-1 glow-soft"
                        onClick={() => {
                          const playerField = formData.loginType === "id" ? formData.playerId : formData.playerPassword;
                          const finalLinkingMethod = formData.loginType === "account"
                            ? (formData.linkingMethod === "other" ? `أخرى: ${formData.linkingMethodOther}` : formData.linkingMethod)
                            : null;
                          walletOrderMutation.mutate({
                            customerName: formData.customerName,
                            customerPhone: formData.customerPhone,
                            customerEmail: formData.customerEmail || null,
                            gameId: game?.id,
                            packageId: selectedPackage?.id,
                            playerId: formData.loginType === "id" ? formData.playerId : formData.playerPassword,
                            accountUsername: formData.loginType === "account" ? formData.playerUsername : null,
                            loginType: formData.loginType,
                            linkingMethod: finalLinkingMethod,
                            quantity: formData.quantity,
                            paymentMethod: "محفظة",
                            totalAmount: totalPrice,
                            notes: formData.notes || null,
                            status: "pending",
                          });
                        }}
                        disabled={walletOrderMutation.isPending}
                        data-testid="button-wallet-submit"
                      >
                        {walletOrderMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الإرسال...</>
                        ) : "تأكيد الطلب والدفع من المحفظة"}
                      </Button>
                    </div>
                  </div>
                ) : paymentType === "wallet" ? null : (
                  <p className="text-xs text-muted-foreground mb-2">أو اختر وسيلة دفع مباشرة:</p>
                )}

                {paymentType !== "wallet" && (
                  <>
                    <RadioGroup
                      value={formData.paymentMethod}
                      onValueChange={(value) =>
                        setFormData({ ...formData, paymentMethod: value })
                      }
                      className="space-y-3"
                    >
                      {displayPaymentMethods.map((method) => (
                        <div
                          key={method.id}
                          className={`relative flex items-center space-x-3 space-x-reverse rounded-lg border p-4 cursor-pointer transition-all ${
                            formData.paymentMethod === method.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <RadioGroupItem
                            value={method.id}
                            id={method.id}
                            className="sr-only"
                          />
                          <label
                            htmlFor={method.id}
                            className="flex items-center gap-3 cursor-pointer w-full"
                          >
                            <span className="text-2xl">{method.icon}</span>
                            <div className="flex-1">
                              <p className="font-medium">{method.nameAr}</p>
                              <p className="text-sm text-muted-foreground">
                                {method.accountNumber}
                              </p>
                            </div>
                            {formData.paymentMethod === method.id && (
                              <CheckCircle className="w-5 h-5 text-primary" />
                            )}
                          </label>
                        </div>
                      ))}
                    </RadioGroup>

                    {selectedPaymentMethod && (
                      <div className="glass-card rounded-lg bg-primary/10 border border-primary/20 p-4">
                        <p className="text-sm text-muted-foreground mb-2">
                          حول المبلغ إلى هذا الرقم:
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-bold">
                            {selectedPaymentMethod.accountNumber}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(selectedPaymentMethod.accountNumber)
                            }
                            data-testid="button-copy-account"
                          >
                            <Copy className="w-4 h-4 ml-1" />
                            نسخ
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          المبلغ: <span className="font-bold text-primary">{totalPrice} جنيه</span>
                          {formData.quantity > 1 && <span className="text-xs"> ({selectedPackage.price} × {formData.quantity})</span>}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="flex-1"
                      >
                        السابق
                      </Button>
                      <Button
                        className="flex-1 glow-soft"
                        onClick={() => setStep(3)}
                        disabled={!formData.paymentMethod}
                        data-testid="button-next-step-2"
                      >
                        التالي: رفع إثبات الدفع
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-bold mb-4">رفع إثبات الدفع</h2>

                <div className="space-y-4">
                  <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center">
                    {paymentProofUrl ? (
                      <div className="space-y-4">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                        <p className="text-green-500 font-medium">
                          تم رفع إثبات الدفع بنجاح
                        </p>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                            data-testid="input-payment-proof-change"
                          />
                          <Button variant="outline" size="sm" asChild>
                            <span>تغيير الصورة</span>
                          </Button>
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                          disabled={isUploading}
                          data-testid="input-payment-proof"
                        />
                        <div className="space-y-4">
                          {isUploading ? (
                            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
                          ) : (
                            <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                          )}
                          <div>
                            <p className="font-medium">
                              {isUploading ? "جاري الرفع..." : "اضغط لرفع صورة إثبات الدفع"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              PNG, JPG حتى 10MB
                            </p>
                          </div>
                        </div>
                      </label>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="senderPhone" className="text-sm font-medium">الرقم اللي حولت منه (اختياري)</Label>
                    <Input
                      id="senderPhone"
                      type="tel"
                      placeholder="مثال: 01012345678"
                      value={formData.senderPhone}
                      onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                      className="text-right"
                      dir="ltr"
                      data-testid="input-sender-phone"
                    />
                    <p className="text-xs text-amber-400/80">تنويه: يتم الشحن بشكل أسرع عند كتابة الرقم اللي حولت منه</p>
                  </div>

                  {paymentProofRequired ? (
                    <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-300">
                        رفع إثبات الدفع (سكرين التحويلة) إجباري لإتمام الطلب. حول وهات اسكرين التحويلة.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        رفع إثبات الدفع اختياري - يمكنك إرسال الطلب بدون صورة التحويلة.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="flex-1"
                  >
                    السابق
                  </Button>
                  <Button
                    className="flex-1 glow-soft"
                    onClick={handleSubmit}
                    disabled={createOrderMutation.isPending || (paymentProofRequired && !paymentProofUrl)}
                    data-testid="button-submit-order"
                  >
                    {createOrderMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      "تأكيد الطلب"
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
