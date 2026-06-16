import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, MessageCircle, Loader2, Search, Headphones, Image, X, Plus, User } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSearch } from "wouter";

interface SupportMsg {
  id: string;
  customerId: string;
  senderType: string;
  message: string;
  imageUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  customerId: string;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
  customer?: { id: string; name?: string; username?: string; phone?: string };
}

interface CustomerInfo {
  id: string;
  name?: string;
  username?: string;
  phone?: string;
}

export default function AdminSupportChat() {
  const searchStr = useSearch();
  const urlCustomerId = new URLSearchParams(searchStr).get("customerId");

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(urlCustomerId);
  const [selectedCustomerInfo, setSelectedCustomerInfo] = useState<CustomerInfo | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedImg, setExpandedImg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: conversations = [], isLoading: convsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/admin/support/conversations"],
    refetchInterval: 4000,
  });

  const { data: allCustomers = [] } = useQuery<CustomerInfo[]>({
    queryKey: ["/api/admin/customers"],
    select: (data: any[]) => data.map(c => ({ id: c.id, name: c.name, username: c.username, phone: c.phone })),
  });

  const { data: messages = [], isLoading: msgsLoading } = useQuery<SupportMsg[]>({
    queryKey: ["/api/admin/support/messages", selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return [];
      const res = await apiRequest("GET", `/api/admin/support/messages/${selectedCustomerId}`);
      return res.json();
    },
    enabled: !!selectedCustomerId,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ msg, imgUrl }: { msg: string; imgUrl: string | null }) => {
      await apiRequest("POST", `/api/admin/support/messages/${selectedCustomerId}`, {
        message: msg,
        imageUrl: imgUrl,
      });
    },
    onSuccess: () => {
      setMessage("");
      setImagePreview(null);
      setUploadedImageUrl(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/messages", selectedCustomerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/conversations"] });
      setTimeout(() => inputRef.current?.focus(), 100);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (urlCustomerId) {
      setSelectedCustomerId(urlCustomerId);
      if (allCustomers.length > 0) {
        const found = allCustomers.find(c => c.id === urlCustomerId);
        if (found) setSelectedCustomerInfo(found);
      }
    }
  }, [urlCustomerId, allCustomers]);

  const handleSend = () => {
    if ((!message.trim() && !uploadedImageUrl) || sendMutation.isPending) return;
    sendMutation.mutate({ msg: message.trim(), imgUrl: uploadedImageUrl });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setImagePreview(URL.createObjectURL(file));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
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

  const openCustomerChat = (customer: CustomerInfo) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomerInfo(customer);
    setNewChatOpen(false);
    setNewChatSearch("");
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
  };

  const formatFullTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

  const selectedConv = conversations.find(c => c.customerId === selectedCustomerId);
  const activeCustomer: CustomerInfo | undefined = selectedConv?.customer || selectedCustomerInfo || undefined;

  const filteredConvs = conversations.filter(c => {
    const q = search.toLowerCase();
    return !search || c.customer?.name?.toLowerCase().includes(q) || c.customer?.username?.toLowerCase().includes(q) || c.customer?.phone?.includes(search);
  });

  const filteredCustomers = allCustomers.filter(c => {
    const q = newChatSearch.toLowerCase();
    return !newChatSearch || c.name?.toLowerCase().includes(q) || c.username?.toLowerCase().includes(q) || c.phone?.includes(newChatSearch);
  });

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <div className="flex h-[calc(100vh-120px)] rounded-xl overflow-hidden border border-white/10" dir="rtl">
      {/* Sidebar */}
      <div className="w-72 shrink-0 border-l border-white/10 bg-black/20 flex flex-col">
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Headphones className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-sm">الدعم الفني</h2>
            {totalUnread > 0 && (
              <Badge className="bg-primary text-black text-[10px] h-5 px-1.5">{totalUnread}</Badge>
            )}
            <button
              onClick={() => setNewChatOpen(true)}
              className="mr-auto w-7 h-7 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center justify-center transition-colors"
              title="بدء محادثة جديدة"
              data-testid="button-new-chat"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="بحث في المحادثات..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-8 h-8 text-xs bg-white/5 border-white/10"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">لا توجد محادثات</div>
          ) : (
            filteredConvs.map(conv => (
              <div
                key={conv.customerId}
                onClick={() => { setSelectedCustomerId(conv.customerId); setSelectedCustomerInfo(conv.customer || null); }}
                className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-white/5 ${
                  selectedCustomerId === conv.customerId ? "bg-primary/10 border-r-2 border-r-primary" : "hover:bg-white/5"
                }`}
                data-testid={`conv-${conv.customerId}`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                  {(conv.customer?.name || conv.customer?.username || "؟")[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-semibold truncate">
                      {conv.customer?.name || conv.customer?.username || conv.customer?.phone || "زبون"}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(conv.lastAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] text-muted-foreground/60 truncate">
                      {conv.customer?.username ? `@${conv.customer.username}` : conv.customer?.phone || ""}
                    </p>
                    {conv.unreadCount > 0 && (
                      <Badge className="bg-primary text-black text-[10px] h-4 w-4 p-0 flex items-center justify-center rounded-full shrink-0">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{conv.lastMessage || "📸 صورة"}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {selectedCustomerId ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
              {(activeCustomer?.name || activeCustomer?.username || "؟")[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {activeCustomer?.name || activeCustomer?.username || "زبون"}
              </p>
              <div className="flex items-center gap-2">
                {activeCustomer?.username && (
                  <span className="text-[10px] text-primary/70">@{activeCustomer.username}</span>
                )}
                {activeCustomer?.phone && !activeCustomer.phone.startsWith("google_") && (
                  <span className="text-[10px] text-muted-foreground">{activeCustomer.phone}</span>
                )}
              </div>
            </div>
            {messages.length === 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-0 text-[10px]">محادثة جديدة</Badge>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {msgsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-primary/60" />
                </div>
                <p className="text-muted-foreground text-sm">ابدأ المحادثة مع {activeCustomer?.name || activeCustomer?.username || "العميل"}</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isAdmin = msg.senderType === "admin";
                const isLast = i === messages.length - 1 || messages[i + 1]?.senderType !== msg.senderType;
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"} ${isLast ? "mb-2" : "mb-0.5"}`}>
                    <div className={`max-w-[70%] overflow-hidden shadow-sm ${isAdmin ? "bg-primary text-black rounded-2xl rounded-bl-sm" : "bg-white/10 text-white rounded-2xl rounded-br-sm"}`}>
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="صورة" className="w-full max-w-[220px] object-cover rounded-t-2xl cursor-pointer" style={{ maxHeight: 180 }} onClick={() => setExpandedImg(msg.imageUrl!)} data-testid={`admin-chat-img-${msg.id}`} />
                      )}
                      {msg.message && (
                        <p className={`px-3.5 py-2 text-sm leading-relaxed break-words ${msg.imageUrl ? "pt-1.5" : ""}`}>{msg.message}</p>
                      )}
                      <div className={`flex items-center gap-1 pb-1.5 px-3 ${isAdmin ? "justify-end" : "justify-start"} ${!msg.message ? "mt-1" : ""}`}>
                        <span className={`text-[10px] ${isAdmin ? "text-black/60" : "text-white/40"}`}>{formatFullTime(msg.createdAt)}</span>
                        {isAdmin && <span className={`text-[10px] ${msg.isRead ? "text-black/60" : "text-black/30"}`}>{msg.isRead ? "✓✓" : "✓"}</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {imagePreview && (
            <div className="shrink-0 px-3 pt-2 border-t border-white/10 bg-black/20">
              <div className="flex items-center gap-2">
                <div className="relative inline-block">
                  <img src={imagePreview} alt="معاينة" className="h-14 w-14 object-cover rounded-lg border border-white/10" />
                  {isUploading && <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg"><Loader2 className="w-4 h-4 text-white animate-spin" /></div>}
                  <button onClick={cancelImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
                </div>
                <span className="text-xs text-muted-foreground">{isUploading ? "جاري الرفع..." : "جاهزة للإرسال"}</span>
              </div>
            </div>
          )}

          <div className="shrink-0 px-3 py-3 border-t border-white/10 bg-black/20 flex items-center gap-2">
            <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
            <button onClick={() => fileRef.current?.click()} className="w-9 h-9 rounded-full bg-white/8 border border-white/10 flex items-center justify-center shrink-0 hover:bg-white/15 transition-colors" data-testid="button-admin-attach-image">
              <Image className="w-4 h-4 text-muted-foreground" />
            </button>
            <input ref={inputRef} type="text" value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="اكتب ردك..." className="flex-1 bg-white/8 border border-white/10 rounded-full px-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground" data-testid="input-admin-support-message" />
            <button onClick={handleSend} disabled={(!message.trim() && !uploadedImageUrl) || sendMutation.isPending || isUploading} className="w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-colors" data-testid="button-send-admin-support">
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-8 h-8 text-primary/60" />
          </div>
          <p className="text-muted-foreground text-sm">اختر محادثة أو ابدأ محادثة جديدة</p>
          <Button size="sm" variant="outline" onClick={() => setNewChatOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            محادثة جديدة
          </Button>
        </div>
      )}

      {/* New Chat Dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              بدء محادثة جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو اليوزرنيم أو الهاتف..."
              value={newChatSearch}
              onChange={e => setNewChatSearch(e.target.value)}
              className="pr-9"
              autoFocus
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {filteredCustomers.slice(0, 30).map(customer => (
              <button
                key={customer.id}
                onClick={() => openCustomerChat(customer)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-right"
                data-testid={`new-chat-customer-${customer.id}`}
              >
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                  {(customer.name || customer.username || "؟")[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{customer.name || customer.username || "—"}</p>
                  <div className="flex items-center gap-2">
                    {customer.username && <span className="text-[10px] text-primary/70">@{customer.username}</span>}
                    {customer.phone && !customer.phone.startsWith("google_") && (
                      <span className="text-[10px] text-muted-foreground">{customer.phone}</span>
                    )}
                  </div>
                </div>
                <User className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              </button>
            ))}
            {filteredCustomers.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">لا توجد نتائج</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {expandedImg && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setExpandedImg(null)}>
          <img src={expandedImg} alt="صورة" className="max-w-full max-h-full rounded-xl object-contain" />
          <button className="absolute top-4 left-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center" onClick={() => setExpandedImg(null)}>
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
