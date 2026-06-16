import { ParticleBackground } from "@/components/ParticleBackground";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Settings, Package, Clock, CheckCircle, XCircle, Eye, Search, RefreshCw, TrendingUp, Users, DollarSign, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Order, Game, Package as PackageType } from "@shared/schema";

type OrderWithDetails = Order & {
  game?: Game;
  package?: PackageType;
};

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-500/20", text: "text-amber-500", label: "قيد الانتظار" },
  processing: { bg: "bg-blue-500/20", text: "text-blue-500", label: "جاري التنفيذ" },
  completed: { bg: "bg-green-500/20", text: "text-green-500", label: "مكتمل" },
  cancelled: { bg: "bg-red-500/20", text: "text-red-500", label: "ملغي" },
};

export default function Admin() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);

  const { data: orders = [], isLoading, refetch } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  const { data: stats } = useQuery<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
  }>({
    queryKey: ["/api/orders/stats"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/orders/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/stats"] });
      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة الطلب بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل تحديث حالة الطلب",
        variant: "destructive",
      });
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
      toast({
        title: "تم الحذف",
        description: "تم حذف الطلب بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل حذف الطلب",
        variant: "destructive",
      });
    },
  });

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.includes(searchQuery) ||
      order.playerId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
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
    <div className="min-h-screen relative">
      <ParticleBackground />

      <div className="relative z-10 py-8 container mx-auto px-4">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">لوحة التحكم</h1>
              <p className="text-muted-foreground">إدارة الطلبات والمبيعات</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              icon: Package,
              label: "إجمالي الطلبات",
              value: stats?.totalOrders || 0,
              color: "text-primary",
            },
            {
              icon: Clock,
              label: "قيد الانتظار",
              value: stats?.pendingOrders || 0,
              color: "text-amber-500",
            },
            {
              icon: CheckCircle,
              label: "مكتملة",
              value: stats?.completedOrders || 0,
              color: "text-green-500",
            },
            {
              icon: DollarSign,
              label: "الإيرادات",
              value: `${stats?.totalRevenue || 0} ج`,
              color: "text-primary",
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card p-4 hover-elevate">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-card ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card">
            <div className="p-4 border-b border-border">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  الطلبات
                </h2>

                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث..."
                      className="pr-9 w-full sm:w-48"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search-orders"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32" data-testid="select-status-filter">
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

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => refetch()}
                    data-testid="button-refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد طلبات</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رقم الطلب</TableHead>
                      <TableHead className="text-right">العميل</TableHead>
                      <TableHead className="text-right">اللعبة</TableHead>
                      <TableHead className="text-right">المبلغ</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id} className="hover-elevate">
                        <TableCell className="font-mono text-sm">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customerName}</p>
                            <p className="text-sm text-muted-foreground">
                              {order.customerPhone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{order.game?.nameAr || order.gameId}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.package?.amount || order.packageId}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-primary">
                            {order.totalAmount} ج
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${statusColors[order.status]?.bg} ${statusColors[order.status]?.text} border-0`}
                          >
                            {statusColors[order.status]?.label || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedOrder(order)}
                              data-testid={`button-view-order-${order.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </motion.div>

        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="glass-card max-w-lg">
            <DialogHeader>
              <DialogTitle>تفاصيل الطلب</DialogTitle>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الطلب</p>
                    <p className="font-mono font-bold">{selectedOrder.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">التاريخ</p>
                    <p>{formatDate(selectedOrder.createdAt)}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-medium mb-2">بيانات العميل</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">الاسم:</span> {selectedOrder.customerName}</p>
                    <p><span className="text-muted-foreground">الهاتف:</span> {selectedOrder.customerPhone}</p>
                    {selectedOrder.customerEmail && (
                      <p><span className="text-muted-foreground">البريد:</span> {selectedOrder.customerEmail}</p>
                    )}
                    <p><span className="text-muted-foreground">Player ID:</span> {selectedOrder.playerId}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-medium mb-2">تفاصيل الطلب</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">اللعبة:</span> {selectedOrder.game?.nameAr || selectedOrder.gameId}</p>
                    <p><span className="text-muted-foreground">الباقة:</span> {selectedOrder.package?.amount || selectedOrder.packageId}</p>
                    <p><span className="text-muted-foreground">المبلغ:</span> <span className="font-bold text-primary">{selectedOrder.totalAmount} ج</span></p>
                    <p><span className="text-muted-foreground">طريقة الدفع:</span> {selectedOrder.paymentMethod}</p>
                  </div>
                </div>

                {selectedOrder.paymentProofUrl && (
                  <div className="border-t border-border pt-4">
                    <h4 className="font-medium mb-2">إثبات الدفع</h4>
                    <a
                      href={selectedOrder.paymentProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      عرض الصورة
                    </a>
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <h4 className="font-medium mb-2">تحديث الحالة</h4>
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

                <div className="border-t border-border pt-4">
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
    </div>
  );
}
