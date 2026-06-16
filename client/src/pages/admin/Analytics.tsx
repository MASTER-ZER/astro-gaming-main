import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  TrendingUp, Users, ShoppingCart, DollarSign, Eye, Gamepad2,
  Package, Star, Activity, Calendar, ArrowUp, ArrowDown, Minus,
  Crown, Flame, BarChart3, UserPlus, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from "recharts";

type Period = "today" | "week" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  today: "اليوم",
  week: "هذا الأسبوع",
  month: "هذا الشهر",
  year: "هذا العام",
};

const COLORS = ["#0090ff", "#34d399", "#f59e0b", "#f43f5e", "#a78bfa", "#fb923c", "#22d3ee", "#84cc16"];

function StatCard({ icon: Icon, label, value, sub, color, trend }: any) {
  return (
    <div className="glass-stat-card p-4 rounded-2xl flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground/70 mb-0.5">{label}</p>
        <p className="text-xl font-black text-white" data-testid={`stat-${label}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground/55 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`text-[10px] font-bold flex items-center gap-0.5 mt-1 ${trend > 0 ? "text-emerald-400" : trend < 0 ? "text-red-400" : "text-muted-foreground"}`}>
          {trend > 0 ? <ArrowUp className="w-3 h-3" /> : trend < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color = "#0090ff" }: any) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <h2 className="text-base font-black text-white">{title}</h2>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-panel rounded-xl p-3 border border-white/10 text-xs">
      <p className="text-muted-foreground mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

export default function AdminAnalytics() {
  const [period, setPeriod] = useState<Period>("month");
  const [activitySearch, setActivitySearch] = useState("");

  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/analytics"],
    refetchInterval: 60000,
  });

  const { data: activityData = [], isLoading: activityLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/analytics/activity"],
    refetchInterval: 120000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">جاري تحميل التحليلات…</p>
        </div>
      </div>
    );
  }

  const ov = analytics?.overview;
  const topGames: any[] = analytics?.topGames || [];
  const topPackages: any[] = analytics?.topPackages || [];
  const topCustomers: any[] = analytics?.topCustomers || [];
  const newUsers: any = analytics?.newUsers || {};
  const behavior: any = analytics?.behavior || {};
  const chart: any[] = ov?.chart || [];

  const ordersVal = ov?.orders?.[period] ?? 0;
  const revenueVal = ov?.revenue?.[period] ?? 0;
  const visitorsVal = ov?.visitors?.[period] ?? 0;
  const usersVal = ov?.users?.[period] ?? 0;

  const filteredActivity = activityData.filter(c =>
    !activitySearch ||
    (c.name || "").toLowerCase().includes(activitySearch.toLowerCase()) ||
    (c.username || "").toLowerCase().includes(activitySearch.toLowerCase()) ||
    (c.phone || "").includes(activitySearch)
  );

  return (
    <div className="space-y-8" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-black text-white">Analytics & Insights</h1>
            <p className="text-xs text-muted-foreground/60 mt-0.5">تحليلات متقدمة لأداء المتجر وسلوك العملاء</p>
          </div>
          <div className="flex gap-1.5 bg-white/5 rounded-xl p-1">
            {(["today", "week", "month", "year"] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                data-testid={`period-${p}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === p
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Section 1: Overview Stats ── */}
      <section>
        <SectionHeader icon={BarChart3} title="إحصائيات الأداء" color="#0090ff" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard icon={Eye} label={`زوار ${PERIOD_LABELS[period]}`} value={visitorsVal.toLocaleString()} color="#0090ff" />
          <StatCard icon={ShoppingCart} label={`طلبات ${PERIOD_LABELS[period]}`} value={ordersVal.toLocaleString()} color="#34d399" />
          <StatCard icon={DollarSign} label={`أرباح ${PERIOD_LABELS[period]}`} value={`${revenueVal.toLocaleString()} ج`} color="#f59e0b" />
          <StatCard icon={UserPlus} label={`مستخدمين جدد ${PERIOD_LABELS[period]}`} value={usersVal.toLocaleString()} color="#a78bfa" />
        </div>

        {/* Line Chart: Last 30 Days */}
        <div className="glass-panel rounded-2xl p-4 border border-white/8">
          <p className="text-xs font-bold text-white/70 mb-4">الطلبات والأرباح - آخر 30 يوم</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chart} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }} />
              <Line type="monotone" dataKey="orders" stroke="#0090ff" strokeWidth={2} dot={false} name="الطلبات" />
              <Line type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} dot={false} name="الأرباح (ج)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Section 6: New Users ── */}
      <section>
        <SectionHeader icon={UserPlus} title="العملاء الجدد" color="#a78bfa" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users} label="اليوم" value={newUsers.today ?? 0} sub="مستخدم جديد" color="#a78bfa" />
          <StatCard icon={Users} label="هذا الأسبوع" value={newUsers.week ?? 0} sub="مستخدم جديد" color="#a78bfa" />
          <StatCard icon={Users} label="هذا الشهر" value={newUsers.month ?? 0} sub="مستخدم جديد" color="#a78bfa" />
          <StatCard icon={Users} label="الإجمالي" value={newUsers.total ?? 0} sub="مستخدم مسجل" color="#60a5fa" />
        </div>
      </section>

      {/* ── Section 2: Top Games ── */}
      <section>
        <SectionHeader icon={Gamepad2} title="Top Games — أكثر الألعاب شراء" color="#34d399" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-panel rounded-2xl p-4 border border-white/8">
            <p className="text-xs font-bold text-white/60 mb-4">الطلبات لكل لعبة</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topGames.slice(0, 8)} layout="vertical" margin={{ right: 10, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }} />
                <YAxis type="category" dataKey="game.nameAr" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }} width={75} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="الطلبات" radius={[0, 4, 4, 0]}>
                  {topGames.slice(0, 8).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {topGames.slice(0, 8).map((g: any, i: number) => (
              <div key={g.gameId} className="glass-panel rounded-xl p-3 flex items-center gap-3 border border-white/6" data-testid={`row-topgame-${i}`}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: `${COLORS[i]}22`, color: COLORS[i] }}>{i + 1}</div>
                <span className="text-lg">{g.game?.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{g.game?.nameAr}</p>
                  <p className="text-[10px] text-muted-foreground/55">{g.count} طلب</p>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-emerald-400">{g.revenue.toLocaleString()} ج</p>
                  <p className="text-[10px] text-muted-foreground/50">إيرادات</p>
                </div>
              </div>
            ))}
            {topGames.length === 0 && (
              <div className="text-center py-8 text-muted-foreground/40 text-sm">لا توجد بيانات بعد</div>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 3: Top Packages ── */}
      <section>
        <SectionHeader icon={Package} title="Most Purchased Packages — أكثر الباقات شراء" color="#f59e0b" />
        <div className="glass-panel rounded-2xl border border-white/8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="py-3 px-4 text-right text-xs text-muted-foreground/60 font-bold">#</th>
                  <th className="py-3 px-4 text-right text-xs text-muted-foreground/60 font-bold">اللعبة</th>
                  <th className="py-3 px-4 text-right text-xs text-muted-foreground/60 font-bold">الباقة</th>
                  <th className="py-3 px-4 text-right text-xs text-muted-foreground/60 font-bold">عدد الشراء</th>
                  <th className="py-3 px-4 text-right text-xs text-muted-foreground/60 font-bold">الإيرادات</th>
                </tr>
              </thead>
              <tbody>
                {topPackages.slice(0, 20).map((p: any, i: number) => (
                  <tr key={p.packageId} className="border-b border-white/5 hover:bg-white/3 transition-colors" data-testid={`row-package-${i}`}>
                    <td className="py-2.5 px-4">
                      <span className="text-xs font-black" style={{ color: COLORS[i % COLORS.length] }}>{i + 1}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{p.game?.icon}</span>
                        <span className="text-xs text-white/70 font-semibold">{p.game?.nameAr}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-xs text-white font-bold">{p.package?.name}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge className="text-[10px] bg-primary/20 text-primary border-0">{p.count} مرة</Badge>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-xs font-bold text-emerald-400">{p.revenue.toLocaleString()} ج</span>
                    </td>
                  </tr>
                ))}
                {topPackages.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-muted-foreground/40 text-sm">لا توجد بيانات بعد</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Section 5: Top Customers ── */}
      <section>
        <SectionHeader icon={Crown} title="Top Customers — أفضل العملاء إنفاقاً" color="#facc15" />
        <div className="space-y-2">
          {topCustomers.slice(0, 10).map((c: any, i: number) => (
            <div key={c.id} className="glass-panel rounded-xl p-3 flex items-center gap-3 border border-white/6" data-testid={`row-topcustomer-${i}`}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                style={{ background: i === 0 ? "#facc1522" : i === 1 ? "#94a3b822" : i === 2 ? "#f97316" + "22" : "#ffffff11",
                  color: i === 0 ? "#facc15" : i === 1 ? "#94a3b8" : i === 2 ? "#f97316" : "#ffffff66" }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{c.name || c.username}</p>
                <p className="text-[10px] text-muted-foreground/55">{c.phone} • {c.orderCount} طلب</p>
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-emerald-400">{c.totalSpent.toLocaleString()} ج</p>
                <p className="text-[10px] text-muted-foreground/50">إجمالي الإنفاق</p>
              </div>
              <div className="text-[10px] text-muted-foreground/50 hidden sm:block">
                {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString("ar") : "—"}
              </div>
            </div>
          ))}
          {topCustomers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground/40 text-sm glass-panel rounded-2xl border border-white/6 p-6">لا توجد بيانات بعد</div>
          )}
        </div>
      </section>

      {/* ── Section 4: Customer Activity ── */}
      <section>
        <SectionHeader icon={Activity} title="Customer Activity — نشاط العملاء" color="#0090ff" />
        <div className="mb-3">
          <input
            type="text"
            placeholder="ابحث بالاسم أو الرقم..."
            value={activitySearch}
            onChange={e => setActivitySearch(e.target.value)}
            className="w-full sm:w-72 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-muted-foreground/40 outline-none focus:border-primary/40"
            data-testid="input-activity-search"
          />
        </div>
        {activityLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        ) : (
          <div className="glass-panel rounded-2xl border border-white/8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="py-3 px-4 text-right text-xs text-muted-foreground/60 font-bold">العميل</th>
                    <th className="py-3 px-4 text-right text-xs text-muted-foreground/60 font-bold">عدد الطلبات</th>
                    <th className="py-3 px-4 text-right text-xs text-muted-foreground/60 font-bold">إجمالي الإنفاق</th>
                    <th className="py-3 px-4 text-right text-xs text-muted-foreground/60 font-bold">اللعبة المفضلة</th>
                    <th className="py-3 px-4 text-right text-xs text-muted-foreground/60 font-bold">آخر نشاط</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivity.slice(0, 50).map((c: any, i: number) => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/3 transition-colors" data-testid={`row-activity-${i}`}>
                      <td className="py-2.5 px-4">
                        <div>
                          <p className="text-xs font-bold text-white">{c.name || c.username}</p>
                          <p className="text-[10px] text-muted-foreground/50">{c.phone}</p>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge className="text-[10px] bg-primary/15 text-primary border-0">{c.orderCount}</Badge>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-xs font-bold text-emerald-400">{c.totalSpent.toLocaleString()} ج</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-xs text-white/60">{c.topGame || "—"}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-[10px] text-muted-foreground/50">
                          {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString("ar") : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredActivity.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted-foreground/40 text-sm">لا توجد نتائج</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 7: Behavior Insights ── */}
      <section>
        <SectionHeader icon={Flame} title="Behavior Insights — تتبع سلوك المستخدمين" color="#f43f5e" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel rounded-2xl p-4 border border-white/8">
            <p className="text-xs font-bold text-white/60 mb-3 flex items-center gap-1.5"><Gamepad2 className="w-3.5 h-3.5" />أكثر الألعاب فتحاً</p>
            <div className="space-y-2">
              {(behavior.gameOpens || []).slice(0, 8).map((g: any, i: number) => (
                <div key={g.target} className="flex items-center gap-2" data-testid={`behavior-game-${i}`}>
                  <span className="text-[10px] text-muted-foreground/50 w-4">{i + 1}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min(100, (g.count / ((behavior.gameOpens[0]?.count || 1))) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-white/70 truncate max-w-[80px]">{g.target}</span>
                  <span className="text-[10px] font-bold text-primary">{g.count}</span>
                </div>
              ))}
              {(!behavior.gameOpens?.length) && <p className="text-[11px] text-muted-foreground/40 text-center py-3">لا توجد بيانات بعد</p>}
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-4 border border-white/8">
            <p className="text-xs font-bold text-white/60 mb-3 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />أكثر الباقات ضغطاً</p>
            <div className="space-y-2">
              {(behavior.packageClicks || []).slice(0, 8).map((p: any, i: number) => (
                <div key={p.target} className="flex items-center gap-2" data-testid={`behavior-pkg-${i}`}>
                  <span className="text-[10px] text-muted-foreground/50 w-4">{i + 1}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(100, (p.count / ((behavior.packageClicks[0]?.count || 1))) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-white/70 truncate max-w-[80px]">{p.target}</span>
                  <span className="text-[10px] font-bold text-amber-400">{p.count}</span>
                </div>
              ))}
              {(!behavior.packageClicks?.length) && <p className="text-[11px] text-muted-foreground/40 text-center py-3">لا توجد بيانات بعد</p>}
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-4 border border-white/8">
            <p className="text-xs font-bold text-white/60 mb-3 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" />الصفحات الأكثر زيارة</p>
            <div className="space-y-2">
              {(behavior.pageViews || []).slice(0, 8).map((v: any, i: number) => (
                <div key={v.target} className="flex items-center gap-2" data-testid={`behavior-page-${i}`}>
                  <span className="text-[10px] text-muted-foreground/50 w-4">{i + 1}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-violet-400 h-full rounded-full" style={{ width: `${Math.min(100, (v.count / ((behavior.pageViews[0]?.count || 1))) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-white/70 truncate max-w-[80px]">{v.target}</span>
                  <span className="text-[10px] font-bold text-violet-400">{v.count}</span>
                </div>
              ))}
              {(!behavior.pageViews?.length) && <p className="text-[11px] text-muted-foreground/40 text-center py-3">لا توجد بيانات بعد</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
