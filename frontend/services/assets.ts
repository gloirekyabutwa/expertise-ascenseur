
import { apiClient } from "@/lib/api/client";
import { Asset } from "@/lib/api/types";

export const assetsService = {
    list: async (skip = 0, limit = 100): Promise<Asset[]> => {
        const response = await apiClient.get<Asset[]>("/assets/", { params: { skip, limit } });
        return response.data;
    },

    getBySite: async (siteId: string): Promise<Asset[]> => {
        const response = await apiClient.get<Asset[]>("/assets/", { params: { site_id: siteId } });
        return response.data;
    },

    get: async (assetId: string): Promise<Asset> => {
        const response = await apiClient.get<Asset>(`/assets/${assetId}`);
        return response.data;
    },

    create: async (data: Partial<Asset>): Promise<Asset> => {
        const response = await apiClient.post<Asset>("/assets/", data);
        return response.data;
    },

    update: async (assetId: string, data: Partial<Asset>): Promise<Asset> => {
        const response = await apiClient.patch<Asset>(`/assets/${assetId}`, data);
        return response.data;
    }
};
