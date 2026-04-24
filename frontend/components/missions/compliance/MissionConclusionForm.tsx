
"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SignatureCanvas from "react-signature-canvas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Mission } from "@/lib/api/types";
import { complianceService } from "@/services/compliance";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseISO, format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STOP_REASONS } from "@/constants/elevator-specs";

import { useMissionContext } from "@/context/MissionContext";

interface MissionConclusionFormProps {
    mission: Mission;
}

export function MissionConclusionForm({ mission }: MissionConclusionFormProps) {
    const queryClient = useQueryClient();
    const { setIsDirty } = useMissionContext();
    const [formData, setFormData] = useState({
        client_reference: mission.client_reference || "",
        certification_number: mission.certification_number || "",
        owner_malveillance_flag: mission.owner_malveillance_flag || false,
        stop_request_flag: mission.stop_request_flag || false,
        stop_reason: mission.stop_reason || "",
        signed_by_name: mission.signed_by_name || "",
        place_signed: mission.place_signed || "",
        signature_date: mission.signed_at ? format(parseISO(mission.signed_at), "yyyy-MM-dd'T'HH:mm") : "",
        client_signature: mission.metadata_json?.client_signature || "",
        tech_signature: mission.metadata_json?.tech_signature || ""
    });

    const clientSigCanvas = useRef<any>(null);
    const techSigCanvas = useRef<any>(null);

    const updateMutation = useMutation({
        mutationFn: (data: any) => complianceService.updateMission(mission.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mission", mission.id] });
            toast.success("Conclusion updated");
            setIsDirty(false);
        },
        onError: () => {
            toast.error("Failed to update conclusion");
        }
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleSave = () => {
        let finalMetadata = mission.metadata_json || {};
        
        if (clientSigCanvas.current && !clientSigCanvas.current.isEmpty()) {
            finalMetadata.client_signature = clientSigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
        } else if (formData.client_signature) {
            finalMetadata.client_signature = formData.client_signature;
        }

        if (techSigCanvas.current && !techSigCanvas.current.isEmpty()) {
            finalMetadata.tech_signature = techSigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
        } else if (formData.tech_signature) {
            finalMetadata.tech_signature = formData.tech_signature;
        }

        updateMutation.mutate({
            ...formData,
            signed_at: formData.signature_date ? new Date(formData.signature_date).toISOString() : null,
            metadata_json: finalMetadata
        });
    };

    return (
        <div className="space-y-6 border p-4 rounded-md">
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Référence Client</Label>
                    <Input
                        value={formData.client_reference}
                        onChange={e => handleChange("client_reference", e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Numéro de Certification</Label>
                    <Input
                        value={formData.certification_number}
                        onChange={e => handleChange("certification_number", e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold text-sm">Signalements</h4>
                <div className="flex items-center justify-between border p-3 rounded">
                    <div className="space-y-0.5">
                        <Label>Actes de malveillance</Label>
                        <p className="text-xs text-muted-foreground">Signaler des traces de vandalisme ou d'effraction.</p>
                    </div>
                    <Switch
                        checked={formData.owner_malveillance_flag}
                        onCheckedChange={(c) => handleChange("owner_malveillance_flag", c)}
                    />
                </div>

                <div className="flex items-center justify-between border p-3 rounded">
                    <div className="space-y-0.5">
                        <Label>Demande d'arrêt</Label>
                        <p className="text-xs text-muted-foreground">Demander l'arrêt imminent de l'appareil.</p>
                    </div>
                    <Switch
                        checked={formData.stop_request_flag}
                        onCheckedChange={(c) => handleChange("stop_request_flag", c)}
                    />
                </div>

                {formData.stop_request_flag && (
                    <div className="grid gap-2">
                        <Label className="text-destructive">Motif de l'arrêt (article réglementaire)</Label>
                        <Select
                            value={formData.stop_reason}
                            onValueChange={val => handleChange("stop_reason", val)}
                        >
                            <SelectTrigger className="border-destructive/50">
                                <SelectValue placeholder="Sélectionner l'article applicable..." />
                            </SelectTrigger>
                            <SelectContent>
                                {STOP_REASONS.map(r => (
                                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold text-sm">Clôture & Signature</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label>Signé par (Nom)</Label>
                        <Input
                            value={formData.signed_by_name}
                            onChange={e => handleChange("signed_by_name", e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Fait à (Lieu)</Label>
                        <Input
                            value={formData.place_signed}
                            onChange={e => handleChange("place_signed", e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Date de signature</Label>
                        <Input
                            type="datetime-local"
                            value={formData.signature_date}
                            onChange={e => handleChange("signature_date", e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="grid gap-2">
                        <Label className="flex items-center justify-between text-muted-foreground uppercase text-xs tracking-wider">
                            Signature Technicien
                            <Button variant="ghost" size="sm" onClick={() => techSigCanvas.current?.clear()} className="h-6 text-xs text-muted-foreground">Effacer</Button>
                        </Label>
                        <div className="border border-muted/60 shadow-inner rounded-md bg-white">
                            {formData.tech_signature ? (
                                <img src={formData.tech_signature} alt="Signature Technicien" className="h-32 w-full object-contain" />
                            ) : (
                                <SignatureCanvas
                                    ref={techSigCanvas}
                                    penColor="blue"
                                    canvasProps={{ className: "w-full h-32" }}
                                />
                            )}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label className="flex items-center justify-between text-primary uppercase text-xs tracking-wider font-bold">
                            Signature Client / Représentant
                            <Button variant="ghost" size="sm" onClick={() => clientSigCanvas.current?.clear()} className="h-6 text-xs text-muted-foreground">Effacer</Button>
                        </Label>
                        <div className="border-2 border-primary/20 shadow-sm rounded-md bg-white">
                            {formData.client_signature ? (
                                <img src={formData.client_signature} alt="Signature Client" className="h-32 w-full object-contain" />
                            ) : (
                                <SignatureCanvas
                                    ref={clientSigCanvas}
                                    penColor="black"
                                    canvasProps={{ className: "w-full h-32" }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
                <p className="text-xs text-muted-foreground italic">
                    Note: La clôture de la mission générera automatiquement le rapport PDF final et l'enverra au client.
                </p>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSave} disabled={updateMutation.isPending}>
                        {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sauvegarder Brouillon
                    </Button>
                    <Button onClick={() => {
                        handleSave();
                        updateMutation.mutate({ status: 'COMPLETED' });
                    }} disabled={updateMutation.isPending} className="bg-green-600 hover:bg-green-700">
                        {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Clôturer & Envoyer Rapport
                    </Button>
                </div>
            </div>
        </div>
    );
}
