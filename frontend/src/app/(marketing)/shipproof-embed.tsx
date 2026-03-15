"use client";

import { useEffect } from "react";

export function ShipproofEmbed() {
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data && e.data.type === "shipproof-resize") {
        const iframe = document.querySelector<HTMLIFrameElement>(
          'iframe[src*="landing-page-space-afa275"]'
        );
        if (iframe) {
          iframe.style.height = e.data.height + "px";
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <iframe
      src="https://shipproof.io/embed/landing-page-space-afa275"
      width="100%"
      frameBorder="0"
      style={{ border: "none", overflow: "hidden" }}
      scrolling="no"
    />
  );
}
