"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mission } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, CheckCircle, Download, RefreshCw, AlertTriangle, Mail } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { pdfService } from "@/services/pdf";
import { useLanguage } from "@/context/LanguageContext";
import { Badge } from "@/components/ui/badge";

interface MissionPdfTabProps {
    mission: Mission;
}

const TEMPLATE_TYPES = [
    {
        value: "FULL",
        labelFr: "Rapport Complet (Client)",
        labelEn: "Full Report (Client)",
        descFr: "8 sections réglementaires — Législation, Documents, Anomalies, Checklist, Signature",
        descEn: "8 regulatory sections — Legislation, Documents, Anomalies, Checklist, Signature",
        badge: "Client",
        color: "default",
    },
    {
        value: "CE",
        labelFr: "Rapport Préstataire CE",
        labelEn: "Contractor Report (CE)",
        descFr: "Version allégée pour installation conforme CE — Observations + Stop flag",
        descEn: "Light version for CE-compliant installation — Observations + Stop flag",
        badge: "CE",
        color: "secondary",
    },
    {
        value: "LEVEE",
        labelFr: "Attestation de Levée de Réserves",
        labelEn: "Reserve Lift Attestation",
        descFr: "Atteste la levée des réserves du précédent contrôle (Fait / Non Fait)",
        descEn: "Attests the lifting of reserves from the previous inspection (Done / Not done)",
        badge: "Levée",
        color: "outline",
    },
];

export function MissionPdfTab({ mission }: MissionPdfTabProps) {
    const queryClient = useQueryClient();
    const { lang, t } = useLanguage();
    const [isPolling, setIsPolling] = useState(false);
    const [requestId, setRequestId] = useState<string | null>(null);
    const [templateType, setTemplateType] = useState("FULL");

    const generateMutation = useMutation({
        mutationFn: async () => {
            return await pdfService.generate(mission.id, { template_type: templateType, include_photos: true });
        },
        onSuccess: (data) => {
            toast.success(lang === "fr" ? "Génération démarrée" : "Generation started");
            setRequestId(data.id);
            setIsPolling(true);
            queryClient.invalidateQueries({ queryKey: ["mission", mission.id] });
        },
        onError: (error: any) => {
            toast.error(lang === "fr" ? "Erreur de génération" : "Generation failed", { description: error.message });
        }
    });

    const sendEmailMutation = useMutation({
        mutationFn: async () => {
            if (!requestId) {
                throw new Error(lang === "fr" ? "Aucun PDF disponible" : "No PDF available");
            }
            return await pdfService.sendEmail(requestId);
        },
        onSuccess: (data) => {
            toast.success(
                lang === "fr" ? "Email envoyé avec succès." : "Email sent successfully.",
                {
                    description: data.recipient_email,
                }
            );
        },
        onError: (error: any) => {
            toast.error(
                lang === "fr" ? "Impossible d'envoyer l'email" : "Unable to send the email",
                { description: error.message }
            );
        }
    });

    const { data: requestStatus } = useQuery({
        queryKey: ["pdf-request", requestId],
        queryFn: async () => {
            if (!requestId) return null;
            return await pdfService.getStatus(requestId);
        },
        enabled: !!requestId && isPolling,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (data && (data.status === "SUCCEEDED" || data.status === "FAILED")) {
                setIsPolling(false);
                if (data.status === "SUCCEEDED") {
                    toast.success(lang === "fr" ? "PDF prêt au téléchargement !" : "PDF ready to download!");
                }
                return false;
            }
            return 2000;
        }
    });

    const isGenerating = generateMutation.isPending
        || requestStatus?.status === "RUNNING"
        || requestStatus?.status === "QUEUED";

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {t("pdf_title")}
                </CardTitle>
                <CardDescription>
                    {lang === "fr"
                        ? "Choisissez le modèle de rapport adapté puis lancez la génération."
                        : "Choose the appropriate report template then start generation."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Template selector */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium">{t("pdf_template")}</Label>
                    <div className="grid grid-cols-1 gap-3">
                        {TEMPLATE_TYPES.map(tmpl => (
                            <button
                                key={tmpl.value}
                                onClick={() => setTemplateType(tmpl.value)}
                                className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                                    templateType === tmpl.value
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                                }`}
                            >
                                <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 ${
                                    templateType === tmpl.value ? "border-primary bg-primary" : "border-border"
                                }`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">
                                            {lang === "fr" ? tmpl.labelFr : tmpl.labelEn}
                                        </span>
                                        <Badge variant="secondary" className="text-xs">{tmpl.badge}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {lang === "fr" ? tmpl.descFr : tmpl.descEn}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-2 border-t">
                    {requestStatus?.status === "SUCCEEDED" && requestStatus.download_url && (
                        <>
                            <Button
                                variant="outline"
                                className="gap-2 border-green-200 text-green-700 hover:bg-green-50"
                                onClick={() => window.open(requestStatus.download_url!, "_blank")}
                            >
                                <Download className="h-4 w-4" />
                                {t("pdf_download")}
                            </Button>
                            <Button
                                variant="outline"
                                className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                                onClick={() => sendEmailMutation.mutate()}
                                disabled={sendEmailMutation.isPending}
                            >
                                {sendEmailMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                {lang === "fr" ? "Envoyer par mail" : "Send by email"}
                            </Button>
                        </>
                    )}

                    <Button
                        onClick={() => generateMutation.mutate()}
                        disabled={isGenerating}
                        className="gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t("pdf_generating")}
                            </>
                        ) : (
                            <>
                                {requestStatus?.status === "SUCCEEDED"
                                    ? <RefreshCw className="h-4 w-4" />
                                    : <FileText className="h-4 w-4" />
                                }
                                {requestStatus?.status === "SUCCEEDED"
                                    ? (lang === "fr" ? "Regénérer" : "Regenerate")
                                    : t("pdf_generate")}
                            </>
                        )}
                    </Button>
                </div>

                {/* Status Alerts */}
                {requestStatus && (
                    <div className="space-y-2">
                        {requestStatus.status === "QUEUED" && (
                            <Alert>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <AlertTitle>{lang === "fr" ? "En file d'attente" : "Queued"}</AlertTitle>
                                <AlertDescription>
                                    {lang === "fr" ? "En attente de traitement…" : "Waiting for processing…"}
                                </AlertDescription>
                            </Alert>
                        )}
                        {requestStatus.status === "RUNNING" && (
                            <Alert>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <AlertTitle>{lang === "fr" ? "Génération en cours" : "Processing"}</AlertTitle>
                                <AlertDescription>
                                    {lang === "fr" ? "Construction du PDF en cours…" : "Building PDF…"}
                                </AlertDescription>
                            </Alert>
                        )}
                        {requestStatus.status === "SUCCEEDED" && (
                            <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertTitle className="text-green-800 dark:text-green-400">
                                    {lang === "fr" ? "PDF prêt" : "PDF ready"}
                                </AlertTitle>
                                <AlertDescription className="text-green-700 dark:text-green-500">
                                    {lang === "fr"
                                        ? "Le rapport a été généré avec succès. Cliquez sur Télécharger."
                                        : "Report generated successfully. Click Download."}
                                </AlertDescription>
                            </Alert>
                        )}
                        {requestStatus.status === "FAILED" && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>{lang === "fr" ? "Échec de génération" : "Generation failed"}</AlertTitle>
                                <AlertDescription>
                                    {requestStatus.error || (lang === "fr" ? "Erreur inconnue" : "Unknown error")}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
