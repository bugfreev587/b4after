import { LandingSlider } from "./landing-slider";

const FEATURES = [
  {
    title: "Interactive Slider",
    desc: "Drag to compare before and after — works on desktop and mobile.",
    icon: "🎚️",
  },
  {
    title: "One-Click Sharing",
    desc: "Share a public link or embed the slider on any website.",
    icon: "🔗",
  },
  {
    title: "Built-in Analytics",
    desc: "Track views, interactions, and CTA clicks in real time.",
    icon: "📊",
  },
  {
    title: "Custom Branding",
    desc: "Add your logo, colors, and call-to-action to every comparison.",
    icon: "🎨",
  },
  {
    title: "Video Export",
    desc: "Generate comparison videos for social media in seconds.",
    icon: "🎬",
  },
  {
    title: "Gallery Pages",
    desc: "Group comparisons into beautiful gallery pages for your portfolio.",
    icon: "🖼️",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["5 comparisons", "Public pages", "Basic analytics"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$15",
    period: "/month",
    features: [
      "Unlimited comparisons",
      "Video export",
      "Custom branding",
      "Advanced analytics",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$39",
    period: "/month",
    features: [
      "Everything in Pro",
      "Team members",
      "Custom domain",
      "API access",
      "White-label embed",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

const FAQ = [
  {
    q: "What types of businesses use BeforeAfter.io?",
    a: "Beauty salons, fitness trainers, dentists, renovation companies, and any service business that wants to showcase their results.",
  },
  {
    q: "Can I embed comparisons on my website?",
    a: "Yes! Every comparison comes with an embed code you can paste into any website or landing page.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes, you can create up to 5 comparisons for free with no time limit.",
  },
  {
    q: "Can I export videos?",
    a: "Video export is available on the Pro and Business plans. You can generate comparison videos optimized for Instagram, TikTok, and other platforms.",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-white">
            Showcase Your Results with
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-brand)" }}
            >
              Before & After
            </span>{" "}
            Comparisons
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Upload two photos. Get an interactive slider, shareable page, and
            social media video — in seconds.
          </p>
          <div className="flex gap-4 justify-center mb-14">
            <a
              href="/sign-up"
              className="px-6 py-3 rounded-lg text-lg font-medium text-white transition hover:opacity-90"
              style={{ background: "var(--gradient-brand)" }}
            >
              Get Started Free
            </a>
            <a
              href="#how-it-works"
              className="border border-white/10 text-gray-300 px-6 py-3 rounded-lg text-lg font-medium hover:bg-white/5 transition"
            >
              See How It Works
            </a>
          </div>
          <div className="max-w-2xl mx-auto">
            <LandingSlider />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-[#1A1425] px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Upload Photos",
                desc: "Upload your before and after photos. We support JPEG, PNG, and WebP.",
              },
              {
                step: "2",
                title: "Customize",
                desc: "Add labels, descriptions, and a call-to-action button.",
              },
              {
                step: "3",
                title: "Share",
                desc: "Get a shareable link, embed code, or export a video for social media.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div
                  className="w-12 h-12 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  {item.title}
                </h3>
                <p className="text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-white">
            Features
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Everything you need to create, share, and track stunning before &
            after comparisons.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-[#1A1425] border border-white/10 rounded-xl p-6 hover:border-white/20 transition"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2 text-white">
                  {f.title}
                </h3>
                <p className="text-gray-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-[#1A1425] px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4 text-white">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-400 text-center mb-12">
            Start free. Upgrade when you need more.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-8 ${
                  plan.highlighted
                    ? "bg-[#221C2E] ring-2 ring-transparent"
                    : "bg-[#0F0B15] border border-white/10"
                }`}
                style={
                  plan.highlighted
                    ? {
                        background:
                          "linear-gradient(#221C2E, #221C2E) padding-box, var(--gradient-brand) border-box",
                        border: "2px solid transparent",
                        borderRadius: "0.75rem",
                      }
                    : undefined
                }
              >
                {plan.highlighted && (
                  <div
                    className="text-xs font-semibold text-white px-3 py-1 rounded-full w-fit mb-4"
                    style={{ background: "var(--gradient-brand)" }}
                  >
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-white">
                    {plan.price}
                  </span>
                  <span className="text-gray-400">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-gray-300"
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
                <a
                  href="/sign-up"
                  className={`block text-center py-2.5 px-4 rounded-lg font-medium transition ${
                    plan.highlighted
                      ? "text-white hover:opacity-90"
                      : "border border-white/10 text-gray-300 hover:bg-white/5"
                  }`}
                  style={
                    plan.highlighted
                      ? { background: "var(--gradient-brand)" }
                      : undefined
                  }
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="border border-white/10 rounded-xl bg-[#1A1425] group"
              >
                <summary className="px-6 py-4 cursor-pointer font-medium text-white hover:bg-white/5 rounded-xl transition">
                  {item.q}
                </summary>
                <p className="px-6 pb-4 text-gray-400">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
