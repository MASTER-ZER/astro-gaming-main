import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Loader2, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight,
  User, Gamepad2, DollarSign, Send, Key, Phone, ZoomIn, Clock
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  payment_pending:   { label: "انتظار الدفع",        color: "bg-yellow-500/20 text-yellow-400 border-0" },
  payment_review:    { label: "مراجعة الدفع",         color: "bg-orange-500/20 text-orange-400 border-0" },
  payment_confirmed: { label: "تأكيد الدفع",          color: "bg-blue-500/20 text-blue-400 border-0" },
  credentials_sent:  { label: "تم إرسال البيانات",    color: "bg-purple-500/20 text-purple-400 border-0" },
  completed:         { label: "مكتمل",                color: "bg-green-500/20 text-green-400 border-0" },
  cancelled:         { label: "ملغي",                 color: "bg-red-500/20 text-red-400 border-0" },
};

const PAYOUT_MAP: Record<string, { label: string; color: string }> = {
  pending_confirmation: { label: "قيد التأكيد",       color: "bg-yellow-500/20 text-yellow-400 border-0" },
  ready_for_payout:     { label: "جاهز للصرف",        color: "bg-blue-500/20 text-blue-400 border-0" },
  info_received:        { label: "تم استلام البيانات", color: "bg-purple-500/20 text-purple-400 border-0" },
  payout_sent:          { label: "تم الصرف",          color: "bg-green-500/20 text-green-400 border-0" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status];
  if (!s) return <Badge variant="secondary">{status}</Badge>;
  return <Badge className={s.color}>{s.label}</Badge>;
}

function PayoutBadge({ status }: { status: string }) {
  const s = PAYOUT_MAP[status];
  if (!s) return null;
  return <Badge className={s.color}>{s.label}</Badge>;
}

function ProofImage({ url }: { url: string }) {
  const [zoom, setZoom] = useState(false);
  return (
    <>
      <div className="relative rounded-xl overflow-hidden cursor-zoom-in" onClick={() => setZoom(true)}>
        <img src={url} alt="proof" className="w-full h-40 object-cover" />
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <ZoomIn className="w-6 h-6 text-white" />
        </div>
      </div>
      {zoom && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoom(false)}
        >
          <img src={url} alt="proof-zoom" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </>
  );
}

