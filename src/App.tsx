import React, { useState } from 'react';
import { Sidebar } from './components/shared/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { RequestModal } from './components/dashboard/RequestModal';
import { AdminPanel } from './components/admin/AdminPanel';
import { Reports } from './components/dashboard/Reports';
import { BulkOperations } from './components/dashboard/BulkOperations';
import { AuthPage } from './components/auth/AuthPage';
import { ITRequest, ViewMode, CatalogItem, RequestType, Priority, Status } from './types';
import { useSolicitudes } from './hooks/useSolicitudes';
import { useDominios } from './hooks/useDominios';
import { useCatalogos } from './hooks/useCatalogos';
import { useCatalogoConfig } from './hooks/useCatalogoConfig';
import { useAuth } from './hooks/useAuth';
import type { Solicitud, Dominio, SolicitudFecha } from './lib/supabase/tipos-bd';
import type { CatalogType } from './types';
import { fechasApi } from './lib/api/fechas';
import { LogOut, Loader2 } from 'lucide-react';

// Adaptadores: convierte tipos de Supabase a tipos del frontend
function adaptarSolicitud(s: Solicitud, dominios: Dominio[]): ITRequest {
    const dominio = dominios.find(d => d.id === s.dominio_id);
    return {
        id: s.id,
        title: s.titulo,
        description: s.descripcion,
        type: s.tipo_solicitud as RequestType,
        domain: dominio?.nombre ?? s.dominio_id,
        requester: s.solicitante,
        priority: s.prioridad as Priority,
        status: s.estado as Status,
        assigneeId: s.asignado_a,
        createdAt: s.fecha_creacion,
        externalId: s.id_externo ?? undefined,
        // Campos adicionales
        prioridadNegocio: s.prioridad_negocio ?? undefined,
        tareaSN: s.tarea_sn ?? undefined,
        ticketRIT: s.ticket_rit ?? undefined,
        fechaInicio: s.fecha_inicio ?? undefined,
        fechaFin: s.fecha_fin ?? undefined,
        // Nuevos campos del catálogo
        direccionSolicitante: s.direccion_solicitante ?? undefined,
        brm: s.brm ?? undefined,
        institucion: s.institucion ?? undefined,
        tipoTarea: s.tipo_tarea ?? undefined,
        complejidad: s.complejidad ?? undefined,
    };
}

function adaptarDominio(d: Dominio): CatalogItem {
    return {
        id: d.id,
        name: d.nombre,
        isActive: d.esta_activo,
    };
}

