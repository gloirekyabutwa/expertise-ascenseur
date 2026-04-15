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
    FileText, Plus, Clock, FileDown, FolderOpen, AlertTriangle,
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
    COMPLETED:   { dot: "bg-green-500",  badge: "bg-green-100 text-green-800 border-green-200",  label_fr: "Terminée",   label_en: "Completed" },
    IN_PROGRESS: { dot: "bg-amber-500",  badge: "bg-amber-100 text-amber-800 border-amber-200",  label_fr: "En cours",   label_en: "In Progress" },
    DRAFT:       { dot: "bg-blue-400",   badge: "bg-blue-100 text-blue-800 border-blue-200",     label_fr: "Brouillon",  label_en: "Draft" },
    PLANNED:     { dot: "bg-purple-400", badge: "bg-purple-100 text-purple-800 border-purple-200", label_fr: "Planifiée", label_en: "Planned" },
    CANCELLED:   { dot: "bg-gray-400",   badge: "bg-gray-100 text-gray-600 border-gray-200",     label_fr: "Annulée",    label_en: "Cancelled" },
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

    // Calculate compliance metrics
    const completedMissions = missions?.filter(m => m.status === "COMPLETED") || [];
    const lastCTQ = completedMissions
        .filter(m => (m as any).service_type?.code?.includes("CTQ"))
        .sort((a, b) => new Date((b as any).scheduled_start || 0).getTime() - new Date((a as any).scheduled_start || 0).getTime())[0];

    const lastCTQDate = (lastCTQ as any)?.scheduled_start ? new Date((lastCTQ as any).scheduled_start) : null;
    const nextCTQDate = lastCTQDate ? new Date(new Date(lastCTQDate).setFullYear(new Date(lastCTQDate).getFullYear() + 5)) : null;
    const isOverdue = nextCTQDate && nextCTQDate < new Date();
    const activeMissions = missions?.filter(m => m.status === "IN_PROGRESS") || [];

    // Group documents by mission
    const docsByMission = missions?.reduce((acc, m) => {
        const missionDocs = (documents || []).filter((d: any) => d.mission_id === m.id);
        if (missionDocs.length > 0) {
            acc[m.id] = { mission: m, docs: missionDocs };
        }
        return acc;
    }, {} as Record<string, { mission: Mission; docs: any[] }>) || {};

    // Simulate versioned docs grouped by mission if no real docs
    const simulatedDocs = completedMissions.slice(0, 5).map(m => ({
        mission: m,
        docs: [{ id: m.id + "-pdf", filename: `Rapport_${(m as any).service_type?.code || "CTQ"}_${m.certification_number || "RP"}.pdf`, size: "1.2 MB", created_at: (m as any).completed_at || (m as any).scheduled_start, version: 1 }]
    }));

    const displayedDocs = Object.keys(docsByMission).length > 0
        ? Object.values(docsByMission)
        : simulatedDocs;

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
                        <span>{techProps.site?.name || lang === "fr" ? "Parc" : "Portfolio"}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                        <span className="text-foreground font-medium">{asset.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{asset.label}</h1>
                        <Badge variant="outline" className={cn(
                            "text-xs",
                            isOverdue
                                ? "border-red-300 bg-red-50 text-red-700"
                                : "border-green-300 bg-green-50 text-green-700"
                        )}>
                            {isOverdue
                                ? (lang === "fr" ? "⚠ CTQ Échu" : "⚠ CTQ Overdue")
                                : (lang === "fr" ? "✓ Conforme" : "✓ Compliant")}
                        </Badge>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setShowNewIntervention(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {lang === "fr" ? "Nouvelle Intervention" : "New Intervention"}
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => setShowEditAsset(true)}>
                        <Settings className="h-4 w-4" />
                        {lang === "fr" ? "Modifier" : "Edit"}
                    </Button>
                </div>
            </div>

            {/* Main layout: Left sidebar (identity) + Right Tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

                {/* ── Left Column (Identity + Status) ─────────────── */}
                <div className="lg:col-span-1 space-y-4">

                    {/* Technical specs card */}
                    <Card>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-primary" />
                                {lang === "fr" ? "Caractéristiques" : "Specifications"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-sm">
                            {[
                                { label: lang === "fr" ? "Marque" : "Brand", value: asset.manufacturer },
                                { label: lang === "fr" ? "Modèle" : "Model", value: asset.model },
                                { label: "N° Installation", value: techProps.installation_number },
                                { label: lang === "fr" ? "Mise en service" : "Commissioned", value: techProps.year_commissioned },
                                { label: lang === "fr" ? "Charge max" : "Max load", value: techProps.load_capacity ? `${techProps.load_capacity} kg` : null },
                                { label: lang === "fr" ? "Vitesse" : "Speed", value: techProps.nominal_speed ? `${techProps.nominal_speed} m/s` : null },
                                { label: lang === "fr" ? "Niveaux" : "Levels", value: techProps.number_of_levels },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between items-start gap-2">
                                    <span className="text-muted-foreground text-xs w-28 flex-shrink-0">{label}</span>
                                    <span className="font-medium text-right text-xs">{value || "—"}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Compliance status card */}
                    <Card className={cn("border", isOverdue ? "border-red-200 bg-red-50/50 dark:bg-red-950/20" : "")}>
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-sm flex items-center gap-2">
                                {isOverdue
                                    ? <AlertTriangle className="h-4 w-4 text-red-500" />
                                    : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                {lang === "fr" ? "Statut réglementaire" : "Compliance Status"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs">{lang === "fr" ? "Dernier CTQ" : "Last CTQ"}</span>
                                <span className="font-medium text-xs">
                                    {lastCTQDate
                                        ? format(lastCTQDate, "dd/MM/yyyy")
                                        : <span className="text-amber-600">{lang === "fr" ? "Inconnu" : "Unknown"}</span>}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs">{lang === "fr" ? "Prochain CTQ" : "Next CTQ"}</span>
                                <span className={cn("font-medium text-xs flex items-center gap-1", isOverdue ? "text-red-600" : "text-green-600")}>
                                    <Calendar className="h-3 w-3" />
                                    {nextCTQDate
                                        ? nextCTQDate.getFullYear()
                                        : <span className="text-amber-600">{lang === "fr" ? "À planifier" : "To schedule"}</span>}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs">{lang === "fr" ? "En cours" : "Active"}</span>
                                <Badge variant="secondary" className={cn(
                                    "text-[10px]",
                                    activeMissions.length > 0 ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"
                                )}>
                                    {activeMissions.length} {lang === "fr" ? "intervention(s)" : "intervention(s)"}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground text-xs">{lang === "fr" ? "Total interventions" : "Total interventions"}</span>
                                <span className="font-semibold text-xs">{missions?.length || 0}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Maintainer */}
                    {techProps.maintainer && (
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">{lang === "fr" ? "Prestataire maintenance" : "Maintenance contractor"}</p>
                                        <p className="text-sm font-medium">{techProps.maintainer}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* ── Right Column (Tabs) ─────────────────────────── */}
                <div className="lg:col-span-3">
                    <Tabs defaultValue="timeline" className="space-y-4">
                        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted/50 border">
                            <TabsTrigger value="timeline" className="py-2 gap-2">
                                <History className="h-4 w-4" />
                                {lang === "fr" ? "Timeline" : "Timeline"}
                                {missions && (
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1">{missions.length}</Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="anomalies" className="py-2 gap-2">
                                <Activity className="h-4 w-4" />
                                {lang === "fr" ? "Anomalies" : "Findings"}
                            </TabsTrigger>
                            <TabsTrigger value="documents" className="py-2 gap-2">
                                <FolderOpen className="h-4 w-4" />
                                {lang === "fr" ? "Documents" : "Documents"}
                            </TabsTrigger>
                        </TabsList>

                        {/* ── Tab: Timeline ── */}
                        <TabsContent value="timeline">
                            <Card>
                                <CardHeader className="border-b">
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-primary" />
                                            {lang === "fr" ? "Historique des Interventions" : "Intervention History"}
                                        </span>
                                    </CardTitle>
                                    <CardDescription>
                                        {lang === "fr"
                                            ? "Toutes les prestations effectuées et planifiées sur cet équipement."
                                            : "All completed and planned services on this equipment."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {missionsLoading ? (
                                        <div className="p-6 space-y-4">
                                            <Skeleton className="h-16 w-full" />
                                            <Skeleton className="h-16 w-full" />
                                        </div>
                                    ) : missions?.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                            <p className="text-sm text-muted-foreground">
                                                {lang === "fr" ? "Aucune intervention enregistrée." : "No interventions recorded yet."}
                                            </p>
                                            <Button className="mt-4 gap-2" size="sm" onClick={() => setShowNewIntervention(true)}>
                                                <Plus className="h-3.5 w-3.5" />
                                                {lang === "fr" ? "Créer la première intervention" : "Create first intervention"}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {missions?.map((m, index) => {
                                                const s = STATUS_COLORS[m.status] || STATUS_COLORS.DRAFT;
                                                const serviceType = (m as any).service_type;
                                                const date = (m as any).scheduled_start;
                                                return (
                                                    <div key={m.id} className="flex gap-4 p-4 hover:bg-muted/30 transition-colors group">
                                                        {/* Timeline dot */}
                                                        <div className="flex flex-col items-center pt-1">
                                                            <div className={`h-3 w-3 rounded-full flex-shrink-0 ${s.dot}`} />
                                                            {index < (missions?.length || 0) - 1 && (
                                                                <div className="w-[1px] flex-1 bg-border mt-1" />
                                                            )}
                                                        </div>
                                                        {/* Content */}
                                                        <div className="flex-1 space-y-1 pb-1">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <p className="font-semibold text-sm">
                                                                        {serviceType?.label || (lang === "fr" ? "Intervention" : "Intervention")}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {date
                                                                            ? format(new Date(date), "dd MMM yyyy", { locale: lang === "fr" ? fr : undefined })
                                                                            : "—"}
                                                                        {m.certification_number && ` · ${m.certification_number}`}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${s.badge}`}>
                                                                        {s[`label_${lang}` as "label_fr" | "label_en"] || m.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="link"
                                                                size="sm"
                                                                className="h-auto p-0 text-xs text-primary/80 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => router.push(`/missions/${m.id}`)}
                                                            >
                                                                {lang === "fr" ? "Ouvrir le dossier" : "Open folder"} →
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ── Tab: Anomalies (cross-missions) ── */}
                        <TabsContent value="anomalies">
                            <Card>
                                <CardHeader className="border-b">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        {lang === "fr" ? "Réserves & Anomalies Ouvertes" : "Open Findings & Anomalies"}
                                    </CardTitle>
                                    <CardDescription>
                                        {lang === "fr"
                                            ? "Toutes les non-conformités actives liées à cet équipement."
                                            : "All active non-conformities linked to this equipment."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {/* Link to individual missions to see anomalies */}
                                    <div className="space-y-3 py-4">
                                        {completedMissions.length === 0 && activeMissions.length === 0 ? (
                                            <div className="py-8 text-center text-muted-foreground text-sm">
                                                <CheckCircle2 className="h-10 w-10 text-green-400/40 mx-auto mb-3" />
                                                <p>{lang === "fr" ? "Aucune anomalie connue." : "No known anomalies."}</p>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-sm text-muted-foreground pb-2">
                                                    {lang === "fr"
                                                        ? "Cliquez sur une mission pour voir ses anomalies détaillées :"
                                                        : "Click a mission to see its detailed anomalies:"}
                                                </p>
                                                {missions?.filter(m => m.status !== "DRAFT").map(m => (
                                                    <div
                                                        key={m.id}
                                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer"
                                                        onClick={() => router.push(`/missions/${m.id}?tab=findings`)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Activity className="h-4 w-4 text-muted-foreground" />
                                                            <div>
                                                                <p className="text-sm font-medium">{(m as any).service_type?.label || "Intervention"}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {(m as any).scheduled_start
                                                                        ? format(new Date((m as any).scheduled_start), "dd/MM/yyyy")
                                                                        : "—"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ── Tab: Documents (versioned) ── */}
                        <TabsContent value="documents">
                            <Card>
                                <CardHeader className="border-b">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <FolderOpen className="h-4 w-4 text-primary" />
                                        {lang === "fr" ? "Arborescence Documentaire" : "Document Tree"}
                                    </CardTitle>
                                    <CardDescription>
                                        {lang === "fr"
                                            ? "Rapports et pièces jointes organisés par intervention, avec versioning."
                                            : "Reports and attachments organized by intervention, with versioning."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {docsLoading || missionsLoading ? (
                                        <div className="p-6 space-y-3">
                                            <Skeleton className="h-16 w-full" />
                                            <Skeleton className="h-16 w-full" />
                                        </div>
                                    ) : displayedDocs.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                                            <p className="text-sm text-muted-foreground">
                                                {lang === "fr" ? "Aucun rapport généré pour cet équipement." : "No reports generated for this equipment."}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {displayedDocs.map(({ mission: m, docs }) => (
                                                <div key={m.id}>
                                                    {/* Mission folder header */}
                                                    <div className="px-4 py-3 bg-muted/20 flex items-center gap-2">
                                                        <FolderOpen className="h-4 w-4 text-primary/60" />
                                                        <div className="flex-1">
                                                            <span className="text-sm font-semibold">
                                                                {(m as any).service_type?.label || "Intervention"}
                                                            </span>
                                                            <span className="ml-2 text-xs text-muted-foreground">
                                                                {(m as any).scheduled_start
                                                                    ? format(new Date((m as any).scheduled_start), "yyyy")
                                                                    : ""}
                                                            </span>
                                                        </div>
                                                        {m.certification_number && (
                                                            <Badge variant="outline" className="text-[10px] font-mono">
                                                                {m.certification_number}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {/* Documents in folder */}
                                                    {docs.map((doc: any, index: number) => (
                                                        <div
                                                            key={doc.id || index}
                                                            className="px-6 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors group"
                                                        >
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <div className="h-8 w-8 rounded bg-red-50 flex items-center justify-center flex-shrink-0">
                                                                    <FileText className="h-4 w-4 text-red-500" />
                                                                </div>
                                                                <div className="truncate">
                                                                    <p className="text-sm font-medium truncate">
                                                                        {doc.filename || doc.original_name || `Rapport ${(m as any).service_type?.code || "CTQ"} v${doc.version || 1}.0`}
                                                                    </p>
                                                                    <p className="text-[10px] text-muted-foreground">
                                                                        {doc.created_at
                                                                            ? format(new Date(doc.created_at), "dd MMM yyyy · HH:mm", { locale: lang === "fr" ? fr : undefined })
                                                                            : ""} · PDF · {doc.size || "—"}
                                                                        {doc.version && doc.version > 1 && (
                                                                            <span className="ml-1 text-amber-600 font-medium">v{doc.version}</span>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Actions helper */}
                                                            {(() => {
                                                                const handleDocAction = async (action: 'view' | 'download' | 'mail') => {
                                                                    if (action === 'mail') {
                                                                        const subject = encodeURIComponent(`${lang === 'fr' ? 'Document' : 'Document'} : ${doc.filename || doc.original_name}`);
                                                                        window.location.href = `mailto:?subject=${subject}`;
                                                                        return;
                                                                    }

                                                                    if (doc.url) {
                                                                        window.open(doc.url, "_blank");
                                                                        return;
                                                                    }

                                                                    // If no URL but has ID, try to get presigned URL from API
                                                                    if (doc.id && !doc.id.includes("-pdf")) {
                                                                        setIsDownloading(doc.id);
                                                                        try {
                                                                            const res = await apiClient.get(`/documents/${doc.id}/url`);
                                                                            if (res.data?.url) {
                                                                                window.open(res.data.url, "_blank");
                                                                            } else {
                                                                                throw new Error("No URL");
                                                                            }
                                                                        } catch (e) {
                                                                            toast.error(lang === 'fr' ? "Impossible de récupérer le fichier" : "Unable to fetch file");
                                                                        } finally {
                                                                            setIsDownloading(null);
                                                                        }
                                                                    } else {
                                                                        toast.info(lang === 'fr' ? "Fichier simulé pour la démo" : "Simulated file for demo");
                                                                    }
                                                                };

                                                                return (
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7"
                                                                            title={lang === "fr" ? "Visualiser" : "View"}
                                                                            disabled={isDownloading === doc.id}
                                                                            onClick={() => handleDocAction('view')}
                                                                        >
                                                                            <Eye className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7"
                                                                            title={lang === "fr" ? "Télécharger" : "Download"}
                                                                            disabled={isDownloading === doc.id}
                                                                            onClick={() => handleDocAction('download')}
                                                                        >
                                                                            <FileDown className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7"
                                                                            title={lang === "fr" ? "Envoyer par mail" : "Send by email"}
                                                                            onClick={() => handleDocAction('mail')}
                                                                        >
                                                                            <Mail className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
