"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Suspense } from "react";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setToken(token).then(() => router.push("/dashboard"));
    } else {
      router.push("/login");
    }
  }, [searchParams, setToken, router]);

  return <p className="text-center text-gray-500">Signing you in...</p>;
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<p className="text-center text-gray-500">Loading...</p>}>
      <CallbackInner />
    </Suspense>
  );
}
