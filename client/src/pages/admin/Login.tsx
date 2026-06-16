import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, Eye, EyeOff, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@assets/IMG-20260310-WA0032_1773642840088.jpg";

interface LoginProps {
  onLogin: (data?: { role?: string; permissions?: string[]; name?: string }) => void;
}

export default function AdminLogin({ onLogin }: LoginProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get("admin_google_token");
    const googleError = params.get("google_error");
    if (googleToken) {
      localStorage.setItem("admin_token", googleToken);
      window.history.replaceState({}, "", window.location.pathname);
      onLogin();
      toast({ title: "تم الدخول بجوجل", description: "مرحباً بك في لوحة التحكم" });
    } else if (googleError) {
      window.history.replaceState({}, "", window.location.pathname);
      const msgs: Record<string, string> = {
        not_authorized: "هذا الحساب غير مصرح له بالدخول",
        token_failed: "فشل التحقق من جوجل",
        invalid_state: "انتهت صلاحية طلب الدخول",
        server_error: "خطأ في الخادم",
      };
      toast({ title: "خطأ في تسجيل الدخول بجوجل", description: msgs[googleError] || "حدث خطأ", variant: "destructive" });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("admin_token", data.token);
        onLogin(data.adminUser);
        toast({ title: "تم الدخول", description: "مرحباً بك في لوحة التحكم" });
      } else {
        const err = await response.json();
        toast({ title: "خطأ", description: err.error || "بيانات الدخول غير صحيحة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ في الاتصال", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "/auth/admin/google";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" dir="rtl">
      <div className="absolute top-20 right-10 w-72 h-72 floating-orb opacity-20" />
      <div className="absolute bottom-20 left-10 w-64 h-64 floating-orb opacity-15" style={{ animationDelay: "3s" }} />

      <div className="w-full max-w-md glass-ultra p-6 sm:p-8 rounded-2xl relative overflow-hidden noise-texture">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/4 via-transparent to-primary/2 pointer-events-none" />

        <div className="relative z-10">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden mx-auto mb-3 ring-2 ring-white/10 glow-soft">
              <img src={logoImage} alt="ASTRO" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gradient-gold-animated">ASTRO</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">لوحة تحكم المسؤول</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm">البريد الإلكتروني</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="أدخل البريد الإلكتروني"
                  className="pr-10 glass-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-admin-email"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-sm">كلمة السر</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="أدخل كلمة السر"
                  className="pr-10 pl-10 glass-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-admin-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full glow-soft" disabled={isLoading} data-testid="button-admin-login">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Lock className="w-4 h-4 ml-2" />}
              دخول
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-transparent px-2">أو</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 border-white/15 hover:border-primary/50"
            onClick={handleGoogleLogin}
            data-testid="button-google-login"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            الدخول بحساب جوجل
          </Button>
        </div>
      </div>
    </div>
  );
}
