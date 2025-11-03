"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/login/forgot_password",
  "/reset-password",
  "/login/registration",
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  const isPublic = useMemo(() => PUBLIC_ROUTES.includes(pathname ?? ""), [pathname]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const hasToken = !!token;

    setAuthed(hasToken);

    if (!hasToken && !isPublic) {
      router.replace("/login");
    } else if (hasToken && isPublic) {
      router.replace("/dashboard/calendar"); // adjust target if needed
    }

    setReady(true);
  }, [router, isPublic, pathname]);

  // While deciding/redirecting, avoid UI flicker
  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  // Public pages (no chrome)
  if (isPublic) {
    return <main className="min-h-screen">{children}</main>;
  }

  // Protected pages (sidebar + topbar)
  if (!authed) return null; // redirect already triggered

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      {/* Off-canvas on mobile, docked on desktop */}
      <Sidebar />

      {/* Content wrapper:
          - No left margin on mobile (so no white space)
          - Reserve 16rem only ≥ md */}
      <div className="md:ml-64 transition-[margin]">
        <Topbar />

        {/* Page content */}
        <main className="px-3 sm:px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
