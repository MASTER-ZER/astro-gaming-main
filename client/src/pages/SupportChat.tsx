import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Send, MessageCircle, Loader2, Headphones, Image, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useCustomer, customerFetch } from "@/hooks/useCustomer";

interface SupportMsg {
  id: string;
  customerId: string;
  senderType: string;
  message: string;
  imageUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function SupportChat() {
  const { customer } = useCustomer();
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedImg, setExpandedImg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: messages = [], isLoading } = useQuery<SupportMsg[]>({
    queryKey: ["/api/support/messages"],
    queryFn: async () => {
      const res = await customerFetch("/api/support/messages");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!customer,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ msg, imgUrl }: { msg: string; imgUrl: string | null }) => {
      const res = await customerFetch("/api/support/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, imageUrl: imgUrl }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      setImagePreview(null);
      setUploadedImageUrl(null);
      queryClient.invalidateQueries({ queryKey: ["/api/support/messages"] });
      setTimeout(() => inputRef.current?.focus(), 100);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if ((!message.trim() && !uploadedImageUrl) || sendMutation.isPending) return;
    sendMutation.mutate({ msg: message.trim(), imgUrl: uploadedImageUrl });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await customerFetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setUploadedImageUrl(data.objectPath || data.url || data.filePath);
      }
    } catch {}
    setIsUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const cancelImage = () => {
    setImagePreview(null);
    setUploadedImageUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "اليوم";
    if (d.toDateString() === yesterday.toDateString()) return "أمس";
    return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
  };

  const grouped: { day: string; msgs: SupportMsg[] }[] = [];
  for (const msg of messages) {
    const day = formatDay(msg.createdAt);
    if (!grouped.length || grouped[grouped.length - 1].day !== day) {
      grouped.push({ day, msgs: [msg] });
    } else {
      grouped[grouped.length - 1].msgs.push(msg);
    }
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center p-8">
          <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-lg font-bold mb-2">يجب تسجيل الدخول</p>
          <p className="text-muted-foreground text-sm mb-4">سجل دخولك للتواصل مع الدعم</p>
          <Link href="/">
            <Button variant="outline" size="sm">العودة للرئيسية</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur-sm shrink-0 sticky top-0 z-10">
        <Link href="/">
          <button className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Headphones className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">الدعم الفني - ASTRO</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <p className="text-[11px] text-green-400">متاح للمساعدة</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{ backgroundImage: "radial-gradient(circle at 50% 50%, rgba(0,212,255,0.03) 0%, transparent 70%)" }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <p className="font-bold text-base mb-1">مرحباً! 👋</p>
            <p className="text-muted-foreground text-sm max-w-xs">كيف يمكننا مساعدتك؟ اكتب رسالتك أو أرسل صورة وسنرد عليك في أقرب وقت.</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.day}>
              <div className="flex justify-center my-3">
                <span className="text-[10px] text-muted-foreground bg-white/5 px-3 py-1 rounded-full">{group.day}</span>
              </div>
              {group.msgs.map((msg, i) => {
                const isMe = msg.senderType === "customer";
                const isLast = i === group.msgs.length - 1 || group.msgs[i + 1].senderType !== msg.senderType;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={`flex ${isMe ? "justify-end" : "justify-start"} ${isLast ? "mb-2" : "mb-0.5"}`}
                  >
                    <div
                      className={`max-w-[78%] overflow-hidden shadow-sm ${
                        isMe
                          ? "bg-primary text-black rounded-2xl rounded-bl-sm"
                          : "bg-white/10 text-white rounded-2xl rounded-br-sm"
                      }`}
                    >
                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt="صورة"
                          className="w-full max-w-[240px] rounded-t-2xl object-cover cursor-pointer"
                          style={{ maxHeight: 200 }}
                          onClick={() => setExpandedImg(msg.imageUrl!)}
                          data-testid={`chat-img-${msg.id}`}
                        />
                      )}
                      {msg.message && (
                        <p className={`px-3.5 py-2 text-sm leading-relaxed break-words ${msg.imageUrl ? "pt-1.5" : ""}`}>
                          {msg.message}
                        </p>
                      )}
                      <div className={`flex items-center gap-1 pb-1.5 px-3 ${isMe ? "justify-end" : "justify-start"} ${!msg.message ? "mt-1" : ""}`}>
                        <span className={`text-[10px] ${isMe ? "text-black/60" : "text-white/40"}`}>
                          {formatTime(msg.createdAt)}
                        </span>
                        {isMe && (
                          <span className={`text-[10px] ${msg.isRead ? "text-black/60" : "text-black/40"}`}>
                            {msg.isRead ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image preview bar */}
      {imagePreview && (
        <div className="shrink-0 px-3 pt-2 pb-0 border-t border-white/10 bg-black/40">
          <div className="flex items-center gap-2">
            <div className="relative inline-block">
              <img src={imagePreview} alt="معاينة" className="h-16 w-16 object-cover rounded-lg border border-white/10" />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
              )}
              <button
                onClick={cancelImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground">{isUploading ? "جاري الرفع..." : "جاهزة للإرسال"}</span>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 px-3 py-3 border-t border-white/10 bg-black/40 backdrop-blur-sm flex items-center gap-2">
        <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-9 h-9 rounded-full bg-white/8 border border-white/10 flex items-center justify-center shrink-0 hover:bg-white/15 transition-colors"
          data-testid="button-attach-image"
        >
          <Image className="w-4 h-4 text-muted-foreground" />
        </button>
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالة..."
          className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2.5 text-sm text-black outline-none focus:border-primary/60 transition-colors placeholder:text-gray-400"
          data-testid="input-support-message"
          autoComplete="off"
        />
        <button
          onClick={handleSend}
          disabled={(!message.trim() && !uploadedImageUrl) || sendMutation.isPending || isUploading}
          className="w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          data-testid="button-send-support"
        >
          {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded image modal */}
      {expandedImg && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setExpandedImg(null)}
        >
          <img src={expandedImg} alt="صورة" className="max-w-full max-h-full rounded-xl object-contain" />
          <button
            className="absolute top-4 left-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
            onClick={() => setExpandedImg(null)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
