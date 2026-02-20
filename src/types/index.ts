export enum RequestType {
    BAU = 'BAU',
    NoBAU = 'No BAU',
    Incident = 'Incidente',
    NewOrder = 'Nuevo Pedido',
    AdHoc = 'Ad Hoc'
}

export enum Urgency {
    Critical = 'Crítica',
    High = 'Alta',
    Medium = 'Media',
    Low = 'Baja'
}

export enum Status {
    Pending = 'Pendiente',
    Analysis = 'Análisis',
    Development = 'Desarrollo',
    Testing = 'Pruebas',
    Closed = 'Cerrado'
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'Admin' | 'Editor' | 'Lector';
    avatarUrl?: string;
}

export interface ITRequest {
    id: string;
    title: string;
    description: string;
    type: RequestType;
    domain: string;
    requester: string;
    urgency: Urgency;
    priority: string;
    status: Status;
    assigneeId: string | null;
    createdAt: string;
    dueDate?: string;
    externalId?: string; // Jira/ServiceNow ID
    direccionSolicitante?: string;
}

export interface CatalogItem {
    id: string;
    name: string;
    isActive: boolean;
}

export type ViewMode = 'Dashboard' | 'Admin' | 'Reports' | 'Integrations';
export type DashboardView = 'Kanban' | 'Table';

export interface FilterState {
    domain: string[];
    type: RequestType[];
    urgency: Urgency[];
    status: Status[];
    search: string;
}