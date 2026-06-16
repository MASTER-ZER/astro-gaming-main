import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users, Plus, Edit, Trash2, Loader2, Image, X } from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Account, Game } from "@shared/schema";

type AccountWithGame = Account & { game?: Game };

export default function AdminAccounts() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<AccountWithGame | null>(null);
  const [form, setForm] = useState({ gameId: "", title: "", description: "", price: 0, level: 0, rank: "", features: "", linkingMethod: "", isSold: false, isActive: true });
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: accounts = [], isLoading } = useQuery<AccountWithGame[]>({ queryKey: ["/api/accounts"] });
  const { data: games = [] } = useQuery<Game[]>({ queryKey: ["/api/games"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "تم الإضافة", description: "تم إضافة الحساب بنجاح" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/accounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "تم التحديث", description: "تم تحديث الحساب بنجاح" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({ title: "تم الحذف", description: "تم حذف الحساب بنجاح" });
    },
  });

  const resetForm = () => {
    setForm({ gameId: "", title: "", description: "", price: 0, level: 0, rank: "", features: "", linkingMethod: "", isSold: false, isActive: true });
    setImages([]);
    setEditing(null);
  };

  const openEdit = (account: AccountWithGame) => {
    setEditing(account);
    setForm({
      gameId: account.gameId,
      title: account.title,
      description: account.description,
      price: account.price,
      level: account.level || 0,
      rank: account.rank || "",
      features: account.features?.join("\n") || "",
      linkingMethod: (account as any).linkingMethod || "",
      isSold: account.isSold ?? false,
      isActive: account.isActive ?? true,
    });
    setImages(account.images || []);
    setShowDialog(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      toast({ title: "خطأ", description: "الحد الأقصى 5 صور فقط", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        const fileName = `accounts/${Date.now()}-${file.name}`;
        
        // Use /api/uploads/request-url instead of /api/object-storage/presign
        const presignResponse = await fetch("/api/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: fileName, contentType: file.type }),
        });
        
        if (!presignResponse.ok) throw new Error("Failed to get presigned URL");
        
        const { uploadURL, objectPath } = await presignResponse.json();
        
        await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        
        setImages(prev => [...prev, objectPath]);
      }
      toast({ title: "تم الرفع", description: "تم رفع الصور بنجاح" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "خطأ", description: "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (images.length === 0) {
      toast({ title: "خطأ", description: "يجب إضافة صورة واحدة على الأقل", variant: "destructive" });
      return;
    }
    const data = { ...form, features: form.features.split("\n").filter(f => f.trim()), level: form.level || null, images };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">إدارة الحسابات</h1>
          <p className="text-sm md:text-base text-muted-foreground">إضافة وإدارة حسابات الألعاب للبيع</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} data-testid="button-add-account" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 ml-2" />
          إضافة حساب
        </Button>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {accounts.map((account) => (
          <Card key={account.id} className="p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                {account.images && account.images.length > 0 ? (
                  <img src={account.images[0]} alt={account.title} className="w-16 h-16 rounded-lg object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                    <Image className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-sm truncate">{account.title}</p>
                  {account.isSold ? (
                    <Badge variant="secondary" className="text-[10px] ml-2">مباع</Badge>
                  ) : account.isActive ? (
                    <Badge className="bg-green-500/20 text-green-500 border-0 text-[10px] ml-2">متاح</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] ml-2">معطل</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  {account.game?.icon && <span>{account.game.icon}</span>}
                  <span>{(account as any).gameType || account.game?.nameAr}</span>
                  {account.level && <span>• مستوى {account.level}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary text-sm">{account.price} ج</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(account)} data-testid={`button-edit-account-${account.id}`}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(account.id)} data-testid={`button-delete-account-${account.id}`}>
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">الصورة</TableHead>
              <TableHead className="text-right">الحساب</TableHead>
              <TableHead className="text-right">اللعبة</TableHead>
              <TableHead className="text-right">المستوى</TableHead>
              <TableHead className="text-right">السعر</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  {account.images && account.images.length > 0 ? (
                    <img src={account.images[0]} alt={account.title} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Image className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{account.title}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {account.game?.icon && <span className="text-lg">{account.game.icon}</span>}
                    <span>{(account as any).gameType || account.game?.nameAr}</span>
                  </div>
                </TableCell>
                <TableCell>{account.level || "-"}</TableCell>
                <TableCell><span className="font-bold text-primary">{account.price} ج</span></TableCell>
                <TableCell>
                  {account.isSold ? (
                    <Badge variant="secondary">مباع</Badge>
                  ) : account.isActive ? (
                    <Badge className="bg-green-500/20 text-green-500 border-0">متاح</Badge>
                  ) : (
                    <Badge variant="secondary">معطل</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(account)} data-testid={`button-edit-account-${account.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(account.id)} data-testid={`button-delete-account-${account.id}`}>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الحساب" : "إضافة حساب جديد"}</DialogTitle>
            <DialogDescription>أدخل بيانات الحساب (يجب إضافة 1-5 صور)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>صور الحساب (1-5 صور) *</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {images.map((img, index) => (
                  <div key={index} className="relative">
                    <img src={img} alt={`صورة ${index + 1}`} className="w-full h-24 rounded-lg object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -left-2 h-6 w-6"
                      onClick={() => removeImage(index)}
                      data-testid={`button-remove-image-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {images.length < 5 && (
                  <div
                    className="w-full h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Image className="w-5 h-5 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">إضافة صورة</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
                data-testid="input-account-images"
              />
            </div>

            <div>
              <Label>اللعبة</Label>
              <Select value={form.gameId} onValueChange={(value) => setForm({ ...form, gameId: value })}>
                <SelectTrigger data-testid="select-game">
                  <SelectValue placeholder="اختر اللعبة" />
                </SelectTrigger>
                <SelectContent>
                  {games.map((game) => (
                    <SelectItem key={game.id} value={game.id}>
                      <span className="flex items-center gap-2">
                        <span>{game.icon}</span>
                        <span>{game.nameAr}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>عنوان الحساب</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-account-title" />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-account-description" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>السعر (جنيه)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} data-testid="input-account-price" />
              </div>
              <div>
                <Label>المستوى</Label>
                <Input type="number" value={form.level} onChange={(e) => setForm({ ...form, level: parseInt(e.target.value) || 0 })} data-testid="input-account-level" />
              </div>
              <div>
                <Label>الرتبة</Label>
                <Input value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} data-testid="input-account-rank" />
              </div>
            </div>
            <div>
              <Label>المميزات (سطر لكل ميزة)</Label>
              <Textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} data-testid="input-account-features" />
            </div>
            <div>
              <Label>طريقة الربط</Label>
              <Input value={form.linkingMethod} onChange={(e) => setForm({ ...form, linkingMethod: e.target.value })} placeholder="مثال: ربط جيميل، ربط فيسبوك..." data-testid="input-account-linking-method" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} data-testid="switch-account-active" />
                <Label>مفعل</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isSold} onCheckedChange={(checked) => setForm({ ...form, isSold: checked })} data-testid="switch-account-sold" />
                <Label>تم البيع</Label>
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-account">
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {editing ? "حفظ التغييرات" : "إضافة الحساب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
