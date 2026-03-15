"use client";

import Script from "next/script";

export function ShipproofEmbed() {
  return (
    <>
      <Script src="https://shipproof.io/js/embed.js" strategy="lazyOnload" />
      <iframe
        id="shipproof-landing-page-space-afa275"
        src="https://shipproof.io/embed/landing-page-space-afa275"
        frameBorder="0"
        scrolling="no"
        width="100%"
      />
    </>
  );
}
