import { Link } from "wouter";
import { useCustomer, customerFetch } from "@/hooks/useCustomer";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ParticleBackground } from "@/components/ParticleBackground";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Package, Mail, ChevronLeft, Loader2, Bell, BellOff, Send, X, CheckCheck, User, Edit2, Save, Headphones, Star, TrendingUp, DollarSign, Clock, CheckCircle, XCircle, ShoppingBag, Zap, Gamepad2, Banknote, BadgeCheck, CircleDot, Unlock, Gift, Copy, Users, Check } from "lucide-react";
import { calculateLevelInfo, RANKS } from "@/lib/levelSystem";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function CustomerDashboard() {
  const { customer, isLoggedIn, isLoading } = useCustomer();
  const { toast } = useToast();
  const push = usePushNotifications();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [trackingTab, setTrackingTab] = useState<"buyer" | "seller">("buyer");
  const [supportTitle, setSupportTitle] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [referralInput, setReferralInput] = useState("");
  const [referralCopied, setReferralCopied] = useState(false);
  const prevInboxCount = useRef<number>(0);

  const { data: walletData } = useQuery({
    queryKey: ["/api/customer/wallet"],
    enabled: isLoggedIn,
    queryFn: async () => {
      const res = await customerFetch("/api/customer/wallet");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["/api/customer/orders"],
    enabled: isLoggedIn,
    queryFn: async () => {
      const res = await customerFetch("/api/customer/orders");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: accountOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/customer/account-orders"],
    enabled: isLoggedIn,
    queryFn: async () => {
      const res = await customerFetch("/api/customer/account-orders");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { data: inbox = [], refetch: refetchInbox } = useQuery({
    queryKey: ["/api/customer/inbox"],
    enabled: isLoggedIn,
    refetchInterval: 15000,
    queryFn: async () => {
      const res = await customerFetch("/api/customer/inbox");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: walletRequests = [] } = useQuery({
    queryKey: ["/api/wallet/requests"],
    enabled: isLoggedIn,
    queryFn: async () => {
      const res = await customerFetch("/api/wallet/requests");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: loyaltyData } = useQuery({
    queryKey: ["/api/customer/loyalty"],
    enabled: isLoggedIn,
    queryFn: async () => {
      const res = await customerFetch("/api/customer/loyalty");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: sellRequests = [] } = useQuery({
    queryKey: ["/api/customer/sell-requests"],
    enabled: isLoggedIn,
    queryFn: async () => {
      const res = await customerFetch("/api/customer/sell-requests");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: referralData, refetch: refetchReferral } = useQuery({
    queryKey: ["/api/customer/referral"],
    enabled: isLoggedIn,
    queryFn: async () => {
      const res = await customerFetch("/api/customer/referral");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const applyReferralMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await customerFetch("/api/customer/referral/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "فشل تطبيق الكود");
      return d;
    },
    onSuccess: (data) => {
      toast({ title: "🎉 تم!", description: data.message || "حصلت على 2 نقطة مكافأة" });
      setReferralInput("");
      refetchReferral();
      queryClient.invalidateQueries({ queryKey: ["/api/customer/loyalty"] });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const res = await customerFetch("/api/customer/loyalty/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "فشل السحب"); }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "✅ تم بنجاح!", description: `تم تحويل 100 نقطة إلى 15 جنيه في محفظتك` });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/loyalty"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/wallet"] });
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message || "فشل عملية السحب", variant: "destructive" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (msgId: string) => {
      const res = await customerFetch(`/api/customer/inbox/${msgId}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      refetchInbox();
      queryClient.invalidateQueries({ queryKey: ["/api/customer/inbox/unread-count"] });
    },
  });

  const sendSupportMutation = useMutation({
    mutationFn: async ({ title, message }: { title: string; message: string }) => {
      const res = await customerFetch("/api/customer/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      setSupportTitle("");
      setSupportMessage("");
      setShowSupportForm(false);
      toast({ title: "تم الإرسال", description: "تم إرسال رسالتك للدعم بنجاح" });
      refetchInbox();
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل إرسال الرسالة", variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name?: string; username?: string; password?: string }) => {
      const res = await customerFetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل التحديث");
      return json;
    },
    onSuccess: () => {
      setEditingProfile(false);
      setEditPassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/customer/me"] });
      toast({ title: "تم التحديث", description: "تم تحديث بياناتك بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!isLoggedIn) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const unreadCount = inbox.filter((m: any) => !m.isRead).length;
    if (unreadCount > prevInboxCount.current && prevInboxCount.current !== 0) {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("ASTRO 🎮", {
          body: `لديك ${unreadCount} رسالة جديدة`,
          icon: "/favicon.png",
        });
      }
    }
    prevInboxCount.current = unreadCount;
  }, [inbox]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center glass-card rounded-xl p-8">
          <h2 className="text-xl font-bold mb-2">يجب تسجيل الدخول</h2>
          <p className="text-muted-foreground mb-4">سجل دخولك أو أنشئ حساب جديد للوصول لهذه الصفحة</p>
          <Link href="/">
            <Button data-testid="button-go-home">العودة للرئيسية</Button>
          </Link>
        </div>
      </div>
    );
  }

  const completedOrders = orders.filter((o: any) => o.status === "completed").length;
  const levelInfo = calculateLevelInfo(completedOrders);
  const nextRank = RANKS.find(r => r.level === levelInfo.level + 1);
  const ordersToNextLevel = nextRank ? nextRank.minOrders - completedOrders : 0;

  const unreadMessages = inbox.filter((m: any) => !m.isRead);
  const recentOrders = orders.slice(0, 5);
  const recentTransactions = walletData?.transactions?.slice(0, 5) || [];

  const sellPending = (sellRequests as any[]).filter((r) => r.status === "pending").length;
  const sellApproved = (sellRequests as any[]).filter((r) => r.status === "approved" && !r.isSold).length;
  const sellRejected = (sellRequests as any[]).filter((r) => r.status === "rejected").length;
  const sellSold = (sellRequests as any[]).filter((r) => r.isSold).length;
  const totalEarnings = (sellRequests as any[]).filter((r) => r.isSold).reduce((s: number, r: any) => s + Math.floor(r.requestedPrice * 0.96), 0);
  const pendingEarnings = (sellRequests as any[]).filter((r) => r.status === "approved" && !r.isSold).reduce((s: number, r: any) => s + Math.floor(r.requestedPrice * 0.96), 0);

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "قيد المراجعة", color: "bg-amber-500/20 text-amber-400" },
    processing: { label: "جاري التنفيذ", color: "bg-blue-500/20 text-blue-400" },
    completed: { label: "مكتمل", color: "bg-green-500/20 text-green-400" },
    cancelled: { label: "ملغي", color: "bg-red-500/20 text-red-400" },
    approved: { label: "مقبول", color: "bg-green-500/20 text-green-400" },
    rejected: { label: "مرفوض", color: "bg-red-500/20 text-red-400" },
  };

  const handleOpenMessage = (msg: any) => {
    setSelectedMessage(msg);
    if (!msg.isRead) {
      markReadMutation.mutate(msg.id);
    }
  };

  return (
    <div className="min-h-screen relative" dir="rtl">
      <ParticleBackground />
      <div className="relative z-10 py-6 sm:py-8 container mx-auto px-3 sm:px-4 max-w-4xl">

        {/* ── Premium Profile Header ── */}
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <div className="relative glass-card rounded-3xl p-5 overflow-hidden border border-white/10">
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 20% 50%, ${levelInfo.color}, transparent 65%)` }}
            />
            <div className="relative flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                  style={{ background: `${levelInfo.color}22`, border: `2px solid ${levelInfo.color}55`, boxShadow: `0 0 20px ${levelInfo.color}30` }}
                  data-testid="avatar-level-icon"
                >
                  {levelInfo.icon}
                </div>
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm"
                  style={{ background: levelInfo.color, boxShadow: `0 0 8px ${levelInfo.color}80` }}
                >
                  {levelInfo.level}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground/60 mb-0.5">مرحباً بك،</p>
                <h1 className="text-xl sm:text-2xl font-black text-white truncate" data-testid="text-customer-name">
                  {customer?.name || customer?.username}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${levelInfo.color}22`, color: levelInfo.color, border: `1px solid ${levelInfo.color}40` }}
                    data-testid="badge-rank-label"
                  >
                    {levelInfo.icon} {levelInfo.rank}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">{levelInfo.xp} XP</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-white/15 hover:border-white/30 gap-1.5 text-xs flex-shrink-0 text-white/70"
                onClick={() => {
                  setEditingProfile(!editingProfile);
                  setEditName(customer?.name || "");
                  setEditUsername(customer?.username || "");
                  setEditPassword("");
                }}
                data-testid="button-edit-profile"
              >
                <Edit2 className="w-3 h-3" />
                {editingProfile ? "إلغاء" : "تعديل"}
              </Button>
            </div>
            {/* Quick Actions Row */}
            <div className="flex gap-2 mt-4 relative">
              <Link href="/games" className="flex-1">
                <div className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/18 transition-colors cursor-pointer" data-testid="quickaction-topup">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-bold text-primary">شحن سريع</span>
                </div>
              </Link>
              <Link href="/wallet" className="flex-1">
                <div className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/18 transition-colors cursor-pointer" data-testid="quickaction-wallet">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400">{customer?.balance || 0} ج</span>
                </div>
              </Link>
              <Link href="/my-orders" className="flex-1">
                <div className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/18 transition-colors cursor-pointer" data-testid="quickaction-orders">
                  <Package className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-bold text-blue-400">طلباتي</span>
                </div>
              </Link>
              <div
                className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/18 transition-colors cursor-pointer"
                onClick={() => document.getElementById("inbox-section")?.scrollIntoView({ behavior: "smooth" })}
                data-testid="quickaction-inbox"
              >
                <div className="relative">
                  <Mail className="w-4 h-4 text-amber-400" />
                  {unreadMessages.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white font-black">
                      {unreadMessages.length}
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-amber-400">الرسائل</span>
              </div>
            </div>

          </div>
        </motion.div>

        <AnimatePresence>
          {editingProfile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="glass-card rounded-2xl p-4 border border-primary/15">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-primary">
                  <User className="w-4 h-4" />
                  تعديل البيانات الشخصية
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">الاسم</label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="اسمك"
                      className="text-sm glass-input"
                      data-testid="input-edit-name"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">اسم المستخدم</label>
                    <Input
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="اسم المستخدم"
                      className="text-sm glass-input"
                      dir="ltr"
                      data-testid="input-edit-username"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">كلمة مرور جديدة (اختياري)</label>
                    <Input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="اتركه فارغاً للإبقاء على الحالي"
                      className="text-sm glass-input"
                      dir="ltr"
                      data-testid="input-edit-password"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 text-sm glow-soft"
                  onClick={() => updateProfileMutation.mutate({ name: editName, username: editUsername, password: editPassword || undefined })}
                  disabled={updateProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  حفظ التغييرات
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Push Notifications Card */}
        {push.isSupported && push.permission !== "denied" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
            <div className="glass-card rounded-2xl p-3.5 border border-white/8 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${push.isSubscribed ? "bg-primary/20" : "bg-white/8"}`}>
                  {push.isSubscribed ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-semibold">{push.isSubscribed ? "الإشعارات مفعّلة" : "فعّل الإشعارات"}</p>
                  <p className="text-xs text-muted-foreground">{push.isSubscribed ? "ستصلك إشعارات الطلبات والرصيد" : "اعرف أول بأول عن طلباتك ورصيدك"}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={push.isSubscribed ? "outline" : "default"}
                className={`text-xs flex-shrink-0 ${push.isSubscribed ? "border-white/15 text-muted-foreground" : "glow-soft"}`}
                disabled={push.isLoading}
                onClick={async () => {
                  if (push.isSubscribed) {
                    await push.unsubscribe();
                    toast({ title: "تم إيقاف الإشعارات" });
                  } else {
                    const ok = await push.subscribe();
                    if (ok) toast({ title: "✅ تم تفعيل الإشعارات!", description: "ستصلك إشعارات فورية" });
                    else if (push.permission === "denied") toast({ title: "الإشعارات محظورة", description: "افتح إعدادات المتصفح لتفعيلها", variant: "destructive" });
                  }
                }}
                data-testid="button-push-toggle"
              >
                {push.isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : push.isSubscribed ? "إيقاف" : "تفعيل"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* XP / Level Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-4"
        >
          <div className="glass-card rounded-2xl p-4 border border-white/10 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ background: `radial-gradient(circle at 15% 50%, ${levelInfo.color} 0%, transparent 60%)` }}
            />
            <div className="relative flex items-center gap-4">
              <div className="flex-shrink-0">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black border-2 shadow-lg"
                  style={{ borderColor: levelInfo.color, background: `${levelInfo.color}22` }}
                  data-testid="badge-level-icon"
                >
                  {levelInfo.icon}
                </motion.div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-black text-lg" style={{ color: levelInfo.color }} data-testid="text-rank-name">
                    {levelInfo.rank}
                  </span>
                  <Badge className="text-[10px] px-1.5 py-0 bg-white/10 border-0 text-white" data-testid="badge-level-number">
                    المستوى {levelInfo.level}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground" data-testid="text-xp-value">{levelInfo.xp} XP</span>
                  {nextRank ? (
                    <span className="text-xs text-muted-foreground">
                      {ordersToNextLevel} طلب للمستوى {nextRank.rank}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-400 font-bold">المستوى الأعلى 🏆</span>
                  )}
                </div>
                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${levelInfo.color}88, ${levelInfo.color})` }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${levelInfo.progress}%` }}
                    transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
                    data-testid="progress-xp"
                  />
                </div>
                {nextRank && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{levelInfo.rank} ({levelInfo.xpForCurrentLevel} XP)</span>
                    <span className="text-[10px]" style={{ color: nextRank.color }}>{nextRank.icon} {nextRank.rank} ({nextRank.minOrders * 100} XP)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Link href="/wallet">
              <div className="glass-card-gold rounded-xl p-4 cursor-pointer hover:scale-[1.02] transition-transform" data-testid="card-wallet">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">رصيد المحفظة</p>
                    <p className="text-xl font-black text-primary">{customer?.balance || 0} <span className="text-sm font-normal">جنيه</span></p>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Link href="/my-orders">
              <div className="glass-card rounded-xl p-4 cursor-pointer hover:scale-[1.02] transition-transform" data-testid="card-orders">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">عدد الطلبات</p>
                    <p className="text-xl font-black">{orders.length}</p>
                    <p className="text-[10px] text-green-400">{completedOrders} مكتملة</p>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div
              className="glass-card rounded-xl p-4 cursor-pointer hover:scale-[1.02] transition-transform"
              data-testid="card-messages"
              onClick={() => document.getElementById("inbox-section")?.scrollIntoView({ behavior: "smooth" })}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center relative">
                  <Mail className="w-5 h-5 text-green-400" />
                  {unreadMessages.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                      {unreadMessages.length}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">رسائل جديدة</p>
                  <p className="text-xl font-black">{unreadMessages.length}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>


        {/* Inbox Section */}
        <motion.div
          id="inbox-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              صندوق الرسائل
              {unreadMessages.length > 0 && (
                <Badge className="bg-red-500 text-white border-0 text-[10px] px-1.5" data-testid="badge-unread-count">
                  {unreadMessages.length}
                </Badge>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <Link href="/support-chat">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                  data-testid="button-live-support-chat"
                >
                  <Headphones className="w-3 h-3" />
                  دردشة مباشرة
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1 border-primary/20"
                onClick={() => setShowSupportForm(!showSupportForm)}
                data-testid="button-contact-support"
              >
                <Send className="w-3 h-3" />
                رسالة للدعم
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {showSupportForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 overflow-hidden"
              >
                <div className="glass-card rounded-xl p-4 border border-primary/20 space-y-3">
                  <p className="text-sm font-bold">إرسال رسالة للدعم</p>
                  <input
                    className="w-full rounded-lg px-3 py-2 text-sm glass-input text-white placeholder:text-white/30 outline-none"
                    placeholder="عنوان الرسالة"
                    value={supportTitle}
                    onChange={(e) => setSupportTitle(e.target.value)}
                    data-testid="input-support-title"
                  />
                  <textarea
                    className="w-full rounded-lg px-3 py-2 text-sm glass-input text-white placeholder:text-white/30 outline-none resize-none min-h-[80px]"
                    placeholder="اكتب رسالتك هنا..."
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    data-testid="input-support-message"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={sendSupportMutation.isPending || !supportTitle || !supportMessage}
                      onClick={() => sendSupportMutation.mutate({ title: supportTitle, message: supportMessage })}
                      data-testid="button-send-support"
                    >
                      {sendSupportMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : <Send className="w-3 h-3 ml-1" />}
                      إرسال
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowSupportForm(false)} data-testid="button-cancel-support">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {inbox.length === 0 ? (
            <div className="glass-card rounded-xl p-6 text-center text-muted-foreground text-sm" data-testid="text-no-messages">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
              لا توجد رسائل بعد
            </div>
          ) : (
            <div className="space-y-2">
              {inbox.map((msg: any) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`glass-card rounded-lg p-3 cursor-pointer transition-all hover:scale-[1.01] ${!msg.isRead ? "border-r-2 border-primary" : ""}`}
                  onClick={() => handleOpenMessage(msg)}
                  data-testid={`message-item-${msg.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {!msg.isRead && <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 animate-pulse" />}
                        <p className={`text-sm font-bold truncate ${!msg.isRead ? "text-white" : "text-muted-foreground"}`}>
                          {msg.title}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{msg.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <p className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleDateString("ar-EG")}</p>
                      {msg.isRead && <CheckCheck className="w-3 h-3 text-green-400" />}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Wallet Requests */}
        {walletRequests.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold">طلبات الإيداع</h3>
              <Link href="/wallet">
                <Button variant="ghost" size="sm" className="text-xs gap-1" data-testid="link-all-deposits">
                  عرض الكل <ChevronLeft className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {walletRequests.slice(0, 3).map((req: any) => {
                const st = statusMap[req.status] || statusMap.pending;
                return (
                  <div key={req.id} className="glass-card rounded-lg p-3 flex items-center justify-between" data-testid={`deposit-${req.id}`}>
                    <div>
                      <p className="font-bold text-sm">{req.amount} جنيه</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(req.createdAt).toLocaleDateString("ar-EG")}</p>
                    </div>
                    <Badge className={`${st.color} border-0 text-xs`}>{st.label}</Badge>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Loyalty Points */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h3 className="text-base font-bold mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" /> نقاط المكافآت</h3>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground">نقاطك الحالية</p>
                <p className="text-3xl font-black text-yellow-400">{loyaltyData?.points || customer?.loyaltyPoints || 0}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">كل طلب مكتمل = 10 نقاط</p>
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground mb-1">لسحب النقاط</p>
                <p className="text-sm font-bold">100 نقطة = <span className="text-primary">15 جنيه</span></p>
                <Button
                  onClick={() => redeemMutation.mutate()}
                  disabled={redeemMutation.isPending || (loyaltyData?.points || customer?.loyaltyPoints || 0) < 100}
                  size="sm"
                  className="mt-2 text-xs gap-1"
                  data-testid="button-redeem-points"
                >
                  {redeemMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wallet className="w-3 h-3" />}
                  تحويل للمحفظة
                </Button>
              </div>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(((loyaltyData?.points || customer?.loyaltyPoints || 0) / 100) * 100, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">{loyaltyData?.points || customer?.loyaltyPoints || 0}/100 نقطة لسحب 15 جنيه</p>
          </div>
        </motion.div>

        {/* Referral Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h3 className="text-base font-bold mb-3 flex items-center gap-2"><Gift className="w-4 h-4 text-emerald-400" /> نظام الإحالة</h3>
          <div className="glass-card rounded-xl p-4 space-y-4">
            {/* My Code */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">كودك الخاص للإحالة — شاركه وأحصل على نقطتين لكل صديق</p>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 flex items-center justify-center h-11 rounded-xl font-black text-lg tracking-widest"
                  style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}
                  data-testid="text-referral-code"
                >
                  {referralData?.referralCode || (customer as any)?.referralCode || "—"}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11 px-3 border-emerald-500/30 hover:bg-emerald-500/10"
                  onClick={() => {
                    const code = referralData?.referralCode || (customer as any)?.referralCode;
                    if (code) {
                      navigator.clipboard.writeText(code);
                      setReferralCopied(true);
                      setTimeout(() => setReferralCopied(false), 2000);
                    }
                  }}
                  data-testid="button-copy-referral"
                >
                  {referralCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>أحلت: <span className="text-white font-bold">{referralData?.referredCount || 0}</span> أصدقاء</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Star className="w-3.5 h-3.5 text-yellow-400" />
                  <span>ربحت: <span className="text-yellow-400 font-bold">{referralData?.totalPointsEarned || 0}</span> نقطة</span>
                </div>
              </div>
            </div>
            {/* Apply Code */}
            {!referralData?.referredBy && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">عندك كود إحالة؟ أدخله هنا وأحصل على نقطتين</p>
                <div className="flex gap-2">
                  <input
                    value={referralInput}
                    onChange={e => setReferralInput(e.target.value.toUpperCase())}
                    placeholder="أدخل كود الإحالة"
                    maxLength={8}
                    className="flex-1 h-10 px-3 rounded-xl text-sm bg-white/5 border border-white/10 outline-none focus:border-emerald-500/60 text-white placeholder:text-white/25"
                    data-testid="input-apply-referral"
                  />
                  <Button
                    size="sm"
                    className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={applyReferralMutation.isPending || !referralInput.trim()}
                    onClick={() => applyReferralMutation.mutate(referralInput)}
                    data-testid="button-apply-referral"
                  >
                    {applyReferralMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "تطبيق"}
                  </Button>
                </div>
              </div>
            )}
            {referralData?.referredBy && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2">
                <Check className="w-3.5 h-3.5 flex-shrink-0" />
                <span>أنت محال من كود: <strong>{referralData.referredBy}</strong></span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold">آخر الطلبات</h3>
              <Link href="/my-orders">
                <Button variant="ghost" size="sm" className="text-xs gap-1" data-testid="link-all-orders">
                  عرض الكل <ChevronLeft className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {recentOrders.map((order: any) => {
                const st = statusMap[order.status] || statusMap.pending;
                return (
                  <div key={order.id} className="glass-card rounded-lg p-3 flex items-center justify-between" data-testid={`order-${order.id}`}>
                    <div>
                      <p className="font-bold text-sm">{order.game?.nameAr || "طلب"} - {order.package?.name || ""}</p>
                      <p className="text-[10px] text-muted-foreground">{order.orderNumber} • {new Date(order.createdAt).toLocaleDateString("ar-EG")}</p>
                    </div>
                    <div className="text-left">
                      <Badge className={`${st.color} border-0 text-xs`}>{st.label}</Badge>
                      <p className="text-xs font-bold mt-1">{order.totalAmount} جنيه</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Unified Account Marketplace Tracking ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">

            {/* Section header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-primary" />
                سوق الحسابات
              </h3>
              <div className="flex items-center gap-2">
                <Link href="/account-tracking">
                  <button className="text-xs text-primary/70 hover:text-primary transition-colors flex items-center gap-1 px-2 py-1 rounded-lg border border-primary/20 hover:border-primary/40" data-testid="link-account-tracking-full">
                    <ChevronLeft className="w-3 h-3" />
                    عرض الكل
                  </button>
                </Link>
                <Link href="/sell-account">
                  <button className="text-xs text-white/40 hover:text-white transition-colors flex items-center gap-1" data-testid="link-sell-account">
                    <ShoppingBag className="w-3 h-3" />
                    بيع حساب
                  </button>
                </Link>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1.5 p-1 rounded-xl bg-white/4 border border-white/6 mb-4">
              <button
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${trackingTab === "buyer" ? "bg-primary text-black shadow" : "text-white/50 hover:text-white"}`}
                onClick={() => setTrackingTab("buyer")}
                data-testid="profile-tab-buyer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                مشتري
                {accountOrders.length > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${trackingTab === "buyer" ? "bg-black/20 text-black" : "bg-white/10 text-white/60"}`}>
                    {accountOrders.length}
                  </span>
                )}
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${trackingTab === "seller" ? "bg-emerald-600 text-white shadow" : "text-white/50 hover:text-white"}`}
                onClick={() => setTrackingTab("seller")}
                data-testid="profile-tab-seller"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                بائع
                {(sellRequests as any[]).length > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${trackingTab === "seller" ? "bg-white/20" : "bg-white/10 text-white/60"}`}>
                    {(sellRequests as any[]).length}
                  </span>
                )}
              </button>
            </div>

            <AnimatePresence mode="wait">

              {/* ── Buyer Tab ── */}
              {trackingTab === "buyer" && (
                <motion.div key="buyer-tab" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                  {accountOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      لم تشترِ أي حساب بعد
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {accountOrders.slice(0, 5).map((order: any) => {
                        const BUYER_STEPS = ["payment_pending","payment_review","payment_confirmed","credentials_sent","completed"];
                        const BUYER_COLORS: Record<string,string> = {
                          payment_pending:"#f59e0b", payment_review:"#f97316",
                          payment_confirmed:"#10b981", credentials_sent:"#0ea5e9",
                          completed:"#22c55e", cancelled:"#ef4444",
                        };
                        const BUYER_LABELS: Record<string,string> = {
                          payment_pending:"انتظار الدفع", payment_review:"مراجعة الدفع",
                          payment_confirmed:"تأكيد الدفع", credentials_sent:"تم الإرسال",
                          completed:"مكتمل", cancelled:"ملغي",
                        };
                        const st = order.accountOrderStatus || "payment_pending";
                        const currentIdx = BUYER_STEPS.indexOf(st);
                        const isCancelled = st === "cancelled";
                        const stColor = BUYER_COLORS[st] || "#6366f1";
                        return (
                          <Link key={order.id} href={`/account-order/${order.accountId}`}>
                            <div className="relative glass-card rounded-xl overflow-hidden hover:bg-white/5 transition-colors cursor-pointer" data-testid={`profile-account-order-${order.id}`}>
                              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${stColor}80, transparent)` }} />
                              <div className="p-3">
                                <div className="flex items-start justify-between mb-2.5">
                                  <div>
                                    <p className="font-bold text-sm leading-tight">{order.account?.title || "حساب"}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(order.createdAt).toLocaleDateString("ar-EG", { month:"short", day:"numeric" })}</p>
                                  </div>
                                  <div className="text-right">
                                    <Badge className="border-0 text-[9px] mb-1" style={{ background:`${stColor}20`, color:stColor }}>
                                      {BUYER_LABELS[st] || st}
                                    </Badge>
                                    <p className="text-xs font-black" style={{ color:"#fbbf24" }}>{order.totalPrice} ج</p>
                                  </div>
                                </div>
                                {/* Mini Progress Bar */}
                                {!isCancelled ? (
                                  <div className="flex items-center gap-1">
                                    {BUYER_STEPS.map((key, i) => {
                                      const done = i <= currentIdx;
                                      const curr = i === currentIdx;
                                      const STEP_ICONS: Record<string, any> = {
                                        payment_pending: CircleDot, payment_review: Clock,
                                        payment_confirmed: BadgeCheck, credentials_sent: Unlock, completed: CheckCircle,
                                      };
                                      const IIcon = STEP_ICONS[key] || CircleDot;
                                      const c = BUYER_COLORS[key];
                                      return (
                                        <div key={key} className="flex items-center flex-1">
                                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                                            style={{ background: done ? c : "rgba(255,255,255,0.06)", border:`1.5px solid ${done ? c : "rgba(255,255,255,0.1)"}`, boxShadow: curr ? `0 0 8px ${c}60` : "none" }}>
                                            <IIcon className="w-2.5 h-2.5" style={{ color: done ? "#fff" : "rgba(255,255,255,0.2)" }} />
                                          </div>
                                          {i < BUYER_STEPS.length - 1 && (
                                            <div className="h-0.5 flex-1 mx-0.5 rounded-full" style={{ background: done && i < currentIdx ? c : "rgba(255,255,255,0.07)" }} />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-[10px] text-red-400">
                                    <XCircle className="w-3 h-3" />
                                    تم إلغاء الطلب
                                  </div>
                                )}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                      {accountOrders.length > 5 && (
                        <p className="text-xs text-muted-foreground/50 text-center">+{accountOrders.length - 5} طلبات أخرى</p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Seller Tab ── */}
              {trackingTab === "seller" && (
                <motion.div key="seller-tab" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  {(sellRequests as any[]).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      لم تبع أي حساب بعد
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 mb-1">
                        {[
                          { label: "أرباح محققة", val: totalEarnings + " ج", color: "#10b981" },
                          { label: "قيد البيع", val: sellApproved.toString(), color: "#3b82f6" },
                          { label: "تم البيع", val: sellSold.toString(), color: "#a855f7" },
                        ].map(s => (
                          <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background:`${s.color}12`, border:`1px solid ${s.color}25` }}>
                            <p className="text-sm font-black" style={{ color: s.color }}>{s.val}</p>
                            <p className="text-[9px] text-white/40">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {(sellRequests as any[]).slice(0, 5).map((req: any) => {
                        const SELLER_STEPS_CONF = [
                          { key:"submitted",  label:"تقديم الطلب",     color:"#6366f1", Icon: Package },
                          { key:"approved",   label:"مقبول ومنشور",    color:"#3b82f6", Icon: BadgeCheck },
                          { key:"sold",       label:"تم البيع",        color:"#a855f7", Icon: ShoppingBag },
                          { key:"payout",     label:"تم الصرف",        color:"#22c55e", Icon: Banknote },
                        ];
                        const sellerStep = req.status === "rejected" ? -1
                          : !req.isSold ? (req.status === "approved" ? 1 : 0)
                          : req.payoutStatus === "payout_sent" || req.sellerPaid ? 3
                          : 2;
                        const isRejected = req.status === "rejected";
                        const sellerEarns = req.sellerPrice || Math.floor((req.requestedPrice || req.price || 0) * 0.96);
                        const PAYOUT_LABELS: Record<string,string> = {
                          pending_confirmation:"بانتظار تأكيد المشتري",
                          ready_for_payout:"جاهز للسحب",
                          info_received:"تم استلام الرقم",
                          payout_sent:"تم التحويل ✅",
                        };
                        return (
                          <div key={req.id} className="relative glass-card rounded-xl overflow-hidden" data-testid={`profile-sell-req-${req.id}`}>
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                            <div className="p-3">
                              <div className="flex items-start justify-between mb-2.5">
                                <div>
                                  <p className="font-bold text-sm leading-tight">{req.accountTitle || req.title}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{req.gameType || req.game || ""}</p>
                                </div>
                                <div className="text-right">
                                  {isRejected ? (
                                    <Badge className="border-0 text-[9px] bg-red-500/20 text-red-400">مرفوض</Badge>
                                  ) : (
                                    <>
                                      <p className="text-[9px] text-white/40">مستحقاتك</p>
                                      <p className="text-xs font-black text-emerald-400">{sellerEarns} ج</p>
                                    </>
                                  )}
                                </div>
                              </div>

                              {isRejected ? (
                                <div className="flex items-center gap-1.5 text-[10px] text-red-400/70">
                                  <XCircle className="w-3 h-3" />
                                  {req.adminNote || "تم رفض الطلب"}
                                </div>
                              ) : (
                                <>
                                  {/* Seller progress bar */}
                                  <div className="flex items-center gap-1 mb-2">
                                    {SELLER_STEPS_CONF.map((step, i) => {
                                      const done = i <= sellerStep;
                                      const curr = i === sellerStep && sellerStep < 3;
                                      const SIcon = step.Icon;
                                      return (
                                        <div key={step.key} className="flex items-center flex-1">
                                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                                            style={{ background: done ? step.color : "rgba(255,255,255,0.06)", border:`1.5px solid ${done ? step.color : "rgba(255,255,255,0.1)"}`, boxShadow: curr ? `0 0 8px ${step.color}60` : "none" }}>
                                            <SIcon className="w-2.5 h-2.5" style={{ color: done ? "#fff" : "rgba(255,255,255,0.2)" }} />
                                          </div>
                                          {i < SELLER_STEPS_CONF.length - 1 && (
                                            <div className="h-0.5 flex-1 mx-0.5 rounded-full" style={{ background: done && i < sellerStep ? step.color : "rgba(255,255,255,0.07)" }} />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Current status label */}
                                  <div className="text-[10px]" style={{ color: SELLER_STEPS_CONF[Math.max(0, sellerStep)]?.color || "#6366f1" }}>
                                    {sellerStep === 0 && "⏳ طلبك قيد المراجعة"}
                                    {sellerStep === 1 && "✅ حسابك منشور وينتظر مشترياً"}
                                    {sellerStep === 2 && req.payoutStatus && PAYOUT_LABELS[req.payoutStatus] ? `💰 ${PAYOUT_LABELS[req.payoutStatus]}` : sellerStep === 2 ? "🎉 تم البيع! جارٍ تحضير مستحقاتك" : ""}
                                    {sellerStep === 3 && "✅ تم تحويل مستحقاتك بنجاح"}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {(sellRequests as any[]).length > 5 && (
                        <p className="text-xs text-muted-foreground/50 text-center">+{(sellRequests as any[]).length - 5} طلبات أخرى</p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
        </motion.div>

        {/* Wallet Transactions */}
        {recentTransactions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h3 className="text-base font-bold mb-3">آخر حركات المحفظة</h3>
            <div className="space-y-2">
              {recentTransactions.map((tx: any) => (
                <div key={tx.id} className="glass-card rounded-lg p-3 flex items-center justify-between" data-testid={`tx-${tx.id}`}>
                  <div>
                    <p className="text-sm">{tx.description || (tx.type === "credit" ? "إيداع" : "سحب")}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString("ar-EG")}</p>
                  </div>
                  <p className={`font-bold text-sm ${tx.type === "credit" ? "text-green-400" : "text-red-400"}`}>
                    {tx.type === "credit" ? "+" : "-"}{tx.amount} جنيه
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Link href="/wallet">
            <Button variant="outline" className="w-full h-12 gap-2 border-primary/20" data-testid="button-deposit">
              <Wallet className="w-4 h-4" />
              إيداع رصيد
            </Button>
          </Link>
          <Link href="/games">
            <Button className="w-full h-12 gap-2 glow-soft" data-testid="button-shop">
              <Package className="w-4 h-4" />
              تسوق الآن
            </Button>
          </Link>
        </div>
      </div>

      {/* Message Detail Modal */}
      <AnimatePresence>
        {selectedMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedMessage(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              className="glass-card rounded-2xl p-5 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
              data-testid="modal-message-detail"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-bold text-base">{selectedMessage.title}</h3>
                <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0" onClick={() => setSelectedMessage(null)} data-testid="button-close-message">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{selectedMessage.message}</p>
              <p className="text-[11px] text-muted-foreground">{new Date(selectedMessage.createdAt).toLocaleString("ar-EG")}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
