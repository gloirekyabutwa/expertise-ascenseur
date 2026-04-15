"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ChevronRight, ClipboardCheck, Wrench, ShieldCheck, Hammer, Leaf, FileSearch, ArrowLeftRight, Layers, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

// Service type metadata (icons + descriptions) keyed by code
const SERVICE_META: Record<string, {
    icon: React.ElementType;
    color: string;
    description_fr: string;
    description_en: string;
}> = {
    "CTQ-5":        { icon: ShieldCheck, color: "text-blue-600 bg-blue-50 border-blue-200", description_fr: "Contrôle réglementaire obligatoire tous les 5 ans par un organisme accrédité.", description_en: "Mandatory regulatory inspection every 5 years by an accredited body." },
    "EXP-PONCT":    { icon: FileSearch,  color: "text-purple-600 bg-purple-50 border-purple-200", description_fr: "Expertise ponctuelle suite à un incident, une panne ou un sinistre.", description_en: "One-time expertise following an incident, breakdown or claim." },
    "ASS-PONCT":    { icon: Wrench,      color: "text-teal-600 bg-teal-50 border-teal-200", description_fr: "Assistance lors d'une intervention unique — accompagnement technique.", description_en: "Assistance for a single intervention — technical support." },
    "ASS-PER":      { icon: Layers,      color: "text-cyan-600 bg-cyan-50 border-cyan-200", description_fr: "Suivi régulier et assistance périodique de la maintenance de votre parc.", description_en: "Regular monitoring and periodic maintenance assistance." },
    "EXP-ASS-PER":  { icon: ClipboardCheck, color: "text-indigo-600 bg-indigo-50 border-indigo-200", description_fr: "Combine expertise technique et assistance périodique sur site.", description_en: "Combines technical expertise with periodic on-site assistance." },
    "AMO":          { icon: Users,       color: "text-orange-600 bg-orange-50 border-orange-200", description_fr: "Pilotage d'un projet de travaux d'ascensoriste — maîtrise d'ouvrage.", description_en: "Project management of elevator works — owner's representative." },
    "CTRL-ACH":     { icon: Hammer,      color: "text-amber-600 bg-amber-50 border-amber-200", description_fr: "Vérification de la conformité des travaux réalisés avant réception.", description_en: "Verification of work conformity before final acceptance." },
    "AMIANTE":      { icon: Leaf,        color: "text-red-600 bg-red-50 border-red-200", description_fr: "Repérage et diagnostic amiante avant tous travaux réglementaires.", description_en: "Asbestos detection and diagnosis before any regulated works." },
    "PASS":         { icon: ArrowLeftRight, color: "text-gray-600 bg-gray-50 border-gray-200", description_fr: "Transfert de propriété ou changement de prestataire de maintenance.", description_en: "Ownership transfer or maintenance contractor change." },
};

interface NewInterventionModalProps {
    assetId: string;
    assetLabel: string;
    onClose: () => void;
}

export function NewInterventionModal({ assetId, assetLabel, onClose }: NewInterventionModalProps) {
    const { lang } = useLanguage();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    const { data: serviceTypes, isLoading } = useQuery({
        queryKey: ["service-types"],
        queryFn: async () => {
            const res = await apiClient.get("/service-types/");
            return res.data as { id: string; label: string; code: string }[];
        },
        staleTime: 1000 * 60 * 10,
    });

    const createMission = useMutation({
        mutationFn: async () => {
            if (!selectedTypeId) throw new Error("No type selected");
            const res = await apiClient.post("/missions/", {
                service_type_id: selectedTypeId,
                asset_id: assetId,
                status: "DRAFT",
                title: `${serviceTypes?.find(t => t.id === selectedTypeId)?.label} — ${assetLabel}`,
            });
            return res.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["missions"] });
            queryClient.invalidateQueries({ queryKey: ["asset-missions", assetId] });
            toast.success(lang === "fr" ? "Mission créée avec succès !" : "Mission created successfully!");
            onClose();
            router.push(`/missions/${data.id}`);
        },
        onError: () => {
            toast.error(lang === "fr" ? "Erreur lors de la création." : "Error creating mission.");
        }
    });

    const filtered = useMemo(() => {
        if (!serviceTypes) return [];
        const q = search.toLowerCase();
        return serviceTypes.filter(st =>
            st.label.toLowerCase().includes(q) ||
            st.code.toLowerCase().includes(q) ||
            (SERVICE_META[st.code]?.[`description_${lang}` as "description_fr" | "description_en"] || "").toLowerCase().includes(q)
        );
    }, [serviceTypes, search, lang]);

    const selectedType = serviceTypes?.find(t => t.id === selectedTypeId);

    return (
        <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[620px] max-h-[90vh] flex flex-col">
                <DialogHeader className="border-b pb-4">
                    <DialogTitle className="text-lg">
                        {lang === "fr" ? "Nouvelle Intervention" : "New Intervention"}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        {lang === "fr" ? "Équipement :" : "Equipment:"}{" "}
                        <span className="font-medium text-foreground">{assetLabel}</span>
                    </p>
                </DialogHeader>

                {/* Search */}
                <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={lang === "fr" ? "Rechercher un type de prestation..." : "Search service type..."}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                        autoFocus
                    />
                </div>

                {/* Service Type Grid */}
                <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-2 py-2">
                    {isLoading ? (
                        <div className="py-8 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            {lang === "fr" ? "Aucun type trouvé." : "No type found."}
                        </div>
                    ) : (
                        filtered.map((st) => {
                            const meta = SERVICE_META[st.code];
                            const Icon = meta?.icon || ShieldCheck;
                            const isSelected = selectedTypeId === st.id;
                            const desc = meta?.[`description_${lang}` as "description_fr" | "description_en"] || "";

                            return (
                                <button
                                    key={st.id}
                                    onClick={() => setSelectedTypeId(st.id)}
                                    className={cn(
                                        "w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all",
                                        isSelected
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-border hover:border-primary/30 hover:bg-muted/30"
                                    )}
                                >
                                    {/* Radio indicator */}
                                    <div className={cn(
                                        "mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 transition-all",
                                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                                    )} />

                                    {/* Icon */}
                                    <div className={cn(
                                        "h-9 w-9 rounded-lg border flex items-center justify-center flex-shrink-0",
                                        meta?.color || "text-gray-600 bg-gray-50 border-gray-200"
                                    )}>
                                        <Icon className="h-4 w-4" />
                                    </div>

                                    {/* Label + description */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm">{st.label}</span>
                                            <Badge variant="secondary" className="text-[10px] font-mono">{st.code}</Badge>
                                        </div>
                                        {desc && (
                                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                <DialogFooter className="border-t pt-4 gap-2">
                    <Button variant="outline" onClick={onClose}>
                        {lang === "fr" ? "Annuler" : "Cancel"}
                    </Button>
                    <Button
                        onClick={() => createMission.mutate()}
                        disabled={!selectedTypeId || createMission.isPending}
                        className="gap-2"
                    >
                        {createMission.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {lang === "fr" ? "Créer l'intervention" : "Create intervention"}
                        {!createMission.isPending && <ChevronRight className="h-4 w-4" />}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
