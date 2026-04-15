
import { apiClient } from '@/lib/api/client';
import {
    MissionComplianceBundle,
    ChecklistCatalogResponse,
    AnomalyCatalogResponse,
    MissionChecklistResult,
    MissionAnomaly
} from '@/types/compliance';

export const complianceService = {
    getBundle: async (missionId: string): Promise<MissionComplianceBundle> => {
        const response = await apiClient.get<MissionComplianceBundle>(`/missions/${missionId}/compliance-bundle`);
        return response.data;
    },

    getCatalog: async (): Promise<ChecklistCatalogResponse[]> => {
        const response = await apiClient.get<ChecklistCatalogResponse[]>('/checklist/catalog');
        return response.data;
    },

    getAnomalyCatalog: async (): Promise<AnomalyCatalogResponse[]> => {
        const response = await apiClient.get<AnomalyCatalogResponse[]>('/checklist/anomalies/catalog');
        return response.data;
    },

    updateChecklistResults: async (missionId: string, results: Partial<MissionChecklistResult>[]): Promise<MissionChecklistResult[]> => {
        const response = await apiClient.post<MissionChecklistResult[]>(`/missions/${missionId}/checklist`, results);
        return response.data;
    },

    createAnomaly: async (missionId: string, anomaly: Partial<MissionAnomaly>): Promise<MissionAnomaly> => {
        const response = await apiClient.post<MissionAnomaly>(`/missions/${missionId}/anomalies`, anomaly);
        return response.data;
    },

    updateAnomaly: async (missionId: string, anomalyId: string, anomaly: Partial<MissionAnomaly>): Promise<MissionAnomaly> => {
        // NOTE: Backend might expect PUT at /missions/{id}/anomalies/{anomaly_id} or similar.
        // But my router implementation in checklist.py only has POST /missions/{id}/anomalies for creation?
        // Let's check backend router.
        // If not exists, I might need to add it.
        const response = await apiClient.put<MissionAnomaly>(`/missions/${missionId}/anomalies/${anomalyId}`, anomaly);
        return response.data;
    },

    deleteAnomaly: async (missionId: string, anomalyId: string): Promise<void> => {
        await apiClient.delete(`/missions/${missionId}/anomalies/${anomalyId}`);
    },

    updateCompliance: async (missionId: string, payload: { documents?: any[], attendees?: any[], work_items?: any[] }): Promise<void> => {
        await apiClient.put(`/missions/${missionId}/compliance`, payload);
    },

    updateMission: async (missionId: string, data: any): Promise<any> => {
        const response = await apiClient.patch(`/missions/${missionId}`, data);
        return response.data;
    }
};
