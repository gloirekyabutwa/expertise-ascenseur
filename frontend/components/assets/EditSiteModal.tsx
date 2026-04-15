"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sitesService } from "@/services/sites";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { Loader2 } from "lucide-react";
import { Site } from "@/lib/api/types";

interface EditSiteModalProps {
    site: Site;
    onClose: () => void;
}

export function EditSiteModal({ site, onClose }: EditSiteModalProps) {
    const { lang } = useLanguage();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: site.name,
        address_line1: site.address_line1 || "",
        city: site.city || "",
        postal_code: site.postal_code || "",
    });

    const updateMutation = useMutation({
        mutationFn: async () => sitesService.update(site.id, formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sites"] });
            toast.success(lang === "fr" ? "Site mis à jour avec succès" : "Site updated successfully");
            onClose();
        },
        onError: () => {
            toast.error(lang === "fr" ? "Erreur lors de la mise à jour" : "Error updating site");
        }
    });

    const isFormValid = formData.name.trim().length > 0;

    return (
        <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{lang === "fr" ? "Modifier le Site" : "Edit Site"}</DialogTitle>
                    <DialogDescription>
                        {lang === "fr" ? "Modifiez les informations de ce site." : "Update the information for this site."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-name">{lang === "fr" ? "Nom du site" : "Site Name"}</Label>
                        <Input
                            id="edit-name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-address">{lang === "fr" ? "Adresse" : "Address"}</Label>
                        <Input
                            id="edit-address"
                            value={formData.address_line1}
                            onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-postal_code">{lang === "fr" ? "Code Postal" : "Zip Code"}</Label>
                            <Input
                                id="edit-postal_code"
                                value={formData.postal_code}
                                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-city">{lang === "fr" ? "Ville" : "City"}</Label>
                            <Input
                                id="edit-city"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
                        {lang === "fr" ? "Annuler" : "Cancel"}
                    </Button>
                    <Button onClick={() => updateMutation.mutate()} disabled={!isFormValid || updateMutation.isPending}>
                        {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {lang === "fr" ? "Enregistrer" : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
