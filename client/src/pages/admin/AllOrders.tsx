import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, RefreshCw, Eye, MessageCircle, Trash2, Package, Crown, ShoppingBag, Smartphone, Gamepad2, Users, ZoomIn } from "lucide-react";
import { useLocation } from "wouter";
import type { SardarbOrder, SardarbItem, VirtualNumberOrder, VirtualNumberCountry } from "@shared/schema";

// ── Shared utils ────────────────────────────────────────────────────────────

const fmtDate = (d: any) =>
  d ? new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const gameStatusMap: Record<string, { label: string; color: string }> = {
  pending:    { label: "قيد الانتظار", color: "bg-amber-500/15 text-amber-400" },
  processing: { label: "جاري التنفيذ", color: "bg-blue-500/15 text-blue-400" },
  completed:  { label: "مكتمل",       color: "bg-green-500/15 text-green-400" },
  cancelled:  { label: "ملغي",        color: "bg-red-500/15 text-red-400" },
};

const vnStatusMap: Record<string, string> = {
  pending_payment: "⏳ انتظار الدفع", confirmed: "✅ مؤكد", number_sent: "📱 الرقم أُرسل",
  code_requested:  "🔐 طلب كود",      code_sent: "✅ الكود أُرسل", completed: "🎉 مكتمل", cancelled: "❌ ملغي",
};

const sardarbStatusMap: Record<string, string> = {
  pending:   "⏳ انتظار", confirmed: "✅ مؤكد", delivered: "📦 مُسلَّم", cancelled: "❌ ملغي",
};

const brokerStatusMap: Record<string, string> = {
  pending:   "⏳ انتظار", approved: "✅ معتمد", matched: "🎯 مطابق",
  in_escrow: "🔒 ضمان",  delivered: "📦 مُسلَّم", completed: "🎉 مكتمل", cancelled: "❌ ملغي",
};

const accountStatusMap: Record<string, { label: string; color: string }> = {
  payment_pending:   { label: "⏳ انتظار الدفع",     color: "bg-amber-500/15 text-amber-400" },
  payment_review:    { label: "🔍 مراجعة الدفع",    color: "bg-orange-500/15 text-orange-400" },
  payment_confirmed: { label: "✅ الدفع مؤكد",       color: "bg-green-500/15 text-green-400" },
  credentials_sent:  { label: "🔑 بيانات أُرسلت",   color: "bg-blue-500/15 text-blue-400" },
  buyer_confirmed:   { label: "🎉 مؤكد",             color: "bg-green-600/15 text-green-400" },
  payout_sent:       { label: "💸 تم التحويل",       color: "bg-purple-500/15 text-purple-400" },
  rejected:          { label: "❌ مرفوض",            color: "bg-red-500/15 text-red-400" },
};

type TabType = "all" | "topup" | "accounts" | "sardarb" | "vn" | "broker";

const TABS: { key: TabType; label: string; icon: any; color: string }[] = [
  { key: "all",      label: "الكل",          icon: Package,    color: "text-white" },
  { key: "topup",    label: "شحن الألعاب",   icon: Gamepad2,   color: "text-primary" },
  { key: "accounts", label: "الأكونتات",     icon: Users,      color: "text-amber-400" },
  { key: "sardarb",  label: "السرداب",       icon: ShoppingBag, color: "text-purple-400" },
  { key: "vn",       label: "أرقام فيك",     icon: Smartphone, color: "text-blue-400" },
  { key: "broker",   label: "طلبات خاصة 👑", icon: Crown,      color: "text-yellow-400" },
];

// ── Shared image component ──────────────────────────────────────────────────

