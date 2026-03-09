import { useAuth } from "@clerk/nextjs";
import { useCallback, useMemo } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function apiFetch<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || "Something went wrong");
  }

  return res.json();
}

async function apiUpload(
  file: File,
  token: string | null,
): Promise<{ url: string; key: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || "Upload failed");
  }

  return res.json();
}

export function useApiClient() {
  const { getToken } = useAuth();

  const fetchApi = useCallback(
    async <T>(path: string, options: RequestInit = {}): Promise<T> => {
      const token = await getToken();
      return apiFetch<T>(path, token, options);
    },
    [getToken],
  );

  const upload = useCallback(
    async (file: File): Promise<{ url: string; key: string }> => {
      const token = await getToken();
      return apiUpload(file, token);
    },
    [getToken],
  );

  return useMemo(() => ({ fetch: fetchApi, upload }), [fetchApi, upload]);
}

// Standalone client for server components or non-auth contexts (public API calls)
class PublicApiClient {
  async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    return apiFetch<T>(path, null, options);
  }
}

export const api = new PublicApiClient();
