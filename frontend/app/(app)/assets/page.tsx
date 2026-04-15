"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sitesService } from "@/services/sites";
import { assetsService } from "@/services/assets";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Building2, Plus, MapPin, Package, Settings2, ArrowRight, AlertTriangle, CheckCircle2, Clock, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Site, Asset } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { CreateSiteModal } from "@/components/assets/CreateSiteModal";
import { EditSiteModal } from "@/components/assets/EditSiteModal";
import { CreateAssetModal } from "@/components/assets/CreateAssetModal";

// Compute next CTQ deadline & compliance status from missions
function AssetComplianceInfo({ assetId }: { assetId: string }) {
    const { lang } = useLanguage();

    const { data: missions } = useQuery({
        queryKey: ["asset-missions-quick", assetId],
        queryFn: async () => {
            const res = await apiClient.get("/missions/", { params: { asset_id: assetId } });
            return res.data as any[];
        },
        staleTime: 1000 * 60 * 5,
    });

    const { data: anomalies } = useQuery({
        queryKey: ["asset-anomalies-count", assetId],
        queryFn: async () => {
            // get compliance bundle would be expensive per asset, so we approximate from missions
            // We check missions with status COMPLETED and their anomalies count
            return [] as any[];
        },
        staleTime: 1000 * 60 * 5,
    });

    const completedCTQ = missions?.filter(
        m => m.status === "COMPLETED" && (m.service_type?.code?.includes("CTQ") || m.service_type?.code?.includes("CTQ-5"))
    ).sort((a: any, b: any) => new Date(b.scheduled_start || 0).getTime() - new Date(a.scheduled_start || 0).getTime());

    const lastCTQ = completedCTQ?.[0];
    const lastCTQDate = lastCTQ?.scheduled_start ? new Date(lastCTQ.scheduled_start) : null;
    const nextCTQ = lastCTQDate ? new Date(lastCTQDate.setFullYear(lastCTQDate.getFullYear() + 5)) : null;
    const isOverdue = nextCTQ && nextCTQ < new Date();
    const openMissions = missions?.filter(m => m.status === "IN_PROGRESS").length || 0;

    if (!missions) return null;

    return (
        <div className="flex flex-wrap items-center gap-2 mt-2">
            {nextCTQ ? (
                <Badge
                    variant="outline"
                    className={cn(
                        "text-[10px] gap-1",
                        isOverdue
                            ? "border-red-300 bg-red-50 text-red-700"
                            : "border-green-300 bg-green-50 text-green-700"
                    )}
                >
                    {isOverdue
                        ? <AlertTriangle className="h-2.5 w-2.5" />
                        : <CheckCircle2 className="h-2.5 w-2.5" />}
                    CTQ {nextCTQ.getFullYear()}
                </Badge>
            ) : (
                <Badge variant="outline" className="text-[10px] border-gray-300 bg-gray-50 text-gray-600 gap-1">
                    <Calendar className="h-2.5 w-2.5" />
                    {lang === "fr" ? "À planifier" : "To schedule"}
                </Badge>
            )}
            {openMissions > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1 bg-amber-100 text-amber-800">
                    <Clock className="h-2.5 w-2.5" />
                    {openMissions} {lang === "fr" ? "en cours" : "ongoing"}
                </Badge>
            )}
        </div>
    );
}

