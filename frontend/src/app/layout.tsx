import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "BeforeAfter.io",
  description:
    "Create stunning before & after comparisons for your business",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ baseTheme: dark }}>
      <html lang="en" className="dark">
        <body
          className="antialiased"
        >
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
