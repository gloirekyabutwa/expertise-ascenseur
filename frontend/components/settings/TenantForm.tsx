"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/api/client";
import { Tenant, TenantSchema } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Schema for the form, based on TenantSchema but allowing optionals for update
const TenantFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    address: z.string().optional(),
    region: z.string().optional(),
    phone: z.string().optional(),
    fax: z.string().optional(),
    website: z.string().optional(),
    siret: z.string().optional(),
    capital: z.string().optional(),
    vat_id: z.string().optional(),
    branding_logo_url: z.string().url().optional().or(z.literal("")),
    agencies: z.string().optional(),
});

type TenantFormValues = z.infer<typeof TenantFormSchema>;

interface TenantFormProps {
    tenant: Tenant;
}

export function TenantForm({ tenant }: TenantFormProps) {
    const queryClient = useQueryClient();

    const form = useForm<TenantFormValues>({
        resolver: zodResolver(TenantFormSchema),
        defaultValues: {
            name: tenant.name,
            address: tenant.address || "",
            region: tenant.region || "",
            phone: tenant.phone || "",
            fax: tenant.fax || "",
            website: tenant.website || "",
            siret: tenant.siret || "",
            capital: tenant.capital || "",
            vat_id: tenant.vat_id || "",
            branding_logo_url: tenant.branding_logo_url || "",
            agencies: tenant.agencies || "",
        },
    });

    const mutation = useMutation({
        mutationFn: async (values: TenantFormValues) => {
            const res = await apiClient.put<Tenant>(`/tenants/${tenant.id}`, values);
            return res.data;
        },
        onSuccess: (data) => {
            toast.success("Settings updated successfully");
            queryClient.invalidateQueries({ queryKey: ["current-tenant"] });
        },
        onError: (error: any) => {
            toast.error("Failed to update settings", { description: error.message });
        }
    });

    function onSubmit(values: TenantFormValues) {
        mutation.mutate(values);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Company Details</CardTitle>
                <CardDescription>
                    These details will appear on your PDF reports.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Company Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Acme Corp" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="siret"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SIRET</FormLabel>
                                        <FormControl>
                                            <Input placeholder="123 456 789 00012" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="vat_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>VAT ID (TVA Intra)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="FR123456789" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="capital"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Share Capital</FormLabel>
                                        <FormControl>
                                            <Input placeholder="10 000 €" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Headquarters Address</FormLabel>
                                        <FormControl>
                                            <Input placeholder="123 Main St, Paris" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="region"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Region</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Île-de-France" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="agencies"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Agencies List</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Paris - Lyon - Bordeaux" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+33 1 23 45 67 89" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="website"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Website</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="branding_logo_url"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>Logo URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="https://example.com/logo.png" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
