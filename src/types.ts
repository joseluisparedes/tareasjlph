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

export type UserRole = 'Administrador' | 'Colaborador';

export type CatalogType =
    | 'tipo_requerimiento'
    | 'prioridad'
    | 'urgencia'
    | 'estado'
    | 'usuario_solicitante'
    | 'direccion_solicitante'
    | 'asignado_a'
    | 'brm'
    | 'institucion'
    | 'tipo_tarea'
    | 'complejidad'
    | 'dominios'
    | 'ingresado_gestion_demanda';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
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
    status: string;
    assigneeId: string | null;
    createdAt: string;
    dueDate?: string;
    externalId?: string;
    creadorId?: string;
    creadorNombre?: string;
    // Nuevos campos
    priority?: string;
    fechaInicio?: string;
    fechaFin?: string;
    tareaSN?: string;
    ticketRIT?: string;
    // Nuevos campos del catálogo
    direccionSolicitante?: string;
    brm?: string;
    institucion?: string;
    tipoTarea?: string;
    complejidad?: string;
    ingresadoGestionDemanda?: string;
}

export interface CatalogItem {
    id: string;
    name: string;
    isActive: boolean;
}

export interface CatalogoItem {
    id: string;
    tipo: CatalogType;
    valor: string;
    esta_activo: boolean;
    orden: number;
    color?: string | null;
    abreviatura?: string | null;
}

export interface CatalogoConfig {
    tipo: CatalogType;
    modo_visualizacion: 'desplegable' | 'cuadros';
}

export type ViewMode = 'Dashboard' | 'Admin' | 'Reports' | 'Integrations' | 'Tareas';
export type DashboardView = 'Kanban' | 'Table';

export interface FilterState {
    domain: string[];
    type: RequestType[];
    urgency: Urgency[];
    status: string[];
    direction: string[]; // Nueva propiedad
    requester: string[]; // Nueva propiedad
    ingresadoGestionDemanda: string[]; // Nueva propiedad
    brm: string[]; // Nueva propiedad
    search: string;
    onlyMine: boolean; // Nueva propiedad
}

export interface SavedFilter {
    id: string;
    name: string;
    config: FilterState;
}