function ProofImage({ url, label = "إثبات الدفع" }: { url: string; label?: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="relative group cursor-pointer" onClick={() => setExpanded(true)}>
          <img src={url} alt={label} className="w-full max-h-48 object-cover rounded-xl border border-white/10 group-hover:brightness-75 transition-all" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
            <ZoomIn className="w-6 h-6 text-white drop-shadow" />
          </div>
        </div>
      </div>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-2xl bg-black/90 border-white/10 p-2">
          <img src={url} alt={label} className="w-full rounded-xl object-contain max-h-[80vh]" />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ImageGallery({ images, label }: { images: string[]; label: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (!images?.length) return null;
  return (
    <>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative group cursor-pointer" onClick={() => setExpanded(img)}>
              <img src={img} alt={`${label} ${i + 1}`} className="w-20 h-20 rounded-xl object-cover border border-white/10 group-hover:brightness-75 transition-all" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                <ZoomIn className="w-4 h-4 text-white drop-shadow" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Dialog open={!!expanded} onOpenChange={() => setExpanded(null)}>
        <DialogContent className="max-w-2xl bg-black/90 border-white/10 p-2">
          {expanded && <img src={expanded} alt={label} className="w-full rounded-xl object-contain max-h-[80vh]" />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

// ── Tab: Game Top-up Orders ────────────────────────────────────────────────

function TopupTab({ search }: { search: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<any>(null);

  const { data: orders = [], isLoading, refetch } = useQuery<any[]>({ queryKey: ["/api/orders"], staleTime: 0, refetchInterval: 30_000 });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/admin/customers"] });
  const custById = customers.reduce<Record<string, any>>((a, c) => { a[c.id] = c; return a; }, {});
  const custByPhone = customers.reduce<Record<string, any>>((a, c) => { if (c.phone) a[c.phone] = c; return a; }, {});

  const filtered = orders.filter(o => {
    if (o.orderType === "account_purchase") return false;
    const q = search.toLowerCase();
    const matchQ = !q || o.orderNumber?.toLowerCase().includes(q) || o.customerName?.toLowerCase().includes(q) || o.customerPhone?.includes(q);
    const matchS  = statusFilter === "all" || o.status === statusFilter;
    return matchQ && matchS;
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/orders/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); toast({ title: "تم تحديث الحالة" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/orders/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); setSelected(null); toast({ title: "تم الحذف" }); },
  });

  const linkedCustomer = (o: any) => o.customerId ? custById[o.customerId] : custByPhone[o.customerPhone];

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="pending">انتظار</SelectItem>
            <SelectItem value="processing">جاري</SelectItem>
            <SelectItem value="completed">مكتمل</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {isLoading
        ? <div className="py-12 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        : filtered.length === 0
          ? <div className="py-12 text-center text-muted-foreground text-sm">لا توجد طلبات</div>
          : <div className="space-y-2">
              {filtered.map(o => {
                const s = gameStatusMap[o.status] || { label: o.status, color: "bg-white/10 text-white/60" };
                return (
                  <div key={o.id} className="p-3 rounded-xl bg-white/3 ring-1 ring-white/6 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/5 transition-all" onClick={() => setSelected(o)} data-testid={`row-topup-${o.id}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      {o.game?.coverImage
                        ? <img src={o.game.coverImage} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10" />
                        : <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Gamepad2 className="w-5 h-5 text-primary" /></div>
                      }
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-mono text-[10px] text-muted-foreground">{o.orderNumber}</span>
                          <Badge className={`${s.color} border-0 text-[10px]`}>{s.label}</Badge>
                        </div>
                        <p className="font-medium text-sm truncate">{o.customerName} <span className="text-muted-foreground text-xs">{o.customerPhone}</span></p>
                        {o.game && <p className="text-xs text-muted-foreground truncate">{o.game.nameAr} — {o.package?.amount}</p>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-primary text-sm">{o.totalAmount} ج</p>
                      <p className="text-[10px] text-muted-foreground">{fmtDate(o.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
      }

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.game?.coverImage && <img src={selected.game.coverImage} className="w-8 h-8 rounded-lg object-cover" />}
              طلب شحن — {selected?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              {/* Customer info */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/3 ring-1 ring-white/6">
                <InfoRow label="اسم العميل" value={selected.customerName} />
                <InfoRow label="رقم الهاتف" value={selected.customerPhone} mono />
                <InfoRow label="اللعبة" value={selected.game?.nameAr} />
                <InfoRow label="الباقة" value={selected.package?.amount} />
                <InfoRow label="Player ID" value={selected.playerId} mono />
                <InfoRow label="اسم اللاعب" value={selected.playerName} />
                <InfoRow label="المنطقة" value={selected.region} />
                <InfoRow label="طريقة تسجيل الدخول" value={selected.loginType} />
              </div>

              {/* Payment info */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/3 ring-1 ring-white/6">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">المبلغ الإجمالي</p>
                  <p className="text-lg font-bold text-primary">{selected.totalAmount} ج</p>
                </div>
                <InfoRow label="طريقة الدفع" value={selected.paymentMethod} />
                <InfoRow label="رقم المحول منه" value={selected.senderPhone} mono />
                <InfoRow label="ملاحظات" value={selected.notes} />
              </div>

              {/* Login credentials if account login */}
              {(selected.loginEmail || selected.loginPassword) && (
                <div className="p-3 rounded-xl bg-blue-500/5 ring-1 ring-blue-500/20 space-y-2">
                  <p className="text-xs font-bold text-blue-400">بيانات تسجيل الدخول</p>
                  <InfoRow label="الإيميل" value={selected.loginEmail} mono />
                  <InfoRow label="كلمة المرور" value={selected.loginPassword} mono />
                </div>
              )}

              {/* Payment proof */}
              {selected.paymentProofUrl && <ProofImage url={selected.paymentProofUrl} />}

              {/* Status update */}
              <div className="border-t border-white/6 pt-3">
                <p className="text-xs text-muted-foreground mb-2">تحديث الحالة</p>
                <div className="flex flex-wrap gap-2">
                  {["pending", "processing", "completed", "cancelled"].map(s => (
                    <Button key={s} size="sm" variant={selected.status === s ? "default" : "outline"}
                      onClick={() => { updateMut.mutate({ id: selected.id, status: s }); setSelected({ ...selected, status: s }); }}
                      disabled={updateMut.isPending} className="text-xs">
                      {gameStatusMap[s]?.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Chat + Delete */}
              <div className="flex gap-2 flex-col">
                {(() => {
                  const linked = linkedCustomer(selected);
                  if (linked) {
                    return (
                      <Button size="sm" variant="outline" className="w-full gap-2 border-primary/30 text-primary"
                        onClick={() => { setSelected(null); navigate(`/admin/support?customerId=${linked.id}`); }}>
                        <MessageCircle className="w-4 h-4" /> فتح دردشة العميل
                      </Button>
                    );
                  }
                  // Fallback: search by phone in customers list
                  const byPhone = customers.find((c: any) => c.phone === selected.customerPhone || c.phone?.replace(/\s/g, "") === selected.customerPhone?.replace(/\s/g, ""));
                  if (byPhone) {
                    return (
                      <Button size="sm" variant="outline" className="w-full gap-2 border-primary/30 text-primary"
                        onClick={() => { setSelected(null); navigate(`/admin/support?customerId=${byPhone.id}`); }}>
                        <MessageCircle className="w-4 h-4" /> فتح دردشة العميل
                      </Button>
                    );
                  }
                  return (
                    <Button size="sm" variant="outline" className="w-full gap-2 text-muted-foreground" disabled>
                      <MessageCircle className="w-4 h-4" /> لا يوجد حساب مسجل لهذا العميل
                    </Button>
                  );
                })()}
                <Button variant="destructive" size="sm" className="w-full" onClick={() => deleteMut.mutate(selected.id)} disabled={deleteMut.isPending}>
                  {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Trash2 className="w-4 h-4 ml-2" />} حذف الطلب
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab: Account Orders ─────────────────────────────────────────────────────

function AccountsTab({ search }: { search: string }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: orders = [], isLoading, refetch } = useQuery<any[]>({ queryKey: ["/api/admin/account-orders"], staleTime: 0, refetchInterval: 30_000 });
  const [selected, setSelected] = useState<any>(null);

  const confirmMut = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiRequest("POST", `/api/admin/account-orders/${id}/confirm-payment`, { notes }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/account-orders"] }); toast({ title: "✅ تم تأكيد الدفع" }); },
  });
  const deliverMut = useMutation({
    mutationFn: ({ id, credentials }: { id: string; credentials: string }) =>
      apiRequest("POST", `/api/admin/account-orders/${id}/deliver-credentials`, { credentials }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/account-orders"] }); toast({ title: "🔑 تم إرسال البيانات" }); },
  });
  const rejectMut = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiRequest("POST", `/api/admin/account-orders/${id}/reject`, { notes }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/account-orders"] }); toast({ title: "❌ تم الرفض" }); },
  });
  const payoutMut = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/account-orders/${id}/payout-sent`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/account-orders"] }); toast({ title: "💸 تم تسجيل التحويل" }); },
  });

  const [credInput, setCredInput] = useState("");
  const [notesInput, setNotesInput] = useState("");

  const filtered = orders.filter((o: any) => {
    const q = search.toLowerCase();
    return !q || o.orderNumber?.toLowerCase().includes(q) || o.customerName?.toLowerCase().includes(q) || o.customerPhone?.includes(q);
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/admin/account-orders")}>
          <Eye className="w-3.5 h-3.5" /> إدارة تفصيلية
        </Button>
      </div>

      {isLoading
        ? <div className="py-12 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        : filtered.length === 0
          ? <div className="py-12 text-center text-muted-foreground text-sm">لا توجد طلبات</div>
          : <div className="space-y-2">
              {filtered.map((o: any) => {
                const st = accountStatusMap[o.accountOrderStatus] || { label: o.accountOrderStatus, color: "bg-white/10 text-white/60" };
                return (
                  <div key={o.id} className="p-3 rounded-xl bg-white/3 ring-1 ring-white/6 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/5 transition-all"
                    onClick={() => { setSelected(o); setCredInput(""); setNotesInput(""); }}
                    data-testid={`row-account-${o.id}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      {o.account?.coverImage
                        ? <img src={o.account.coverImage} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10" />
                        : <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-amber-400" /></div>
                      }
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[10px] text-muted-foreground">{o.orderNumber}</span>
                          <Badge className={`${st.color} border-0 text-[10px]`}>{st.label}</Badge>
                        </div>
                        <p className="font-medium text-sm truncate">{o.customerName} <span className="text-muted-foreground text-xs">{o.customerPhone}</span></p>
                        {o.account && <p className="text-xs text-muted-foreground truncate">{o.account.title}</p>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-primary text-sm">{o.totalAmount} ج</p>
                      <p className="text-[10px] text-muted-foreground">{fmtDate(o.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
      }

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.account?.coverImage && <img src={selected.account.coverImage} className="w-8 h-8 rounded-lg object-cover" />}
              طلب حساب — {selected?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              {/* Status badge */}
              {(() => { const st = accountStatusMap[selected.accountOrderStatus]; return st ? <Badge className={`${st.color} border-0`}>{st.label}</Badge> : null; })()}

              {/* Account info */}
              {selected.account && (
                <div className="p-3 rounded-xl bg-amber-500/5 ring-1 ring-amber-500/15 space-y-2">
                  <p className="text-xs font-bold text-amber-400">بيانات الحساب</p>
                  <div className="flex gap-3 items-center">
                    {selected.account.coverImage && <img src={selected.account.coverImage} className="w-16 h-16 rounded-xl object-cover border border-white/10" />}
                    <div className="space-y-1">
                      <p className="font-medium">{selected.account.title}</p>
                      {selected.account.game && <p className="text-xs text-muted-foreground">{selected.account.game}</p>}
                      {selected.account.rank && <p className="text-xs text-muted-foreground">{selected.account.rank}</p>}
                    </div>
                  </div>
                  {selected.account.screenshots?.length > 0 && <ImageGallery images={selected.account.screenshots} label="صور الحساب" />}
                </div>
              )}

              {/* Buyer info */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/3 ring-1 ring-white/6">
                <InfoRow label="المشتري" value={selected.customerName} />
                <InfoRow label="رقم الهاتف" value={selected.customerPhone} mono />
                <InfoRow label="طريقة الدفع" value={selected.paymentMethod} />
                <InfoRow label="رقم المحول منه" value={selected.senderPhone} mono />
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">المبلغ الإجمالي</p>
                  <p className="text-lg font-bold text-primary">{selected.totalAmount} ج</p>
                </div>
              </div>

              {/* Payment proof */}
              {selected.paymentProofUrl && <ProofImage url={selected.paymentProofUrl} />}

              {/* Seller + commission */}
              {selected.sellerName && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/3 ring-1 ring-white/6">
                  <InfoRow label="البائع" value={selected.sellerName} />
                  <InfoRow label="هاتف البائع" value={selected.sellerPhone} mono />
                  <InfoRow label="سعر البيع" value={selected.sellerPrice ? `${selected.sellerPrice} ج` : null} />
                  <InfoRow label="عمولة المنصة" value={selected.platformCommission ? `${selected.platformCommission} ج` : null} />
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-white/6 pt-3 space-y-3">
                {selected.accountOrderStatus === "payment_review" && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-green-600/20 border-green-500/30 text-green-400" variant="outline"
                      onClick={() => { confirmMut.mutate({ id: selected.id, notes: notesInput }); setSelected({ ...selected, accountOrderStatus: "payment_confirmed" }); }}>
                      ✅ تأكيد الدفع
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1"
                      onClick={() => { rejectMut.mutate({ id: selected.id, notes: notesInput }); setSelected({ ...selected, accountOrderStatus: "rejected" }); }}>
                      ❌ رفض
                    </Button>
                  </div>
                )}
                {selected.accountOrderStatus === "payment_confirmed" && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">بيانات دخول الحساب للمشتري</p>
                    <Input value={credInput} onChange={e => setCredInput(e.target.value)} placeholder="الإيميل / كلمة المرور / رابط..." className="font-mono text-sm" />
                    <Button size="sm" className="w-full" disabled={!credInput || deliverMut.isPending}
                      onClick={() => { deliverMut.mutate({ id: selected.id, credentials: credInput }); setSelected({ ...selected, accountOrderStatus: "credentials_sent" }); }}>
                      {deliverMut.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null} 🔑 إرسال البيانات
                    </Button>
                  </div>
                )}
                {selected.accountOrderStatus === "buyer_confirmed" && (
                  <Button size="sm" className="w-full bg-purple-600/20 border-purple-500/30 text-purple-400" variant="outline"
                    onClick={() => { payoutMut.mutate(selected.id); setSelected({ ...selected, accountOrderStatus: "payout_sent" }); }}>
                    {payoutMut.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null} 💸 تسجيل تحويل للبائع
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab: Sardarb Orders ─────────────────────────────────────────────────────

function SardarbTab({ search }: { search: string }) {
  const { toast } = useToast();
  const { data: orders = [], isLoading, refetch } = useQuery<(SardarbOrder & { item?: SardarbItem })[]>({ queryKey: ["/api/admin/sardarb/orders"], staleTime: 0, refetchInterval: 30_000 });
  const [selected, setSelected] = useState<any>(null);
  const [codeInput, setCodeInput] = useState("");

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/sardarb/orders/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/sardarb/orders"] }); toast({ title: "تم التحديث" }); },
  });

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return !q || o.orderNumber?.toLowerCase().includes(q) || o.customerName?.toLowerCase().includes(q) || o.customerPhone?.includes(q);
  });

  return (
    <div className="space-y-3">
      <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>

      {isLoading
        ? <div className="py-12 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        : filtered.length === 0
          ? <div className="py-12 text-center text-muted-foreground text-sm">لا توجد طلبات سرداب</div>
          : <div className="space-y-2">
              {filtered.map(o => (
                <div key={o.id} className="p-3 rounded-xl bg-white/3 ring-1 ring-white/6 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/5 transition-all"
                  onClick={() => { setSelected(o); setCodeInput(o.deliveredCode || ""); }}
                  data-testid={`row-sardarb-${o.id}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    {(o as any).item?.image
                      ? <img src={(o as any).item.image} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10" />
                      : <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0"><ShoppingBag className="w-5 h-5 text-purple-400" /></div>
                    }
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[10px] text-muted-foreground">{o.orderNumber}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">{sardarbStatusMap[o.status] || o.status}</span>
                      </div>
                      <p className="font-medium text-sm">{o.customerName} <span className="text-muted-foreground text-xs">{o.customerPhone}</span></p>
                      {(o as any).item && <p className="text-xs text-muted-foreground">{(o as any).item.title} — {(o as any).item.category}</p>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-primary text-sm">{o.totalAmount} ج</p>
                    <p className="text-[10px] text-muted-foreground">{fmtDate(o.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
      }

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>طلب سرداب — {selected?.orderNumber}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              {/* Item */}
              {selected.item && (
                <div className="flex gap-3 p-3 rounded-xl bg-purple-500/5 ring-1 ring-purple-500/15">
                  {selected.item.image && <img src={selected.item.image} className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0" />}
                  <div className="space-y-1">
                    <p className="font-bold">{selected.item.title}</p>
                    <p className="text-xs text-muted-foreground">{selected.item.category}</p>
                    {selected.item.description && <p className="text-xs text-muted-foreground">{selected.item.description}</p>}
                  </div>
                </div>
              )}

              {/* Customer + payment */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/3 ring-1 ring-white/6">
                <InfoRow label="العميل" value={selected.customerName} />
                <InfoRow label="رقم الهاتف" value={selected.customerPhone} mono />
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">المبلغ</p>
                  <p className="text-lg font-bold text-primary">{selected.totalAmount} ج</p>
                </div>
                <InfoRow label="طريقة الدفع" value={selected.paymentMethod} />
                <InfoRow label="رقم المحول منه" value={selected.senderPhone} mono />
                <InfoRow label="ملاحظات" value={selected.notes} />
              </div>

              {/* Payment proof */}
              {selected.paymentProofUrl && <ProofImage url={selected.paymentProofUrl} />}

              {/* Actions */}
              {selected.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-green-600/20 border-green-500/30 text-green-400" variant="outline"
                    onClick={() => { updateMut.mutate({ id: selected.id, data: { status: "confirmed" } }); setSelected({ ...selected, status: "confirmed" }); }}>
                    ✅ تأكيد
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1"
                    onClick={() => { updateMut.mutate({ id: selected.id, data: { status: "cancelled" } }); setSelected({ ...selected, status: "cancelled" }); }}>
                    ❌ إلغاء
                  </Button>
                </div>
              )}

              {(selected.status === "confirmed" || selected.status === "pending") && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">إرسال كود التفعيل</p>
                  <div className="flex gap-2">
                    <Input value={codeInput} onChange={e => setCodeInput(e.target.value)} placeholder="الكود..." className="flex-1 font-mono text-sm" />
                    <Button size="sm" disabled={!codeInput || updateMut.isPending}
                      onClick={() => { updateMut.mutate({ id: selected.id, data: { status: "delivered", deliveredCode: codeInput } }); setSelected({ ...selected, status: "delivered", deliveredCode: codeInput }); }}>
                      إرسال
                    </Button>
                  </div>
                </div>
              )}

              {selected.deliveredCode && (
                <div className="p-3 rounded-xl bg-purple-500/5 ring-1 ring-purple-500/20">
                  <p className="text-[10px] text-muted-foreground mb-1">الكود المُرسل</p>
                  <p className="font-mono text-sm text-purple-300">{selected.deliveredCode}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab: Virtual Numbers ────────────────────────────────────────────────────

function VirtualNumbersTab({ search }: { search: string }) {
  const { toast } = useToast();
  const { data: orders = [], isLoading, refetch } = useQuery<(VirtualNumberOrder & { country?: VirtualNumberCountry })[]>({ queryKey: ["/api/admin/virtual-numbers/orders"], staleTime: 0, refetchInterval: 30_000 });
  const [selected, setSelected] = useState<any>(null);
  const [numInput, setNumInput] = useState("");
  const [otpInput, setOtpInput] = useState("");

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/virtual-numbers/orders/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/virtual-numbers/orders"] }); toast({ title: "تم التحديث" }); },
  });

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return !q || o.orderNumber?.toLowerCase().includes(q) || o.customerName?.toLowerCase().includes(q) || o.customerPhone?.includes(q);
  });

  return (
    <div className="space-y-3">
      <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>

      {isLoading
        ? <div className="py-12 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        : filtered.length === 0
          ? <div className="py-12 text-center text-muted-foreground text-sm">لا توجد طلبات أرقام فيك</div>
          : <div className="space-y-2">
              {filtered.map(o => (
                <div key={o.id} className="p-3 rounded-xl bg-white/3 ring-1 ring-white/6 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/5 transition-all"
                  onClick={() => { setSelected(o); setNumInput(o.virtualNumber || ""); setOtpInput(o.otpCode || ""); }}
                  data-testid={`row-vn-${o.id}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 text-xl">
                      {(o as any).country?.countryFlag || "📱"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[10px] text-muted-foreground">{o.orderNumber}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{vnStatusMap[o.status] || o.status}</span>
                      </div>
                      <p className="font-medium text-sm">{o.customerName} <span className="text-muted-foreground text-xs">{o.customerPhone}</span></p>
                      {(o as any).country && <p className="text-xs text-muted-foreground">{(o as any).country.countryFlag} {(o as any).country.countryName} ({(o as any).country.countryCode})</p>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-primary text-sm">{o.totalAmount} ج</p>
                    <p className="text-[10px] text-muted-foreground">{fmtDate(o.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
      }

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>رقم فيك — {selected?.orderNumber}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              {/* Country */}
              {selected.country && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 ring-1 ring-blue-500/15">
                  <span className="text-3xl">{selected.country.countryFlag}</span>
                  <div>
                    <p className="font-bold">{selected.country.countryName}</p>
                    <p className="text-xs text-muted-foreground">{selected.country.countryCode}</p>
                  </div>
                </div>
              )}

              {/* Customer + payment */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/3 ring-1 ring-white/6">
                <InfoRow label="العميل" value={selected.customerName} />
                <InfoRow label="رقم الهاتف" value={selected.customerPhone} mono />
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">المبلغ</p>
                  <p className="text-lg font-bold text-primary">{selected.totalAmount} ج</p>
                </div>
                <InfoRow label="طريقة الدفع" value={selected.paymentMethod} />
                <InfoRow label="رقم المحول منه" value={selected.senderPhone} mono />
                <InfoRow label="تطبيق الاستخدام" value={selected.usageApp} />
              </div>

              {/* Payment proof */}
              {selected.paymentProofUrl && <ProofImage url={selected.paymentProofUrl} />}

              {/* Delivered number */}
              {selected.virtualNumber && (
                <div className="p-3 rounded-xl bg-blue-500/5 ring-1 ring-blue-500/20">
                  <p className="text-[10px] text-muted-foreground mb-1">الرقم الفيك المُرسل</p>
                  <p className="font-mono text-base text-blue-300 font-bold" dir="ltr">{selected.virtualNumber}</p>
                </div>
              )}

              {selected.otpCode && (
                <div className="p-3 rounded-xl bg-purple-500/5 ring-1 ring-purple-500/20">
                  <p className="text-[10px] text-muted-foreground mb-1">كود OTP المُرسل</p>
                  <p className="font-mono text-base text-purple-300 font-bold">{selected.otpCode}</p>
                </div>
              )}

              {/* Actions */}
              {selected.status === "pending_payment" && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-green-600/20 border-green-500/30 text-green-400" variant="outline"
                    onClick={() => { updateMut.mutate({ id: selected.id, data: { status: "confirmed" } }); setSelected({ ...selected, status: "confirmed" }); }}>
                    ✅ تأكيد الدفع
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1"
                    onClick={() => { updateMut.mutate({ id: selected.id, data: { status: "cancelled" } }); setSelected({ ...selected, status: "cancelled" }); }}>
                    ❌ إلغاء
                  </Button>
                </div>
              )}

              {(selected.status === "confirmed" || selected.status === "pending_payment") && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">إرسال الرقم الفيك</p>
                  <div className="flex gap-2">
                    <Input value={numInput} onChange={e => setNumInput(e.target.value)} placeholder="+1 234 567 8901" dir="ltr" className="flex-1 font-mono text-sm" />
                    <Button size="sm" disabled={!numInput || updateMut.isPending}
                      onClick={() => { updateMut.mutate({ id: selected.id, data: { status: "number_sent", virtualNumber: numInput } }); setSelected({ ...selected, status: "number_sent", virtualNumber: numInput }); }}>
                      إرسال
                    </Button>
                  </div>
                </div>
              )}

              {selected.status === "code_requested" && (
                <div className="space-y-2">
                  <p className="text-xs text-purple-400 font-bold">⚡ العميل يطلب كود OTP</p>
                  <div className="flex gap-2">
                    <Input value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="123456" dir="ltr" className="flex-1 font-mono text-sm" />
                    <Button size="sm" disabled={!otpInput || updateMut.isPending}
                      onClick={() => { updateMut.mutate({ id: selected.id, data: { status: "code_sent", otpCode: otpInput } }); setSelected({ ...selected, status: "code_sent", otpCode: otpInput }); }}>
                      إرسال الكود
                    </Button>
                  </div>
                </div>
              )}

              {selected.status === "number_sent" && (
                <Button size="sm" className="w-full bg-green-600/20 border-green-500/30 text-green-400" variant="outline"
                  onClick={() => { updateMut.mutate({ id: selected.id, data: { status: "completed" } }); setSelected({ ...selected, status: "completed" }); }}>
                  🎉 إغلاق الطلب كمكتمل
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab: Broker Requests ────────────────────────────────────────────────────

function BrokerTab({ search }: { search: string }) {
  const { toast } = useToast();
  const { data: requests = [], isLoading, refetch } = useQuery<any[]>({ queryKey: ["/api/admin/broker/requests"], staleTime: 0, refetchInterval: 30_000 });
  const { data: offers = [] } = useQuery<any[]>({ queryKey: ["/api/admin/broker/offers"] });
  const [selected, setSelected] = useState<any>(null);
  const [credentials, setCredentials] = useState("");

  const updateReqMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/broker/requests/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/broker/requests"] }); toast({ title: "تم التحديث" }); },
  });

  const updateOfferMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/broker/offers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/broker/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/broker/requests"] });
      toast({ title: "تم التحديث" });
    },
  });

  const filtered = requests.filter((r: any) => {
    const q = search.toLowerCase();
    return !q || r.orderNumber?.toLowerCase().includes(q) || r.buyerName?.toLowerCase().includes(q) || r.buyerPhone?.includes(q) || r.gameName?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-3">
      <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>

      {isLoading
        ? <div className="py-12 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        : filtered.length === 0
          ? <div className="py-12 text-center text-muted-foreground text-sm">لا توجد طلبات خاصة</div>
          : <div className="space-y-2">
              {filtered.map((r: any) => {
                const reqOffers = offers.filter((o: any) => o.requestId === r.id);
                return (
                  <div key={r.id} className="p-3 rounded-xl bg-white/3 ring-1 ring-white/6 cursor-pointer hover:bg-white/5 transition-all"
                    onClick={() => { setSelected(r); setCredentials(""); }}
                    data-testid={`row-broker-${r.id}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">👑</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{r.orderNumber}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">{brokerStatusMap[r.status] || r.status}</span>
                        {reqOffers.length > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{reqOffers.length} عرض</span>}
                      </div>
                      <p className="font-bold text-primary text-sm">{r.minPrice?.toLocaleString()}—{r.maxPrice?.toLocaleString()} ج</p>
                    </div>
                    <p className="font-medium text-sm">{r.gameName} <span className="text-muted-foreground text-xs">— {r.buyerName}</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                    {/* Reference images preview */}
                    {r.referenceImages?.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {r.referenceImages.slice(0, 4).map((img: string, i: number) => (
                          <img key={i} src={img} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                        ))}
                        {r.referenceImages.length > 4 && <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-[10px] text-muted-foreground">+{r.referenceImages.length - 4}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
      }

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>طلب خاص 👑 — {selected?.orderNumber}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              {/* Buyer info */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/3 ring-1 ring-white/6">
                <InfoRow label="المشتري" value={selected.buyerName} />
                <InfoRow label="رقم الهاتف" value={selected.buyerPhone} mono />
                <InfoRow label="اللعبة المطلوبة" value={selected.gameName} />
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">نطاق السعر</p>
                  <p className="text-sm font-bold text-primary">{selected.minPrice?.toLocaleString()} — {selected.maxPrice?.toLocaleString()} ج</p>
                </div>
              </div>

              {/* Description */}
              <div className="p-3 rounded-xl bg-white/3 ring-1 ring-white/6">
                <p className="text-[10px] text-muted-foreground mb-1.5">وصف الطلب</p>
                <p className="text-sm leading-relaxed">{selected.description}</p>
              </div>

              {/* Commission & payment */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/3 ring-1 ring-white/6">
                <InfoRow label="إجمالي المدفوع" value={`${selected.totalPaid?.toLocaleString()} ج`} />
                <InfoRow label="نوع العمولة" value={selected.commissionType === "buyer_all" ? "المشتري يدفع الكل" : "مشترك"} />
                <InfoRow label="عمولة المشتري" value={`${selected.buyerCommission} ج`} />
                <InfoRow label="عمولة البائع" value={`${selected.sellerCommission} ج`} />
                <InfoRow label="طريقة الدفع" value={selected.paymentMethod} />
                <InfoRow label="رقم المحول منه" value={selected.senderPhone} mono />
              </div>

              {/* Payment proof */}
              {selected.paymentProofUrl && <ProofImage url={selected.paymentProofUrl} />}

              {/* Reference images */}
              {selected.referenceImages?.length > 0 && (
                <ImageGallery images={selected.referenceImages} label="صور مرجعية من المشتري" />
              )}

              {/* Admin notes */}
              {selected.adminNotes && (
                <div className="p-3 rounded-xl bg-orange-500/5 ring-1 ring-orange-500/20">
                  <p className="text-[10px] text-muted-foreground mb-1">ملاحظات الأدمن</p>
                  <p className="text-sm">{selected.adminNotes}</p>
                </div>
              )}

              {/* Actions */}
              {selected.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-green-600/20 border-green-500/30 text-green-400" variant="outline"
                    onClick={() => { updateReqMut.mutate({ id: selected.id, data: { status: "approved" } }); setSelected({ ...selected, status: "approved" }); }}>
                    ✅ اعتماد الطلب
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1"
                    onClick={() => { updateReqMut.mutate({ id: selected.id, data: { status: "cancelled" } }); setSelected({ ...selected, status: "cancelled" }); }}>
                    ❌ رفض
                  </Button>
                </div>
              )}

              {selected.status === "in_escrow" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">إرسال بيانات الحساب للمشتري</p>
                  <div className="flex gap-2">
                    <Input value={credentials} onChange={e => setCredentials(e.target.value)} placeholder="الإيميل / كلمة المرور / رابط..." className="flex-1 text-sm" />
                    <Button size="sm" disabled={!credentials || updateReqMut.isPending}
                      onClick={() => { updateReqMut.mutate({ id: selected.id, data: { status: "delivered", accountCredentials: credentials } }); setSelected({ ...selected, status: "delivered" }); }}>
                      تسليم
                    </Button>
                  </div>
                </div>
              )}

              {selected.status === "delivered" && (
                <Button size="sm" className="w-full bg-green-600/20 border-green-500/30 text-green-400" variant="outline"
                  onClick={() => { updateReqMut.mutate({ id: selected.id, data: { status: "completed" } }); setSelected({ ...selected, status: "completed" }); }}>
                  🎉 إغلاق كمكتمل
                </Button>
              )}

              {/* Offers */}
              {(() => {
                const reqOffers = offers.filter((o: any) => o.requestId === selected.id);
                if (!reqOffers.length) return null;
                return (
                  <div className="border-t border-white/8 pt-4">
                    <p className="text-xs font-bold text-muted-foreground mb-3">العروض المقدمة ({reqOffers.length})</p>
                    <div className="space-y-3">
                      {reqOffers.map((offer: any) => (
                        <div key={offer.id} className="p-3 rounded-xl bg-blue-500/5 ring-1 ring-blue-500/15 space-y-3">
                          {/* Offer header */}
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-sm">{offer.sellerName}</p>
                              <p className="text-xs text-muted-foreground" dir="ltr">{offer.sellerPhone}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-primary font-bold">{offer.sellerPrice?.toLocaleString()} ج</p>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10">{brokerStatusMap[offer.status] || offer.status}</span>
                            </div>
                          </div>

                          {/* Account details */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {offer.accountLevel && <div><p className="text-muted-foreground">المستوى</p><p className="font-medium">{offer.accountLevel}</p></div>}
                            {offer.accountRank  && <div><p className="text-muted-foreground">الرانك</p><p className="font-medium">{offer.accountRank}</p></div>}
                            {offer.accountSkins && <div className="col-span-2"><p className="text-muted-foreground">السكنات / المحتوى</p><p className="font-medium">{offer.accountSkins}</p></div>}
                            {offer.linkingType  && <div><p className="text-muted-foreground">نوع الربط</p><p className="font-medium">{offer.linkingType}</p></div>}
                          </div>

                          {/* Description */}
                          {offer.accountDescription && (
                            <p className="text-xs text-muted-foreground border-t border-white/6 pt-2">{offer.accountDescription}</p>
                          )}

                          {/* Account images */}
                          {offer.accountImages?.length > 0 && <ImageGallery images={offer.accountImages} label="صور الحساب" />}

                          {/* Account video */}
                          {offer.accountVideo && (
                            <a href={offer.accountVideo} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                              🎬 مشاهدة فيديو الحساب
                            </a>
                          )}

                          {/* Login credentials (visible after acceptance) */}
                          {offer.status === "accepted" && (offer.accountEmail || offer.accountPhone) && (
                            <div className="p-2 rounded-lg bg-green-500/5 ring-1 ring-green-500/20 text-xs space-y-1">
                              <p className="text-green-400 font-bold text-[10px]">بيانات الدخول</p>
                              {offer.accountEmail    && <p className="font-mono">{offer.accountEmail}</p>}
                              {offer.accountPhone    && <p className="font-mono" dir="ltr">{offer.accountPhone}</p>}
                              {offer.accountPassword && <p className="font-mono">{offer.accountPassword}</p>}
                            </div>
                          )}

                          {/* Offer actions */}
                          {offer.status === "pending_review" && (
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1 h-8 text-[11px] bg-green-600/20 border-green-500/30 text-green-400" variant="outline"
                                onClick={() => {
                                  updateOfferMut.mutate({ id: offer.id, data: { status: "accepted" } });
                                  updateReqMut.mutate({ id: selected.id, data: { status: "in_escrow", matchedOfferId: offer.id } });
                                }}>
                                ✅ قبول وبدء الضمان
                              </Button>
                              <Button size="sm" variant="destructive" className="h-8 text-[11px]"
                                onClick={() => updateOfferMut.mutate({ id: offer.id, data: { status: "rejected" } })}>
                                ❌ رفض
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Tab: All Orders Combined ────────────────────────────────────────────────

function AllTab({ search }: { search: string }) {
  const { data: gameOrders   = [], isLoading: l1 } = useQuery<any[]>({ queryKey: ["/api/orders"], staleTime: 0, refetchInterval: 30_000 });
  const { data: sardarbOrders = [], isLoading: l2 } = useQuery<any[]>({ queryKey: ["/api/admin/sardarb/orders"], staleTime: 0, refetchInterval: 30_000 });
  const { data: vnOrders     = [], isLoading: l3 } = useQuery<any[]>({ queryKey: ["/api/admin/virtual-numbers/orders"], staleTime: 0, refetchInterval: 30_000 });
  const { data: brokerReqs   = [], isLoading: l4 } = useQuery<any[]>({ queryKey: ["/api/admin/broker/requests"], staleTime: 0, refetchInterval: 30_000 });
  const { data: accountOrders = [], isLoading: l5 } = useQuery<any[]>({ queryKey: ["/api/admin/account-orders"], staleTime: 0, refetchInterval: 30_000 });

  const isLoading = l1 || l2 || l3 || l4 || l5;

  const unified = [
    ...gameOrders.filter(o => o.orderType !== "account_purchase").map(o => ({
      id: o.id, type: "topup" as const, label: "شحن ألعاب", color: "text-primary bg-primary/10",
      icon: o.game?.coverImage ? null : "🎮", img: o.game?.coverImage,
      number: o.orderNumber, name: o.customerName, phone: o.customerPhone,
      amount: o.totalAmount, status: gameStatusMap[o.status]?.label || o.status, date: o.createdAt,
      detail: o.game?.nameAr ? `${o.game.nameAr} — ${o.package?.amount || ""}` : "—",
    })),
    ...accountOrders.map((o: any) => ({
      id: o.id, type: "accounts" as const, label: "حساب", color: "text-amber-400 bg-amber-500/10",
      icon: o.account?.coverImage ? null : "👤", img: o.account?.coverImage,
      number: o.orderNumber, name: o.customerName, phone: o.customerPhone,
      amount: o.totalAmount, status: accountStatusMap[o.accountOrderStatus]?.label || o.accountOrderStatus, date: o.createdAt,
      detail: o.account?.title || "—",
    })),
    ...sardarbOrders.map((o: any) => ({
      id: o.id, type: "sardarb" as const, label: "سرداب", color: "text-purple-400 bg-purple-500/10",
      icon: (o as any).item?.image ? null : "🛒", img: (o as any).item?.image,
      number: o.orderNumber, name: o.customerName, phone: o.customerPhone,
      amount: o.totalAmount, status: sardarbStatusMap[o.status] || o.status, date: o.createdAt,
      detail: (o as any).item?.title || "—",
    })),
    ...vnOrders.map((o: any) => ({
      id: o.id, type: "vn" as const, label: "رقم فيك", color: "text-blue-400 bg-blue-500/10",
      icon: (o as any).country?.countryFlag || "📱", img: null,
      number: o.orderNumber, name: o.customerName, phone: o.customerPhone,
      amount: o.totalAmount, status: vnStatusMap[o.status] || o.status, date: o.createdAt,
      detail: (o as any).country ? `${(o as any).country.countryFlag} ${(o as any).country.countryName}` : "—",
    })),
    ...brokerReqs.map((r: any) => ({
      id: r.id, type: "broker" as const, label: "طلب خاص 👑", color: "text-yellow-400 bg-yellow-500/10",
      icon: "👑", img: null,
      number: r.orderNumber, name: r.buyerName, phone: r.buyerPhone,
      amount: r.maxPrice, status: brokerStatusMap[r.status] || r.status, date: r.createdAt,
      detail: r.gameName,
    })),
  ]
    .filter(o => {
      const q = search.toLowerCase();
      return !q || o.number?.toLowerCase().includes(q) || o.name?.toLowerCase().includes(q) || o.phone?.includes(q) || o.detail?.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  return (
    <div className="space-y-2">
      {isLoading
        ? <div className="py-12 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
        : unified.length === 0
          ? <div className="py-12 text-center text-muted-foreground text-sm">لا توجد طلبات</div>
          : unified.map(o => (
              <div key={`${o.type}-${o.id}`} className="p-3 rounded-xl bg-white/3 ring-1 ring-white/6 flex items-center gap-3" data-testid={`row-all-${o.type}-${o.id}`}>
                {o.img
                  ? <img src={o.img} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-white/10" />
                  : <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm shrink-0 ${o.color}`}>{o.icon}</div>
                }
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${o.color}`}>{o.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{o.number}</span>
                    <span className="text-[10px] text-muted-foreground">{o.status}</span>
                  </div>
                  <p className="font-medium text-sm truncate">{o.name} <span className="text-muted-foreground text-xs">{o.phone}</span></p>
                  <p className="text-xs text-muted-foreground truncate">{o.detail}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-primary text-sm">{o.amount?.toLocaleString()} ج</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDate(o.date)}</p>
                </div>
              </div>
            ))
      }
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function AllOrders() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [search, setSearch]       = useState("");

  const { data: gameOrders    = [] } = useQuery<any[]>({ queryKey: ["/api/orders"] });
  const { data: sardarbOrders = [] } = useQuery<any[]>({ queryKey: ["/api/admin/sardarb/orders"] });
  const { data: vnOrders      = [] } = useQuery<any[]>({ queryKey: ["/api/admin/virtual-numbers/orders"] });
  const { data: brokerReqs    = [] } = useQuery<any[]>({ queryKey: ["/api/admin/broker/requests"] });
  const { data: accountOrders = [] } = useQuery<any[]>({ queryKey: ["/api/admin/account-orders"] });

  const pendingCounts: Record<TabType, number> = {
    all:      0,
    topup:    gameOrders.filter((o: any)    => o.status === "pending" && o.orderType !== "account_purchase").length,
    accounts: accountOrders.filter((o: any) => ["payment_pending","payment_review"].includes(o.accountOrderStatus)).length,
    sardarb:  sardarbOrders.filter((o: any) => o.status === "pending").length,
    vn:       vnOrders.filter((o: any)      => ["pending_payment","code_requested"].includes(o.status)).length,
    broker:   brokerReqs.filter((r: any)    => r.status === "pending").length,
  };
  pendingCounts.all = Object.values(pendingCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4 md:space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold mb-1">جميع الطلبات</h1>
        <p className="text-sm text-muted-foreground">عرض وإدارة جميع أنواع الطلبات في مكان واحد</p>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث بالاسم أو الرقم..." className="pr-9 glass-input" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-all-orders" />
      </div>

      <div className="flex gap-1.5 flex-wrap glass-panel rounded-xl p-1.5">
        {TABS.map(tab => {
          const count    = pendingCounts[tab.key];
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all relative ${isActive ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}
              data-testid={`tab-${tab.key}`}>
              <tab.icon className={`w-3.5 h-3.5 ${isActive ? tab.color : ""}`} />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className="absolute -top-1 -left-1 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="glass-panel rounded-xl p-4">
        {activeTab === "all"      && <AllTab search={search} />}
        {activeTab === "topup"    && <TopupTab search={search} />}
        {activeTab === "accounts" && <AccountsTab search={search} />}
        {activeTab === "sardarb"  && <SardarbTab search={search} />}
        {activeTab === "vn"       && <VirtualNumbersTab search={search} />}
        {activeTab === "broker"   && <BrokerTab search={search} />}
      </div>
    </div>
  );
}
