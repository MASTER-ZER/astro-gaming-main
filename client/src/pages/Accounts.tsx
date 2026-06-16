import { ParticleBackground } from "@/components/ParticleBackground";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { User, Star, ShoppingCart, Loader2, ChevronLeft, ChevronRight, Image, Sparkles, Crown, Gamepad2, Filter, TrendingUp, Link2, ZoomIn, X } from "lucide-react";
import { useState, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import type { Account, Game } from "@shared/schema";
import { useCustomer } from "@/hooks/useCustomer";
import { CustomerLoginModal } from "@/components/CustomerLoginModal";

type AccountWithGame = Account & { game?: Game };

const LINKING_LABELS: Record<string, string> = {
  email: "إيميل",
  facebook: "فيسبوك",
  google: "جوجل",
  phone: "رقم هاتف",
  apple: "Apple ID",
  other: "أخرى",
};

// ─── Image Preview Modal with Zoom/Pan ─────────────────────────────────────
function ImageZoomModal({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <button
            onClick={() => setScale(s => Math.min(s + 0.5, 5))}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg font-bold backdrop-blur-sm transition-colors"
          >+</button>
          <button
            onClick={() => { setScale(1); setPos({ x: 0, y: 0 }); }}
            className="px-3 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs backdrop-blur-sm transition-colors"
          >إعادة</button>
          <button
            onClick={() => setScale(s => Math.max(s - 0.5, 0.5))}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg font-bold backdrop-blur-sm transition-colors"
          >−</button>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-white backdrop-blur-sm transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-[10px] pointer-events-none">
          اسحب للتحريك · +/− للتكبير · اضغط خارج الصورة للإغلاق
        </p>
        <div
          className="overflow-hidden w-[90vw] h-[80vh] flex items-center justify-center rounded-2xl"
          onMouseDown={(e) => { setDragging(true); dragStart.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }; }}
          onMouseMove={(e) => { if (!dragging) return; setPos({ x: dragStart.current.px + e.clientX - dragStart.current.x, y: dragStart.current.py + e.clientY - dragStart.current.y }); }}
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => setDragging(false)}
          style={{ cursor: dragging ? "grabbing" : scale > 1 ? "grab" : "default" }}
        >
          <motion.img
            src={src}
            alt="معاينة"
            style={{ transform: `scale(${scale}) translate(${pos.x / scale}px, ${pos.y / scale}px)` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl select-none"
            draggable={false}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ImageGallery({ images, title, onPreview }: { images: string[]; title: string; onPreview?: (src: string) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-40 md:h-48 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col items-center justify-center">
        <Image className="w-10 h-10 md:w-12 md:h-12 text-primary/30 mb-2" />
        <p className="text-xs text-muted-foreground">لا توجد صور</p>
      </div>
    );
  }

  return (
    <div className="relative group">
      <img
        src={images[currentIndex]}
        alt={`${title} - صورة ${currentIndex + 1}`}
        className="w-full h-40 md:h-48 rounded-xl object-cover"
        onClick={(e) => { e.stopPropagation(); onPreview?.(images[currentIndex]); }}
        style={{ cursor: onPreview ? "zoom-in" : "default" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      {onPreview && (
        <button onClick={(e) => { e.stopPropagation(); onPreview(images[currentIndex]); }} className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-3.5 h-3.5 text-white" />
        </button>
      )}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + images.length) % images.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover-elevate transition-colors mobile-touch-feedback"
            data-testid="button-gallery-prev"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % images.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover-elevate transition-colors mobile-touch-feedback"
            data-testid="button-gallery-next"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <motion.div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? "bg-primary w-4" : "bg-white/50"}`}
                animate={{ scale: i === currentIndex ? 1.2 : 1 }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Accounts() {
  const [, setLocation] = useLocation();
  const { isLoggedIn } = useCustomer();
  const [showLogin, setShowLogin] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountWithGame | null>(null);
  const [filterGame, setFilterGame] = useState<string>("all");
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [filterMinPrice, setFilterMinPrice] = useState<string>("");
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>("");

  const { data: accounts = [], isLoading } = useQuery<AccountWithGame[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: games = [] } = useQuery<Game[]>({ queryKey: ["/api/games"] });

  const getAccountGameLabel = (account: AccountWithGame) => {
    if ((account as any).gameType) return (account as any).gameType as string;
    const game = games.find(g => g.id === account.gameId);
    return game ? game.nameAr : "";
  };

  const uniqueGameLabels = useMemo(() => {
    const labels = new Set<string>();
    accounts.filter(a => a.isActive && !a.isSold).forEach(a => {
      const label = getAccountGameLabel(a);
      if (label) labels.add(label);
    });
    return Array.from(labels).sort();
  }, [accounts, games]);

  const availableAccounts = useMemo(() => {
    let filtered = accounts.filter(a => a.isActive && !a.isSold);
    if (filterGame && filterGame !== "all") {
      filtered = filtered.filter(a => getAccountGameLabel(a) === filterGame);
    }
    if (filterMinPrice) {
      filtered = filtered.filter(a => a.price >= parseInt(filterMinPrice));
    }
    if (filterMaxPrice) {
      filtered = filtered.filter(a => a.price <= parseInt(filterMaxPrice));
    }
    return filtered;
  }, [accounts, games, filterGame, filterMinPrice, filterMaxPrice]);

  const hasFilters = filterGame !== "all" || filterMinPrice || filterMaxPrice;

  return (
    <div className="min-h-screen relative">
      {previewImg && <ImageZoomModal src={previewImg} onClose={() => setPreviewImg(null)} />}
      <ParticleBackground />

      <div className="relative z-10 py-8 md:py-12 container mx-auto px-4">
        <motion.div
          className="text-center mb-8 md:mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-block mb-4">
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-cyan-600 flex items-center justify-center shadow-lg glow-gold">
              <User className="w-8 h-8 md:w-10 md:h-10 text-black" />
            </div>
          </motion.div>
          <h1 className="text-2xl md:text-4xl font-black mb-3">
            <span className="text-gradient-gold-animated">حسابات للبيع</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">اشترِ حسابات ألعاب جاهزة بمستويات عالية</p>

          <Link href="/sell-account">
            <Button variant="outline" className="mt-4 border-primary/40 hover:border-primary" data-testid="button-sell-my-account">
              <TrendingUp className="w-4 h-4 ml-2" />
              بيع حسابك
            </Button>
          </Link>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-ultra rounded-2xl p-4 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">تصفية الحسابات</span>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="mr-auto text-xs h-7 px-2"
                onClick={() => { setFilterGame("all"); setFilterMinPrice(""); setFilterMaxPrice(""); }}
                data-testid="button-clear-filters"
              >
                إلغاء الفلاتر
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={filterGame} onValueChange={setFilterGame}>
              <SelectTrigger data-testid="select-filter-game">
                <SelectValue placeholder="كل الألعاب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الألعاب</SelectItem>
                {uniqueGameLabels.map(label => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="أقل سعر (ج)"
              value={filterMinPrice}
              onChange={e => setFilterMinPrice(e.target.value)}
              data-testid="input-filter-min-price"
            />
            <Input
              type="number"
              placeholder="أعلى سعر (ج)"
              value={filterMaxPrice}
              onChange={e => setFilterMaxPrice(e.target.value)}
              data-testid="input-filter-max-price"
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div className="absolute inset-0 blur-xl bg-primary/30 animate-pulse" />
            </div>
          </div>
        ) : availableAccounts.length === 0 ? (
          <motion.div
            className="text-center py-12 md:py-16 glass-ultra rounded-2xl max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Sparkles className="w-12 h-12 text-primary/50 mx-auto mb-4" />
            <p className="text-xl font-bold text-muted-foreground">
              {hasFilters ? "لا توجد حسابات تطابق البحث" : "لا توجد حسابات متاحة حالياً"}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {hasFilters ? "جرب تغيير فلاتر البحث" : "تابعنا للحصول على عروض جديدة"}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {availableAccounts.map((account, index) => {
              const accentColors = ["#dc2626","#7c3aed","#0891b2","#d97706","#059669","#db2777"];
              const ac = accentColors[index % accentColors.length];
              const floatDur = 4.5 + (index % 4) * 0.9;
              return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{
                  opacity: 1,
                  y: [0, -4, -1, -5, 0],
                }}
                transition={{
                  opacity: { delay: index * 0.05, duration: 0.4 },
                  y: { duration: floatDur, repeat: Infinity, ease: "easeInOut", times: [0, 0.3, 0.5, 0.75, 1] },
                }}
                whileHover={{ scale: 1.02, y: -7 }}
                whileTap={{ scale: 0.98 }}
                data-testid={`card-account-${account.id}`}
              >
                <div
                  className="group relative rounded-2xl overflow-hidden cursor-pointer"
                  style={{
                    background: `linear-gradient(160deg, ${ac}18 0%, rgba(10,10,20,0.95) 100%)`,
                    border: `1px solid ${ac}35`,
                    boxShadow: `0 4px 24px rgba(0,0,0,0.4)`,
                    transition: "box-shadow 0.3s ease",
                  }}
                  onClick={() => setSelectedAccount(account)}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                    style={{ background: `linear-gradient(90deg, ${ac}, transparent)` }}
                  />
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ boxShadow: `inset 0 0 0 1px ${ac}55`, borderRadius: "1rem" }}
                  />

                  {account.images && account.images.length > 0 ? (
                    <div className="relative h-40 overflow-hidden cursor-zoom-in" onClick={(e) => { e.stopPropagation(); setPreviewImg(account.images![0]); }}>
                      <img
                        src={account.images[0]}
                        alt={account.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-black/60 backdrop-blur-sm text-white text-[9px] px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                          <ZoomIn className="w-2.5 h-2.5" />معاينة
                        </span>
                      </div>
                      {account.rank && (
                        <div className="absolute top-2 right-2">
                          <span className="bg-primary/90 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                            <Star className="w-2.5 h-2.5" />
                            {account.rank}
                          </span>
                        </div>
                      )}
                      {account.images.length > 1 && (
                        <div className="absolute bottom-2 left-2">
                          <span className="bg-black/60 text-white/70 text-[9px] px-1.5 py-0.5 rounded-full">
                            +{account.images.length - 1} صور
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`h-28 bg-gradient-to-br ${account.game?.color || "from-primary/40 to-primary/20"} relative`}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Gamepad2 className="w-12 h-12 text-white/30" />
                      </div>
                      {account.rank && (
                        <div className="absolute top-2 right-2">
                          <span className="bg-primary/90 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star className="w-2.5 h-2.5" />
                            {account.rank}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-3 md:p-4">
                    <div className="mb-2">
                      <h3 className="font-bold text-sm md:text-base group-hover:text-primary transition-colors line-clamp-1 mb-0.5">{account.title}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
                          {(account as any).gameType || account.game?.nameAr || "لعبة"}
                        </span>
                        {account.level && (
                          <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold">
                            Lvl {account.level}
                          </span>
                        )}
                        {account.linkingMethod && (
                          <span className="text-[10px] text-muted-foreground/70 bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <Link2 className="w-2.5 h-2.5" />
                            {LINKING_LABELS[account.linkingMethod] || account.linkingMethod}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/6">
                      <div>
                        {account.originalPrice && account.originalPrice > account.price && (
                          <p className="text-[11px] text-muted-foreground line-through leading-none">{account.originalPrice} ج</p>
                        )}
                        <p className="text-lg md:text-xl font-black text-gradient-gold-animated">{account.price} ج</p>
                      </div>
                      <Button
                        size="sm"
                        className="glow-gold text-xs px-3 h-8"
                        data-testid={`button-buy-account-${account.id}`}
                        onClick={e => { e.stopPropagation(); if (!isLoggedIn) { setShowLogin(true); } else { setLocation(`/account-order/${account.id}`); } }}
                      >
                        <ShoppingCart className="w-3 h-3 ml-1" />
                        شراء
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedAccount} onOpenChange={() => setSelectedAccount(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto glass-ultra border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-gradient-gold text-xl">{selectedAccount?.title}</DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-4">
              {selectedAccount.images && selectedAccount.images.length > 0 && (
                <div className="grid gap-2">
                  {selectedAccount.images.map((img, i) => (
                    <motion.img
                      key={i}
                      src={img}
                      alt={`${selectedAccount.title} - صورة ${i + 1}`}
                      className="w-full rounded-xl object-cover"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 p-3 glass-premium rounded-xl">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedAccount.game?.color || "from-primary to-primary/50"} flex items-center justify-center text-2xl shadow-lg`}>
                  {selectedAccount.game?.icon ? <span>{selectedAccount.game.icon}</span> : <Gamepad2 className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <p className="font-medium">{(selectedAccount as any).gameType || selectedAccount.game?.nameAr || "لعبة"}</p>
                  {selectedAccount.rank && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                      <Crown className="w-3 h-3 ml-1" />
                      {selectedAccount.rank}
                    </Badge>
                  )}
                </div>
              </div>

              {selectedAccount.linkingMethod && (
                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl">
                  <Link2 className="w-4 h-4 text-primary" />
                  <span className="text-sm">
                    <span className="text-muted-foreground">نوع الربط: </span>
                    <span className="font-medium">{LINKING_LABELS[selectedAccount.linkingMethod] || selectedAccount.linkingMethod}</span>
                  </span>
                </div>
              )}

              <p className="text-muted-foreground text-sm">{selectedAccount.description}</p>

              {selectedAccount.level && (
                <p className="text-sm bg-primary/10 rounded-lg px-4 py-2 inline-block">
                  <span className="text-muted-foreground">المستوى:</span>{" "}
                  <span className="font-bold text-primary">{selectedAccount.level}</span>
                </p>
              )}

              {selectedAccount.features && selectedAccount.features.length > 0 && (
                <div>
                  <p className="font-medium mb-2 text-sm">المميزات:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAccount.features.map((feature, i) => (
                      <Badge key={i} variant="secondary" className="bg-primary/10 text-primary border-primary/20">{feature}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-primary/10">
                <div>
                  {selectedAccount.originalPrice && selectedAccount.originalPrice > selectedAccount.price && (
                    <p className="text-sm text-muted-foreground line-through">{selectedAccount.originalPrice} ج</p>
                  )}
                  <p className="text-2xl md:text-3xl font-black text-gradient-gold-animated">{selectedAccount.price} ج</p>
                </div>
                  <Button className="glow-gold-mega mobile-touch-feedback" data-testid="button-buy-account-dialog" onClick={() => { if (!isLoggedIn) { setShowLogin(true); } else { setLocation(`/account-order/${selectedAccount.id}`); } }}>
                    <ShoppingCart className="w-4 h-4 ml-2" />
                    شراء الآن
                  </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <CustomerLoginModal open={showLogin} onOpenChange={setShowLogin} />
    </div>
  );
}
