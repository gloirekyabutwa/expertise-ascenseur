"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Tenant, User } from "@/lib/api/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
    Building2, Users, Wrench, FileText, Bell, 
    Save, Plus, Pencil, Trash2, ShieldCheck, 
    Globe, Phone, MapPin, Loader2, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { CERTIFICATION_BODIES, APE_CODES_ASCENSEURS } from "@/constants/elevator-specs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ─── Tenant Form ──────────────────────────────────────────────
const TenantSchema = z.object({
    name: z.string().min(1, "Requis"),
    siret: z.string().optional(),
    vat_id: z.string().optional(),
    capital: z.string().optional(),
    address: z.string().optional(),
    region: z.string().optional(),
    phone: z.string().optional(),
    fax: z.string().optional(),
    website: z.string().optional(),
    branding_logo_url: z.string().optional(),
    agencies: z.string().optional(),
    ape_code: z.string().optional(),
    legal_mentions: z.string().optional(),
});
type TenantFormValues = z.infer<typeof TenantSchema>;

function TenantProfileTab({ tenant }: { tenant: Tenant }) {
    const queryClient = useQueryClient();
    const [logoPreviewError, setLogoPreviewError] = useState(false);
    const { register, handleSubmit, watch, formState: { errors, isDirty } } = useForm<TenantFormValues>({
        resolver: zodResolver(TenantSchema),
        defaultValues: {
            name: tenant.name || "",
            siret: tenant.siret || "",
            vat_id: tenant.vat_id || "",
            capital: tenant.capital || "",
            address: tenant.address || "",
            region: tenant.region || "",
            phone: tenant.phone || "",
            fax: tenant.fax || "",
            website: tenant.website || "",
            branding_logo_url: tenant.branding_logo_url || "",
            agencies: tenant.agencies || "",
            ape_code: (tenant as any).ape_code || "",
            legal_mentions: (tenant as any).legal_mentions || "",
        }
    });

    const logoUrl = watch("branding_logo_url");

    const mutation = useMutation({
        mutationFn: (values: TenantFormValues) => apiClient.patch(`/tenants/${tenant.id}`, values),
        onSuccess: () => { toast.success("Profil entreprise mis à jour"); queryClient.invalidateQueries({ queryKey: ["current-tenant"] }); },
        onError: () => toast.error("Erreur lors de la mise à jour"),
    });

    return (
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
            {/* Logo preview */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-primary"/>Logo & Branding</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-6">
                    <div className="h-20 w-48 rounded-lg border-2 border-dashed border-muted flex items-center justify-center bg-muted/30 overflow-hidden">
                        {logoUrl && !logoPreviewError ? (
                            <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-2" onError={() => setLogoPreviewError(true)} />
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <Building2 className="h-8 w-8 mx-auto mb-1 opacity-30" />
                                <p className="text-xs">Aperçu logo</p>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-2">
                        <Label>URL du Logo (apparaît sur les rapports PDF)</Label>
                        <Input {...register("branding_logo_url")} placeholder="https://example.com/logo.png" onChange={() => setLogoPreviewError(false)} />
                        <p className="text-xs text-muted-foreground">Format recommandé : PNG transparent, 300×100px minimum</p>
                    </div>
                </CardContent>
            </Card>

            {/* Identité légale */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary"/>Identité Légale</CardTitle>
                    <CardDescription>Ces informations apparaissent dans l'en-tête et pied de page des rapports CTQ.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                        <Label>Raison sociale *</Label>
                        <Input {...register("name")} placeholder="SAS Ascenseurs Express" />
                        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label>SIRET</Label>
                        <Input {...register("siret")} placeholder="123 456 789 00012" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>N° TVA Intracommunautaire</Label>
                        <Input {...register("vat_id")} placeholder="FR 12 345678912" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Capital social</Label>
                        <Input {...register("capital")} placeholder="50 000 €" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Code APE</Label>
                        <Input {...register("ape_code")} placeholder="43.29B" list="ape-codes" />
                        <datalist id="ape-codes">
                            {APE_CODES_ASCENSEURS.map(a => <option key={a.code} value={a.code} label={a.label} />)}
                        </datalist>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <Label>Mentions légales</Label>
                        <textarea {...register("legal_mentions")} rows={2} placeholder="SA au capital de 50 000€, RCS Paris 123 456 789..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                    </div>
                </CardContent>
            </Card>

            {/* Coordonnées */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary"/>Coordonnées & Contact</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                        <Label>Adresse du siège</Label>
                        <Input {...register("address")} placeholder="12 Rue de la République, 75001 Paris" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Région / Département</Label>
                        <Input {...register("region")} placeholder="Île-de-France" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Agences</Label>
                        <Input {...register("agencies")} placeholder="Paris • Lyon • Bordeaux • Marseille" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5"/>Téléphone</Label>
                        <Input {...register("phone")} placeholder="+33 1 23 45 67 89" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Fax</Label>
                        <Input {...register("fax")} placeholder="+33 1 23 45 67 90" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <Label className="flex items-center gap-1"><Globe className="h-3.5 w-3.5"/>Site web</Label>
                        <Input {...register("website")} placeholder="https://www.ascenseurs-express.com" />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={mutation.isPending || !isDirty} className="gap-2">
                    {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Enregistrer les modifications
                </Button>
            </div>
        </form>
    );
}

// ─── Users Tab ────────────────────────────────────────────────
function UsersTab() {
    const { data: users, isLoading } = useQuery<User[]>({
        queryKey: ["users"],
        queryFn: () => apiClient.get("/users/").then(r => r.data),
    });

    const ROLE_COLORS: Record<string, string> = {
        ADMIN: "bg-red-100 text-red-700 border-red-200",
        TECHNICIAN: "bg-blue-100 text-blue-700 border-blue-200",
        VIEWER: "bg-gray-100 text-gray-600 border-gray-200",
    };
    const ROLE_LABELS: Record<string, string> = {
        ADMIN: "Administrateur",
        TECHNICIAN: "Technicien",
        VIEWER: "Consulteur",
    };

    if (isLoading) return <Skeleton className="h-64 w-full" />;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Membres de l'équipe</h3>
                    <p className="text-sm text-muted-foreground">{users?.length || 0} utilisateur(s) actif(s)</p>
                </div>
                <Button className="gap-2" size="sm">
                    <Plus className="h-4 w-4" /> Inviter un membre
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {users?.map(user => (
                            <div key={user.id} className="flex items-center justify-between px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                                        {(user.full_name || user.email).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{user.full_name || "—"}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${ROLE_COLORS[user.role] || "bg-gray-100"}`}>
                                        {ROLE_LABELS[user.role] || user.role}
                                    </span>
                                    <span className={`h-2 w-2 rounded-full ${user.is_active ? "bg-green-500" : "bg-gray-300"}`} title={user.is_active ? "Actif" : "Inactif"} />
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-muted">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Référentiel des rôles</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-3 text-sm">
                    <div className="space-y-1">
                        <span className="font-semibold text-red-700">Administrateur</span>
                        <p className="text-xs text-muted-foreground">Accès complet + gestion équipe, paramètres</p>
                    </div>
                    <div className="space-y-1">
                        <span className="font-semibold text-blue-700">Technicien</span>
                        <p className="text-xs text-muted-foreground">Saisie terrain, checklist, anomalies, PDF</p>
                    </div>
                    <div className="space-y-1">
                        <span className="font-semibold text-gray-600">Consulteur</span>
                        <p className="text-xs text-muted-foreground">Lecture seule, téléchargement rapports</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Service Types Tab ────────────────────────────────────────
function ServiceTypesTab() {
    const { data: serviceTypes, isLoading } = useQuery<any[]>({
        queryKey: ["service-types"],
        queryFn: () => apiClient.get("/service-types/").then(r => r.data),
    });

    const MANDATORY_TYPES = ["CTQ-5", "CTQ-2.5", "VTP", "RAAT", "ETQ"];

    if (isLoading) return <Skeleton className="h-64 w-full" />;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Types de contrôle</h3>
                    <p className="text-sm text-muted-foreground">Référentiel des prestations techniques</p>
                </div>
                <Button className="gap-2" size="sm">
                    <Plus className="h-4 w-4" /> Ajouter un type
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {serviceTypes?.map(st => (
                            <div key={st.id} className="flex items-center justify-between px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <FileText className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-sm">{st.label}</p>
                                            <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{st.code}</span>
                                            {MANDATORY_TYPES.includes(st.code) && (
                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-200">Réglementaire</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {st.code === "CTQ-5" && "Contrôle quinquennal — Décret 2004-964"}
                                            {st.code === "CTQ-2.5" && "Contrôle intermédiaire 2,5 ans"}
                                            {st.code === "VTP" && "Visite Technique Périodique"}
                                            {st.code === "RAAT" && "Rapport Annuel d'Anomalies Techniques"}
                                            {st.code === "ETQ" && "Examen Technique Quinquennal"}
                                            {!["CTQ-5","CTQ-2.5","VTP","RAAT","ETQ"].includes(st.code) && "Prestation personnalisée"}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Info réglementaire */}
            <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-4 pb-4">
                    <div className="flex gap-3">
                        <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                            <p className="font-semibold text-blue-800">Cadre réglementaire (Décret n°2004-964)</p>
                            <p className="text-blue-700 text-xs mt-1">
                                Le Contrôle Technique Quinquennal (CTQ) est obligatoire tous les 5 ans depuis 2005 
                                pour tout ascenseur d'immeuble collectif. Il doit être réalisé par un organisme 
                                accrédité COFRAC ou équivalent.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Notifications Tab ────────────────────────────────────────
function NotificationsTab() {
    const [notifications, setNotifications] = useState([
        { id: "pdf", label: "Rapport PDF généré", desc: "Réception du lien de téléchargement par email", enabled: true },
        { id: "mission", label: "Mission créée", desc: "Notification à l'équipe lors de toute nouvelle mission", enabled: false },
        { id: "critical", label: "Anomalie critique détectée", desc: "Alerte immédiate si sévérité CRITICAL enregistrée", enabled: true },
        { id: "ctq", label: "Rappel CTQ à venir", desc: "J-30 avant l'échéance du prochain contrôle", enabled: true },
        { id: "doc", label: "Document manquant", desc: "Rappel si des pièces obligatoires ne sont pas fournies", enabled: false },
    ]);

    const toggleNotification = (id: string) => {
        setNotifications(prev => prev.map(n => 
            n.id === id ? { ...n, enabled: !n.enabled } : n
        ));
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Notifications par email</CardTitle>
                    <CardDescription>Configurer les alertes automatiques</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {notifications.map((notif) => (
                        <div key={notif.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium">{notif.label}</p>
                                <p className="text-xs text-muted-foreground">{notif.desc}</p>
                            </div>
                            <div 
                                onClick={() => toggleNotification(notif.id)}
                                className={`w-10 h-5 rounded-full cursor-pointer transition-colors ${notif.enabled ? "bg-primary" : "bg-muted"} flex items-center`}
                            >
                                <div className={`h-4 w-4 rounded-full bg-white shadow mx-0.5 transition-transform ${notif.enabled ? "translate-x-5" : "translate-x-0"}`} />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground text-center">
                La gestion complète des notifications sera disponible dans la prochaine version.
            </p>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────
export default function SettingsPage() {
    const { data: user } = useQuery({
        queryKey: ["auth-me"],
        queryFn: () => apiClient.get("/users/me").then(r => r.data),
    });

    const { data: tenant, isLoading } = useQuery<Tenant>({
        queryKey: ["current-tenant", user?.tenant_id],
        queryFn: () => apiClient.get<Tenant>(`/tenants/${user.tenant_id}`).then(r => r.data),
        enabled: !!user?.tenant_id,
    });

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Configuration de votre espace de contrôle technique.
                </p>
            </div>

            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50 border">
                    <TabsTrigger value="profile" className="gap-2 py-2.5">
                        <Building2 className="h-4 w-4" /> Profil Entreprise
                    </TabsTrigger>
                    <TabsTrigger value="team" className="gap-2 py-2.5">
                        <Users className="h-4 w-4" /> Équipe
                    </TabsTrigger>
                    <TabsTrigger value="services" className="gap-2 py-2.5">
                        <Wrench className="h-4 w-4" /> Types de Contrôle
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2 py-2.5">
                        <Bell className="h-4 w-4" /> Notifications
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                    {isLoading || !tenant ? (
                        <div className="space-y-4">
                            <Skeleton className="h-40 w-full" />
                            <Skeleton className="h-64 w-full" />
                        </div>
                    ) : (
                        <TenantProfileTab tenant={tenant} />
                    )}
                </TabsContent>

                <TabsContent value="team">
                    <UsersTab />
                </TabsContent>

                <TabsContent value="services">
                    <ServiceTypesTab />
                </TabsContent>

                <TabsContent value="notifications">
                    <NotificationsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
