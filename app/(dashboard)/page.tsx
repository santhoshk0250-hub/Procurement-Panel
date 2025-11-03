import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden"> {/* prevent horizontal gutter on mobile */}
      <Sidebar />
      <main className="pl-0 md:pl-64 transition-[padding]">
        {children}
      </main>
    </div>
  );
}
