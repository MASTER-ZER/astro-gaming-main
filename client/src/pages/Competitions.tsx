import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, Copy, Check, Lock, Gift, Zap, ChevronDown, ChevronUp, Users, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Competition } from "@shared/schema";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 px-3 py-2 rounded-xl text-sm font-mono font-bold text-white text-center tracking-widest"
        style={{ background: "rgba(0,144,255,0.1)", border: "1px solid rgba(0,144,255,0.2)" }}
        data-testid={`text-${label}`}
      >
        {text}
      </div>
      <button
        onClick={handleCopy}
        data-testid={`button-copy-${label}`}
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
        style={{
          background: copied ? "rgba(52,211,153,0.15)" : "rgba(0,144,255,0.12)",
          border: copied ? "1px solid rgba(52,211,153,0.4)" : "1px solid rgba(0,144,255,0.25)",
        }}
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-primary" />}
      </button>
    </div>
  );
}

function statusLabel(s: string) {
  if (s === "upcoming") return { label: "قريباً", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
  if (s === "active") return { label: "جارية الآن 🔴", color: "#34d399", bg: "rgba(52,211,153,0.12)" };
  return { label: "انتهت", color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.05)" };
}

function CompetitionCard({ comp }: { comp: Competition }) {
  const [expanded, setExpanded] = useState(false);
  const status = statusLabel(comp.status);
  const isFree = !comp.entryFee || comp.entryFee === 0;
  const hasRoomInfo = comp.status === "active" && (comp.roomCode || comp.roomPassword);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, rgba(10,18,42,0.95), rgba(4,6,18,0.98))",
        border: "1px solid rgba(0,144,255,0.12)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {comp.gameImage ? (
              <img src={comp.gameImage} alt={comp.gameName} className="w-12 h-12 rounded-xl object-cover shrink-0" />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(0,144,255,0.15)", border: "1px solid rgba(0,144,255,0.2)" }}
              >
                <Zap className="w-6 h-6 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-black text-white text-base leading-tight truncate">{comp.title}</h3>
              <p className="text-xs text-white/40 mt-0.5">{comp.gameName}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: status.bg, color: status.color, border: `1px solid ${status.color}33` }}
            >
              {status.label}
            </span>
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{
                background: isFree ? "rgba(52,211,153,0.1)" : "rgba(245,158,11,0.1)",
                color: isFree ? "#34d399" : "#f59e0b",
                border: isFree ? "1px solid rgba(52,211,153,0.25)" : "1px solid rgba(245,158,11,0.25)",
              }}
            >
              {isFree ? "مجاناً" : `${comp.entryFee} جنيه`}
            </span>
          </div>
        </div>

        {/* Info row */}
        <div className="flex flex-wrap gap-3 text-xs text-white/40 mb-3">
          {comp.scheduledAt && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(comp.scheduledAt).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
            </span>
          )}
          {comp.prize && (
            <span className="flex items-center gap-1 text-yellow-400/70">
              <Gift className="w-3.5 h-3.5" />
              {comp.prize}
            </span>
          )}
        </div>

        {comp.description && (
          <p className="text-sm text-white/55 leading-relaxed">{comp.description}</p>
        )}
      </div>

      {/* Expand button */}
      <button
        onClick={() => setExpanded(e => !e)}
        data-testid={`button-expand-${comp.id}`}
        className="w-full px-4 py-2.5 flex items-center justify-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        {expanded ? <><ChevronUp className="w-4 h-4" />إخفاء التفاصيل</> : <><ChevronDown className="w-4 h-4" />عرض التفاصيل والغرفة</>}
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4">
              {/* Rules */}
              {comp.rules && (
                <div
                  className="p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <p className="text-xs font-bold text-white/60 mb-2 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> الشروط والقواعد
                  </p>
                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{comp.rules}</p>
                </div>
              )}

              {/* Room Info */}
              {hasRoomInfo ? (
                <div
                  className="p-3 rounded-xl space-y-3"
                  style={{ background: "rgba(0,144,255,0.06)", border: "1px solid rgba(0,144,255,0.18)" }}
                >
                  <p className="text-xs font-bold text-primary/80 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> معلومات الغرفة
                  </p>
                  {comp.roomCode && (
                    <div>
                      <p className="text-[11px] text-white/40 mb-1.5">كود الغرفة</p>
                      <CopyButton text={comp.roomCode} label="room-code" />
                    </div>
                  )}
                  {comp.roomPassword && (
                    <div>
                      <p className="text-[11px] text-white/40 mb-1.5">كلمة السر</p>
                      <CopyButton text={comp.roomPassword} label="room-password" />
                    </div>
                  )}
                </div>
              ) : comp.status === "upcoming" ? (
                <div
                  className="p-3 rounded-xl text-center"
                  style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
                >
                  <Clock className="w-5 h-5 text-yellow-400/60 mx-auto mb-1" />
                  <p className="text-xs text-yellow-400/60">سيتم نشر معلومات الغرفة عند بدء المسابقة</p>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Competitions() {
  const { data: competitions = [], isLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"],
  });

  return (
    <div className="min-h-screen" dir="rtl" style={{ background: "linear-gradient(160deg, #02040e 0%, #06091a 100%)" }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(239,68,68,0.15))", border: "1px solid rgba(245,158,11,0.3)" }}
            >
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <h1 className="text-xl font-black text-white">المسابقات</h1>
          </div>
          <p className="text-sm text-white/40 mr-13 pr-0 pl-0" style={{ paddingRight: "52px" }}>
            شارك في مسابقاتنا وفوز بجوائز رائعة
          </p>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-yellow-400/40 border-t-yellow-400 animate-spin" />
          </div>
        ) : competitions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Trophy className="w-14 h-14 text-yellow-400/20 mx-auto mb-4" />
            <p className="text-white/40 font-bold text-lg">لا توجد مسابقات حالياً</p>
            <p className="text-white/25 text-sm mt-1">تابعنا لمعرفة المسابقات القادمة</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {competitions.map((comp, i) => (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <CompetitionCard comp={comp} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
