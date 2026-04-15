"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { complianceService } from "@/services/compliance";
import { Loader2 } from "lucide-react";
import { SEVERITY_LEVELS } from "@/constants/elevator-specs";
import { MissionAnomaly } from "@/types/compliance";

interface AddAnomalyModalProps {
    missionId: string;
    prefilledRule: string; // The code from Checklist (e.g., "I.2")
    onClose: () => void;
}

export function AddAnomalyModal({ missionId, prefilledRule, onClose }: AddAnomalyModalProps) {
    const queryClient = useQueryClient();
    
    // Fetch anomaly catalog to prepopulate suggestions based on code (if needed)
    const { data: catalog } = useQuery({
        queryKey: ["anomaly-catalog"],
        queryFn: complianceService.getAnomalyCatalog,
    });

    const defaultSeverity = "MEDIUM";
    
    const [formData, setFormData] = useState<Partial<MissionAnomaly>>({
        status: "OPEN",
        custom_code: prefilledRule, // Link it to the rule
        custom_description: `Non conformité relevée sur le point: ${prefilledRule}`,
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<MissionAnomaly>) => complianceService.createAnomaly(missionId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["compliance", missionId] });
            onClose();
        }
    });

    const handleSubmit = () => {
        createMutation.mutate({
            ...formData,
            severity: (formData as any).severity || defaultSeverity
        } as any);
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Ajouter une Anomalie (Règle {prefilledRule})</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Sévérité (Par défaut: Moyen)</Label>
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
                        <Label>Description de l'anomalie</Label>
                        <Textarea
                            value={formData.custom_description || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, custom_description: e.target.value }))}
                            placeholder="Détaillez le problème rencontré..."
                            rows={4}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Annuler</Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                        {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
