"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Settings, User, LogOut, ChevronDown } from "lucide-react";

export default function Topbar() {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false); // NEW
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const handleLogout = () => {
    // Show loader immediately
    setSigningOut(true);

    // Clear auth and navigate
    localStorage.removeItem("token");
    localStorage.removeItem("admindata");
    setOpen(false);
    router.push("/login");
  };

  return (
    <>
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Left section */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Overview</h1>
              <p className="text-xs text-gray-500">Welcome back, Aarah</p>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3">
            {/* Profile dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((v) => !v);
                }}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 transition-all hover:shadow-md"
                disabled={signingOut} // prevent interaction while signing out
              >
                <div className="relative">
                  <img
                    src="https://avatars.githubusercontent.com/u/9919?s=200&v=4"
                    alt="Profile"
                    width={32}
                    height={32}
                    className="rounded-lg ring-2 ring-gray-100"
                  />
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white"></div>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-gray-900">Aarah</div>
                  <div className="text-xs text-gray-500">Admin</div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open && (
                <div
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* User info */}
                  <div className="border-b border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-3">
                    <div className="text-xs font-medium text-gray-600">Signed in as</div>
                    <div className="text-sm font-semibold text-gray-900 mt-1">aarah@tyt</div>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 py-2">
                    <button
                      onClick={handleLogout}
                      disabled={signingOut}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        signingOut
                          ? "text-red-500/60 cursor-not-allowed"
                          : "text-red-600 hover:bg-red-50"
                      }`}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{signingOut ? "Signing out..." : "Sign out"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Full-screen loader overlay */}
      {signingOut && (
        <div
          role="status"
          aria-live="assertive"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
        >
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-gray-700">Signing you out…</p>
        </div>
      )}
    </>
  );
}
