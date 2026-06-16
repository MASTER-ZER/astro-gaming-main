import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Zap, ShoppingBag, Tag, Crown, Medal, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeaderboardEntry {
  rank: number;
  customerId: string;
  name: string;
  username: string;
  orderCount?: number;
  totalSpent?: number;
  requestCount?: number;
}

interface LeaderboardData {
  topShippers: LeaderboardEntry[];
  topBuyers: LeaderboardEntry[];
  topSellers: LeaderboardEntry[];
}

const RANK_STYLES = [
  { bg: "from-yellow-500/20 to-yellow-600/5", border: "border-yellow-500/40", text: "text-yellow-400", icon: "🥇", glow: "shadow-yellow-500/20" },
  { bg: "from-slate-400/20 to-slate-500/5", border: "border-slate-400/40", text: "text-slate-300", icon: "🥈", glow: "shadow-slate-400/20" },
  { bg: "from-orange-700/20 to-orange-800/5", border: "border-orange-700/40", text: "text-orange-500", icon: "🥉", glow: "shadow-orange-700/20" },
];

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-orange-500" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">#{rank}</span>;
}

function LeaderboardCard({ entry, scoreLabel, score }: { entry: LeaderboardEntry; scoreLabel: string; score: string }) {
  const style = RANK_STYLES[entry.rank - 1];
  const isTop3 = entry.rank <= 3;
  const initial = (entry.name || entry.username || "?")[0]?.toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: entry.rank * 0.05 }}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        isTop3
          ? `bg-gradient-to-r ${style.bg} ${style.border} shadow-lg ${style.glow}`
          : "bg-white/3 border-white/8 hover:bg-white/6"
      }`}
      data-testid={`leaderboard-row-${entry.rank}`}
    >
      <div className="flex items-center justify-center w-8 shrink-0">
        <RankIcon rank={entry.rank} />
      </div>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
        isTop3 ? `${style.text} bg-white/10` : "bg-primary/20 text-primary"
      }`}>
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm truncate ${isTop3 ? style.text : ""}`}>
          {entry.name || "—"}
        </p>
        {entry.username && (
          <p className="text-[11px] text-muted-foreground/70 truncate">@{entry.username}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={`font-bold text-sm ${isTop3 ? style.text : "text-primary"}`}>{score}</p>
        <p className="text-[10px] text-muted-foreground">{scoreLabel}</p>
      </div>
    </motion.div>
  );
}

function TopThreePodium({ entries, scoreKey, scoreLabel, unit }: {
  entries: LeaderboardEntry[];
  scoreKey: "totalSpent" | "orderCount" | "requestCount";
  scoreLabel: string;
  unit: string;
}) {
  if (entries.length === 0) return null;
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  const getScore = (e: LeaderboardEntry) => {
    if (scoreKey === "totalSpent") return `${e.totalSpent?.toLocaleString()} ${unit}`;
    if (scoreKey === "orderCount") return `${e.orderCount} ${unit}`;
    return `${e.requestCount} ${unit}`;
  };

  return (
    <div className="flex items-end justify-center gap-3 mb-6 pt-2">
      {/* 2nd */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-12 h-12 rounded-full bg-slate-400/20 border-2 border-slate-400/50 flex items-center justify-center text-lg font-bold text-slate-300">
          {(second?.name || second?.username || "?")[0]?.toUpperCase() || "?"}
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-300 truncate max-w-[70px]">{second?.name || "—"}</p>
          <p className="text-[10px] text-muted-foreground">{second ? getScore(second) : "—"}</p>
        </div>
        <div className="w-14 h-16 bg-slate-400/20 border border-slate-400/30 rounded-t-lg flex items-center justify-center">
          <span className="text-2xl">🥈</span>
        </div>
      </div>
      {/* 1st */}
      <div className="flex flex-col items-center gap-1">
        <Crown className="w-5 h-5 text-yellow-400 mb-1" />
        <div className="w-14 h-14 rounded-full bg-yellow-500/20 border-2 border-yellow-500/60 flex items-center justify-center text-xl font-bold text-yellow-400 shadow-lg shadow-yellow-500/20">
          {(first?.name || first?.username || "?")[0]?.toUpperCase() || "?"}
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-yellow-400 truncate max-w-[80px]">{first?.name || "—"}</p>
          <p className="text-[10px] text-muted-foreground">{first ? getScore(first) : "—"}</p>
        </div>
        <div className="w-16 h-24 bg-yellow-500/20 border border-yellow-500/30 rounded-t-lg flex items-center justify-center">
          <span className="text-2xl">🥇</span>
        </div>
      </div>
      {/* 3rd */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-12 h-12 rounded-full bg-orange-700/20 border-2 border-orange-700/50 flex items-center justify-center text-lg font-bold text-orange-500">
          {(third?.name || third?.username || "?")[0]?.toUpperCase() || "?"}
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-orange-500 truncate max-w-[70px]">{third?.name || "—"}</p>
          <p className="text-[10px] text-muted-foreground">{third ? getScore(third) : "—"}</p>
        </div>
        <div className="w-14 h-12 bg-orange-700/20 border border-orange-700/30 rounded-t-lg flex items-center justify-center">
          <span className="text-2xl">🥉</span>
        </div>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { data, isLoading } = useQuery<LeaderboardData>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 60000,
  });

  return (
    <div className="min-h-screen pb-20" dir="rtl">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-7 h-7 text-yellow-400" />
            <h1 className="text-2xl font-bold">لوحة الشرف</h1>
            <Trophy className="w-7 h-7 text-yellow-400" />
          </div>
          <p className="text-sm text-muted-foreground">أبطال متجر ASTRO Gaming 🎮</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="shippers" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="shippers" className="gap-1 text-xs">
                <Zap className="w-3.5 h-3.5" />
                الشحن
              </TabsTrigger>
              <TabsTrigger value="buyers" className="gap-1 text-xs">
                <ShoppingBag className="w-3.5 h-3.5" />
                شراء حسابات
              </TabsTrigger>
              <TabsTrigger value="sellers" className="gap-1 text-xs">
                <Tag className="w-3.5 h-3.5" />
                بيع حسابات
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shippers" className="space-y-2 mt-0">
              <TopThreePodium entries={data?.topShippers || []} scoreKey="totalSpent" scoreLabel="الإنفاق" unit="ج" />
              {(data?.topShippers || []).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">لا يوجد متصدرين بعد</div>
              ) : (
                <div className="space-y-2">
                  {(data?.topShippers || []).slice(3).map((entry) => (
                    <LeaderboardCard
                      key={entry.rank}
                      entry={entry}
                      scoreLabel="مصروف"
                      score={`${entry.totalSpent?.toLocaleString()} ج`}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="buyers" className="space-y-2 mt-0">
              <TopThreePodium entries={data?.topBuyers || []} scoreKey="orderCount" scoreLabel="طلب" unit="طلب" />
              {(data?.topBuyers || []).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">لا يوجد متصدرين بعد</div>
              ) : (
                <div className="space-y-2">
                  {(data?.topBuyers || []).slice(3).map((entry) => (
                    <LeaderboardCard
                      key={entry.rank}
                      entry={entry}
                      scoreLabel="حساب مشترى"
                      score={`${entry.orderCount} طلب`}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sellers" className="space-y-2 mt-0">
              <TopThreePodium entries={data?.topSellers || []} scoreKey="requestCount" scoreLabel="حساب مباع" unit="حساب" />
              {(data?.topSellers || []).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">لا يوجد متصدرين بعد</div>
              ) : (
                <div className="space-y-2">
                  {(data?.topSellers || []).slice(3).map((entry) => (
                    <LeaderboardCard
                      key={entry.rank}
                      entry={entry}
                      scoreLabel="حساب مباع"
                      score={`${entry.requestCount} حساب`}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
