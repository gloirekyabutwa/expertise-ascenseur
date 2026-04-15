"use client";

import { useState } from "react";
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

interface CreateSiteModalProps {
    onClose: () => void;
}

export function CreateSiteModal({ onClose }: CreateSiteModalProps) {
    const { lang } = useLanguage();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: "",
        address_line1: "",
        city: "",
        postal_code: "",
    });

    const createMutation = useMutation({
        mutationFn: async () => sitesService.create(formData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sites"] });
            toast.success(lang === "fr" ? "Site ajouté avec succès" : "Site added successfully");
            onClose();
        },
        onError: () => {
            toast.error(lang === "fr" ? "Erreur lors de l'ajout" : "Error creating site");
        }
    });

    const isFormValid = formData.name.trim().length > 0;

    return (
        <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{lang === "fr" ? "Nouveau Site" : "New Site"}</DialogTitle>
                    <DialogDescription>
                        {lang === "fr" ? "Ajoutez un nouveau site à gérer dans votre parc." : "Add a new site to manage in your portfolio."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{lang === "fr" ? "Nom du site" : "Site Name"}</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="ex: Résidence Les Pins"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="address">{lang === "fr" ? "Adresse" : "Address"}</Label>
                        <Input
                            id="address"
                            value={formData.address_line1}
                            onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                            placeholder="10 rue de la République"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="postal_code">{lang === "fr" ? "Code Postal" : "Zip Code"}</Label>
                            <Input
                                id="postal_code"
                                value={formData.postal_code}
                                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                placeholder="33000"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="city">{lang === "fr" ? "Ville" : "City"}</Label>
                            <Input
                                id="city"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                placeholder="Bordeaux"
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={createMutation.isPending}>
                        {lang === "fr" ? "Annuler" : "Cancel"}
                    </Button>
                    <Button onClick={() => createMutation.mutate()} disabled={!isFormValid || createMutation.isPending}>
                        {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {lang === "fr" ? "Créer" : "Create"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
