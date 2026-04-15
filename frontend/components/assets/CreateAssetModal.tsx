"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assetsService } from "@/services/assets";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { Loader2 } from "lucide-react";

interface CreateAssetModalProps {
    siteId: string;
    onClose: () => void;
}

export function CreateAssetModal({ siteId, onClose }: CreateAssetModalProps) {
    const { lang } = useLanguage();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        label: "",
        manufacturer: "",
        model: "",
        installation_number: "",
        site_id: siteId,
    });

    const createMutation = useMutation({
        mutationFn: async () => assetsService.create(formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["assets", siteId] });
            toast.success(lang === "fr" ? "Équipement ajouté avec succès" : "Equipment added successfully");
            onClose();
        },
        onError: () => {
            toast.error(lang === "fr" ? "Erreur lors de l'ajout" : "Error creating equipment");
        }
    });

    const isFormValid = formData.label.trim().length > 0;

    return (
        <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{lang === "fr" ? "Nouvel Équipement" : "New Equipment"}</DialogTitle>
                    <DialogDescription>
                        {lang === "fr" ? "Ajoutez un nouvel ascenseur ou équipement à ce site." : "Add a new elevator or equipment to this site."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="asset-label">{lang === "fr" ? "Nom / Libellé" : "Label"}</Label>
                        <Input
                            id="asset-label"
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            placeholder="ex: Ascenseur Bâtiment B"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="asset-manufacturer">{lang === "fr" ? "Fabricant" : "Manufacturer"}</Label>
                            <Input
                                id="asset-manufacturer"
                                value={formData.manufacturer}
                                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                placeholder="Otis, Schindler..."
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="asset-model">{lang === "fr" ? "Modèle" : "Model"}</Label>
                            <Input
                                id="asset-model"
                                value={formData.model}
                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="asset-install">{lang === "fr" ? "N° Installation / P" : "Installation No."}</Label>
                        <Input
                            id="asset-install"
                            value={formData.installation_number}
                            onChange={(e) => setFormData({ ...formData, installation_number: e.target.value })}
                            placeholder="P 123 456"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={createMutation.isPending}>
                        {lang === "fr" ? "Annuler" : "Cancel"}
                    </Button>
                    <Button onClick={() => createMutation.mutate()} disabled={!isFormValid || createMutation.isPending}>
                        {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {lang === "fr" ? "Ajouter" : "Add"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
