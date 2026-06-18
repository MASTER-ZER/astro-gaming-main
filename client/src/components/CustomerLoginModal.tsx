import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCustomer } from "@/hooks/useCustomer";
import {
  Loader2, X, Gamepad2, Mail, Lock, User, Phone,
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
  const { toast } = useToast();
  const { login, login: register } = useCustomer();

  const [mode, setMode] = useState<"login" | "register">("login");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form
  const [regEmail, setRegEmail] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setLoginLoading(true);
    try {
      const res = await fetch("/api/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("customer_token", data.token);
        login(data.token, data.customer);
        toast({ title: "تم الدخول", description: `مرحباً بعودتك ${data.customer.name || ""}` });
        handleClose();
      } else {
        toast({ title: "خطأ", description: data.error || "فشل تسجيل الدخول", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ في الاتصال", variant: "destructive" });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regUsername || !regPassword || !regName || !regPhone) {
      toast({ title: "خطأ", description: "جميع الحقول مطلوبة", variant: "destructive" });
      return;
    }
    setRegLoading(true);
    try {
      const res = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          username: regUsername,
          password: regPassword,
          name: regName,
          phone: regPhone,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("customer_token", data.token);
        login(data.token, data.customer);
        toast({ title: "تم إنشاء الحساب", description: `مرحباً بك ${data.customer.name || ""}` });
        handleClose();
      } else {
        toast({ title: "خطأ", description: data.error || "فشل إنشاء الحساب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ في الاتصال", variant: "destructive" });
    } finally {
      setRegLoading(false);
    }
  };

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
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-sm pointer-events-auto"
            >
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
                <div
                  className="h-0.5 w-full"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(0,144,255,0.6), rgba(100,50,255,0.4), transparent)" }}
                />

                <div className="p-6 pt-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
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
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all duration-200 ${
                        mode === "login"
                          ? "text-white"
                          : "text-white/30 hover:text-white/60"
                      }`}
                      style={mode === "login" ? { background: "rgba(0,144,255,0.2)", boxShadow: "0 0 12px rgba(0,144,255,0.15)" } : {}}
                    >
                      تسجيل دخول
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("register")}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all duration-200 ${
                        mode === "register"
                          ? "text-white"
                          : "text-white/30 hover:text-white/60"
                      }`}
                      style={mode === "register" ? { background: "rgba(0,144,255,0.2)", boxShadow: "0 0 12px rgba(0,144,255,0.15)" } : {}}
                    >
                      إنشاء حساب
                    </button>
                  </div>

                  {mode === "login" ? (
                    /* ── Login Form ── */
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <Label className="text-white/60 text-xs mb-1.5 block">البريد الإلكتروني أو اسم المستخدم</Label>
                        <div className="relative">
                          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <Input
                            type="text"
                            placeholder="admin@astro.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full h-11 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/15 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-white/60 text-xs mb-1.5 block">كلمة المرور</Label>
                        <div className="relative">
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full h-11 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/15 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full h-11 rounded-xl font-bold text-sm"
                        style={{
                          background: "linear-gradient(135deg, rgba(0,144,255,0.3), rgba(100,50,255,0.25))",
                          border: "1px solid rgba(0,144,255,0.3)",
                        }}
                      >
                        {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تسجيل الدخول"}
                      </Button>

                      {/* Divider */}
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-white/8" />
                        <span className="text-white/20 text-xs">أو</span>
                        <div className="flex-1 h-px bg-white/8" />
                      </div>

                      {/* Google Login */}
                      <button
                        type="button"
                        onClick={() => { window.location.href = "/auth/google"; }}
                        className="w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                        style={{
                          background: "linear-gradient(135deg, rgba(66,133,244,0.15), rgba(66,133,244,0.08))",
                          border: "1px solid rgba(66,133,244,0.35)",
                          color: "rgba(255,255,255,0.9)",
                        }}
                      >
                        <SiGoogle className="w-5 h-5 text-[#4285F4]" />
                        متابعة بحساب جوجل
                      </button>
                    </form>
                  ) : (
                    /* ── Register Form ── */
                    <form onSubmit={handleRegister} className="space-y-3">
                      <div>
                        <Label className="text-white/60 text-xs mb-1.5 block">البريد الإلكتروني</Label>
                        <div className="relative">
                          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <Input
                            type="email"
                            placeholder="example@email.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            className="w-full h-11 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/15 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-white/60 text-xs mb-1.5 block">اسم المستخدم</Label>
                        <div className="relative">
                          <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <Input
                            type="text"
                            placeholder="my_username"
                            value={regUsername}
                            onChange={(e) => setRegUsername(e.target.value)}
                            className="w-full h-11 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/15 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-white/60 text-xs mb-1.5 block">الاسم</Label>
                        <div className="relative">
                          <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <Input
                            type="text"
                            placeholder="محمد أحمد"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            className="w-full h-11 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/15 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-white/60 text-xs mb-1.5 block">رقم الهاتف</Label>
                        <div className="relative">
                          <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <Input
                            type="tel"
                            placeholder="01012345678"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            className="w-full h-11 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/15 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-white/60 text-xs mb-1.5 block">كلمة المرور</Label>
                        <div className="relative">
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <Input
                            type="password"
                            placeholder="6 أحرف على الأقل"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="w-full h-11 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/15 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={regLoading}
                        className="w-full h-11 rounded-xl font-bold text-sm"
                        style={{
                          background: "linear-gradient(135deg, rgba(0,144,255,0.3), rgba(100,50,255,0.25))",
                          border: "1px solid rgba(0,144,255,0.3)",
                        }}
                      >
                        {regLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء الحساب"}
                      </Button>
                    </form>
                  )}

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