export default function AdminAccountOrders() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [credentials, setCredentials] = useState("");
  const [notes, setNotes] = useState("");

  const { data: allOrders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/account-orders"],
    refetchInterval: 10000,
  });

  const filtered = activeTab === "all"
    ? allOrders
    : activeTab === "needs_action"
    ? allOrders.filter(o => o.accountOrderStatus === "payment_pending" || o.accountOrderStatus === "payment_review" || o.accountOrderStatus === "payment_confirmed")
    : activeTab === "payout"
    ? allOrders.filter(o => o.payoutStatus && o.payoutStatus !== "payout_sent")
    : allOrders.filter(o => o.accountOrderStatus === activeTab);

  const confirmPaymentMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/account-orders/${id}/confirm-payment`, { notes }),
    onSuccess: () => {
      toast({ title: "تم تأكيد الدفع" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/account-orders"] });
      setSelected((prev: any) => prev ? { ...prev, accountOrderStatus: "payment_confirmed" } : prev);
      setNotes("");
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const deliverCredentialsMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/account-orders/${id}/deliver-credentials`, { credentials }),
    onSuccess: () => {
      toast({ title: "تم إرسال البيانات للعميل" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/account-orders"] });
      setSelected((prev: any) => prev ? { ...prev, accountOrderStatus: "credentials_sent", credentialsDelivered: credentials } : prev);
      setCredentials("");
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/account-orders/${id}/reject`, { notes }),
    onSuccess: () => {
      toast({ title: "تم إلغاء الطلب" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/account-orders"] });
      setSelected((prev: any) => prev ? { ...prev, accountOrderStatus: "cancelled" } : prev);
      setNotes("");
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const payoutSentMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/account-orders/${id}/payout-sent`, {}),
    onSuccess: () => {
      toast({ title: "تم تسجيل الصرف" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/account-orders"] });
      setSelected((prev: any) => prev ? { ...prev, payoutStatus: "payout_sent" } : prev);
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const tabCounts = {
    all: allOrders.length,
    needs_action: allOrders.filter(o => o.accountOrderStatus === "payment_pending" || o.accountOrderStatus === "payment_review" || o.accountOrderStatus === "payment_confirmed").length,
    payout: allOrders.filter(o => o.payoutStatus && o.payoutStatus !== "payout_sent").length,
    completed: allOrders.filter(o => o.accountOrderStatus === "completed").length,
    cancelled: allOrders.filter(o => o.accountOrderStatus === "cancelled").length,
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Gamepad2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-black">طلبات شراء الحسابات</h1>
          <p className="text-sm text-muted-foreground">{allOrders.length} طلب</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/20 p-1">
          <TabsTrigger value="all" className="text-xs gap-1">
            الكل {tabCounts.all > 0 && <Badge className="h-4 min-w-4 px-1 bg-primary/20 text-primary border-0 text-[9px]">{tabCounts.all}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="needs_action" className="text-xs gap-1">
            تحتاج إجراء {tabCounts.needs_action > 0 && <Badge className="h-4 min-w-4 px-1 bg-orange-500/20 text-orange-400 border-0 text-[9px]">{tabCounts.needs_action}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="payout" className="text-xs gap-1">
            صرف البائع {tabCounts.payout > 0 && <Badge className="h-4 min-w-4 px-1 bg-blue-500/20 text-blue-400 border-0 text-[9px]">{tabCounts.payout}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="credentials_sent" className="text-xs">تم إرسال البيانات</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">مكتمل</TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs">ملغي</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Gamepad2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>لا توجد طلبات</p>
            </div>
          ) : (
            <Card className="overflow-hidden border-white/6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/6">
                      <TableHead className="text-right">الطلب</TableHead>
                      <TableHead className="text-right">العميل</TableHead>
                      <TableHead className="text-right">الحساب</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">صرف البائع</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((order) => (
                      <TableRow key={order.id} className="border-white/6 hover:bg-white/2 cursor-pointer" onClick={() => setSelected(order)}>
                        <TableCell className="font-mono text-xs text-muted-foreground">#{order.id.slice(-6)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className="text-sm">{order.customer?.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{order.account?.title || "—"}</TableCell>
                        <TableCell className="font-bold text-primary">{order.totalPrice} ج</TableCell>
                        <TableCell><StatusBadge status={order.accountOrderStatus || "payment_pending"} /></TableCell>
                        <TableCell>{order.payoutStatus ? <PayoutBadge status={order.payoutStatus} /> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString("ar-EG") : "—"}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setSelected(order); }}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {selected && (
        <Dialog open onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تفاصيل طلب #{selected.id.slice(-6)}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <StatusBadge status={selected.accountOrderStatus || "payment_pending"} />
                {selected.payoutStatus && <PayoutBadge status={selected.payoutStatus} />}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/20 rounded-xl p-3">
                  <p className="text-[11px] text-muted-foreground mb-1">العميل</p>
                  <p className="font-semibold text-sm">{selected.customer?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{selected.customer?.phone || "—"}</p>
                </div>
                <div className="bg-muted/20 rounded-xl p-3">
                  <p className="text-[11px] text-muted-foreground mb-1">الحساب</p>
                  <p className="font-semibold text-sm">{selected.account?.title || "—"}</p>
                  <p className="text-xs text-muted-foreground">{selected.account?.game?.name || "—"}</p>
                </div>
                <div className="bg-muted/20 rounded-xl p-3">
                  <p className="text-[11px] text-muted-foreground mb-1">المبلغ المدفوع</p>
                  <p className="font-bold text-lg text-primary">{selected.totalPrice} ج</p>
                </div>
                <div className="bg-muted/20 rounded-xl p-3">
                  <p className="text-[11px] text-muted-foreground mb-1">مستحق البائع</p>
                  <p className="font-bold text-lg text-green-400">{Math.floor((selected.account?.price || selected.totalPrice) * 0.96)} ج</p>
                </div>
              </div>

              {selected.senderPhone && (
                <div className="bg-muted/20 rounded-xl p-3 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">هاتف المرسل</p>
                    <p className="font-mono text-sm">{selected.senderPhone}</p>
                  </div>
                </div>
              )}

              {selected.paymentProofUrl && (
                <div>
                  <p className="text-sm font-medium mb-2">إيصال الدفع</p>
                  <ProofImage url={selected.paymentProofUrl} />
                </div>
              )}

              {selected.credentialsDelivered && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-green-400" />
                    <p className="text-sm font-semibold text-green-400">بيانات الحساب المُسلَّمة</p>
                  </div>
                  <p className="text-sm font-mono bg-black/30 rounded-lg p-2 whitespace-pre-wrap">{selected.credentialsDelivered}</p>
                </div>
              )}

              {selected.vodafoneCashNumber && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="w-4 h-4 text-blue-400" />
                    <p className="text-sm font-semibold text-blue-400">رقم فودافون كاش للصرف</p>
                  </div>
                  <p className="font-mono text-sm">{selected.vodafoneCashNumber}</p>
                </div>
              )}

              {selected.notes && (
                <div className="bg-muted/20 rounded-xl p-3">
                  <p className="text-[11px] text-muted-foreground mb-1">ملاحظات</p>
                  <p className="text-sm">{selected.notes}</p>
                </div>
              )}

              <div className="border-t border-white/6 pt-4 space-y-3">
                {(selected.accountOrderStatus === "payment_pending" || selected.accountOrderStatus === "payment_review") && (
                  <>
                    <div>
                      <Label className="text-sm mb-1.5 block">ملاحظة (اختياري)</Label>
                      <Textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="ملاحظة للعميل..."
                        className="h-16 text-sm resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 glow-gold"
                        onClick={() => confirmPaymentMutation.mutate(selected.id)}
                        disabled={confirmPaymentMutation.isPending}
                      >
                        {confirmPaymentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 ml-1" />}
                        تأكيد الدفع
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => rejectMutation.mutate(selected.id)}
                        disabled={rejectMutation.isPending}
                      >
                        {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 ml-1" />}
                        إلغاء الطلب
                      </Button>
                    </div>
                  </>
                )}

                {selected.accountOrderStatus === "payment_confirmed" && (
                  <div className="space-y-2">
                    <Label className="text-sm">بيانات تسليم الحساب</Label>
                    <Textarea
                      value={credentials}
                      onChange={e => setCredentials(e.target.value)}
                      placeholder="الإيميل / كلمة المرور / كود التأكيد..."
                      className="h-24 text-sm resize-none font-mono"
                    />
                    <Button
                      className="w-full glow-gold"
                      onClick={() => deliverCredentialsMutation.mutate(selected.id)}
                      disabled={deliverCredentialsMutation.isPending || !credentials.trim()}
                    >
                      {deliverCredentialsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
                      إرسال البيانات للعميل
                    </Button>
                  </div>
                )}

                {selected.vodafoneCashNumber && selected.payoutStatus && selected.payoutStatus !== "payout_sent" && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => payoutSentMutation.mutate(selected.id)}
                    disabled={payoutSentMutation.isPending}
                  >
                    {payoutSentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4 ml-1" />}
                    تم صرف المبلغ للبائع
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
