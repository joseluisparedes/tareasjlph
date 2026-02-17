import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { RequestModal } from './components/RequestModal';
import { AdminPanel } from './components/AdminPanel';
import { Reports } from './components/Reports';
import { Integrations } from './components/Integrations';
import { ITRequest, ViewMode, CatalogItem, RequestType, Priority, Status } from './types';
import { MOCK_REQUESTS, MOCK_DOMAINS, MOCK_USERS } from './constants';

export default function App() {
    const [currentView, setCurrentView] = useState<ViewMode>('Dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [requests, setRequests] = useState<ITRequest[]>(MOCK_REQUESTS);
    const [domains, setDomains] = useState<CatalogItem[]>(MOCK_DOMAINS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<ITRequest | null>(null);

    const handleOpenNewRequest = () => {
        setEditingRequest(null);
        setIsModalOpen(true);
    };

    const handleEditRequest = (req: ITRequest) => {
        setEditingRequest(req);
        setIsModalOpen(true);
    };

    const handleSaveRequest = (req: ITRequest) => {
        if (requests.some(r => r.id === req.id)) {
            setRequests(requests.map(r => r.id === req.id ? req : r));
        } else {
            setRequests([req, ...requests]);
        }
        setIsModalOpen(false);
    };

    // Domain Management Handlers
    const handleUpdateDomain = (updatedDomain: CatalogItem) => {
        setDomains(domains.map(d => d.id === updatedDomain.id ? updatedDomain : d));
    };

    const handleAddDomain = (name: string) => {
        const newDomain: CatalogItem = {
            id: `d${Date.now()}`,
            name,
            isActive: true
        };
        setDomains([...domains, newDomain]);
    };

    // Drag and Drop Handler
    const handleRequestStatusChange = (requestId: string, newStatus: Status) => {
        setRequests(prev => prev.map(req => 
            req.id === requestId ? { ...req, status: newStatus } : req
        ));
    };

    // Mass Import Handler
    const handleImportTickets = () => {
        const newImportedRequests: ITRequest[] = [
            {
                id: `IMP-${Math.floor(Math.random() * 1000)}`,
                title: 'Importado: Latencia Base de Datos',
                description: 'Importación automática desde Jira. Alta latencia observada en BD de producción.',
                type: RequestType.Incident,
                domain: domains.find(d => d.isActive)?.name || 'Infraestructura',
                requester: 'Monitor de Sistema',
                priority: Priority.High,
                status: Status.Pending,
                assigneeId: null,
                createdAt: new Date().toISOString(),
                externalId: 'JIRA-5501'
            },
            {
                id: `IMP-${Math.floor(Math.random() * 1000)}`,
                title: 'Importado: Revisión Presupuesto Q2',
                description: 'Importación desde ServiceNow. Preparar reporte de asignación de presupuesto Q2.',
                type: RequestType.BAU,
                domain: domains[0]?.name || 'Finanzas',
                requester: 'Oficina CFO',
                priority: Priority.Medium,
                status: Status.Analysis,
                assigneeId: null,
                createdAt: new Date().toISOString(),
                externalId: 'TASK-8821'
            }
        ];
        setRequests(prev => [...newImportedRequests, ...prev]);
        alert(`Importación exitosa de ${newImportedRequests.length} tickets desde fuente externa.`);
    };

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
                <header className="mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                        {currentView === 'Dashboard' && 'Tablero Unificado de Tareas'}
                        {currentView === 'Admin' && 'Administración del Sistema'}
                        {currentView === 'Reports' && 'Reportes y Analítica'}
                        {currentView === 'Integrations' && 'Integraciones'}
                    </h2>
                    <p className="text-sm text-slate-500">
                        {currentView === 'Dashboard' && `Gestiona tu portafolio TI. ${requests.length} solicitudes activas.`}
                        {currentView === 'Admin' && 'Configurar catálogos y usuarios.'}
                        {currentView === 'Reports' && 'Visualizar carga de trabajo y rendimiento.'}
                    </p>
                </header>

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
                            users={MOCK_USERS} 
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