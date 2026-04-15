
"use client";

import { useState } from "react";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { MissionAttendee } from "@/types/compliance";
import { complianceService } from "@/services/compliance";
import { Loader2, Plus, Pencil, Trash2, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ATTENDEE_ROLES } from "@/constants/elevator-specs";

interface AttendeesListProps {
    missionId: string;
    attendees: MissionAttendee[];
}

export function AttendeesList({ missionId, attendees }: AttendeesListProps) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const [formData, setFormData] = useState<Partial<MissionAttendee>>({
        full_name: "",
        role: "",
        company: "",
        is_present: true
    });

    const updateMutation = useMutation({
        mutationFn: (newAttendees: MissionAttendee[]) =>
            complianceService.updateCompliance(missionId, { attendees: newAttendees }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["compliance", missionId] });
            setIsOpen(false);
            resetForm();
        }
    });

    const resetForm = () => {
        setFormData({ full_name: "", role: "", company: "", is_present: true });
        setEditingIndex(null);
    };

    const handleEdit = (attendee: MissionAttendee, index: number) => {
        setEditingIndex(index);
        setFormData({ ...attendee });
        setIsOpen(true);
    };

    const handleDelete = (index: number) => {
        if (confirm("Delete this attendee?")) {
            const newAttendees = attendees.filter((_, i) => i !== index);
            updateMutation.mutate(newAttendees);
        }
    };

    const handleSubmit = () => {
        if (!formData.full_name) return;

        let newAttendees = [...attendees];
        if (editingIndex !== null) {
            newAttendees[editingIndex] = { ...newAttendees[editingIndex], ...formData } as MissionAttendee;
        } else {
            // New attendee logic (backend will assign ID)
            newAttendees.push(formData as MissionAttendee);
        }

        updateMutation.mutate(newAttendees);
    };

    const isSaving = updateMutation.isPending;

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => { resetForm(); setIsOpen(true); }} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Attendee
                </Button>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom Complet</TableHead>
                            <TableHead>Rôle</TableHead>
                            <TableHead>Organisme / Entreprise</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {attendees.map((attendee, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        {attendee.full_name}
                                    </div>
                                </TableCell>
                                <TableCell>{attendee.role}</TableCell>
                                <TableCell>{attendee.company || "-"}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(attendee, index)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {attendees.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                    No attendees recorded.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingIndex !== null ? "Edit Attendee" : "Add Attendee"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Full Name</label>
                            <Input
                                value={formData.full_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Rôle</Label>
                            <Select
                                value={formData.role || ""}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, role: val }))}
                            >
                                <SelectTrigger><SelectValue placeholder="Sélectionner un rôle..." /></SelectTrigger>
                                <SelectContent>
                                    {ATTENDEE_ROLES.map(r => (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Company</label>
                            <Input
                                value={formData.company}
                                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                                placeholder="e.g. Acme Corp"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isSaving || !formData.full_name}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
