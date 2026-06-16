import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ShoppingBag, Plus, Pencil, Trash2, Save, X, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SardarbItem, SardarbOrder } from "@shared/schema";
import { SingleImageUploader } from "@/components/ImageUploader";

const CATEGORIES = ["سكن", "آيتم", "كود", "أخرى"];

const EMPTY_ITEM: Partial<SardarbItem> = {
  title: "", description: "", category: "سكن", price: 0,
  originalPrice: undefined, image: "", stock: 1, isAvailable: true, sortOrder: 0,
};

function ItemForm({ initial, onSave, onCancel, loading }: {
  initial: Partial<SardarbItem>;
  onSave: (d: Partial<SardarbItem>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs text-white/50 mb-1 block">العنوان *</label>
          <input value={form.title || ""} onChange={e => set("title", e.target.value)} placeholder="اسم المنتج" className="input-field" />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">الفئة</label>
          <select value={form.category || "سكن"} onChange={e => set("category", e.target.value)} className="input-field">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">السعر (جنيه) *</label>
          <input type="number" min="0" value={form.price || 0} onChange={e => set("price", Number(e.target.value))} className="input-field" />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">السعر الأصلي (اختياري)</label>
          <input type="number" min="0" value={form.originalPrice || ""} onChange={e => set("originalPrice", e.target.value ? Number(e.target.value) : undefined)} className="input-field" />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">الكمية</label>
          <input type="number" min="0" value={form.stock ?? 1} onChange={e => set("stock", Number(e.target.value))} className="input-field" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-white/50 mb-1 block">صورة المنتج</label>
          <SingleImageUploader value={form.image || ""} onChange={v => set("image", v)} label="صورة المنتج" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-white/50 mb-1 block">الوصف</label>
          <textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={2} className="input-field resize-none" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isAvailable ?? true} onChange={e => set("isAvailable", e.target.checked)} className="accent-primary" />
          <span className="text-sm text-white/60">متاح</span>
        </label>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading} className="text-white/40"><X className="w-4 h-4 ml-1" /> إلغاء</Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={loading || !form.title}
          style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.3)", color: "#fff" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />} حفظ
        </Button>
      </div>
    </div>
  );
}

function OrderRow({ order, onUpdate }: { order: SardarbOrder & { item?: SardarbItem }; onUpdate: (id: string, data: any) => void }) {
  const [codeInput, setCodeInput] = useState(order.deliveredCode || "");
  const statusColor: Record<string, string> = {
    pending: "#f59e0b", confirmed: "#34d399", delivered: "#0090ff", cancelled: "#f87171"
  };

  return (
    <div className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-bold text-white text-sm">{order.item?.title || "منتج"}</p>
          <p className="text-xs text-white/40">{order.customerName} · {order.customerPhone}</p>
          <p className="text-xs text-white/30">{order.orderNumber} · {order.totalAmount} جنيه · {order.paymentMethod}</p>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: `${statusColor[order.status] || "#888"}18`, color: statusColor[order.status] || "#888" }}>
          {order.status === "pending" ? "⏳ انتظار" : order.status === "confirmed" ? "✅ مؤكد" : order.status === "delivered" ? "📦 مُسلَّم" : "❌ ملغي"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-3">
        {order.status === "pending" && (
          <>
            <button onClick={() => onUpdate(order.id, { status: "confirmed" })}
              className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}>
              ✅ تأكيد
            </button>
            <button onClick={() => onUpdate(order.id, { status: "cancelled" })}
              className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              ❌ إلغاء
            </button>
          </>
        )}
      </div>

      {/* Deliver code */}
      {(order.status === "confirmed" || order.status === "pending") && (
        <div className="flex gap-2">
          <input
            value={codeInput}
            onChange={e => setCodeInput(e.target.value)}
            placeholder="أدخل الكود وأرسله للعميل"
            className="input-field flex-1 text-sm font-mono"
          />
          <button
            onClick={() => onUpdate(order.id, { status: "delivered", deliveredCode: codeInput })}
            disabled={!codeInput}
            className="px-3 py-2 rounded-xl text-xs font-bold shrink-0 disabled:opacity-40"
            style={{ background: "rgba(0,144,255,0.15)", border: "1px solid rgba(0,144,255,0.25)", color: "#0090ff" }}
          >
            إرسال الكود
          </button>
        </div>
      )}

      {order.deliveredCode && (
        <p className="text-xs text-primary/60 mt-2 font-mono">الكود: {order.deliveredCode}</p>
      )}
    </div>
  );
}

