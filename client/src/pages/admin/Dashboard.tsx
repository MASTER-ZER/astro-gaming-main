import { useQuery } from "@tanstack/react-query";
import { Package, Clock, CheckCircle, DollarSign, TrendingUp, Gamepad2, Loader2, Users, Wallet, CreditCard, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import type { Order, Game, Notification } from "@shared/schema";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
    todayOrders: number;
  }>({
    queryKey: ["/api/orders/stats"],
  });

  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const { data: recentOrders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/customers"],
  });

  const { data: walletRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/wallet-requests"],
  });

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const pendingWalletRequests = walletRequests.filter((r: any) => r.status === "pending");
  const totalUserBalance = customers.reduce((sum: number, c: any) => sum + (parseFloat(c.balance) || 0), 0);

  const statCards = [
    { icon: Package, label: "إجمالي الطلبات", value: stats?.totalOrders || 0, color: "text-primary", bg: "from-primary/15 to-blue-500/10" },
    { icon: Clock, label: "قيد الانتظار", value: stats?.pendingOrders || 0, color: "text-amber-500", bg: "from-amber-500/15 to-yellow-500/10" },
    { icon: CheckCircle, label: "مكتملة", value: stats?.completedOrders || 0, color: "text-green-500", bg: "from-green-500/15 to-emerald-500/10" },
    { icon: DollarSign, label: "الإيرادات", value: `${stats?.totalRevenue || 0} ج`, color: "text-primary", bg: "from-primary/15 to-cyan-500/10" },
    { icon: TrendingUp, label: "طلبات اليوم", value: stats?.todayOrders || 0, color: "text-blue-500", bg: "from-blue-500/15 to-sky-500/10" },
    { icon: Gamepad2, label: "عدد الألعاب", value: games.length, color: "text-purple-500", bg: "from-purple-500/15 to-fuchsia-500/10" },
    { icon: Users, label: "المستخدمين", value: customers.length, color: "text-cyan-500", bg: "from-cyan-500/15 to-teal-500/10" },
    { icon: Wallet, label: "رصيد المحافظ", value: `${totalUserBalance} ج`, color: "text-green-500", bg: "from-green-500/15 to-lime-500/10" },
  ];

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold mb-1 md:mb-2" data-testid="text-dashboard-title">مرحبا بك في لوحة التحكم</h1>
        <p className="text-sm md:text-base text-muted-foreground">إليك ملخص أداء متجرك</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2 md:gap-3">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <div className="glass-stat-card rounded-xl p-3 md:p-4" data-testid={`stat-card-${index}`}>
              <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-br ${stat.bg} flex items-center justify-center mb-2`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-lg md:text-2xl font-bold">{stat.value}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {pendingWalletRequests.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Link href="/admin/wallet-requests">
            <div className="glass-panel rounded-xl p-4 border border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-colors" data-testid="alert-pending-wallet">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">طلبات إيداع في الانتظار</p>
                  <p className="text-xs text-muted-foreground">{pendingWalletRequests.length} طلب إيداع بانتظار الموافقة</p>
                </div>
                <Badge variant="destructive" className="text-xs">{pendingWalletRequests.length}</Badge>
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
        <div className="glass-panel rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h3 className="font-bold flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-primary" />
              آخر الطلبات
            </h3>
            <Link href="/admin/orders">
              <span className="text-xs text-primary hover:underline cursor-pointer" data-testid="link-view-all-orders">عرض الكل</span>
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">لا توجد طلبات بعد</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white/3 flex-wrap" data-testid={`order-row-${order.id}`}>
                  <div>
                    <p className="font-medium text-sm">{order.customerName}</p>
                    <p className="text-[10px] text-muted-foreground">{order.orderNumber}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-primary text-sm">{order.totalAmount} ج</p>
                    <p className={`text-[10px] ${
                      order.status === "completed" ? "text-green-500" :
                      order.status === "pending" ? "text-amber-500" :
                      order.status === "processing" ? "text-blue-500" : "text-red-500"
                    }`}>
                      {order.status === "completed" ? "مكتمل" :
                       order.status === "pending" ? "قيد الانتظار" :
                       order.status === "processing" ? "جاري التنفيذ" : "ملغي"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-xl p-4 md:p-5">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h3 className="font-bold flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-amber-500" />
              الإشعارات الجديدة
            </h3>
            {unreadNotifications.length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 h-5">
                {unreadNotifications.length}
              </Badge>
            )}
          </div>

          {unreadNotifications.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">لا توجد إشعارات جديدة</p>
          ) : (
            <div className="space-y-2">
              {unreadNotifications.slice(0, 5).map((notification) => (
                <div key={notification.id} className="p-2.5 rounded-lg bg-amber-500/8 ring-1 ring-amber-500/15">
                  <p className="font-medium text-sm">{notification.title}</p>
                  <p className="text-[10px] text-muted-foreground">{notification.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <Link href="/admin/orders">
          <div className="glass-stat-card rounded-xl p-3 md:p-5 cursor-pointer group" data-testid="link-manage-orders">
            <Package className="w-5 h-5 md:w-7 md:h-7 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-xs md:text-sm">إدارة الطلبات</h3>
            <p className="text-[10px] text-muted-foreground hidden md:block">عرض وإدارة جميع الطلبات</p>
          </div>
        </Link>

        <Link href="/admin/wallet-requests">
          <div className="glass-stat-card rounded-xl p-3 md:p-5 cursor-pointer group" data-testid="link-manage-wallet">
            <Wallet className="w-5 h-5 md:w-7 md:h-7 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-xs md:text-sm">طلبات الإيداع</h3>
            <p className="text-[10px] text-muted-foreground hidden md:block">إدارة طلبات شحن المحفظة</p>
          </div>
        </Link>

        <Link href="/admin/users">
          <div className="glass-stat-card rounded-xl p-3 md:p-5 cursor-pointer group" data-testid="link-manage-users">
            <Users className="w-5 h-5 md:w-7 md:h-7 text-cyan-500 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-xs md:text-sm">المستخدمين</h3>
            <p className="text-[10px] text-muted-foreground hidden md:block">إدارة الحسابات والأرصدة</p>
          </div>
        </Link>

        <Link href="/admin/games">
          <div className="glass-stat-card rounded-xl p-3 md:p-5 cursor-pointer group" data-testid="link-manage-games">
            <Gamepad2 className="w-5 h-5 md:w-7 md:h-7 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-xs md:text-sm">الألعاب والأسعار</h3>
            <p className="text-[10px] text-muted-foreground hidden md:block">إضافة وتعديل الألعاب</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
