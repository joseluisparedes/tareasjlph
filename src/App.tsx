import React, { useState } from 'react';
import { Sidebar } from './components/shared/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { RequestModal } from './components/dashboard/RequestModal';
import { AdminPanel } from './components/admin/AdminPanel';
import { Reports } from './components/dashboard/Reports';
import { Integrations } from './components/dashboard/Integrations';
import { AuthPage } from './components/auth/AuthPage';
import { ITRequest, ViewMode, CatalogItem, RequestType, Priority, Status } from './types/index';
import { useSolicitudes } from './hooks/useSolicitudes';
import { useDominios } from './hooks/useDominios';
import { useAuth } from './hooks/useAuth';
import type { Solicitud, Dominio } from './lib/supabase/tipos-bd';
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
    const { user, cargando: cargandoAuth, cerrarSesion } = useAuth();
    const [currentView, setCurrentView] = useState<ViewMode>('Dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<ITRequest | null>(null);

    const {
        solicitudes,
        cargando: cargandoSolicitudes,
        cambiarEstado,
        crearSolicitud,
        actualizarSolicitud,
    } = useSolicitudes();

    const {
        dominios,
        cargando: cargandoDominios,
        crearDominio,
        actualizarDominio,
    } = useDominios();

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
        setIsModalOpen(true);
    };

    const handleEditRequest = (req: ITRequest) => {
        setEditingRequest(req);
        setIsModalOpen(true);
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
            asignado_a: req.assigneeId ?? null,
            fecha_vencimiento: null,
            id_externo: req.externalId ?? null,
            creado_por: user.id,
        };

        if (solicitudes.some(s => s.id === req.id)) {
            await actualizarSolicitud(req.id, datos);
        } else {
            await crearSolicitud(datos);
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

    const handleImportTickets = () => {
        alert('Función de importación disponible próximamente con integración Jira/ServiceNow.');
    };

    const cargando = cargandoSolicitudes || cargandoDominios;

    return (
        <div className="flex h-screen bg-slate-50">
            <Sidebar
                currentView={currentView}
                onChangeView={setCurrentView}
                isOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <main
                className={`flex-1 p-6 h-screen overflow-hidden flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}
            >
                <header className="mb-4 flex-shrink-0 flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                            {currentView === 'Dashboard' && 'Tablero Unificado de Tareas'}
                            {currentView === 'Admin' && 'Administración del Sistema'}
                            {currentView === 'Reports' && 'Reportes y Analítica'}
                            {currentView === 'Integrations' && 'Integraciones'}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {currentView === 'Dashboard' && (
                                cargando
                                    ? 'Cargando solicitudes...'
                                    : `Gestiona tu portafolio TI. ${requests.length} solicitudes activas.`
                            )}
                            {currentView === 'Admin' && 'Configurar catálogos y usuarios.'}
                            {currentView === 'Reports' && 'Visualizar carga de trabajo y rendimiento.'}
                        </p>
                    </div>

                    {/* User info + logout */}
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-medium text-slate-700">
                                {user.user_metadata?.nombre_completo ?? user.email}
                            </p>
                            <p className="text-xs text-slate-400">{user.email}</p>
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
                    <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4">
                        {currentView === 'Dashboard' && (
                            <Dashboard
                                requests={requests}
                                domains={domains}
                                onEditRequest={handleEditRequest}
                                onNewRequest={handleOpenNewRequest}
                                onImportTickets={handleImportTickets}
                                onStatusChange={handleRequestStatusChange}
                            />
                        )}
                        {currentView === 'Admin' && (
                            <AdminPanel
                                domains={domains}
                                users={[]}
                                onUpdateDomain={handleUpdateDomain}
                                onAddDomain={handleAddDomain}
                            />
                        )}
                        {currentView === 'Reports' && (
                            <Reports requests={requests} />
                        )}
                        {currentView === 'Integrations' && (
                            <Integrations />
                        )}
                    </div>
                )}
            </main>

            <RequestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                request={editingRequest}
                onSave={handleSaveRequest}
                domains={domains}
            />
        </div>
    );
}