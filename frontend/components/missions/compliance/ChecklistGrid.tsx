
"use client";

import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    ChecklistCatalogResponse,
    MissionChecklistResult
} from "@/types/compliance";
import { complianceService } from "@/services/compliance";
import {
    Loader2, Check, AlertCircle, Ban, Search,
    ChevronDown, ChevronRight, AlertTriangle
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddAnomalyModal } from "./AddAnomalyModal";
import { cn } from "@/lib/utils";

interface ChecklistGridProps {
    missionId: string;
    catalog: ChecklistCatalogResponse[];
    results: MissionChecklistResult[];
}

// Build tree structure: group -> children items
function buildSections(catalog: ChecklistCatalogResponse[], resultMap: Map<string, MissionChecklistResult>) {
    const groups = catalog.filter(c => c.item_type === "GROUP");
    const items = catalog.filter(c => c.item_type !== "GROUP");

    return groups.map(group => {
        const children = items
            .filter(i => i.parent_id === group.id)
            .map(i => ({ ...i, result: resultMap.get(i.id) }));

        const total = children.length;
        const checked = children.filter(c => c.result?.status === "CONCERNED" && !c.result?.observation_code).length;
        const nok = children.filter(c => c.result?.observation_code || (c.result?.status === "CONCERNED" && c.result?.observation_code)).length;
        const na = children.filter(c => c.result?.status === "NOT_CONCERNED").length;
        const pending = total - checked - nok - na;

        return { ...group, children, total, checked, nok, na, pending };
    });
}

// Compact status pill button
function StatusButtons({ currentStatus, hasAnomaly, onStatus }: {
    currentStatus: string;
    hasAnomaly: boolean;
    onStatus: (s: string) => void;
}) {
    const isOk = currentStatus === "CONCERNED" && !hasAnomaly;
    const isNok = hasAnomaly;
    const isNa = currentStatus === "NOT_CONCERNED";

    return (
        <div className="inline-flex items-center rounded-md border border-border overflow-hidden text-xs h-7">
            <button
                onClick={() => onStatus("CONCERNED")}
                className={cn(
                    "px-2.5 h-full flex items-center gap-1 transition-colors font-medium",
                    isOk
                        ? "bg-emerald-500 text-white"
                        : "text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                )}
                title="Conforme"
            >
                <Check className="h-3 w-3" />
                <span>OK</span>
            </button>
            <div className="w-px h-full bg-border" />
            <button
                onClick={() => onStatus("NOK")}
                className={cn(
                    "px-2.5 h-full flex items-center gap-1 transition-colors font-medium",
                    isNok
                        ? "bg-red-500 text-white"
                        : "text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                )}
                title="Non Conforme"
            >
                <AlertCircle className="h-3 w-3" />
                <span>NOK</span>
            </button>
            <div className="w-px h-full bg-border" />
            <button
                onClick={() => onStatus("NOT_CONCERNED")}
                className={cn(
                    "px-2.5 h-full flex items-center gap-1 transition-colors font-medium",
                    isNa
                        ? "bg-slate-400 text-white"
                        : "text-muted-foreground hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/30"
                )}
                title="Non Applicable"
            >
                <Ban className="h-3 w-3" />
                <span>NA</span>
            </button>
        </div>
    );
}

// Section header with stats + collapse toggle
function SectionHeader({ section, isOpen, onToggle }: { section: any; isOpen: boolean; onToggle: () => void }) {
    const progress = section.total > 0 ? Math.round(((section.checked + section.na) / section.total) * 100) : 0;

    return (
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors group"
        >
            <div className="flex items-center gap-3">
                <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <div className="text-left">
                    <span className="font-semibold text-sm text-foreground">
                        {section.code} — {section.label}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {/* Mini stats */}
                <div className="flex items-center gap-2 text-xs">
                    {section.checked > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3 w-3" />
                            {section.checked}
                        </span>
                    )}
                    {section.nok > 0 && (
                        <span className="flex items-center gap-1 text-red-500">
                            <AlertTriangle className="h-3 w-3" />
                            {section.nok}
                        </span>
                    )}
                    {section.na > 0 && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                            <Ban className="h-3 w-3" />
                            {section.na}
                        </span>
                    )}
                    {section.pending > 0 && (
                        <span className="text-amber-500 font-medium">{section.pending} à faire</span>
                    )}
                </div>
                {/* Progress dot */}
                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all",
                            progress === 100 ? "bg-emerald-500" : section.nok > 0 ? "bg-amber-500" : "bg-primary"
                        )}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{progress}%</span>
            </div>
        </button>
    );
}

