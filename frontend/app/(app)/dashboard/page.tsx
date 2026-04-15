"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Mission } from "@/lib/api/types";
import { DataTable } from "@/components/common/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    ClipboardList, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Activity,
    ArrowUpRight,
    TrendingUp
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from "recharts";

const columns: ColumnDef<Mission>[] = [
    {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => <span className="font-semibold text-primary">{row.getValue("title") || "Untitled"}</span>,
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            return (
                <Badge 
                    variant={status === "COMPLETED" ? "default" : status === "IN_PROGRESS" ? "secondary" : "outline"}
                    className={status === "COMPLETED" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                    {status}
                </Badge>
            );
        },
    },
    {
        accessorKey: "completed_at",
        header: "Completed Date",
        cell: ({ row }) => {
            const dateStr = row.getValue("completed_at") as string | null;
            if (!dateStr) return "-";
            return new Date(dateStr).toLocaleDateString();
        }
    },
    {
        id: "actions",
        cell: ({ row }) => {
            return (
                <Link href={`/missions/${row.original.id}`}>
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                        Open <ArrowUpRight className="h-3 w-3" />
                    </Button>
                </Link>
            );
        },
    },
];

export default function DashboardPage() {
    const { data: missions, isLoading: missionsLoading } = useQuery({
        queryKey: ["missions"],
        queryFn: async () => {
            const res = await apiClient.get("/missions/");
            return res.data as Mission[];
        },
    });

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ["dashboard-stats"],
        queryFn: async () => {
            const res = await apiClient.get("/dashboard/stats");
            return res.data;
        },
    });

    const totalMissions = stats?.activeMissions + stats?.completedMissions || missions?.length || 0;
    const completedMissions = stats?.completedMissions || missions?.filter((m: Mission) => m.status === "COMPLETED").length || 0;
    const inProgressMissions = stats?.activeMissions || missions?.filter((m: Mission) => m.status === "IN_PROGRESS").length || 0;
    const draftMissions = missions?.filter((m: Mission) => m.status === "DRAFT").length || 0;

    // Mock data for the chart, ideally this should come from historical stats
    const chartData = [
        { name: "Jan", interventions: 10, conformite: 80 },
        { name: "Fév", interventions: 15, conformite: 82 },
        { name: "Mar", interventions: 12, conformite: 85 },
        { name: "Avr", interventions: 20, conformite: 84 },
        { name: "Mai", interventions: 25, conformite: 88 },
        { name: "Juin", interventions: 18, conformite: 92 },
    ];

    return (
        <div className="flex flex-col gap-8 pb-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Vue d'ensemble</h1>
                <p className="text-muted-foreground">Bienvenue sur votre tableau de bord de contrôle technique.</p>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:border-blue-500/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Missions</CardTitle>
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalMissions}</div>
                        <p className="text-xs text-muted-foreground mt-1">Nombre total de contrôles créés</p>
                    </CardContent>
                </Card>
                <Card className="hover:border-green-500/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Terminées</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedMissions}</div>
                        <p className="text-xs text-muted-foreground mt-1">Rapports générés & signés</p>
                    </CardContent>
                </Card>
                <Card className="hover:border-blue-500/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">En Cours</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{inProgressMissions}</div>
                        <p className="text-xs text-muted-foreground mt-1">Visites sur site actives</p>
                    </CardContent>
                </Card>
                <Card className="hover:border-yellow-500/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Brouillons</CardTitle>
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{draftMissions}</div>
                        <p className="text-xs text-muted-foreground mt-1">Planification en attente</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
                {/* Recent Missions Table */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle>Dernières Missions</CardTitle>
                                <CardDescription>Liste des types de contrôles récemment effectués.</CardDescription>
                            </div>
                            <Link href="/missions">
                                <Button variant="outline" size="sm">Tout voir</Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {missionsLoading ? (
                            <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground italic">
                                Chargement des missions...
                            </div>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={missions?.slice(0, 5) || []}
                            />
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Activité & Conformité
                        </CardTitle>
                        <CardDescription>Évolution des interventions par mois.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {!statsLoading ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorInterventions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <Tooltip />
                                    <Area
                                        type="monotone"
                                        dataKey="interventions"
                                        stroke="#2563eb"
                                        fillOpacity={1}
                                        fill="url(#colorInterventions)"
                                        strokeWidth={2}
                                    />
                                    <Line type="monotone" dataKey="conformite" stroke="#16a34a" strokeWidth={2} dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                                <Activity className="h-12 w-12 text-muted-foreground/30 animate-pulse" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Chargement des données...</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
