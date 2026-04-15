
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MissionComplianceBundle } from "@/types/compliance";

interface ComplianceHeaderProps {
    bundle: MissionComplianceBundle;
}

export function ComplianceHeader({ bundle }: ComplianceHeaderProps) {
    const anomaliesCount = bundle.anomalies.length;
    const workItemsCount = bundle.work_items.filter(w => w.status === 'PENDING').length;
    const docsMissingCount = bundle.documents.filter(d => d.is_applicable && !d.is_provided).length;

    return (
        <div className="grid gap-4 md:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{anomaliesCount}</div>
                    <p className="text-xs text-muted-foreground">Open findings</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Work Items</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{workItemsCount}</div>
                    <p className="text-xs text-muted-foreground">Pending actions</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Documents</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{docsMissingCount}</div>
                    <p className="text-xs text-muted-foreground">Missing documents</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Attendees</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{bundle.attendees.length}</div>
                    <p className="text-xs text-muted-foreground">Registered</p>
                </CardContent>
            </Card>
        </div>
    );
}
