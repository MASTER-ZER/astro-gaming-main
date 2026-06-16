import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CreditCard, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { PaymentMethod } from "@shared/schema";

export default function AdminPayments() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState({ name: "", nameAr: "", accountNumber: "", accountName: "", icon: "", isActive: true });

  const { data: methods = [], isLoading } = useQuery<PaymentMethod[]>({ queryKey: ["/api/payment-methods"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/payment-methods", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "تم الإضافة", description: "تم إضافة وسيلة الدفع بنجاح" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/payment-methods/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "تم التحديث", description: "تم تحديث وسيلة الدفع بنجاح" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/payment-methods/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "تم الحذف", description: "تم حذف وسيلة الدفع بنجاح" });
    },
  });

  const resetForm = () => {
    setForm({ name: "", nameAr: "", accountNumber: "", accountName: "", icon: "", isActive: true });
    setEditing(null);
  };

  const openEdit = (method: PaymentMethod) => {
    setEditing(method);
    setForm({
      name: method.name,
      nameAr: method.nameAr,
      accountNumber: method.accountNumber,
      accountName: method.accountName || "",
      icon: method.icon,
      isActive: method.isActive ?? true,
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">إدارة وسائل الدفع</h1>
          <p className="text-sm md:text-base text-muted-foreground">إضافة وتعديل وسائل الدفع المتاحة</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} data-testid="button-add-payment" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 ml-2" />
          إضافة وسيلة دفع
        </Button>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {methods.map((method) => (
          <Card key={method.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-xl">
                  {method.icon}
                </div>
                <div>
                  <p className="font-medium text-sm">{method.nameAr}</p>
                  <p className="text-xs text-muted-foreground">{method.name}</p>
                </div>
              </div>
              <span className={`text-xs ${method.isActive ? "text-green-500" : "text-red-500"}`}>
                {method.isActive ? "مفعل" : "معطل"}
              </span>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 mb-3">
              <p className="text-xs text-muted-foreground">رقم الحساب</p>
              <p className="font-mono text-sm">{method.accountNumber}</p>
              {method.accountName && <p className="text-xs text-muted-foreground mt-1">{method.accountName}</p>}
            </div>
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(method)} data-testid={`button-edit-payment-${method.id}`}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(method.id)} data-testid={`button-delete-payment-${method.id}`}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الوسيلة</TableHead>
              <TableHead className="text-right">الاسم بالإنجليزي</TableHead>
              <TableHead className="text-right">رقم الحساب</TableHead>
              <TableHead className="text-right">اسم الحساب</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {methods.map((method) => (
              <TableRow key={method.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-xl">
                      {method.icon}
                    </div>
                    <span className="font-medium">{method.nameAr}</span>
                  </div>
                </TableCell>
                <TableCell>{method.name}</TableCell>
                <TableCell className="font-mono">{method.accountNumber}</TableCell>
                <TableCell>{method.accountName || "-"}</TableCell>
                <TableCell>
                  <span className={`text-sm ${method.isActive ? "text-green-500" : "text-red-500"}`}>
                    {method.isActive ? "مفعل" : "معطل"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(method)} data-testid={`button-edit-payment-${method.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(method.id)} data-testid={`button-delete-payment-${method.id}`}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل وسيلة الدفع" : "إضافة وسيلة دفع جديدة"}</DialogTitle>
            <DialogDescription>أدخل بيانات وسيلة الدفع</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الاسم بالعربي</Label>
                <Input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
              </div>
              <div>
                <Label>الاسم بالإنجليزي</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>رقم الحساب</Label>
                <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
              </div>
              <div>
                <Label>الأيقونة (Emoji)</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>اسم صاحب الحساب (اختياري)</Label>
              <Input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
              <Label>مفعل</Label>
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {editing ? "حفظ التغييرات" : "إضافة وسيلة الدفع"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
