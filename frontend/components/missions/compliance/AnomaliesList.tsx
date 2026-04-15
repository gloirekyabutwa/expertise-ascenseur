
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { MissionAnomaly, AnomalyCatalogResponse } from "@/types/compliance";
import { complianceService } from "@/services/compliance";
import { Loader2, Plus, Pencil, Trash2, AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ANOMALY_STATUSES, SEVERITY_LEVELS } from "@/constants/elevator-specs";

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
    const s = ANOMALY_STATUSES.find(a => a.value === status);
    const colorMap: Record<string, string> = {
        OPEN: "bg-red-100 text-red-700 border-red-200",
        IN_PROGRESS: "bg-amber-100 text-amber-700 border-amber-200",
        RESOLVED: "bg-green-100 text-green-700 border-green-200",
        WAIVED: "bg-gray-100 text-gray-500 border-gray-200",
    };
    return (
        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${colorMap[status || "OPEN"] || colorMap.OPEN}`}>
            {s?.label || status}
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

    // Form State
    const [formData, setFormData] = useState<Partial<MissionAnomaly>>({
        status: "OPEN",
        custom_description: "",
        comment: ""
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data: Partial<MissionAnomaly>) => complianceService.createAnomaly(missionId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["compliance", missionId] });
            setIsOpen(false);
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<MissionAnomaly> }) =>
            complianceService.updateAnomaly(missionId, id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["compliance", missionId] });
            setIsOpen(false);
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => complianceService.deleteAnomaly(missionId, id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["compliance", missionId] });
        }
    });

    const resetForm = () => {
        setFormData({ status: "OPEN", custom_description: "", comment: "" });
        setEditingAnomaly(null);
    };

    const handleEdit = (anomaly: MissionAnomaly) => {
        setEditingAnomaly(anomaly);
        setFormData({
            catalog_anomaly_id: anomaly.catalog_anomaly_id,
            custom_description: anomaly.custom_description,
            status: anomaly.status,
            comment: anomaly.comment
        });
        setIsOpen(true);
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this anomaly?")) {
            deleteMutation.mutate(id);
        }
    };

    const handleSubmit = () => {
        if (editingAnomaly) {
            updateMutation.mutate({ id: editingAnomaly.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleCatalogSelect = (catalogId: string) => {
        const item = catalog.find(c => c.id === catalogId);
        if (item) {
            setFormData(prev => ({
                ...prev,
                catalog_anomaly_id: catalogId,
                // Optional: prefill description if custom one is empty
                custom_description: prev.custom_description || item.description
            }));
        }
    };

    const isSaving = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{anomalies.length} anomalie(s) enregistrée(s)</span>
                    {anomalies.some(a => a.status === "OPEN") && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
                            {anomalies.filter(a => a.status === "OPEN").length} ouverte(s)
                        </span>
                    )}
                </div>
                <Button onClick={() => { resetForm(); setIsOpen(true); }} className="gap-2" size="sm">
                    <Plus className="h-4 w-4" /> Ajouter une anomalie
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[130px]">Sévérité</TableHead>
                            <TableHead className="w-[130px]">Statut</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {anomalies.map((anomaly) => {
                            const catalogItem = anomaly.catalog_anomaly || catalog.find(c => c.id === anomaly.catalog_anomaly_id);
                            const description = anomaly.custom_description || catalogItem?.description || "No description";
                            const code = anomaly.custom_code || catalogItem?.code;

                            return (
                                <TableRow key={anomaly.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                {code && <Badge variant="outline">{code}</Badge>}
                                                <span className="font-medium">{description}</span>
                                            </div>
                                            {anomaly.comment && (
                                                <span className="text-xs text-muted-foreground mt-1">
                                                    Comment: {anomaly.comment}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <SeverityBadge severity={(anomaly as any).severity} />
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={anomaly.status} />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(anomaly)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(anomaly.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {anomalies.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                    No anomalies recorded.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAnomaly ? "Edit Anomaly" : "New Anomaly"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Standard Anomaly (Optional)</Label>
                            <Select
                                value={formData.catalog_anomaly_id || "custom"}
                                onValueChange={(val) => val === "custom" ?
                                    setFormData(prev => ({ ...prev, catalog_anomaly_id: undefined })) :
                                    handleCatalogSelect(val)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select standard anomaly..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="custom">Custom (None)</SelectItem>
                                    {catalog.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.code} - {c.description.substring(0, 50)}...
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Description</Label>
                            <Textarea
                                value={formData.custom_description || ""}
                                onChange={(e) => setFormData(prev => ({ ...prev, custom_description: e.target.value }))}
                                placeholder="Describe the anomaly..."
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Sévérité</Label>
                            <Select
                                value={(formData as any).severity || "MEDIUM"}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, severity: val }))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {SEVERITY_LEVELS.map(s => (
                                        <SelectItem key={s.value} value={s.value}>
                                            {s.icon} {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Statut</Label>
                            <Select
                                value={formData.status || "OPEN"}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ANOMALY_STATUSES.map(s => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Comment (Internal)</Label>
                            <Input
                                value={formData.comment || ""}
                                onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
