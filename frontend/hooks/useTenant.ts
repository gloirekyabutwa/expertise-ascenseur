import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TenantState {
    tenantId: string | null;
    setTenantId: (id: string) => void;
    clearTenantId: () => void;
}

// Simple Zustand store for Tenant ID, persisted in localStorage
import { createJSONStorage, StateStorage } from 'zustand/middleware';

const noopStorage: StateStorage = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { },
};

export const useTenantStore = create<TenantState>()(
    persist(
        (set) => ({
            tenantId: null,
            setTenantId: (id) => {
                set({ tenantId: id });
                // Also update localStorage directly for the Axios interceptor if needed immediately
                // (Zustand persist does it async/sync depending on config, but reliable enough)
                if (typeof window !== 'undefined') {
                    localStorage.setItem('selected_tenant_id', id);
                }
            },
            clearTenantId: () => {
                set({ tenantId: null });
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('selected_tenant_id');
                }
            },
        }),
        {
            name: 'tenant-storage', // unique name
            storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : noopStorage)),
            skipHydration: true,
        }
    )
);

export const useTenant = () => {
    const { tenantId, setTenantId, clearTenantId } = useTenantStore();
    return { tenantId, setTenantId, clearTenantId };
};
