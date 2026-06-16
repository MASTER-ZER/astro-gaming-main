import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Plus, Trash2, Pencil, Mail, Eye, EyeOff, Check } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  googleId: string | null;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
}

// All available permissions with display labels and groups
const PERMISSION_GROUPS = [
  {
    group: "الطلبات والمبيعات",
    items: [
      { key: "orders", label: "الطلبات" },
      { key: "wallet_requests", label: "طلبات الإيداع" },
      { key: "sell_requests", label: "طلبات بيع الحسابات" },
      { key: "account_orders", label: "طلبات شراء الحسابات" },
    ],
  },
  {
    group: "العملاء والتواصل",
    items: [
      { key: "users", label: "المستخدمين" },
      { key: "chat", label: "المحادثات" },
      { key: "support", label: "الدعم الفني" },
      { key: "community", label: "المجتمع (منشورات وتعليقات)" },
    ],
  },
  {
    group: "المتجر والمحتوى",
    items: [
      { key: "games", label: "الألعاب والأسعار" },
      { key: "discount_codes", label: "أكواد الخصم" },
      { key: "competitions", label: "المسابقات" },
      { key: "sardarb", label: "السرداب" },
      { key: "virtual_numbers", label: "الأرقام الفيك" },
      { key: "broker", label: "الطلبات الخاصة 👑" },
    ],
  },
  {
    group: "الإعدادات",
    items: [
      { key: "analytics", label: "Analytics والإحصائيات" },
      { key: "payments", label: "وسائل الدفع" },
      { key: "settings", label: "إعدادات الموقع" },
    ],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key));

const emptyForm = {
  email: "",
  name: "",
  password: "",
  role: "moderator",
  isActive: true,
  permissions: [] as string[],
};

