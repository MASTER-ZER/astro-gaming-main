import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Edit2, Trash2, MessageCircle, MessageCircleOff,
  Save, X, ChevronDown, ChevronUp, CheckCircle2, Clock,
  ImagePlus, Loader2, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  coverImage: string | null;
  images: string[] | null;
  status: string;
  commentsEnabled: boolean;
  publisherName: string;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

function getAdminToken() {
  return localStorage.getItem("admin_token") || "";
}

function adminFetch(url: string, opts: RequestInit = {}) {
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAdminToken()}`,
      ...(opts.headers || {}),
    },
  });
}

function timeAgo(d: string) {
  try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ar }); } catch { return ""; }
}

// Upload a single image file, returns URL string
async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${getAdminToken()}` },
    body: formData,
  });
  if (!res.ok) throw new Error("فشل رفع الصورة");
  const data = await res.json();
  return data.objectPath as string;
}

// Image upload button with preview
function ImageUploadButton({
  value,
  onChange,
  label,
  className = "",
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch {
      alert("فشل رفع الصورة، حاول مرة أخرى");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {value ? (
        <div className="relative group rounded-xl overflow-hidden" style={{ maxHeight: 200 }}>
          <img
            src={value}
            alt="preview"
            className="w-full object-cover rounded-xl"
            style={{ maxHeight: 200 }}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <ImagePlus className="w-3.5 h-3.5 ml-1" />
              تغيير
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => onChange("")}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors duration-150 hover:border-primary/40 hover:bg-primary/4"
          style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.02)" }}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : (
            <>
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// Multiple image upload
function MultiImageUpload({
  values,
  onChange,
}: {
  values: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map(uploadImage));
      onChange([...values, ...uploaded]);
    } catch {
      alert("فشل رفع بعض الصور، حاول مرة أخرى");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      {values.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {values.map((url, idx) => (
            <div key={idx} className="relative group rounded-lg overflow-hidden aspect-square">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="absolute top-1 left-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full h-16 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 transition-colors duration-150 hover:border-primary/40 hover:bg-primary/4"
        style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.01)" }}
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <>
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">أضف صور إضافية (يمكن تحديد أكثر من صورة)</span>
          </>
        )}
      </button>
    </div>
  );
}

interface PostFormData {
  title: string;
  content: string;
  coverImage: string;
  images: string[];
  status: "draft" | "published";
  commentsEnabled: boolean;
  publisherName: string;
}

const defaultForm: PostFormData = {
  title: "",
  content: "",
  coverImage: "",
  images: [],
  status: "draft",
  commentsEnabled: true,
  publisherName: "الإدارة",
};

function PostForm({ post, onSave, onCancel, loading }: {
  post?: CommunityPost;
  onSave: (data: PostFormData) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<PostFormData>(() =>
    post ? {
      title: post.title,
      content: post.content,
      coverImage: post.coverImage || "",
      images: post.images || [],
      status: post.status as "draft" | "published",
      commentsEnabled: post.commentsEnabled,
      publisherName: post.publisherName,
    } : defaultForm
  );

  const set = <K extends keyof PostFormData>(k: K, v: PostFormData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground text-lg">{post ? "تعديل المنشور" : "منشور جديد"}</h3>
        <Button variant="ghost" size="icon" onClick={onCancel} data-testid="button-cancel-form"><X className="w-4 h-4" /></Button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">العنوان *</Label>
        <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="عنوان المنشور" data-testid="input-post-title" />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">المحتوى *</Label>
        <Textarea
          value={form.content}
          onChange={e => set("content", e.target.value)}
          placeholder="اكتب محتوى المنشور..."
          className="min-h-[160px] resize-none"
          data-testid="input-post-content"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">صورة الغلاف</Label>
        <ImageUploadButton
          value={form.coverImage}
          onChange={v => set("coverImage", v)}
          label="ارفع صورة الغلاف من معرضك"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">صور إضافية داخل المنشور</Label>
        <MultiImageUpload
          values={form.images}
          onChange={v => set("images", v)}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">اسم الناشر</Label>
        <Input value={form.publisherName} onChange={e => set("publisherName", e.target.value)} placeholder="الإدارة" data-testid="input-publisher-name" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Switch
            id="post-status"
            checked={form.status === "published"}
            onCheckedChange={v => set("status", v ? "published" : "draft")}
            data-testid="switch-post-status"
          />
          <Label htmlFor="post-status" className="cursor-pointer text-sm">
            {form.status === "published" ? (
              <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> منشور</span>
            ) : (
              <span className="text-yellow-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> مسودة</span>
            )}
          </Label>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Switch
            id="comments-enabled"
            checked={form.commentsEnabled}
            onCheckedChange={v => set("commentsEnabled", v)}
            data-testid="switch-comments-enabled"
          />
          <Label htmlFor="comments-enabled" className="cursor-pointer text-sm">
            {form.commentsEnabled ? (
              <span className="text-blue-400 flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> تعليقات مفتوحة</span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-1"><MessageCircleOff className="w-3.5 h-3.5" /> مغلقة</span>
            )}
          </Label>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <Button
          onClick={() => onSave(form)}
          disabled={loading || !form.title.trim() || !form.content.trim()}
          className="flex-1"
          data-testid="button-save-post"
        >
          {loading ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <Save className="w-4 h-4 ml-1.5" />}
          {loading ? "جاري الحفظ..." : "حفظ المنشور"}
        </Button>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel-save">إلغاء</Button>
      </div>
    </div>
  );
}

export default function AdminCommunityPosts() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editPost, setEditPost] = useState<CommunityPost | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery<CommunityPost[]>({
    queryKey: ["/api/admin/community/posts"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/community/posts");
      if (!res.ok) throw new Error("فشل");
      return res.json();
    },
  });

  const buildBody = (data: PostFormData) => ({
    title: data.title,
    content: data.content,
    coverImage: data.coverImage || null,
    images: data.images.length > 0 ? data.images : null,
    status: data.status,
    commentsEnabled: data.commentsEnabled,
    publisherName: data.publisherName || "الإدارة",
  });

  const createMutation = useMutation({
    mutationFn: async (data: PostFormData) => {
      const res = await adminFetch("/api/admin/community/posts", {
        method: "POST",
        body: JSON.stringify(buildBody(data)),
      });
      if (!res.ok) throw new Error((await res.json()).error || "فشل");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/community/posts"] });
      setShowForm(false);
      toast({ title: "تم إنشاء المنشور بنجاح" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PostFormData }) => {
      const res = await adminFetch(`/api/admin/community/posts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(buildBody(data)),
      });
      if (!res.ok) throw new Error((await res.json()).error || "فشل");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/community/posts"] });
      setEditPost(null);
      toast({ title: "تم تحديث المنشور بنجاح" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminFetch(`/api/admin/community/posts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل في الحذف");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/community/posts"] });
      toast({ title: "تم حذف المنشور" });
    },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const quickToggle = async (post: CommunityPost, field: "status" | "commentsEnabled") => {
    const body = field === "status"
      ? { status: post.status === "published" ? "draft" : "published" }
      : { commentsEnabled: !post.commentsEnabled };
    const res = await adminFetch(`/api/admin/community/posts/${post.id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (res.ok) queryClient.invalidateQueries({ queryKey: ["/api/admin/community/posts"] });
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-foreground">إدارة منشورات المجتمع</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{posts.length} منشور</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditPost(null); }} data-testid="button-new-post">
          <Plus className="w-4 h-4 ml-1.5" />
          منشور جديد
        </Button>
      </div>

      <AnimatePresence>
        {(showForm && !editPost) && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <PostForm
              onSave={data => createMutation.mutate(data)}
              onCancel={() => setShowForm(false)}
              loading={createMutation.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">لا توجد منشورات. أنشئ أول منشور الآن!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post, idx) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              {editPost?.id === post.id ? (
                <PostForm
                  post={post}
                  onSave={data => updateMutation.mutate({ id: post.id, data })}
                  onCancel={() => setEditPost(null)}
                  loading={updateMutation.isPending}
                />
              ) : (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  data-testid={`post-row-${post.id}`}
                >
                  <div className="flex items-start gap-3 p-4">
                    {post.coverImage && (
                      <img src={post.coverImage} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-1 mb-1">
                            {post.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-5 cursor-pointer ${post.status === "published" ? "border-green-500/40 text-green-400" : "border-yellow-500/40 text-yellow-400"}`}
                              onClick={() => quickToggle(post, "status")}
                              data-testid={`badge-status-${post.id}`}
                            >
                              {post.status === "published" ? <><CheckCircle2 className="w-2.5 h-2.5 ml-1" />منشور</> : <><Clock className="w-2.5 h-2.5 ml-1" />مسودة</>}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-5 cursor-pointer ${post.commentsEnabled ? "border-blue-500/40 text-blue-400" : "border-muted-foreground/30 text-muted-foreground"}`}
                              onClick={() => quickToggle(post, "commentsEnabled")}
                              data-testid={`badge-comments-${post.id}`}
                            >
                              {post.commentsEnabled ? <><MessageCircle className="w-2.5 h-2.5 ml-1" />تعليقات</> : <><MessageCircleOff className="w-2.5 h-2.5 ml-1" />مغلق</>}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">{timeAgo(post.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => setExpandedId(expandedId === post.id ? null : post.id)}
                            data-testid={`button-expand-${post.id}`}
                          >
                            {expandedId === post.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => { setEditPost(post); setShowForm(false); }}
                            data-testid={`button-edit-${post.id}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-red-400 hover:text-red-400" data-testid={`button-delete-${post.id}`}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف المنشور</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد؟ سيتم حذف المنشور وجميع تعليقاته بشكل نهائي.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-row-reverse gap-2">
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => deleteMutation.mutate(post.id)}
                                >
                                  حذف نهائياً
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === post.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed"
                          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          <div className="pt-3 whitespace-pre-wrap line-clamp-6">
                            {post.content.slice(0, 300)}{post.content.length > 300 ? "..." : ""}
                          </div>
                          {post.images && post.images.length > 0 && (
                            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                              {post.images.map((img, i) => (
                                <img key={i} src={img} alt="" className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-3 text-xs">
                            <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.commentCount} تعليق</span>
                            <span>بقلم: {post.publisherName}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
