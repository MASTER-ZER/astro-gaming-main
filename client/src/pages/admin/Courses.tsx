import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { GraduationCap, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Course } from "@shared/schema";

export default function AdminCourses() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState({ title: "", description: "", price: 0, icon: "", features: "", isActive: true });

  const { data: courses = [], isLoading } = useQuery<Course[]>({ queryKey: ["/api/courses"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/courses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "تم الإضافة", description: "تم إضافة الكورس بنجاح" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/courses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setShowDialog(false);
      resetForm();
      toast({ title: "تم التحديث", description: "تم تحديث الكورس بنجاح" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "تم الحذف", description: "تم حذف الكورس بنجاح" });
    },
  });

  const resetForm = () => {
    setForm({ title: "", description: "", price: 0, icon: "", features: "", isActive: true });
    setEditing(null);
  };

  const openEdit = (course: Course) => {
    setEditing(course);
    setForm({
      title: course.title,
      description: course.description,
      price: course.price,
      icon: course.icon,
      features: course.features?.join("\n") || "",
      isActive: course.isActive ?? true,
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    const data = { ...form, features: form.features.split("\n").filter(f => f.trim()) };
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
          <h1 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">إدارة الكورسات</h1>
          <p className="text-sm md:text-base text-muted-foreground">إضافة وتعديل الكورسات التعليمية</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} data-testid="button-add-course" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 ml-2" />
          إضافة كورس
        </Button>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {courses.map((course) => (
          <Card key={course.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-xl">
                  {course.icon}
                </div>
                <div>
                  <p className="font-medium text-sm">{course.title}</p>
                  <p className="text-primary font-bold text-sm">{course.price} ج</p>
                </div>
              </div>
              <span className={`text-xs ${course.isActive ? "text-green-500" : "text-red-500"}`}>
                {course.isActive ? "مفعل" : "معطل"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{course.description}</p>
            <div className="flex items-center justify-end gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(course)} data-testid={`button-edit-course-${course.id}`}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(course.id)} data-testid={`button-delete-course-${course.id}`}>
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
              <TableHead className="text-right">الكورس</TableHead>
              <TableHead className="text-right">الوصف</TableHead>
              <TableHead className="text-right">السعر</TableHead>
              <TableHead className="text-right">الحالة</TableHead>
              <TableHead className="text-right">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-xl">
                      {course.icon}
                    </div>
                    <span className="font-medium">{course.title}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-xs truncate">{course.description}</TableCell>
                <TableCell><span className="font-bold text-primary">{course.price} ج</span></TableCell>
                <TableCell>
                  <span className={`text-sm ${course.isActive ? "text-green-500" : "text-red-500"}`}>
                    {course.isActive ? "مفعل" : "معطل"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(course)} data-testid={`button-edit-course-${course.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(course.id)} data-testid={`button-delete-course-${course.id}`}>
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
            <DialogTitle>{editing ? "تعديل الكورس" : "إضافة كورس جديد"}</DialogTitle>
            <DialogDescription>أدخل بيانات الكورس</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>عنوان الكورس</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>الأيقونة (Emoji)</Label>
                <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>السعر (جنيه)</Label>
              <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>المميزات (سطر لكل ميزة)</Label>
              <Textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="ميزة 1&#10;ميزة 2&#10;ميزة 3" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
              <Label>مفعل</Label>
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {editing ? "حفظ التغييرات" : "إضافة الكورس"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
