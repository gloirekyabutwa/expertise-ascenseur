"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { photosService, MissionPhoto } from "@/services/photos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, Image as ImageIcon, X, Loader2, Link as LinkIcon, MapPin, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PhotoManagerProps {
    missionId: string;
    checklistOptions?: { id: string, label: string }[];
    anomalyOptions?: { id: string, label: string }[];
}

export function PhotoManager({ missionId, checklistOptions = [], anomalyOptions = [] }: PhotoManagerProps) {
    const queryClient = useQueryClient();
    const [isDragging, setIsDragging] = useState(false);
    
    // Fetch photos
    const { data: photos = [], isLoading } = useQuery({
        queryKey: ["mission-photos", missionId],
        queryFn: () => photosService.listByMission(missionId)
    });

    // Upload mutation
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            // Optional: Get geolocation if available (browser implementation)
            // For MVP, we just upload
            return await photosService.upload(missionId, file, {
                captured_at: new Date().toISOString()
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mission-photos", missionId] });
            toast.success("Photo ajoutée");
        },
        onError: () => {
            toast.error("Erreur lors de l'ajout de la photo");
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (photoId: string) => photosService.delete(photoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mission-photos", missionId] });
            toast.success("Photo supprimée");
        }
    });

    // Update linkage mutation
    const updateMutation = useMutation({
        mutationFn: ({ photoId, metadata }: { photoId: string, metadata: Partial<MissionPhoto> }) => 
            photosService.update(photoId, metadata),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mission-photos", missionId] });
            // Invalidate anomalies/checklist to refresh indicators if they depend on photos
            queryClient.invalidateQueries({ queryKey: ["mission"] }); 
            toast.success("Liaison mise à jour");
        }
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => {
                uploadMutation.mutate(file);
            });
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            Array.from(e.dataTransfer.files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    uploadMutation.mutate(file);
                }
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Galerie d'Intervention</h3>
                    <p className="text-sm text-slate-500">Ajoutez des photos pour illustrer vos contrôles et relevés d'anomalies.</p>
                </div>
            </div>

            {/* Dropzone */}
            <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    isDragging 
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" 
                        : "border-slate-300 dark:border-zinc-700 hover:border-slate-400 dark:hover:border-zinc-600"
                }`}
            >
                <UploadCloud className={`mx-auto h-12 w-12 mb-4 ${isDragging ? "text-blue-500" : "text-slate-400"}`} />
                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                    Glissez et déposez vos photos ici
                </h4>
                <p className="text-xs text-slate-500 mb-4">ou cliquez pour parcourir</p>
                <div className="relative inline-block">
                    <Input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileSelect}
                        disabled={uploadMutation.isPending}
                    />
                    <Button variant="outline" disabled={uploadMutation.isPending}>
                        {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Parcourir les fichiers
                    </Button>
                </div>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-slate-100 dark:bg-zinc-800 animate-pulse" />)}
                </div>
            ) : photos.length === 0 ? (
                <div className="text-center py-12 border rounded-xl border-slate-200 dark:border-zinc-800 border-dashed">
                    <ImageIcon className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Aucune photo pour cette intervention.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {photos.map((photo) => (
                        <Card key={photo.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative">
                            {/* Actions Overlay */}
                            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                    size="icon" 
                                    variant="destructive" 
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => deleteMutation.mutate(photo.id)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Image */}
                            <div className="aspect-[4/3] relative bg-slate-100 dark:bg-zinc-900">
                                {photo.url ? (
                                    <img src={photo.url} alt={photo.filename || "Photo"} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400">
                                        <ImageIcon className="w-8 h-8" />
                                    </div>
                                )}
                            </div>

                            <CardContent className="p-4 space-y-4">
                                {/* Metadata */}
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    {photo.captured_at && (
                                        <span className="flex items-center gap-1">
                                            <CalendarDays className="h-3 w-3" />
                                            {format(new Date(photo.captured_at), "dd MMM HH:mm", { locale: fr })}
                                        </span>
                                    )}
                                    {photo.size_bytes && <span>{(photo.size_bytes / 1024 / 1024).toFixed(1)} MB</span>}
                                </div>

                                {/* Linkage */}
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                            <LinkIcon className="h-3 w-3" /> Lier au Point de Contrôle
                                        </Label>
                                        <Select 
                                            value={photo.checklist_result_id || "none"}
                                            onValueChange={(val) => updateMutation.mutate({ 
                                                photoId: photo.id, 
                                                metadata: { checklist_result_id: val === "none" ? null : val } 
                                            })}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Aucun lien" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none" className="text-slate-400 font-medium">-- Aucun lien --</SelectItem>
                                                {checklistOptions.map(opt => (
                                                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                            <LinkIcon className="h-3 w-3" /> Lier à une Anomalie
                                        </Label>
                                        <Select 
                                            value={photo.anomaly_id || "none"}
                                            onValueChange={(val) => updateMutation.mutate({ 
                                                photoId: photo.id, 
                                                metadata: { anomaly_id: val === "none" ? null : val } 
                                            })}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Aucun lien" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none" className="text-slate-400 font-medium">-- Aucun lien --</SelectItem>
                                                {anomalyOptions.map(opt => (
                                                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
