import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Settings, Save, Loader2, Globe, Bell, CreditCard, Bot,
  Plus, Trash2, Lock, Eye, EyeOff, Send, Copy, Hash, Zap,
  CheckCircle2, XCircle, Wifi, WifiOff, Download, Upload,
  Instagram, Youtube, MessageCircle, RotateCcw,
} from "lucide-react";
import { SiWhatsapp, SiTiktok } from "react-icons/si";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Setting } from "@shared/schema";

function getAdminToken() { return localStorage.getItem("admin_token") || ""; }
function adminFetch(url: string, opts: RequestInit = {}) {
  return fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}`, ...(opts.headers || {}) },
  });
}

// ─── Reusable UI ──────────────────────────────────────────────────────────────
function SCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <h2 className="font-black text-white flex items-center gap-2 text-sm">{icon} {title}</h2>
      {children}
    </div>
  );
}
function SField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-white/40 font-medium">{label}</label>
      {children}
    </div>
  );
}
function SInput({ value, onChange, placeholder = "", dir = "rtl", type = "text", ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { dir?: string }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder} dir={dir}
      className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none transition-all"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
      {...rest}
    />
  );
}
function SToggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {desc && <p className="text-xs text-white/35 mt-0.5">{desc}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ─── Main Settings ────────────────────────────────────────────────────────────
export default function AdminSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({
    site_name: "ASTRO Gaming",
    site_description: "منصة الألعاب العربية الأولى",
    welcome_message: "مرحباً بكم في ASTRO",
    support_hours: "متاح 24/7",
    whatsapp_number: "201553389396",
    instagram_link: "https://www.instagram.com/astro_mostafa?igsh=cjFhMjVyM2NyM2Fr",
    tiktok_link: "https://www.tiktok.com/@astro__freefire?_r=1&_t=ZS-94jfH4cyk2W",
    youtube_link: "https://youtube.com/@astro_1_freefire?si=iKO50bV_qOSTlLcL",
    whatsapp_channel: "https://whatsapp.com/channel/0029Vainyau5Ui2YMW0Pqg36",
    maintenance_mode: "false",
    enable_notifications: "true",
    notification_sound: "true",
    auto_refresh_orders: "true",
    refresh_interval: "15",
    enable_payment_proof: "true",
    enable_order_tracking: "true",
    enable_auto_complete: "false",
    currency_symbol: "ج.م",
    min_order_amount: "0",
    max_order_amount: "50000",
    order_expiry_hours: "24",
  });

  const { data: dbSettings = [], isLoading } = useQuery<Setting[]>({ queryKey: ["/api/settings"] });

  useEffect(() => {
    if (dbSettings.length > 0) {
      const map = dbSettings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {} as Record<string, string>);
      setSettings(prev => ({ ...prev, ...map }));
    }
  }, [dbSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all(Object.entries(settings).map(([key, value]) =>
        adminFetch("/api/settings", { method: "POST", body: JSON.stringify({ key, value }) })
      ));
      await queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "✅ تم الحفظ" });
    } catch {
      toast({ title: "خطأ في الحفظ", variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const toggle = (key: string) => setSettings(prev => ({ ...prev, [key]: prev[key] === "true" ? "false" : "true" }));
  const set = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="space-y-5 pb-10" dir="rtl">
      <div>
        <h1 className="text-xl font-black text-white mb-1">⚙️ الإعدادات</h1>
        <p className="text-sm text-white/35">إدارة إعدادات الموقع</p>
      </div>

      {/* ── General ── */}
      <SCard title="الإعدادات العامة" icon={<Globe className="w-4 h-4 text-primary" />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SField label="اسم الموقع">
            <SInput value={settings.site_name} onChange={e => set("site_name", e.target.value)} data-testid="input-site-name" />
          </SField>
          <SField label="وصف الموقع">
            <SInput value={settings.site_description} onChange={e => set("site_description", e.target.value)} data-testid="input-site-description" />
          </SField>
          <SField label="رسالة الترحيب">
            <SInput value={settings.welcome_message} onChange={e => set("welcome_message", e.target.value)} />
          </SField>
          <SField label="ساعات الدعم">
            <SInput value={settings.support_hours} onChange={e => set("support_hours", e.target.value)} />
          </SField>
        </div>
        <SToggle label="وضع الصيانة" desc="إيقاف الموقع مؤقتاً" checked={settings.maintenance_mode === "true"} onChange={() => toggle("maintenance_mode")} />
      </SCard>

      {/* ── Social Links ── */}
      <SCard title="روابط التواصل" icon={<MessageCircle className="w-4 h-4 text-green-400" />}>
        <div className="grid grid-cols-1 gap-3">
          <SField label="رقم الواتساب (للدعم الفني)">
            <div className="flex items-center gap-2">
              <SiWhatsapp className="w-5 h-5 text-green-400 shrink-0" />
              <SInput value={settings.whatsapp_number} onChange={e => set("whatsapp_number", e.target.value)} placeholder="201xxxxxxxxx" dir="ltr" data-testid="input-whatsapp" />
            </div>
          </SField>
          <SField label="إنستجرام">
            <div className="flex items-center gap-2">
              <Instagram className="w-5 h-5 text-pink-400 shrink-0" />
              <SInput value={settings.instagram_link} onChange={e => set("instagram_link", e.target.value)} placeholder="https://instagram.com/..." dir="ltr" data-testid="input-instagram" />
            </div>
          </SField>
          <SField label="تيك توك">
            <div className="flex items-center gap-2">
              <SiTiktok className="w-5 h-5 text-white/70 shrink-0" />
              <SInput value={settings.tiktok_link} onChange={e => set("tiktok_link", e.target.value)} placeholder="https://tiktok.com/@..." dir="ltr" data-testid="input-tiktok" />
            </div>
          </SField>
          <SField label="يوتيوب">
            <div className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-400 shrink-0" />
              <SInput value={settings.youtube_link} onChange={e => set("youtube_link", e.target.value)} placeholder="https://youtube.com/@..." dir="ltr" data-testid="input-youtube" />
            </div>
          </SField>
          <SField label="قناة الواتساب">
            <div className="flex items-center gap-2">
              <SiWhatsapp className="w-5 h-5 text-green-400 shrink-0" />
              <SInput value={settings.whatsapp_channel} onChange={e => set("whatsapp_channel", e.target.value)} placeholder="https://whatsapp.com/channel/..." dir="ltr" data-testid="input-whatsapp-channel" />
            </div>
          </SField>
        </div>
      </SCard>

      {/* ── Bot ── */}
      <BotSettingsCard />

      {/* ── Notifications ── */}
      <SCard title="الإشعارات" icon={<Bell className="w-4 h-4 text-yellow-400" />}>
        <SToggle label="تفعيل الإشعارات" desc="تلقي إشعارات عند وصول طلبات جديدة" checked={settings.enable_notifications === "true"} onChange={() => toggle("enable_notifications")} />
        <SToggle label="صوت الإشعارات" checked={settings.notification_sound === "true"} onChange={() => toggle("notification_sound")} />
        <SToggle label="التحديث التلقائي للطلبات" checked={settings.auto_refresh_orders === "true"} onChange={() => toggle("auto_refresh_orders")} />
        <SField label="فترة التحديث (ثواني)">
          <SInput type="number" value={settings.refresh_interval} onChange={e => set("refresh_interval", e.target.value)} />
        </SField>
      </SCard>

      {/* ── Orders ── */}
      <SCard title="إعدادات الطلبات" icon={<CreditCard className="w-4 h-4 text-blue-400" />}>
        <SToggle label="إلزام إثبات الدفع" desc="رفع سكرين شوت مع الطلب" checked={settings.enable_payment_proof === "true"} onChange={() => toggle("enable_payment_proof")} />
        <SToggle label="تتبع الطلبات" checked={settings.enable_order_tracking === "true"} onChange={() => toggle("enable_order_tracking")} />
        <SToggle label="إكمال الطلبات تلقائياً" checked={settings.enable_auto_complete === "true"} onChange={() => toggle("enable_auto_complete")} />
        <div className="grid grid-cols-3 gap-3">
          <SField label="رمز العملة"><SInput value={settings.currency_symbol} onChange={e => set("currency_symbol", e.target.value)} /></SField>
          <SField label="أقل مبلغ"><SInput type="number" value={settings.min_order_amount} onChange={e => set("min_order_amount", e.target.value)} /></SField>
          <SField label="أقصى مبلغ"><SInput type="number" value={settings.max_order_amount} onChange={e => set("max_order_amount", e.target.value)} /></SField>
        </div>
        <SField label="صلاحية الطلب (ساعات)">
          <SInput type="number" value={settings.order_expiry_hours} onChange={e => set("order_expiry_hours", e.target.value)} />
        </SField>
      </SCard>

      {/* ── Export/Import ── */}
      <ExportImportPricesCard />

      {/* ── Password ── */}
      <ChangePasswordCard />

      {/* ── Save Button ── */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        data-testid="button-save-settings"
        className="w-full h-12 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2"
        style={{
          background: isSaving ? "rgba(0,144,255,0.3)" : "linear-gradient(135deg, rgba(0,144,255,0.3), rgba(0,80,200,0.3))",
          border: "1px solid rgba(0,144,255,0.4)",
          color: "#0090ff",
        }}
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {isSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}
      </button>
    </div>
  );
}

// ─── Bot Settings ─────────────────────────────────────────────────────────────
interface BotSettingsData { hasToken: boolean; permanentIds: string[]; extraIds: string[]; }

const BOT_EVENTS = [
  "🛒 طلب جديد من عميل", "✅ تغيير حالة الطلب", "💳 طلب شحن محفظة جديد",
  "💰 قبول / رفض شحن المحفظة", "🏷 طلب بيع حساب جديد", "👤 تسجيل عميل جديد",
  "💬 رسالة دعم فني", "🎮 طلب شراء حساب جديد", "👑 طلب وساطة ملكية جديد",
];

function BotSettingsCard() {
  const { toast } = useToast();
  const [newId, setNewId] = useState("");
  const [testing, setTesting] = useState(false);

  const { data, isLoading, refetch } = useQuery<BotSettingsData>({
    queryKey: ["/api/admin/bot-settings"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/bot-settings");
      if (!res.ok) throw new Error("فشل");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (extraIds: string[]) => {
      const res = await adminFetch("/api/admin/bot-settings/extra-ids", { method: "PATCH", body: JSON.stringify({ extraIds }) });
      if (!res.ok) throw new Error((await res.json()).error || "فشل");
      return res.json();
    },
    onSuccess: () => { refetch(); toast({ title: "✅ تم الحفظ" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const addId = () => {
    const t = newId.trim();
    if (!t || data?.permanentIds.includes(t) || data?.extraIds.includes(t)) return;
    saveMutation.mutate([...(data?.extraIds || []), t]);
    setNewId("");
  };
  const removeId = (id: string) => saveMutation.mutate((data?.extraIds || []).filter(x => x !== id));
  const copyId = (id: string) => { navigator.clipboard.writeText(id); toast({ title: "✅ تم النسخ" }); };
  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await adminFetch("/api/admin/test-telegram", { method: "POST" });
      const r = await res.json();
      if (r.botOk) {
        const ok = r.sendResults?.filter((x: any) => x.ok).length || 0;
        toast({ title: `✅ البوت يعمل — ${r.botName || ""}`, description: `أُرسل لـ ${ok} محادثة` });
      } else {
        toast({ title: "❌ البوت لا يعمل", description: "تحقق من TELEGRAM_BOT_TOKEN", variant: "destructive" });
      }
    } catch { toast({ title: "خطأ في الاتصال", variant: "destructive" }); }
    finally { setTesting(false); }
  };

  return (
    <SCard title="البوت والإشعارات" icon={<Bot className="w-4 h-4 text-purple-400" />}>
      {/* Status */}
      {isLoading ? (
        <div className="text-white/30 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />جاري التحميل...</div>
      ) : (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${data?.hasToken ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
          {data?.hasToken ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" /> : <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
          <div className="flex-1">
            <p className="text-sm font-bold text-white">{data?.hasToken ? "البوت Token مفعّل ✅" : "Token غير موجود ❌"}</p>
            <p className="text-xs text-white/35">{data?.hasToken ? "البوت يعمل 24/7" : "أضف TELEGRAM_BOT_TOKEN في البيئة"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${data?.hasToken ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
              {data?.hasToken ? "يعمل" : "متوقف"}
            </span>
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
              data-testid="button-test-bot"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              اختبار
            </button>
          </div>
        </div>
      )}

      {/* Permanent IDs */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-white/40 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />Chat IDs الدائمة (ثابتة)</p>
        {(data?.permanentIds || ["6602868710", "-1003753528902"]).map(id => (
          <div key={id} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(0,144,255,0.05)", border: "1px solid rgba(0,144,255,0.15)" }}>
            <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
            <code className="text-sm font-mono text-primary flex-1">{id}</code>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">دائم</span>
            <button onClick={() => copyId(id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-all">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Extra IDs */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-white/40 flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />Chat IDs إضافية</p>
        {(data?.extraIds || []).map(id => (
          <div key={id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <code className="text-sm font-mono text-white/70 flex-1">{id}</code>
            <button onClick={() => copyId(id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 transition-all"><Copy className="w-3.5 h-3.5" /></button>
            <button onClick={() => removeId(id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 transition-all" data-testid={`button-remove-id-${id}`}><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        {(data?.extraIds || []).length === 0 && <p className="text-xs text-white/20 py-1">لا توجد IDs إضافية</p>}
        <div className="flex gap-2">
          <input
            value={newId} onChange={e => setNewId(e.target.value)} onKeyDown={e => e.key === "Enter" && addId()}
            placeholder="Chat ID (مثال: 123456789)" dir="ltr"
            className="flex-1 px-3 py-2 rounded-xl text-sm font-mono text-white outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            data-testid="input-new-chat-id"
          />
          <button onClick={addId} disabled={!newId.trim() || saveMutation.isPending}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
            style={{ background: "rgba(0,144,255,0.15)", border: "1px solid rgba(0,144,255,0.3)", color: "#0090ff" }}
            data-testid="button-add-chat-id">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Events list */}
      <div>
        <p className="text-xs font-bold text-white/40 mb-2">الأحداث التي يُرسل عنها إشعار</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {BOT_EVENTS.map((ev, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-xs text-white/50" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              {ev}
            </div>
          ))}
        </div>
      </div>
    </SCard>
  );
}

// ─── Export/Import Prices ─────────────────────────────────────────────────────
function ExportImportPricesCard() {
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/admin/export-prices", { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error();
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "astro-prices.json";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast({ title: "✅ تم التصدير" });
    } catch { toast({ title: "فشل التصدير", variant: "destructive" }); }
    finally { setExporting(false); }
  };

  const handleImport = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/admin/import-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error();
      toast({ title: "✅ تم الاستيراد" });
    } catch { toast({ title: "فشل الاستيراد", variant: "destructive" }); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const handleReset = async () => {
    if (!confirm("⚠️ هذا الإجراء سيحذف جميع الألعاب والباقات نهائياً. هل أنت متأكد؟")) return;
    setResetting(true);
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch("/api/admin/delete-all-games", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({ title: "✅ تم حذف جميع الألعاب" });
    } catch { toast({ title: "فشل الحذف", variant: "destructive" }); }
    finally { setResetting(false); }
  };

  return (
    <SCard title="تصدير / استيراد الأسعار" icon={<Download className="w-4 h-4 text-green-400" />}>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={onFileChange} />
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleExport} disabled={exporting}
          className="py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all disabled:opacity-50"
          style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399" }}
          data-testid="button-export-prices"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          تصدير
        </button>
        <button
          onClick={handleImport} disabled={importing}
          className="py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all disabled:opacity-50"
          style={{ background: "rgba(0,144,255,0.08)", border: "1px solid rgba(0,144,255,0.2)", color: "#0090ff" }}
          data-testid="button-import-prices"
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          استيراد
        </button>
        <button
          onClick={handleReset} disabled={resetting}
          className="py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition-all disabled:opacity-50"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}
          data-testid="button-reset-prices"
        >
          {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          حذف الكل
        </button>
      </div>
    </SCard>
  );
}

// ─── Change Password ──────────────────────────────────────────────────────────
function ChangePasswordCard() {
  const { toast } = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (form.next !== form.confirm) { toast({ title: "كلمة السر الجديدة غير متطابقة", variant: "destructive" }); return; }
    if (form.next.length < 6) { toast({ title: "كلمة السر أقل من 6 أحرف", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/change-password", { method: "POST", body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "فشل"); }
      toast({ title: "✅ تم تغيير كلمة السر" });
      setForm({ current: "", next: "", confirm: "" });
    } catch (e: any) { toast({ title: "خطأ", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <SCard title="تغيير كلمة السر" icon={<Lock className="w-4 h-4 text-red-400" />}>
      <div className="grid grid-cols-1 gap-3">
        {([
          { key: "current", label: "كلمة السر الحالية" },
          { key: "next", label: "كلمة السر الجديدة" },
          { key: "confirm", label: "تأكيد كلمة السر الجديدة" },
        ] as { key: keyof typeof form; label: string }[]).map(({ key, label }) => (
          <SField key={key} label={label}>
            <div className="relative">
              <input
                type={show[key] ? "text" : "password"}
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                dir="ltr"
                className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                data-testid={`input-${key}-password`}
              />
              <button
                type="button"
                onClick={() => setShow(p => ({ ...p, [key]: !p[key] }))}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {show[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </SField>
        ))}
      </div>
      <button
        onClick={handleChange}
        disabled={!form.current || !form.next || !form.confirm || loading}
        className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
        style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
        data-testid="button-change-password"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "تغيير كلمة السر"}
      </button>
    </SCard>
  );
}
