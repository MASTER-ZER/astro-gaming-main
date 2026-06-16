import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, Loader2, Clock, CheckCircle, ArrowRight, Search } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Order } from "@shared/schema";

interface ChatMessage {
  id: string;
  orderId: string;
  senderType: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface OrderWithGame extends Order {
  game?: { nameAr: string } | null;
}

export default function AdminChat() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderWithGame[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 15000,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return [];
      const res = await fetch(`/api/chat/${selectedOrderId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedOrderId,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (msg: string) => {
      await apiRequest("POST", `/api/chat/${selectedOrderId}`, {
        message: msg,
        senderType: "admin",
      });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat", selectedOrderId] });
    },
  });

  useEffect(() => {
    if (selectedOrderId && messages.length > 0) {
      apiRequest("PATCH", `/api/chat/${selectedOrderId}/read`, { senderType: "customer" }).catch(() => {});
    }
  }, [messages.length, selectedOrderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (message.trim() && selectedOrderId) {
      sendMutation.mutate(message.trim());
    }
  };

  const filteredOrders = orders.filter(o =>
    !searchTerm ||
    o.customerName.includes(searchTerm) ||
    o.customerPhone.includes(searchTerm) ||
    o.orderNumber.includes(searchTerm)
  );

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-primary" />
        المحادثات
      </h1>

      <div className="grid md:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
        <Card className="p-3 overflow-hidden flex flex-col">
          <Input
            placeholder="بحث بالاسم أو الرقم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-3"
            data-testid="input-admin-chat-search"
          />
          <div className="flex-1 overflow-y-auto space-y-1">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">لا توجد طلبات</p>
            ) : (
              filteredOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`w-full text-right p-3 rounded-lg transition-colors ${
                    selectedOrderId === order.id
                      ? "bg-primary/15 border border-primary/20"
                      : "hover-elevate"
                  }`}
                  data-testid={`button-select-order-${order.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm truncate">{order.customerName}</p>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">
                      {order.status === "pending" ? "معلق" :
                       order.status === "completed" ? "مكتمل" :
                       order.status === "processing" ? "قيد التنفيذ" : "ملغي"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1" dir="ltr">#{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="md:col-span-2 overflow-hidden flex flex-col">
          {!selectedOrderId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">اختر طلب من القائمة لبدء المحادثة</p>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-border/30">
                {(() => {
                  const order = orders.find(o => o.id === selectedOrderId);
                  return order ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <MessageCircle className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">#{order.orderNumber} - {order.customerPhone}</p>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="admin-chat-messages">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageCircle className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">لا توجد رسائل</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                          msg.senderType === "admin"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                        data-testid={`admin-chat-msg-${msg.id}`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <div className={`flex items-center gap-1 mt-1 ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}>
                          <span className="text-[10px] opacity-60">
                            {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {msg.senderType === "admin" && (
                            msg.isRead ? (
                              <CheckCircle className="w-3 h-3 opacity-60" />
                            ) : (
                              <Clock className="w-3 h-3 opacity-40" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
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
                    placeholder="اكتب ردك..."
                    disabled={sendMutation.isPending}
                    data-testid="input-admin-chat-message"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!message.trim() || sendMutation.isPending}
                    data-testid="button-admin-send"
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
