"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useApiClient } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/spaces", label: "Spaces" },
  { href: "/dashboard/galleries", label: "Galleries" },
  { href: "/dashboard/reviews", label: "Reviews" },
  { href: "/dashboard/timelines", label: "Timelines" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/calendar", label: "Content" },
  { href: "/dashboard/branding", label: "Branding" },
  { href: "/dashboard/team", label: "Team" },
  { href: "/dashboard/billing", label: "Billing" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const api = useApiClient();

  // Ensure user record exists in DB on every dashboard visit
  useEffect(() => {
    api
      .fetch("/users/me")
      .catch((err) =>
        console.error("[dashboard] Failed to sync user:", err),
      );
  }, [api]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#1A1425] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Logo href="/" size="small" />
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/new"
              className={buttonVariants({ size: "sm" })}
            >
              New Comparison
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? "User"} />
                  <AvatarFallback className="bg-white/10 text-white text-xs">
                    {user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut(() => router.push("/"))}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
