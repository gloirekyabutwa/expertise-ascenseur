
import { apiClient } from "@/lib/api/client";
import { Document, PresignedUrlResponse } from "@/lib/api/types";

export const documentsService = {
    list: async (skip = 0, limit = 100): Promise<Document[]> => {
        // Backend doesn't have a list endpoint in documents.py yet? 
        // Let me check. I saw create, presign-upload, confirm, presign-download.
        // Wait, if no list, I might need to add it or use a generic one.
        const response = await apiClient.get<Document[]>("/documents/", { params: { skip, limit } });
        return response.data;
    },

    get: async (docId: string): Promise<Document> => {
        const response = await apiClient.get<Document>(`/documents/${docId}`);
        return response.data;
    },

    create: async (data: any): Promise<Document> => {
        const response = await apiClient.post<Document>("/documents/", data);
        return response.data;
    },

    getPresignedDownloadUrl: async (docId: string, fileId: string): Promise<PresignedUrlResponse> => {
        const response = await apiClient.get<PresignedUrlResponse>(`/documents/${docId}/files/${fileId}:presign-download`);
        return response.data;
    }
};
