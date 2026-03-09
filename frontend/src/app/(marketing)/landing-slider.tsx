"use client";

import { BeforeAfterSlider } from "@/components/before-after-slider";

export function LandingSlider() {
  return (
    <BeforeAfterSlider
      beforeImage="/samples/before.svg"
      afterImage="/samples/after.svg"
      beforeLabel="Before"
      afterLabel="After"
    />
  );
}
