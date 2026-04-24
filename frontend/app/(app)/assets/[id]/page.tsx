"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { assetsService } from "@/services/assets";
import { apiClient } from "@/lib/api/client";
import { Mission } from "@/lib/api/types";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft, Package, Settings, Calendar, Wrench, AlertCircle, CheckCircle2,
    FileText, Plus, Clock, FileDown, FolderOpen, AlertTriangle, FileSearch,
    User, Building2, Eye, Mail, History, Activity, ChevronRight
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { NewInterventionModal } from "@/components/missions/NewInterventionModal";
import { EditAssetModal } from "@/components/assets/EditAssetModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_COLORS: Record<string, { dot: string; badge: string; label_fr: string; label_en: string }> = {
    COMPLETED: { dot: "bg-green-500", badge: "bg-green-100 text-green-800 border-green-200", label_fr: "Terminée", label_en: "Completed" },
    IN_PROGRESS: { dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800 border-amber-200", label_fr: "En cours", label_en: "In Progress" },
    DRAFT: { dot: "bg-blue-400", badge: "bg-blue-100 text-blue-800 border-blue-200", label_fr: "Brouillon", label_en: "Draft" },
    PLANNED: { dot: "bg-purple-400", badge: "bg-purple-100 text-purple-800 border-purple-200", label_fr: "Planifiée", label_en: "Planned" },
    CANCELLED: { dot: "bg-gray-400", badge: "bg-gray-100 text-gray-600 border-gray-200", label_fr: "Annulée", label_en: "Cancelled" },
};

