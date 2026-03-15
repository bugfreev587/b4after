"use client";

import Script from "next/script";

export function ShipproofWallEmbed() {
  return (
    <>
      <Script src="https://shipproof.io/js/embed.js" strategy="lazyOnload" />
      <iframe
        id="shipproof-wall-first-wall-e9e4d4"
        src="https://shipproof.io/embed-wall/first-wall-e9e4d4"
        frameBorder="0"
        scrolling="no"
        width="100%"
      />
    </>
  );
}
