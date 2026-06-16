import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Crown } from "lucide-react";

interface TrustPulseEvent {
  id: string;
  eventType: string;
  gameName: string;
  amount: number;
  description: string;
  createdAt: string;
}

const DEFAULT_EVENTS: TrustPulseEvent[] = [
  { id: "d1", eventType: "broker_completed", gameName: "Free Fire", amount: 2500, description: "تمت وساطة ناجحة لحساب Free Fire بقيمة 2500 جنيه", createdAt: new Date().toISOString() },
  { id: "d2", eventType: "broker_completed", gameName: "PUBG Mobile", amount: 4000, description: "تمت وساطة ناجحة لحساب PUBG Mobile بقيمة 4000 جنيه", createdAt: new Date().toISOString() },
  { id: "d3", eventType: "broker_completed", gameName: "Clash of Clans", amount: 1800, description: "تمت وساطة ناجحة لحساب Clash of Clans بقيمة 1800 جنيه", createdAt: new Date().toISOString() },
];

export default function TrustPulseTicker() {
  const { data: events = [] } = useQuery<TrustPulseEvent[]>({
    queryKey: ["/api/trust-pulse"],
    refetchInterval: 30000,
  });

  const display = events.length > 0 ? events : DEFAULT_EVENTS;
  const tickerRef = useRef<HTMLDivElement>(null);

  if (display.length === 0) return null;

  // Duplicate for infinite scroll
  const items = [...display, ...display, ...display];

  return (
    <div
      dir="rtl"
      className="w-full overflow-hidden py-2 px-0"
      style={{
        background: "linear-gradient(90deg, rgba(2,4,14,0.97) 0%, rgba(5,8,22,0.97) 50%, rgba(2,4,14,0.97) 100%)",
        borderTop: "1px solid rgba(212,175,55,0.1)",
        borderBottom: "1px solid rgba(212,175,55,0.1)",
      }}
    >
      <div
        className="flex items-center gap-0 whitespace-nowrap"
        style={{
          animation: "trustPulseScroll 40s linear infinite",
          willChange: "transform",
        }}
      >
        {items.map((event, i) => (
          <div key={`${event.id}-${i}`} className="inline-flex items-center gap-2 px-6 shrink-0">
            <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.25)" }}>
              <Shield className="w-2.5 h-2.5 text-yellow-400" />
            </span>
            <span className="text-xs text-white/55">
              {event.description}
            </span>
            <span className="text-xs font-black text-yellow-400/60">✓</span>
            <span className="text-white/10 text-xs mx-2">·</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes trustPulseScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}
