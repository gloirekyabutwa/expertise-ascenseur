
"use client";

import { useQuery } from "@tanstack/react-query";
import { complianceService } from "@/services/compliance";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AttendeesList } from "./compliance/AttendeesList";
import { WorkItemsList } from "./compliance/WorkItemsList";
import { AssetSpecsForm } from "./compliance/AssetSpecsForm";
import { MissionConclusionForm } from "./compliance/MissionConclusionForm";
import { Mission } from "@/lib/api/types";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-2">{title}</h3>
        {children}
    </div>
);

interface MissionComplianceTabProps {
    mission: Mission;
}

export function MissionComplianceTab({ mission }: MissionComplianceTabProps) {
    const missionId = mission.id;

    const { data: bundle, isLoading, error } = useQuery({
        queryKey: ["compliance", missionId],
        queryFn: () => complianceService.getBundle(missionId),
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error || !bundle) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>Impossible de charger les données de conclusion.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-8">
            <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
                {mission.service_type?.code?.includes("CTQ") && (
                    <>
                        <Section title="1. Intervenants & Présence">
                            <AttendeesList missionId={missionId} attendees={bundle.attendees} />
                        </Section>

                        <Section title="2. Travaux & Préconisations">
                            <WorkItemsList missionId={missionId} items={bundle.work_items} />
                        </Section>

                        <Section title="3. Caractéristiques Techniques (Équipement)">
                            {mission.asset ? (
                                <AssetSpecsForm asset={mission.asset} />
                            ) : (
                                <div className="bg-muted p-4 rounded text-sm text-amber-600 border border-amber-200">
                                    Aucun équipement lié à cette mission.
                                </div>
                            )}
                        </Section>

                        <Section title="4. Conclusion & Signature">
                            <MissionConclusionForm mission={mission} />
                        </Section>
                    </>
                )}

                {mission.service_type?.code === "AMO" && (
                    <>
                        <Section title="1. Informations de base (AMO)">
                            <div className="bg-muted/50 p-4 rounded text-sm text-slate-700 border">
                                Mission d'assistance à maîtrise d'ouvrage. 
                                (Module de suivi de chantier spécifique à implémenter)
                            </div>
                        </Section>
                        <Section title="2. Synthèse & Validation AMO">
                            <MissionConclusionForm mission={mission} />
                        </Section>
                    </>
                )}
                
                {(!mission.service_type?.code || (!mission.service_type?.code?.includes("CTQ") && mission.service_type?.code !== "AMO")) && (
                    <>
                        <Section title="Informations Générales">
                             <MissionConclusionForm mission={mission} />
                        </Section>
                    </>
                )}
            </div>
        </div>
    );
}
