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
import { useAuth } from "@/hooks/useAuth";
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
    const { user } = useAuth();
    const tenantId = user?.tenant_id;

    const { data: missions, isLoading: missionsLoading } = useQuery({
        queryKey: ["missions", tenantId],
        queryFn: async () => {
            const res = await apiClient.get("/missions/");
            return res.data as Mission[];
        },
        enabled: !!tenantId,
    });

    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ["dashboard-stats", tenantId],
        queryFn: async () => {
            const res = await apiClient.get("/dashboard/stats");
            return res.data;
        },
        enabled: !!tenantId,
    });

    const stats = statsData?.stats;
    const charts = statsData?.charts;

    const totalMissions = (stats?.activeMissions || 0) + (stats?.completedMissions || 0) || missions?.length || 0;
    const activeMissions = stats?.activeMissions || 0;
    const openAnomalies = stats?.openAnomalies || 0;
    const totalAssets = stats?.totalAssets || 0;

    return (
        <div className="flex flex-col gap-8 pb-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                    Tableau de Bord
                </h1>
                <p className="text-muted-foreground text-lg">
                    Analyse en temps réel de la conformité de votre parc d'ascenseurs.
                </p>
            </div>

            {/* KPIs - Bento Style */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="relative overflow-hidden group border-none bg-gradient-to-br from-blue-500/10 to-blue-600/5 shadow-sm ring-1 ring-blue-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-blue-700">Parc Équipements</CardTitle>
                        <Activity className="h-5 w-5 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalAssets}</div>
                        <p className="text-xs text-blue-600/70 mt-1 font-medium">Appareils sous contrat</p>
                        <div className="absolute bottom-0 right-0 p-2 opacity-5">
                            <Activity className="h-24 w-24" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-none bg-gradient-to-br from-amber-500/10 to-amber-600/5 shadow-sm ring-1 ring-amber-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-amber-700">Interventions</CardTitle>
                        <Clock className="h-5 w-5 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{activeMissions}</div>
                        <p className="text-xs text-amber-600/70 mt-1 font-medium">Missions en cours</p>
                        <div className="absolute bottom-0 right-0 p-2 opacity-5">
                            <Clock className="h-24 w-24" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-none bg-gradient-to-br from-red-500/10 to-red-600/5 shadow-sm ring-1 ring-red-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-red-700">Anomalies Ouvertes</CardTitle>
                        <AlertCircle className="h-5 w-5 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{openAnomalies}</div>
                        <p className="text-xs text-red-600/70 mt-1 font-medium">Points de non-conformité</p>
                        <div className="absolute bottom-0 right-0 p-2 opacity-5">
                            <AlertCircle className="h-24 w-24" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-none bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 shadow-sm ring-1 ring-emerald-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold text-emerald-700">Score Conformité</CardTitle>
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">{stats?.complianceScore || 0}%</div>
                        <p className="text-xs text-emerald-600/70 mt-1 font-medium">Santé globale du parc</p>
                        <div className="absolute bottom-0 right-0 p-2 opacity-5">
                            <CheckCircle2 className="h-24 w-24" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Activité Graph */}
                <Card className="shadow-sm border-none bg-card/50 ring-1 ring-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Activité des Interventions
                        </CardTitle>
                        <CardDescription>Volume de missions planifiées par mois.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {!statsLoading && charts?.missionsByMonth ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={charts.missionsByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorMissions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        name="Missions"
                                        stroke="#2563eb"
                                        fillOpacity={1}
                                        fill="url(#colorMissions)"
                                        strokeWidth={3}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground/50 italic">
                                Chargement des données d'activité...
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Anomalies par Site */}
                <Card className="shadow-sm border-none bg-card/50 ring-1 ring-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            Points de Vigilance par Site
                        </CardTitle>
                        <CardDescription>Top 5 des sites avec le plus grand nombre d'anomalies ouvertes.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {!statsLoading && charts?.anomaliesBySite ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={charts.anomaliesBySite} layout="vertical" margin={{ left: 40, right: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="site" type="category" fontSize={11} width={80} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground/50 italic">
                                Chargement des alertes par site...
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                {/* Distribution Assets */}
                <Card className="shadow-sm border-none bg-card/50 ring-1 ring-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Parc par Technologie</CardTitle>
                        <CardDescription>Répartition par type d'appareil.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        {!statsLoading && charts?.assetsByType ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={charts.assetsByType}>
                                    <XAxis dataKey="type" hide />
                                    <Tooltip />
                                    <Area type="step" dataKey="count" stroke="#2563eb" fill="#2563eb10" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground/50 italic">
                                Chargement du parc...
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Anomalies Severity - Simplifié */}
                <Card className="lg:col-span-2 shadow-sm border-none bg-card/50 ring-1 ring-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Sévérité des Anomalies</CardTitle>
                        <CardDescription>Distribution par niveau de criticité (Points de contrôle non-conformes).</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-[250px]">
                        {!statsLoading && charts?.anomaliesBySeverity ? (
                            <div className="flex flex-wrap gap-8 items-center justify-center w-full">
                                {charts.anomaliesBySeverity.map((item: any, i: number) => (
                                    <div key={i} className="flex flex-col items-center gap-2">
                                        <div className={`text-3xl font-bold ${item.severity === 'CRITICAL' ? 'text-red-600' :
                                            item.severity === 'MAJOR' ? 'text-amber-600' : 'text-blue-600'
                                            }`}>
                                            {item.count}
                                        </div>
                                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            {item.severity}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="italic text-muted-foreground/50">Chargement des criticités...</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
