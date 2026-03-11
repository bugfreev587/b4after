"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useApiClient } from "@/lib/api";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  owner_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface TenantContextValue {
  tenant: Tenant | null;
  loading: boolean;
  isOwner: boolean;
  plan: string;
  refetch: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  loading: true,
  isOwner: false,
  plan: "free",
  refetch: async () => {},
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const api = useApiClient();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const t = await api.fetch<Tenant>("/tenant");
      setTenant(t);
    } catch {
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        loading,
        isOwner: tenant?.role === "owner",
        plan: tenant?.plan || "free",
        refetch,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
