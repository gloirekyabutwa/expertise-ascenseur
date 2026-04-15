"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useSidebar } from "@/context/SidebarContext";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { collapsed } = useSidebar();

    return (
        <div className="flex min-h-screen w-full bg-background">
            {/* Sidebar — fixed width, collapsible */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-40 transition-all duration-300",
                collapsed ? "w-16" : "w-64"
            )}>
                <Sidebar />
            </div>

            {/* Main content — offset by sidebar width */}
            <div className={cn(
                "flex flex-col flex-1 min-h-screen transition-all duration-300",
                collapsed ? "ml-16" : "ml-64"
            )}>
                <Topbar />
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-8 max-w-[1600px] w-full">
                    {children}
                </main>
            </div>
        </div>
    );
}
