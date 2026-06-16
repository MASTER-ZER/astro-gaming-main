import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, ArrowRight, Calendar, Lock, Send, X, ChevronLeft, ChevronRight, User, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCustomer } from "@/hooks/useCustomer";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
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

interface PostComment {
  id: string;
  postId: string;
  customerId: string | null;
  authorName: string;
  content: string;
  isHidden: boolean;
  createdAt: string;
}

function timeAgo(date: string) {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
  } catch {
    return "";
  }
}

function formatDate(date: string) {
  try {
    return new Date(date).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

// Simple lightbox
function Lightbox({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) {
  const [current, setCurrent] = useState(initialIndex);
  const prev = () => setCurrent(i => (i - 1 + images.length) % images.length);
  const next = () => setCurrent(i => (i + 1) % images.length);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-4xl max-h-[90vh] w-full mx-4"
          onClick={e => e.stopPropagation()}
        >
          <img
            src={images[current]}
            alt=""
            className="w-full max-h-[85vh] object-contain rounded-2xl"
          />
          <button
            onClick={onClose}
            className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}
            data-testid="button-close-lightbox"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          {images.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute top-1/2 right-3 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}
                data-testid="button-lightbox-prev"
              >
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={next}
                className="absolute top-1/2 left-3 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.15)" }}
                data-testid="button-lightbox-next"
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{ background: i === current ? "#0090ff" : "rgba(255,255,255,0.3)" }}
                  />
                ))}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function CommentItem({ comment, index }: { comment: PostComment; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex gap-3 py-4"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      data-testid={`comment-${comment.id}`}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5"
        style={{ background: "linear-gradient(135deg, rgba(0,144,255,0.2), rgba(99,102,241,0.2))", border: "1px solid rgba(0,144,255,0.2)" }}
      >
        {comment.authorName.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground">{comment.authorName}</span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {timeAgo(comment.createdAt)}
          </span>
        </div>
        <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
      </div>
    </motion.div>
  );
}

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { isLoggedIn, customer } = useCustomer();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const { data: post, isLoading: postLoading } = useQuery<CommunityPost>({
    queryKey: ["/api/community/posts", id],
    queryFn: async () => {
      const res = await fetch(`/api/community/posts/${id}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery<PostComment[]>({
    queryKey: ["/api/community/posts", id, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/community/posts/${id}/comments`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!post,
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const token = localStorage.getItem("customer_token") || sessionStorage.getItem("customer_token");
      const res = await fetch(`/api/community/posts/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "فشل في إضافة التعليق");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", id, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", id] });
      setCommentText("");
      toast({ title: "تم نشر تعليقك بنجاح" });
    },
    onError: (e: any) => {
      toast({ title: e.message || "فشل في إضافة التعليق", variant: "destructive" });
    },
  });

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    addComment.mutate(commentText.trim());
  };

  const allImages = post ? [
    ...(post.coverImage ? [post.coverImage] : []),
    ...(post.images || []),
  ] : [];

  const openLightbox = (allImgs: string[], idx: number) => setLightbox({ images: allImgs, index: idx });

  if (postLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl" dir="rtl">
        <Skeleton className="w-full h-64 rounded-2xl mb-6" />
        <Skeleton className="w-3/4 h-8 mb-3" />
        <Skeleton className="w-1/2 h-4 mb-6" />
        <Skeleton className="w-full h-32" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-20 text-center" dir="rtl">
        <h2 className="text-xl font-bold text-foreground mb-2">المنشور غير موجود</h2>
        <p className="text-muted-foreground mb-6">تم حذف هذا المنشور أو لم يتم نشره بعد</p>
        <Link href="/community">
          <Button variant="outline">العودة للمجتمع</Button>
        </Link>
      </div>
    );
  }

  const extraImages = post.images || [];

  return (
    <div className="min-h-screen" dir="rtl">
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Back nav */}
      <div className="container mx-auto px-4 pt-4 max-w-3xl">
        <Link href="/community">
          <button
            data-testid="button-back-community"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowRight className="w-4 h-4" />
            مجتمع اللاعبين
          </button>
        </Link>
      </div>

      {/* Cover image */}
      {post.coverImage && (
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl overflow-hidden mb-6 cursor-zoom-in"
            style={{ maxHeight: 400 }}
            onClick={() => openLightbox([post.coverImage!, ...(post.images || [])], 0)}
          >
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover max-h-96"
            />
          </motion.div>
        </div>
      )}

      <div className="container mx-auto px-4 max-w-3xl pb-16">
        {/* Meta */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #0090ff, #6366f1)" }}
            >
              {post.publisherName.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">{post.publisherName}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {formatDate(post.createdAt)}
                <span className="text-muted-foreground/40">·</span>
                {timeAgo(post.createdAt)}
              </div>
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-foreground leading-tight mb-4">
            {post.title}
          </h1>

          <div className="flex items-center gap-2 mb-6">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <MessageCircle className="w-4 h-4" />
              {comments.length} تعليق
            </span>
            {!post.commentsEnabled && (
              <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-500">
                <Lock className="w-3 h-3 ml-1" />
                التعليقات مغلقة
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="prose prose-invert max-w-none mb-8"
        >
          <div
            className="text-foreground/90 leading-loose text-base whitespace-pre-wrap"
            style={{ lineHeight: "1.9" }}
          >
            {post.content}
          </div>
        </motion.div>

        {/* Extra images gallery */}
        {extraImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-10"
          >
            <div className={`grid gap-3 ${extraImages.length === 1 ? "grid-cols-1" : extraImages.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"}`}>
              {extraImages.map((img, idx) => (
                <div
                  key={idx}
                  className="rounded-xl overflow-hidden cursor-zoom-in aspect-square"
                  onClick={() => openLightbox(extraImages, idx)}
                  data-testid={`image-post-${idx}`}
                >
                  <img
                    src={img}
                    alt={`صورة ${idx + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Comments section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-5 md:p-6"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <h2 className="font-bold text-foreground mb-5 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            التعليقات
            <span className="text-muted-foreground text-sm font-normal">({comments.length})</span>
          </h2>

          {/* Comment input */}
          {post.commentsEnabled ? (
            isLoggedIn ? (
              <div className="mb-6">
                <div className="flex gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-1"
                    style={{ background: "linear-gradient(135deg, rgba(0,144,255,0.2), rgba(99,102,241,0.2))", border: "1px solid rgba(0,144,255,0.2)" }}
                  >
                    {(customer?.name || customer?.username || "م").charAt(0)}
                  </div>
                  <div className="flex-1">
                    <Textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="اكتب تعليقك هنا..."
                      className="resize-none text-sm min-h-[80px]"
                      maxLength={1000}
                      data-testid="input-comment"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[11px] text-muted-foreground">{commentText.length}/1000</span>
                      <Button
                        size="sm"
                        onClick={handleSubmitComment}
                        disabled={!commentText.trim() || addComment.isPending}
                        data-testid="button-submit-comment"
                      >
                        <Send className="w-3.5 h-3.5 ml-1.5" />
                        {addComment.isPending ? "جاري النشر..." : "نشر التعليق"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="mb-6 p-4 rounded-xl text-center"
                style={{ background: "rgba(0,144,255,0.05)", border: "1px solid rgba(0,144,255,0.12)" }}
              >
                <p className="text-sm text-muted-foreground mb-3">سجّل دخولك للمشاركة في التعليقات</p>
                <Link href="/dashboard">
                  <Button size="sm" variant="outline">
                    <User className="w-3.5 h-3.5 ml-1.5" />
                    تسجيل الدخول
                  </Button>
                </Link>
              </div>
            )
          ) : (
            <div
              className="mb-6 p-4 rounded-xl text-center"
              style={{ background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.15)" }}
            >
              <Lock className="w-4 h-4 text-yellow-500 mx-auto mb-1.5" />
              <p className="text-sm text-yellow-500">تم إغلاق التعليقات مؤقتاً على هذا المنشور</p>
            </div>
          )}

          {/* Comments list */}
          {commentsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3 py-3">
                  <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-32 h-3" />
                    <Skeleton className="w-full h-4" />
                    <Skeleton className="w-2/3 h-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">لا توجد تعليقات بعد، كن أول من يعلّق!</p>
            </div>
          ) : (
            <div>
              {comments.map((comment, i) => (
                <CommentItem key={comment.id} comment={comment} index={i} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
