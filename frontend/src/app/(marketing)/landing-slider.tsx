"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  const [sliding, setSliding] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (index: number, dir: "left" | "right" = "left") => {
      if (sliding) return;
      setDirection(dir);
      setSliding(true);
      setTimeout(() => {
        setActiveIndex((index + slides.length) % slides.length);
        setSliding(false);
      }, 400);
    },
    [sliding]
  );

  const goNext = useCallback(() => {
    goTo(activeIndex + 1, "left");
  }, [activeIndex, goTo]);

  const goPrev = useCallback(() => {
    goTo(activeIndex - 1, "right");
  }, [activeIndex, goTo]);

  // Auto-advance every 3 seconds
  useEffect(() => {
    timerRef.current = setInterval(goNext, 3000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [goNext]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(goNext, 3000);
  }, [goNext]);

  return (
    <div className="relative w-full">
      {/* Category label */}
      <div className="text-center mb-3">
        <span className="inline-block bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full">
          {slides[activeIndex].label}
        </span>
      </div>

      {/* Slider area with arrows on the sides */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Left arrow */}
        <button
          onClick={() => {
            goPrev();
            resetTimer();
          }}
          className="shrink-0 hover:scale-110 transition-transform"
          aria-label="Previous slide"
        >
          <ChevronLeft
            className="w-10 h-10 sm:w-12 sm:h-12 text-gray-500/60 hover:text-gray-300 transition-colors"
            strokeWidth={3}
          />
        </button>

        {/* Slides */}
        <div className="relative overflow-hidden rounded-lg flex-1 min-w-0">
          {slides.map((slide, i) => {
            const isActive = i === activeIndex;
            let animClass = "";
            if (sliding && isActive) {
              animClass =
                direction === "left"
                  ? "animate-slide-out-left"
                  : "animate-slide-out-right";
            }

            return (
              <div
                key={slide.label}
                className={`transition-opacity duration-400 ${animClass}`}
                style={{
                  opacity: isActive ? 1 : 0,
                  position: isActive ? "relative" : "absolute",
                  inset: isActive ? undefined : 0,
                  pointerEvents: isActive ? "auto" : "none",
                }}
              >
                <BeforeAfterSlider
                  beforeImage={slide.beforeImage}
                  afterImage={slide.afterImage}
                  beforeLabel="Before"
                  afterLabel="After"
                />
              </div>
            );
          })}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => {
            goNext();
            resetTimer();
          }}
          className="shrink-0 hover:scale-110 transition-transform"
          aria-label="Next slide"
        >
          <ChevronRight
            className="w-10 h-10 sm:w-12 sm:h-12 text-gray-500/60 hover:text-gray-300 transition-colors"
            strokeWidth={3}
          />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {slides.map((slide, i) => (
          <button
            key={slide.label}
            onClick={() => {
              const dir = i > activeIndex ? "left" : "right";
              goTo(i, dir);
              resetTimer();
            }}
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
