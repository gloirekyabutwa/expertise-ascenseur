
import { apiClient } from "@/lib/api/client";
import { PdfRenderRequest } from "@/lib/api/types";

export const pdfService = {
    generate: async (missionId: string, options?: { template_type?: string, include_photos?: boolean }): Promise<PdfRenderRequest> => {
        const response = await apiClient.post<PdfRenderRequest>(`/missions/${missionId}/generate-pdf`, options || {});
        return response.data;
    },

    getStatus: async (requestId: string): Promise<PdfRenderRequest> => {
        const response = await apiClient.get<PdfRenderRequest>(`/pdf-render/${requestId}`);
        return response.data;
    }
};
