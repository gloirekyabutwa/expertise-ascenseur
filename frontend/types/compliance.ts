
export interface MissionAttendee {
    id: string;
    mission_id: string;
    full_name: string;
    role: string;
    company?: string; // Optional
    is_present: boolean;
}

export interface MissionDocumentProvided {
    id: string;
    mission_id: string;
    document_name: string;
    is_provided: boolean;
    is_applicable: boolean;
    comment?: string;
    document_date?: string; // ISO Date
}

export interface MissionPreviousControl {
    id: string;
    mission_id: string;
    control_date: string; // ISO Date
    control_type: string;
    report_number?: string;
    technician_name?: string;
    result?: string;
    observations?: string;
}

export interface MissionWorkItem {
    id: string;
    mission_id: string;
    work_description: string;
    deadline_year?: number;
    status: string; // PENDING, DONE
}

export interface ChecklistCatalogResponse {
    id: string;
    parent_id?: string;
    code: string;
    label: string;
    description?: string;
    order_index: number;
    item_type: string; // GROUP, ITEM
    field_type: string; // BOOL, MEASURE, TEXT
    unit?: string;
}

export interface AnomalyCatalogResponse {
    id: string;
    code: string;
    description: string;
    criticality: string; // NORMAL, HIGH
}

export interface MissionChecklistResult {
    id: string;
    mission_id: string;
    catalog_item_id: string;
    status: string; // CONCERNED, NOT_CONCERNED, NOT_CHECKED
    investigation_nature?: string;
    result_value?: string;
    observation_code?: string;
    comment?: string;
}

export interface MissionAnomaly {
    id: string;
    mission_id: string;
    catalog_anomaly_id?: string;
    catalog_item_id?: string; // Link to checklist
    custom_code?: string;
    custom_description?: string;
    severity?: string; // LOW, MEDIUM, HIGH, CRITICAL
    status: string; // OPEN
    comment?: string;
    catalog_anomaly?: AnomalyCatalogResponse;
}

export interface MissionComplianceBundle {
    attendees: MissionAttendee[];
    documents: MissionDocumentProvided[];
    previous_controls: MissionPreviousControl[];
    work_items: MissionWorkItem[];
    checklist_results: MissionChecklistResult[];
    anomalies: MissionAnomaly[];
}
