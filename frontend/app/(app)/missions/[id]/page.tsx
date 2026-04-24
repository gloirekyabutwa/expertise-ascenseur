"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Mission } from "@/lib/api/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MissionPdfTab } from "@/components/missions/MissionPdfTab";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MissionComplianceTab } from "@/components/missions/MissionComplianceTab";
import { MissionProvider } from "@/context/MissionContext";

// New specialized components (I will create these file shortly)
import { ChecklistGrid } from "@/components/missions/compliance/ChecklistGrid";
import { AnomaliesList } from "@/components/missions/compliance/AnomaliesList";
import { DocumentsList } from "@/components/missions/compliance/DocumentsList";
import { PhotoManager } from "@/components/missions/compliance/PhotoManager";
import { complianceService } from "@/services/compliance";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useAuth } from "@/hooks/useAuth";

export default function MissionDetailsPage({ params }: { params: { id: string } }) {
    const missionId = params.id;
    const { user } = useAuth();
    const tenantId = user?.tenant_id;

    const { data: mission, isLoading: isMissionLoading, error: missionError } = useQuery({
        queryKey: ["mission", missionId, tenantId],
        queryFn: async () => {
            const res = await apiClient.get<Mission>(`/missions/${missionId}`);
            return res.data;
        },
        enabled: !!missionId && !!tenantId,
    });

    const { data: bundle, isLoading: isBundleLoading, error: bundleError } = useQuery({
        queryKey: ["compliance", missionId, tenantId],
        queryFn: () => complianceService.getBundle(missionId),
        enabled: !!missionId && !!tenantId,
    });

    const { data: catalog } = useQuery({
        queryKey: ["checklist-catalog"],
        queryFn: () => complianceService.getCatalog(),
        staleTime: 1000 * 60 * 60,
    });

    const { data: anomalyCatalog } = useQuery({
        queryKey: ["anomaly-catalog"],
        queryFn: () => complianceService.getAnomalyCatalog(),
        staleTime: 1000 * 60 * 60,
    });

    if (isMissionLoading || isBundleLoading) {
        return (
            <div className="space-y-6 flex flex-col p-8">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-[400px] w-full mt-4" />
            </div>
        );
    }

    if (missionError || bundleError) {
        return (
            <div className="p-8">
                <Alert variant="destructive">
                    <AlertTitle>Erreur de récupération</AlertTitle>
                    <AlertDescription>
                        {((missionError || bundleError) as any)?.message || "Impossible de charger les données de la mission."}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!mission || !bundle) {
        return (
            <div className="p-8 text-center bg-muted/20 rounded-xl border border-dashed py-20">
                <p className="text-muted-foreground font-medium">Données non trouvées</p>
                <p className="text-xs text-muted-foreground mt-2">
                    Vérifiez que vous avez accès à ce tenant ou que la mission n'a pas été supprimée.
                </p>
                <Link href="/missions">
                    <Button variant="outline" className="mt-4">Retour aux missions</Button>
                </Link>
            </div>
        );
    }

    return (
        <MissionProvider>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">{mission.title || "Untitled Mission"}</h1>
                            <Badge variant={mission.status === "COMPLETED" ? "default" : "outline"}>
                                {mission.status}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium text-primary">REF: {mission.certification_number || "PENDING"}</span>
                            <span>•</span>
                            <span>{mission.site?.name}</span>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="checklist" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-muted/50 border">
                        <TabsTrigger value="checklist" className="py-2">Checklist</TabsTrigger>
                        <TabsTrigger value="findings" className="py-2">Anomalies</TabsTrigger>
                        <TabsTrigger value="compliance" className="py-2">Conclusion</TabsTrigger>
                        <TabsTrigger value="documents" className="py-2">Galerie & Pièces</TabsTrigger>
                        <TabsTrigger value="pdf" className="py-2 text-primary font-semibold">Rapport PDF</TabsTrigger>
                    </TabsList>

                    <TabsContent value="checklist">
                        <Card>
                            <CardHeader>
                                <CardTitle>Checklist de Contrôle</CardTitle>
                                <CardDescription>Points de contrôle réglementaires à vérifier sur l'installation.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {catalog ? (
                                    <ChecklistGrid
                                        missionId={missionId}
                                        catalog={catalog}
                                        results={bundle.checklist_results}
                                    />
                                ) : (
                                    <Skeleton className="h-64 w-full" />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="findings">
                        <Card>
                            <CardHeader>
                                <CardTitle>Anomalies & Remarques</CardTitle>
                                <CardDescription>Saisie des non-conformités détectées durant la visite.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {anomalyCatalog ? (
                                    <AnomaliesList
                                        missionId={missionId}
                                        anomalies={bundle.anomalies}
                                        catalog={anomalyCatalog}
                                    />
                                ) : (
                                    <Skeleton className="h-32 w-full" />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="documents">
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Photos de l'Intervention</CardTitle>
                                    <CardDescription>Attachez vos photos aux points de contrôles ou anomalies.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <PhotoManager
                                        missionId={missionId}
                                        checklistOptions={catalog?.flatMap((c: any) =>
                                            c.item_type === "ITEM" ? [{ id: c.id, label: `${c.code} - ${c.label}` }] :
                                                (c.children || []).map((child: any) => ({ id: child.id, label: `${child.code} - ${child.label}` }))
                                        ) || []}
                                        anomalyOptions={bundle.anomalies?.map(a => {
                                            const cat = anomalyCatalog?.find(c => c.id === a.catalog_anomaly_id);
                                            return { id: a.id, label: cat ? `${cat.code} - ${cat.description.substring(0, 30)}...` : a.custom_description?.substring(0, 30) || "Anomalie manuelle" };
                                        }) || []}
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Pièces Jointes (Documents)</CardTitle>
                                    <CardDescription>Rapports précédents, fiches techniques, devis fournis.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <DocumentsList
                                        missionId={missionId}
                                        documents={bundle.documents}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="compliance">
                        <MissionComplianceTab mission={mission} />
                    </TabsContent>

                    <TabsContent value="pdf">
                        <MissionPdfTab mission={mission} />
                    </TabsContent>
                </Tabs>
            </div>
        </MissionProvider>
    );
}
