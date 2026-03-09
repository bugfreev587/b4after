import { LandingSlider } from "./landing-slider";

const FEATURES = [
  {
    title: "Interactive Slider",
    desc: "Drag to compare before and after — works on desktop and mobile.",
  },
  {
    title: "One-Click Sharing",
    desc: "Share a public link or embed the slider on any website.",
  },
  {
    title: "Built-in Analytics",
    desc: "Track views, interactions, and CTA clicks in real time.",
  },
  {
    title: "Custom Branding",
    desc: "Add your logo, colors, and call-to-action to every comparison.",
  },
  {
    title: "Video Export",
    desc: "Generate comparison videos for social media in seconds.",
  },
  {
    title: "Gallery Pages",
    desc: "Group comparisons into beautiful gallery pages for your portfolio.",
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
    price: "$19",
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
    price: "$49",
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
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Showcase Your Results with
            <br />
            <span className="text-blue-600">Before & After</span> Comparisons
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload two photos. Get an interactive slider, shareable page, and
            social media video — in seconds.
          </p>
          <div className="flex gap-4 justify-center mb-12">
            <a
              href="/register"
              className="bg-black text-white px-6 py-3 rounded-lg text-lg font-medium hover:bg-gray-800 transition"
            >
              Get Started Free
            </a>
            <a
              href="#how-it-works"
              className="border px-6 py-3 rounded-lg text-lg font-medium hover:bg-gray-50 transition"
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
      <section id="how-it-works" className="py-20 bg-gray-50 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
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
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-gray-50 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`border rounded-lg p-8 ${
                  plan.highlighted
                    ? "border-blue-600 ring-2 ring-blue-600 bg-white"
                    : "bg-white"
                }`}
              >
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <svg
                        className="w-4 h-4 text-green-500 shrink-0"
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
                  href="/register"
                  className={`block text-center py-2 px-4 rounded-lg font-medium transition ${
                    plan.highlighted
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border hover:bg-gray-50"
                  }`}
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
          <h2 className="text-3xl font-bold text-center mb-12">FAQ</h2>
          <div className="space-y-6">
            {FAQ.map((item) => (
              <details key={item.q} className="border rounded-lg">
                <summary className="px-6 py-4 cursor-pointer font-medium hover:bg-gray-50">
                  {item.q}
                </summary>
                <p className="px-6 pb-4 text-gray-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
