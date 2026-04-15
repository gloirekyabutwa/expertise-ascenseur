import { apiClient } from "@/lib/api/client";

export interface MissionPhoto {
    id: string;
    mission_id: string;
    object_key: string;
    filename?: string | null;
    mime_type?: string | null;
    size_bytes?: number | null;
    description?: string | null;
    checklist_result_id?: string | null;
    anomaly_id?: string | null;
    captured_at?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    url?: string | null;
}

export const photosService = {
    /**
     * Upload a photo for a mission
     */
    upload: async (
        missionId: string, 
        file: File, 
        metadata?: { 
            description?: string;
            checklist_result_id?: string;
            anomaly_id?: string;
            captured_at?: string;
            latitude?: number;
            longitude?: number;
        }
    ): Promise<MissionPhoto> => {
        const formData = new FormData();
        formData.append("file", file);
        
        if (metadata) {
            if (metadata.description) formData.append("description", metadata.description);
            if (metadata.checklist_result_id) formData.append("checklist_result_id", metadata.checklist_result_id);
            if (metadata.anomaly_id) formData.append("anomaly_id", metadata.anomaly_id);
            if (metadata.captured_at) formData.append("captured_at", metadata.captured_at);
            if (metadata.latitude !== undefined) formData.append("latitude", metadata.latitude.toString());
            if (metadata.longitude !== undefined) formData.append("longitude", metadata.longitude.toString());
        }

        const response = await apiClient.post<MissionPhoto>(`/missions/${missionId}/photos`, formData, {
            headers: {
                // Must ensure apiClient knows it's form data, usually axios handles this if headers are unset
                // Axios will automatically set the Content-Type to multipart/form-data
                "Content-Type": "multipart/form-data"
            }
        });
        return response.data;
    },

    /**
     * Get all photos for a mission
     */
    listByMission: async (missionId: string): Promise<MissionPhoto[]> => {
        const response = await apiClient.get<MissionPhoto[]>(`/missions/${missionId}/photos`);
        return response.data;
    },

    /**
     * Delete a photo
     */
    delete: async (photoId: string): Promise<void> => {
        await apiClient.delete(`/photos/${photoId}`);
    },

    /**
     * Update photo metadata
     */
    update: async (photoId: string, metadata: Partial<MissionPhoto>): Promise<MissionPhoto> => {
        const response = await apiClient.patch<MissionPhoto>(`/photos/${photoId}`, metadata);
        return response.data;
    }
};
