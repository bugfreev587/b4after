"use client";

import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface User {
  id: string;
  plan: string;
}

const PLANS = [
  {
    name: "Free",
    key: "free",
    price: "$0",
    period: "forever",
    features: ["5 comparisons", "Public pages", "Basic analytics"],
  },
  {
    name: "Pro",
    key: "pro",
    price: "$15",
    period: "/month",
    features: [
      "Unlimited comparisons",
      "Video export",
      "Custom branding",
      "Advanced analytics",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    name: "Business",
    key: "business",
    price: "$39",
    period: "/month",
    features: [
      "Everything in Pro",
      "Team members",
      "Custom domain",
      "API access",
      "White-label embed",
    ],
  },
];

export default function BillingPage() {
  const api = useApiClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    api
      .fetch<User>("/users/me")
      .then(setUser)
      .finally(() => setLoading(false));
  }, [api]);

  const handleCheckout = async (plan: string) => {
    setCheckoutLoading(plan);
    try {
      const { url } = await api.fetch<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      window.location.href = url;
    } catch {
      toast.error("Failed to create checkout session");
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    try {
      const { url } = await api.fetch<{ url: string }>("/billing/portal", {
        method: "POST",
      });
      window.location.href = url;
    } catch {
      toast.error("Failed to open billing portal");
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  const currentPlan = user?.plan || "free";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-1">
            Current plan:{" "}
            <Badge variant="default" className="capitalize">
              {currentPlan}
            </Badge>
          </p>
        </div>
        {currentPlan !== "free" && (
          <Button variant="outline" onClick={handlePortal}>
            Manage Subscription
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          return (
            <Card
              key={plan.key}
              className={
                plan.highlighted
                  ? "ring-2 ring-primary"
                  : ""
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && <Badge>Current</Badge>}
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <svg
                        className="w-4 h-4 text-green-400 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : plan.key === "free" ? (
                  currentPlan !== "free" ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={handlePortal}
                    >
                      Downgrade
                    </Button>
                  ) : null
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleCheckout(plan.key)}
                    disabled={checkoutLoading === plan.key}
                  >
                    {checkoutLoading === plan.key
                      ? "Redirecting..."
                      : currentPlan === "free"
                        ? "Upgrade"
                        : "Switch Plan"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
