import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | BeforeAfter.io",
  description:
    "Simple, transparent pricing for BeforeAfter.io. Start free, upgrade when you need more.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
