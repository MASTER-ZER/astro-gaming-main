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
import { Ticket, Plus, Trash2, Pencil, Copy, CheckCircle, XCircle, Clock } from "lucide-react";

interface DiscountCode {
  id: string;
  code: string;
  name: string | null;
  discountType: string;
  discountValue: number;
  scope: string;
  gameId: string | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

interface Game { id: string; name: string; nameAr: string; }

const emptyForm = {
  code: "",
  name: "",
  discountType: "percent",
  discountValue: "",
  scope: "all_games",
  gameId: "",
  maxUses: "",
  isActive: true,
  expiresAt: "",
};

export default function DiscountCodes() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: codes = [], isLoading } = useQuery<DiscountCode[]>({
    queryKey: ["/api/admin/discount-codes"],
  });

  const { data: games = [] } = useQuery<Game[]>({ queryKey: ["/api/games"] });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/discount-codes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
      toast({ title: "تم إنشاء الكود بنجاح" });
      closeDialog();
    },
    onError: async (e: any) => {
      const msg = await e.response?.json?.().then((r: any) => r.error).catch(() => "خطأ");
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/discount-codes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
      toast({ title: "تم تحديث الكود" });
      closeDialog();
    },
    onError: async (e: any) => {
      const msg = await e.response?.json?.().then((r: any) => r.error).catch(() => "خطأ");
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/discount-codes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] });
      toast({ title: "تم حذف الكود" });
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/discount-codes/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/discount-codes"] }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (code: DiscountCode) => {
    setEditing(code);
    setForm({
      code: code.code,
      name: code.name || "",
      discountType: code.discountType,
      discountValue: String(code.discountValue),
      scope: code.scope,
      gameId: code.gameId || "",
      maxUses: code.maxUses ? String(code.maxUses) : "",
      isActive: code.isActive,
      expiresAt: code.expiresAt ? new Date(code.expiresAt).toISOString().slice(0, 16) : "",
    });
    setOpen(true);
  };

  const closeDialog = () => { setOpen(false); setEditing(null); setForm({ ...emptyForm }); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: form.code.toUpperCase().trim(),
      name: form.name || null,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      scope: form.scope,
      gameId: form.scope === "specific_game" ? form.gameId : null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      isActive: form.isActive,
      expiresAt: form.expiresAt || null,
    };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "تم النسخ", description: code });
  };

  const isExpired = (expiresAt: string | null) => expiresAt && new Date(expiresAt) < new Date();
  const isExhausted = (c: DiscountCode) => c.maxUses !== null && c.usedCount >= c.maxUses;

  const scopeLabel = (scope: string) => {
    if (scope === "all_games") return "كل الألعاب";
    if (scope === "specific_game") return "لعبة محددة";
    if (scope === "accounts_marketplace") return "سوق الحسابات";
    return scope;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ticket className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">أكواد الخصم</h1>
            <p className="text-sm text-muted-foreground">إنشاء وإدارة أكواد الخصم للعملاء</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2 glow-soft" data-testid="button-create-discount-code">
          <Plus className="w-4 h-4" /> كود جديد
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : codes.length === 0 ? (
        <div className="glass-ultra rounded-xl p-12 text-center">
          <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">لا توجد أكواد خصم بعد</p>
          <Button onClick={openCreate} className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> إنشاء أول كود
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {codes.map((c) => {
            const expired = isExpired(c.expiresAt);
            const exhausted = isExhausted(c);
            const statusOk = c.isActive && !expired && !exhausted;
            return (
              <div key={c.id} className="glass-ultra rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-testid={`discount-code-${c.id}`}>
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyCode(c.code)}
                        className="font-mono font-bold text-lg text-primary hover:text-primary/80 flex items-center gap-1.5"
                        data-testid={`button-copy-${c.id}`}
                      >
                        {c.code}
                        <Copy className="w-3.5 h-3.5 opacity-60" />
                      </button>
                      {statusOk ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">نشط</Badge>
                      ) : expired ? (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">منتهي</Badge>
                      ) : exhausted ? (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">مستهلك</Badge>
                      ) : (
                        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">معطل</Badge>
                      )}
                    </div>
                    {c.name && <p className="text-xs text-muted-foreground mt-0.5">{c.name}</p>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center text-sm">
                  <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                    {c.discountType === "percent" ? `${c.discountValue}%` : `${c.discountValue} ج`} خصم
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-white/5 text-muted-foreground text-xs">
                    {scopeLabel(c.scope)}
                    {c.scope === "specific_game" && c.gameId && (
                      <> - {games.find(g => g.id === c.gameId)?.nameAr || c.gameId}</>
                    )}
                  </span>
                  {c.maxUses !== null && (
                    <span className="px-2 py-0.5 rounded-lg bg-white/5 text-muted-foreground text-xs">
                      {c.usedCount}/{c.maxUses} استخدام
                    </span>
                  )}
                  {c.expiresAt && (
                    <span className={`px-2 py-0.5 rounded-lg text-xs flex items-center gap-1 ${expired ? "bg-red-500/10 text-red-400" : "bg-white/5 text-muted-foreground"}`}>
                      <Clock className="w-3 h-3" />
                      {new Date(c.expiresAt).toLocaleDateString("ar-EG")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={c.isActive}
                    onCheckedChange={(v) => toggleMut.mutate({ id: c.id, isActive: v })}
                    data-testid={`toggle-${c.id}`}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} data-testid={`button-edit-${c.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300" onClick={() => deleteMut.mutate(c.id)} data-testid={`button-delete-${c.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل كود الخصم" : "كود خصم جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>الكود *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="SUMMER25"
                  className="glass-input font-mono mt-1"
                  required
                  data-testid="input-code"
                />
              </div>
              <div className="col-span-2">
                <Label>اسم/وصف الكود (اختياري)</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="خصم الصيف"
                  className="glass-input mt-1"
                  data-testid="input-name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>نوع الخصم *</Label>
                <Select value={form.discountType} onValueChange={(v) => setForm(f => ({ ...f, discountType: v }))}>
                  <SelectTrigger className="glass-input mt-1" data-testid="select-discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">نسبة مئوية (%)</SelectItem>
                    <SelectItem value="fixed">مبلغ ثابت (ج)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>قيمة الخصم *</Label>
                <Input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm(f => ({ ...f, discountValue: e.target.value }))}
                  placeholder={form.discountType === "percent" ? "10" : "50"}
                  min={1}
                  max={form.discountType === "percent" ? 100 : undefined}
                  className="glass-input mt-1"
                  required
                  data-testid="input-discount-value"
                />
              </div>
            </div>

            <div>
              <Label>نطاق الكود *</Label>
              <Select value={form.scope} onValueChange={(v) => setForm(f => ({ ...f, scope: v, gameId: "" }))}>
                <SelectTrigger className="glass-input mt-1" data-testid="select-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_games">كل الألعاب</SelectItem>
                  <SelectItem value="specific_game">لعبة محددة</SelectItem>
                  <SelectItem value="accounts_marketplace">سوق الحسابات</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.scope === "specific_game" && (
              <div>
                <Label>اختر اللعبة *</Label>
                <Select value={form.gameId} onValueChange={(v) => setForm(f => ({ ...f, gameId: v }))}>
                  <SelectTrigger className="glass-input mt-1" data-testid="select-game">
                    <SelectValue placeholder="اختر لعبة" />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الحد الأقصى للاستخدام</Label>
                <Input
                  type="number"
                  value={form.maxUses}
                  onChange={(e) => setForm(f => ({ ...f, maxUses: e.target.value }))}
                  placeholder="بلا حد (اتركه فارغاً)"
                  min={1}
                  className="glass-input mt-1"
                  data-testid="input-max-uses"
                />
              </div>
              <div>
                <Label>تاريخ الانتهاء</Label>
                <Input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="glass-input mt-1"
                  data-testid="input-expires-at"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))}
                data-testid="switch-is-active"
              />
              <Label>الكود نشط</Label>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={closeDialog}>إلغاء</Button>
              <Button type="submit" className="glow-soft" disabled={createMut.isPending || updateMut.isPending} data-testid="button-submit-code">
                {editing ? "حفظ التعديلات" : "إنشاء الكود"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
