import { Link } from "wouter";
import { motion } from "framer-motion";
import { getGameImage } from "@/lib/gameImages";
import { Zap, Package, ChevronLeft } from "lucide-react";

interface GameCardProps {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  icon: string;
  image?: string;
  color: string;
  packagesCount: number;
  minPrice?: number | null;
  isCenter?: boolean;
  index?: number;
  onClick?: () => void;
}

export function GameCard({
  id, name, nameAr, slug, icon, image, color,
  packagesCount, minPrice, isCenter, index = 0, onClick
}: GameCardProps) {
  const fallbackImage = getGameImage(slug);
  const displayImage = image || fallbackImage;

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.025 }}
      whileTap={{ scale: 0.97 }}
      className="group relative rounded-2xl overflow-hidden cursor-pointer w-full select-none"
      style={{ boxShadow: "0 6px 28px rgba(0,0,0,0.5)" }}
    >
      <div className="aspect-[3/4] relative">
        {/* Background */}
        {displayImage ? (
          <img
            src={displayImage}
            alt={nameAr}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${color}`} />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/10" />

        {/* Hover glow overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: "linear-gradient(to top, rgba(0,100,255,0.4) 0%, rgba(0,60,200,0.12) 45%, transparent 70%)" }}
        />

        {/* Hover glow border */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
          style={{ boxShadow: "inset 0 0 0 1.5px rgba(0,144,255,0.55), 0 0 30px rgba(0,144,255,0.2)" }}
        />

        {/* Top-right: package count */}
        <div className="absolute top-2.5 right-2.5">
          {packagesCount > 0 && (
            <span
              className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-lg text-white/70"
              style={{
                background: "rgba(0,0,0,0.75)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Package className="w-2.5 h-2.5 text-white/40" />
              {packagesCount}
            </span>
          )}
        </div>

        {/* Top-left: Instant badge */}
        <div className="absolute top-2.5 left-2.5">
          <span
            className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-lg text-yellow-300"
            style={{
              background: "rgba(0,0,0,0.82)",
              border: "1px solid rgba(250,204,21,0.2)",
              boxShadow: "0 0 8px rgba(250,204,21,0.15)",
            }}
          >
            <Zap className="w-2.5 h-2.5 text-yellow-300" />
            Instant
          </span>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {/* Slide-up CTA (CSS group-hover) */}
          <div className="transform translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out mb-2">
            <div
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white w-full"
              style={{
                background: "linear-gradient(135deg, rgba(0,130,255,0.95), rgba(0,65,210,0.95))",
                boxShadow: "0 4px 16px rgba(0,144,255,0.5)",
              }}
            >
              عرض الباقات
              <ChevronLeft className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Game name + price */}
          <h3
            className="font-black text-white leading-tight drop-shadow-xl mb-0.5"
            style={{ fontSize: "clamp(0.7rem, 2.4vw, 0.92rem)", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}
            data-testid={`text-game-name-${slug}`}
          >
            {nameAr}
          </h3>

          <div className="flex items-center justify-between">
            {minPrice != null ? (
              <span className="text-[10px] text-white/50">
                من{" "}
                <span className="text-yellow-400 font-bold">{minPrice} ج</span>
              </span>
            ) : (
              <span className="text-[10px] text-white/35 tracking-wide">{name}</span>
            )}
            <div className="h-0.5 w-0 group-hover:w-6 transition-all duration-500 rounded-full bg-gradient-to-l from-primary to-cyan-400" />
          </div>
        </div>
      </div>
    </motion.div>
  );

  if (onClick) {
    return <div onClick={onClick} className="w-full">{inner}</div>;
  }

  return (
    <Link href={`/games/${slug}`} data-testid={`card-game-${slug}`} className="w-full block">
      {inner}
    </Link>
  );
}
