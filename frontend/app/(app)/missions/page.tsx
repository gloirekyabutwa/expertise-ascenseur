"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Mission } from "@/lib/api/types";
import { DataTable } from "@/components/common/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/context/LanguageContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useTenant } from "@/hooks/useTenant";

const STATUS_FR: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    COMPLETED: { label: "Terminée", variant: "default" },
    IN_PROGRESS: { label: "En cours", variant: "secondary" },
    DRAFT: { label: "Brouillon", variant: "outline" },
    CANCELLED: { label: "Annulée", variant: "destructive" },
    PLANNED: { label: "Planifiée", variant: "outline" },
};

const STATUS_EN: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    COMPLETED: { label: "Completed", variant: "default" },
    IN_PROGRESS: { label: "In Progress", variant: "secondary" },
    DRAFT: { label: "Draft", variant: "outline" },
    CANCELLED: { label: "Cancelled", variant: "destructive" },
    PLANNED: { label: "Planned", variant: "outline" },
};

import { useAuth } from "@/hooks/useAuth";

export default function MissionsPage() {
    const { lang } = useLanguage();
    const { user } = useAuth();
    const tenantId = user?.tenant_id;
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [filterServiceType, setFilterServiceType] = useState("ALL");

    const { data: missions, isLoading } = useQuery({
        queryKey: ["missions", tenantId],
        queryFn: async () => {
            const res = await apiClient.get("/missions/");
            return res.data as Mission[];
        },
    });

    const { data: serviceTypes } = useQuery({
        queryKey: ["service-types", tenantId],
        queryFn: async () => {
            const res = await apiClient.get("/service-types/");
            return res.data as { id: string; label: string; code: string }[];
        },
        staleTime: 1000 * 60 * 10,
    });

    const STATUS_MAP = lang === "fr" ? STATUS_FR : STATUS_EN;

    // Deduplicated statuses from data
    const availableStatuses = useMemo(() => {
        if (!missions) return [];
        return [...new Set(missions.map(m => m.status))];
    }, [missions]);

    // Filtered missions
    const filtered = useMemo(() => {
        if (!missions) return [];
        return missions.filter((m) => {
            const searchLower = search.toLowerCase();
            const matchSearch = search === "" ||
                (m.title || "").toLowerCase().includes(searchLower) ||
                (m.certification_number || "").toLowerCase().includes(searchLower) ||
                ((m as any).site?.name || "").toLowerCase().includes(searchLower) ||
                ((m as any).service_type?.label || "").toLowerCase().includes(searchLower);

            const matchStatus = filterStatus === "ALL" || m.status === filterStatus;
            const matchType = filterServiceType === "ALL" || m.service_type_id === filterServiceType;
            return matchSearch && matchStatus && matchType;
        });
    }, [missions, search, filterStatus, filterServiceType]);

    const columns: ColumnDef<Mission>[] = [
        {
            accessorKey: "title",
            header: lang === "fr" ? "Titre / Référence" : "Title / Reference",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-foreground">
                        {row.getValue("title") || (lang === "fr" ? "Sans titre" : "Untitled")}
                    </span>
                    {row.original.certification_number && (
                        <span className="text-xs text-muted-foreground font-mono">
                            {row.original.certification_number}
                        </span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: lang === "fr" ? "Statut" : "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as string;
                const mapped = STATUS_MAP[status] || { label: status, variant: "outline" as const };
                return (
                    <Badge variant={mapped.variant} className={
                        mapped.variant === "default" ? "bg-green-600 hover:bg-green-700" : ""
                    }>
                        {mapped.label}
                    </Badge>
                );
            },
        },
        {
            id: "service_type",
            header: lang === "fr" ? "Type de prestation" : "Service Type",
            cell: ({ row }) => {
                const serviceType = (row.original as any).service_type;
                return (
                    <span className="text-sm">
                        {serviceType?.label || (lang === "fr" ? "Non défini" : "Undefined")}
                    </span>
                );
            },
        },
        {
            accessorKey: "scheduled_start",
            header: lang === "fr" ? "Date prévue" : "Scheduled",
            cell: ({ row }) => {
                const date = row.getValue("scheduled_start") as string;
                if (!date) return <span className="text-muted-foreground">—</span>;
                try {
                    return (
                        <span className="text-sm">
                            {format(new Date(date), lang === "fr" ? "dd MMM yyyy" : "MMM dd, yyyy", {
                                locale: lang === "fr" ? fr : undefined,
                            })}
                        </span>
                    );
                } catch {
                    return <span>—</span>;
                }
            },
        },
        {
            id: "site",
            header: lang === "fr" ? "Site" : "Site",
            cell: ({ row }) => {
                const site = (row.original as any).site;
                return <span className="text-sm text-muted-foreground">{site?.name || "—"}</span>;
            },
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <Link href={`/missions/${row.original.id}`}>
                    <Button variant="ghost" size="sm" className="gap-1 text-primary">
                        {lang === "fr" ? "Dossier" : "Open"}
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                </Link>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {lang === "fr" ? "Missions & Interventions" : "Missions & Interventions"}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {lang === "fr"
                            ? `${missions?.length || 0} mission(s) au total`
                            : `${missions?.length || 0} total mission(s)`}
                    </p>
                </div>
                <Link href="/missions/new">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        {lang === "fr" ? "Nouvelle Mission" : "New Mission"}
                    </Button>
                </Link>
            </div>

            {/* Filters bar */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={lang === "fr" ? "Rechercher par titre, référence..." : "Search by title, reference..."}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[160px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder={lang === "fr" ? "Statut" : "Status"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">{lang === "fr" ? "Tous les statuts" : "All statuses"}</SelectItem>
                        {Object.entries(STATUS_MAP).map(([key, val]) => (
                            <SelectItem key={key} value={key}>{val.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={filterServiceType} onValueChange={setFilterServiceType}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={lang === "fr" ? "Type de prestation" : "Service type"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">{lang === "fr" ? "Tous les types" : "All types"}</SelectItem>
                        {serviceTypes?.map((st) => (
                            <SelectItem key={st.id} value={st.id}>{st.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {(search || filterStatus !== "ALL" || filterServiceType !== "ALL") && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSearch(""); setFilterStatus("ALL"); setFilterServiceType("ALL"); }}
                    >
                        {lang === "fr" ? "Réinitialiser" : "Clear"}
                    </Button>
                )}
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="py-12 text-center text-muted-foreground">
                    {lang === "fr" ? "Chargement des missions..." : "Loading missions..."}
                </div>
            ) : (
                <DataTable columns={columns} data={filtered} />
            )}
        </div>
    );
}
