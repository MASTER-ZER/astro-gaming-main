import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { MessageCircle, Users, Calendar, Eye, Flame, ChevronLeft, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

function timeAgo(date: string) {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ar });
  } catch {
    return "";
  }
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function PostCard({ post, index }: { post: CommunityPost; index: number }) {
  const excerpt = stripHtml(post.content).slice(0, 140);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
    >
      <Link href={`/community/${post.id}`}>
        <div
          data-testid={`card-post-${post.id}`}
          className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
          }}
        >
          {post.coverImage && (
            <div className="relative w-full h-48 overflow-hidden">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#040612] via-transparent to-transparent" />
            </div>
          )}

          <div className={`p-5 ${post.coverImage ? "" : "pt-6"}`}>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #0090ff, #6366f1)" }}
              >
                {post.publisherName.charAt(0)}
              </div>
              <span className="text-xs text-muted-foreground">{post.publisherName}</span>
              <span className="text-muted-foreground/40 text-xs">•</span>
              <span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
            </div>

            <h3 className="font-bold text-foreground text-base mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </h3>

            {excerpt && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                {excerpt}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {post.commentCount}
                </span>
                {!post.commentsEnabled && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-yellow-500/30 text-yellow-500">
                    مغلق
                  </Badge>
                )}
              </div>
              <ChevronLeft className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function PostSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
      <Skeleton className="w-full h-48" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="w-24 h-3" />
        </div>
        <Skeleton className="w-3/4 h-5" />
        <Skeleton className="w-full h-4" />
        <Skeleton className="w-2/3 h-4" />
      </div>
    </div>
  );
}

export default function Community() {
  const { data: posts = [], isLoading } = useQuery<CommunityPost[]>({
    queryKey: ["/api/community/posts"],
  });

  const latest = posts.slice(0, 3);
  const rest = posts.slice(3);

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, rgba(0,144,255,0.12) 0%, rgba(99,102,241,0.08) 50%, transparent 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="container mx-auto px-4 py-10 md:py-14">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-medium"
              style={{ background: "rgba(0,144,255,0.12)", border: "1px solid rgba(0,144,255,0.2)", color: "#0090ff" }}>
              <Sparkles className="w-3.5 h-3.5" />
              مجتمع اللاعبين
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-3 text-foreground leading-tight">
              مجتمع ASTRO
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
              تابع آخر الأخبار والتحديثات، وشارك في النقاشات مع مجتمع اللاعبين
            </p>
          </motion.div>
        </div>

        {/* Decorative blur */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,144,255,0.08) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)" }} />
      </div>

      <div className="container mx-auto px-4 py-8">

        {/* Stats bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: Users, label: "مجتمع نشط", value: "اللاعبين" },
            { icon: Flame, label: "منشورات", value: `${posts.length}` },
            { icon: TrendingUp, label: "تفاعل", value: "مستمر" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <s.icon className="w-4 h-4 mx-auto mb-1 text-primary/70" />
              <div className="text-sm font-bold text-foreground">{s.value}</div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <PostSkeleton key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(0,144,255,0.08)", border: "1px solid rgba(0,144,255,0.12)" }}>
              <MessageCircle className="w-8 h-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">لا توجد منشورات بعد</h3>
            <p className="text-muted-foreground text-sm">سيتم نشر محتوى المجتمع قريباً، ترقبونا!</p>
          </motion.div>
        ) : (
          <>
            {latest.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <h2 className="font-bold text-foreground text-sm">أحدث المنشورات</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {latest.map((post, i) => <PostCard key={post.id} post={post} index={i} />)}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-bold text-foreground text-sm">المزيد</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {rest.map((post, i) => <PostCard key={post.id} post={post} index={i} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
