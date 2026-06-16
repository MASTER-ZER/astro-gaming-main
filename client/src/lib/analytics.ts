export function trackEvent(eventType: string, target: string, meta?: string) {
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, target, meta }),
    }).catch(() => {});
  } catch {}
}

export function trackPageView(page: string) {
  trackEvent("page_view", page);
}

export function trackGameOpen(slug: string) {
  trackEvent("game_open", slug);
}

export function trackPackageClick(packageName: string, meta?: string) {
  trackEvent("package_click", packageName, meta);
}
