import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Package, Search, RefreshCw, Eye, Trash2, Loader2, MessageCircle, User } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { Order, Game, Package as PackageType } from "@shared/schema";

type OrderWithDetails = Order & {
  game?: Game;
  package?: PackageType;
};

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-500/15", text: "text-amber-400", label: "قيد الانتظار" },
  processing: { bg: "bg-blue-500/15", text: "text-blue-400", label: "جاري التنفيذ" },
  completed: { bg: "bg-green-500/15", text: "text-green-400", label: "مكتمل" },
  cancelled: { bg: "bg-red-500/15", text: "text-red-400", label: "ملغي" },
};

interface CustomerInfo { id: string; name?: string; username?: string; phone?: string; }

export default function AdminOrders() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);

  const { data: allCustomers = [] } = useQuery<CustomerInfo[]>({
    queryKey: ["/api/admin/customers"],
    select: (data: any[]) => data.map(c => ({ id: c.id, name: c.name, username: c.username, phone: c.phone })),
  });

  const customerByPhone = allCustomers.reduce<Record<string, CustomerInfo>>((acc, c) => {
    if (c.phone && !c.phone.startsWith("google_")) acc[c.phone] = c;
    return acc;
  }, {});

  const { data: orders = [], isLoading, refetch } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/orders/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/stats"] });
      toast({ title: "تم التحديث", description: "تم تحديث حالة الطلب بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل تحديث حالة الطلب", variant: "destructive" });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/stats"] });
      setSelectedOrder(null);
      toast({ title: "تم الحذف", description: "تم حذف الطلب بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل حذف الطلب", variant: "destructive" });
    },
  });

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const isTopup = order.orderType === "topup";
    return matchesSearch && matchesStatus && isTopup;
  });

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
      <div>
        <h1 className="text-xl md:text-2xl font-bold mb-1">إدارة الطلبات</h1>
        <p className="text-sm text-muted-foreground">عرض وإدارة جميع الطلبات</p>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-3 md:p-4 border-b border-white/6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  className="pr-9 w-full sm:w-40 md:w-48 glass-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-orders"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28 md:w-32" data-testid="select-status-filter">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                  <SelectItem value="processing">جاري التنفيذ</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">لا توجد طلبات</p>
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-2 p-3">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="p-3 rounded-lg bg-white/3 ring-1 ring-white/6 mobile-touch-feedback" onClick={() => setSelectedOrder(order)} data-testid={`card-order-${order.id}`}>
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">{order.orderNumber}</span>
                      <Badge className={`${statusColors[order.status]?.bg} ${statusColors[order.status]?.text} border-0 text-[10px]`}>
                        {statusColors[order.status]?.label || order.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <div>
                        <p className="font-medium text-sm">{order.customerName}</p>
                        <p className="text-[10px] text-muted-foreground">{order.customerPhone}</p>
                      </div>
                      <span className="font-bold text-primary text-sm">{order.totalAmount} ج</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>
                ))}
              </div>
              
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رقم الطلب</TableHead>
                      <TableHead className="text-right">العميل</TableHead>
                      <TableHead className="text-right">التفاصيل</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id} className="glass-table-row">
                        <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                        <TableCell>
                          {(() => {
                            const linked = (order as any).customerId
                              ? allCustomers.find(c => c.id === (order as any).customerId)
                              : customerByPhone[order.customerPhone];
                            return (
                              <div>
                                <p className="font-medium text-sm">{order.customerName}</p>
                                <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                                {linked?.username && (
                                  <p className="text-[10px] text-primary/70">@{linked.username}</p>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {order.game && (
                            <div>
                              <p className="font-medium text-sm">{order.game.nameAr}</p>
                              <p className="text-xs text-muted-foreground">{order.package?.amount}</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-primary">{order.totalAmount} ج</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[order.status]?.bg} ${statusColors[order.status]?.text} border-0`}>
                            {statusColors[order.status]?.label || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)} data-testid={`button-view-order-${order.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
            <DialogDescription>عرض وتحديث بيانات الطلب</DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">رقم الطلب</p>
                  <p className="font-mono font-bold text-sm">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">التاريخ</p>
                  <p className="text-sm">{formatDate(selectedOrder.createdAt)}</p>
                </div>
              </div>

              <div className="border-t border-white/6 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">بيانات العميل</h4>
                  {(() => {
                    const linked = (selectedOrder as any).customerId
                      ? allCustomers.find(c => c.id === (selectedOrder as any).customerId)
                      : customerByPhone[selectedOrder.customerPhone];
                    if (!linked) return null;
                    return (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10" onClick={() => { setSelectedOrder(null); navigate(`/admin/support?customerId=${linked.id}`); }} data-testid="button-open-chat-from-order">
                        <MessageCircle className="w-3.5 h-3.5" />
                        فتح الدردشة
                      </Button>
                    );
                  })()}
                </div>
                <div className="space-y-1 text-xs">
                  <p><span className="text-muted-foreground">الاسم:</span> {selectedOrder.customerName}</p>
                  <p><span className="text-muted-foreground">الهاتف:</span> {selectedOrder.customerPhone}</p>
                  {(() => {
                    const linked = (selectedOrder as any).customerId
                      ? allCustomers.find(c => c.id === (selectedOrder as any).customerId)
                      : customerByPhone[selectedOrder.customerPhone];
                    return linked?.username ? (
                      <p><span className="text-muted-foreground">اليوزرنيم:</span> <span className="text-primary">@{linked.username}</span></p>
                    ) : null;
                  })()}
                  {selectedOrder.customerEmail && (
                    <p><span className="text-muted-foreground">البريد:</span> {selectedOrder.customerEmail}</p>
                  )}
                  {selectedOrder.accountUsername && (
                    <p><span className="text-muted-foreground">اسم المستخدم / الإيميل:</span> {selectedOrder.accountUsername}</p>
                  )}
                  {selectedOrder.accountPassword && (
                    <p><span className="text-muted-foreground">كلمة المرور:</span> {selectedOrder.accountPassword}</p>
                  )}
                  {selectedOrder.playerId && (
                    <p><span className="text-muted-foreground">Player ID:</span> {selectedOrder.playerId}</p>
                  )}
                  {selectedOrder.linkingMethod && (
                    <p><span className="text-muted-foreground">طريقة الربط:</span> {selectedOrder.linkingMethod}</p>
                  )}
                </div>
              </div>

              <div className="border-t border-white/6 pt-3">
                <h4 className="font-medium text-sm mb-2">تفاصيل الطلب</h4>
                <div className="space-y-1 text-xs">
                  {selectedOrder.game && (
                    <p><span className="text-muted-foreground">اللعبة:</span> {selectedOrder.game.nameAr}</p>
                  )}
                  {selectedOrder.package && (
                    <p><span className="text-muted-foreground">الباقة:</span> {selectedOrder.package.amount}</p>
                  )}
                  {selectedOrder.quantity && selectedOrder.quantity > 1 && (
                    <p><span className="text-muted-foreground">الكمية:</span> {selectedOrder.quantity}</p>
                  )}
                  <p><span className="text-muted-foreground">المبلغ:</span> <span className="font-bold text-primary">{selectedOrder.totalAmount} ج</span></p>
                  <p><span className="text-muted-foreground">طريقة الدفع:</span> {selectedOrder.paymentMethod}</p>
                </div>
              </div>

              {(selectedOrder.paymentProofUrl || (selectedOrder as any).senderPhone) && (
                <div className="border-t border-white/6 pt-3">
                  <h4 className="font-medium text-sm mb-2">إثبات الدفع</h4>
                  <div className="space-y-1 text-xs">
                    {selectedOrder.paymentProofUrl && (
                      <a href={selectedOrder.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block">
                        عرض الصورة
                      </a>
                    )}
                    {(selectedOrder as any).senderPhone && (
                      <p><span className="text-muted-foreground">رقم المحول منه:</span> {(selectedOrder as any).senderPhone}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-white/6 pt-3">
                <h4 className="font-medium text-sm mb-2">تحديث الحالة</h4>
                <div className="flex flex-wrap gap-2">
                  {["pending", "processing", "completed", "cancelled"].map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={selectedOrder.status === status ? "default" : "outline"}
                      onClick={() => {
                        updateStatusMutation.mutate({ id: selectedOrder.id, status });
                        setSelectedOrder({ ...selectedOrder, status });
                      }}
                      disabled={updateStatusMutation.isPending}
                      data-testid={`button-status-${status}`}
                    >
                      {statusColors[status]?.label}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedOrder.status === "completed" && (() => {
                const digits = (selectedOrder.customerPhone || "").replace(/[^0-9]/g, "");
                let fullPhone = digits;
                if (digits.startsWith("0")) {
                  fullPhone = "20" + digits.slice(1);
                } else if (digits.startsWith("249") || digits.startsWith("20")) {
                  fullPhone = digits;
                } else if (digits.length <= 11) {
                  fullPhone = "20" + digits;
                }
                const gameName = selectedOrder.game?.nameAr || selectedOrder.game?.name || "اللعبة";
                const pkgName = selectedOrder.package?.amount || selectedOrder.package?.name || "";
                const msg = `السلام عليكم ${selectedOrder.customerName}\n\nتم شحن ${gameName}${pkgName ? ` - ${pkgName}` : ""}${selectedOrder.quantity && selectedOrder.quantity > 1 ? ` x ${selectedOrder.quantity}` : ""} بنجاح\n\nرقم الطلب: ${selectedOrder.orderNumber}\n\nشكرا لتعاملك مع ASTRO\nلو محتاج أي حاجة تانية إحنا موجودين`;
                const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
                return (
                  <div className="border-t border-white/6 pt-3">
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="link-whatsapp-completed"
                    >
                      <Button size="sm" variant="outline" className="w-full bg-green-600/20 border-green-500/30 text-green-400">
                        <MessageCircle className="w-4 h-4 ml-2" />
                        إبلاغ العميل عبر واتساب
                      </Button>
                    </a>
                  </div>
                );
              })()}

              <div className="border-t border-white/6 pt-3">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => deleteOrderMutation.mutate(selectedOrder.id)}
                  disabled={deleteOrderMutation.isPending}
                  data-testid="button-delete-order"
                >
                  {deleteOrderMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 ml-2" />
                  )}
                  حذف الطلب
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
