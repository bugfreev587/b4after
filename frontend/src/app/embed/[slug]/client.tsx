"use client";

import { BeforeAfterSlider } from "@/components/before-after-slider";

interface Comparison {
  id: string;
  before_image_url: string;
  after_image_url: string;
  before_label: string;
  after_label: string;
}

export function EmbedClient({ comparison: comp }: { comparison: Comparison }) {
  return (
    <div className="w-full">
      <BeforeAfterSlider
        beforeImage={comp.before_image_url}
        afterImage={comp.after_image_url}
        beforeLabel={comp.before_label}
        afterLabel={comp.after_label}
      />
    </div>
  );
}
