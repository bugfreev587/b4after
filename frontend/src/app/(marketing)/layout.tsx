import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  return (
    <div className="min-h-screen flex flex-col bg-[#06090f] text-slate-100">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between h-14">
          <Logo href={userId ? "/dashboard" : "/"} size="small" />
          <nav className="flex items-center gap-4">
            <Link
              href="/#features"
              className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/examples"
              className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Examples
            </Link>
            {userId ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Dashboard
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 pt-14">{children}</main>
      <footer className="border-t border-white/10 bg-[#04070d] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link href="/#features" className="hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/examples" className="hover:text-white transition-colors">
                    Examples
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <span className="hover:text-white transition-colors cursor-default">
                    Privacy Policy
                  </span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors cursor-default">
                    Terms of Service
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} BeforeAfter.io. All rights
            reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
