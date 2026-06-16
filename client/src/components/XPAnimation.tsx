import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { calculateLevelInfo, getNextRank, XP_PER_ORDER } from "@/lib/levelSystem";

interface XPAnimationProps {
  show: boolean;
  previousOrders: number;
  currentOrders: number;
  onComplete?: () => void;
}

export function XPAnimation({ show, previousOrders, currentOrders, onComplete }: XPAnimationProps) {
  const [showLevelUp, setShowLevelUp] = useState(false);
  const prevLevel = calculateLevelInfo(previousOrders);
  const currLevel = calculateLevelInfo(currentOrders);
  const leveledUp = currLevel.level > prevLevel.level;

  useEffect(() => {
    if (show && leveledUp) {
      const t = setTimeout(() => setShowLevelUp(true), 800);
      return () => clearTimeout(t);
    }
    if (!show) setShowLevelUp(false);
  }, [show, leveledUp]);

  useEffect(() => {
    if (show) {
      const t = setTimeout(() => {
        onComplete?.();
      }, leveledUp ? 3500 : 2000);
      return () => clearTimeout(t);
    }
  }, [show, leveledUp, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center" dir="rtl">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: -60, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="text-center"
          >
            <div className="text-3xl font-black text-amber-400 drop-shadow-lg">
              +{XP_PER_ORDER} XP
            </div>
          </motion.div>

          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              animate={{
                opacity: 0,
                x: (Math.random() - 0.5) * 300,
                y: (Math.random() - 0.5) * 300,
                scale: 0,
              }}
              transition={{ duration: 1.2 + Math.random() * 0.8, delay: Math.random() * 0.3 }}
              className="absolute text-lg"
              style={{ top: "50%", left: "50%" }}
            >
              {["⭐", "✨", "🎉", "💫", "🌟"][Math.floor(Math.random() * 5)]}
            </motion.div>
          ))}

          {leveledUp && showLevelUp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="glass-card rounded-3xl p-8 text-center max-w-xs mx-4 border border-amber-500/50 shadow-2xl">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-6xl mb-3"
                >
                  {currLevel.icon}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-amber-400 font-black text-2xl mb-1">ترقية!</p>
                  <p className="text-white font-bold text-xl mb-1">
                    المستوى {currLevel.level}
                  </p>
                  <p className="text-lg font-bold mb-2" style={{ color: currLevel.color }}>
                    {currLevel.icon} {currLevel.rank}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    تهانينا! لقد وصلت لرتبة {currLevel.rank}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
