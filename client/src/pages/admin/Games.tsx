import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Game, Package as PackageType } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Edit, Trash2, Loader2, Upload, ImageIcon, Bot, Code2,
  Copy, Check, ChevronLeft, Gamepad2, Package as PkgIcon, Zap,
  ArrowUp, ArrowDown, X, Eye, EyeOff, RotateCcw, Sparkles,
  FileJson, Info, AlertCircle, Save, ToggleLeft, ToggleRight,
  Grid3x3, List, Search, Tag, DollarSign, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const s = {
  card: `rounded-2xl border border-white/8 bg-white/3`,
  input: `w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-primary/50 transition-colors`,
  label: `text-xs text-white/50 mb-1 block font-medium`,
  btn: `inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all`,
};

const LOGIN_TYPES = [
  { value: "id", label: "آي دي فقط", desc: "يشحن عن طريق ID اللاعب" },
  { value: "account", label: "حساب فقط", desc: "يشحن عن طريق اسم المستخدم وكلمة السر" },
  { value: "both", label: "الاثنين", desc: "ID أو حساب" },
];

const GRADIENTS = [
  "from-blue-600 to-blue-900",
  "from-violet-600 to-violet-900",
  "from-cyan-600 to-cyan-900",
  "from-orange-600 to-orange-900",
  "from-green-600 to-green-900",
  "from-red-600 to-red-900",
  "from-pink-600 to-pink-900",
  "from-yellow-600 to-yellow-900",
  "from-indigo-600 to-indigo-900",
  "from-teal-600 to-teal-900",
];

/* ─── AI JSON Instructions ─── */
const AI_PROMPT = `أنت مساعد متخصص في إنشاء قوائم أسعار الألعاب بتنسيق JSON. مهمتك هي تحويل قائمة الأسعار التي أعطيك إياها إلى JSON منظم بالتنسيق التالي بدقة:

{
  "packages": [
    {
      "name": "110 جوهرة",
      "amount": "110",
      "category": "شحن عن طريق الـ ID",
      "loginType": "id",
      "price": 14,
      "originalPrice": null
    }
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 الحقول المطلوبة — اشرح كل حقل:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

① "name" — اسم الباقة بالعربي مع وحدة القياس
   مثال: "110 جوهرة"، "325 شدة"، "باس أسبوعي"، "1000 UC"

② "amount" — الكمية كنص (رقم + وحدة أو نص وصفي)
   مثال: "110"، "325"، "باس أسبوعي"

③ "category" — تصنيف الباقة لتجميع الباقات المتشابهة معاً
   مثال: "شحن عن طريق الـ ID"، "شحن عن طريق الأكونت"، "باسات أسبوعية"، "عروض خاصة"

④ "loginType" — ⚠️ مهم جداً — نوع الشحن لهذه الباقة تحديداً
   القيم المسموحة فقط:
   • "id"      ← إذا هذه الباقة بتتشحن عن طريق آيدي اللاعب فقط
   • "account" ← إذا هذه الباقة بتتشحن عن طريق إيميل + باسورد الحساب فقط
   ⛔ لا يوجد قيمة "both" — كل باقة لازم تكون واحدة فقط: id أو account

⑤ "price" — السعر بالجنيه المصري (رقم صحيح بدون فواصل)
   مثال: 14، 55، 230

⑥ "originalPrice" — السعر الأصلي قبل الخصم (أو null إذا لا يوجد خصم)
   مثال: 20 أو null

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 قواعد تقسيم الباقات:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• إذا اللعبة كلها بتتشحن بـ ID فقط:
  ضع loginType: "id" على كل الباقات
  واستخدم category وصفي مثل: "شدات"، "جواهر"، "UC"

• إذا اللعبة كلها بتتشحن بحساب (أكونت) فقط:
  ضع loginType: "account" على كل الباقات

• إذا اللعبة فيها قسمين — بعض الباقات بـ ID وبعضها بأكونت:
  ⚡ هذه الحالة الأهم — قسّم الباقات كالتالي:
  - الباقات المشحونة بـ ID → loginType: "id" + category: "شحن عن طريق الـ ID"
  - الباقات المشحونة بأكونت → loginType: "account" + category: "شحن عن طريق الأكونت"
  ⛔ لا تخلط — كل باقة لها loginType واحد فقط

• رتب الباقات من الأرخص إلى الأغلى داخل كل category
• لا تضيف أي نص خارج الـ JSON — فقط JSON نقي

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 مثال عملي — لعبة فيها قسمين:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

الإدخال:
شحن بـ ID:
110 جوهرة = 14 جنيه
220 جوهرة = 28 جنيه

شحن بأكونت:
310 جوهرة = 45 جنيه (خصم من 55)
520 جوهرة = 78 جنيه

المخرجات المتوقعة:
{
  "packages": [
    { "name": "110 جوهرة", "amount": "110", "category": "شحن عن طريق الـ ID", "loginType": "id", "price": 14, "originalPrice": null },
    { "name": "220 جوهرة", "amount": "220", "category": "شحن عن طريق الـ ID", "loginType": "id", "price": 28, "originalPrice": null },
    { "name": "310 جوهرة", "amount": "310", "category": "شحن عن طريق الأكونت", "loginType": "account", "price": 45, "originalPrice": 55 },
    { "name": "520 جوهرة", "amount": "520", "category": "شحن عن طريق الأكونت", "loginType": "account", "price": 78, "originalPrice": null }
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 مثال — لعبة بـ ID فقط (مثل ببجي):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "packages": [
    { "name": "60 شدة", "amount": "60", "category": "شدات", "loginType": "id", "price": 55, "originalPrice": null },
    { "name": "325 شدة", "amount": "325", "category": "شدات", "loginType": "id", "price": 230, "originalPrice": null },
    { "name": "660 شدة", "amount": "660", "category": "شدات", "loginType": "id", "price": 445, "originalPrice": null }
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 مثال — لعبة بأكونت فقط (مثل فري فاير):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "packages": [
    { "name": "110 جوهرة", "amount": "110", "category": "جواهر", "loginType": "account", "price": 14, "originalPrice": null },
    { "name": "310 جوهرة", "amount": "310", "category": "جواهر", "loginType": "account", "price": 38, "originalPrice": null },
    { "name": "باس أسبوعي", "amount": "باس أسبوعي", "category": "باسات", "loginType": "account", "price": 25, "originalPrice": null }
  ]
}

⚠️ تذكير نهائي: loginType يكون دائماً "id" أو "account" فقط — لا توجد قيمة أخرى مقبولة.`;

