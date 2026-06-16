import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Smartphone, Plus, Pencil, Trash2, Save, X, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { VirtualNumberCountry, VirtualNumberOrder } from "@shared/schema";

const EMPTY_COUNTRY: Partial<VirtualNumberCountry> = {
  countryName: "", countryFlag: "🌍", countryCode: "", price: 0, isAvailable: true,
};

function CountryForm({ initial, onSave, onCancel, loading }: {
  initial: Partial<VirtualNumberCountry>;
  onSave: (d: Partial<VirtualNumberCountry>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-white/50 mb-1 block">الإيموجي (علم)</label>
          <input value={form.countryFlag || "🌍"} onChange={e => set("countryFlag", e.target.value)} placeholder="🇪🇬" className="input-field text-2xl text-center" />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">اسم الدولة *</label>
          <input value={form.countryName || ""} onChange={e => set("countryName", e.target.value)} placeholder="مصر" className="input-field" />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">كود الدولة</label>
          <input value={form.countryCode || ""} onChange={e => set("countryCode", e.target.value)} placeholder="+20" className="input-field" dir="ltr" />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">السعر (جنيه) *</label>
          <input type="number" min="0" value={form.price || 0} onChange={e => set("price", Number(e.target.value))} className="input-field" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isAvailable ?? true} onChange={e => set("isAvailable", e.target.checked)} className="accent-primary" />
          <span className="text-sm text-white/60">متاح</span>
        </label>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading} className="text-white/40"><X className="w-4 h-4 ml-1" /> إلغاء</Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={loading || !form.countryName}
          style={{ background: "rgba(0,144,255,0.2)", border: "1px solid rgba(0,144,255,0.3)", color: "#fff" }}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />} حفظ
        </Button>
      </div>
    </div>
  );
}

function OrderRow({ order, onUpdate }: { order: VirtualNumberOrder & { country?: VirtualNumberCountry }; onUpdate: (id: string, data: any) => void }) {
  const [numberInput, setNumberInput] = useState(order.virtualNumber || "");
  const [otpInput, setOtpInput] = useState(order.otpCode || "");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const statusColor: Record<string, string> = {
    pending_payment: "#f59e0b",
    confirmed: "#34d399",
    number_sent: "#0090ff",
    code_requested: "#a855f7",
    code_sent: "#34d399",
    completed: "#34d399",
    cancelled: "#f87171",
  };

  const statusLabel: Record<string, string> = {
    pending_payment: "⏳ انتظار الدفع",
    confirmed: "✅ مؤكد",
    number_sent: "📱 الرقم أُرسل",
    code_requested: "🔐 طلب كود",
    code_sent: "✅ الكود أُرسل",
    completed: "🎉 مكتمل",
    cancelled: "❌ ملغي",
  };

  return (
    <div className="p-4 rounded-xl space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{order.country?.countryFlag}</span>
            <span className="font-bold text-white text-sm">{order.country?.countryName}</span>
          </div>
          <p className="text-xs text-white/40">{order.customerName} · {order.customerPhone}</p>
          <p className="text-xs text-white/30">{order.orderNumber} · {order.totalAmount} جنيه · {order.paymentMethod}{order.senderPhone ? ` · من: ${order.senderPhone}` : ""}</p>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: `${statusColor[order.status] || "#888"}18`, color: statusColor[order.status] || "#888" }}>
          {statusLabel[order.status] || order.status}
        </span>
      </div>

      {/* Actions for pending_payment */}
      {order.status === "pending_payment" && (
        <div className="flex gap-2">
          <button onClick={() => onUpdate(order.id, { status: "confirmed" })}
            className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}>
            ✅ تأكيد الدفع
          </button>
          <button onClick={() => onUpdate(order.id, { status: "cancelled" })}
            className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
            ❌ إلغاء
          </button>
        </div>
      )}

      {/* Send virtual number */}
      {(order.status === "confirmed" || order.status === "pending_payment") && (
        <div>
          <p className="text-xs text-white/40 mb-1.5">إرسال الرقم الفيك</p>
          <div className="flex gap-2">
            <input value={numberInput} onChange={e => setNumberInput(e.target.value)}
              placeholder="+1 234 567 8901" dir="ltr"
              className="input-field flex-1 text-sm font-mono" />
            <button onClick={() => onUpdate(order.id, { status: "number_sent", virtualNumber: numberInput })}
              disabled={!numberInput}
              className="px-3 py-2 rounded-xl text-xs font-bold shrink-0 disabled:opacity-40"
              style={{ background: "rgba(0,144,255,0.15)", border: "1px solid rgba(0,144,255,0.25)", color: "#0090ff" }}>
              إرسال
            </button>
          </div>
        </div>
      )}

      {/* Show sent number */}
      {order.virtualNumber && (
        <div>
          <p className="text-xs text-white/40 mb-1">الرقم المُرسل</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-xl text-sm font-mono text-white text-center" style={{ background: "rgba(0,144,255,0.06)", border: "1px solid rgba(0,144,255,0.15)" }}>
              {order.virtualNumber}
            </div>
            <button onClick={() => copy(order.virtualNumber!, "num")} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,144,255,0.1)", border: "1px solid rgba(0,144,255,0.2)" }}>
              {copiedField === "num" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-primary" />}
            </button>
          </div>
        </div>
      )}

      {/* Send OTP */}
      {order.status === "code_requested" && (
        <div>
          <p className="text-xs text-primary/60 mb-1.5 font-bold">⚡ العميل يطلب كود OTP</p>
          <div className="flex gap-2">
            <input value={otpInput} onChange={e => setOtpInput(e.target.value)}
              placeholder="123456" dir="ltr"
              className="input-field flex-1 text-sm font-mono" />
            <button onClick={() => onUpdate(order.id, { status: "code_sent", otpCode: otpInput })}
              disabled={!otpInput}
              className="px-3 py-2 rounded-xl text-xs font-bold shrink-0 disabled:opacity-40"
              style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7" }}>
              إرسال الكود
            </button>
          </div>
        </div>
      )}

      {order.otpCode && (
        <p className="text-xs text-purple-400/60 font-mono">الكود: {order.otpCode}</p>
      )}
    </div>
  );
}

