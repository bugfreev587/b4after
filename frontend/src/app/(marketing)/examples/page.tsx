import { Metadata } from "next";
import { BeforeAfterSlider } from "@/components/before-after-slider";

export const metadata: Metadata = {
  title: "Examples | BeforeAfter.io",
  description:
    "See how businesses in beauty, fitness, dental, and renovation use BeforeAfter.io to showcase their results.",
};

const EXAMPLES = [
  {
    title: "Beauty & Skincare",
    description:
      "Show clients the real impact of your treatments — from facials to laser therapy.",
    beforeImage:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' fill='%23334155'%3E%3Crect width='600' height='400'/%3E%3Ctext x='300' y='200' text-anchor='middle' fill='%2394a3b8' font-size='24'%3EBefore Treatment%3C/text%3E%3C/svg%3E",
    afterImage:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' fill='%231e293b'%3E%3Crect width='600' height='400'/%3E%3Ctext x='300' y='200' text-anchor='middle' fill='%2394a3b8' font-size='24'%3EAfter Treatment%3C/text%3E%3C/svg%3E",
    beforeLabel: "Before",
    afterLabel: "After",
  },
  {
    title: "Fitness & Personal Training",
    description:
      "Visualize body transformations to inspire and attract new clients.",
    beforeImage:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' fill='%23334155'%3E%3Crect width='600' height='400'/%3E%3Ctext x='300' y='200' text-anchor='middle' fill='%2394a3b8' font-size='24'%3EDay 1%3C/text%3E%3C/svg%3E",
    afterImage:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' fill='%231e293b'%3E%3Crect width='600' height='400'/%3E%3Ctext x='300' y='200' text-anchor='middle' fill='%2394a3b8' font-size='24'%3E90 Days Later%3C/text%3E%3C/svg%3E",
    beforeLabel: "Day 1",
    afterLabel: "90 Days",
  },
  {
    title: "Dental & Orthodontics",
    description:
      "Show smile transformations for teeth whitening, braces, and cosmetic work.",
    beforeImage:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' fill='%23334155'%3E%3Crect width='600' height='400'/%3E%3Ctext x='300' y='200' text-anchor='middle' fill='%2394a3b8' font-size='24'%3EBefore Whitening%3C/text%3E%3C/svg%3E",
    afterImage:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' fill='%231e293b'%3E%3Crect width='600' height='400'/%3E%3Ctext x='300' y='200' text-anchor='middle' fill='%2394a3b8' font-size='24'%3EAfter Whitening%3C/text%3E%3C/svg%3E",
    beforeLabel: "Before",
    afterLabel: "After",
  },
  {
    title: "Home Renovation",
    description:
      "Showcase remodeling projects — kitchens, bathrooms, full home renovations.",
    beforeImage:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' fill='%23334155'%3E%3Crect width='600' height='400'/%3E%3Ctext x='300' y='200' text-anchor='middle' fill='%2394a3b8' font-size='24'%3EBefore Renovation%3C/text%3E%3C/svg%3E",
    afterImage:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' fill='%231e293b'%3E%3Crect width='600' height='400'/%3E%3Ctext x='300' y='200' text-anchor='middle' fill='%2394a3b8' font-size='24'%3EAfter Renovation%3C/text%3E%3C/svg%3E",
    beforeLabel: "Before",
    afterLabel: "After",
  },
];

export default function ExamplesPage() {
  return (
    <div>
      <section className="py-20 sm:py-24 bg-gray-950 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4">
            Industry Examples
          </h1>
          <p className="text-gray-400 text-center mb-16 text-lg max-w-2xl mx-auto">
            See how businesses across industries use BeforeAfter.io to showcase
            their transformations and win more clients.
          </p>

          <div className="space-y-16">
            {EXAMPLES.map((example) => (
              <div key={example.title}>
                <h2 className="text-2xl font-bold mb-2">{example.title}</h2>
                <p className="text-gray-400 mb-6">{example.description}</p>
                <div className="max-w-2xl">
                  <BeforeAfterSlider
                    beforeImage={example.beforeImage}
                    afterImage={example.afterImage}
                    beforeLabel={example.beforeLabel}
                    afterLabel={example.afterLabel}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-24 bg-[#06090f]">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to showcase your work?
          </h2>
          <p className="text-gray-400 mb-8">
            Create your first before & after comparison in seconds.
          </p>
          <a
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-4 text-base font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Get Started Free
          </a>
        </div>
      </section>
    </div>
  );
}