/* ─── Upload helper ─── */
async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  const path = data.objectPath || data.url || "";
  return path.startsWith("/") ? path : `/${path}`;
}

/* ─── Inline Price Edit ─── */
function InlinePrice({ pkg, onSave }: { pkg: PackageType; onSave: (id: string, price: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(pkg.price));
  const save = () => {
    const n = parseInt(val);
    if (!isNaN(n) && n > 0) onSave(pkg.id, n);
    setEditing(false);
  };
  if (editing) return (
    <div className="flex items-center gap-1">
      <input
        type="number" value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        className="w-16 h-6 px-2 rounded-lg bg-white/10 border border-primary/40 text-white text-xs text-center outline-none"
        autoFocus
      />
      <button onClick={save} className="text-green-400"><Check className="w-3 h-3" /></button>
      <button onClick={() => setEditing(false)} className="text-red-400"><X className="w-3 h-3" /></button>
    </div>
  );
  return (
    <button
      onClick={() => { setVal(String(pkg.price)); setEditing(true); }}
      className="text-primary font-bold text-sm hover:underline cursor-pointer tabular-nums"
    >
      {pkg.price} ج
    </button>
  );
}

/* ─── Game Form Dialog ─── */
function GameFormDialog({
  open, onClose, game, onSave
}: {
  open: boolean; onClose: () => void; game: Game | null;
  onSave: (data: any) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "", nameAr: "", slug: "", icon: "🎮",
    image: "", color: "from-blue-600 to-blue-900",
    loginType: "id", isActive: true,
  });
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (game) {
        setForm({
          name: game.name, nameAr: game.nameAr, slug: game.slug,
          icon: game.icon || "🎮", image: game.image || "",
          color: game.color || "from-blue-600 to-blue-900",
          loginType: (game as any).loginType || "id", isActive: game.isActive ?? true,
        });
        setPreview(game.image || null);
      } else {
        setForm({ name: "", nameAr: "", slug: "", icon: "🎮", image: "", color: "from-blue-600 to-blue-900", loginType: "id", isActive: true });
        setPreview(null);
      }
    }
  }, [open, game]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setForm(f => ({ ...f, image: url }));
      setPreview(URL.createObjectURL(file));
      toast({ title: "تم رفع الصورة ✅" });
    } catch {
      toast({ title: "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setUploading(false);
      if (imgRef.current) imgRef.current.value = "";
    }
  };

  const autoSlug = (name: string) => name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const handleSubmit = () => {
    if (!form.nameAr.trim()) return toast({ title: "الاسم العربي مطلوب", variant: "destructive" });
    if (!form.slug.trim()) return toast({ title: "الـ Slug مطلوب", variant: "destructive" });
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-[#0a0d1a] border border-white/10 text-white" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Gamepad2 className="w-5 h-5 text-primary" />
            {game ? "تعديل اللعبة" : "إضافة لعبة جديدة"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Image upload */}
          <div className="md:col-span-2">
            <label className={s.label}>صورة اللعبة</label>
            <div
              onClick={() => imgRef.current?.click()}
              className="relative w-full h-40 rounded-2xl border-2 border-dashed border-white/15 hover:border-primary/50 transition-colors cursor-pointer overflow-hidden group"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              {preview || form.image ? (
                <>
                  <img
                    src={preview || form.image}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-white">
                      <Upload className="w-6 h-6" />
                      <span className="text-xs font-bold">تغيير الصورة</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-white/70">اختر صورة من جهازك</p>
                        <p className="text-xs text-white/30 mt-1">PNG, JPG, WEBP — يُفضل 600×800</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Arabic name */}
          <div>
            <label className={s.label}>اسم اللعبة (عربي) *</label>
            <input
              className={s.input} value={form.nameAr}
              onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))}
              placeholder="مثال: فري فاير"
            />
          </div>

          {/* English name */}
          <div>
            <label className={s.label}>اسم اللعبة (إنجليزي)</label>
            <input
              className={s.input} value={form.name} dir="ltr"
              onChange={e => {
                const n = e.target.value;
                setForm(f => ({ ...f, name: n, slug: game ? f.slug : autoSlug(n) }));
              }}
              placeholder="Free Fire"
            />
          </div>

          {/* Slug */}
          <div>
            <label className={s.label}>Slug (رابط اللعبة) *</label>
            <input
              className={s.input} value={form.slug} dir="ltr"
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="free-fire"
            />
          </div>

          {/* Icon */}
          <div>
            <label className={s.label}>رمز تعبيري (Emoji)</label>
            <input
              className={s.input} value={form.icon}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
              placeholder="🎮"
            />
          </div>

          {/* Login type */}
          <div>
            <label className={s.label}>نوع الشحن</label>
            <div className="grid grid-cols-3 gap-2">
              {LOGIN_TYPES.map(lt => (
                <button
                  key={lt.value}
                  onClick={() => setForm(f => ({ ...f, loginType: lt.value }))}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all text-right ${form.loginType === lt.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-white/10 bg-white/3 text-white/60 hover:border-white/20"}`}
                >
                  <div className="font-black mb-0.5">{lt.label}</div>
                  <div className="text-[10px] opacity-60 font-normal">{lt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Color gradient */}
          <div>
            <label className={s.label}>لون الخلفية (عند عدم وجود صورة)</label>
            <div className="flex flex-wrap gap-2">
              {GRADIENTS.map(g => (
                <button
                  key={g}
                  onClick={() => setForm(f => ({ ...f, color: g }))}
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${g} transition-all ${form.color === g ? "ring-2 ring-white scale-110" : "opacity-70 hover:opacity-100"}`}
                />
              ))}
            </div>
          </div>

          {/* Active */}
          <div className="md:col-span-2 flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8">
            <Switch
              checked={form.isActive}
              onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
            />
            <div>
              <p className="text-sm font-bold">{form.isActive ? "اللعبة مفعلة" : "اللعبة معطلة"}</p>
              <p className="text-xs text-white/40">{form.isActive ? "تظهر للزبائن" : "مخفية عن الزبائن"}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={handleSubmit}
            disabled={uploading}
            className="flex-1 bg-primary hover:bg-primary/80 h-11 font-bold"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
            {game ? "حفظ التعديلات" : "إضافة اللعبة"}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-white/15 h-11">
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── AI JSON Assistant ─── */
function AIJsonAssistant({ gameId, gameName, onImport }: {
  gameId: string; gameName: string; onImport: (pkgs: any[], mode: "upsert" | "replace") => void;
}) {
  const [jsonText, setJsonText] = useState("");
  const [parsed, setParsed] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"instructions" | "import">("instructions");
  const { toast } = useToast();

  const copyPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "تم نسخ التعليمات ✅", description: "الصقها في ChatGPT أو أي نموذج ذكاء اصطناعي" });
  };

  const parseJson = () => {
    setError(null);
    setParsed(null);
    try {
      let text = jsonText.trim();
      // Extract JSON if wrapped in markdown code blocks
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) text = match[1].trim();
      const data = JSON.parse(text);
      const pkgs = data.packages || data;
      if (!Array.isArray(pkgs)) throw new Error("يجب أن تكون الباقات مصفوفة");
      if (pkgs.length === 0) throw new Error("لا توجد باقات في الكود");
      setParsed(pkgs);
    } catch (e: any) {
      setError(e.message || "كود JSON غير صالح");
    }
  };

  const buildPkgs = () => {
    if (!parsed) return [];
    const validLoginTypes = ["id", "account"];
    return parsed.map((p, i) => ({
      name: p.name || p.amount || `باقة ${i + 1}`,
      amount: String(p.amount || ""),
      price: Number(p.price) || 0,
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      category: p.category || null,
      loginType: validLoginTypes.includes(p.loginType) ? p.loginType : null,
      sortOrder: i,
      isActive: true,
    }));
  };

  const handleImport = (mode: "upsert" | "replace") => {
    if (!parsed) return;
    onImport(buildPkgs(), mode);
    setJsonText("");
    setParsed(null);
    setTab("instructions");
  };

  return (
    <div className="rounded-2xl border border-primary/20 overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(0,144,255,0.04), rgba(0,60,150,0.06))" }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/8">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-black text-sm">مساعد الأسعار الذكي</p>
          <p className="text-[11px] text-white/40">اضغط زر نسخ التعليمات → الصق في ChatGPT → أرسل له الأسعار → الصق JSON هنا</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/8">
        {[
          { id: "instructions", label: "تعليمات النموذج", icon: Info },
          { id: "import", label: "استيراد JSON", icon: FileJson },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors border-b-2 ${tab === t.id
              ? "border-primary text-primary"
              : "border-transparent text-white/40 hover:text-white/70"}`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "instructions" ? (
          <div className="space-y-4">
            {/* Step guide */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { n: "1", txt: "انسخ التعليمات", icon: Copy },
                { n: "2", txt: "افتح ChatGPT", icon: Bot },
                { n: "3", txt: "أرسل الأسعار", icon: DollarSign },
                { n: "4", txt: "الصق JSON", icon: FileJson },
              ].map(step => (
                <div key={step.n} className="text-center p-2 rounded-xl bg-white/3 border border-white/8">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-1.5">
                    <step.icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-[10px] text-white/60">{step.txt}</p>
                </div>
              ))}
            </div>

            {/* Prompt preview */}
            <div className="relative rounded-xl bg-black/40 border border-white/8 p-4 max-h-52 overflow-y-auto">
              <pre className="text-[11px] text-white/60 whitespace-pre-wrap font-mono leading-5 text-right" dir="rtl">
                {AI_PROMPT}
              </pre>
            </div>

            <div className="flex gap-2">
              <button
                onClick={copyPrompt}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${copied
                  ? "bg-green-500/20 border border-green-500/40 text-green-400"
                  : "bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30"}`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "تم النسخ!" : "نسخ التعليمات كاملة"}
              </button>
              <button
                onClick={() => setTab("import")}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors"
              >
                <FileJson className="w-4 h-4" />
                إدخال JSON
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={s.label}>الصق كود JSON هنا</label>
              <textarea
                value={jsonText}
                onChange={e => { setJsonText(e.target.value); setError(null); setParsed(null); }}
                rows={8}
                dir="ltr"
                placeholder={`{\n  "packages": [\n    { "name": "110 جوهرة", "amount": "110", "category": "جواهر", "price": 14, "originalPrice": null }\n  ]\n}`}
                className="w-full px-3 py-3 rounded-xl bg-black/30 border border-white/10 text-white/80 placeholder:text-white/20 text-xs font-mono outline-none focus:border-primary/40 transition-colors resize-none"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {parsed && (() => {
              const missingLogin = parsed.filter(p => !["id","account"].includes(p.loginType));
              return (
                <div className="space-y-2">
                  {missingLogin.length > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>{missingLogin.length} باقة</strong> بدون loginType — سيتم الاستيراد بدون تحديد نوع الشحن. يُفضل أن يكون "id" أو "account" لكل باقة.
                      </span>
                    </div>
                  )}
                  <div className="rounded-xl bg-green-500/8 border border-green-500/20 p-3">
                    <p className="text-xs font-bold text-green-400 mb-2 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      تم التحليل — {parsed.length} باقة جاهزة للاستيراد
                    </p>
                    <div className="space-y-1 max-h-44 overflow-y-auto">
                      {parsed.map((p, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/3 text-xs">
                          <span className="text-white/80 font-medium truncate max-w-[140px]">{p.name || p.amount}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {p.loginType === "id" && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/20">ID</span>
                            )}
                            {p.loginType === "account" && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-violet-500/20 text-violet-400 border border-violet-500/20">أكونت</span>
                            )}
                            {!["id","account"].includes(p.loginType) && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">؟</span>
                            )}
                            {p.category && <span className="text-white/35 hidden sm:block">{p.category}</span>}
                            <span className="text-primary font-bold tabular-nums">{p.price} ج</span>
                            {p.originalPrice && <span className="text-white/30 line-through tabular-nums">{p.originalPrice}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-2">
              <button
                onClick={parseJson}
                disabled={!jsonText.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-white/8 border border-white/15 text-white hover:bg-white/12 transition-colors disabled:opacity-40"
              >
                <Eye className="w-4 h-4" />
                معاينة JSON
              </button>
            </div>
            {parsed && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleImport("upsert")}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/80 transition-colors"
                  title="تحديث الأسعار الموجودة وإضافة الجديدة"
                >
                  <RefreshCw className="w-4 h-4" />
                  تحديث {parsed.length} باقة
                </button>
                <button
                  onClick={() => handleImport("replace")}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-red-600/80 text-white hover:bg-red-600 transition-colors"
                  title="حذف جميع الباقات الحالية واستبدالها بالجديدة"
                >
                  <Trash2 className="w-4 h-4" />
                  استبدال الكل
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Package Form Dialog ─── */
function PackageFormDialog({
  open, onClose, pkg, gameId, onSave
}: {
  open: boolean; onClose: () => void;
  pkg: PackageType | null; gameId: string; onSave: (data: any) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "", amount: "", price: 0, originalPrice: "" as string | number,
    category: "", loginType: "inherit", isActive: true, sortOrder: 0,
  });

  useEffect(() => {
    if (open) {
      if (pkg) {
        setForm({
          name: pkg.name, amount: pkg.amount, price: pkg.price,
          originalPrice: pkg.originalPrice ?? "",
          category: pkg.category || "", loginType: (pkg as any).loginType || "inherit",
          isActive: pkg.isActive ?? true, sortOrder: pkg.sortOrder ?? 0,
        });
      } else {
        setForm({ name: "", amount: "", price: 0, originalPrice: "", category: "", loginType: "inherit", isActive: true, sortOrder: 0 });
      }
    }
  }, [open, pkg]);

  const handleSubmit = () => {
    if (!form.name.trim()) return toast({ title: "الاسم مطلوب", variant: "destructive" });
    if (!form.price) return toast({ title: "السعر مطلوب", variant: "destructive" });
    onSave({
      ...form, gameId,
      originalPrice: form.originalPrice !== "" ? Number(form.originalPrice) : null,
      loginType: form.loginType === "inherit" ? null : form.loginType,
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md bg-[#0a0d1a] border border-white/10 text-white" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PkgIcon className="w-5 h-5 text-primary" />
            {pkg ? "تعديل الباقة" : "إضافة باقة"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={s.label}>اسم الباقة *</label>
              <input className={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="110 جوهرة" />
            </div>
            <div>
              <label className={s.label}>الكمية (رقم)</label>
              <input className={`${s.input}`} dir="ltr" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="110" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={s.label}>السعر (ج.م) *</label>
              <input type="number" className={`${s.input}`} dir="ltr" value={form.price || ""} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} placeholder="14" />
            </div>
            <div>
              <label className={s.label}>السعر الأصلي (اختياري)</label>
              <input type="number" className={s.input} dir="ltr" value={form.originalPrice} onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))} placeholder="20" />
            </div>
          </div>

          <div>
            <label className={s.label}>الفئة / التصنيف</label>
            <input className={s.input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="مثال: جواهر، باس أسبوعي" />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/8">
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            <span className="text-sm">{form.isActive ? "الباقة مفعلة" : "الباقة معطلة"}</span>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSubmit} className="flex-1 bg-primary hover:bg-primary/80 h-11 font-bold">
              {pkg ? "حفظ التعديلات" : "إضافة الباقة"}
            </Button>
            <Button variant="outline" onClick={onClose} className="border-white/15 h-11">إلغاء</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function AdminGames() {
  const { toast } = useToast();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [showGameDialog, setShowGameDialog] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [showPkgDialog, setShowPkgDialog] = useState(false);
  const [editingPkg, setEditingPkg] = useState<PackageType | null>(null);
  const [searchGames, setSearchGames] = useState("");
  const [pkgView, setPkgView] = useState<"grid" | "list">("list");
  const [showAI, setShowAI] = useState(false);
  const [importingBulk, setImportingBulk] = useState(false);

  const { data: games = [], isLoading: gamesLoading } = useQuery<Game[]>({ queryKey: ["/api/games"] });
  const { data: allPackages = [] } = useQuery<PackageType[]>({ queryKey: ["/api/packages"] });

  const selectedGame = games.find(g => g.id === selectedGameId) || null;
  const gamePackages = [...allPackages.filter(p => p.gameId === selectedGameId)]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const filteredGames = games.filter(g =>
    g.nameAr.includes(searchGames) || g.name.toLowerCase().includes(searchGames.toLowerCase())
  );

  /* ─── Mutations ─── */
  const createGame = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/games", d),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      setShowGameDialog(false);
      setEditingGame(null);
      if (data?.id) setSelectedGameId(data.id);
      toast({ title: "تم إضافة اللعبة ✅" });
    },
    onError: () => toast({ title: "فشل الإضافة", variant: "destructive" }),
  });

  const updateGame = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/games/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      setShowGameDialog(false);
      setEditingGame(null);
      toast({ title: "تم التحديث ✅" });
    },
    onError: () => toast({ title: "فشل التحديث", variant: "destructive" }),
  });

  const deleteGame = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/games/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      if (selectedGameId) setSelectedGameId(null);
      toast({ title: "تم الحذف" });
    },
  });

  const createPkg = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/packages", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setShowPkgDialog(false);
      setEditingPkg(null);
      toast({ title: "تمت إضافة الباقة ✅" });
    },
    onError: () => toast({ title: "فشل الإضافة", variant: "destructive" }),
  });

  const updatePkg = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/packages/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setShowPkgDialog(false);
      setEditingPkg(null);
      toast({ title: "تم التحديث ✅" });
    },
  });

  const deletePkg = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/packages/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/packages"] }),
  });

  const reorderMutation = useMutation({
    mutationFn: (data: { orders: { id: string; sortOrder: number }[] }) => apiRequest("POST", "/api/packages/reorder", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/packages"] }),
  });

  const reorderGamesMutation = useMutation({
    mutationFn: (data: { orders: { id: string; sortOrder: number }[] }) => apiRequest("POST", "/api/games/reorder", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/games"] }),
  });

  const deleteGamePackagesMut = useMutation({
    mutationFn: (gameId: string) => apiRequest("DELETE", `/api/games/${gameId}/packages`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({ title: "تم حذف جميع الباقات ✅" });
    },
    onError: (err: any) => toast({ title: "فشل حذف الباقات: " + (err?.message || "خطأ غير معروف"), variant: "destructive" }),
  });

  const moveGame = (gameId: string, dir: "up" | "down") => {
    const sorted = [...games].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const idx = sorted.findIndex(g => g.id === gameId);
    if (idx === -1) return;
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === sorted.length - 1) return;
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    const reordered = sorted.map((g, i) => {
      if (i === idx) return { id: g.id, sortOrder: swapIdx };
      if (i === swapIdx) return { id: g.id, sortOrder: idx };
      return { id: g.id, sortOrder: i };
    });
    reorderGamesMutation.mutate({ orders: reordered });
  };

  const inlineSavePrice = (id: string, price: number) => {
    updatePkg.mutate({ id, data: { price } }, {
      onSuccess: () => toast({ title: `تم تحديث السعر: ${price} ج` }),
    });
  };

  const movePkg = (pkgId: string, dir: "up" | "down") => {
    const idx = gamePackages.findIndex(p => p.id === pkgId);
    if (idx === -1) return;
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === gamePackages.length - 1) return;
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    const reordered = gamePackages.map((p, i) => {
      if (i === idx) return { id: p.id, sortOrder: swapIdx };
      if (i === swapIdx) return { id: p.id, sortOrder: idx };
      return { id: p.id, sortOrder: i };
    });
    reorderMutation.mutate({ orders: reordered });
  };

  const handleBulkImport = async (pkgs: any[], mode: "upsert" | "replace" = "upsert") => {
    if (!selectedGameId) return;
    if (mode === "replace" && !confirm(`سيتم حذف جميع باقات "${selectedGame?.nameAr}" واستبدالها بـ ${pkgs.length} باقة جديدة. متأكد؟`)) return;
    setImportingBulk(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/games/${selectedGameId}/import-packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packages: pkgs, mode }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      setShowAI(false);
      const msg = mode === "replace"
        ? `تم استبدال الباقات: ${result.created} باقة جديدة ✅`
        : `تم الاستيراد: ${result.created} جديدة، ${result.updated} محدّثة ✅`;
      toast({ title: msg });
    } catch {
      toast({ title: "فشل الاستيراد", variant: "destructive" });
    }
    setImportingBulk(false);
  };

  /* ─── Render ─── */
  if (gamesLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 h-full" dir="rtl">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black mb-1 flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-primary" />
            إدارة الألعاب والأسعار
          </h1>
          <p className="text-sm text-white/40">{games.length} لعبة · {allPackages.length} باقة</p>
        </div>
        <button
          onClick={() => { setEditingGame(null); setShowGameDialog(true); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/80 text-white font-bold text-sm transition-all shadow-lg shadow-primary/25"
          data-testid="button-add-game"
        >
          <Plus className="w-4 h-4" />
          إضافة لعبة جديدة
        </button>
      </div>

      {/* ── Split Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">

        {/* ── LEFT: Games List ── */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            <input
              className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-primary/40 transition-colors"
              placeholder="بحث عن لعبة..."
              value={searchGames}
              onChange={e => setSearchGames(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
            {filteredGames.length === 0 && (
              <div className="text-center py-12 text-white/30 text-sm">لا توجد ألعاب</div>
            )}
            {filteredGames.map(game => {
              const pkgCount = allPackages.filter(p => p.gameId === game.id).length;
              const isSelected = game.id === selectedGameId;
              return (
                <motion.div
                  key={game.id}
                  onClick={() => setSelectedGameId(game.id)}
                  className="relative rounded-2xl overflow-hidden cursor-pointer group transition-all"
                  style={{
                    border: isSelected ? "1.5px solid rgba(0,144,255,0.5)" : "1px solid rgba(255,255,255,0.06)",
                    background: isSelected
                      ? "linear-gradient(135deg, rgba(0,144,255,0.1), rgba(0,60,150,0.08))"
                      : "rgba(255,255,255,0.02)",
                    boxShadow: isSelected ? "0 0 20px rgba(0,144,255,0.15)" : "none",
                  }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  data-testid={`card-game-${game.id}`}
                >
                  <div className="flex items-center gap-3 p-3">
                    {/* Game image / icon */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                      {game.image ? (
                        <img src={game.image} alt={game.nameAr} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${game.color} flex items-center justify-center text-xl`}>
                          {game.icon}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate">{game.nameAr}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-white/40">{pkgCount} باقة</span>
                        {!game.isActive && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">معطلة</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); moveGame(game.id, "up"); }}
                        disabled={[...games].sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0)).findIndex(g=>g.id===game.id) === 0}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white disabled:opacity-20 transition-colors"
                        title="تحريك لأعلى"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); moveGame(game.id, "down"); }}
                        disabled={[...games].sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0)).findIndex(g=>g.id===game.id) === games.length - 1}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white disabled:opacity-20 transition-colors"
                        title="تحريك لأسفل"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setEditingGame(game); setShowGameDialog(true); }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        data-testid={`button-edit-game-${game.id}`}
                        title="تعديل"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); if (confirm(`حذف "${game.nameAr}" وكل باقاتها نهائياً؟`)) deleteGame.mutate(game.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-500/15 text-white/50 hover:text-red-400 transition-colors"
                        data-testid={`button-delete-game-${game.id}`}
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 animate-pulse" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Packages Panel ── */}
        <div>
          {!selectedGame ? (
            <div className="flex flex-col items-center justify-center h-80 rounded-2xl border border-dashed border-white/10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/3 flex items-center justify-center mb-4">
                <ChevronLeft className="w-8 h-8 text-white/20" />
              </div>
              <p className="font-bold text-white/30">اختر لعبة لإدارة باقاتها</p>
              <p className="text-xs text-white/20 mt-1">اضغط على أي لعبة من القائمة</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Game header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 shadow-xl">
                    {selectedGame.image ? (
                      <img src={selectedGame.image} alt={selectedGame.nameAr} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${selectedGame.color} flex items-center justify-center text-2xl`}>
                        {selectedGame.icon}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-black">{selectedGame.nameAr}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] border-white/15 text-white/50">
                        {(selectedGame as any).loginType === "id" ? "شحن بـ ID" : (selectedGame as any).loginType === "account" ? "شحن بحساب" : "ID / حساب"}
                      </Badge>
                      <span className="text-xs text-white/40">{gamePackages.length} باقة</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setPkgView(v => v === "list" ? "grid" : "list")}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors"
                    title="تغيير طريقة العرض"
                  >
                    {pkgView === "list" ? <Grid3x3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setShowAI(!showAI)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${showAI
                      ? "bg-primary/20 border border-primary/40 text-primary"
                      : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"}`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    مساعد ذكي
                  </button>
                  {gamePackages.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm(`سيتم حذف جميع باقات "${selectedGame.nameAr}" (${gamePackages.length} باقة) نهائياً. متأكد؟`)) {
                          deleteGamePackagesMut.mutate(selectedGame.id);
                        }
                      }}
                      disabled={deleteGamePackagesMut.isPending}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      title="حذف جميع الباقات"
                    >
                      {deleteGamePackagesMut.isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                      حذف الكل
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingPkg(null); setShowPkgDialog(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-bold hover:bg-primary/25 transition-colors"
                    data-testid={`button-add-package-${selectedGame.id}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة باقة
                  </button>
                </div>
              </div>

              {/* AI Assistant (toggleable) */}
              <AnimatePresence>
                {showAI && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    {importingBulk ? (
                      <div className="flex items-center justify-center gap-3 py-8 rounded-2xl border border-primary/20 bg-primary/5">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        <span className="text-sm text-white/60">جاري الاستيراد...</span>
                      </div>
                    ) : (
                      <AIJsonAssistant
                        gameId={selectedGame.id}
                        gameName={selectedGame.nameAr}
                        onImport={handleBulkImport}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Packages */}
              {gamePackages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-white/8 text-center">
                  <PkgIcon className="w-10 h-10 text-white/15 mb-3" />
                  <p className="text-white/30 text-sm font-bold">لا توجد باقات</p>
                  <p className="text-white/20 text-xs mt-1">أضف باقة يدوياً أو استخدم المساعد الذكي</p>
                </div>
              ) : pkgView === "list" ? (
                /* List View */
                <div className="rounded-2xl border border-white/8 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/8 bg-white/2">
                        <th className="text-right text-[11px] font-bold text-white/40 px-4 py-3">#</th>
                        <th className="text-right text-[11px] font-bold text-white/40 px-4 py-3">الباقة</th>
                        <th className="text-right text-[11px] font-bold text-white/40 px-4 py-3">الفئة</th>
                        <th className="text-right text-[11px] font-bold text-white/40 px-4 py-3">نوع الشحن</th>
                        <th className="text-right text-[11px] font-bold text-white/40 px-4 py-3">السعر</th>
                        <th className="text-right text-[11px] font-bold text-white/40 px-4 py-3">الحالة</th>
                        <th className="text-right text-[11px] font-bold text-white/40 px-4 py-3">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gamePackages.map((pkg, idx) => (
                        <tr key={pkg.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                          <td className="px-4 py-3 text-xs text-white/30 tabular-nums">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-sm text-white">{pkg.name || pkg.amount}</span>
                            {pkg.originalPrice && (
                              <span className="text-[10px] text-white/30 line-through mr-2">{pkg.originalPrice} ج</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {pkg.category ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-white/50 border border-white/8">
                                {pkg.category}
                              </span>
                            ) : (
                              <span className="text-white/20 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {(pkg as any).loginType === "id" && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20">ID</span>
                            )}
                            {(pkg as any).loginType === "account" && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20">أكونت</span>
                            )}
                            {!["id","account"].includes((pkg as any).loginType) && (
                              <span className="text-white/20 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <InlinePrice pkg={pkg} onSave={inlineSavePrice} />
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold ${pkg.isActive ? "text-green-400" : "text-red-400"}`}>
                              {pkg.isActive ? "مفعل" : "معطل"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => movePkg(pkg.id, "up")} disabled={idx === 0} className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white disabled:opacity-20 transition-colors">
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button onClick={() => movePkg(pkg.id, "down")} disabled={idx === gamePackages.length - 1} className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white disabled:opacity-20 transition-colors">
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => { setEditingPkg(pkg); setShowPkgDialog(true); }}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                data-testid={`button-edit-pkg-${pkg.id}`}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { if (confirm("حذف الباقة؟")) deletePkg.mutate(pkg.id); }}
                                className="p-1.5 rounded-lg hover:bg-red-500/15 text-white/40 hover:text-red-400 transition-colors"
                                data-testid={`button-delete-pkg-${pkg.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Grid View */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {gamePackages.map((pkg, idx) => (
                    <motion.div
                      key={pkg.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="relative rounded-2xl border border-white/8 bg-white/3 p-3 group hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-1 mb-1.5">
                        {pkg.category && (
                          <div className="text-[9px] text-white/30 truncate">{pkg.category}</div>
                        )}
                        {(pkg as any).loginType === "id" && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-bold bg-blue-500/15 text-blue-400 border border-blue-500/20 flex-shrink-0">ID</span>
                        )}
                        {(pkg as any).loginType === "account" && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20 flex-shrink-0">أكونت</span>
                        )}
                      </div>
                      <p className="font-bold text-sm text-white leading-tight">{pkg.name || pkg.amount}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <InlinePrice pkg={pkg} onSave={inlineSavePrice} />
                        {pkg.originalPrice && (
                          <span className="text-[10px] text-white/25 line-through">{pkg.originalPrice}</span>
                        )}
                      </div>
                      <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingPkg(pkg); setShowPkgDialog(true); }} className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/60">
                          <Edit className="w-3 h-3" />
                        </button>
                        <button onClick={() => { if (confirm("حذف؟")) deletePkg.mutate(pkg.id); }} className="p-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      <GameFormDialog
        open={showGameDialog}
        onClose={() => { setShowGameDialog(false); setEditingGame(null); }}
        game={editingGame}
        onSave={data => {
          if (editingGame) updateGame.mutate({ id: editingGame.id, data });
          else createGame.mutate(data);
        }}
      />

      <PackageFormDialog
        open={showPkgDialog}
        onClose={() => { setShowPkgDialog(false); setEditingPkg(null); }}
        pkg={editingPkg}
        gameId={selectedGameId || ""}
        onSave={data => {
          if (editingPkg) updatePkg.mutate({ id: editingPkg.id, data });
          else createPkg.mutate(data);
        }}
      />
    </div>
  );
}
