import React, { useState, useMemo } from 'react';
import { ITRequest, DashboardView, FilterState, RequestType, Priority, Status, CatalogItem, CatalogoItem } from '../../types';
import { KanbanBoard } from './KanbanBoard';
import { RequestTable } from './RequestTable';
import { LayoutGrid, List, Search, Filter, Plus, DownloadCloud } from 'lucide-react';

interface DashboardProps {
    requests: ITRequest[];
    domains: CatalogItem[];
    onEditRequest: (req: ITRequest) => void;
    onNewRequest: () => void;
    onImportTickets: () => void;
    onStatusChange: (requestId: string, newStatus: Status) => void;
    catalogos: CatalogoItem[];
    onUpdateCatalogoOrder?: (newOrder: string[]) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ requests, domains, onEditRequest, onNewRequest, onImportTickets, onStatusChange, catalogos, onUpdateCatalogoOrder }) => {
    const [viewMode, setViewMode] = useState<DashboardView>('Kanban');
    const [filters, setFilters] = useState<FilterState>({
        domain: [],
        type: [],
        priority: [],
        status: [],
        search: ''
    });

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            if (filters.search && !req.title.toLowerCase().includes(filters.search.toLowerCase()) && !req.id.toLowerCase().includes(filters.search.toLowerCase())) return false;
            if (filters.domain.length > 0 && !filters.domain.includes(req.domain)) return false;
            if (filters.type.length > 0 && !filters.type.includes(req.type)) return false;
            if (filters.priority.length > 0 && !filters.priority.includes(req.priority)) return false;
            if (filters.status.length > 0 && !filters.status.includes(req.status)) return false;
            return true;
        });
    }, [requests, filters]);

    const handleFilterChange = (key: keyof FilterState, value: string) => {
        setFilters(prev => {
            const currentArray = prev[key] as string[];
            if (currentArray.includes(value)) {
                return { ...prev, [key]: currentArray.filter(item => item !== value) };
            } else {
                return { ...prev, [key]: [...currentArray, value] };
            }
        });
    };

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar solicitudes..."
                            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-64 bg-white text-gray-900"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                    </div>
                    <div className="h-8 w-px bg-slate-200 mx-2"></div>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('Kanban')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'Kanban' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Vista Kanban"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('Table')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'Table' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Vista Tabla"
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onImportTickets}
                        className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <DownloadCloud size={18} />
                        Importar Tickets
                    </button>
                    <button
                        onClick={onNewRequest}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                        Nueva Solicitud
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                <span className="text-slate-500 flex items-center gap-1 font-medium mr-2">
                    <Filter size={16} /> Filtros:
                </span>

                <select
                    className="border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    onChange={(e) => e.target.value && handleFilterChange('domain', e.target.value)}
                    value=""
                >
                    <option value="">Dominio</option>
                    {domains.filter(d => d.isActive).map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                </select>

                <select
                    className="border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    onChange={(e) => e.target.value && handleFilterChange('type', e.target.value)}
                    value=""
                >
                    <option value="">Tipo</option>
                    {Object.values(RequestType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <select
                    className="border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    onChange={(e) => e.target.value && handleFilterChange('priority', e.target.value)}
                    value=""
                >
                    <option value="">Prioridad</option>
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                {/* Active Filters Display */}
                <div className="flex flex-wrap gap-2 ml-auto">
                    {[...filters.domain, ...filters.type, ...filters.priority, ...filters.status].map((f, i) => (
                        <span key={i} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs flex items-center gap-1 border border-blue-100">
                            {f}
                            <button
                                onClick={() => {
                                    if (Object.values(RequestType).includes(f as any)) handleFilterChange('type', f);
                                    else if (Object.values(Priority).includes(f as any)) handleFilterChange('priority', f);
                                    else handleFilterChange('domain', f);
                                }}
                                className="hover:bg-blue-200 rounded-full p-0.5"
                            >
                                <Plus size={10} className="rotate-45" />
                            </button>
                        </span>
                    ))}
                    {(filters.domain.length || filters.type.length || filters.priority.length) ? (
                        <button
                            onClick={() => setFilters({ domain: [], type: [], priority: [], status: [], search: '' })}
                            className="text-slate-400 hover:text-red-500 text-xs underline"
                        >
                            Limpiar todo
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {viewMode === 'Kanban' ? (
                    <KanbanBoard
                        requests={filteredRequests}
                        onEdit={onEditRequest}
                        onStatusChange={onStatusChange}
                        catalogosPrioridad={catalogos.filter(c => c.tipo === 'prioridad_negocio')}
                        catalogos={catalogos}
                        onColumnOrderChange={onUpdateCatalogoOrder}
                    />
                ) : (
                    <RequestTable
                        requests={filteredRequests}
                        onEdit={onEditRequest}
                        catalogosPrioridad={catalogos.filter(c => c.tipo === 'prioridad_negocio')}
                    />
                )}
            </div>
        </div>
    );
};