export default function Moderators() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [showPassword, setShowPassword] = useState(false);

  const { data: admins = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/admin-users"],
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/admin-users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admin-users"] });
      toast({ title: "تم إضافة المشرف ✅" });
      closeDialog();
    },
    onError: async (e: any) => {
      const msg = await e.response?.json?.().then((r: any) => r.error).catch(() => "خطأ");
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/admin-users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admin-users"] });
      toast({ title: "تم تحديث بيانات المشرف ✅" });
      closeDialog();
    },
    onError: async (e: any) => {
      const msg = await e.response?.json?.().then((r: any) => r.error).catch(() => "خطأ");
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/admin-users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admin-users"] });
      toast({ title: "تم حذف المشرف" });
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/admin-users/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/admin-users"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowPassword(false);
    setOpen(true);
  };

  const openEdit = (admin: AdminUser) => {
    setEditing(admin);
    setForm({ email: admin.email, name: admin.name, password: "", role: admin.role, isActive: admin.isActive, permissions: admin.permissions || [] });
    setShowPassword(false);
    setOpen(true);
  };

  const closeDialog = () => { setOpen(false); setEditing(null); setForm({ ...emptyForm }); };

  const togglePermission = (key: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter(p => p !== key)
        : [...f.permissions, key],
    }));
  };

  const selectAll = () => setForm(f => ({ ...f, permissions: [...ALL_PERMISSIONS] }));
  const clearAll = () => setForm(f => ({ ...f, permissions: [] }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      email: form.email.toLowerCase().trim(),
      name: form.name,
      role: form.role,
      isActive: form.isActive,
      permissions: form.role === "super_admin" ? [] : form.permissions,
    };
    if (form.password) payload.password = form.password;
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else {
      if (!form.password) return toast({ title: "خطأ", description: "كلمة السر مطلوبة عند إنشاء مشرف جديد", variant: "destructive" });
      createMut.mutate(payload);
    }
  };

  const roleLabel = (role: string) => role === "super_admin" ? "مدير عام" : "مشرف";
  const roleBadgeClass = (role: string) => role === "super_admin"
    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    : "bg-blue-500/20 text-blue-400 border-blue-500/30";

  const getPermissionLabel = (key: string) => {
    for (const group of PERMISSION_GROUPS) {
      const item = group.items.find(i => i.key === key);
      if (item) return item.label;
    }
    return key;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">إدارة المشرفين</h1>
            <p className="text-sm text-muted-foreground">إضافة وإدارة حسابات الوصول مع تحديد الصلاحيات لكل مشرف</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2 glow-soft" data-testid="button-add-moderator">
          <Plus className="w-4 h-4" /> إضافة مشرف
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : admins.length === 0 ? (
        <div className="glass-ultra rounded-xl p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">لا يوجد مشرفون بعد</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {admins.map((admin) => (
            <div key={admin.id} className="glass-ultra rounded-xl p-4 flex flex-col gap-3" data-testid={`admin-user-${admin.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">{admin.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{admin.name}</span>
                      <Badge className={`text-xs ${roleBadgeClass(admin.role)}`}>{roleLabel(admin.role)}</Badge>
                      {!admin.isActive && <Badge className="text-xs bg-gray-500/20 text-gray-400 border-gray-500/30">معطل</Badge>}
                      {admin.googleId && (
                        <Badge className="text-xs bg-blue-600/20 text-blue-400 border-blue-600/30">
                          <svg className="w-3 h-3 ml-1 inline" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/></svg>
                          جوجل
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{admin.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={admin.isActive}
                    onCheckedChange={(v) => toggleMut.mutate({ id: admin.id, isActive: v })}
                    data-testid={`toggle-admin-${admin.id}`}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(admin)} data-testid={`button-edit-admin-${admin.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => deleteMut.mutate(admin.id)} data-testid={`button-delete-admin-${admin.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Permissions badges */}
              {admin.role === "moderator" && (
                <div className="border-t border-white/5 pt-2.5">
                  {admin.permissions && admin.permissions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {admin.permissions.map(p => (
                        <span key={p} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(0,144,255,0.1)", border: "1px solid rgba(0,144,255,0.2)", color: "rgba(0,180,255,0.9)" }}>
                          {getPermissionLabel(p)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/50">لا توجد صلاحيات محددة</p>
                  )}
                </div>
              )}
              {admin.role === "super_admin" && (
                <div className="border-t border-white/5 pt-2.5">
                  <span className="text-xs text-yellow-400/70">✦ وصول كامل لجميع الأقسام</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل بيانات المشرف" : "إضافة مشرف جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الاسم *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="اسم المشرف" className="glass-input mt-1" required data-testid="input-admin-name" />
              </div>
              <div>
                <Label>البريد الإلكتروني *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@example.com" className="glass-input mt-1" required data-testid="input-admin-email" disabled={!!editing} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{editing ? "كلمة سر جديدة (اختياري)" : "كلمة السر *"}</Label>
                <div className="relative mt-1">
                  <Input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="glass-input pl-10" required={!editing} data-testid="input-admin-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>نوع الحساب</Label>
                <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger className="glass-input mt-1" data-testid="select-admin-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">مدير عام (وصول كامل)</SelectItem>
                    <SelectItem value="moderator">مشرف (صلاحيات محددة)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))} data-testid="switch-admin-active" />
              <Label>الحساب نشط</Label>
            </div>

            {/* Permissions Section - only for moderators */}
            {form.role === "moderator" && (
              <div className="space-y-3">
                <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(0,144,255,0.3), transparent)" }} />
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-white/80">صلاحيات الوصول</Label>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAll} className="text-xs text-primary/70 hover:text-primary transition-colors">تحديد الكل</button>
                    <span className="text-white/20">·</span>
                    <button type="button" onClick={clearAll} className="text-xs text-white/40 hover:text-white/70 transition-colors">إلغاء الكل</button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">حدد الأقسام التي يمكن لهذا المشرف الوصول إليها وإدارتها</p>

                <div className="space-y-4">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.group} className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-xs font-bold text-white/50 mb-2">{group.group}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {group.items.map((item) => {
                          const isSelected = form.permissions.includes(item.key);
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => togglePermission(item.key)}
                              data-testid={`perm-${item.key}`}
                              className="flex items-center gap-2 p-2 rounded-lg text-right transition-all"
                              style={{
                                background: isSelected ? "rgba(0,144,255,0.12)" : "rgba(255,255,255,0.03)",
                                border: `1px solid ${isSelected ? "rgba(0,144,255,0.3)" : "rgba(255,255,255,0.07)"}`,
                              }}
                            >
                              <div
                                className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                                style={{
                                  background: isSelected ? "rgba(0,144,255,0.8)" : "transparent",
                                  border: `1.5px solid ${isSelected ? "rgba(0,144,255,0.8)" : "rgba(255,255,255,0.2)"}`,
                                }}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className="text-xs text-white/70 leading-tight">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {form.permissions.length > 0 && (
                  <p className="text-xs text-primary/60">{form.permissions.length} صلاحية محددة</p>
                )}
              </div>
            )}

            {form.role === "super_admin" && (
              <div className="rounded-xl p-3 text-center" style={{ background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.2)" }}>
                <p className="text-xs text-yellow-400/80">✦ المدير العام يملك وصولاً كاملاً لجميع الأقسام تلقائياً</p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t border-white/5">
              <Button type="button" variant="ghost" onClick={closeDialog}>إلغاء</Button>
              <Button type="submit" className="glow-soft" disabled={createMut.isPending || updateMut.isPending} data-testid="button-submit-admin">
                {editing ? "حفظ التعديلات" : "إضافة المشرف"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
