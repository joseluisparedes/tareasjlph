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
    | 'dominios'
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
    | 'ingresado_gestion_demanda'
    | 'tipo_actividad_calendario';

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
    ultimoCambioEstado?: string;
    orden?: number;
}

export interface CatalogItem {
    id: string;
    name: string;
    isActive: boolean;
    orden?: number;
}

export interface CatalogoItem {
    id: string;
    tipo: CatalogType;
    valor: string;
    esta_activo: boolean;
    orden: number;
    color?: string | null;
    abreviatura?: string | null;
    espacio_id?: string;
}

export interface CatalogoConfig {
    tipo: CatalogType;
    modo_visualizacion: 'desplegable' | 'cuadros';
    espacio_id?: string;
}

export type ViewMode = 'Dashboard' | 'Admin' | 'Reports' | 'Integrations' | 'Tareas' | 'Calendario' | 'Alertas';
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
    onlyMine: boolean;
    assigneeIds: string[];
}

export interface SavedFilter {
    id: string;
    name: string;
    config: FilterState;
}

export interface ActividadCalendario {
    id: string;
    descripcion: string;
    tipo_actividad: string;
    fecha_inicio: string;
    fecha_fin: string;
    hora_inicio?: string | null;
    hora_fin?: string | null;
    creado_por: string;
    creado_por_nombre?: string;
    fecha_creacion?: string;
}

export interface ActividadLog {
    id: string;
    actividad_id: string;
    fecha_registro: string;
    cambiado_por: string;
    cambiado_por_nombre?: string;
    campo_modificado: string;
    valor_anterior: string;
    valor_nuevo: string;
}

export type Permission = 'lectura' | 'edicion';

export interface Workspace {
    id: string;
    nombre: string;
    descripcion?: string;
}

export interface WorkspaceMember {
    id: string;
    workspace_id: string;
    user_id: string;
    rol_iniciativas: Permission;
    rol_tareas: Permission;
}
