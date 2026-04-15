"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SidebarContextType {
    collapsed: boolean;
    setCollapsed: (v: boolean) => void;
    toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
    collapsed: false,
    setCollapsed: () => {},
    toggle: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsedState] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("ctq-sidebar-collapsed");
        if (stored === "true") setCollapsedState(true);
    }, []);

    const setCollapsed = (v: boolean) => {
        setCollapsedState(v);
        localStorage.setItem("ctq-sidebar-collapsed", String(v));
    };

    const toggle = () => setCollapsed(!collapsed);

    return (
        <SidebarContext.Provider value={{ collapsed, setCollapsed, toggle }}>
            {children}
        </SidebarContext.Provider>
    );
}

export const useSidebar = () => useContext(SidebarContext);
