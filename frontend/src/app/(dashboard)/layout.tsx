"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#1A1425] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/dashboard" className="text-xl font-bold text-white">
            BeforeAfter.io
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/new"
              className={buttonVariants({ size: "sm" })}
            >
              New Comparison
            </Link>
            <UserButton />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
