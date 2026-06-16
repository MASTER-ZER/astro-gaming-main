import { GameCard } from "@/components/GameCard";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Search, Loader2, Gamepad2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { Game, Package } from "@shared/schema";

export default function Games() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: games = [], isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const { data: packages = [] } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
  });

  const activeGames = games.filter((g) => g.isActive !== false);

  const getPackageCount = (gameId: string) => {
    return packages.filter((p) => p.gameId === gameId).length;
  };

  const getMinPrice = (gameId: string): number | null => {
    const gamePkgs = packages.filter((p) => p.gameId === gameId && p.isActive !== false);
    if (!gamePkgs.length) return null;
    return Math.min(...gamePkgs.map((p) => p.price));
  };

  const filteredGames = activeGames.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.nameAr.includes(searchQuery)
  );

  const displayGames = searchQuery.trim() ? filteredGames : activeGames;

  return (
    <div className="min-h-screen relative" dir="rtl">
      <ParticleBackground />

      <div className="relative z-10 py-8 sm:py-10 md:py-14">
        {/* Header */}
        <div className="container mx-auto px-3 sm:px-4">
          <motion.div
            className="text-center mb-8 sm:mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 mb-4 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(0,144,255,0.2), rgba(0,80,200,0.1))",
                border: "1px solid rgba(0,144,255,0.2)",
                boxShadow: "0 0 32px rgba(0,144,255,0.15)",
              }}
            >
              <Gamepad2 className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2">
              <span className="text-gradient-gold-animated">متجر الألعاب</span>
            </h1>
            <p className="text-muted-foreground text-sm mb-6">
              اختر لعبتك واشحن بأفضل الأسعار — فوري وآمن 100%
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="ابحث عن لعبة..."
                className="pr-10 h-11 text-sm glass-input rounded-xl border-primary/15 focus:border-primary/40"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-games"
              />
            </div>
          </motion.div>

          {/* Games Grid */}
          {gamesLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-10 h-10 text-primary" />
              </motion.div>
              <p className="text-muted-foreground text-sm animate-pulse">جاري تحميل الألعاب…</p>
            </div>
          ) : displayGames.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 glass-premium rounded-2xl max-w-sm mx-auto"
            >
              <Sparkles className="w-12 h-12 text-primary/30 mx-auto mb-3" />
              <p className="text-lg font-bold text-muted-foreground">
                {searchQuery.trim() ? "لا توجد نتائج" : "لا توجد ألعاب متاحة حالياً"}
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                {searchQuery.trim() ? "جرّب كلمة بحث أخرى" : "سيتم إضافة الألعاب قريباً"}
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
              {displayGames.map((game, index) => (
                <GameCard
                  key={game.id}
                  id={game.id}
                  name={game.name}
                  nameAr={game.nameAr}
                  slug={game.slug}
                  icon={game.icon}
                  image={game.image || undefined}
                  color={game.color}
                  packagesCount={getPackageCount(game.id)}
                  minPrice={getMinPrice(game.id)}
                  index={index}
                />
              ))}
            </div>
          )}

          {/* Count footer */}
          {!gamesLoading && displayGames.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center text-xs text-muted-foreground/50 mt-8"
            >
              {displayGames.length} لعبة متاحة للشحن الفوري
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
