import { LandingSlider } from "./landing-slider";
import { PricingSection } from "./pricing-section";

const FEATURES = [
  {
    title: "Interactive Slider",
    desc: "Drag to compare before and after — works on desktop and mobile.",
    tag: "Core",
    tagColor: "blue",
  },
  {
    title: "One-Click Sharing",
    desc: "Share a public link or embed the slider on any website.",
    tag: "Share",
    tagColor: "violet",
  },
  {
    title: "Built-in Analytics",
    desc: "Track views, interactions, and CTA clicks in real time.",
    tag: "Insights",
    tagColor: "emerald",
  },
  {
    title: "Custom Branding",
    desc: "Add your logo, colors, and call-to-action to every comparison.",
    tag: "Pro",
    tagColor: "orange",
  },
  {
    title: "Video Export",
    desc: "Generate comparison videos for social media in seconds.",
    tag: "Pro",
    tagColor: "orange",
  },
  {
    title: "Gallery Pages",
    desc: "Group comparisons into beautiful gallery pages for your portfolio.",
    tag: "Core",
    tagColor: "blue",
  },
];

const TAG_STYLES: Record<string, string> = {
  blue: "bg-blue-500/15 text-blue-200 border border-blue-400/20",
  violet: "bg-violet-500/15 text-violet-200 border border-violet-400/20",
  orange: "bg-orange-500/15 text-orange-200 border border-orange-400/20",
  emerald: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/20",
};

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
    a: "Yes, you can create up to 3 comparisons for free with no time limit.",
  },
  {
    q: "Can I export videos?",
    a: "Video export is available on the Pro and Business plans. You can generate comparison videos optimized for Instagram, TikTok, and other platforms.",
  },
];

const STEPS = [
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
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gray-950 text-white overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff07_1px,transparent_1px),linear-gradient(to_bottom,#ffffff07_1px,transparent_1px)] bg-[size:72px_72px]" />
        {/* Blur glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 pt-20 pb-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 mb-10 text-sm text-gray-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Trusted by service businesses worldwide
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-5">
            Showcase Your Results with{" "}
            <span className="text-blue-400">Before & After</span>{" "}
            Comparisons
          </h1>

          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload two photos. Get an interactive slider, shareable page, and
            social media video — in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-7 py-3.5 text-base font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Get Started Free
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-7 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors"
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
      <section id="how-it-works" className="py-20 sm:py-24 bg-[#0b1220]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-white">
            How It Works
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-xl mx-auto">
            Three simple steps to create stunning visual comparisons.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((item) => (
              <div key={item.step} className="text-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-blue-400 mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-24 bg-[#070d18]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-white">
            Everything You Need
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Create, share, and track stunning before &amp; after comparisons
            with powerful tools built for your business.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/15 bg-white/[0.03] p-7 hover:border-white/30 transition-colors"
              >
                <span
                  className={`inline-block rounded-lg px-2.5 py-0.5 text-xs font-semibold mb-4 ${TAG_STYLES[f.tagColor]}`}
                >
                  {f.tag}
                </span>
                <h3 className="text-lg font-semibold mb-2 text-white">
                  {f.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

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
                <p className="px-6 pb-5 text-gray-400 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 sm:py-32 bg-gray-950 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Ready to showcase your work?
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Join thousands of businesses using BeforeAfter.io to convert more
            clients with visual proof.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-4 text-base font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Get Started Free
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
