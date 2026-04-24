"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { complianceService } from "@/services/compliance";
import { MissionAnomaly } from "@/types/compliance";
import { AnomalyForm } from "./AnomalyForm";

interface AddAnomalyModalProps {
    missionId: string;
    prefilledItem: { id: string; code: string; label: string }; // The item from Checklist
    onClose: () => void;
}

export function AddAnomalyModal({ missionId, prefilledItem, onClose }: AddAnomalyModalProps) {
    const queryClient = useQueryClient();

    // Fetch anomaly catalog
    const { data: catalog = [] } = useQuery({
        queryKey: ["anomaly-catalog"],
        queryFn: complianceService.getAnomalyCatalog,
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<MissionAnomaly>) => complianceService.createAnomaly(missionId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["compliance", missionId] });
            onClose();
        }
    });

    const handleSubmit = (formData: Partial<MissionAnomaly>) => {
        createMutation.mutate({
            ...formData,
            catalog_item_id: prefilledItem.id, // Explicit link
            custom_code: prefilledItem.code // Backup code
        });
    };

    return (
        <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="bg-primary/5 px-6 pt-6 pb-4">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        Préciser une Anomalie
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">Enregistrez un constat détaillé pour enrichir le rapport de mission.</p>
                </DialogHeader>
                <div className="px-6 pb-6">
                    <AnomalyForm
                        catalog={catalog}
                        onSubmit={handleSubmit}
                        onCancel={onClose}
                        isSaving={createMutation.isPending}
                        prefilledItem={prefilledItem}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
