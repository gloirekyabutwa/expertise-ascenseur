
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Asset } from "@/lib/api/types";
import { assetsService } from "@/services/assets";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useMissionContext } from "@/context/MissionContext";

// Temporary interface until types.ts is updated successfully
interface ExtendedAsset extends Asset {
    installation_number?: string | null;
    year_commissioned?: number | null;
    device_type?: string | null;
    feature_type?: string | null;
    usage_type?: string | null;
    load_capacity?: number | null;
    max_passengers?: number | null;
    nominal_speed?: string | null;
    number_of_levels?: number | null;
    machinery_location?: string | null;
    maintainer_name?: string | null;
}

import { 
    ELEVATOR_MANUFACTURERS, 
    DEVICE_TYPES, 
    TRACTION_TYPES, 
    USAGE_TYPES,
    MACHINERY_LOCATIONS,
    ELEVATOR_MANUFACTURERS as MAINTAINER_ORGS
} from "@/constants/elevator-specs";

interface AssetSpecsFormProps {
    asset: Asset;
}

export function AssetSpecsForm({ asset }: AssetSpecsFormProps) {
    const queryClient = useQueryClient();
    const { setIsDirty } = useMissionContext();

    const [formData, setFormData] = useState<Partial<ExtendedAsset>>({
        manufacturer: asset.manufacturer || "",
        installation_number: (asset as any).installation_number || "",
        year_commissioned: (asset as any).year_commissioned,
        device_type: (asset as any).device_type || "",
        feature_type: (asset as any).feature_type || "",
        usage_type: (asset as any).usage_type || "",
        load_capacity: (asset as any).load_capacity,
        max_passengers: (asset as any).max_passengers,
        nominal_speed: (asset as any).nominal_speed || "",
        number_of_levels: (asset as any).number_of_levels,
        machinery_location: (asset as any).machinery_location || "",
        maintainer_name: (asset as any).maintainer_name || "",
    });

    const updateMutation = useMutation({
        mutationFn: (data: Partial<Asset>) => assetsService.update(asset.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mission"] });
            toast.success("Asset specifications updated");
            setIsDirty(false);
        },
        onError: () => {
            toast.error("Failed to update asset specifications");
        }
    });

    const handleChange = (field: keyof ExtendedAsset, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    return (
        <div className="space-y-4 border p-4 rounded-md">
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Numéro d'installation</Label>
                    <Input
                        value={formData.installation_number || ""}
                        onChange={e => handleChange("installation_number", e.target.value)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Marque / Constructeur</Label>
                    <Select
                        value={formData.manufacturer || ""}
                        onValueChange={val => handleChange("manufacturer", val)}
                    >
                        <SelectTrigger><SelectValue placeholder="Select brand..." /></SelectTrigger>
                        <SelectContent>
                            {ELEVATOR_MANUFACTURERS.map(m => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>Année de mise en service</Label>
                    <Input
                        type="number"
                        value={formData.year_commissioned || ""}
                        onChange={e => handleChange("year_commissioned", parseInt(e.target.value) || undefined)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Type d'appareil</Label>
                    <Select
                        value={formData.device_type || ""}
                        onValueChange={val => handleChange("device_type", val)}
                    >
                        <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                        <SelectContent>
                            {DEVICE_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>Caractéristique (Entraînement)</Label>
                    <Select
                        value={formData.feature_type || ""}
                        onValueChange={val => handleChange("feature_type", val)}
                    >
                        <SelectTrigger><SelectValue placeholder="Select feature..." /></SelectTrigger>
                        <SelectContent>
                            {TRACTION_TYPES.map(t => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>Usage</Label>
                    <Select
                        value={formData.usage_type || ""}
                        onValueChange={val => handleChange("usage_type", val)}
                    >
                        <SelectTrigger><SelectValue placeholder="Select usage..." /></SelectTrigger>
                        <SelectContent>
                            {USAGE_TYPES.map(u => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>Charge utile (kg)</Label>
                    <Input
                        type="number"
                        value={formData.load_capacity || ""}
                        onChange={e => handleChange("load_capacity", parseInt(e.target.value) || undefined)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Max Passagers</Label>
                    <Input
                        type="number"
                        value={formData.max_passengers || ""}
                        onChange={e => handleChange("max_passengers", parseInt(e.target.value) || undefined)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Vitesse nominale</Label>
                    <Input
                        value={formData.nominal_speed || ""}
                        onChange={e => handleChange("nominal_speed", e.target.value)}
                        placeholder="e.g. 1.00 m/s"
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Nombre de niveaux</Label>
                    <Input
                        type="number"
                        value={formData.number_of_levels || ""}
                        onChange={e => handleChange("number_of_levels", parseInt(e.target.value) || undefined)}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Emplacement Machinerie</Label>
                    <Select
                        value={formData.machinery_location || ""}
                        onValueChange={val => handleChange("machinery_location", val)}
                    >
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                            {MACHINERY_LOCATIONS.map(loc => (
                                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label>Mainteneur</Label>
                    <Input
                        value={formData.maintainer_name || ""}
                        onChange={e => handleChange("maintainer_name", e.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={() => updateMutation.mutate(formData)} disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
