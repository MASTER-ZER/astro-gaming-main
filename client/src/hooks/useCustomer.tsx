import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface CustomerData {
  id: string;
  phone: string;
  name: string | null;
  username: string | null;
  countryCode: string;
  balance: number;
  loyaltyPoints: number;
}

interface CustomerContextType {
  customer: CustomerData | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (token: string, customer: CustomerData, remember?: boolean) => void;
  logout: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType>({
  customer: null,
  isLoading: true,
  isLoggedIn: false,
  login: () => {},
  logout: async () => {},
  refreshCustomer: async () => {},
});

function getStoredToken(): string | null {
  return localStorage.getItem("customer_token") || sessionStorage.getItem("customer_token");
}

function removeStoredToken() {
  localStorage.removeItem("customer_token");
  sessionStorage.removeItem("customer_token");
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCustomer = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setCustomer(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/customer/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomer(data);
      } else {
        removeStoredToken();
        setCustomer(null);
      }
    } catch {
      setCustomer(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshCustomer();
  }, [refreshCustomer]);

  const login = useCallback((token: string, customerData: CustomerData, remember: boolean = true) => {
    if (remember) {
      localStorage.setItem("customer_token", token);
      sessionStorage.removeItem("customer_token");
    } else {
      sessionStorage.setItem("customer_token", token);
      localStorage.removeItem("customer_token");
    }
    setCustomer(customerData);
  }, []);

  const logout = useCallback(async () => {
    const token = getStoredToken();
    if (token) {
      try {
        await fetch("/api/customer/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    removeStoredToken();
    setCustomer(null);
  }, []);

  return (
    <CustomerContext.Provider
      value={{
        customer,
        isLoading,
        isLoggedIn: !!customer,
        login,
        logout,
        refreshCustomer,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomer() {
  return useContext(CustomerContext);
}

export function customerFetch(path: string, options: RequestInit = {}) {
  const token = getStoredToken();
  return fetch(path, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
