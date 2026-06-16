import { useState, useEffect } from "react";
import { useCustomer } from "@/hooks/useCustomer";

const VAPID_PUBLIC_KEY = "BLYi9itrm0JesE_AOtSgapYN-3iV2OxsHQGWZsMLUWgkYNF6xaspThHiTq0oKR1VorWWtPjEDqhuO-dumYldUN4";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function getToken() {
  return localStorage.getItem("customer_token") || sessionStorage.getItem("customer_token");
}

export function usePushNotifications() {
  const { isLoggedIn } = useCustomer();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
    if ("serviceWorker" in navigator && isLoggedIn) {
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);
      }).catch(() => {});
    }
  }, [isLoggedIn]);

  const subscribe = async () => {
    const token = getToken();
    if (!isLoggedIn || !token) return false;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    setIsLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: subJson.keys }),
      });
      setIsSubscribed(true);
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    const token = getToken();
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch {} finally {
      setIsLoading(false);
    }
  };

  const isSupported = typeof window !== "undefined" &&
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe, isSupported };
}
