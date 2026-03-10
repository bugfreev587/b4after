"use client";

import { useState } from "react";

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    annualPrice: "$0",
    annualPeriod: "forever",
    features: ["3 comparisons", "Public pages", "Basic analytics"],
    cta: "Get Started",
    href: "/sign-up",
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
      "Advanced analytics",
      "Priority support",
    ],
    cta: "Start Free Trial",
    href: "/sign-up",
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
      "API access",
      "White-label embed",
    ],
    cta: "Contact Sales",
    href: "/sign-up",
    highlighted: false,
  },
];

const FAQ = [
  {
    q: "Can I change plans anytime?",
    a: "Yes, you can upgrade, downgrade, or cancel your plan at any time from the billing page.",
  },
  {
    q: "Is there a free trial?",
    a: "The Free plan lets you try BeforeAfter.io with up to 3 comparisons. No credit card required.",
  },
  {
    q: "What happens when I downgrade?",
    a: "Your existing comparisons remain accessible. You just won't be able to create new ones beyond the plan limit.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes, we offer a 14-day money-back guarantee on all paid plans.",
  },
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div>
      <section className="py-20 sm:py-24 bg-gray-950 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-gray-400 text-center mb-10 text-lg">
            Start free. Upgrade when you need more.
          </p>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <span
              className={`text-sm font-medium ${!isAnnual ? "text-white" : "text-gray-400"}`}
            >
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAnnual ? "bg-blue-600" : "bg-gray-600"}`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${isAnnual ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
            <span
              className={`text-sm font-medium ${isAnnual ? "text-white" : "text-gray-400"}`}
            >
              Annual{" "}
              <span className="text-xs text-emerald-400 font-semibold">
                Save 20%
              </span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PRICING.map((plan) => {
              const displayPrice = isAnnual ? plan.annualPrice : plan.price;
              const displayPeriod = isAnnual ? plan.annualPeriod : plan.period;
              return (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl p-7 transition-shadow ${
                    plan.highlighted
                      ? "border-2 border-blue-500 bg-slate-950/95 shadow-2xl shadow-blue-900/40 ring-1 ring-blue-400/30"
                      : "border border-white/15 bg-white/[0.03] shadow-sm hover:shadow-md hover:border-white/30"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white uppercase tracking-wide shadow-sm">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <div className="mt-4 mb-6">
                    <span className="text-4xl font-bold text-white">
                      {displayPrice}
                    </span>
                    <span className="text-gray-400 ml-1">{displayPeriod}</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-3 text-sm text-slate-300"
                      >
                        <svg
                          className="w-4 h-4 text-emerald-400 shrink-0"
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
                  <a
                    href={plan.href}
                    className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                      plan.highlighted
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                    }`}
                  >
                    {plan.cta}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-24 bg-[#070d18]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-white">
            Frequently Asked Questions
          </h2>
          <div className="divide-y divide-white/10 rounded-2xl border border-white/15 bg-slate-950 overflow-hidden">
            {FAQ.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex w-full items-center justify-between gap-4 bg-slate-950 px-6 py-5 text-left cursor-pointer hover:bg-slate-900 transition-colors font-medium text-white">
                  {item.q}
                  <span className="shrink-0 text-xl text-slate-400 transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-6 pb-5 text-gray-400 leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