export default function AdminSardarb() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"items" | "orders">("items");
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: items = [], isLoading: itemsLoading } = useQuery<SardarbItem[]>({ queryKey: ["/api/admin/sardarb/items"] });
  const { data: orders = [], isLoading: ordersLoading } = useQuery<(SardarbOrder & { item?: SardarbItem })[]>({ queryKey: ["/api/admin/sardarb/orders"] });

  const createMutation = useMutation({
    mutationFn: (d: Partial<SardarbItem>) => apiRequest("POST", "/api/admin/sardarb/items", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/sardarb/items"] }); setShowCreate(false); toast({ title: "تم إنشاء المنتج" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message || "فشل في الإنشاء", variant: "destructive" }),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SardarbItem> }) => apiRequest("PATCH", `/api/admin/sardarb/items/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/sardarb/items"] }); setEditId(null); toast({ title: "تم التحديث" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message || "فشل في التحديث", variant: "destructive" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/sardarb/items/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/sardarb/items"] }); toast({ title: "تم الحذف" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message || "فشل في الحذف", variant: "destructive" }),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/sardarb/orders/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/sardarb/orders"] }); toast({ title: "تم التحديث" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message || "فشل في التحديث", variant: "destructive" }),
  });

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-6">
      <style>{`.input-field { width:100%; padding:8px 12px; border-radius:10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:white; font-size:14px; outline:none; } .input-field:focus { border-color:rgba(168,85,247,0.5); }`}</style>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.25)" }}>
            <ShoppingBag className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">إدارة السرداب</h1>
            <p className="text-xs text-white/40">{items.length} منتج · {orders.filter(o => o.status === "pending").length} طلب معلق</p>
          </div>
        </div>
        {tab === "items" && (
          <Button size="sm" onClick={() => setShowCreate(true)} style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.3)", color: "#fff" }}>
            <Plus className="w-4 h-4 ml-1" /> منتج جديد
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["items", "orders"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: tab === t ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.05)",
              border: tab === t ? "1px solid rgba(168,85,247,0.4)" : "1px solid rgba(255,255,255,0.08)",
              color: tab === t ? "#a855f7" : "rgba(255,255,255,0.4)",
            }}>
            {t === "items" ? `المنتجات (${items.length})` : `الطلبات (${orders.length})`}
          </button>
        ))}
      </div>

      {tab === "items" && (
        <>
          {showCreate && <ItemForm initial={EMPTY_ITEM} onSave={d => createMutation.mutate(d)} onCancel={() => setShowCreate(false)} loading={createMutation.isPending} />}
          {itemsLoading ? <div className="text-center py-10"><Loader2 className="w-6 h-6 text-primary/40 animate-spin mx-auto" /></div> : (
            <div className="space-y-3">
              {items.map(item => (
                <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {editId === item.id ? (
                    <div className="p-4">
                      <ItemForm initial={item} onSave={d => updateItemMutation.mutate({ id: item.id, data: d })} onCancel={() => setEditId(null)} loading={updateItemMutation.isPending} />
                    </div>
                  ) : (
                    <div className="p-4 flex items-start gap-3">
                      {item.image && <img src={item.image} alt={item.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />}
                      {!item.image && <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(168,85,247,0.1)" }}><Package className="w-5 h-5 text-purple-400/50" /></div>}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm">{item.title}</p>
                        <p className="text-xs text-white/40">{item.category} · {item.price} جنيه · {item.stock} متبقي</p>
                        {!item.isAvailable && <span className="text-[10px] text-red-400/60">غير متاح</span>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setEditId(item.id)} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-primary/70 hover:bg-primary/10 transition-all"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm("حذف المنتج؟")) deleteItemMutation.mutate(item.id); }} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "orders" && (
        ordersLoading ? <div className="text-center py-10"><Loader2 className="w-6 h-6 text-primary/40 animate-spin mx-auto" /></div> : (
          <div className="space-y-3">
            {orders.length === 0 ? <div className="text-center py-12 text-white/30">لا توجد طلبات</div> : (
              orders.map(order => <OrderRow key={order.id} order={order} onUpdate={(id, data) => updateOrderMutation.mutate({ id, data })} />)
            )}
          </div>
        )
      )}
    </div>
  );
}
