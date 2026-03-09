import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-[#1A1425] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-white">
            BeforeAfter.io
          </Link>
          <nav className="flex items-center gap-4">
            {userId ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm px-4 py-2 rounded-md font-medium text-white transition"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  Dashboard
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm text-gray-300 hover:text-white transition"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="text-sm px-4 py-2 rounded-md font-medium text-white transition"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-[#1A1425] border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} BeforeAfter.io. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
