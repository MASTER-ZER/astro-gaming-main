import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      const url = new URL(res.url, window.location.origin);
      const isAdminRoute = url.pathname.startsWith("/api/admin") || url.pathname.startsWith("/api/orders") || url.pathname.startsWith("/api/games") || url.pathname.startsWith("/api/packages") || url.pathname.startsWith("/api/payment") || url.pathname.startsWith("/api/notifications");
      if (isAdminRoute && localStorage.getItem("admin_token")) {
        // Token expired or server restarted — clear and redirect to login
        localStorage.removeItem("admin_token");
        if (window.location.pathname.startsWith("/admin")) {
          window.location.href = "/admin";
        }
      }
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getAuthHeaders(url?: string): Record<string, string> {
  const adminToken = localStorage.getItem("admin_token");
  const customerToken = localStorage.getItem("customer_token") || sessionStorage.getItem("customer_token");

  // Admin-only routes: always use admin token
  if (url && url.startsWith("/api/admin")) {
    if (adminToken) return { Authorization: `Bearer ${adminToken}` };
    return {};
  }

  // Customer-specific routes: always use customer token (never admin token)
  const customerRoutes = [
    "/api/customer/",
    "/api/account-orders",
    "/api/wallet/",
    "/api/push/",
    "/api/support",
    "/api/virtual-numbers/",
    "/api/sardarb/order",
    "/api/sardarb/my-orders",
    "/api/broker/requests",
    "/api/broker/my-requests",
    "/api/broker/my-offers",
    "/api/broker/offers",
    "/api/community/posts/",
  ];
  if (url && customerRoutes.some(r => url.startsWith(r))) {
    if (customerToken) return { Authorization: `Bearer ${customerToken}` };
    return {};
  }

  // General: prefer admin token if it exists, otherwise use customer token
  if (adminToken) return { Authorization: `Bearer ${adminToken}` };
  if (customerToken) return { Authorization: `Bearer ${customerToken}` };
  return {};
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(url),
  };
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const json = await res.json();
    // Return a proxy-like object that has both the JSON data and a .json() method
    // This ensures backward compatibility with code that calls .json() on the result
    return Object.assign(Object.create({ json: () => Promise.resolve(json) }), json);
  }
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const rest = queryKey.slice(1);
    const fullUrl = rest.length > 0 ? `${url}/${rest.join("/")}` : url;

    const res = await fetch(fullUrl, {
      credentials: "include",
      headers: getAuthHeaders(url),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
