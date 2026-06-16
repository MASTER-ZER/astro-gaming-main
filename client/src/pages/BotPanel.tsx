import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Send, Plus, Trash2, Lock, Eye, EyeOff, Loader2, LogOut, Bot, Save, BarChart2, Users, ShoppingBag, Zap, Moon, Search, DollarSign, Ban, CheckCircle, XCircle } from "lucide-react";
import type { Setting } from "@shared/schema";

function BotLogin({ onLogin }: { onLogin: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password) return;
    setLoading(true);
    try {
      const res = await fetch("/api/bot/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        toast({ title: "خطأ", description: "كلمة السر غلط", variant: "destructive" });
        return;
      }
      const data = await res.json();
      localStorage.setItem("bot_token", data.token);
      onLogin();
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0F] p-4" dir="rtl">
      <Card className="w-full max-w-sm p-6 space-y-4 bg-[#12121A] border-primary/20">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Bot Panel</h1>
          <p className="text-xs text-muted-foreground mt-1">أدخل كلمة السر للوصول</p>
        </div>
        <div>
          <Label className="text-sm">كلمة السر</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="أدخل كلمة السر"
              dir="ltr"
              data-testid="input-bot-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Button onClick={handleLogin} disabled={loading} className="w-full" data-testid="button-bot-login">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 ml-2" />}
          دخول
        </Button>
      </Card>
    </div>
  );
}

