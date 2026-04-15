
import { apiClient } from "@/lib/api/client";
import { Site } from "@/lib/api/types";

export const sitesService = {
    list: async (skip = 0, limit = 100): Promise<Site[]> => {
        const response = await apiClient.get<Site[]>("/sites/", { params: { skip, limit } });
        return response.data;
    },

    get: async (siteId: string): Promise<Site> => {
        const response = await apiClient.get<Site>(`/sites/${siteId}`);
        return response.data;
    },

    create: async (data: Partial<Site>): Promise<Site> => {
        const response = await apiClient.post<Site>("/sites/", data);
        return response.data;
    },

    update: async (siteId: string, data: Partial<Site>): Promise<Site> => {
        const response = await apiClient.patch<Site>(`/sites/${siteId}`, data);
        return response.data;
    }
};
