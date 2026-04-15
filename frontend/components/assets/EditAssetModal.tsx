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
import { Loader2, Save } from "lucide-react";
import { Asset } from "@/lib/api/types";

interface EditAssetModalProps {
    asset: Asset;
    onClose: () => void;
}

export function EditAssetModal({ asset, onClose }: EditAssetModalProps) {
    const { lang } = useLanguage();
    const queryClient = useQueryClient();
    
    const [formData, setFormData] = useState({
        label: asset.label,
        manufacturer: asset.manufacturer || "",
        model: asset.model || "",
        installation_number: asset.installation_number || "",
        year_commissioned: asset.year_commissioned || null,
        load_capacity: asset.load_capacity || null,
        nominal_speed: asset.nominal_speed || "",
        number_of_levels: asset.number_of_levels || null,
    });

    const updateMutation = useMutation({
        mutationFn: async () => assetsService.update(asset.id, formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["asset", asset.id] });
            toast.success(lang === "fr" ? "Équipement mis à jour" : "Equipment updated");
            onClose();
        },
        onError: () => {
            toast.error(lang === "fr" ? "Erreur lors de la mise à jour" : "Error updating asset");
        }
    });

    const handleChange = (field: string, value: string) => {
        // Handle numeric fields
        const numericFields = ["year_commissioned", "load_capacity", "number_of_levels"];
        if (numericFields.includes(field)) {
            const parsed = parseInt(value);
            setFormData({ ...formData, [field]: isNaN(parsed) ? null : parsed });
        } else {
            setFormData({ ...formData, [field]: value });
        }
    };

    return (
        <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{lang === "fr" ? "Modifier l'Équipement" : "Edit Equipment"}</DialogTitle>
                    <DialogDescription>
                        {lang === "fr" ? "Mise à jour des caractéristiques techniques." : "Update technical specifications."}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="label">{lang === "fr" ? "Libellé" : "Label"}</Label>
                        <Input
                            id="label"
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="manufacturer">{lang === "fr" ? "Fabricant" : "Manufacturer"}</Label>
                            <Input
                                id="manufacturer"
                                value={formData.manufacturer}
                                onChange={(e) => handleChange("manufacturer", e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="model">{lang === "fr" ? "Modèle" : "Model"}</Label>
                            <Input
                                id="model"
                                value={formData.model}
                                onChange={(e) => handleChange("model", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="install_num">N° Installation</Label>
                            <Input
                                id="install_num"
                                value={formData.installation_number}
                                onChange={(e) => handleChange("installation_number", e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="year">{lang === "fr" ? "Mise en service" : "Year Commissioned"}</Label>
                            <Input
                                id="year"
                                type="number"
                                value={formData.year_commissioned || ""}
                                onChange={(e) => handleChange("year_commissioned", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="load">{lang === "fr" ? "Charge (kg)" : "Load (kg)"}</Label>
                            <Input
                                id="load"
                                type="number"
                                value={formData.load_capacity || ""}
                                onChange={(e) => handleChange("load_capacity", e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="speed">{lang === "fr" ? "Vitesse (m/s)" : "Speed (m/s)"}</Label>
                            <Input
                                id="speed"
                                value={formData.nominal_speed}
                                onChange={(e) => handleChange("nominal_speed", e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="levels">{lang === "fr" ? "Niveaux" : "Levels"}</Label>
                            <Input
                                id="levels"
                                type="number"
                                value={formData.number_of_levels || ""}
                                onChange={(e) => handleChange("number_of_levels", e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
                        {lang === "fr" ? "Annuler" : "Cancel"}
                    </Button>
                    <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {lang === "fr" ? "Enregistrer" : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
