import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Eye, EyeOff, Trash2, MessageCircle, Filter, User, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useState } from "react";

interface CommentWithPost {
  id: string;
  postId: string;
  postTitle?: string;
  customerId: string | null;
  authorName: string;
  content: string;
  isHidden: boolean;
  createdAt: string;
}

interface PostOption {
  id: string;
  title: string;
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

export default function AdminCommunityComments() {
  const { toast } = useToast();
  const [filterPostId, setFilterPostId] = useState<string>("all");
  const [filterVisible, setFilterVisible] = useState<"all" | "visible" | "hidden">("all");

  const { data: posts = [] } = useQuery<PostOption[]>({
    queryKey: ["/api/admin/community/posts"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/community/posts");
      if (!res.ok) return [];
      return res.json();
    },
    select: (data: any[]) => data.map(p => ({ id: p.id, title: p.title })),
  });

  const { data: comments = [], isLoading } = useQuery<CommentWithPost[]>({
    queryKey: ["/api/admin/community/comments", filterPostId],
    queryFn: async () => {
      const url = filterPostId !== "all"
        ? `/api/admin/community/comments?postId=${filterPostId}`
        : "/api/admin/community/comments";
      const res = await adminFetch(url);
      if (!res.ok) throw new Error("فشل");
      return res.json();
    },
  });

  const toggleHideMutation = useMutation({
    mutationFn: async ({ id, isHidden }: { id: string; isHidden: boolean }) => {
      const res = await adminFetch(`/api/admin/community/comments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isHidden }),
      });
      if (!res.ok) throw new Error("فشل");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/community/comments"] });
      toast({ title: "تم تحديث حالة التعليق" });
    },
    onError: () => toast({ title: "فشل في التحديث", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminFetch(`/api/admin/community/comments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/community/comments"] });
      toast({ title: "تم حذف التعليق" });
    },
    onError: () => toast({ title: "فشل في الحذف", variant: "destructive" }),
  });

  const filtered = comments.filter(c => {
    if (filterVisible === "visible") return !c.isHidden;
    if (filterVisible === "hidden") return c.isHidden;
    return true;
  });

  const hiddenCount = comments.filter(c => c.isHidden).length;
  const visibleCount = comments.filter(c => !c.isHidden).length;

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl font-black text-foreground">إدارة تعليقات المجتمع</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {comments.length} تعليق إجمالاً —{" "}
          <span className="text-green-400">{visibleCount} ظاهر</span>{" · "}
          <span className="text-yellow-400">{hiddenCount} مخفي</span>
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterPostId} onValueChange={setFilterPostId}>
          <SelectTrigger className="w-52" data-testid="select-filter-post">
            <Filter className="w-3.5 h-3.5 ml-1" />
            <SelectValue placeholder="كل المنشورات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المنشورات</SelectItem>
            {posts.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterVisible} onValueChange={v => setFilterVisible(v as any)}>
          <SelectTrigger className="w-44" data-testid="select-filter-visibility">
            <Eye className="w-3.5 h-3.5 ml-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="visible">الظاهرة فقط</SelectItem>
            <SelectItem value="hidden">المخفية فقط</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">لا توجد تعليقات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((comment, idx) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={`rounded-xl p-4 transition-all ${comment.isHidden ? "opacity-60" : ""}`}
              style={{
                background: comment.isHidden ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${comment.isHidden ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)"}`,
              }}
              data-testid={`comment-row-${comment.id}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(0,144,255,0.12)", border: "1px solid rgba(0,144,255,0.2)" }}
                >
                  {comment.authorName.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      {comment.authorName}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(comment.createdAt)}
                    </span>
                    {comment.postTitle && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span className="truncate max-w-[140px]">{comment.postTitle}</span>
                      </span>
                    )}
                    {comment.isHidden && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-yellow-500/30 text-yellow-500">مخفي</Badge>
                    )}
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => toggleHideMutation.mutate({ id: comment.id, isHidden: !comment.isHidden })}
                    disabled={toggleHideMutation.isPending}
                    title={comment.isHidden ? "إظهار" : "إخفاء"}
                    data-testid={`button-toggle-hide-${comment.id}`}
                  >
                    {comment.isHidden ? <Eye className="w-3.5 h-3.5 text-green-400" /> : <EyeOff className="w-3.5 h-3.5 text-yellow-400" />}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-red-400 hover:text-red-400"
                        data-testid={`button-delete-comment-${comment.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>حذف التعليق</AlertDialogTitle>
                        <AlertDialogDescription>هل أنت متأكد من حذف هذا التعليق نهائياً؟</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-row-reverse gap-2">
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => deleteMutation.mutate(comment.id)}
                        >
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
