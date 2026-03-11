"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useApiClient } from "@/lib/api";
import { TenantProvider, useTenant } from "@/lib/tenant-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/spaces", label: "Spaces" },
  { href: "/dashboard/galleries", label: "Galleries" },
  { href: "/dashboard/branding", label: "Branding" },
];

const MANAGEMENT_LINKS = [
  { href: "/dashboard/reviews", label: "Reviews" },
  { href: "/dashboard/timelines", label: "Timelines" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/calendar", label: "Content" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TenantProvider>
      <DashboardShell>{children}</DashboardShell>
    </TenantProvider>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const api = useApiClient();
  const { tenant, isOwner, plan } = useTenant();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Ensure user record exists in DB on every dashboard visit
  useEffect(() => {
    api
      .fetch("/users/me")
      .catch((err: unknown) =>
        console.error("[dashboard] Failed to sync user:", err),
      );
  }, [api]);

  const allLinks = [...NAV_LINKS, ...MANAGEMENT_LINKS];

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  const planBadgeColor =
    plan === "business"
      ? "bg-amber-500/20 text-amber-400"
      : plan === "pro"
        ? "bg-purple-500/20 text-purple-400"
        : "bg-white/10 text-gray-400";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-[#1A1425]/95 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Logo href="/" size="small" />
            <nav className="hidden lg:flex items-center gap-0.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-1.5 text-sm font-medium transition ${
                    isActive(link.href)
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                  )}
                </Link>
              ))}
              {/* Management dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={`relative px-3 py-1.5 text-sm font-medium transition outline-none ${
                    MANAGEMENT_LINKS.some((l) => isActive(l.href))
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Management
                  {MANAGEMENT_LINKS.some((l) => isActive(l.href)) && (
                    <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {MANAGEMENT_LINKS.map((link) => (
                    <DropdownMenuItem
                      key={link.href}
                      onClick={() => router.push(link.href)}
                    >
                      {link.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/new"
              className={buttonVariants({ size: "sm" })}
            >
              + New
            </Link>

            {/* Avatar dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.imageUrl}
                    alt={user?.fullName ?? "User"}
                  />
                  <AvatarFallback className="bg-white/10 text-white text-xs">
                    {user?.firstName?.[0] ??
                      user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ??
                      "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">
                    {user?.fullName ?? user?.emailAddresses?.[0]?.emailAddress}
                  </p>
                  {tenant && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {tenant.name}
                    </p>
                  )}
                  <Badge
                    variant="secondary"
                    className={`mt-1 text-[10px] capitalize ${planBadgeColor}`}
                  >
                    {plan}
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/dashboard/profile")}
                >
                  Profile
                </DropdownMenuItem>
                {isOwner && (
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard/billing")}
                  >
                    Billing
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => router.push("/dashboard/settings")}
                >
                  Settings
                </DropdownMenuItem>
                {isOwner && plan === "business" && (
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard/members")}
                  >
                    Members
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut(() => router.push("/"))}
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden text-gray-400 hover:text-white p-1"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute left-0 top-0 bottom-0 w-64 bg-[#1A1425] border-r border-white/10 p-4 pt-20 space-y-1">
            {allLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive(link.href)
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
