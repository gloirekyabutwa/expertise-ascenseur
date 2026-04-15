"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ShieldCheck, ChevronDown, Loader2 } from "lucide-react";

// Schema for login form
const formSchema = z.object({
    email: z.string().email("Adresse email invalide"),
    password: z.string().min(1, "Le mot de passe est requis"),
    tenantId: z.string().uuid("ID de tenant invalide"),
});

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const { setTenantId } = useTenant();
    const [isLoading, setIsLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Default values matched for MVP demonstration
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "admin@ascenseurs-express.com",
            password: "admin123",
            tenantId: "7327c495-606c-45c4-8896-416dd6a46367",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            setTenantId(values.tenantId);
            await login({ email: values.email, password: values.password });
            toast.success("Connexion réussie");
            router.push("/dashboard");
        } catch (error: any) {
            toast.error("Échec de la connexion", {
                description: error?.message || "Identifiants invalides",
            });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4 selection:bg-blue-500/30 relative overflow-hidden">
            
            {/* Animated Background subtle gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none animate-pulse duration-10000" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none animate-pulse duration-7000" />

            <div className="w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl shadow-blue-900/5 border border-slate-100 dark:border-zinc-800/80 p-8 sm:p-10 animate-in fade-in zoom-in-95 duration-500">
                
                {/* Logo & Header */}
                <div className="flex flex-col items-center text-center space-y-4 mb-8">
                    <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-inner shadow-white/20 ring-4 ring-blue-50 dark:ring-zinc-800">
                        <ShieldCheck className="h-7 w-7 text-white" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Bienvenue sur CTQ</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Connectez-vous à votre espace technique
                        </p>
                    </div>
                </div>

                {/* Form */}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Email professionnel
                                    </FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="nom@entreprise.com" 
                                            className="h-11 bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 focus-visible:ring-blue-500/50"
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex justify-between items-center">
                                        <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Mot de passe
                                        </FormLabel>
                                        <button 
                                            type="button"
                                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline"
                                        >
                                            Oublié ?
                                        </button>
                                    </div>
                                    <FormControl>
                                        <Input 
                                            type="password" 
                                            placeholder="••••••••" 
                                            className="h-11 bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 focus-visible:ring-blue-500/50"
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Advanced Settings Toggle */}
                        <div className="pt-1">
                            <button 
                                type="button" 
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors rounded-lg overflow-hidden"
                            >
                                Identifiant Organisation (Tenant)
                                <ChevronDown className={`h-3 w-3 transition-transform duration-300 ${showAdvanced ? "rotate-180" : ""}`} />
                            </button>
                            
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showAdvanced ? "max-h-24 opacity-100 mt-2" : "max-h-0 opacity-0"}`}>
                                <FormField
                                    control={form.control}
                                    name="tenantId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input 
                                                    className="h-9 text-xs font-mono bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-center" 
                                                    placeholder="Tenant UUID" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <Button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full h-11 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600 active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Connexion en cours...
                                </span>
                            ) : (
                                "Se connecter"
                            )}
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}
