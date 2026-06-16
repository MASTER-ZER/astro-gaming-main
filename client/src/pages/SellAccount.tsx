import { ParticleBackground } from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { useCustomer } from "@/hooks/useCustomer";
import { useLocation } from "wouter";
import { CustomerLoginModal } from "@/components/CustomerLoginModal";
import { Loader2, Upload, X, TrendingUp, Shield, Clock, CheckCircle, Image, Smartphone } from "lucide-react";

const LINKING_METHODS = [
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "X (Twitter سابقاً)" },
  { value: "discord", label: "Discord" },
  { value: "line", label: "Line" },
  { value: "vk", label: "VK (Vkontakte)" },
  { value: "phone", label: "رقم الهاتف" },
  { value: "tiktok", label: "TikTok" },
  { value: "google", label: "Google" },
  { value: "gamecenter", label: "Game Center (آيفون/آيباد)" },
  { value: "apple", label: "Apple ID" },
  { value: "samsung", label: "Samsung Account" },
  { value: "huawei", label: "Huawei ID" },
  { value: "other", label: "أخرى" },
];

const GAMES_LIST = [
  "ببجي (PUBG Mobile)",
  "فري فاير (Free Fire)",
  "روبلكس (Roblox)",
  "بيس (eFootball/PES)",
  "فيفا (FC/FIFA)",
  "بلود سترايك (Blood Strike)",
  "فورتنايت (Fortnite)",
  "كلاش أوف كلانس (Clash of Clans)",
  "كول أوف ديوتي موبايل (COD Mobile)",
  "ليج أوف ليجندز (League of Legends)",
  "جينشين إمباكت (Genshin Impact)",
  "أبكس ليجندز (Apex Legends)",
  "موبايل ليجندز (Mobile Legends)",
  "فالورانت (Valorant)",
  "كلاش رويال (Clash Royale)",
  "أخرى",
];