export default function AssetsPage() {
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
    const [isCreateSiteOpen, setIsCreateSiteOpen] = useState(false);
    const [isEditSiteOpen, setIsEditSiteOpen] = useState(false);
    const [isCreateAssetOpen, setIsCreateAssetOpen] = useState(false);
    const { lang } = useLanguage();
    const { user } = useAuth();

    const { data: sites, isLoading: sitesLoading } = useQuery({
        queryKey: ["sites"],
        queryFn: () => sitesService.list(),
    });

    const { data: assets, isLoading: assetsLoading } = useQuery({
        queryKey: ["assets", selectedSiteId],
        queryFn: () => selectedSiteId ? assetsService.getBySite(selectedSiteId) : Promise.resolve([]),
        enabled: !!selectedSiteId,
    });

    const selectedSite = sites?.find(s => s.id === selectedSiteId);

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-120px)]">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {lang === "fr" ? "Parcs & Équipements" : "Sites & Equipment"}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {lang === "fr"
                            ? "Gérez vos parcs immobiliers et équipements techniques."
                            : "Manage your real estate portfolios and technical equipment."}
                    </p>
                </div>
                {user?.role === "ADMIN" && (
                    <Button className="gap-2" onClick={() => setIsCreateSiteOpen(true)}>
                        <Plus className="h-4 w-4" />
                        {lang === "fr" ? "Nouveau Site" : "New Site"}
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-1 overflow-hidden">
                {/* Sites List (left column) */}
                <Card className="md:col-span-1 flex flex-col overflow-hidden">
                    <CardHeader className="py-4 border-b bg-muted/30">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            {lang === "fr" ? "Sites" : "Sites"}
                        </CardTitle>
                        <CardDescription>{sites?.length || 0} {lang === "fr" ? "site(s) enregistré(s)" : "registered site(s)"}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-auto">
                        {sitesLoading ? (
                            <div className="p-4 space-y-2">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {sites?.map((site) => (
                                    <button
                                        key={site.id}
                                        onClick={() => setSelectedSiteId(site.id)}
                                        className={cn(
                                            "flex flex-col items-start px-4 py-3 text-left border-b hover:bg-muted/50 transition-colors",
                                            selectedSiteId === site.id && "bg-primary/5 border-l-4 border-l-primary"
                                        )}
                                    >
                                        <div className="font-medium truncate w-full">{site.name}</div>
                                        <div className="text-xs text-muted-foreground flex items-center mt-1">
                                            <MapPin className="h-3 w-3 mr-1" />
                                            {site.city || "N/A"}
                                        </div>
                                    </button>
                                ))}
                                {sites?.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground text-sm">
                                        {lang === "fr" ? "Aucun site enregistré." : "No sites found."}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Assets panel (right) */}
                <Card className="md:col-span-3 flex flex-col overflow-hidden">
                    {selectedSite ? (
                        <>
                            <CardHeader className="border-b bg-muted/20">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2">
                                            <Building2 className="h-5 w-5 text-primary" />
                                            {selectedSite.name}
                                        </CardTitle>
                                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {selectedSite.address_line1}, {selectedSite.postal_code} {selectedSite.city}
                                        </div>
                                    </div>
                                    {user?.role === "ADMIN" && (
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsEditSiteOpen(true)}>
                                                <Settings2 className="h-4 w-4" />
                                                {lang === "fr" ? "Modifier le site" : "Edit Site"}
                                            </Button>
                                            <Button size="sm" className="gap-2" onClick={() => setIsCreateAssetOpen(true)}>
                                                <Plus className="h-4 w-4" />
                                                {lang === "fr" ? "Ajouter Équipement" : "Add Equipment"}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 flex-1 overflow-auto">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        {lang === "fr" ? "Équipements" : "Equipment"} ({assets?.length || 0})
                                    </h3>

                                    {assetsLoading ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            <Skeleton className="h-32 w-full" />
                                            <Skeleton className="h-32 w-full" />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {assets?.map((asset) => (
                                                <Card
                                                    key={asset.id}
                                                    className="hover:shadow-md hover:border-primary/30 transition-all group"
                                                >
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start justify-between">
                                                            <div className="space-y-1 flex-1 min-w-0">
                                                                <div className="font-semibold text-base truncate">{asset.label}</div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {asset.manufacturer} {asset.model}
                                                                </div>
                                                                <div>
                                                                    <Badge variant="secondary" className="text-[10px] py-0 font-mono">
                                                                        N° {(asset as any).installation_number || "—"}
                                                                    </Badge>
                                                                </div>
                                                                <AssetComplianceInfo assetId={asset.id} />
                                                            </div>
                                                            <Link
                                                                href={`/assets/${asset.id}`}
                                                                className="ml-3 p-2 hover:bg-primary/10 rounded-full transition-colors group-hover:bg-primary/10"
                                                            >
                                                                <ArrowRight className="h-5 w-5 text-primary" />
                                                            </Link>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                            {assets?.length === 0 && (
                                                <div className="col-span-full py-16 text-center border-2 border-dashed rounded-xl">
                                                    <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                                    <p className="text-sm font-medium">
                                                        {lang === "fr" ? "Aucun équipement sur ce site" : "No equipment on this site"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1 px-4">
                                                        {lang === "fr"
                                                            ? "Cliquez sur \"Ajouter Équipement\" pour commencer."
                                                            : "Click \"Add Equipment\" to start."}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </>
                    ) : (
                        <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-12">
                            <Building2 className="h-16 w-16 text-muted-foreground/20 mb-4" />
                            <h3 className="text-lg font-medium">
                                {lang === "fr" ? "Sélectionnez un site" : "Select a site"}
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-xs mt-1">
                                {lang === "fr"
                                    ? "Choisissez un site dans la liste pour visualiser et gérer ses ascenseurs."
                                    : "Choose a site from the list to view and manage its equipment."}
                            </p>
                        </CardContent>
                    )}
                </Card>
            </div>

            {/* Modals */}
            {isCreateSiteOpen && (
                <CreateSiteModal onClose={() => setIsCreateSiteOpen(false)} />
            )}
            {isEditSiteOpen && selectedSite && (
                <EditSiteModal site={selectedSite} onClose={() => setIsEditSiteOpen(false)} />
            )}
            {isCreateAssetOpen && selectedSiteId && (
                <CreateAssetModal siteId={selectedSiteId} onClose={() => setIsCreateAssetOpen(false)} />
            )}
        </div>
    );
}