export default function AdminVirtualNumbers() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"countries" | "orders">("countries");
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: countries = [], isLoading: countriesLoading } = useQuery<VirtualNumberCountry[]>({ queryKey: ["/api/admin/virtual-numbers/countries"] });
  const { data: orders = [], isLoading: ordersLoading } = useQuery<(VirtualNumberOrder & { country?: VirtualNumberCountry })[]>({ queryKey: ["/api/admin/virtual-numbers/orders"] });

  const pendingOrders = orders.filter(o => ["pending_payment", "confirmed", "code_requested"].includes(o.status));

  const createMutation = useMutation({
    mutationFn: (d: Partial<VirtualNumberCountry>) => apiRequest("POST", "/api/admin/virtual-numbers/countries", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-numbers/countries"] }); setShowCreate(false); toast({ title: "تم إنشاء الدولة" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message || "فشل في الإنشاء", variant: "destructive" }),
  });

  const updateCountryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VirtualNumberCountry> }) => apiRequest("PATCH", `/api/admin/virtual-numbers/countries/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-numbers/countries"] }); setEditId(null); toast({ title: "تم التحديث" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message || "فشل في التحديث", variant: "destructive" }),
  });

  const deleteCountryMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/virtual-numbers/countries/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-numbers/countries"] }); toast({ title: "تم الحذف" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message || "فشل في الحذف", variant: "destructive" }),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/virtual-numbers/orders/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-numbers/orders"] }); toast({ title: "تم التحديث" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message || "فشل في التحديث", variant: "destructive" }),
  });

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-6">
      <style>{`.input-field { width:100%; padding:8px 12px; border-radius:10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:white; font-size:14px; outline:none; } .input-field:focus { border-color:rgba(0,144,255,0.5); }`}</style>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,144,255,0.15)", border: "1px solid rgba(0,144,255,0.25)" }}>
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">إدارة الأرقام الفيك</h1>
            <p className="text-xs text-white/40">{countries.length} دولة · {pendingOrders.length} طلب معلق</p>
          </div>
        </div>
        {tab === "countries" && (
          <Button size="sm" onClick={() => setShowCreate(true)} style={{ background: "rgba(0,144,255,0.2)", border: "1px solid rgba(0,144,255,0.3)", color: "#fff" }}>
            <Plus className="w-4 h-4 ml-1" /> دولة جديدة
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["countries", "orders"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background: tab === t ? "rgba(0,144,255,0.2)" : "rgba(255,255,255,0.05)",
              border: tab === t ? "1px solid rgba(0,144,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
              color: tab === t ? "#0090ff" : "rgba(255,255,255,0.4)",
            }}>
            {t === "countries" ? `الدول (${countries.length})` : `الطلبات (${orders.length})`}
            {t === "orders" && pendingOrders.length > 0 && (
              <span className="mr-2 px-1.5 py-0.5 rounded-full text-[10px] font-black" style={{ background: "rgba(245,158,11,0.25)", color: "#f59e0b" }}>
                {pendingOrders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "countries" && (
        <>
          {showCreate && <CountryForm initial={EMPTY_COUNTRY} onSave={d => createMutation.mutate(d)} onCancel={() => setShowCreate(false)} loading={createMutation.isPending} />}
          {countriesLoading ? <div className="text-center py-10"><Loader2 className="w-6 h-6 text-primary/40 animate-spin mx-auto" /></div> : (
            <div className="space-y-2">
              {countries.map(country => (
                <motion.div key={country.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {editId === country.id ? (
                    <div className="p-4">
                      <CountryForm initial={country} onSave={d => updateCountryMutation.mutate({ id: country.id, data: d })} onCancel={() => setEditId(null)} loading={updateCountryMutation.isPending} />
                    </div>
                  ) : (
                    <div className="p-4 flex items-center gap-3">
                      <span className="text-3xl">{country.countryFlag}</span>
                      <div className="flex-1">
                        <p className="font-bold text-white text-sm">{country.countryName} <span className="text-white/30 font-normal text-xs">{country.countryCode}</span></p>
                        <p className="text-xs text-primary">{country.price} جنيه {!country.isAvailable && <span className="text-red-400/60 mr-2">غير متاح</span>}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setEditId(country.id)} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-primary/70 hover:bg-primary/10 transition-all"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => { if (confirm("حذف الدولة؟")) deleteCountryMutation.mutate(country.id); }} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>
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
