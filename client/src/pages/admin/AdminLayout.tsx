import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarFooter, SidebarHeader
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Package, Gamepad2, CreditCard,
  Settings, Bell, LogOut, MessageCircle, Crown, Users, Wallet, Headphones, TrendingUp, BarChart3, Newspaper, MessagesSquare, Ticket, ShieldCheck, Trophy, ShoppingBag, Smartphone, Layers
} from "lucide-react";
import AdminLogin from "./Login";
import logoImage from "@assets/IMG-20260310-WA0032_1773642840088.jpg";

interface AdminLayoutProps {
  children: ReactNode;
}

// Permission key for each menu item (null = super_admin only, undefined = always visible)
const menuItems: { path: string; icon: any; label: string; badgeKey?: string; permission?: string | null }[] = [
  { path: "/admin", icon: LayoutDashboard, label: "لوحة التحكم" },
  { path: "/admin/analytics", icon: BarChart3, label: "Analytics", permission: "analytics" },
  { path: "/admin/all-orders", icon: Layers, label: "جميع الطلبات", permission: "orders", badgeKey: "allOrders" },
  { path: "/admin/wallet-requests", icon: Wallet, label: "طلبات الإيداع", permission: "wallet_requests" },
  { path: "/admin/sell-requests", icon: TrendingUp, label: "طلبات بيع الحسابات", badgeKey: "sell", permission: "sell_requests" },
  { path: "/admin/users", icon: Users, label: "المستخدمين", permission: "users" },
  { path: "/admin/chat", icon: MessageCircle, label: "المحادثات", permission: "chat" },
  { path: "/admin/support", icon: Headphones, label: "الدعم الفني", permission: "support" },
  { path: "/admin/community/posts", icon: Newspaper, label: "منشورات المجتمع", permission: "community" },
  { path: "/admin/community/comments", icon: MessagesSquare, label: "تعليقات المجتمع", permission: "community" },
  { path: "/admin/games", icon: Gamepad2, label: "الألعاب والأسعار", permission: "games" },
  { path: "/admin/discount-codes", icon: Ticket, label: "أكواد الخصم", permission: "discount_codes" },
  { path: "/admin/competitions", icon: Trophy, label: "المسابقات", permission: "competitions" },
  { path: "/admin/sardarb", icon: ShoppingBag, label: "إدارة السرداب", permission: "sardarb" },
  { path: "/admin/virtual-numbers", icon: Smartphone, label: "إدارة الأرقام الفيك", permission: "virtual_numbers" },
  { path: "/admin/broker", icon: Crown, label: "إدارة الطلبات الخاصة 👑", permission: "broker" },
  { path: "/admin/moderators", icon: ShieldCheck, label: "إدارة المشرفين", permission: null },
  { path: "/admin/payments", icon: CreditCard, label: "وسائل الدفع", permission: "payments" },
  { path: "/admin/settings", icon: Settings, label: "الإعدادات", permission: "settings" },
];