export default function App() {
    const { user, perfil, cargando: cargandoAuth, cerrarSesion, esAdministrador } = useAuth();
    const [currentView, setCurrentView] = useState<ViewMode>('Dashboard');

    // Redirigir a Dashboard si un Colaborador intenta acceder a Admin
    const vistaSegura: ViewMode = !esAdministrador && currentView === 'Admin' ? 'Dashboard' : currentView;
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<ITRequest | null>(null);
    const [historialFechas, setHistorialFechas] = useState<SolicitudFecha[]>([]);

    const {
        solicitudes,
        cargando: cargandoSolicitudes,
        cambiarEstado,
        crearSolicitud,
        actualizarSolicitud,
        eliminarSolicitud,
    } = useSolicitudes();

    const {
        dominios,
        cargando: cargandoDominios,
        crearDominio,
        actualizarDominio,
    } = useDominios();

    const {
        catalogos,
        crearItem: crearCatalogo,
        actualizarItem: actualizarCatalogo,
        eliminarItem: eliminarCatalogo,
    } = useCatalogos();

    const { getModo, setModo } = useCatalogoConfig();

    const handleDeleteRequest = async (id: string) => {
        await eliminarSolicitud(id);
        setIsModalOpen(false);
    };

    // Pantalla de carga inicial
    if (cargandoAuth) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="text-blue-500 animate-spin" size={40} />
                    <p className="text-slate-400 text-sm">Cargando...</p>
                </div>
            </div>
        );
    }

    // Si no hay sesión, mostrar pantalla de autenticación
    if (!user) {
        return <AuthPage />;
    }

    // Datos adaptados para los componentes existentes
    const requests: ITRequest[] = solicitudes.map(s => adaptarSolicitud(s, dominios));
    const domains: CatalogItem[] = dominios.map(adaptarDominio);

    const handleOpenNewRequest = () => {
        setEditingRequest(null);
        setHistorialFechas([]);
        setIsModalOpen(true);
    };

    const handleEditRequest = async (req: ITRequest) => {
        setEditingRequest(req);
        setIsModalOpen(true);
        // Cargar historial de fechas de esta solicitud
        try {
            const historial = await fechasApi.obtenerPorSolicitud(req.id);
            setHistorialFechas(historial);
        } catch {
            setHistorialFechas([]);
        }
    };

    const handleSaveRequest = async (req: ITRequest) => {
        const dominioId = dominios.find(d => d.nombre === req.domain)?.id ?? dominios[0]?.id;
        if (!dominioId || !user) return;

        const datos = {
            titulo: req.title,
            descripcion: req.description,
            tipo_solicitud: req.type as Solicitud['tipo_solicitud'],
            dominio_id: dominioId,
            solicitante: req.requester,
            prioridad: req.priority as Solicitud['prioridad'],
            estado: req.status as Solicitud['estado'],
            asignado_a: req.assigneeId || null,
            fecha_vencimiento: null,
            id_externo: req.externalId || null,
            creado_por: user.id,
            prioridad_negocio: req.prioridadNegocio || null,
            tarea_sn: req.tareaSN || null,
            ticket_rit: req.ticketRIT || null,
            fecha_inicio: req.fechaInicio || null,
            fecha_fin: req.fechaFin || null,
            // Nuevos campos del catálogo
            direccion_solicitante: req.direccionSolicitante || null,
            brm: req.brm || null,
            institucion: req.institucion || null,
            tipo_tarea: req.tipoTarea || null,
            complejidad: req.complejidad || null,
        };

        if (solicitudes.some(s => s.id === req.id)) {
            // Detectar cambios de fecha y registrar historial
            const solicitudAnterior = solicitudes.find(s => s.id === req.id);
            if (solicitudAnterior) {
                const fechaInicioAnterior = solicitudAnterior.fecha_inicio;
                const fechaFinAnterior = solicitudAnterior.fecha_fin;
                const nuevaFechaInicio = datos.fecha_inicio;
                const nuevaFechaFin = datos.fecha_fin;

                if (nuevaFechaInicio && nuevaFechaInicio !== fechaInicioAnterior) {
                    await fechasApi.registrar(req.id, 'inicio', nuevaFechaInicio, user.id);
                }
                if (nuevaFechaFin && nuevaFechaFin !== fechaFinAnterior) {
                    await fechasApi.registrar(req.id, 'fin', nuevaFechaFin, user.id);
                }
            }
            await actualizarSolicitud(req.id, datos);
        } else {
            const nueva = await crearSolicitud(datos);
            // Registrar fechas iniciales si se proporcionaron
            if (datos.fecha_inicio) {
                await fechasApi.registrar(nueva.id, 'inicio', datos.fecha_inicio, user.id);
            }
            if (datos.fecha_fin) {
                await fechasApi.registrar(nueva.id, 'fin', datos.fecha_fin, user.id);
            }
        }
        setIsModalOpen(false);
    };

    const handleUpdateDomain = async (updatedDomain: CatalogItem) => {
        await actualizarDominio(updatedDomain.id, {
            nombre: updatedDomain.name,
            esta_activo: updatedDomain.isActive,
        });
    };

    const handleAddDomain = async (name: string) => {
        await crearDominio(name);
    };

    const handleRequestStatusChange = async (requestId: string, newStatus: Status) => {
        await cambiarEstado(requestId, newStatus as Solicitud['estado']);
    };

    const handleImportRequests = async (newRequests: Partial<ITRequest>[]) => {
        if (!user) return;

        for (const req of newRequests) {
            await crearSolicitud({
                titulo: req.title || 'Sin Título',
                descripcion: req.description || '',
                tipo_solicitud: (Object.values(RequestType).includes(req.type as RequestType) ? req.type : RequestType.NewOrder) as Solicitud['tipo_solicitud'],
                dominio_id: dominios.find(d => d.nombre === req.domain)?.id || dominios[0]?.id,
                solicitante: user.email || 'Importado',
                prioridad: (Object.values(Priority).includes(req.priority as Priority) ? req.priority : Priority.Medium) as Solicitud['prioridad'],
                estado: Status.Pending as Solicitud['estado'],
                creado_por: user.id,
                tarea_sn: req.tareaSN || null,
                ticket_rit: req.ticketRIT || null,
                // Campos obligatorios adicionales (según tipo Solicitud)
                asignado_a: null,
                id_externo: null,
                fecha_vencimiento: null,
                prioridad_negocio: null,
                fecha_inicio: null,
                fecha_fin: null,
                direccion_solicitante: null,
                brm: null,
                institucion: null,
                tipo_tarea: null,
                complejidad: null
            });
        }
    };

    const handleUpdateRequest = async (id: string, data: Partial<ITRequest>) => {
        if (!user) return;
        const currentReq = solicitudes.find(s => s.id === id);
        if (!currentReq) return;

        const updateData: any = {};

        // Mapeo de campos
        if (data.title !== undefined) updateData.titulo = data.title;
        if (data.description !== undefined) updateData.descripcion = data.description;
        if (data.type !== undefined) updateData.tipo_solicitud = data.type;
        if (data.domain !== undefined) {
            const domId = dominios.find(d => d.nombre === data.domain)?.id;
            if (domId) updateData.dominio_id = domId;
        }
        if (data.requester !== undefined) updateData.solicitante = data.requester;
        if (data.priority !== undefined) updateData.prioridad = data.priority;
        if (data.status !== undefined) updateData.estado = data.status;
        if (data.assigneeId !== undefined) updateData.asignado_a = data.assigneeId;
        if (data.externalId !== undefined) updateData.id_externo = data.externalId;
        if (data.prioridadNegocio !== undefined) updateData.prioridad_negocio = data.prioridadNegocio;
        if (data.tareaSN !== undefined) updateData.tarea_sn = data.tareaSN;
        if (data.ticketRIT !== undefined) updateData.ticket_rit = data.ticketRIT;
        if (data.fechaInicio !== undefined) updateData.fecha_inicio = data.fechaInicio;
        if (data.fechaFin !== undefined) updateData.fecha_fin = data.fechaFin;

        // Historial de fechas
        if (data.fechaInicio && data.fechaInicio !== currentReq.fecha_inicio) {
            await fechasApi.registrar(id, 'inicio', data.fechaInicio, user.id);
        }
        if (data.fechaFin && data.fechaFin !== currentReq.fecha_fin) {
            await fechasApi.registrar(id, 'fin', data.fechaFin, user.id);
        }

        await actualizarSolicitud(id, updateData);
    };

    const handleImportTickets = () => {
        setCurrentView('Integrations');
    };

    const cargando = cargandoSolicitudes || cargandoDominios;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar
                currentView={vistaSegura}
                onChangeView={setCurrentView}
                isOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                esAdministrador={esAdministrador}
            />

            <main
                className={`flex-1 p-6 h-full flex flex-col overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}
            >
                <header className="mb-4 flex-shrink-0 flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                            {vistaSegura === 'Dashboard' && 'Tablero Unificado de Tareas'}
                            {vistaSegura === 'Admin' && 'Administración del Sistema'}
                            {vistaSegura === 'Reports' && 'Reportes y Analítica'}
                            {vistaSegura === 'Integrations' && 'Importación y Exportación'}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {vistaSegura === 'Dashboard' && (
                                cargando
                                    ? 'Cargando solicitudes...'
                                    : `Gestiona tu portafolio TI. ${requests.length} solicitudes activas.`
                            )}
                            {vistaSegura === 'Admin' && 'Configurar catálogos y usuarios.'}
                            {vistaSegura === 'Reports' && 'Visualizar carga de trabajo y rendimiento.'}
                            {vistaSegura === 'Integrations' && 'Carga masiva y descarga de reportes.'}
                        </p>
                    </div>

                    {/* User info + logout */}
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-medium text-slate-700">
                                {perfil?.nombre_completo ?? user.user_metadata?.nombre_completo ?? user.email}
                            </p>
                            <div className="flex items-center justify-end gap-2 mt-0.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${esAdministrador
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {perfil?.rol ?? 'Colaborador'}
                                </span>
                                <p className="text-xs text-slate-400">{user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={cerrarSesion}
                            title="Cerrar sesión"
                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </header>

                {cargando ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-slate-500">Cargando datos...</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 overflow-hidden pr-1 pb-4">
                        {vistaSegura === 'Dashboard' && (
                            <Dashboard
                                requests={requests}
                                domains={domains}
                                onEditRequest={handleEditRequest}
                                onNewRequest={handleOpenNewRequest}
                                onImportTickets={handleImportTickets}
                                onStatusChange={handleRequestStatusChange}
                                catalogos={catalogos}
                                onUpdateCatalogoOrder={async (newOrder) => {
                                    const updates = newOrder.map((status, index) => {
                                        const item = catalogos.find(c => c.valor === status && c.tipo === 'estado');
                                        if (item) {
                                            return actualizarCatalogo(item.id, { orden: index });
                                        }
                                        return Promise.resolve();
                                    });
                                    await Promise.all(updates);
                                }}
                                onDelete={handleDeleteRequest}
                                onDeleteBulk={async (ids) => {
                                    for (const id of ids) {
                                        await eliminarSolicitud(id);
                                    }
                                }}
                                onUpdateRequest={handleUpdateRequest}
                            />
                        )}
                        {vistaSegura === 'Admin' && esAdministrador && (
                            <AdminPanel
                                domains={domains}
                                users={[]}
                                onUpdateDomain={handleUpdateDomain}
                                onAddDomain={handleAddDomain}
                                catalogos={catalogos}
                                onAddCatalogo={(tipo: CatalogType, valor: string) => crearCatalogo(tipo, valor)}
                                onUpdateCatalogo={actualizarCatalogo}
                                onDeleteCatalogo={eliminarCatalogo}
                                getModo={getModo}
                                setModo={setModo}
                                requests={requests}
                            />
                        )}
                        {vistaSegura === 'Reports' && (
                            <Reports requests={requests} />
                        )}
                        {vistaSegura === 'Integrations' && (
                            <BulkOperations
                                requests={requests}
                                onImport={handleImportRequests}
                                domains={domains}
                                catalogos={catalogos}
                                getModo={getModo}
                            />
                        )}
                    </div>
                )}
            </main>

            <RequestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                request={editingRequest}
                onSave={handleSaveRequest}
                onDelete={handleDeleteRequest}
                domains={domains}
                catalogos={catalogos}
                historialFechas={historialFechas}
                getModo={getModo}
            />
        </div>
    );
}