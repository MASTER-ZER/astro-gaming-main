import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight, Phone, User, Gamepad2, Link2, MessageCircle, KeyRound, DollarSign } from "lucide-react";

const LINKING_LABELS: Record<string, string> = {
  email: "إيميل",
  facebook: "فيسبوك",
  google: "جوجل",
  phone: "رقم هاتف",
  apple: "Apple ID",
  other: "أخرى",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") return <Badge className="bg-yellow-500/20 text-yellow-500 border-0">قيد المراجعة</Badge>;
  if (status === "approved") return <Badge className="bg-green-500/20 text-green-500 border-0">مقبول</Badge>;
  if (status === "rejected") return <Badge className="bg-red-500/20 text-red-500 border-0">مرفوض</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

function ImageSlider({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  if (!images || images.length === 0) return (
    <div className="h-48 rounded-xl bg-muted flex items-center justify-center text-muted-foreground text-sm">لا توجد صور</div>
  );
  return (
    <div className="relative">
      <img src={images[idx]} alt="" className="w-full h-48 object-cover rounded-xl" />
      {images.length > 1 && (
        <>
          <button
            onClick={() => setIdx(p => (p - 1 + images.length) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => setIdx(p => (p + 1) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface CustomerInfo { id: string; name?: string; username?: string; phone?: string; }

export default function AdminSellRequests() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [activeTab, setActiveTab] = useState("pending");

  const { data: allRequests = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/account-sell-requests"],
    refetchInterval: 15000,
  });

  const { data: allCustomers = [] } = useQuery<CustomerInfo[]>({
    queryKey: ["/api/admin/customers"],
    select: (data: any[]) => data.map(c => ({ id: c.id, name: c.name, username: c.username, phone: c.phone })),
  });

  const customerByPhone = allCustomers.reduce<Record<string, CustomerInfo>>((acc, c) => {
    if (c.phone && !c.phone.startsWith("google_")) acc[c.phone] = c;
    return acc;
  }, {});

  const pendingRequests = allRequests.filter(r => r.status === "pending");
  const approvedRequests = allRequests.filter(r => r.status === "approved");
  const rejectedRequests = allRequests.filter(r => r.status === "rejected");

  const approveMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) =>
      apiRequest("PUT", `/api/account-sell-requests/${id}/approve`, { adminNote: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account-sell-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setSelectedRequest(null);
      setAdminNote("");
      setActionType(null);
      toast({ title: "تم القبول", description: "تم قبول الطلب وإضافة الحساب للمتجر" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل قبول الطلب", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) =>
      apiRequest("PUT", `/api/account-sell-requests/${id}/reject`, { adminNote: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account-sell-requests"] });
      setSelectedRequest(null);
      setAdminNote("");
      setActionType(null);
      toast({ title: "تم الرفض", description: "تم رفض الطلب" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل رفض الطلب", variant: "destructive" }),
  });

  const sellerPaidMutation = useMutation({
    mutationFn: async (accountId: string) =>
      apiRequest("PUT", `/api/accounts/${accountId}/seller-paid`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/account-sell-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      if (selectedRequest) {
        setSelectedRequest({ ...selectedRequest, sellerPaid: true });
      }
      toast({ title: "تم التأكيد", description: "تم تسجيل دفع البائع وإرسال إشعار له" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل تسجيل الدفع", variant: "destructive" }),
  });

  const handleAction = () => {
    if (!selectedRequest || !actionType) return;
    if (actionType === "approve") {
      approveMutation.mutate({ id: selectedRequest.id, note: adminNote });
    } else {
      rejectMutation.mutate({ id: selectedRequest.id, note: adminNote });
    }
  };

  const openAction = (request: any, type: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(type);
    setAdminNote("");
  };

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  const sellerPrice = selectedRequest?.requestedPrice || 0;
  const buyerPays = Math.ceil(sellerPrice * 1.03);
  const sellerReceives = Math.floor(sellerPrice * 0.98);

  const RequestTable = ({ requests }: { requests: any[] }) => (
    <>
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد طلبات</p>
        ) : requests.map((req) => (
          <Card key={req.id} className="p-4">
            <div className="flex gap-3">
              {req.images && req.images[0] && (
                <img src={req.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-sm truncate">{req.title}</p>
                  <StatusBadge status={req.status} />
                </div>
                <p className="text-xs text-muted-foreground mb-1">{(req as any).gameType || req.game?.nameAr}</p>
                <p className="text-xs text-muted-foreground">{req.sellerName} • {req.sellerPhone}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-primary text-sm">{req.requestedPrice} ج</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedRequest(req)} data-testid={`button-view-request-${req.id}`}>
                      <Eye className="w-3 h-3" />
                    </Button>
                    {req.status === "pending" && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAction(req, "approve")} data-testid={`button-approve-request-${req.id}`}>
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAction(req, "reject")} data-testid={`button-reject-request-${req.id}`}>
                          <XCircle className="w-3 h-3 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الصورة</TableHead>
              <TableHead className="text-right">البائع</TableHead>
              <TableHead className="text-right">العنوان</TableHead>
              <TableHead className="text-right">اللعبة</TableHead>
              <TableHead className="text-right">نوع الربط</TableHead>
              <TableHead className="text-right">السعر المطلوب</TableHead>
              <TableHead className="text-right">يصل للبائع</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">لا توجد طلبات</TableCell>
              </TableRow>
            ) : requests.map((req) => {
              const sReceives = Math.floor(req.requestedPrice * 0.98);
              return (
                <TableRow key={req.id}>
                  <TableCell>
                    {req.images && req.images[0] ? (
                      <img src={req.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <Gamepad2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{req.sellerName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {req.sellerPhone}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px]">
                    <p className="truncate">{req.title}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {req.game?.icon && <span>{req.game.icon}</span>}
                      <span className="text-sm">{(req as any).gameType || req.game?.nameAr}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{LINKING_LABELS[req.linkingMethod] || req.linkingMethod}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-primary">{req.requestedPrice} ج</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-green-500">{sReceives} ج</span>
                  </TableCell>
                  <TableCell><StatusBadge status={req.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(req)} data-testid={`button-view-request-${req.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {req.status === "pending" && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openAction(req, "approve")} data-testid={`button-approve-request-${req.id}`}>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openAction(req, "reject")} data-testid={`button-reject-request-${req.id}`}>
                            <XCircle className="w-4 h-4 text-red-500" />
                          </Button>
                        </>
                      )}
                      <a href={`https://wa.me/${req.sellerPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" data-testid={`button-whatsapp-${req.id}`}>
                          <MessageCircle className="w-4 h-4 text-green-500" />
                        </Button>
                      </a>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold mb-1">طلبات بيع الحسابات</h1>
        <p className="text-sm text-muted-foreground">مراجعة وقبول أو رفض طلبات البائعين</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-black text-yellow-500">{pendingRequests.length}</p>
          <p className="text-xs text-muted-foreground mt-1">قيد المراجعة</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-black text-green-500">{approvedRequests.length}</p>
          <p className="text-xs text-muted-foreground mt-1">مقبول</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-black text-red-500">{rejectedRequests.length}</p>
          <p className="text-xs text-muted-foreground mt-1">مرفوض</p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="pending" data-testid="tab-pending">
            قيد المراجعة {pendingRequests.length > 0 && <span className="mr-1.5 bg-yellow-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{pendingRequests.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="approved" data-testid="tab-approved">مقبول</TabsTrigger>
          <TabsTrigger value="rejected" data-testid="tab-rejected">مرفوض</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <RequestTable requests={pendingRequests} />
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <RequestTable requests={approvedRequests} />
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <RequestTable requests={rejectedRequests} />
        </TabsContent>
      </Tabs>

      {/* View Details Dialog */}
      {selectedRequest && !actionType && (
        <Dialog open={true} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تفاصيل طلب البيع</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <ImageSlider images={selectedRequest.images || []} />

              {(() => {
                const linked = customerByPhone[selectedRequest.sellerPhone];
                return linked ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/15">
                    <User className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-muted-foreground">حساب المتجر: </span>
                      <span className="text-sm font-medium">{linked.name || linked.username}</span>
                      {linked.username && <span className="text-xs text-primary/70 mr-1">@{linked.username}</span>}
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 shrink-0" onClick={() => { setSelectedRequest(null); navigate(`/admin/support?customerId=${linked.id}`); }} data-testid="button-open-chat-from-sell-request">
                      <MessageCircle className="w-3.5 h-3.5" />
                      دردشة
                    </Button>
                  </div>
                ) : null;
              })()}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/40 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><User className="w-3 h-3" /> البائع</p>
                  <p className="font-medium text-sm">{selectedRequest.sellerName}</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> واتساب</p>
                  <a href={`https://wa.me/${selectedRequest.sellerPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-green-500 hover:underline">
                    {selectedRequest.sellerPhone}
                  </a>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Gamepad2 className="w-3 h-3" /> اللعبة</p>
                  <p className="font-medium text-sm flex items-center gap-1">
                    {selectedRequest.game?.icon && <span>{selectedRequest.game.icon}</span>}
                    {(selectedRequest as any).gameType || selectedRequest.game?.nameAr}
                  </p>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Link2 className="w-3 h-3" /> نوع الربط</p>
                  <p className="font-medium text-sm">{LINKING_LABELS[selectedRequest.linkingMethod] || selectedRequest.linkingMethod}</p>
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">العنوان</p>
                <p className="font-medium">{selectedRequest.title}</p>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl">
                <p className="text-xs text-muted-foreground mb-2">الوصف</p>
                <p className="text-sm whitespace-pre-wrap">{selectedRequest.description}</p>
              </div>

              {selectedRequest.accountCredentials && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                  <p className="text-xs text-amber-400 mb-2 flex items-center gap-1">
                    <KeyRound className="w-3 h-3" />
                    بيانات دخول الحساب (سرية)
                  </p>
                  <pre className="text-sm whitespace-pre-wrap font-mono text-amber-300">{selectedRequest.accountCredentials}</pre>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-primary/10 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground mb-1">السعر المطلوب</p>
                  <p className="font-black text-primary">{selectedRequest.requestedPrice} ج</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground mb-1">يصل للبائع</p>
                  <p className="font-black text-green-500">{Math.floor(selectedRequest.requestedPrice * 0.98)} ج</p>
                </div>
                <div className="p-3 bg-cyan-500/10 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground mb-1">يدفع المشتري</p>
                  <p className="font-black text-cyan-500">{Math.ceil(selectedRequest.requestedPrice * 1.03)} ج</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={selectedRequest.status} />
                {selectedRequest.isSold && (
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">✅ مباع</span>
                )}
                {selectedRequest.isSold && (
                  selectedRequest.sellerPaid
                    ? <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1"><DollarSign className="w-3 h-3" />تم الدفع للبائع</span>
                    : <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">⏳ لم يُدفع للبائع بعد</span>
                )}
              </div>

              {selectedRequest.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1 bg-green-500 hover:bg-green-600" onClick={() => { setActionType("approve"); setAdminNote(""); }} data-testid="button-open-approve">
                    <CheckCircle className="w-4 h-4 ml-2" />
                    قبول الطلب
                  </Button>
                  <Button className="flex-1" variant="destructive" onClick={() => { setActionType("reject"); setAdminNote(""); }} data-testid="button-open-reject">
                    <XCircle className="w-4 h-4 ml-2" />
                    رفض الطلب
                  </Button>
                </div>
              )}

              {selectedRequest.isSold && !selectedRequest.sellerPaid && selectedRequest.approvedAccountId && (
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => sellerPaidMutation.mutate(selectedRequest.approvedAccountId)}
                  disabled={sellerPaidMutation.isPending}
                  data-testid="button-mark-seller-paid"
                >
                  {sellerPaidMutation.isPending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <DollarSign className="w-4 h-4 ml-2" />}
                  تأكيد دفع البائع ({Math.floor(selectedRequest.requestedPrice * 0.98)} ج)
                </Button>
              )}

              {selectedRequest.adminNote && (
                <div className="p-3 bg-muted/40 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">ملاحظة الإدارة</p>
                  <p className="text-sm">{selectedRequest.adminNote}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Action Confirm Dialog */}
      {selectedRequest && actionType && (
        <Dialog open={true} onOpenChange={() => { setActionType(null); setAdminNote(""); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{actionType === "approve" ? "✅ قبول الطلب" : "❌ رفض الطلب"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-xl">
                <p className="font-medium text-sm">{selectedRequest.title}</p>
                <p className="text-xs text-muted-foreground">{selectedRequest.sellerName} • {selectedRequest.sellerPhone}</p>
              </div>

              {actionType === "approve" && (
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <p className="text-xs text-muted-foreground">سعر البائع</p>
                    <p className="font-bold text-primary">{sellerPrice} ج</p>
                  </div>
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <p className="text-xs text-muted-foreground">يصله</p>
                    <p className="font-bold text-green-500">{sellerReceives} ج</p>
                  </div>
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <p className="text-xs text-muted-foreground">سعر المشتري</p>
                    <p className="font-bold text-cyan-500">{buyerPays} ج</p>
                  </div>
                </div>
              )}

              <div>
                <Label className="mb-1.5 block">ملاحظة (اختياري)</Label>
                <Textarea
                  placeholder={actionType === "approve" ? "سيتم إضافة الحساب للمتجر..." : "سبب الرفض..."}
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  data-testid="input-admin-note"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  className={`flex-1 ${actionType === "approve" ? "bg-green-500 hover:bg-green-600" : ""}`}
                  variant={actionType === "reject" ? "destructive" : "default"}
                  onClick={handleAction}
                  disabled={isPending}
                  data-testid="button-confirm-action"
                >
                  {isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                  {actionType === "approve" ? "تأكيد القبول" : "تأكيد الرفض"}
                </Button>
                <Button variant="outline" onClick={() => { setActionType(null); setAdminNote(""); }} className="flex-1" data-testid="button-cancel-action">
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
