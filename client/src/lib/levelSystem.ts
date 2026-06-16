export interface LevelInfo {
  level: number;
  rank: string;
  rankEn: string;
  xp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progress: number;
  color: string;
  bgColor: string;
  icon: string;
}

export const RANKS = [
  { level: 1, rank: "مبتدئ", rankEn: "Starter", minOrders: 0, color: "#94a3b8", bgColor: "bg-slate-500/20", icon: "🌱" },
  { level: 2, rank: "متحمس", rankEn: "Enthusiast", minOrders: 3, color: "#60a5fa", bgColor: "bg-blue-500/20", icon: "⭐" },
  { level: 3, rank: "فضة", rankEn: "Silver", minOrders: 8, color: "#c0c0c0", bgColor: "bg-slate-300/20", icon: "🥈" },
  { level: 4, rank: "ذهب", rankEn: "Gold", minOrders: 20, color: "#fbbf24", bgColor: "bg-amber-500/20", icon: "🥇" },
  { level: 5, rank: "ماسي", rankEn: "Diamond", minOrders: 50, color: "#a78bfa", bgColor: "bg-purple-500/20", icon: "💎" },
];

export const XP_PER_ORDER = 100;

export function calculateLevelInfo(completedOrders: number): LevelInfo {
  const xp = completedOrders * XP_PER_ORDER;

  let currentRank = RANKS[0];
  let nextRank = RANKS[1];

  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (completedOrders >= RANKS[i].minOrders) {
      currentRank = RANKS[i];
      nextRank = RANKS[i + 1] || RANKS[i];
      break;
    }
  }

  const xpForCurrentLevel = currentRank.minOrders * XP_PER_ORDER;
  const xpForNextLevel = nextRank === currentRank
    ? xpForCurrentLevel
    : nextRank.minOrders * XP_PER_ORDER;

  const rangeSize = xpForNextLevel - xpForCurrentLevel;
  const progress = rangeSize === 0
    ? 100
    : Math.min(100, ((xp - xpForCurrentLevel) / rangeSize) * 100);

  return {
    level: currentRank.level,
    rank: currentRank.rank,
    rankEn: currentRank.rankEn,
    xp,
    xpForCurrentLevel,
    xpForNextLevel,
    progress,
    color: currentRank.color,
    bgColor: currentRank.bgColor,
    icon: currentRank.icon,
  };
}

export function getNextRank(currentLevel: number) {
  return RANKS.find(r => r.level === currentLevel + 1) || null;
}
