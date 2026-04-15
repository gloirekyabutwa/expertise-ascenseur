import { MissionForm } from "@/components/missions/MissionForm";

export default function NewMissionPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">New Mission</h1>
            <MissionForm />
        </div>
    );
}
