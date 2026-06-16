import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowRight, Send, MessageCircle, Loader2, Clock, CheckCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ParticleBackground } from "@/components/ParticleBackground";

interface ChatMessage {
  id: string;
  orderId: string;
  senderType: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function Chat() {
  const { orderId } = useParams<{ orderId: string }>();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/chat/${orderId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!orderId,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (msg: string) => {
      await apiRequest("POST", `/api/chat/${orderId}`, {
        message: msg,
        senderType: "customer",
      });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat", orderId] });
    },
  });

  useEffect(() => {
    if (messages.length > 0) {
      apiRequest("PATCH", `/api/chat/${orderId}/read`, { senderType: "admin" }).catch(() => {});
    }
  }, [messages.length, orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      sendMutation.mutate(message.trim());
    }
  };

  return (
    <div className="min-h-screen relative">
      <ParticleBackground />

      <div className="relative z-10 py-8 container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <Link
            href="/my-orders"
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-3"
          >
            <ArrowRight className="w-4 h-4 ml-1" />
            العودة للطلبات
          </Link>

          <Card className="glass-ultra p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-600 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-black" />
              </div>
              <div>
                <h2 className="font-bold">محادثة الطلب</h2>
                <p className="text-xs text-muted-foreground" dir="ltr">Order #{orderId?.slice(0, 8)}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <Card className="glass-ultra overflow-hidden">
          <div className="h-[50vh] md:h-[55vh] overflow-y-auto p-4 space-y-3" data-testid="chat-messages-container">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">لا توجد رسائل بعد</p>
                <p className="text-muted-foreground text-xs mt-1">ابدأ المحادثة بإرسال رسالة</p>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.senderType === "customer" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.senderType === "customer"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                    data-testid={`chat-message-${msg.id}`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    <div className={`flex items-center gap-1 mt-1 ${msg.senderType === "customer" ? "justify-end" : "justify-start"}`}>
                      <span className="text-[10px] opacity-60">
                        {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {msg.senderType === "customer" && (
                        msg.isRead ? (
                          <CheckCircle className="w-3 h-3 opacity-60" />
                        ) : (
                          <Clock className="w-3 h-3 opacity-40" />
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-border/30 p-3">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="اكتب رسالتك..."
                disabled={sendMutation.isPending}
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!message.trim() || sendMutation.isPending}
                className="glow-soft"
                data-testid="button-send-message"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
