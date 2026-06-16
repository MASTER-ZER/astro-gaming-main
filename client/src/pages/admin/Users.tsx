import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users as UsersIcon, Search, RefreshCw, Loader2, Wallet, DollarSign, UserCheck, Send, Plus, Minus, Ban, ShieldCheck, Gift, Eye, EyeOff, Key, Star, MessageCircle } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { calculateLevelInfo } from "@/lib/levelSystem";

interface Customer {
  id: string;
  username: string;
  name: string;
  phone: string;
  email?: string;
  balance: number;
  loyaltyPoints: number;
  plainPassword?: string;
  isBanned?: boolean;
  banReason?: string | null;
  bannedAt?: string | Date | null;
  orderCount?: number;
  totalSpent?: number;
  authProvider?: string;
  googleId?: string;
  profileCompleted?: boolean;
  createdAt: string | Date;
}

interface CustomerDetail extends Customer {
  walletTransactions?: WalletTransaction[];
  orders?: CustomerOrder[];
}

interface WalletTransaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  reason?: string;
  createdAt: string | Date;
}

interface CustomerOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: string;
  createdAt: string | Date;
}

interface CustomerStats {
  totalUsers: number;
  totalBalance: number;
  activeUsers: number;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceType, setBalanceType] = useState<"credit" | "debit">("credit");
  const [balanceDescription, setBalanceDescription] = useState("");
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [rewardPoints, setRewardPoints] = useState("");
  const [rewardReason, setRewardReason] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReasonInput, setBanReasonInput] = useState("");
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);

  const { data: stats } = useQuery<CustomerStats>({
    queryKey: ["/api/admin/customers/stats"],
  });

  const { data: customers = [], isLoading, refetch } = useQuery<Customer[]>({
    queryKey: ["/api/admin/customers"],
  });

  const { data: customerDetail, isLoading: isDetailLoading } = useQuery<CustomerDetail>({
    queryKey: ["/api/admin/customers", selectedUserId],
    enabled: !!selectedUserId,
  });

  const balanceMutation = useMutation({
    mutationFn: async ({ id, amount, type, description }: { id: string; amount: number; type: string; description: string }) => {
      return apiRequest("PATCH", `/api/admin/customers/${id}/balance`, { amount, type, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers/stats"] });
      setBalanceAmount("");
      setBalanceDescription("");
      toast({ title: "تم التحديث", description: "تم تعديل الرصيد بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل تعديل الرصيد", variant: "destructive" });
    },
  });

  const messageMutation = useMutation({
    mutationFn: async ({ id, title, message }: { id: string; title: string; message: string }) => {
      return apiRequest("POST", `/api/admin/customers/${id}/message`, { title, message });
    },
    onSuccess: () => {
      setMessageTitle("");
      setMessageBody("");
      toast({ title: "تم الإرسال", description: "تم إرسال الرسالة بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل إرسال الرسالة", variant: "destructive" });
    },
  });

  const banMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: "ban" | "unban"; reason?: string }) => {
      return apiRequest("POST", `/api/admin/customers/${id}/${action}`, { reason: reason || null });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers", selectedUserId] });
      setBanDialogOpen(false);
      setBanReasonInput("");
      toast({
        title: vars.action === "ban" ? "تم الحظر" : "تم رفع الحظر",
        description: vars.action === "ban" ? "تم حظر الحساب بنجاح" : "تم رفع الحظر بنجاح",
      });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل العملية", variant: "destructive" });
    },
  });

  const rewardMutation = useMutation({
    mutationFn: async ({ id, points, reason }: { id: string; points: number; reason: string }) => {
      return apiRequest("POST", `/api/admin/customers/${id}/reward`, { points, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers", selectedUserId] });
      setRewardPoints("");
      setRewardReason("");
      toast({ title: "تم المنح", description: "تم إعطاء المكافأة بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "فشل إعطاء المكافأة", variant: "destructive" });
    },
  });

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.username?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.phone?.includes(searchQuery) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleBalanceSubmit = () => {
    if (!selectedUserId || !balanceAmount) return;
    const amt = parseFloat(balanceAmount);
    if (isNaN(amt) || amt <= 0) {
      toast({ title: "خطأ", description: "أدخل مبلغ صحيح", variant: "destructive" });
      return;
    }
    balanceMutation.mutate({
      id: selectedUserId,
      amount: amt,
      type: balanceType,
      description: balanceDescription || (balanceType === "credit" ? "إضافة رصيد" : "خصم رصيد"),
    });
  };

  const handleMessageSubmit = () => {
    if (!selectedUserId || !messageTitle || !messageBody) return;
    messageMutation.mutate({ id: selectedUserId, title: messageTitle, message: messageBody });
  };

  const handleRewardSubmit = () => {
    if (!selectedUserId || !rewardPoints) return;
    const pts = parseInt(rewardPoints);
    if (isNaN(pts) || pts <= 0) {
      toast({ title: "خطأ", description: "أدخل عدد نقاط صحيح", variant: "destructive" });
      return;
    }
    rewardMutation.mutate({ id: selectedUserId, points: pts, reason: rewardReason || "مكافأة من الأدمن" });
  };

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-amber-500/15", text: "text-amber-400", label: "قيد الانتظار" },
    processing: { bg: "bg-blue-500/15", text: "text-blue-400", label: "جاري التنفيذ" },
    completed: { bg: "bg-green-500/15", text: "text-green-400", label: "مكتمل" },
    cancelled: { bg: "bg-red-500/15", text: "text-red-400", label: "ملغي" },
  };

  return (
    <div className="space-y-4 md:space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold mb-1">إدارة العملاء</h1>
        <p className="text-sm text-muted-foreground">عرض وإدارة جميع العملاء</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-panel rounded-xl p-4 flex items-center gap-3" data-testid="stat-total-users">
          <div className="p-2.5 rounded-lg bg-primary/15">
            <UsersIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">إجمالي العملاء</p>
            <p className="text-lg font-bold">{stats?.totalUsers ?? "-"}</p>
          </div>
        </div>
        <div className="glass-panel rounded-xl p-4 flex items-center gap-3" data-testid="stat-total-balance">
          <div className="p-2.5 rounded-lg bg-green-500/15">
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">إجمالي الأرصدة</p>
            <p className="text-lg font-bold">{stats?.totalBalance != null ? `${stats.totalBalance} جنيه` : "-"}</p>
          </div>
        </div>
        <div className="glass-panel rounded-xl p-4 flex items-center gap-3" data-testid="stat-active-users">
          <div className="p-2.5 rounded-lg bg-blue-500/15">
            <UserCheck className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">عملاء نشطين</p>
            <p className="text-lg font-bold">{stats?.activeUsers ?? "-"}</p>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-3 md:p-4 border-b border-white/6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو اسم المستخدم أو الهاتف..."
                className="pr-9 w-full sm:w-64 md:w-80 glass-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-users"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh-users">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">لا يوجد عملاء</p>
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-2 p-3">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 rounded-lg bg-white/3 ring-1 ring-white/6 mobile-touch-feedback cursor-pointer"
                    onClick={() => setSelectedUserId(customer.id)}
                    data-testid={`card-user-${customer.id}`}
                  >
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm">{customer.name}</p>
                          {customer.isBanned && <Badge variant="destructive" className="text-[10px] py-0 px-1">محظور</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">@{customer.username}</p>
                      </div>
                      <span className="font-bold text-primary text-sm">{customer.balance} جنيه</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] text-muted-foreground">{customer.phone}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(customer.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">اسم المستخدم</TableHead>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">الهاتف</TableHead>
                      <TableHead className="text-right">الرصيد</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">نوع التسجيل</TableHead>
                      <TableHead className="text-right">عدد الطلبات</TableHead>
                      <TableHead className="text-right">تاريخ التسجيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="glass-table-row cursor-pointer"
                        onClick={() => setSelectedUserId(customer.id)}
                        data-testid={`row-user-${customer.id}`}
                      >
                        <TableCell className="font-mono text-sm">@{customer.username}</TableCell>
                        <TableCell className="font-medium text-sm">{customer.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{customer.phone}</TableCell>
                        <TableCell>
                          <span className="font-bold text-primary">{customer.balance} جنيه</span>
                        </TableCell>
                        <TableCell>
                          {customer.isBanned ? (
                            <Badge variant="destructive" className="text-xs">محظور</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-green-400 border-green-400/30">نشط</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {customer.authProvider === "google" ? (
                            <span className="flex items-center gap-1.5 text-xs text-blue-400">
                              <SiGoogle className="w-3.5 h-3.5 text-[#4285F4]" />
                              جوجل
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">عادي</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{customer.orderCount ?? 0}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(customer.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={!!selectedUserId} onOpenChange={() => { setSelectedUserId(null); setShowPassword(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل العميل</DialogTitle>
            <DialogDescription>عرض وإدارة بيانات العميل</DialogDescription>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : customerDetail ? (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="w-full grid grid-cols-5" data-testid="tabs-user-detail">
                <TabsTrigger value="info" data-testid="tab-info">المعلومات</TabsTrigger>
                <TabsTrigger value="balance" data-testid="tab-balance">الرصيد</TabsTrigger>
                <TabsTrigger value="reward" data-testid="tab-reward">مكافأة</TabsTrigger>
                <TabsTrigger value="message" data-testid="tab-message">رسالة</TabsTrigger>
                <TabsTrigger value="history" data-testid="tab-history">السجل</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-3 mt-3">
                {(() => {
                  const completedCount = customerDetail.orders?.filter((o: CustomerOrder) => o.status === "completed").length ?? 0;
                  const rankInfo = calculateLevelInfo(completedCount);
                  return (
                    <div className="p-3 rounded-lg bg-white/3 ring-1 ring-white/6 flex items-center gap-3">
                      <span className="text-2xl">{rankInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">الرتبة</p>
                        <p className="font-bold text-sm" style={{ color: rankInfo.color }}>{rankInfo.rank}</p>
                        <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${rankInfo.progress}%`, backgroundColor: rankInfo.color }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">طلبات مكتملة</p>
                        <p className="font-bold text-sm">{completedCount}</p>
                      </div>
                    </div>
                  );
                })()}

                {customerDetail.isBanned && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-1">
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-sm text-red-400 font-bold">هذا الحساب محظور</p>
                    </div>
                    {customerDetail.banReason && (
                      <p className="text-xs text-red-300/80 pr-6">السبب: {customerDetail.banReason}</p>
                    )}
                    {customerDetail.bannedAt && (
                      <p className="text-xs text-red-300/60 pr-6">تاريخ الحظر: {formatDateTime(customerDetail.bannedAt)}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">اسم المستخدم</p>
                    <p className="font-mono font-bold text-sm" data-testid="text-detail-username">@{customerDetail.username}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">الاسم</p>
                    <p className="font-medium text-sm" data-testid="text-detail-name">{customerDetail.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">الهاتف / الواتساب</p>
                    <p className="text-sm" data-testid="text-detail-phone">{customerDetail.phone?.startsWith("google_") ? "—" : customerDetail.phone}</p>
                  </div>
                  {customerDetail.email && (
                    <div>
                      <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                      <p className="text-xs text-blue-400" dir="ltr">{customerDetail.email}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">طريقة التسجيل</p>
                    <p className="text-sm flex items-center gap-1">
                      {customerDetail.authProvider === "google" ? (
                        <><SiGoogle className="w-3.5 h-3.5 text-[#4285F4]" /> جوجل</>
                      ) : "عادي (رقم + باسورد)"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">الرصيد</p>
                    <p className="font-bold text-primary text-sm" data-testid="text-detail-balance">{customerDetail.balance} جنيه</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">نقاط الولاء</p>
                    <p className="font-bold text-yellow-400 text-sm">{customerDetail.loyaltyPoints ?? 0} نقطة</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">تاريخ التسجيل</p>
                    <p className="text-sm">{formatDate(customerDetail.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">عدد الطلبات</p>
                    <p className="text-sm">{customerDetail.orders?.length ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">إجمالي الإنفاق</p>
                    <p className="text-sm">{customerDetail.orders?.filter((o: CustomerOrder) => o.status === "completed").reduce((s: number, o: CustomerOrder) => s + o.totalAmount, 0) ?? 0} جنيه</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/15">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-primary" />
                    <p className="text-xs font-medium">كلمة السر</p>
                  </div>
                  {customerDetail.plainPassword ? (
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm flex-1" data-testid="text-customer-password">
                        {showPassword ? customerDetail.plainPassword : "•".repeat(customerDetail.plainPassword.length)}
                      </p>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPassword(!showPassword)} data-testid="button-toggle-password">
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">لم يتم تسجيل كلمة السر بعد (العميل لم يسجل دخول بعد التحديث)</p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => navigate(`/admin/support?customerId=${customerDetail.id}`)}
                    data-testid="button-open-support-chat"
                  >
                    <MessageCircle className="w-3.5 h-3.5 ml-1" />
                    فتح الدردشة
                  </Button>
                  {customerDetail.isBanned ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
                      onClick={() => setUnbanDialogOpen(true)}
                      disabled={banMutation.isPending}
                      data-testid="button-unban-customer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 ml-1" />
                      رفع الحظر
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => { setBanReasonInput(""); setBanDialogOpen(true); }}
                      disabled={banMutation.isPending}
                      data-testid="button-ban-customer"
                    >
                      <Ban className="w-3.5 h-3.5 ml-1" />
                      حظر الحساب
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="balance" className="space-y-3 mt-3">
                <div className="p-3 rounded-lg bg-white/3 ring-1 ring-white/6">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">الرصيد الحالي:</span>
                    <span className="font-bold text-primary" data-testid="text-current-balance">{customerDetail.balance} جنيه</span>
                  </div>

                  <div className="space-y-2">
                    <Select value={balanceType} onValueChange={(v) => setBalanceType(v as "credit" | "debit")} data-testid="select-balance-type">
                      <SelectTrigger data-testid="select-balance-type-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit">
                          <span className="flex items-center gap-1"><Plus className="w-3 h-3 text-green-400" /> إضافة رصيد</span>
                        </SelectItem>
                        <SelectItem value="debit">
                          <span className="flex items-center gap-1"><Minus className="w-3 h-3 text-red-400" /> خصم رصيد</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      placeholder="المبلغ"
                      value={balanceAmount}
                      onChange={(e) => setBalanceAmount(e.target.value)}
                      className="glass-input"
                      data-testid="input-balance-amount"
                    />

                    <Input
                      placeholder="الوصف (اختياري)"
                      value={balanceDescription}
                      onChange={(e) => setBalanceDescription(e.target.value)}
                      className="glass-input"
                      data-testid="input-balance-description"
                    />

                    <Button
                      className="w-full"
                      onClick={handleBalanceSubmit}
                      disabled={balanceMutation.isPending || !balanceAmount}
                      data-testid="button-submit-balance"
                    >
                      {balanceMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      ) : balanceType === "credit" ? (
                        <Plus className="w-4 h-4 ml-2" />
                      ) : (
                        <Minus className="w-4 h-4 ml-2" />
                      )}
                      {balanceType === "credit" ? "إضافة رصيد" : "خصم رصيد"}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reward" className="space-y-3 mt-3">
                <div className="p-3 rounded-lg bg-white/3 ring-1 ring-white/6 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-4 h-4 text-yellow-400" />
                    <span className="font-medium text-sm">إعطاء مكافأة</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-xs text-yellow-400">نقاط الولاء الحالية: <span className="font-bold">{customerDetail.loyaltyPoints ?? 0} نقطة</span></p>
                  </div>
                  <Input
                    type="number"
                    placeholder="عدد النقاط"
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(e.target.value)}
                    className="glass-input"
                    data-testid="input-reward-points"
                  />
                  <Input
                    placeholder="سبب المكافأة (اختياري)"
                    value={rewardReason}
                    onChange={(e) => setRewardReason(e.target.value)}
                    className="glass-input"
                    data-testid="input-reward-reason"
                  />
                  <Button
                    className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30"
                    variant="outline"
                    onClick={handleRewardSubmit}
                    disabled={rewardMutation.isPending || !rewardPoints}
                    data-testid="button-submit-reward"
                  >
                    {rewardMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    ) : (
                      <Star className="w-4 h-4 ml-2" />
                    )}
                    منح المكافأة
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="message" className="space-y-3 mt-3">
                <div className="p-3 rounded-lg bg-white/3 ring-1 ring-white/6 space-y-2">
                  <Input
                    placeholder="عنوان الرسالة"
                    value={messageTitle}
                    onChange={(e) => setMessageTitle(e.target.value)}
                    className="glass-input"
                    data-testid="input-message-title"
                  />
                  <Textarea
                    placeholder="نص الرسالة..."
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    className="glass-input resize-none min-h-[100px]"
                    data-testid="input-message-body"
                  />
                  <Button
                    className="w-full"
                    onClick={handleMessageSubmit}
                    disabled={messageMutation.isPending || !messageTitle || !messageBody}
                    data-testid="button-send-message"
                  >
                    {messageMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    ) : (
                      <Send className="w-4 h-4 ml-2" />
                    )}
                    إرسال الرسالة
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-3">
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    حركات المحفظة
                  </h4>
                  {customerDetail.walletTransactions && customerDetail.walletTransactions.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {customerDetail.walletTransactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-white/3 ring-1 ring-white/6 text-xs" data-testid={`tx-${tx.id}`}>
                          <div>
                            <p className="font-medium">{tx.reason || tx.description}</p>
                            <p className="text-muted-foreground text-[10px]">{formatDateTime(tx.createdAt)}</p>
                          </div>
                          <span className={tx.type === "credit" ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                            {tx.type === "credit" ? "+" : "-"}{tx.amount} جنيه
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-3">لا توجد حركات</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">الطلبات</h4>
                  {customerDetail.orders && customerDetail.orders.length > 0 ? (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {customerDetail.orders.map((order) => {
                        const s = statusColors[order.status] || { bg: "bg-white/5", text: "text-muted-foreground", label: order.status };
                        return (
                          <div key={order.id} className="flex items-center justify-between p-2 rounded-lg bg-white/3 ring-1 ring-white/6 text-xs" data-testid={`order-${order.id}`}>
                            <div>
                              <p className="font-medium font-mono">{order.orderNumber}</p>
                              <p className="text-muted-foreground text-[10px]">{formatDateTime(order.createdAt)}</p>
                            </div>
                            <div className="text-left flex flex-col items-end gap-1">
                              <span className="font-bold text-primary">{order.totalAmount} جنيه</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.bg} ${s.text}`}>{s.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-3">لا توجد طلبات</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Unban Confirmation Dialog */}
      <Dialog open={unbanDialogOpen} onOpenChange={setUnbanDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              تأكيد رفع الحظر
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            هل أنت متأكد من رفع الحظر عن{" "}
            <span className="text-white font-semibold">
              {customerDetail?.name || customerDetail?.username || customerDetail?.phone}
            </span>
            ؟ سيتمكن من الدخول مجدداً.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setUnbanDialogOpen(false)}>إلغاء</Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white border-0"
              disabled={banMutation.isPending}
              onClick={() => {
                banMutation.mutate({ id: customerDetail?.id as string, action: "unban" });
                setUnbanDialogOpen(false);
              }}
              data-testid="button-confirm-unban"
            >
              {banMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />}
              رفع الحظر
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban Reason Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={(open) => { if (!open) { setBanDialogOpen(false); setBanReasonInput(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Ban className="w-5 h-5" />
              حظر الحساب
            </DialogTitle>
            <DialogDescription>
              سيتم تسجيل خروج العميل فوراً ولن يستطيع تسجيل الدخول حتى يتم رفع الحظر.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <p className="text-sm font-medium mb-1.5">سبب الحظر <span className="text-muted-foreground text-xs">(اختياري)</span></p>
              <Textarea
                placeholder="مثال: سلوك مسيء، طلبات مزيفة، غش..."
                value={banReasonInput}
                onChange={(e) => setBanReasonInput(e.target.value)}
                className="resize-none h-20"
                data-testid="input-ban-reason"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => { setBanDialogOpen(false); setBanReasonInput(""); }}
                data-testid="button-cancel-ban"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  if (customerDetail) {
                    banMutation.mutate({ id: customerDetail.id as string, action: "ban", reason: banReasonInput || undefined });
                  }
                }}
                disabled={banMutation.isPending}
                data-testid="button-confirm-ban"
              >
                {banMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" /> : <Ban className="w-3.5 h-3.5 ml-1" />}
                تأكيد الحظر
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
