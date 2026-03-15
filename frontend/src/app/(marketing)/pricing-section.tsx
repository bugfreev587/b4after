"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    annualPrice: "$0",
    annualPeriod: "forever",
    features: ["3 comparisons", "Public pages", "Gallery pages", "Basic analytics"],
    cta: "Get Started",
    ctaSignedIn: "Current Plan",
    plan: "free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$15",
    period: "/month",
    annualPrice: "$12",
    annualPeriod: "/mo ($144/yr)",
    features: [
      "Unlimited comparisons",
      "Video export",
      "Custom branding",
      "Spaces & client uploads",
      "Advanced analytics",
      "Priority support",
    ],
    cta: "Start 14-Day Free Trial",
    ctaSignedIn: "Start 14-Day Free Trial",
    plan: "pro",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$39",
    period: "/month",
    annualPrice: "$32",
    annualPeriod: "/mo ($384/yr)",
    features: [
      "Everything in Pro",
      "Team members",
      "Custom domain",
      "Reviews & timelines",
      "Content calendar",
      "White-label embed",
    ],
    cta: "Start 14-Day Free Trial",
    ctaSignedIn: "Start 14-Day Free Trial",
    plan: "business",
    highlighted: false,
  },
];

export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { isSignedIn, getToken } = useAuth();
  const router = useRouter();

  async function handleCheckout(plan: string) {
    if (!isSignedIn) {
      router.push("/sign-up");
      return;
    }

    if (plan === "free") {
      router.push("/dashboard");
      return;
    }

    setLoading(plan);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan, interval: isAnnual ? "annual" : "monthly" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch {
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-gray-900">
          Simple, Transparent Pricing
        </h2>
        <p className="text-gray-500 text-center mb-8">
          Start free. Upgrade when you need more.
        </p>

        {/* Annual toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span
            className={`text-sm font-medium ${!isAnnual ? "text-gray-900" : "text-gray-400"}`}
          >
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAnnual ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${isAnnual ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
          <span
            className={`text-sm font-medium ${isAnnual ? "text-gray-900" : "text-gray-400"}`}
          >
            Annual{" "}
            <span className="text-xs text-emerald-600 font-semibold">
              Save 20%
            </span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PRICING.map((plan) => {
            const displayPrice = isAnnual ? plan.annualPrice : plan.price;
            const displayPeriod = isAnnual ? plan.annualPeriod : plan.period;
            const buttonText = isSignedIn ? plan.ctaSignedIn : plan.cta;
            const isLoading = loading === plan.plan;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-7 transition-shadow ${
                  plan.highlighted
                    ? "border-2 border-blue-500 bg-blue-50 shadow-2xl shadow-blue-200/40 ring-1 ring-blue-200/50"
                    : "border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white uppercase tracking-wide shadow-sm">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    {displayPrice}
                  </span>
                  <span className="text-gray-500 ml-1">{displayPeriod}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-3 text-sm text-gray-600"
                    >
                      <svg
                        className="w-4 h-4 text-emerald-500 shrink-0"
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
                <button
                  onClick={() => handleCheckout(plan.plan)}
                  disabled={isLoading}
                  className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors disabled:opacity-50 ${
                    plan.highlighted
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border border-gray-300 bg-gray-50 text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {isLoading ? "Redirecting..." : buttonText}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
