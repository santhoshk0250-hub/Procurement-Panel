"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Hotel,
  MessageSquareShare,
  LineChart,
  TicketPercent,
  Route,
  CarFront,
  Binoculars,
  Martini,
  Dumbbell,
  Palmtree,
  UtensilsCrossed,
  Menu,
  X,
  ChevronRight,
  Info,
} from "lucide-react";

type Item = { label: string; href: string; icon: any };
const cn = (...cls: Array<string | false | null | undefined>) => cls.filter(Boolean).join(" ");

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items: Item[] = useMemo(
    () => [
      { label: "Hotels",            href: "/",                           icon: Hotel },
      { label: "Review",            href: "/dashboard/review",           icon: MessageSquareShare },
      { label: "Profitability",     href: "/dashboard/profitability",    icon: LineChart },
      { label: "Coupons",           href: "/dashboard/coupons",          icon: TicketPercent },
      { label: "Pick & Drop",       href: "/dashboard/pickupdrop",       icon: Route },
      { label: "Rentals",           href: "/dashboard/rentals",          icon: CarFront },
      { label: "Sightseeing",       href: "/dashboard/Sightseeing",      icon: Binoculars },
      { label: "Nightlife",         href: "/dashboard/Nightlife",        icon: Martini },
      { label: "Activities",        href: "/dashboard/Activities",       icon: Dumbbell },
      { label: "Leisure-activity",  href: "/dashboard/leisure-activity", icon: Palmtree },
      { label: "Food Service",      href: "/dashboard/Food-service",     icon: UtensilsCrossed },
      { label: "About Us",          href: "/dashboard/about-us",         icon: Info },
    ],
    []
  );

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.classList.toggle("overflow-hidden", open);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  const NavContent = ({ mobile = false }) => (
    <nav className={cn("flex flex-col gap-1", mobile ? "px-3 mt-6" : "px-4 mt-8")}>
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
              active
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <Icon className={cn("h-5 w-5 transition-transform", active ? "scale-110" : "group-hover:scale-105")} />
            <span className="flex-1 text-left">{item.label}</span>
            {active && <ChevronRight className="h-4 w-4 opacity-70" />}
            {active && <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-white" />}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile: hamburger */}
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 inline-flex h-12 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
      >
        <Menu className="h-6 w-6 text-gray-700" />
      </button>

      {/* Desktop: docked sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-65 md:border-r md:border-gray-200 md:bg-gradient-to-b md:from-gray-50 md:to-white md:block md:shadow-xl">
        <div className="px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/30">
              <span className="text-lg font-bold text-white">T</span>
            </div>
            <div>
              <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                TYT ADMIN
              </div>
              <div className="text-xs text-gray-500">Management System</div>
            </div>
          </div>
        </div>
        <NavContent />
      </aside>

      {/* Mobile: off-canvas drawer */}
      <div className={cn("fixed inset-0 z-50 md:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
        <div onClick={() => setOpen(false)} className={cn("absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} />
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "absolute left-0 top-0 h-full w-80 bg-white shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between px-6 py-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/30">
                <span className="text-lg font-bold text-white">T</span>
              </div>
              <div>
                <div className="text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  TYT CRM
                </div>
                <div className="text-xs text-gray-500">Management System</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close navigation" className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <NavContent mobile />
        </div>
      </div>
    </>
  );
}
