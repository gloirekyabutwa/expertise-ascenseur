"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { MissionAnomaly, AnomalyCatalogResponse } from "@/types/compliance";
import { ANOMALY_STATUSES, SEVERITY_LEVELS } from "@/constants/elevator-specs";
import { Loader2 } from "lucide-react";

interface AnomalyFormProps {
    initialData?: Partial<MissionAnomaly>;
    catalog: AnomalyCatalogResponse[];
    onSubmit: (data: Partial<MissionAnomaly>) => void;
    onCancel: () => void;
    isSaving: boolean;
    prefilledItem?: { id: string; code: string; label: string }; // Context from checklist
}

export function AnomalyForm({ initialData, catalog, onSubmit, onCancel, isSaving, prefilledItem }: AnomalyFormProps) {
    const [formData, setFormData] = useState<Partial<MissionAnomaly>>({
        status: "OPEN",
        severity: "MEDIUM",
        custom_description: "",
        comment: "",
        catalog_item_id: prefilledItem?.id,
        ...initialData
    });

    // Filter catalog based on prefilledItem context (if we have a mapping logic)
    // For now, we'll just show the full catalog but allow searching
    const suggestedAnomalies = useMemo(() => {
        if (!prefilledItem) return catalog;
        // In a real scenario, we might want to filter by category
        // For now, we just show all but we could prioritize
        return catalog;
    }, [catalog, prefilledItem]);

    const handleCatalogSelect = (catalogId: string) => {
        if (catalogId === "custom") {
            setFormData(prev => ({ ...prev, catalog_anomaly_id: undefined }));
            return;
        }
        const item = catalog.find(c => c.id === catalogId);
        if (item) {
            setFormData(prev => ({
                ...prev,
                catalog_anomaly_id: catalogId,
                severity: item.criticality === "HIGH" ? "HIGH" : "MEDIUM",
                custom_description: prev.custom_description || item.description
            }));
        }
    };

    return (
        <div className="grid gap-5 py-2">
            {prefilledItem && (
                <div className="bg-muted/50 p-3 rounded-md border border-dashed border-muted-foreground/20">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Point de contrôle lié</p>
                    <p className="text-sm font-semibold">{prefilledItem.code} — {prefilledItem.label}</p>
                </div>
            )}

            <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Type d'anomalie standard</Label>
                <Select
                    value={formData.catalog_anomaly_id || "custom"}
                    onValueChange={handleCatalogSelect}
                >
                    <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder="Choisir dans le référentiel..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="custom">-- Saisie libre / Hors catalogue --</SelectItem>
                        {suggestedAnomalies.map(c => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                                <span className="font-bold mr-2 text-primary">{c.code}</span>
                                {c.description.substring(0, 60)}...
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Description détaillée</Label>
                <Textarea
                    value={formData.custom_description || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, custom_description: e.target.value }))}
                    placeholder="Détaillez le constat sur le terrain..."
                    className="min-h-[100px] text-sm resize-none bg-background focus:ring-1 ring-primary/20"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Sévérité</Label>
                    <Select
                        value={formData.severity || "MEDIUM"}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, severity: val }))}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SEVERITY_LEVELS.map(s => (
                                <SelectItem key={s.value} value={s.value} className="text-xs">
                                    {s.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Statut</Label>
                    <Select
                        value={formData.status || "OPEN"}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ANOMALY_STATUSES.map(s => (
                                <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Notes internes (Optionnel)</Label>
                <Input
                    value={formData.comment || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="Commentaires pour le rapport ou l'équipe..."
                    className="h-9 text-sm"
                />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
                <Button variant="ghost" onClick={onCancel} className="h-10 px-6">Annuler</Button>
                <Button
                    onClick={() => onSubmit(formData)}
                    disabled={isSaving}
                    className="h-10 px-8 shadow-md"
                >
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer l'anomalie
                </Button>
            </div>
        </div>
    );
}
