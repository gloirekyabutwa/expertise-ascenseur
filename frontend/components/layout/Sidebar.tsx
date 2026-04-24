"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard, ClipboardList, FolderOpen,
    Building2, Settings, ChevronRight, Shield,
    ChevronLeft, ChevronRight as ChRight
} from "lucide-react";
import { useTenant } from "@/hooks/useTenant";
import { useSidebar } from "@/context/SidebarContext";
import { useLanguage } from "@/context/LanguageContext";
import { TranslationKey } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";

interface NavItem {
    nameKey: TranslationKey;
    descKey: TranslationKey;
    href: string;
    icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
    { nameKey: "nav_dashboard", descKey: "nav_dashboard_desc", href: "/dashboard", icon: LayoutDashboard },
    { nameKey: "nav_missions", descKey: "nav_missions_desc", href: "/missions", icon: ClipboardList },
    { nameKey: "nav_assets", descKey: "nav_assets_desc", href: "/assets", icon: Building2 },
    { nameKey: "nav_documents", descKey: "nav_documents_desc", href: "/documents", icon: FolderOpen },
];

const settingsNavItems: NavItem[] = [
    { nameKey: "nav_settings", descKey: "nav_settings_desc", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { tenantId } = useTenant();
    const { collapsed, toggle } = useSidebar();
    const { t } = useLanguage();
    const { user } = useAuth();

    const { data: tenant, isLoading: tenantLoading } = useQuery<any>({
        queryKey: ["current-tenant", user?.tenant_id],
        queryFn: () => apiClient.get(`/tenants/${user?.tenant_id}`).then(res => res.data),
        enabled: !!user?.tenant_id,
        staleTime: 1000 * 60 * 30, // 30 minutes
    });

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

    const NavLink = ({ item }: { item: NavItem }) => {
        const active = isActive(item.href);
        return (
            <Link href={item.href} title={collapsed ? t(item.nameKey) : undefined}>
                <div className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all duration-150",
                    collapsed ? "justify-center px-2" : "",
                    active
                        ? "bg-primary/10 text-primary border-l-[3px] border-primary font-semibold pl-[calc(0.75rem-3px)]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-[3px] border-transparent"
                )}>
                    <item.icon className={cn(
                        "flex-shrink-0 transition-colors",
                        collapsed ? "h-5 w-5" : "h-4 w-4",
                        active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{t(item.nameKey)}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{t(item.descKey)}</div>
                        </div>
                    )}
                    {!collapsed && active && <ChevronRight className="h-3 w-3 text-primary opacity-70 flex-shrink-0" />}
                </div>
            </Link>
        );
    };

    return (
        <div className={cn(
            "flex flex-col border-r bg-card shadow-sm transition-all duration-300 ease-in-out h-full",
            collapsed ? "w-16" : "w-64"
        )}>
            {/* Logo / Brand */}
            <div className={cn(
                "flex h-16 items-center border-b",
                collapsed ? "justify-center px-2" : "gap-3 px-5"
            )}>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0">
                    <Shield className="h-5 w-5" />
                </div>
                {!collapsed && (
                    <div className="flex flex-col leading-tight min-w-0">
                        <span className="font-bold text-sm text-foreground truncate">CTQ Platform</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Contrôle Technique</span>
                    </div>
                )}
            </div>

            {/* Main Navigation */}
            <div className="flex-1 overflow-auto py-4 px-2">
                {!collapsed && (
                    <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {t("nav_section_main")}
                    </p>
                )}
                <nav className="space-y-0.5">
                    {mainNavItems.map(item => <NavLink key={item.href} item={item} />)}
                </nav>

                {user?.role === "ADMIN" && (
                    <div className="mt-6">
                        {!collapsed && (
                            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                {t("nav_section_admin")}
                            </p>
                        )}
                        <nav className="space-y-0.5">
                            {settingsNavItems.map(item => <NavLink key={item.href} item={item} />)}
                        </nav>
                    </div>
                )}
            </div>

            {/* Footer + Toggle */}
            <div className="border-t px-2 py-3 space-y-2">
                {/* Toggle button */}
                <button
                    onClick={toggle}
                    className="w-full flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title={collapsed ? "Déplier le menu" : "Réduire le menu"}
                >
                    {collapsed
                        ? <ChRight className="h-4 w-4" />
                        : <>
                            <ChevronLeft className="h-4 w-4" />
                            <span>Réduire</span>
                        </>
                    }
                </button>

                {!collapsed && (
                    <div className="flex items-center gap-2 px-2">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-3 w-3 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground">Tenant actif</p>
                            {tenantLoading ? (
                                <Skeleton className="h-3 w-24 mt-1" />
                            ) : (
                                <p className="text-[10px] font-semibold text-foreground truncate" title={tenant?.name}>
                                    {tenant?.name || "—"}
                                </p>
                            )}
                        </div>
                    </div>
                )}
                {!collapsed && (
                    <div className="text-[9px] text-muted-foreground/40 text-right px-2">v2.0 · CTQ</div>
                )}
            </div>
        </div>
    );
}
