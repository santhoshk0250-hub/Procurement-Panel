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
  FileText,
  UserCog,
} from "lucide-react";

type Item = { label: string; href: string; icon: any; category?: string };
const cn = (...cls: Array<string | false | null | undefined>) => cls.filter(Boolean).join(" ");

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items: Item[] = useMemo(
    () => [
      { label: "Hotels",            href: "/",                           icon: Hotel, category: "Main" },
      { label: "Review",            href: "/dashboard/review",           icon: MessageSquareShare, category: "Management" },
      { label: "Profitability",     href: "/dashboard/profitability",    icon: LineChart, category: "Management" },
      { label: "Coupons",           href: "/dashboard/coupons",          icon: TicketPercent, category: "Management" },
      { label: "Pick & Drop",       href: "/dashboard/pickupdrop",       icon: Route, category: "Travel Services" },
      { label: "Rentals",           href: "/dashboard/rentals",          icon: CarFront, category: "Travel Services" },
      { label: "Sightseeing",       href: "/dashboard/Sightseeing",      icon: Binoculars, category: "Travel Services" },
      { label: "Nightlife",         href: "/dashboard/Nightlife",        icon: Martini, category: "Travel Services" },
      { label: "Activities",        href: "/dashboard/Activities",       icon: Dumbbell, category: "Travel Services" },
      { label: "Leisure-activity",  href: "/dashboard/leisure-activity", icon: Palmtree, category: "Travel Services" },
      { label: "Food Service",      href: "/dashboard/Food-service",     icon: UtensilsCrossed, category: "Travel Services" },
      { label: "Tour Manager",       href: "/dashboard/tour-managers",    icon: UserCog, category: "Travel Services" },
      { label: "About Us",          href: "/dashboard/about-us",         icon: Info, category: "General" },
      { label: "Certifications",    href: "/dashboard/certifications",   icon: FileText, category: "General" },
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

  const NavContent = ({ mobile = false }) => {
    const groupedItems = items.reduce((acc, item) => {
      const category = item.category || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, Item[]>);

    return (
      <nav className={cn("flex flex-col", mobile ? "px-3 py-2" : "px-3 py-2")}>
        {Object.entries(groupedItems).map(([category, categoryItems], categoryIndex) => (
          <div key={category}>
            {categoryIndex > 0 && <div className="border-t border-gray-100 my-2" />}
            <div className="space-y-1">
              {categoryItems.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={item.href !== "/dashboard/about-us" && item.href !== "/dashboard/certifications"}
                    onClick={() => mobile && setOpen(false)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 touch-manipulation",
                      "active:scale-[0.98]",
                      active
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/20"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5 flex-shrink-0 transition-transform",
                      active ? "text-white scale-110" : "text-gray-600 group-hover:text-gray-900 group-hover:scale-105"
                    )} />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {active && <ChevronRight className="h-4 w-4 opacity-70 flex-shrink-0 text-white" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    );
  };

  return (
    <>
      {/* Mobile: hamburger */}
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-md hover:shadow-lg active:shadow-sm transition-all duration-200 active:scale-95 touch-manipulation"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      {/* Desktop: docked sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-[260px] md:border-r md:border-gray-200 md:bg-white md:block md:shadow-xl md:shadow-gray-200 md:flex md:flex-col">
        <div className="px-4 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 shadow-md shadow-blue-500/20 flex-shrink-0">
              <span className="text-base font-bold text-white">T</span>
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-gray-900 truncate">
                TYT ADMIN
              </div>
              <div className="text-xs text-gray-500 hidden lg:block">Management System</div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          <NavContent />
        </div>
      </aside>

      {/* Mobile: off-canvas drawer */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setOpen(false)}
          aria-hidden={!open}
        />
      )}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed top-0 left-0 h-full w-[70%] max-w-[280px] bg-white shadow-xl shadow-gray-200 rounded-r-xl z-50 md:hidden flex flex-col transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 shadow-md shadow-blue-500/20 flex-shrink-0">
              <span className="text-base font-bold text-white">T</span>
            </div>
            <h1 className="text-base font-semibold text-gray-900 truncate">TYT CRM</h1>
          </div>
          <button 
            onClick={() => setOpen(false)} 
            aria-label="Close navigation" 
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation flex-shrink-0 ml-2"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        {/* Mobile Menu - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          <NavContent mobile />
        </div>
      </div>
    </>
  );
}
