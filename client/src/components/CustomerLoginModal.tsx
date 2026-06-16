import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCustomer } from "@/hooks/useCustomer";
import {
  Loader2, X, Gamepad2,
} from "lucide-react";
import { SiGoogle } from "react-icons/si";

interface Props {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function CustomerLoginModal({ open, onOpenChange, onClose }: Props) {
  const handleClose = () => { onClose?.(); onOpenChange?.(false); };
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9998]"
            style={{
              background: "rgba(2,4,14,0.88)",
            }}
            onClick={handleClose}
          />

          {/* ── Card wrapper ── */}
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
            dir="rtl"
          >
          {/* Modal card */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-sm pointer-events-auto"
          >
            {/* Glow border */}
            <div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(0,144,255,0.18), rgba(100,50,255,0.12), transparent 60%)",
                padding: "1px",
              }}
            >
              <div className="w-full h-full rounded-3xl" style={{ background: "rgba(4,6,18,0.96)" }} />
            </div>

            <div
              className="relative rounded-3xl overflow-hidden"
              style={{
                background: "linear-gradient(160deg, rgba(10,18,42,0.98) 0%, rgba(4,6,18,0.99) 100%)",
                border: "1px solid rgba(0,144,255,0.15)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {/* Top accent line */}
              <div
                className="h-0.5 w-full"
                style={{ background: "linear-gradient(90deg, transparent, rgba(0,144,255,0.6), rgba(100,50,255,0.4), transparent)" }}
              />

              <div className="p-6 pt-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, rgba(0,144,255,0.25), rgba(100,50,255,0.2))",
                        border: "1px solid rgba(0,144,255,0.25)",
                        boxShadow: "0 0 20px rgba(0,144,255,0.2)",
                      }}
                    >
                      <Gamepad2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white leading-none">ASTRO</h2>
                      <p className="text-[11px] text-white/35 mt-0.5">Gaming Platform</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleClose(); }}
                    data-testid="button-close-modal"
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Welcome text */}
                <div className="text-center mb-8">
                  <h3 className="text-xl font-black text-white mb-2">مرحباً بك 👋</h3>
                  <p className="text-sm text-white/40">سجّل دخولك عبر حساب جوجل للمتابعة</p>
                </div>

                {/* Google Login */}
                <button
                  type="button"
                  data-testid="button-google-login"
                  onClick={() => { window.location.href = "/auth/google"; }}
                  className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, rgba(66,133,244,0.15), rgba(66,133,244,0.08))",
                    border: "1px solid rgba(66,133,244,0.35)",
                    color: "rgba(255,255,255,0.9)",
                    boxShadow: "0 4px 20px rgba(66,133,244,0.15)",
                  }}
                >
                  <SiGoogle className="w-5 h-5 text-[#4285F4]" />
                  متابعة بحساب جوجل
                </button>

                {/* Footer note */}
                <p className="text-[11px] text-white/18 text-center mt-5">
                  بالمتابعة توافق على شروط الخدمة وسياسة الخصوصية
                </p>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