export function ChecklistGrid({ missionId, catalog, results }: ChecklistGridProps) {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<"ALL" | "NOK" | "NA">("ALL");
    const [search, setSearch] = useState("");
    const [pendingValues, setPendingValues] = useState<Record<string, string>>({});
    const [openSections, setOpenSections] = useState<Set<string>>(new Set());

    // Anomaly modal
    const [anomalyTarget, setAnomalyTarget] = useState<{ id: string; code: string; label: string } | null>(null);

    const { mutate, isPending } = useMutation({
        mutationFn: (updates: Partial<MissionChecklistResult>[]) =>
            complianceService.updateChecklistResults(missionId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["compliance", missionId] });
            setPendingValues({});
        },
    });

    const resultMap = useMemo(() => new Map(results.map(r => [r.catalog_item_id, r])), [results]);

    const sections = useMemo(() => {
        const all = buildSections(catalog, resultMap);
        return all.map(section => ({
            ...section,
            children: section.children.filter(item => {
                const isNok = item.result?.observation_code;
                const isNa = item.result?.status === "NOT_CONCERNED";
                if (filter === "NOK" && !isNok) return false;
                if (filter === "NA" && !isNa) return false;
                if (search) {
                    const q = search.toLowerCase();
                    if (!item.label.toLowerCase().includes(q) && !item.code.toLowerCase().includes(q)) return false;
                }
                return true;
            })
        })).filter(s => s.children.length > 0 || filter === "ALL");
    }, [catalog, resultMap, filter, search]);

    // By default, open first section
    const firstSectionId = sections[0]?.id;
    const isOpen = useCallback((id: string) => {
        if (openSections.size === 0 && id === firstSectionId) return true;
        return openSections.has(id);
    }, [openSections, firstSectionId]);

    const toggleSection = useCallback((id: string) => {
        setOpenSections(prev => {
            const next = new Set(prev);
            if (isOpen(id)) {
                next.add(id); // Mark explicitly so default open doesn't apply
                next.delete(id);
                // To handle the "default first open" case, we need explicit tracking
                next.add(`__closed_${id}`);
            } else {
                next.delete(`__closed_${id}`);
                next.add(id);
            }
            return next;
        });
    }, [isOpen]);

    const isSectionOpen = useCallback((id: string) => {
        if (openSections.has(`__closed_${id}`)) return false;
        if (openSections.has(id)) return true;
        return id === firstSectionId; // Default: first open
    }, [openSections, firstSectionId]);

    const handleStatus = (item: any, newStatus: string) => {
        if (newStatus === "NOK") {
            mutate([{ catalog_item_id: item.id, status: "CONCERNED" }]);
            setAnomalyTarget({ id: item.id, code: item.code, label: item.label });
            return;
        }
        mutate([{ catalog_item_id: item.id, status: newStatus }]);
    };

    const handleValueBlur = (item: any) => {
        const val = pendingValues[item.id];
        if (val !== undefined) {
            mutate([{ catalog_item_id: item.id, result_value: val }]);
        }
    };

    return (
        <div className="space-y-3">
            {/* Anomaly Modal */}
            {anomalyTarget && (
                <AddAnomalyModal
                    missionId={missionId}
                    prefilledRule={anomalyTarget.code}
                    onClose={() => {
                        queryClient.invalidateQueries({ queryKey: ["compliance", missionId] });
                        setAnomalyTarget(null);
                    }}
                />
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="relative w-56">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher..."
                            className="pl-8 h-8 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                        <SelectTrigger className="w-[160px] h-8 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tous les points</SelectItem>
                            <SelectItem value="NOK">Anomalies (NOK)</SelectItem>
                            <SelectItem value="NA">Non applicables</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {isPending ? (
                        <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde...</span>
                    ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">✓ Sauvegardé</span>
                    )}
                </div>
            </div>

            {/* Accordion Sections */}
            <div className="border rounded-lg overflow-hidden divide-y divide-border">
                {sections.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                        Aucun point de contrôle trouvé.
                    </div>
                )}
                {sections.map((section) => (
                    <div key={section.id}>
                        <SectionHeader
                            section={section}
                            isOpen={isSectionOpen(section.id)}
                            onToggle={() => toggleSection(section.id)}
                        />
                        {isSectionOpen(section.id) && (
                            <div className="bg-background border-t border-border/50">
                                {/* Table header */}
                                <div className="grid grid-cols-[80px_1fr_220px_120px_180px] gap-0 bg-muted/20 border-b border-border/30 px-4 py-1.5">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Code</span>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Point de contrôle</span>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</span>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valeur</span>
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observation</span>
                                </div>
                                {/* Rows */}
                                {section.children.map((item: any) => {
                                    const currentStatus = item.result?.status || "NOT_CHECKED";
                                    const hasAnomaly = !!item.result?.observation_code;

                                    return (
                                        <div
                                            key={item.id}
                                            className={cn(
                                                "grid grid-cols-[80px_1fr_220px_120px_180px] gap-0 px-4 py-2 border-b border-border/20 last:border-0 items-center hover:bg-muted/20 transition-colors",
                                                hasAnomaly && "bg-red-50/30 dark:bg-red-950/10"
                                            )}
                                        >
                                            {/* Code */}
                                            <span className="font-mono text-xs text-muted-foreground">{item.code}</span>

                                            {/* Label */}
                                            <div className="pr-4">
                                                <p className="text-sm font-medium leading-tight">{item.label}</p>
                                                {item.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                                                )}
                                            </div>

                                            {/* Status buttons */}
                                            <div>
                                                <StatusButtons
                                                    currentStatus={currentStatus}
                                                    hasAnomaly={hasAnomaly}
                                                    onStatus={(s) => handleStatus(item, s)}
                                                />
                                            </div>

                                            {/* Value */}
                                            <div>
                                                {item.field_type === "MEASURE" ? (
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            className="w-16 h-7 text-xs text-right px-1.5"
                                                            value={pendingValues[item.id] !== undefined ? pendingValues[item.id] : (item.result?.result_value || "")}
                                                            onChange={(e) => setPendingValues(p => ({ ...p, [item.id]: e.target.value }))}
                                                            onBlur={() => handleValueBlur(item)}
                                                            onKeyDown={(e) => e.key === "Enter" && handleValueBlur(item)}
                                                            placeholder="0.0"
                                                        />
                                                        {item.unit && <span className="text-xs text-muted-foreground">{item.unit}</span>}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground/30 text-xs">—</span>
                                                )}
                                            </div>

                                            {/* Observation */}
                                            <div className="flex flex-col gap-0.5">
                                                {item.result?.observation_code && (
                                                    <Badge variant="destructive" className="text-xs w-fit px-1.5 py-0">
                                                        {item.result.observation_code}
                                                    </Badge>
                                                )}
                                                {item.result?.comment && (
                                                    <span className="text-xs text-muted-foreground italic line-clamp-1">{item.result.comment}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
