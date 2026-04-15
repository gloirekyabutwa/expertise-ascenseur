
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface MissionContextType {
    isDirty: boolean;
    setIsDirty: (dirty: boolean) => void;
    missionId: string | null;
    setMissionId: (id: string | null) => void;
}

const MissionContext = createContext<MissionContextType | undefined>(undefined);

export function MissionProvider({ children }: { children: React.ReactNode }) {
    const [isDirty, setIsDirty] = useState(false);
    const [missionId, setMissionId] = useState<string | null>(null);

    // Warn user before leaving if dirty
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    return (
        <MissionContext.Provider value={{ isDirty, setIsDirty, missionId, setMissionId }}>
            {children}
        </MissionContext.Provider>
    );
}

export function useMissionContext() {
    const context = useContext(MissionContext);
    if (context === undefined) {
        throw new Error("useMissionContext must be used within a MissionProvider");
    }
    return context;
}
