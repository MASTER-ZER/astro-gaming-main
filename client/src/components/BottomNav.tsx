import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, User, Wallet, ShoppingCart, LayoutGrid, Users } from "lucide-react";
import { useCustomer } from "@/hooks/useCustomer";
import { useCart } from "@/lib/cart";
import { useState } from "react";
import { CustomerLoginModal } from "@/components/CustomerLoginModal";

const NAV_ITEMS = [
  {
    href: "/games",
    icon: Zap,
    label: "شحن",
    color: "#0090ff",
    glow: "rgba(0,144,255,0.4)",
  },
  {
    href: "/accounts",
    icon: LayoutGrid,
    label: "الحسابات",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.4)",
  },
];

export function BottomNav() {
  const [location] = useLocation();
  const { isLoggedIn } = useCustomer();
  const { itemCount } = useCart();
  const [showLogin, setShowLogin] = useState(false);

  const profileHref = isLoggedIn ? "/dashboard" : null;
  const isProfileActive = location === "/dashboard";
  const isCartActive = location === "/cart";

  const isActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{
          background: "rgba(4,6,18,0.99)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 -4px 30px rgba(0,0,0,0.5)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-center justify-around px-2 h-16">
          {/* Left — Charge */}
          <NavItem
            href="/games"
            icon={Zap}
            label="شحن"
            color="#0090ff"
            glow="rgba(0,144,255,0.45)"
            active={isActive("/games")}
          />

          {/* Cart */}
          <NavItem
            href="/cart"
            icon={ShoppingCart}
            label="السلة"
            color="#34d399"
            glow="rgba(52,211,153,0.4)"
            active={isCartActive}
            badge={itemCount > 0 ? String(itemCount > 9 ? "9+" : itemCount) : undefined}
          />

          {/* Center — Profile (bigger) */}
          <div className="flex flex-col items-center relative -mt-5">
            {profileHref ? (
              <Link href={profileHref} data-testid="bottom-nav-profile">
                <ProfileButton active={isProfileActive} />
              </Link>
            ) : (
              <button onClick={() => setShowLogin(true)} data-testid="bottom-nav-login">
                <ProfileButton active={false} />
              </button>
            )}
          </div>

          {/* Accounts */}
          <NavItem
            href="/accounts"
            icon={LayoutGrid}
            label="الحسابات"
            color="#a855f7"
            glow="rgba(168,85,247,0.4)"
            active={isActive("/accounts")}
          />

          {/* Wallet */}
          <NavItem
            href="/wallet"
            icon={Wallet}
            label="المحفظة"
            color="#f59e0b"
            glow="rgba(245,158,11,0.4)"
            active={isActive("/wallet")}
          />
        </div>
      </nav>

      <CustomerLoginModal open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
}

/* ── Profile center button ── */
function ProfileButton({ active }: { active: boolean }) {
  return (
    <motion.div
      whileTap={{ scale: 0.9 }}
      className="flex flex-col items-center"
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-1 relative"
        style={{
          background: active
            ? "linear-gradient(135deg, #0090ff, #0040c0)"
            : "linear-gradient(135deg, rgba(0,144,255,0.25), rgba(0,64,192,0.15))",
          border: active ? "2px solid rgba(0,144,255,0.8)" : "2px solid rgba(0,144,255,0.3)",
          boxShadow: active
            ? "0 0 24px rgba(0,144,255,0.6), 0 4px 16px rgba(0,0,0,0.5)"
            : "0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        <User className={`w-6 h-6 ${active ? "text-white" : "text-primary/70"}`} />
        {active && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ border: "1px solid rgba(0,144,255,0.35)", boxShadow: "0 0 12px rgba(0,144,255,0.2)" }}
          />
        )}
      </div>
      <span
        className="text-[10px] font-bold leading-none"
        style={{ color: active ? "#0090ff" : "rgba(255,255,255,0.4)" }}
      >
        البروفايل
      </span>
    </motion.div>
  );
}

/* ── Regular nav item ── */
interface NavItemProps {
  href: string;
  icon: typeof Zap;
  label: string;
  color: string;
  glow: string;
  active: boolean;
  badge?: string;
}

function NavItem({ href, icon: Icon, label, color, glow, active, badge }: NavItemProps) {
  return (
    <Link href={href} data-testid={`bottom-nav-${href.replace("/", "")}`}>
      <motion.div
        whileTap={{ scale: 0.85 }}
        className="flex flex-col items-center gap-1 py-1 px-3 relative"
      >
        <div className="relative">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300"
            style={{
              background: active ? `${color}22` : "transparent",
              boxShadow: active ? `0 0 14px ${glow}` : "none",
            }}
          >
            <Icon
              className="w-5 h-5 transition-all duration-300"
              style={{ color: active ? color : "rgba(255,255,255,0.4)" }}
            />
          </div>
          {badge && (
            <div className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
              {badge}
            </div>
          )}
        </div>

        <span
          className="text-[10px] font-medium leading-none transition-all duration-300"
          style={{ color: active ? color : "rgba(255,255,255,0.35)" }}
        >
          {label}
        </span>

        {/* Active indicator */}
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ scaleX: 0, opacity: 0 }}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
              style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </Link>
  );
}
