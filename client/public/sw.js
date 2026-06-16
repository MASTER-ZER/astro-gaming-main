self.addEventListener("push", function (event) {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: "Astro", body: event.data.text() }; }

  const title = data.title || "Astro";
  const options = {
    body: data.body || "",
    icon: "/favicon.png",
    badge: "/favicon.png",
    dir: "rtl",
    lang: "ar",
    tag: data.tag || "moscow-store",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));
