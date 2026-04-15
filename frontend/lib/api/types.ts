import { z } from "zod";

// --- Enums ---
export const MissionStatus = z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export const PdfRenderStatus = z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"]);
export const UserRole = z.enum(["ADMIN", "TECHNICIAN", "VIEWER"]);

// --- Base Schemas ---
export const TenantSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
    // Legal & Branding
    address: z.string().nullable().optional(),
    region: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    fax: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    siret: z.string().nullable().optional(),
    capital: z.string().nullable().optional(),
    vat_id: z.string().nullable().optional(),
    branding_logo_url: z.string().nullable().optional(),
    agencies: z.string().nullable().optional(),
});

export const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    full_name: z.string().nullable(),
    role: UserRole,
    is_active: z.boolean(),
});

export const SiteSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    address_line1: z.string().nullable(),
    city: z.string().nullable(),
    postal_code: z.string().nullable(),
});

export const AssetSchema = z.object({
    id: z.string().uuid(),
    label: z.string(), // Renamed from name? Backend says 'label'
    site_id: z.string().uuid(),
    // Standard
    manufacturer: z.string().nullable().optional(),
    model: z.string().nullable().optional(),
    serial_number: z.string().nullable().optional(),
    // CTQ
    installation_number: z.string().nullable().optional(),
    year_commissioned: z.number().int().nullable().optional(),
    load_capacity: z.number().int().nullable().optional(),
    max_passengers: z.number().int().nullable().optional(),
    nominal_speed: z.string().nullable().optional(),
    number_of_levels: z.number().int().nullable().optional(),
    device_type: z.string().nullable().optional(),
    feature_type: z.string().nullable().optional(),
    usage_type: z.string().nullable().optional(),
    machinery_location: z.string().nullable().optional(),
    maintainer_name: z.string().nullable().optional(),
    maintainer_contract_ref: z.string().nullable().optional(),
});

export const ServiceTypeSchema = z.object({
    id: z.string().uuid(),
    code: z.string(),
    label: z.string(),
});

// --- Mission Schemas ---
export const MissionSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    site_id: z.string().uuid().nullable(),
    asset_id: z.string().uuid().nullable(),
    service_type_id: z.string().uuid(),
    status: MissionStatus,
    scheduled_start: z.string().datetime().nullable(), // ISO string
    title: z.string().nullable(),
    site: SiteSchema.optional(), // Joined
    service_type: ServiceTypeSchema.optional(), // Joined
    asset: AssetSchema.optional(), // Fetch with asset?
    // PDF extras
    client_reference: z.string().nullable().optional(),
    certification_number: z.string().nullable().optional(),
    owner_malveillance_flag: z.boolean().optional(),
    stop_request_flag: z.boolean().optional(),
    stop_reason: z.string().nullable().optional(),
    signed_by_name: z.string().nullable().optional(),
    place_signed: z.string().nullable().optional(),
    signed_at: z.string().datetime().nullable().optional(),
    metadata_json: z.any().optional(),
});

export const CreateMissionSchema = z.object({
    site_id: z.string().uuid().optional(),
    asset_id: z.string().uuid().optional(),
    service_type_id: z.string().uuid(),
    status: MissionStatus.default("DRAFT"),
    title: z.string().optional(),
    client_reference: z.string().optional(),
    certification_number: z.string().optional(),
});

// --- PDF Schemas ---
export const PdfRenderRequestSchema = z.object({
    id: z.string().uuid(),
    status: PdfRenderStatus,
    mission_id: z.string().uuid(),
    template_id: z.string().uuid(),
    created_at: z.string().datetime(),
    completed_at: z.string().datetime().nullable(),
    error_message: z.string().nullable(),
    download_url: z.string().url().nullable().optional(), // Presigned URL
    retry_count: z.number().int().default(0),
    max_retries: z.number().int().default(3),
});

export const PdfTemplateSchema = z.object({
    id: z.string().uuid(),
    code: z.string(),
    version: z.number().int(),
    is_active: z.boolean(),
});

// --- Document Schemas ---
export const DocumentFileSchema = z.object({
    id: z.string().uuid(),
    object_key: z.string(),
    size_bytes: z.number().int().nullable().optional(),
    mime_type: z.string().nullable().optional(),
    version: z.number().int(),
});

export const DocumentSchema = z.object({
    id: z.string().uuid(),
    doc_type: z.string(), // REPORT, PV, RAAT, OTHER
    title: z.string().nullable().optional(),
    mission_id: z.string().uuid().nullable().optional(),
    finding_id: z.string().uuid().nullable().optional(),
    status: z.string(),
    files: z.array(DocumentFileSchema).optional().default([]),
});

export const PresignedUrlResponseSchema = z.object({
    url: z.string().url(),
    method: z.string(),
});

// --- Auth Responses ---
export const LoginResponseSchema = z.object({
    access_token: z.string(),
    token_type: z.string(),
});

// --- Types ---
export type Mission = z.infer<typeof MissionSchema>;
export type CreateMission = z.infer<typeof CreateMissionSchema>;
export type Site = z.infer<typeof SiteSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type ServiceType = z.infer<typeof ServiceTypeSchema>; 
export type PdfRenderRequest = z.infer<typeof PdfRenderRequestSchema>;
export type User = z.infer<typeof UserSchema>;
export type Tenant = z.infer<typeof TenantSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type DocumentFile = z.infer<typeof DocumentFileSchema>;
export type PresignedUrlResponse = z.infer<typeof PresignedUrlResponseSchema>;
