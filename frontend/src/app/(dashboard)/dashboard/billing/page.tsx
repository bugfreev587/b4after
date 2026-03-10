"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useApiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface User {
  id: string;
  plan: string;
}

interface Invoice {
  id: string;
  number: string;
  status: string;
  amount_due: number;
  currency: string;
  created: number;
  pdf_url: string;
}

const PLANS_MONTHLY = [
  {
    name: "Free",
    key: "free",
    price: "$0",
    period: "forever",
    features: ["3 comparisons", "Public pages", "Basic analytics"],
  },
  {
    name: "Pro",
    key: "pro",
    price: "$15",
    period: "/month",
    annualPrice: "$12",
    annualPeriod: "/mo ($144/yr)",
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
    annualPrice: "$32",
    annualPeriod: "/mo ($384/yr)",
    features: [
      "Everything in Pro",
      "Team members",
      "Custom domain",
      "API access",
      "White-label embed",
    ],
  },
];

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusVariant(status: string) {
  switch (status) {
    case "paid":
      return "default" as const;
    case "open":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export default function BillingPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const api = useApiClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const fetchUser = useCallback(() => {
    return api.fetch<User>("/users/me").then(setUser);
  }, [api]);

  const fetchInvoices = useCallback(() => {
    setInvoicesLoading(true);
    api
      .fetch<Invoice[]>("/billing/invoices")
      .then(setInvoices)
      .catch(() => {})
      .finally(() => setInvoicesLoading(false));
  }, [api]);

  useEffect(() => {
    fetchUser().finally(() => setLoading(false));
    fetchInvoices();
  }, [fetchUser, fetchInvoices]);

  // Verify checkout session on redirect from Stripe
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;

    api
      .fetch<{ plan: string }>("/billing/checkout/verify", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId }),
      })
      .then((res) => {
        toast.success(`Upgraded to ${res.plan.charAt(0).toUpperCase() + res.plan.slice(1)}!`);
        fetchUser();
        fetchInvoices();
      })
      .catch(() => {
        toast.error("Failed to verify checkout session");
      })
      .finally(() => {
        router.replace("/dashboard/billing");
      });
  }, [searchParams, api, router, fetchUser, fetchInvoices]);

  const handleCheckout = async (plan: string) => {
    setCheckoutLoading(plan);
    try {
      const { url } = await api.fetch<{ url: string }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          plan,
          interval: isAnnual ? "annual" : "monthly",
        }),
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

      {/* Annual toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <span
          className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}
        >
          Monthly
        </span>
        <button
          onClick={() => setIsAnnual(!isAnnual)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAnnual ? "bg-primary" : "bg-muted"}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${isAnnual ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
        <span
          className={`text-sm font-medium ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}
        >
          Annual{" "}
          <span className="text-xs text-green-500 font-semibold">Save 20%</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS_MONTHLY.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          const displayPrice =
            isAnnual && plan.annualPrice ? plan.annualPrice : plan.price;
          const displayPeriod =
            isAnnual && plan.annualPeriod ? plan.annualPeriod : plan.period;
          return (
            <Card
              key={plan.key}
              className={plan.highlighted ? "ring-2 ring-primary" : ""}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && <Badge>Current</Badge>}
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{displayPrice}</span>
                  <span className="text-muted-foreground">{displayPeriod}</span>
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

      {/* Billing History */}
      <div className="mt-12">
        <h2 className="text-xl font-bold mb-4">Billing History</h2>
        {invoicesLoading ? (
          <p className="text-muted-foreground">Loading invoices...</p>
        ) : invoices.length === 0 ? (
          <p className="text-muted-foreground text-sm">No invoices yet.</p>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{formatDate(inv.created)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {inv.number || "—"}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(inv.amount_due, inv.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(inv.status)} className="capitalize">
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.pdf_url ? (
                        <a
                          href={inv.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          Download
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
