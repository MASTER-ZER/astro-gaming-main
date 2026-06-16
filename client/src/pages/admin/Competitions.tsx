import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Plus, Pencil, Trash2, Eye, EyeOff, Save, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Competition } from "@shared/schema";

const EMPTY: Partial<Competition> = {
  title: "", description: "", gameName: "", gameImage: "", rules: "",
  scheduledAt: undefined, roomCode: "", roomPassword: "", prize: "",
  entryFee: 0, status: "upcoming", isVisible: true,
};

function CompForm({ initial, onSave, onCancel, loading }: {
  initial: Partial<Competition>;
  onSave: (data: Partial<Competition>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/50 mb-1 block">عنوان المسابقة *</label>
          <input value={form.title || ""} onChange={e => set("title", e.target.value)} placeholder="عنوان المسابقة" className="input-field" />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">اسم اللعبة *</label>
          <input value={form.gameName || ""} onChange={e => set("gameName", e.target.value)} placeholder="PUBG, Free Fire..." className="input-field" />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">موعد المسابقة</label>
          <input
            type="datetime-local"
            value={form.scheduledAt ? new Date(form.scheduledAt).toISOString().slice(0, 16) : ""}
            onChange={e => set("scheduledAt", e.target.value ? new Date(e.target.value) : undefined)}
            className="input-field"
          />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">رسوم الدخول (0 = مجاني)</label>
          <input type="number" min="0" value={form.entryFee ?? 0} onChange={e => set("entryFee", Number(e.target.value))} className="input-field" />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">كود الغرفة</label>
          <input value={form.roomCode || ""} onChange={e => set("roomCode", e.target.value)} placeholder="XXXXXX" className="input-field font-mono" />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">باسوورد الغرفة</label>
          <input value={form.roomPassword || ""} onChange={e => set("roomPassword", e.target.value)} placeholder="••••••" className="input-field font-mono" />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">الجائزة</label>
          <input value={form.prize || ""} onChange={e => set("prize", e.target.value)} placeholder="مثال: 500 جنيه" className="input-field" />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">الحالة</label>
          <select value={form.status || "upcoming"} onChange={e => set("status", e.target.value)} className="input-field">
            <option value="upcoming">قريباً</option>
            <option value="active">جارية الآن</option>
            <option value="ended">انتهت</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-white/50 mb-1 block">رابط صورة اللعبة</label>
          <input value={form.gameImage || ""} onChange={e => set("gameImage", e.target.value)} placeholder="https://..." className="input-field" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-white/50 mb-1 block">الوصف</label>
          <textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={2} placeholder="وصف المسابقة..." className="input-field resize-none" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-white/50 mb-1 block">الشروط والقواعد</label>
          <textarea value={form.rules || ""} onChange={e => set("rules", e.target.value)} rows={3} placeholder="اكتب شروط المسابقة..." className="input-field resize-none" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isVisible ?? true} onChange={e => set("isVisible", e.target.checked)} className="accent-primary" />
          <span className="text-sm text-white/60">مرئية للزوار</span>
        </label>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading} className="text-white/40">
          <X className="w-4 h-4 ml-1" /> إلغاء
        </Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={loading || !form.title || !form.gameName}
          style={{ background: "rgba(0,144,255,0.2)", border: "1px solid rgba(0,144,255,0.3)", color: "#fff" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />}
          حفظ
        </Button>
      </div>
    </div>
  );
}

export default function AdminCompetitions() {
  const { toast } = useToast();
  const [editId, setEditId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: competitions = [], isLoading } = useQuery<Competition[]>({
    queryKey: ["/api/admin/competitions"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Competition>) => apiRequest("POST", "/api/admin/competitions", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions"] }); setShowCreate(false); toast({ title: "تم إنشاء المسابقة" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message || "فشل في الإنشاء", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Competition> }) => apiRequest("PATCH", `/api/admin/competitions/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions"] }); setEditId(null); toast({ title: "تم التحديث" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message || "فشل في التحديث", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/competitions/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/competitions"] }); toast({ title: "تم الحذف" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message || "فشل في الحذف", variant: "destructive" }),
  });

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-6">
      <style>{`.input-field { width:100%; padding:8px 12px; border-radius:10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:white; font-size:14px; outline:none; } .input-field:focus { border-color:rgba(0,144,255,0.5); }`}</style>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Trophy className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">إدارة المسابقات</h1>
            <p className="text-xs text-white/40">{competitions.length} مسابقة</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} style={{ background: "rgba(0,144,255,0.2)", border: "1px solid rgba(0,144,255,0.3)", color: "#fff" }}>
          <Plus className="w-4 h-4 ml-1" /> مسابقة جديدة
        </Button>
      </div>

      {showCreate && (
        <CompForm initial={EMPTY} onSave={d => createMutation.mutate(d)} onCancel={() => setShowCreate(false)} loading={createMutation.isPending} />
      )}

      {isLoading ? (
        <div className="text-center py-10"><Loader2 className="w-6 h-6 text-primary/40 animate-spin mx-auto" /></div>
      ) : competitions.length === 0 ? (
        <div className="text-center py-16 text-white/30">لا توجد مسابقات بعد</div>
      ) : (
        <div className="space-y-3">
          {competitions.map(comp => (
            <motion.div key={comp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {editId === comp.id ? (
                <div className="p-4">
                  <CompForm
                    initial={comp}
                    onSave={d => updateMutation.mutate({ id: comp.id, data: d })}
                    onCancel={() => setEditId(null)}
                    loading={updateMutation.isPending}
                  />
                </div>
              ) : (
                <div className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-sm">{comp.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{
                        background: comp.status === "active" ? "rgba(52,211,153,0.12)" : comp.status === "upcoming" ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)",
                        color: comp.status === "active" ? "#34d399" : comp.status === "upcoming" ? "#f59e0b" : "rgba(255,255,255,0.3)"
                      }}>
                        {comp.status === "upcoming" ? "قريباً" : comp.status === "active" ? "جارية" : "انتهت"}
                      </span>
                      {!comp.isVisible && <EyeOff className="w-3.5 h-3.5 text-white/30" />}
                    </div>
                    <p className="text-xs text-white/40">{comp.gameName} · {comp.entryFee ? `${comp.entryFee} جنيه` : "مجاناً"}{comp.prize ? ` · جائزة: ${comp.prize}` : ""}</p>
                    {comp.roomCode && <p className="text-xs text-primary/60 mt-1 font-mono">كود: {comp.roomCode} · باسوورد: {comp.roomPassword}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => updateMutation.mutate({ id: comp.id, data: { isVisible: !comp.isVisible } })}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/8 transition-all">
                      {comp.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditId(comp.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-primary/70 hover:bg-primary/10 transition-all">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if (confirm("حذف المسابقة؟")) deleteMutation.mutate(comp.id); }}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
