"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BeforeAfterSlider } from "@/components/before-after-slider";

const slides = [
  {
    label: "Renovation",
    beforeImage: "/samples/before.svg",
    afterImage: "/samples/after.svg",
  },
  {
    label: "Nail Art",
    beforeImage: "/samples/nails-before.svg",
    afterImage: "/samples/nails-after.svg",
  },
  {
    label: "Fitness",
    beforeImage: "/samples/fitness-before.svg",
    afterImage: "/samples/fitness-after.svg",
  },
  {
    label: "Teeth Whitening",
    beforeImage: "/samples/teeth-before.svg",
    afterImage: "/samples/teeth-after.svg",
  },
  {
    label: "Makeup",
    beforeImage: "/samples/makeup-before.svg",
    afterImage: "/samples/makeup-after.svg",
  },
];

export function LandingSlider() {
  const [activeIndex, setActiveIndex] = useState(0);

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + slides.length) % slides.length);
  }, []);

  return (
    <div className="relative w-full">
      {/* Category label */}
      <div className="text-center mb-3">
        <span className="inline-block bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full">
          {slides[activeIndex].label}
        </span>
      </div>

      {/* Slider area with arrows */}
      <div className="relative group">
        {/* Left arrow */}
        <button
          onClick={() => goTo(activeIndex - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow-md rounded-full p-1.5 sm:p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
        </button>

        {/* Right arrow */}
        <button
          onClick={() => goTo(activeIndex + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow-md rounded-full p-1.5 sm:p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
        </button>

        {/* Slides */}
        <div className="relative overflow-hidden rounded-lg">
          {slides.map((slide, i) => (
            <div
              key={slide.label}
              className="transition-opacity duration-500"
              style={{
                opacity: i === activeIndex ? 1 : 0,
                position: i === activeIndex ? "relative" : "absolute",
                inset: i === activeIndex ? undefined : 0,
                pointerEvents: i === activeIndex ? "auto" : "none",
              }}
            >
              <BeforeAfterSlider
                beforeImage={slide.beforeImage}
                afterImage={slide.afterImage}
                beforeLabel="Before"
                afterLabel="After"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {slides.map((slide, i) => (
          <button
            key={slide.label}
            onClick={() => setActiveIndex(i)}
            className={`rounded-full transition-all ${
              i === activeIndex
                ? "w-3 h-3 bg-primary"
                : "w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400"
            }`}
            aria-label={`Go to ${slide.label} slide`}
          />
        ))}
      </div>
    </div>
  );
}
