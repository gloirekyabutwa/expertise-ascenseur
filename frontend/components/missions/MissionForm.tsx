"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { CreateMissionSchema, Site, ServiceType, Mission, Asset } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type MissionFormValues = z.infer<typeof CreateMissionSchema>;

export function MissionForm() {
    const router = useRouter();
    const queryClient = useQueryClient();

    // Fetch dependencies for selects
    const form = useForm<MissionFormValues>({
        // @ts-ignore
        resolver: zodResolver(CreateMissionSchema) as any,
        defaultValues: {
            title: "",
            status: "DRAFT",
            service_type_id: "",
            site_id: "",
            asset_id: "",
            client_reference: "",
            certification_number: "",
        },
    });

    const selectedSiteId = form.watch("site_id");

    // Fetch dependencies for selects
    const { data: sites } = useQuery({
        queryKey: ["sites"],
        queryFn: async () => {
            const res = await apiClient.get<Site[]>("/sites/");
            return res.data;
        }
    });

    const { data: serviceTypes } = useQuery({
        queryKey: ["service-types"],
        queryFn: async () => {
            try {
                const res = await apiClient.get<ServiceType[]>("/service-types/");
                return res.data;
            } catch (e) {
                return [];
            }
        }
    });

    const { data: assets } = useQuery({
        queryKey: ["assets", selectedSiteId],
        queryFn: async () => {
            if (!selectedSiteId) return [];
            const res = await apiClient.get<Asset[]>(`/assets/?site_id=${selectedSiteId}`);
            return res.data;
        },
        enabled: !!selectedSiteId
    });

    const mutation = useMutation({
        mutationFn: async (values: MissionFormValues) => {
            const res = await apiClient.post<Mission>("/missions/", values);
            return res.data;
        },
        onSuccess: (data) => {
            toast.success("Mission created successfully");
            queryClient.invalidateQueries({ queryKey: ["missions"] });
            router.push(`/missions/${data.id}`);
        },
        onError: (error: any) => {
            toast.error("Failed to create mission", { description: error.message });
        }
    });

    function onSubmit(values: MissionFormValues) {
        mutation.mutate(values);
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Create New Mission</CardTitle>
                <CardDescription>Enter the details for the new inspection mission.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mission Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Annual Inspection - Building A" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="service_type_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Service Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {serviceTypes?.map((st) => (
                                                    <SelectItem key={st.id} value={st.id}>
                                                        {st.label} ({st.code})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="site_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Site</FormLabel>
                                        <Select
                                            onValueChange={(val) => {
                                                field.onChange(val);
                                                form.setValue("asset_id", ""); // Reset asset when site changes
                                            }}
                                            defaultValue={field.value || undefined}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select site" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {sites?.map((site) => (
                                                    <SelectItem key={site.id} value={site.id}>
                                                        {site.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="asset_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Appareil (Optionnel)</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || ""}
                                            disabled={!selectedSiteId}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={selectedSiteId ? "Sélectionner un appareil" : "Choisir un site d'abord"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {assets?.length === 0 && (
                                                    <div className="py-2 px-4 text-sm text-muted-foreground italic">
                                                        Aucun appareil sur ce site
                                                    </div>
                                                )}
                                                {assets?.map((asset) => (
                                                    <SelectItem key={asset.id} value={asset.id}>
                                                        {asset.label} ({asset.installation_number || asset.serial_number || "S/N inconnu"})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                            <FormField
                                control={form.control}
                                name="client_reference"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Client Reference</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ref. 12345" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="certification_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Certification Number</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Cert. ABC-99" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Mission
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