function canSeeItem(item: typeof menuItems[0], role: string, permissions: string[]): boolean {
  if (role === "super_admin") return true;
  if (item.permission === undefined) return true; // always visible
  if (item.permission === null) return false; // super_admin only
  return permissions.includes(item.permission);
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminRole, setAdminRole] = useState<string>("super_admin");
  const [adminPermissions, setAdminPermissions] = useState<string[]>([]);
  const [adminName, setAdminName] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await fetch("/api/admin/verify", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const role = data.role || localStorage.getItem("admin_role") || "super_admin";
          const permissions = data.permissions || JSON.parse(localStorage.getItem("admin_permissions") || "[]");
          const name = data.name || localStorage.getItem("admin_name") || "";
          setAdminRole(role);
          setAdminPermissions(permissions);
          setAdminName(name);
          localStorage.setItem("admin_role", role);
          localStorage.setItem("admin_permissions", JSON.stringify(permissions));
          localStorage.setItem("admin_name", name);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem("admin_token");
          localStorage.removeItem("admin_role");
          localStorage.removeItem("admin_permissions");
          localStorage.removeItem("admin_name");
        }
      } catch {
        setIsAuthenticated(false);
        localStorage.removeItem("admin_token");
      }
    };
    checkAuth();
  }, []);

  const { data: unreadCount = 0 } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 60000,
    select: (data) => data.count,
    enabled: isAuthenticated === true,
  });

  const { data: pendingSellRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/account-sell-requests"],
    refetchInterval: 60000,
    enabled: isAuthenticated === true && (adminRole === "super_admin" || adminPermissions.includes("sell_requests")),
  });

  const pendingSellCount = pendingSellRequests.filter((r: any) => r.status === "pending").length;

  const { data: allAccountOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/account-orders"],
    staleTime: 0,
    refetchInterval: 30000,
    enabled: isAuthenticated === true && (adminRole === "super_admin" || adminPermissions.includes("account_orders")),
  });
  const pendingAccountOrdersCount = allAccountOrders.filter((o: any) => o.accountOrderStatus === "payment_pending" || o.accountOrderStatus === "payment_review").length;

  const { data: allGameOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    staleTime: 0,
    refetchInterval: 30000,
    enabled: isAuthenticated === true && (adminRole === "super_admin" || adminPermissions.includes("orders")),
  });
  const { data: sardarbOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/sardarb/orders"],
    staleTime: 0,
    refetchInterval: 30000,
    enabled: isAuthenticated === true && (adminRole === "super_admin" || adminPermissions.includes("sardarb")),
  });
  const { data: vnOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/virtual-numbers/orders"],
    staleTime: 0,
    refetchInterval: 30000,
    enabled: isAuthenticated === true && (adminRole === "super_admin" || adminPermissions.includes("virtual_numbers")),
  });
  const { data: brokerRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/broker/requests"],
    staleTime: 0,
    refetchInterval: 30000,
    enabled: isAuthenticated === true && (adminRole === "super_admin" || adminPermissions.includes("broker")),
  });

  const allOrdersPendingCount =
    allGameOrders.filter((o: any) => o.status === "pending" && o.orderType !== "account_purchase").length +
    pendingAccountOrdersCount +
    sardarbOrders.filter((o: any) => o.status === "pending").length +
    vnOrders.filter((o: any) => ["pending_payment", "code_requested"].includes(o.status)).length +
    brokerRequests.filter((r: any) => r.status === "pending").length;

  useEffect(() => {
    if (!isAuthenticated) return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [isAuthenticated]);

  const prevUnreadRef = useState<number>(0);
  useEffect(() => {
    if (!isAuthenticated || unreadCount === 0) return;
    const prev = prevUnreadRef[0];
    if (unreadCount > prev && prev !== 0 && "Notification" in window && Notification.permission === "granted") {
      new Notification("ASTRO 🎮", {
        body: `لديك ${unreadCount} إشعار جديد`,
        icon: "/favicon.ico",
      });
    }
    prevUnreadRef[1](unreadCount);
  }, [unreadCount, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_role");
    localStorage.removeItem("admin_permissions");
    localStorage.removeItem("admin_name");
    setIsAuthenticated(false);
  };

  const handleLogin = (data?: { role?: string; permissions?: string[]; name?: string }) => {
    if (data) {
      const role = data.role || "super_admin";
      const permissions = data.permissions || [];
      const name = data.name || "";
      setAdminRole(role);
      setAdminPermissions(permissions);
      setAdminName(name);
      localStorage.setItem("admin_role", role);
      localStorage.setItem("admin_permissions", JSON.stringify(permissions));
      localStorage.setItem("admin_name", name);
    }
    setIsAuthenticated(true);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const visibleMenu = menuItems.filter(item => canSeeItem(item, adminRole, adminPermissions));

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <div dir="rtl">
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex min-h-screen w-full">
          <Sidebar side="right" className="border-l border-white/6">
            <SidebarHeader className="p-4 border-b border-white/6">
              <Link href="/" data-testid="link-admin-logo">
                <div className="flex items-center gap-2.5 cursor-pointer">
                  <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/10 flex-shrink-0">
                    <img src={logoImage} alt="ASTRO" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-black text-gradient-gold-animated leading-tight">ASTRO</span>
                    {adminRole === "moderator" && adminName && (
                      <span className="text-[10px] text-white/30 leading-none">{adminName}</span>
                    )}
                  </div>
                </div>
              </Link>
            </SidebarHeader>

            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>القائمة الرئيسية</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleMenu.map((item) => {
                      const isActive = location === item.path || (item.path !== "/admin" && location.startsWith(item.path));
                      const badgeCount =
                        item.badgeKey === "sell" ? pendingSellCount :
                        item.badgeKey === "accountOrders" ? pendingAccountOrdersCount :
                        item.badgeKey === "allOrders" ? allOrdersPendingCount : 0;
                      return (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton asChild isActive={isActive}>
                            <Link href={item.path} data-testid={`nav-${item.path.replace("/admin/", "").replace("/admin", "dashboard")}`}>
                              <item.icon className="w-5 h-5" />
                              <span className="flex-1">{item.label}</span>
                              {badgeCount > 0 && (
                                <Badge className="h-5 min-w-5 px-1 flex items-center justify-center bg-orange-500 text-white text-[10px] font-bold border-0">
                                  {badgeCount}
                                </Badge>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-2 border-t border-white/6">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/" data-testid="link-back-to-site">
                      <LogOut className="w-5 h-5" />
                      <span>الرجوع للموقع</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleLogout} data-testid="button-logout">
                    <LogOut className="w-5 h-5 text-red-500" />
                    <span className="text-red-500">تسجيل الخروج</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>

          <div className="flex flex-col flex-1 min-w-0">
            <header className="glass-header p-3 md:p-4 flex items-center justify-between sticky top-0 z-[9999]">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <h2 className="text-sm md:text-lg font-bold truncate">لوحة التحكم</h2>
                {adminRole === "moderator" && (
                  <Badge className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30 hidden md:flex">مشرف</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link href="/admin/all-orders">
                  <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                    <Bell className="w-4 h-4 md:w-5 md:h-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -left-1 w-4 h-4 md:w-5 md:h-5 p-0 flex items-center justify-center bg-red-500 text-white text-[10px]">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </div>
            </header>

            <main className="flex-1 p-3 md:p-6 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
