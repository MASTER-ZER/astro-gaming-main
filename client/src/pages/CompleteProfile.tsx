import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCustomer } from "@/hooks/useCustomer";
import { Loader2, User, Phone, AtSign, Gamepad2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";

function Field({
  icon: Icon, placeholder, value, onChange, type = "text", dir, testId, hint,
}: {
  icon: typeof User; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string; dir?: string; testId?: string; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="relative group">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors duration-200 pointer-events-none">
          <Icon className="w-4 h-4" />
        </div>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          dir={dir}
          data-testid={testId}
          className="w-full h-11 pr-9 pl-4 rounded-xl text-sm bg-white/5 border border-white/10 outline-none
            focus:border-primary/60 focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(0,144,255,0.12)]
            text-white placeholder:text-white/25 transition-all duration-200"
        />
      </div>
      {hint && <p className="text-[11px] text-white/25 pr-1">{hint}</p>}
    </div>
  );
}

export default function CompleteProfile() {
  const [, setLocation] = useLocation();
  const { login } = useCustomer();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [googleName, setGoogleName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) {
      setLocation("/");
      return;
    }
    setToken(t);
    localStorage.setItem("customer_token", t);

    fetch("/api/customer/me", {
      headers: { Authorization: `Bearer ${t}` },
    }).then(r => r.json()).then(d => {
      if (d.name) setGoogleName(d.name);
      if (d.name) setName(d.name);
    }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("يرجى إدخال اسمك الكامل"); return; }
    if (name.trim().length < 2) { setError("الاسم يجب أن يكون حرفين على الأقل"); return; }
    const cleanPhone = phone.trim().replace(/\s/g, "");
    if (!cleanPhone) { setError("يرجى إدخال رقم الواتساب"); return; }
    if (!/^01[0-9]{9}$/.test(cleanPhone)) { setError("رقم الهاتف يجب أن يكون 11 رقماً ويبدأ بـ 01"); return; }
    if (!username.trim()) { setError("يرجى اختيار اسم مستخدم"); return; }
    if (username.trim().length < 3) { setError("اسم المستخدم يجب أن يكون 3 أحرف على الأقل"); return; }
    if (username.trim().length > 30) { setError("اسم المستخدم يجب ألا يتجاوز 30 حرفاً"); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError("اسم المستخدم: حروف إنجليزية وأرقام و _ فقط"); return; }

    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/customer/complete-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), phone: cleanPhone, username: username.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        login(token, data.customer, true);
        toast({ title: "مرحباً! 🎮", description: "تم إكمال بياناتك بنجاح" });
        setLocation("/");
      } else {
        setError(data.error || "حدث خطأ ما");
      }
    } catch {
      setError("حدث خطأ في الاتصال");
    }
    setIsLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      dir="rtl"
      style={{ background: "linear-gradient(135deg, #02040e 0%, #060a1a 100%)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(160deg, rgba(10,18,42,0.98) 0%, rgba(4,6,18,0.99) 100%)",
            border: "1px solid rgba(0,144,255,0.15)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="h-0.5 w-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,144,255,0.6), rgba(100,50,255,0.4), transparent)" }}
          />

          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(0,144,255,0.25), rgba(100,50,255,0.2))",
                  border: "1px solid rgba(0,144,255,0.25)",
                }}
              >
                <Gamepad2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white leading-none">أكمل بياناتك</h1>
                <p className="text-xs text-white/40 mt-1">خطوة أخيرة لإكمال حسابك</p>
              </div>
            </div>

            <div
              className="flex items-center gap-2 p-3 rounded-xl mb-5"
              style={{ background: "rgba(66,133,244,0.08)", border: "1px solid rgba(66,133,244,0.2)" }}
            >
              <SiGoogle className="w-4 h-4 text-[#4285F4] shrink-0" />
              <p className="text-xs text-white/60">
                تم التحقق عبر جوجل{googleName ? ` · ${googleName}` : ""}. أكمل بياناتك لتفعيل حسابك.
              </p>
            </div>

            <div className="space-y-3">
              <Field
                icon={User}
                placeholder="الاسم الكامل"
                value={name}
                onChange={setName}
                testId="input-complete-name"
              />
              <Field
                icon={Phone}
                placeholder="رقم الواتساب (01xxxxxxxxx)"
                value={phone}
                onChange={v => setPhone(v)}
                type="tel"
                dir="ltr"
                testId="input-complete-phone"
                hint="سيُستخدم للتواصل وتتبع الطلبات"
              />
              <Field
                icon={AtSign}
                placeholder="اسم المستخدم (بالإنجليزي)"
                value={username}
                onChange={v => setUsername(v.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ""))}
                dir="ltr"
                testId="input-complete-username"
                hint="مثال: ahmed_gamer · يُستخدم لشحن المحفظة والتتبع"
              />

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-red-400 text-center py-2 px-3 rounded-xl bg-red-500/10 border border-red-500/20"
                  data-testid="text-complete-error"
                >
                  {error}
                </motion.p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                data-testid="button-complete-submit"
                className="w-full h-11 rounded-xl font-bold text-sm mt-1"
                style={{
                  background: "linear-gradient(135deg, #0090ff, #0050d0)",
                  boxShadow: "0 4px 24px rgba(0,144,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                  border: "none",
                }}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                حفظ وإكمال التسجيل
              </Button>
            </div>

            <p className="text-[11px] text-white/18 text-center mt-4">
              بالمتابعة توافق على شروط الخدمة وسياسة الخصوصية
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
