export interface Solicitud {
    id: string;
    titulo: string;
    descripcion: string;
    tipo_solicitud: 'BAU' | 'No BAU' | 'Incidente' | 'Nuevo Pedido' | 'Ad Hoc';
    dominio_id: string;
    solicitante: string;
    prioridad: 'Crítica' | 'Alta' | 'Media' | 'Baja';
    estado: 'Pendiente' | 'Análisis' | 'Desarrollo' | 'Pruebas' | 'Cerrado';
    asignado_a: string | null;
    fecha_vencimiento: string | null;
    id_externo: string | null;
    fecha_creacion: string;
    fecha_actualizacion: string;
    creado_por: string;
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
    rol: 'Admin' | 'Editor' | 'Lector';
    url_avatar: string | null;
    fecha_creacion: string;
    fecha_actualizacion: string;
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
        };
    };
}
