import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Wallet, RefreshCw, Loader2, Check, X, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface WalletRequest {
  id: string | number;
  customerName: string;
  customerPhone: string;
  amount: number;
  paymentMethod: string;
  senderPhone?: string;
  status: string;
  paymentProofUrl?: string;
  adminNote?: string;
  createdAt: string | Date | null;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-500/15", text: "text-amber-400", label: "معلقة" },
  approved: { bg: "bg-green-500/15", text: "text-green-400", label: "مقبولة" },
  rejected: { bg: "bg-red-500/15", text: "text-red-400", label: "مرفوضة" },
};

const tabs = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "معلقة" },
  { key: "approved", label: "مقبولة" },
  { key: "rejected", label: "مرفوضة" },
];

export default function WalletRequests() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [rejectDialog, setRejectDialog] = useState<WalletRequest | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);

  const { data: requests = [], isLoading, refetch } = useQuery<WalletRequest[]>({
    queryKey: ["/api/admin/wallet-requests"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string | number) => {
      return apiRequest("PATCH", `/api/admin/wallet-requests/${id}`, { status: "approved" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet-requests"] });
      toast({ title: "تمت الموافقة", description: "تم قبول طلب الشحن بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل قبول الطلب", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, adminNote }: { id: string | number; adminNote: string }) => {
      return apiRequest("PATCH", `/api/admin/wallet-requests/${id}`, { status: "rejected", adminNote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet-requests"] });
      setRejectDialog(null);
      setAdminNote("");
      toast({ title: "تم الرفض", description: "تم رفض طلب الشحن" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل رفض الطلب", variant: "destructive" });
    },
  });

  const filtered = activeTab === "all" ? requests : requests.filter((r) => r.status === activeTab);

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold mb-1">طلبات شحن المحفظة</h1>
          <p className="text-sm text-muted-foreground">إدارة طلبات شحن المحفظة</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh-wallet">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
            data-testid={`tab-${tab.key}`}
          >
            {tab.label}
            {tab.key !== "all" && (
              <Badge variant="secondary" className="mr-1.5 text-[10px]">
                {requests.filter((r) => r.status === tab.key).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">لا توجد طلبات</p>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-2 p-3">
              {filtered.map((req) => (
                <div key={req.id} className="p-3 rounded-lg bg-white/3 ring-1 ring-white/6" data-testid={`card-wallet-${req.id}`}>
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <p className="font-medium text-sm">{req.customerName}</p>
                    <Badge className={`${statusConfig[req.status]?.bg} ${statusConfig[req.status]?.text} border-0 text-[10px]`} data-testid={`status-badge-${req.id}`}>
                      {statusConfig[req.status]?.label || req.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground mb-2">
                    <p>{req.customerPhone}</p>
                    <p>المبلغ: <span className="font-bold text-primary">{req.amount} ج</span></p>
                    <p>طريقة الدفع: {req.paymentMethod}</p>
                    {req.senderPhone && <p>رقم المرسل: {req.senderPhone}</p>}
                    <p>{formatDate(req.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {req.paymentProofUrl && (
                      <Button variant="outline" size="sm" onClick={() => setProofImage(req.paymentProofUrl!)} data-testid={`button-proof-${req.id}`}>
                        <ImageIcon className="w-3 h-3 ml-1" />
                        إثبات الدفع
                      </Button>
                    )}
                    {req.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600/80 hover:bg-green-600"
                          onClick={() => approveMutation.mutate(req.id)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${req.id}`}
                        >
                          <Check className="w-3 h-3 ml-1" />
                          قبول
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => { setRejectDialog(req); setAdminNote(""); }}
                          disabled={rejectMutation.isPending}
                          data-testid={`button-reject-${req.id}`}
                        >
                          <X className="w-3 h-3 ml-1" />
                          رفض
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">طريقة الدفع</TableHead>
                    <TableHead className="text-right">رقم المرسل</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((req) => (
                    <TableRow key={req.id} className="glass-table-row">
                      <TableCell className="font-medium text-sm">{req.customerName}</TableCell>
                      <TableCell className="text-sm">{req.customerPhone}</TableCell>
                      <TableCell>
                        <span className="font-bold text-primary">{req.amount} ج</span>
                      </TableCell>
                      <TableCell className="text-sm">{req.paymentMethod}</TableCell>
                      <TableCell className="text-sm">{req.senderPhone || "-"}</TableCell>
                      <TableCell>
                        <Badge className={`${statusConfig[req.status]?.bg} ${statusConfig[req.status]?.text} border-0`} data-testid={`status-badge-${req.id}`}>
                          {statusConfig[req.status]?.label || req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {req.paymentProofUrl && (
                            <Button variant="ghost" size="icon" onClick={() => setProofImage(req.paymentProofUrl!)} data-testid={`button-proof-${req.id}`}>
                              <ImageIcon className="w-4 h-4" />
                            </Button>
                          )}
                          {req.status === "pending" && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-green-400"
                                onClick={() => approveMutation.mutate(req.id)}
                                disabled={approveMutation.isPending}
                                data-testid={`button-approve-${req.id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-400"
                                onClick={() => { setRejectDialog(req); setAdminNote(""); }}
                                disabled={rejectMutation.isPending}
                                data-testid={`button-reject-${req.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>رفض الطلب</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رفض طلب شحن المحفظة؟ يمكنك إضافة ملاحظة (اختياري).
            </DialogDescription>
          </DialogHeader>
          {rejectDialog && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                <p>العميل: {rejectDialog.customerName}</p>
                <p>المبلغ: {rejectDialog.amount} ج</p>
              </div>
              <Textarea
                placeholder="سبب الرفض (اختياري)..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="resize-none"
                data-testid="input-reject-note"
              />
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" onClick={() => setRejectDialog(null)} data-testid="button-cancel-reject">
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => rejectMutation.mutate({ id: rejectDialog.id, adminNote })}
                  disabled={rejectMutation.isPending}
                  data-testid="button-confirm-reject"
                >
                  {rejectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
                  تأكيد الرفض
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!proofImage} onOpenChange={() => setProofImage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إثبات الدفع</DialogTitle>
            <DialogDescription>صورة إثبات الدفع المرفقة مع الطلب</DialogDescription>
          </DialogHeader>
          {proofImage && (
            <div className="flex justify-center">
              <img
                src={proofImage}
                alt="إثبات الدفع"
                className="max-w-full max-h-[60vh] rounded-lg object-contain"
                data-testid="img-payment-proof"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}