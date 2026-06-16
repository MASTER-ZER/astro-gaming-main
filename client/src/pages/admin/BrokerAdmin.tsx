import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Crown, Check, X, Loader2, Eye, Send, Shield, ChevronDown, ChevronUp, Users, BarChart3, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { BrokerRequest, BrokerOffer } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b", approved: "#34d399", matched: "#0090ff",
  in_escrow: "#a855f7", delivered: "#34d399", completed: "#34d399",
  cancelled: "#f87171", pending_review: "#f59e0b", accepted: "#34d399",
  rejected: "#f87171",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "⏳ انتظار", approved: "✅ معتمد", matched: "🎯 مطابق", in_escrow: "🔒 ضمان",
  delivered: "📦 مُسلَّم", completed: "🎉 مكتمل", cancelled: "❌ ملغي",
  pending_review: "⏳ مراجعة", accepted: "✅ مقبول", rejected: "❌ مرفوض",
};

function Badge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "#888";
  return (
    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${color}18`, color }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ── Request Detail Expandable ─────────────────────────────────────────────────
function RequestRow({ req, onUpdate, offers }: { req: BrokerRequest & { matchedOffer?: BrokerOffer }; onUpdate: (id: string, data: any) => void; offers: BrokerOffer[] }) {
  const [expanded, setExpanded] = useState(false);
  const [credentials, setCredentials] = useState("");
  const reqOffers = offers.filter(o => o.requestId === req.id);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-white text-sm">{req.gameName}</span>
              <Badge status={req.status} />
            </div>
            <p className="text-xs text-white/40 flex items-center gap-1.5 flex-wrap">
              <span>{req.buyerName}</span>
              <span>·</span>
              <span dir="ltr">{req.buyerPhone}</span>
              {req.buyerPhone && (
                <button
                  onClick={() => { navigator.clipboard.writeText(req.buyerPhone); }}
                  className="w-5 h-5 rounded-md bg-white/8 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/15 transition-all"
                  title="نسخ الرقم"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}
              <span>·</span>
              <span>{req.orderNumber}</span>
            </p>
            <p className="text-xs text-white/30 mt-0.5">
              {req.minPrice?.toLocaleString()} - {req.maxPrice?.toLocaleString()} جنيه ·
              العمولة: مشتري {req.buyerCommission} جنيه / بائع {req.sellerCommission} جنيه
            </p>
          </div>
          <button onClick={() => setExpanded(e => !e)} className="text-white/30 hover:text-white/70 transition-colors">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-sm text-white/60 line-clamp-2 mb-3">{req.description}</p>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {req.status === "pending" && (
            <>
              <button onClick={() => onUpdate(req.id, { status: "approved" })}
                className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}>
                ✅ اعتماد
              </button>
              <button onClick={() => onUpdate(req.id, { status: "cancelled" })}
                className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                ❌ رفض
              </button>
            </>
          )}
          {req.status === "approved" && reqOffers.length > 0 && (
            <button onClick={() => setExpanded(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(0,144,255,0.12)", border: "1px solid rgba(0,144,255,0.25)", color: "#0090ff" }}>
              👁 مراجعة {reqOffers.length} عرض
            </button>
          )}
          {req.status === "in_escrow" && (
            <div className="w-full flex gap-2">
              <input value={credentials} onChange={e => setCredentials(e.target.value)} placeholder="بيانات الحساب للمشتري (إيميل / كلمة السر)" className="input-field flex-1 text-sm" />
              <button
                onClick={() => onUpdate(req.id, { status: "delivered", accountCredentials: credentials })}
                disabled={!credentials}
                className="px-3 py-2 rounded-xl text-xs font-bold shrink-0 disabled:opacity-40"
                style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}>
                تسليم
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded offers */}
      {expanded && reqOffers.length > 0 && (
        <div className="border-t border-white/5 p-4 space-y-3">
          <p className="text-xs font-bold text-white/40 mb-3">العروض المقدمة ({reqOffers.length})</p>
          {reqOffers.map(offer => (
            <OfferCard key={offer.id} offer={offer} req={req} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Offer Card ────────────────────────────────────────────────────────────────
function OfferCard({ offer, req }: { offer: BrokerOffer; req: BrokerRequest }) {
  const { toast } = useToast();
  const [showCreds, setShowCreds] = useState(false);

  const updateOfferMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/admin/broker/offers/${offer.id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/broker/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/broker/requests"] });
      toast({ title: "تم التحديث" });
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const updateRequestMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/admin/broker/requests/${req.id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/broker/requests"] }),
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const acceptOffer = () => {
    // Accept offer + set request to in_escrow + link matchedOfferId
    updateOfferMutation.mutate({ status: "accepted" });
    updateRequestMutation.mutate({ status: "in_escrow", matchedOfferId: offer.id });
  };

  return (
    <div className="p-3 rounded-xl" style={{ background: "rgba(0,144,255,0.05)", border: "1px solid rgba(0,144,255,0.12)" }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
            <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-white">{offer.sellerName}</p>
            <span className="text-white/30">·</span>
            <span className="text-sm text-white/60" dir="ltr">{offer.sellerPhone}</span>
            {offer.sellerPhone && (
              <button
                onClick={() => { navigator.clipboard.writeText(offer.sellerPhone); }}
                className="w-5 h-5 rounded-md flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/10 transition-all"
                title="نسخ الرقم"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
          </div>
          <p className="text-xs text-primary">{offer.sellerPrice?.toLocaleString()} جنيه</p>
        </div>
        <Badge status={offer.status} />
      </div>
      <p className="text-xs text-white/60 mb-2">{offer.accountDescription}</p>

      {/* Account images */}
      {offer.accountImages && offer.accountImages.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2">
          {offer.accountImages.map((img, idx) => (
            <a key={idx} href={img} target="_blank" rel="noopener noreferrer">
              <img src={img} alt={`صورة ${idx + 1}`} className="w-16 h-16 rounded-xl object-cover border border-white/10 hover:border-primary/40 transition-all" />
            </a>
          ))}
        </div>
      )}

      {/* Account details */}
      <div className="flex flex-wrap gap-2 text-[10px] text-white/30 mb-2">
        {offer.accountLevel && <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>ليفل: {offer.accountLevel}</span>}
        {offer.accountRank && <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>رينك: {offer.accountRank}</span>}
        {offer.accountSkins && <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>سكنات: {offer.accountSkins}</span>}
      </div>

      {/* Credentials (admin only) */}
      <button onClick={() => setShowCreds(s => !s)} className="text-[11px] text-purple-400/70 flex items-center gap-1 mb-2">
        <Shield className="w-3 h-3" /> {showCreds ? "إخفاء" : "عرض"} بيانات الربط
      </button>
      {showCreds && (
        <div className="p-2 rounded-lg text-xs font-mono text-white/60 mb-2" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
          <p>النوع: {offer.linkingType === "email" ? "إيميل" : "رقم هاتف"}</p>
          {offer.accountEmail && <p>الإيميل: {offer.accountEmail}</p>}
          {offer.accountPhone && <p>الهاتف: {offer.accountPhone}</p>}
          {offer.accountPassword && <p>الباسوورد: {offer.accountPassword}</p>}
        </div>
      )}

      {/* Actions */}
      {offer.status === "pending_review" && (
        <div className="flex gap-2">
          <button onClick={acceptOffer}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" }}>
            ✅ قبول وبدء الضمان
          </button>
          <button onClick={() => updateOfferMutation.mutate({ status: "rejected" })}
            className="py-1.5 px-3 rounded-lg text-xs font-bold" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
            ❌
          </button>
        </div>
      )}
    </div>
  );
}

// ── Financial Brain Panel ─────────────────────────────────────────────────────
function FinancialBrain() {
  const { data: requests = [] } = useQuery<any[]>({ queryKey: ["/api/admin/broker/requests"] });
  const completedReqs = requests.filter(r => r.status === "completed");
  const totalRevenue = completedReqs.reduce((s, r) => s + r.buyerCommission + r.sellerCommission, 0);
  const totalVolume = completedReqs.reduce((s, r) => s + r.maxPrice, 0);
  const pending = requests.filter(r => r.status === "pending").length;
  const inEscrow = requests.filter(r => r.status === "in_escrow").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "إجمالي العمولات", value: `${totalRevenue?.toLocaleString()} ج`, color: "#34d399" },
          { label: "حجم المعاملات", value: `${totalVolume?.toLocaleString()} ج`, color: "#0090ff" },
          { label: "وساطات مكتملة", value: completedReqs.length, color: "#d4af37" },
          { label: "في الضمان حالياً", value: inEscrow, color: "#a855f7" },
        ].map((card, i) => (
          <div key={i} className="p-4 rounded-2xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-xl font-black" style={{ color: card.color }}>{card.value}</p>
            <p className="text-xs text-white/40 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Top transactions */}
      {completedReqs.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-white/40 mb-3 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> أكبر الصفقات</h3>
          <div className="space-y-2">
            {completedReqs.sort((a, b) => b.maxPrice - a.maxPrice).slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <span className="text-sm font-bold text-white">{r.gameName}</span>
                  <span className="text-xs text-white/30 mr-2">{r.buyerName}</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-primary">{r.maxPrice?.toLocaleString()} جنيه</p>
                  <p className="text-[10px] text-yellow-400/60">عمولة: {(r.buyerCommission + r.sellerCommission)?.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
type Tab = "requests" | "offers" | "financial";

export default function AdminBroker() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("requests");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: requests = [], isLoading: reqLoading } = useQuery<(BrokerRequest & { matchedOffer?: BrokerOffer })[]>({
    queryKey: ["/api/admin/broker/requests"],
  });
  const { data: offers = [], isLoading: offersLoading } = useQuery<BrokerOffer[]>({
    queryKey: ["/api/admin/broker/offers"],
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest(`/api/admin/broker/requests/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/broker/requests"] }); toast({ title: "تم التحديث" }); },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const filteredRequests = statusFilter === "all" ? requests : requests.filter(r => r.status === statusFilter);
  const pendingRequests = requests.filter(r => r.status === "pending").length;
  const pendingOffers = offers.filter(o => o.status === "pending_review").length;

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-6">
      <style>{`.input-field{width:100%;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:white;font-size:14px;outline:none;}`}</style>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.25)" }}>
          <Crown className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-lg font-black text-white">الوسيط الملكي</h1>
          <p className="text-xs text-white/40">
            {pendingRequests > 0 && `${pendingRequests} طلب انتظار · `}
            {pendingOffers > 0 && `${pendingOffers} عرض انتظار`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {([
          { id: "requests", label: `الطلبات (${requests.length})`, badge: pendingRequests },
          { id: "offers", label: `العروض (${offers.length})`, badge: pendingOffers },
          { id: "financial", label: "اللوحة المالية", badge: 0 },
        ] as { id: Tab; label: string; badge: number }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
            style={{
              background: tab === t.id ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.05)",
              border: tab === t.id ? "1px solid rgba(212,175,55,0.35)" : "1px solid rgba(255,255,255,0.08)",
              color: tab === t.id ? "#d4af37" : "rgba(255,255,255,0.4)",
            }}>
            {t.label}
            {t.badge > 0 && <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: "rgba(245,158,11,0.25)", color: "#f59e0b" }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* Requests tab */}
      {tab === "requests" && (
        <>
          {/* Status filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["all", "pending", "approved", "matched", "in_escrow", "delivered", "completed", "cancelled"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: statusFilter === s ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
                  border: statusFilter === s ? "1px solid rgba(212,175,55,0.3)" : "1px solid rgba(255,255,255,0.07)",
                  color: statusFilter === s ? "#d4af37" : "rgba(255,255,255,0.4)",
                }}>
                {s === "all" ? "الكل" : STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>

          {reqLoading ? <div className="text-center py-10"><Loader2 className="w-6 h-6 text-primary/40 animate-spin mx-auto" /></div> : (
            <div className="space-y-3">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-white/30">لا توجد طلبات</div>
              ) : (
                filteredRequests.map(req => (
                  <motion.div key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <RequestRow
                      req={req}
                      offers={offers}
                      onUpdate={(id, data) => updateRequestMutation.mutate({ id, data })}
                    />
                  </motion.div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Offers tab */}
      {tab === "offers" && (
        offersLoading ? <div className="text-center py-10"><Loader2 className="w-6 h-6 text-primary/40 animate-spin mx-auto" /></div> : (
          <div className="space-y-3">
            {offers.length === 0 ? <div className="text-center py-12 text-white/30">لا توجد عروض</div> : (
              offers.map(offer => {
                const req = requests.find(r => r.id === offer.requestId);
                return req ? (
                  <motion.div key={offer.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <OfferCard offer={offer} req={req} />
                  </motion.div>
                ) : null;
              })
            )}
          </div>
        )
      )}

      {/* Financial brain tab */}
      {tab === "financial" && <FinancialBrain />}
    </div>
  );
}
