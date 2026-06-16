import { Link } from "wouter";
import { ParticleBackground } from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ArrowRight, Upload, CheckCircle, Copy, Loader2, Wallet, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCustomer, customerFetch } from "@/hooks/useCustomer";
import type { PaymentMethod } from "@shared/schema";

const presetAmounts = [50, 100, 200, 500, 1000];

export default function WalletDeposit() {
  const { toast } = useToast();
  const { customer, isLoggedIn, isLoading: customerLoading } = useCustomer();

  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState<number | "">("");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [senderPhone, setSenderPhone] = useState("");
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const effectiveAmount = amount || (customAmount ? Number(customAmount) : 0);

  const selectedMethod = paymentMethods.find((m) => m.id === selectedPaymentMethod);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: fd,
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

  const handleSubmit = async () => {
    if (!effectiveAmount || effectiveAmount < 10) {
      toast({ title: "خطأ", description: "الحد الأدنى للإيداع 10 جنيه", variant: "destructive" });
      return;
    }
    if (!selectedPaymentMethod) {
      toast({ title: "خطأ", description: "يرجى اختيار طريقة الدفع", variant: "destructive" });
      return;
    }
    if (!senderPhone.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال رقم المرسل", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await customerFetch("/api/wallet/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: effectiveAmount,
          paymentMethod: selectedPaymentMethod,
          senderPhone,
          paymentProofUrl,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "فشل الطلب");
      }
      setSuccess(true);
      setStep(3);
      toast({
        title: "تم إرسال الطلب",
        description: "سيتم مراجعة طلب الإيداع وإضافة الرصيد قريباً",
      });
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "فشل إرسال الطلب، حاول مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (customerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen relative" dir="rtl">
        <ParticleBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card-gold rounded-xl p-6 sm:p-8 text-center max-w-md w-full"
          >
            <Wallet className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2" data-testid="text-login-required">يجب تسجيل الدخول</h2>
            <p className="text-muted-foreground mb-6">يرجى تسجيل الدخول أولاً لشحن المحفظة</p>
            <Link href="/">
              <Button className="glow-soft" data-testid="button-go-home">
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة للرئيسية
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

      <div className="relative z-10 py-6 sm:py-8 md:py-12 container mx-auto px-3 sm:px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 sm:mb-8"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-3 text-sm"
          >
            <ArrowRight className="w-4 h-4 ml-1" />
            العودة لبروفايل
          </Link>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">شحن المحفظة</h1>
          <p className="text-muted-foreground text-sm">أضف رصيد إلى محفظتك للشراء بسهولة</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 sm:mb-8"
        >
          <div className="glass-card-gold rounded-xl p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg bg-gradient-to-br from-primary to-red-700 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">رصيد المحفظة الحالي</p>
                <p className="text-2xl font-black text-gradient-gold" data-testid="text-wallet-balance">
                  {customer?.balance ?? 0} جنيه
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {!success && (
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
        )}

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="glass-card-gold rounded-xl p-5 sm:p-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2" data-testid="text-success-title">تم إرسال طلب الإيداع!</h2>
              <p className="text-muted-foreground mb-2">
                سيتم مراجعة طلبك وإضافة الرصيد إلى محفظتك قريباً
              </p>
              <p className="text-lg font-bold text-primary mb-6" data-testid="text-deposit-amount">
                المبلغ: {effectiveAmount} جنيه
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full sm:w-auto" data-testid="button-go-dashboard">
                    بروفايل
                  </Button>
                </Link>
                <Link href="/">
                  <Button className="w-full sm:w-auto glow-soft" data-testid="button-go-home-success">
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
                <h2 className="text-xl font-bold mb-4">اختر المبلغ</h2>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {presetAmounts.map((preset) => (
                    <Button
                      key={preset}
                      variant={amount === preset ? "default" : "outline"}
                      className={`h-auto py-3 text-base font-bold ${
                        amount === preset ? "glow-soft" : ""
                      }`}
                      onClick={() => {
                        setAmount(preset);
                        setCustomAmount("");
                      }}
                      data-testid={`button-amount-${preset}`}
                    >
                      {preset} جنيه
                    </Button>
                  ))}
                </div>

                <div className="relative">
                  <Label htmlFor="customAmount">أو أدخل مبلغ مخصص</Label>
                  <Input
                    id="customAmount"
                    type="number"
                    min="10"
                    placeholder="أدخل المبلغ بالجنيه"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setAmount("");
                    }}
                    className="mt-1"
                    data-testid="input-custom-amount"
                  />
                </div>

                {effectiveAmount > 0 && (
                  <div className="glass-card rounded-lg p-3 text-center">
                    <p className="text-sm text-muted-foreground">المبلغ المحدد</p>
                    <p className="text-2xl font-black text-primary" data-testid="text-selected-amount">
                      {effectiveAmount} جنيه
                    </p>
                  </div>
                )}

                <Button
                  className="w-full glow-soft"
                  disabled={!effectiveAmount || effectiveAmount < 10}
                  onClick={() => setStep(2)}
                  data-testid="button-next-step1"
                >
                  التالي
                  <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-bold mb-4">طريقة الدفع</h2>

                <div className="space-y-3">
                  <Label>اختر طريقة الدفع *</Label>
                  <div className="grid gap-3">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`glass-card rounded-lg p-3 sm:p-4 cursor-pointer transition-all border-2 ${
                          selectedPaymentMethod === method.id
                            ? "border-primary glow-soft"
                            : "border-transparent hover:border-primary/30"
                        }`}
                        onClick={() => setSelectedPaymentMethod(method.id)}
                        data-testid={`button-payment-method-${method.id}`}
                      >
                        <div className="flex items-center gap-3">
                          {method.icon && (
                            <span className="text-2xl">{method.icon}</span>
                          )}
                          <div className="flex-1">
                            <p className="font-bold">{method.nameAr}</p>
                            <p className="text-sm text-muted-foreground">{method.name}</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedPaymentMethod === method.id
                                ? "border-primary bg-primary"
                                : "border-muted-foreground"
                            }`}
                          >
                            {selectedPaymentMethod === method.id && (
                              <CheckCircle className="w-3 h-3 text-primary-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedMethod && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card-gold rounded-lg p-4 space-y-3"
                  >
                    <p className="text-sm font-bold">حوّل المبلغ إلى الرقم التالي:</p>
                    <div className="flex items-center justify-between gap-2 bg-black/20 rounded-lg p-3">
                      <p className="text-lg font-mono font-bold" dir="ltr" data-testid="text-account-number">
                        {selectedMethod.accountNumber}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(selectedMethod.accountNumber)}
                        data-testid="button-copy-account"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      المبلغ المطلوب: <span className="font-bold text-primary">{effectiveAmount} جنيه</span>
                    </p>
                  </motion.div>
                )}

                <div>
                  <Label htmlFor="senderPhone">رقم المرسل *</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="senderPhone"
                      type="tel"
                      placeholder="01xxxxxxxxx"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      className="pr-10"
                      data-testid="input-sender-phone"
                    />
                  </div>
                </div>

                <div>
                  <Label>إثبات الدفع (صورة التحويل)</Label>
                  <div className="mt-1">
                    {paymentProofUrl ? (
                      <div className="glass-card rounded-lg p-3 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-green-400 flex-1">تم رفع إثبات الدفع</span>
                        <label className="cursor-pointer">
                          <span className="text-xs text-primary hover:underline">تغيير</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                            data-testid="input-change-proof"
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <div className="glass-card rounded-lg p-4 text-center border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors">
                          {isUploading ? (
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                          ) : (
                            <>
                              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">اضغط لرفع صورة إثبات الدفع</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                          data-testid="input-payment-proof"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                    data-testid="button-back-step2"
                  >
                    <ArrowRight className="w-4 h-4 ml-2" />
                    رجوع
                  </Button>
                  <Button
                    className="flex-1 glow-soft"
                    disabled={!selectedPaymentMethod || !senderPhone.trim()}
                    onClick={() => setStep(3)}
                    data-testid="button-next-step2"
                  >
                    التالي
                    <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && !success && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-bold mb-4">تأكيد الإيداع</h2>

                <div className="space-y-3">
                  <div className="glass-card rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">المبلغ</span>
                      <span className="font-bold text-primary text-lg" data-testid="text-confirm-amount">{effectiveAmount} جنيه</span>
                    </div>
                    <div className="border-t border-muted/20" />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">طريقة الدفع</span>
                      <span className="font-bold" data-testid="text-confirm-method">{selectedMethod?.nameAr}</span>
                    </div>
                    <div className="border-t border-muted/20" />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">رقم الحساب</span>
                      <span className="font-mono text-sm" dir="ltr" data-testid="text-confirm-account">{selectedMethod?.accountNumber}</span>
                    </div>
                    <div className="border-t border-muted/20" />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">رقم المرسل</span>
                      <span className="font-mono" dir="ltr" data-testid="text-confirm-phone">{senderPhone}</span>
                    </div>
                    <div className="border-t border-muted/20" />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">إثبات الدفع</span>
                      <span data-testid="text-confirm-proof">
                        {paymentProofUrl ? (
                          <span className="text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" /> مرفق
                          </span>
                        ) : (
                          <span className="text-muted-foreground">غير مرفق</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(2)}
                    data-testid="button-back-step3"
                  >
                    <ArrowRight className="w-4 h-4 ml-2" />
                    رجوع
                  </Button>
                  <Button
                    className="flex-1 glow-soft"
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    data-testid="button-submit-deposit"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "تأكيد الإيداع"
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