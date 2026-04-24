
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { MissionAnomaly, AnomalyCatalogResponse } from "@/types/compliance";
import { complianceService } from "@/services/compliance";
import { Plus, Pencil, Trash2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_LEVELS } from "@/constants/elevator-specs";
import { AnomalyForm } from "./AnomalyForm";

// Severity badge
const SeverityBadge = ({ severity }: { severity?: string }) => {
    const lvl = SEVERITY_LEVELS.find(s => s.value === severity) || SEVERITY_LEVELS[1];
    const Icon = severity === "CRITICAL" ? AlertCircle : severity === "HIGH" ? AlertTriangle : severity === "LOW" ? Info : AlertTriangle;
    return (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium ${lvl.css}`}>
            <Icon className="h-3 w-3" />{lvl.label}
        </span>
    );
};

// Status badge
const StatusBadge = ({ status }: { status?: string }) => {
    const colorMap: Record<string, string> = {
        OPEN: "bg-red-100 text-red-700 border-red-200",
        IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-200",
        RESOLVED: "bg-green-100 text-green-700 border-green-200",
        WAIVED: "bg-gray-100 text-gray-500 border-gray-200",
    };
    return (
        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${colorMap[status || "OPEN"] || colorMap.OPEN}`}>
            {status}
        </span>
    );
};

interface AnomaliesListProps {
    missionId: string;
    anomalies: MissionAnomaly[];
    catalog: AnomalyCatalogResponse[];
}

export function AnomaliesList({ missionId, anomalies, catalog }: AnomaliesListProps) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [editingAnomaly, setEditingAnomaly] = useState<MissionAnomaly | null>(null);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: Partial<MissionAnomaly>) => complianceService.createAnomaly(missionId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["compliance", missionId] });
            setIsOpen(false);
            setEditingAnomaly(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<MissionAnomaly> }) =>
            complianceService.updateAnomaly(missionId, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["compliance", missionId] });
            setIsOpen(false);
            setEditingAnomaly(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => complianceService.deleteAnomaly(missionId, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["compliance", missionId] });
        }
    });

    const handleEdit = (anomaly: MissionAnomaly) => {
        setEditingAnomaly(anomaly);
        setIsOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm("Voulez-vous vraiment supprimer cette anomalie ?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleSubmit = (formData: Partial<MissionAnomaly>) => {
        if (editingAnomaly) {
            updateMutation.mutate({ id: editingAnomaly.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground font-medium">{anomalies.length} anomalie(s) enregistrée(s)</span>
                    {anomalies.some(a => a.status === "OPEN") && (
                        <span className="text-[10px] uppercase font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200 shadow-sm">
                            {anomalies.filter(a => a.status === "OPEN").length} ouverte(s)
                        </span>
                    )}
                </div>
                <Button onClick={() => { setEditingAnomaly(null); setIsOpen(true); }} className="gap-2 h-9" size="sm">
                    <Plus className="h-4 w-4" /> Ajouter une anomalie
                </Button>
            </div>

            <div className="border rounded-lg overflow-hidden bg-background shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="font-bold text-xs uppercase tracking-wider">Désignation & Code</TableHead>
                            <TableHead className="w-[130px] font-bold text-xs uppercase tracking-wider">Sévérité</TableHead>
                            <TableHead className="w-[130px] font-bold text-xs uppercase tracking-wider">Statut</TableHead>
                            <TableHead className="w-[100px] text-right font-bold text-xs uppercase tracking-wider px-4">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {anomalies.map((anomaly) => {
                            const catalogItem = anomaly.catalog_anomaly || catalog.find(c => c.id === anomaly.catalog_anomaly_id);
                            const description = anomaly.custom_description || catalogItem?.description || "Sans description";
                            const code = anomaly.custom_code || catalogItem?.code;

                            return (
                                <TableRow key={anomaly.id} className="hover:bg-muted/10 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                {code && <Badge variant="secondary" className="font-mono text-[10px] h-5 px-1.5">{code}</Badge>}
                                                <span className="font-semibold text-sm leading-tight">{description}</span>
                                            </div>
                                            {anomaly.comment && (
                                                <span className="text-[10px] text-muted-foreground italic bg-muted/30 w-fit px-1 rounded">
                                                    Note: {anomaly.comment}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <SeverityBadge severity={anomaly.severity} />
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={anomaly.status} />
                                    </TableCell>
                                    <TableCell className="px-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/5" onClick={() => handleEdit(anomaly)}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/5" onClick={() => handleDelete(anomaly.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {anomalies.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">
                                    Aucune anomalie enregistrée pour cette mission.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="bg-primary/5 px-6 pt-6 pb-4">
                        <DialogTitle className="text-xl font-bold">
                            {editingAnomaly ? "Modifier l'Anomalie" : "Nouvelle Anomalie"}
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            {editingAnomaly ? "Mettez à jour les détails du constat." : "Enregistrez une nouvelle non-conformité."}
                        </p>
                    </DialogHeader>
                    <div className="px-6 pb-6">
                        <AnomalyForm
                            initialData={editingAnomaly || undefined}
                            catalog={catalog}
                            onSubmit={handleSubmit}
                            onCancel={() => setIsOpen(false)}
                            isSaving={isSaving}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
