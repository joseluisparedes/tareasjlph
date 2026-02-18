import { ITRequest, Priority, RequestType, Status, User, CatalogItem } from '../types';

export const MOCK_USERS: User[] = [
    { id: 'u1', name: 'Alex Johnson', email: 'alex.j@brm.com', role: 'Administrador', avatarUrl: 'https://picsum.photos/32/32?random=1' },
    { id: 'u2', name: 'Maria Garcia', email: 'maria.g@brm.com', role: 'Colaborador', avatarUrl: 'https://picsum.photos/32/32?random=2' },
    { id: 'u3', name: 'Steve Smith', email: 'steve.s@brm.com', role: 'Colaborador', avatarUrl: 'https://picsum.photos/32/32?random=3' },
    { id: 'u4', name: 'Sarah Connor', email: 'sarah.c@business.com', role: 'Colaborador', avatarUrl: 'https://picsum.photos/32/32?random=4' },
];

export const MOCK_DOMAINS: CatalogItem[] = [
    { id: 'd1', name: 'Finanzas', isActive: true },
    { id: 'd2', name: 'RRHH', isActive: true },
    { id: 'd3', name: 'Infraestructura', isActive: true },
    { id: 'd4', name: 'Ventas', isActive: true },
    { id: 'd5', name: 'Sistemas Legacy', isActive: false },
];

export const MOCK_REQUESTS: ITRequest[] = [
    {
        id: 'BRM-2025-0001',
        title: 'Error Generación Reporte Financiero Q1',
        description: 'La generación automática de reportes falla por error de tiempo de espera.',
        type: RequestType.Incident,
        domain: 'Finanzas',
        requester: 'Juan Pérez',
        priority: Priority.Critical,
        status: Status.Analysis,
        assigneeId: 'u1',
        createdAt: '2025-02-10T09:00:00Z',
        externalId: 'INC-9921'
    },
    {
        id: 'BRM-2025-0002',
        title: 'Flujo de Onboarding Nuevos Empleados',
        description: 'Actualizar el flujo de ingreso para incluir módulos de capacitación en seguridad.',
        type: RequestType.BAU,
        domain: 'RRHH',
        requester: 'Ana Gómez',
        priority: Priority.Medium,
        status: Status.Pending,
        assigneeId: null,
        createdAt: '2025-02-11T14:30:00Z'
    },
    {
        id: 'BRM-2025-0003',
        title: 'Migración de Servidor para CRM',
        description: 'Migrar la base de datos del CRM al nuevo clúster en la nube.',
        type: RequestType.NoBAU,
        domain: 'Infraestructura',
        requester: 'Miguel Rojo',
        priority: Priority.High,
        status: Status.Development,
        assigneeId: 'u2',
        createdAt: '2025-02-12T10:15:00Z',
        externalId: 'JIRA-4421'
    },
    {
        id: 'BRM-2025-0004',
        title: 'Actualizar UI Tablero de Ventas',
        description: 'Refactorizar el tablero de ventas para usar los nuevos colores de marca.',
        type: RequestType.AdHoc,
        domain: 'Ventas',
        requester: 'Raquel Verde',
        priority: Priority.Low,
        status: Status.Closed,
        assigneeId: 'u3',
        createdAt: '2025-02-05T08:00:00Z'
    },
    {
        id: 'BRM-2025-0005',
        title: 'Parche Sistema de Nómina',
        description: 'Aplicar parche de seguridad crítico al sistema legacy de nómina.',
        type: RequestType.Incident,
        domain: 'Finanzas',
        requester: 'Dpto Finanzas',
        priority: Priority.Critical,
        status: Status.Testing,
        assigneeId: 'u1',
        createdAt: '2025-02-13T11:00:00Z'
    },
    {
        id: 'BRM-2025-0006',
        title: 'Problema Acceso VPN',
        description: 'Usuarios remotos reportan lentitud en conexión VPN.',
        type: RequestType.Incident,
        domain: 'Infraestructura',
        requester: 'Mesa de Ayuda',
        priority: Priority.High,
        status: Status.Pending,
        assigneeId: null,
        createdAt: '2025-02-14T09:00:00Z'
    }
];
