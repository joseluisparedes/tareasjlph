export interface Solicitud {
    id: string;
    titulo: string;
    descripcion: string;
    tipo_solicitud: 'BAU' | 'No BAU' | 'Incidente' | 'Nuevo Pedido' | 'Ad Hoc';
    dominio_id: string;
    solicitante: string;
    prioridad: 'Crítica' | 'Alta' | 'Media' | 'Baja';
    estado: string;
    asignado_a: string | null; // texto libre (nombre del responsable)
    fecha_vencimiento: string | null;
    id_externo: string | null;
    fecha_creacion: string;
    fecha_actualizacion: string;
    creado_por: string;
    // Nuevos campos
    prioridad_negocio: string | null;
    tarea_sn: string | null;
    ticket_rit: string | null;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    // Nuevos campos
    direccion_solicitante: string | null;
    brm: string | null;
    institucion: string | null;
    tipo_tarea: string | null;
    complejidad: string | null;
}

export interface Dominio {
    id: string;
    nombre: string;
    esta_activo: boolean;
    fecha_creacion: string;
    fecha_actualizacion: string;
}

export interface Usuario {
    id: string;
    nombre_completo: string;
    correo_electronico: string;
    rol: 'Administrador' | 'Colaborador';
    url_avatar: string | null;
    fecha_creacion: string;
    fecha_actualizacion: string;
}

export interface Catalogo {
    id: string;
    tipo: string;
    valor: string;
    esta_activo: boolean;
    orden: number;
    color: string | null;
    fecha_creacion: string;
}

export interface SolicitudFecha {
    id: string;
    solicitud_id: string;
    tipo: 'inicio' | 'fin';
    fecha: string;
    cambiado_por: string | null;
    fecha_registro: string;
}

export interface Database {
    public: {
        Tables: {
            solicitudes: {
                Row: Solicitud;
                Insert: Omit<Solicitud, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>;
                Update: Partial<Omit<Solicitud, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>>;
            };
            dominios: {
                Row: Dominio;
                Insert: Omit<Dominio, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>;
                Update: Partial<Omit<Dominio, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>>;
            };
            usuarios: {
                Row: Usuario;
                Insert: Omit<Usuario, 'fecha_creacion' | 'fecha_actualizacion'>;
                Update: Partial<Omit<Usuario, 'id' | 'fecha_creacion' | 'fecha_actualizacion'>>;
            };
            catalogos: {
                Row: Catalogo;
                Insert: Omit<Catalogo, 'id' | 'fecha_creacion'>;
                Update: Partial<Omit<Catalogo, 'id' | 'fecha_creacion'>>;
            };
        };
    };
}