export default function SellAccount() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { isLoggedIn, customer } = useCustomer();
  const [showLogin, setShowLogin] = useState(false);
  const [form, setForm] = useState({
    sellerName: (customer as any)?.name || "",
    sellerPhone: (customer as any)?.phone || "",
    gameType: "",
    customGameType: "",
    title: "",
    description: "",
    requestedPrice: "",
    linkingMethod: "",
    customLinkingMethod: "",
    accountCredentials: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/account-sell-requests", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/sell-requests"] });
      setSubmitted(true);
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: "فشل إرسال الطلب، يرجى المحاولة مجدداً", variant: "destructive" });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (images.length + files.length > 5) {
      toast({ title: "خطأ", description: "الحد الأقصى 5 صور", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadResponse.ok) throw new Error("فشل رفع الصورة");
        const { objectPath } = await uploadResponse.json();
        setImages(prev => [...prev, objectPath]);
      }
    } catch (error) {
      toast({ title: "خطأ", description: "فشل رفع الصورة، يرجى المحاولة مجدداً", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (!isLoggedIn) { setShowLogin(true); return; }
    if (!form.sellerName.trim()) return toast({ title: "خطأ", description: "يرجى إدخال اسمك", variant: "destructive" });
    if (!form.sellerPhone.trim()) return toast({ title: "خطأ", description: "يرجى إدخال رقم الواتساب", variant: "destructive" });
    if (!form.gameType) return toast({ title: "خطأ", description: "يرجى اختيار اللعبة", variant: "destructive" });
    if (form.gameType === "أخرى" && !form.customGameType.trim()) return toast({ title: "خطأ", description: "يرجى كتابة اسم اللعبة", variant: "destructive" });
    if (!form.title.trim()) return toast({ title: "خطأ", description: "يرجى إدخال عنوان الحساب", variant: "destructive" });
    if (!form.description.trim()) return toast({ title: "خطأ", description: "يرجى إدخال وصف الحساب", variant: "destructive" });
    if (!form.requestedPrice || parseInt(form.requestedPrice) <= 0) return toast({ title: "خطأ", description: "يرجى إدخال سعر صحيح", variant: "destructive" });
    if (!form.linkingMethod) return toast({ title: "خطأ", description: "يرجى اختيار نوع الربط", variant: "destructive" });
    if (form.linkingMethod === "other" && !form.customLinkingMethod.trim()) return toast({ title: "خطأ", description: "يرجى كتابة نوع الربط", variant: "destructive" });
    if (images.length === 0) return toast({ title: "خطأ", description: "يرجى رفع صورة واحدة على الأقل", variant: "destructive" });

    const price = parseInt(form.requestedPrice);
    const finalGameType = form.gameType === "أخرى" ? form.customGameType.trim() : form.gameType;

    submitMutation.mutate({
      sellerName: form.sellerName,
      sellerPhone: form.sellerPhone,
      gameType: finalGameType,
      title: form.title,
      description: form.description,
      linkingMethod: form.linkingMethod === "other" ? form.customLinkingMethod.trim() : form.linkingMethod,
      requestedPrice: price,
      images,
      accountCredentials: form.accountCredentials.trim() || null,
    });
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <ParticleBackground />
        <motion.div
          className="relative z-10 text-center max-w-sm mx-auto px-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="glass-ultra rounded-3xl p-8 md:p-10">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-primary/20 flex items-center justify-center glow-soft">
              <Shield className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-black mb-3 text-gradient-gold">يجب تسجيل الدخول أولاً</h2>
            <p className="text-muted-foreground text-sm mb-6">
              لبيع حسابك على ASTRO يجب أن يكون لديك حساب مسجّل
            </p>
            <Button
              className="glow-gold w-full"
              onClick={() => setShowLogin(true)}
              data-testid="button-login-to-sell"
            >
              تسجيل الدخول / إنشاء حساب
            </Button>
          </div>
          <CustomerLoginModal open={showLogin} onOpenChange={setShowLogin} />
        </motion.div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        <ParticleBackground />
        <motion.div
          className="relative z-10 text-center max-w-md mx-auto px-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="glass-ultra rounded-3xl p-8 md:p-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center"
            >
              <CheckCircle className="w-10 h-10 text-green-500" />
            </motion.div>
            <h2 className="text-2xl font-black mb-3 text-gradient-gold">تم إرسال طلبك!</h2>
            <p className="text-muted-foreground mb-6">
              سيتم مراجعة طلبك من قِبل الإدارة وسنتواصل معك قريباً على واتساب لإتمام العملية.
            </p>
            <div className="space-y-3">
              <Button
                className="w-full bg-primary text-black font-bold rounded-xl"
                onClick={() => setLocation("/account-tracking")}
                data-testid="button-track-sell"
              >
                تتبع طلب البيع
              </Button>
              <Button onClick={() => setSubmitted(false)} variant="outline" className="w-full" data-testid="button-sell-again">
                بيع حساب آخر
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const price = parseInt(form.requestedPrice) || 0;
  const sellerReceives = price > 0 ? Math.floor(price * 0.98) : 0;
  const buyerPays = price > 0 ? Math.ceil(price * 1.03) : 0;

  return (
    <div className="min-h-screen relative" dir="rtl">
      <ParticleBackground />
      <div className="relative z-10 py-8 md:py-12 container mx-auto px-4 max-w-2xl">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-cyan-600 flex items-center justify-center shadow-lg glow-gold">
            <TrendingUp className="w-8 h-8 md:w-10 md:h-10 text-black" />
          </div>
          <h1 className="text-2xl md:text-4xl font-black mb-3">
            <span className="text-gradient-gold-animated">بيع حسابك</span>
          </h1>
          <p className="text-muted-foreground text-base">أضف حسابك للمتجر وانتظر المشترين</p>
        </motion.div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Shield, title: "آمن 100%", desc: "مراجعة كل طلب" },
            { icon: Clock, title: "سريع", desc: "رد خلال 24 ساعة" },
            { icon: TrendingUp, title: "عمولة 2%", desc: "فقط على البائع" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-ultra rounded-xl p-3 text-center"
            >
              <item.icon className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xs font-bold">{item.title}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-ultra p-6 space-y-5">
            <h2 className="text-lg font-bold border-b border-primary/20 pb-3">معلومات البائع</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block">اسمك *</Label>
                <Input
                  placeholder="أدخل اسمك"
                  value={form.sellerName}
                  onChange={e => setForm({ ...form, sellerName: e.target.value })}
                  data-testid="input-seller-name"
                />
              </div>
              <div>
                <Label className="mb-1.5 block">رقم واتساب *</Label>
                <div className="relative">
                  <Smartphone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="01xxxxxxxxx"
                    value={form.sellerPhone}
                    onChange={e => setForm({ ...form, sellerPhone: e.target.value })}
                    className="pr-9"
                    data-testid="input-seller-phone"
                  />
                </div>
              </div>
            </div>

            <h2 className="text-lg font-bold border-b border-primary/20 pb-3 pt-2">تفاصيل الحساب</h2>

            <div>
              <Label className="mb-1.5 block">اللعبة *</Label>
              <Select value={form.gameType} onValueChange={v => setForm({ ...form, gameType: v, customGameType: "" })}>
                <SelectTrigger data-testid="select-game">
                  <SelectValue placeholder="اختر اللعبة" />
                </SelectTrigger>
                <SelectContent>
                  {GAMES_LIST.map(game => (
                    <SelectItem key={game} value={game}>
                      {game}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.gameType === "أخرى" && (
                <div className="mt-2">
                  <Input
                    value={form.customGameType}
                    onChange={e => setForm({ ...form, customGameType: e.target.value })}
                    placeholder="اكتب اسم اللعبة هنا..."
                    data-testid="input-custom-game-type"
                  />
                </div>
              )}
            </div>

            <div>
              <Label className="mb-1.5 block">نوع الربط (كيف الحساب مربوط؟) *</Label>
              <Select value={form.linkingMethod} onValueChange={v => setForm({ ...form, linkingMethod: v })}>
                <SelectTrigger data-testid="select-linking-method">
                  <SelectValue placeholder="اختر نوع الربط" />
                </SelectTrigger>
                <SelectContent>
                  {LINKING_METHODS.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.linkingMethod === "other" && (
                <div className="mt-2">
                  <Input
                    value={form.customLinkingMethod}
                    onChange={e => setForm({ ...form, customLinkingMethod: e.target.value })}
                    placeholder="اكتب نوع الربط هنا (مثال: Line، Kakao...)"
                    data-testid="input-custom-linking-method"
                  />
                </div>
              )}
            </div>

            <div>
              <Label className="mb-1.5 block">عنوان الحساب *</Label>
              <Input
                placeholder="مثال: حساب PUBG ماستر مستوى 80"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                data-testid="input-account-title"
              />
            </div>

            <div>
              <Label className="mb-1.5 block">وصف الحساب (تفاصيل كاملة) *</Label>
              <Textarea
                placeholder="اكتب كل تفاصيل الحساب: المستوى، الرتبة، الأسلحة، الشخصيات، وأي معلومات مهمة..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={5}
                data-testid="input-account-description"
              />
            </div>

            <div>
              <Label className="mb-1.5 block flex items-center gap-2">
                <span>بيانات دخول الحساب</span>
                <span className="text-[10px] font-normal bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded">سرية – للإدارة فقط</span>
              </Label>
              <Textarea
                placeholder={"مثال:\nالإيميل: example@gmail.com\nكلمة السر: Abc@1234\nرقم الهاتف المرتبط: 01xxxxxxxxx\nأي معلومات إضافية..."}
                value={form.accountCredentials}
                onChange={e => setForm({ ...form, accountCredentials: e.target.value })}
                rows={4}
                className="font-mono text-sm"
                data-testid="input-account-credentials"
              />
              <p className="text-[10px] text-muted-foreground/60 mt-1">هذه البيانات مشفرة ولن تُكشف إلا للمشتري بعد اكتمال الصفقة</p>
            </div>

            <div>
              <Label className="mb-1.5 block">السعر المطلوب (جنيه) *</Label>
              <Input
                type="number"
                placeholder="0"
                min={1}
                value={form.requestedPrice}
                onChange={e => setForm({ ...form, requestedPrice: e.target.value })}
                data-testid="input-account-price"
              />
              {price > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 p-3 rounded-lg bg-primary/10 text-sm space-y-1"
                >
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">سيصلك:</span>
                    <span className="font-bold text-green-500">{sellerReceives} ج</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted-foreground">سعر المشتري:</span>
                    <span className="font-bold text-primary">{buyerPays} ج</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">عمولة المنصة 5% — 2% على البائع • 3% على المشتري</p>
                </motion.div>
              )}
            </div>

            <div>
              <Label className="mb-1.5 block">صور الحساب (1-5 صور) *</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square">
                    <img src={img} alt={`صورة ${index + 1}`} className="w-full h-full rounded-lg object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -left-2 h-5 w-5 rounded-full"
                      onClick={() => setImages(prev => prev.filter((_, i) => i !== index))}
                      data-testid={`button-remove-image-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {images.length < 5 && (
                  <div
                    className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-image"
                  >
                    {uploading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Image className="w-5 h-5 text-muted-foreground mb-1" />
                        <span className="text-[10px] text-muted-foreground text-center">رفع صورة</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
                data-testid="input-images"
              />
              <p className="text-xs text-muted-foreground mt-1">ارفع صور واضحة للحساب (الحد الأقصى 5 صور)</p>
            </div>

            <div className="pt-2">
              <Button
                className="w-full glow-gold-mega"
                size="lg"
                onClick={handleSubmit}
                disabled={submitMutation.isPending || uploading}
                data-testid="button-submit-sell-request"
              >
                {submitMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                <Upload className="w-4 h-4 ml-2" />
                إرسال طلب البيع
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                بعد الإرسال سيراجع فريقنا طلبك ويتواصل معك خلال 24 ساعة
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
      <CustomerLoginModal open={showLogin} onOpenChange={setShowLogin} />
    </div>
  );
}