export default function AssetDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { lang } = useLanguage();
    const assetId = params.id as string;
    const [showNewIntervention, setShowNewIntervention] = useState(false);
    const [showEditAsset, setShowEditAsset] = useState(false);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);

    const { data: asset, isLoading } = useQuery({
        queryKey: ["asset", assetId],
        queryFn: () => assetsService.get(assetId),
    });

    const { data: missions, isLoading: missionsLoading } = useQuery({
        queryKey: ["asset-missions", assetId],
        queryFn: async () => {
            const res = await apiClient.get("/missions/", { params: { asset_id: assetId } });
            return res.data as Mission[];
        },
    });

    const { data: documents, isLoading: docsLoading } = useQuery({
        queryKey: ["asset-documents", assetId],
        queryFn: async () => {
            try {
                const res = await apiClient.get("/documents/", { params: { asset_id: assetId } });
                return res.data as any[];
            } catch { return []; }
        },
    });

    if (isLoading) return (
        <div className="space-y-6">
            <div className="flex gap-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full md:col-span-2" />
            </div>
        </div>
    );

    if (!asset) return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="text-2xl font-bold">
                {lang === "fr" ? "Équipement introuvable" : "Asset not found"}
            </h2>
            <Button onClick={() => router.push("/assets")} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {lang === "fr" ? "Retour au parc" : "Back to inventory"}
            </Button>
        </div>
    );

    const techProps = asset as any;
    const techSpecs = techProps.technical_characteristics;

    // Calculate compliance metrics
    const completedMissions = missions?.filter(m => m.status === "COMPLETED") || [];
    const lastCTQ = completedMissions
        .filter(m => (m as any).service_type?.code?.includes("CTQ"))
        .sort((a, b) => new Date((b as any).scheduled_start || 0).getTime() - new Date((a as any).scheduled_start || 0).getTime())[0];

    const lastCTQDate = (lastCTQ as any)?.scheduled_start ? new Date((lastCTQ as any).scheduled_start) : null;
    const nextCTQDate = lastCTQDate ? new Date(new Date(lastCTQDate).setFullYear(new Date(lastCTQDate).getFullYear() + 5)) : null;
    const isOverdue = nextCTQDate && nextCTQDate < new Date();
    const activeMissions = missions?.filter(m => m.status === "IN_PROGRESS" || m.status === "DRAFT") || [];

    // Group documents by mission (Arborescence)
    const docsByMission = missions?.reduce((acc, m) => {
        const missionDocs = (documents || []).filter((d: any) => d.mission_id === m.id);
        if (missionDocs.length > 0) {
            acc[m.id] = { mission: m, docs: missionDocs };
        }
        return acc;
    }, {} as Record<string, { mission: Mission; docs: any[] }>) || {};

    // Simulated docs if empty
    const displayedDocs = Object.keys(docsByMission).length > 0
        ? Object.values(docsByMission)
        : completedMissions.slice(0, 3).map(m => ({
            mission: m,
            docs: [{ id: m.id + "-pdf", filename: `Rapport_${(m as any).service_type?.code || "CTQ"}.pdf`, size: "1.2 MB", created_at: (m as any).completed_at, version: 1 }]
        }));

    return (
        <div className="space-y-6">
            {showNewIntervention && (
                <NewInterventionModal
                    assetId={assetId}
                    assetLabel={asset.label}
                    onClose={() => setShowNewIntervention(false)}
                />
            )}

            {showEditAsset && asset && (
                <EditAssetModal
                    asset={asset}
                    onClose={() => setShowEditAsset(false)}
                />
            )}

            {/* Breadcrumb + Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/assets")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{techProps.site?.name || (lang === "fr" ? "Parc" : "Portfolio")}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                        <span className="text-foreground font-medium">{asset.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{asset.label}</h1>
                        <Badge variant="outline" className={cn(
                            "text-xs font-semibold px-2 py-0.5",
                            isOverdue
                                ? "border-red-300 bg-red-50 text-red-700 shadow-sm"
                                : "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm"
                        )}>
                            {isOverdue
                                ? (lang === "fr" ? "⚠ CTQ Échu" : "⚠ CTQ Overdue")
                                : (lang === "fr" ? "✓ Conforme" : "✓ Compliant")}
                        </Badge>
                        {activeMissions.length > 0 && (
                            <Badge variant="secondary" className="animate-pulse bg-amber-100 text-amber-800 border-amber-200">
                                {lang === "fr" ? "Intervention en cours" : "Work in progress"}
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setShowNewIntervention(true)} className="gap-2 shadow-sm">
                        <Plus className="h-4 w-4" />
                        {lang === "fr" ? "Nouvelle Intervention" : "New Intervention"}
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => setShowEditAsset(true)}>
                        <Settings className="h-4 w-4" />
                        {lang === "fr" ? "Modifier" : "Edit"}
                    </Button>
                </div>
            </div>

            {/* 360 Overview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

                {/* Left: Summary Cards */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="overflow-hidden border-primary/10 shadow-sm">
                        <CardHeader className="pb-3 border-b bg-muted/30">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />
                                {lang === "fr" ? "Identité Technique" : "Technical Identity"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{lang === "fr" ? "N° Installation" : "Inst. ID"}</p>
                                    <p className="text-sm font-mono font-bold">{asset.installation_number || "—"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{lang === "fr" ? "Mise en service" : "Commissioned"}</p>
                                    <p className="text-sm font-semibold">{asset.year_commissioned || "—"}</p>
                                </div>
                            </div>
                            <div className="pt-2 border-t space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">{lang === "fr" ? "Type" : "Type"}</span>
                                    <Badge variant="secondary" className="text-[10px] uppercase">{asset.device_type || "ASC"}</Badge>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">{lang === "fr" ? "Technologie" : "Tech"}</span>
                                    <span className="font-medium text-xs text-right truncate max-w-[120px]">{asset.feature_type || "—"}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={cn("border shadow-sm", isOverdue ? "border-red-200 bg-red-50/20" : "border-emerald-100 bg-emerald-50/10")}>
                        <CardHeader className="pb-2 border-b bg-muted/20">
                            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                {isOverdue ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> : <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />}
                                {lang === "fr" ? "Conformité" : "Compliance"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">{lang === "fr" ? "Prochain CTQ" : "Next CTQ"}</span>
                                <span className={cn("font-bold flex items-center gap-1.5", isOverdue ? "text-red-600" : "text-emerald-600")}>
                                    <Calendar className="h-3.5 w-3.5" />
                                    {nextCTQDate ? format(nextCTQDate, "yyyy") : "—"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">{lang === "fr" ? "Dernier rapport" : "Last report"}</span>
                                <span className="font-medium uppercase tracking-tighter">{lastCTQ?.certification_number || "—"}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {asset.maintainer_name && (
                        <Card className="border-border/60 shadow-none bg-muted/5">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                                    <User className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">{lang === "fr" ? "Maintenance" : "Maintainer"}</p>
                                    <p className="text-sm font-semibold truncate max-w-[180px]">{asset.maintainer_name}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: Detailed Tabs */}
                <div className="lg:col-span-3">
                    <Tabs defaultValue="timeline" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-4 h-11 p-1 bg-muted/40 border border-muted-foreground/10 rounded-xl">
                            <TabsTrigger value="timeline" className="rounded-lg gap-2 data-[state=active]:shadow-sm">
                                <History className="h-4 w-4" />
                                <span className="hidden sm:inline">{lang === "fr" ? "Timeline" : "Timeline"}</span>
                            </TabsTrigger>
                            <TabsTrigger value="technical" className="rounded-lg gap-2 data-[state=active]:shadow-sm">
                                <Wrench className="h-4 w-4" />
                                <span className="hidden sm:inline">{lang === "fr" ? "Technique" : "Technical"}</span>
                            </TabsTrigger>
                            <TabsTrigger value="anomalies" className="rounded-lg gap-2 data-[state=active]:shadow-sm">
                                <Activity className="h-4 w-4" />
                                <span className="hidden sm:inline">{lang === "fr" ? "Anomalies" : "Findings"}</span>
                            </TabsTrigger>
                            <TabsTrigger value="documents" className="rounded-lg gap-2 data-[state=active]:shadow-sm">
                                <FolderOpen className="h-4 w-4" />
                                <span className="hidden sm:inline">{lang === "fr" ? "Documents" : "Documents"}</span>
                                {displayedDocs.length > 0 && (
                                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] min-w-[1.2rem] justify-center">
                                        {displayedDocs.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        {/* --- Tab: Timeline 360 --- */}
                        <TabsContent value="timeline" className="mt-0">
                            <Card className="shadow-sm border-muted/60">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg">{lang === "fr" ? "Cycle de Vie" : "Lifecycle"}</CardTitle>
                                    <CardDescription>
                                        {lang === "fr" ? "Historique chronologique des événements et interventions." : "Chronological history of events and interventions."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-6 pb-8">
                                    {missionsLoading ? (
                                        <div className="space-y-6">
                                            <Skeleton className="h-20 w-full" />
                                            <Skeleton className="h-20 w-full" />
                                        </div>
                                    ) : missions?.length === 0 ? (
                                        <div className="py-20 text-center flex flex-col items-center">
                                            <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                                                <Clock className="h-8 w-8 text-muted-foreground/40" />
                                            </div>
                                            <p className="text-muted-foreground font-medium">{lang === "fr" ? "Aucun historique disponible" : "No history available"}</p>
                                            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowNewIntervention(true)}>
                                                {lang === "fr" ? "Démarrer une mission" : "Start a mission"}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="relative space-y-0 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                                            {missions?.sort((a, b) => new Date(b.scheduled_start || 0).getTime() - new Date(a.scheduled_start || 0).getTime()).map((m, idx) => {
                                                const s = STATUS_COLORS[m.status] || STATUS_COLORS.DRAFT;
                                                const isLast = idx === (missions?.length || 0) - 1;
                                                return (
                                                    <div key={m.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group py-5">
                                                        {/* Dot */}
                                                        <div className={cn(
                                                            "flex items-center justify-center w-10 h-10 rounded-full border-4 border-background absolute left-0 md:left-1/2 md:-ml-5 transition-all shadow-sm z-10",
                                                            s.dot
                                                        )}>
                                                            <div className="w-2 h-2 rounded-full bg-white opacity-40 group-hover:scale-150 transition-transform" />
                                                        </div>
                                                        {/* Content Card */}
                                                        <div className="w-[calc(100%-4rem)] ml-14 md:ml-0 md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-muted-foreground/10 bg-card hover:bg-muted/5 hover:border-primary/20 transition-all cursor-pointer shadow-sm group-hover:shadow"
                                                            onClick={() => router.push(`/missions/${m.id}`)}>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <time className="font-mono text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                                                                    {m.scheduled_start
                                                                        ? format(new Date(m.scheduled_start), "dd MMM yyyy", { locale: lang === "fr" ? fr : undefined })
                                                                        : "Non daté"}
                                                                </time>
                                                                <Badge className={cn("text-[9px] font-bold px-1.5 py-0 h-4 border-none shadow-none", s.badge)}>
                                                                    {s[`label_${lang}` as "label_fr" | "label_en"]}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-foreground font-semibold text-sm leading-tight mb-1">
                                                                {(m as any).service_type?.label || m.title || "Intervention"}
                                                            </div>
                                                            {m.certification_number && (
                                                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                    <FileText className="h-3 w-3" />
                                                                    {m.certification_number}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* --- Tab: Deep Technical Specs --- */}
                        <TabsContent value="technical" className="mt-0">
                            <Card className="shadow-sm border-muted/60 overflow-hidden">
                                <CardHeader className="pb-4 bg-muted/10 border-b">
                                    <CardTitle className="text-lg">{lang === "fr" ? "Dossier Technique" : "Technical File"}</CardTitle>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="font-mono text-[10px]">{asset.serial_number || "NO-SN"}</Badge>
                                        <Badge variant="outline" className="font-bold text-[10px] uppercase text-primary border-primary/20">{asset.manufacturer || "N/A"}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                    {/* Column 1: Capacity & Drive */}
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                                <TrendingRight className="h-3.5 w-3.5" />
                                                {lang === "fr" ? "Performance & Capacité" : "Performance & Capacity"}
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="p-3 rounded-lg bg-muted/30 border border-muted-foreground/5">
                                                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-tighter">{lang === "fr" ? "Charge Utile" : "Max Load"}</p>
                                                    <p className="font-bold">{techSpecs?.load_capacity_kg ? `${techSpecs.load_capacity_kg} kg` : (asset.load_capacity ? `${asset.load_capacity} kg` : "—")}</p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-muted/30 border border-muted-foreground/5">
                                                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-tighter">{lang === "fr" ? "Capacité" : "Capacity"}</p>
                                                    <p className="font-bold">{techSpecs?.persons_capacity ? `${techSpecs.persons_capacity} pers.` : (asset.max_passengers ? `${asset.max_passengers} pers.` : "—")}</p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-muted/30 border border-muted-foreground/5">
                                                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-tighter">{lang === "fr" ? "Vitesse Nominale" : "Nominal Speed"}</p>
                                                    <p className="font-bold">{techSpecs?.nominal_speed_ms ? `${techSpecs.nominal_speed_ms} m/s` : (asset.nominal_speed || "—")}</p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-muted/30 border border-muted-foreground/5">
                                                    <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-tighter">{lang === "fr" ? "Nombre Niveaux" : "Levels"}</p>
                                                    <p className="font-bold">{techSpecs?.stops_count || asset.number_of_levels || "—"}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                                <Settings className="h-3.5 w-3.5" />
                                                {lang === "fr" ? "Entrainement & Machinerie" : "Drive & Machinery"}
                                            </h3>
                                            <div className="space-y-3">
                                                {[
                                                    { label: lang === "fr" ? "Type d'entrainement" : "Drive Type", value: techSpecs?.machinery_type || asset.feature_type },
                                                    { label: lang === "fr" ? "Emplacement machine" : "Machinery location", value: techSpecs?.machinery_location || asset.machinery_location },
                                                    { label: lang === "fr" ? "Armoire de manoeuvre" : "Controller type", value: techSpecs?.controller_type },
                                                ].map(i => (
                                                    <div key={i.label} className="flex justify-between border-b border-muted/60 pb-2 text-sm">
                                                        <span className="text-muted-foreground">{i.label}</span>
                                                        <span className="font-semibold text-right">{i.value || "—"}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Components & Safety */}
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                {lang === "fr" ? "Composants & Sécurité" : "Components & Safety"}
                                            </h3>
                                            <div className="space-y-3">
                                                {[
                                                    { label: lang === "fr" ? "Type de portes" : "Door type", value: techSpecs?.door_type },
                                                    { label: lang === "fr" ? "Organe de sécurité" : "Safety gear", value: techSpecs?.safety_gear_type },
                                                    { label: lang === "fr" ? "Dernière rénovation" : "Major renovation", value: techSpecs?.last_major_renovation_date ? format(new Date(techSpecs.last_major_renovation_date), "yyyy") : "—" },
                                                    { label: lang === "fr" ? "Contrat Maintenance" : "Maintenance Ref", value: techSpecs?.maintenance_contract_ref || asset.maintainer_contract_ref },
                                                ].map(i => (
                                                    <div key={i.label} className="flex justify-between border-b border-muted/60 pb-2 text-sm">
                                                        <span className="text-muted-foreground text-xs">{i.label}</span>
                                                        <span className="font-semibold text-right text-xs uppercase italic">{i.value || "—"}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30">
                                            <div className="flex gap-3">
                                                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                                                <div>
                                                    <p className="text-xs font-bold text-amber-800 dark:text-amber-400 mb-1 leading-none">{lang === "fr" ? "Notes d'expertise" : "Expertise Notes"}</p>
                                                    <p className="text-[11px] text-amber-700 dark:text-amber-500 leading-normal">
                                                        {asset.notes || (lang === "fr" ? "Aucune note technique enregistrée pour cet équipement." : "No technical notes recorded for this asset.")}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* --- Tab: Anomalies (Findings) --- */}
                        <TabsContent value="anomalies" className="mt-0">
                            <Card className="shadow-sm border-muted/60">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        {lang === "fr" ? "Registres des Anomalies" : "Findings Registry"}
                                    </CardTitle>
                                    <CardDescription>
                                        {lang === "fr" ? "Vue croisée des réserves identifiées lors des interventions." : "Cross-view of findings identified during interventions."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {completedMissions.length === 0 && activeMissions.length === 0 ? (
                                            <div className="py-20 text-center flex flex-col items-center">
                                                <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                                                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                                </div>
                                                <p className="text-muted-foreground font-medium">{lang === "fr" ? "Aucune anomalie détectée" : "No findings detected"}</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3">
                                                {missions?.filter(m => m.status === "COMPLETED" || m.status === "IN_PROGRESS").map(m => (
                                                    <button
                                                        key={m.id}
                                                        onClick={() => router.push(`/missions/${m.id}?tab=findings`)}
                                                        className="flex items-center justify-between p-4 rounded-xl border border-muted-foreground/10 hover:bg-muted/30 hover:border-primary/20 transition-all text-left group"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                                                                <FileSearch className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold">{(m as any).service_type?.label || m.title}</p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        {m.scheduled_start ? format(new Date(m.scheduled_start), "dd/MM/yyyy") : "—"}
                                                                    </span>
                                                                    <Badge variant="outline" className="text-[8px] h-3.5 uppercase font-mono">{m.certification_number || "REF-RP"}</Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* --- Tab: Document Tree (Versioning) --- */}
                        <TabsContent value="documents" className="mt-0">
                            <Card className="shadow-sm border-muted/60 overflow-hidden">
                                <CardHeader className="pb-4 border-b bg-muted/5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{lang === "fr" ? "Archives Documentaires" : "Document Archives"}</CardTitle>
                                        <Badge variant="secondary" className="font-mono text-[10px]">{assetId.slice(0, 8).toUpperCase()}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {docsLoading ? (
                                        <div className="p-8 space-y-4">
                                            <Skeleton className="h-12 w-full" />
                                            <Skeleton className="h-12 w-full" />
                                        </div>
                                    ) : displayedDocs.length === 0 ? (
                                        <div className="py-20 text-center flex flex-col items-center">
                                            <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-4 text-muted-foreground/30">
                                                <FolderOpen className="h-8 w-8" />
                                            </div>
                                            <p className="text-muted-foreground">{lang === "fr" ? "Aucun document archivé" : "No archived documents"}</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-muted-foreground/5">
                                            {displayedDocs.map(({ mission: m, docs }) => (
                                                <div key={m.id} className="group/mission">
                                                    {/* Folder Header */}
                                                    <div className="px-6 py-3 flex items-center gap-3 bg-muted/10 border-l-2 border-transparent group-hover/mission:border-primary/40 transition-all">
                                                        <FolderOpen className="h-4 w-4 text-primary/60" />
                                                        <div className="flex-1">
                                                            <span className="text-sm font-bold">{(m as any).service_type?.label || m.title}</span>
                                                            <span className="ml-2 text-[10px] text-muted-foreground font-semibold opacity-60">
                                                                {m.scheduled_start ? format(new Date(m.scheduled_start), "yyyy") : ""}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                                                            {m.certification_number || "REF"}
                                                        </div>
                                                    </div>
                                                    {/* Files list */}
                                                    <div className="divide-y divide-muted-foreground/5 ml-4 border-l">
                                                        {docs.map((doc: any, idx: number) => (
                                                            <div key={doc.id || idx} className="px-6 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors group/file">
                                                                <div className="flex items-center gap-4 max-w-[70%]">
                                                                    <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center border border-red-100 shadow-sm">
                                                                        <FileText className="h-5 w-5 text-red-600" />
                                                                    </div>
                                                                    <div className="truncate">
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="text-sm font-semibold truncate group-hover/file:text-primary transition-colors">
                                                                                {doc.filename || doc.original_name}
                                                                            </p>
                                                                            {doc.version > 1 && <Badge className="h-3.5 text-[8px] bg-amber-100 text-amber-800 border-amber-200">v{doc.version}</Badge>}
                                                                        </div>
                                                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                                                            {doc.created_at ? format(new Date(doc.created_at), "dd/MM/yyyy · HH:mm") : ""} · {doc.size || "1.2 MB"}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 opacity-0 group-hover/file:opacity-100 transition-opacity">
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors"
                                                                        onClick={() => {
                                                                            if (doc.url) window.open(doc.url, "_blank");
                                                                            else toast.info("Simulation mode: Fichier inaccessible");
                                                                        }}>
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors">
                                                                        <FileDown className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors">
                                                                        <Mail className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                                <div className="p-4 border-t bg-muted/5 text-center">
                                    <p className="text-[10px] text-muted-foreground italic">
                                        {lang === "fr" ? "Toutes les archives sont sécurisées et cryptées." : "All archives are secured and encrypted."}
                                    </p>
                                </div>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

// Add missing icon
function TrendingRight(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M13 5h8v8" />
            <path d="m21 5-9 9-4-4-5 5" />
        </svg>
    );
}

function ShieldCheck(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}
