"use client";

import { useQuery } from "@tanstack/react-query";
import { documentsService } from "@/services/documents";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/common/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, FileArchive, Search, Filter } from "lucide-react";
import { Document, DocumentFile } from "@/lib/api/types";
import { Input } from "@/components/ui/input";

const columns: ColumnDef<Document>[] = [
    {
        accessorKey: "title",
        header: "Document",
        cell: ({ row }) => (
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <FileText className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                    <span className="font-semibold">{row.getValue("title") || "Document sans titre"}</span>
                    <span className="text-xs text-muted-foreground">{row.original.doc_type}</span>
                </div>
            </div>
        ),
    },
    {
        accessorKey: "doc_type",
        header: "Type",
        cell: ({ row }) => <Badge variant="outline">{row.getValue("doc_type")}</Badge>,
    },
    {
        id: "filesCount",
        header: "Fichiers",
        cell: ({ row }) => row.original.files?.length || 0,
    },
    {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            return (
                <Badge 
                    variant={status === "PUBLISHED" ? "default" : "secondary"}
                >
                    {status}
                </Badge>
            );
        },
    },
    {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
            const handleDownload = async () => {
                if (row.original.files && row.original.files.length > 0) {
                    const file = row.original.files[0];
                    try {
                        const { url } = await documentsService.getPresignedDownloadUrl(row.original.id, file.id);
                        window.open(url, "_blank");
                    } catch (err) {
                        console.error("Failed to download file", err);
                    }
                }
            };

            return (
                <div className="flex items-center gap-2">
                     <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={handleDownload}
                        disabled={!row.original.files?.length}
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            );
        },
    },
];

export default function DocumentsPage() {
    const { data: documents, isLoading } = useQuery({
        queryKey: ["documents"],
        queryFn: () => documentsService.list(),
    });

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
                    <p className="text-muted-foreground text-sm">Gérez et consultez tous les fichiers et rapports techniques.</p>
                </div>
                <Button className="gap-2">
                    <FileArchive className="h-4 w-4" /> Archivage Global
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle>Référentiel Documentaire</CardTitle>
                            <CardDescription>Tous les documents importés ou générés par vos missions.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher un document..."
                                    className="pl-8 w-[250px]"
                                />
                            </div>
                            <Button variant="outline" size="icon">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="h-[400px] flex items-center justify-center text-sm text-muted-foreground italic">
                            Chargement du référentiel...
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={documents || []}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
