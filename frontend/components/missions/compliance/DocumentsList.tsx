
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MissionDocumentProvided } from "@/types/compliance";
import { complianceService } from "@/services/compliance";
import { Loader2, FileText, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface DocumentsListProps {
    missionId: string;
    documents: MissionDocumentProvided[];
}

export function DocumentsList({ missionId, documents }: DocumentsListProps) {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [commentBuffer, setCommentBuffer] = useState<string>("");

    // Need a generic update endpoint for documents
    // Currently checking backend... we might need to add one if not exists.
    // Assuming POST /missions/{id}/documents for updates similar to checklist

    const updateMutation = useMutation({
        mutationFn: (newDocs: MissionDocumentProvided[]) =>
            complianceService.updateCompliance(missionId, { documents: newDocs }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["compliance", missionId] });
            setEditingId(null);
        }
    });

    const handleUpdate = (updatedDoc: MissionDocumentProvided) => {
        const newDocs = documents.map(d => d.id === updatedDoc.id ? updatedDoc : d);
        updateMutation.mutate(newDocs);
    };

    const handleToggleProvided = (doc: MissionDocumentProvided) => {
        handleUpdate({ ...doc, is_provided: !doc.is_provided });
    };

    const handleToggleApplicable = (doc: MissionDocumentProvided) => {
        handleUpdate({ ...doc, is_applicable: !doc.is_applicable });
    };

    const saveComment = (doc: MissionDocumentProvided) => {
        handleUpdate({ ...doc, comment: commentBuffer });
    };

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[300px]">Document</TableHead>
                        <TableHead className="w-[100px]">Applicable</TableHead>
                        <TableHead className="w-[100px]">Provided</TableHead>
                        <TableHead>Comment / Reference</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.map((doc) => (
                        <TableRow key={doc.id} className={!doc.is_applicable ? "opacity-50 bg-muted/30" : ""}>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    {doc.document_name}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Switch
                                    checked={doc.is_applicable}
                                    onCheckedChange={() => handleToggleApplicable(doc)}
                                />
                            </TableCell>
                            <TableCell>
                                <Switch
                                    checked={doc.is_provided}
                                    disabled={!doc.is_applicable}
                                    onCheckedChange={() => handleToggleProvided(doc)}
                                />
                            </TableCell>
                            <TableCell>
                                {editingId === doc.id ? (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            className="h-8"
                                            value={commentBuffer}
                                            onChange={(e) => setCommentBuffer(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") saveComment(doc);
                                                if (e.key === "Escape") setEditingId(null);
                                            }}
                                            autoFocus
                                        />
                                        <Button size="sm" onClick={() => saveComment(doc)}>Save</Button>
                                    </div>
                                ) : (
                                    <div
                                        className="min-h-[2rem] flex items-center cursor-pointer hover:bg-muted/50 rounded px-2 -ml-2"
                                        onClick={() => {
                                            if (!doc.is_applicable) return;
                                            setEditingId(doc.id);
                                            setCommentBuffer(doc.comment || "");
                                        }}
                                    >
                                        <span className="text-sm text-muted-foreground">
                                            {doc.comment || "Click to add comment..."}
                                        </span>
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