function BotSettings() {
  const { toast } = useToast();

  const { data: settings = [], isLoading } = useQuery<Setting[]>({
    queryKey: ["/api/bot/settings"],
    queryFn: async () => {
      const token = localStorage.getItem("bot_token");
      const res = await fetch("/api/bot/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const getVal = (key: string) => settings.find(s => s.key === key)?.value || "";

  const [chatIds, setChatIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  if (!loaded && settings.length > 0) {
    try {
      const parsed = JSON.parse(getVal("telegram_chat_ids") || "[]");
      setChatIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setChatIds([]);
    }
    setLoaded(true);
  }

  const [isSaving, setIsSaving] = useState(false);

  const saveChatIds = async (ids: string[]) => {
    setChatIds(ids);
    setIsSaving(true);
    try {
      const token = localStorage.getItem("bot_token");
      await fetch("/api/bot/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: "telegram_chat_ids", value: JSON.stringify(ids) }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bot/settings"] });
      toast({ title: "تم الحفظ", description: "تم حفظ أيديات التليجرام بنجاح" });
    } catch {
      toast({ title: "خطأ", description: "فشل الحفظ", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const testTelegram = async () => {
    try {
      toast({ title: "جاري اختبار البوت..." });
      const token = localStorage.getItem("bot_token");
      const res = await fetch("/api/bot/test-telegram", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.botOk && data.sendResults?.some((r: any) => r.ok)) {
        toast({ title: "تم الإرسال بنجاح!", description: `البوت @${data.botName} - تم الإرسال لـ ${data.sendResults.filter((r: any) => r.ok).length}/${data.chatIds.length} شات` });
      } else if (data.botOk) {
        const errors = data.sendResults?.map((r: any) => `${r.chatId}: ${r.error}`).join(", ");
        toast({ title: "البوت شغال لكن فشل الإرسال", description: errors, variant: "destructive" });
      } else {
        toast({ title: "البوت مش شغال!", description: "تأكد من توكن البوت", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("bot_token");
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0B0F]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const features = [
    { icon: BarChart2, color: "text-cyan-400", bg: "bg-cyan-400/10", title: "إحصائيات اليوم والأسبوع", desc: "عدد الطلبات، الإيرادات، مقارنة بالأسبوع الماضي" },
    { icon: ShoppingBag, color: "text-green-400", bg: "bg-green-400/10", title: "الطلبات المعلقة وآخر الطلبات", desc: "عرض فوري لكل الطلبات المعلقة والأخيرة" },
    { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-400/10", title: "قبول / رفض الطلبات بزر", desc: "كل طلب جديد فيه زر قبول ورفض مباشر" },
    { icon: Users, color: "text-yellow-400", bg: "bg-yellow-400/10", title: "أفضل العملاء إنفاقاً", desc: "ترتيب أعلى 10 عملاء بالمبلغ الإجمالي المنفق" },
    { icon: Zap, color: "text-orange-400", bg: "bg-orange-400/10", title: "أكثر الألعاب مبيعاً", desc: "ترتيب الألعاب حسب عدد الطلبات والإيرادات" },
    { icon: Search, color: "text-blue-400", bg: "bg-blue-400/10", title: "بحث عن عميل", desc: "ابحث برقم الهاتف أو اسم المستخدم وشوف كل بياناته" },
    { icon: DollarSign, color: "text-primary", bg: "bg-primary/10", title: "إضافة رصيد من البوت", desc: "أضف رصيد لأي عميل مباشرة بدون فتح الموقع" },
    { icon: Ban, color: "text-red-400", bg: "bg-red-400/10", title: "حظر / رفع حظر عميل", desc: "تحكم في حسابات العملاء من البوت مباشرة" },
    { icon: Moon, color: "text-purple-400", bg: "bg-purple-400/10", title: "تقرير يومي تلقائي", desc: "كل يوم الساعة 11 مساءً يوصلك ملخص كامل لليوم" },
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0F] p-4 md:p-8" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Bot Panel</h1>
              <p className="text-xs text-muted-foreground">إعدادات بوت التليجرام الذكي</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-bot-logout">
            <LogOut className="w-4 h-4 ml-1 text-red-500" />
            <span className="text-red-500">خروج</span>
          </Button>
        </div>

        {/* Features Grid */}
        <Card className="p-4 md:p-6 bg-[#12121A] border-primary/20">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-primary">
            <Zap className="w-4 h-4" />
            ميزات البوت الذكي
          </h2>
          <div className="grid grid-cols-1 gap-2.5">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${f.bg}`}>
                  <f.icon className={`w-4 h-4 ${f.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/15">
            <p className="text-xs text-primary font-semibold mb-1">🚀 طريقة الاستخدام</p>
            <p className="text-xs text-muted-foreground">افتح البوت في تيليجرام واضغط <span className="font-mono bg-white/10 px-1 rounded">/start</span> أو <span className="font-mono bg-white/10 px-1 rounded">menu</span> لتظهر القائمة بالأزرار</p>
          </div>
        </Card>

        {/* Chat IDs Settings */}
        <Card className="p-4 md:p-6 bg-[#12121A] border-primary/20">
          <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            إعداد الشاتات
          </h2>
          <div className="space-y-3 md:space-y-4">
            <p className="text-xs text-muted-foreground">أضف أيديات الشاتات اللي هيوصلها الإشعارات والتقارير</p>
            <div className="space-y-2">
              <Label className="text-sm">أيديات شاتات التليجرام</Label>
              {chatIds.map((id, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={id}
                    onChange={(e) => {
                      const updated = [...chatIds];
                      updated[index] = e.target.value;
                      setChatIds(updated);
                    }}
                    placeholder="مثال: -5187534348"
                    dir="ltr"
                    data-testid={`input-bot-chat-id-${index}`}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const updated = chatIds.filter((_, i) => i !== index);
                      saveChatIds(updated);
                    }}
                    data-testid={`button-bot-remove-chat-id-${index}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setChatIds([...chatIds, ""])}
                  data-testid="button-bot-add-chat-id"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  إضافة شات
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveChatIds(chatIds)}
                  disabled={isSaving}
                  data-testid="button-bot-save"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />}
                  حفظ
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">للجروبات الأي دي يبدأ بعلامة سالب (مثال: -5187534348)</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              data-testid="button-bot-test-telegram"
              onClick={testTelegram}
            >
              <Send className="w-4 h-4 ml-1" />
              اختبار البوت
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function BotPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useState(() => {
    const token = localStorage.getItem("bot_token");
    if (!token) {
      setIsAuthenticated(false);
      return;
    }
    fetch("/api/bot/verify", {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      setIsAuthenticated(res.ok);
      if (!res.ok) localStorage.removeItem("bot_token");
    }).catch(() => {
      setIsAuthenticated(false);
      localStorage.removeItem("bot_token");
    });
  });

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0B0F]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <BotLogin onLogin={() => setIsAuthenticated(true)} />;
  }

  return <BotSettings />;
}
