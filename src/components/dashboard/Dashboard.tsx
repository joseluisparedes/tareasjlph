import React, { useState, useMemo } from 'react';
import { ITRequest, DashboardView, FilterState, RequestType, Urgency, Status, CatalogItem, CatalogoItem } from '../../types';
import { KanbanBoard } from './KanbanBoard';
import { RequestTable } from './RequestTable';
import { LayoutGrid, List, Search, Filter, Plus, DownloadCloud, Save, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase/cliente';

interface DashboardProps {
    requests: ITRequest[];
    domains: CatalogItem[];
    onEditRequest: (req: ITRequest) => void;
    onNewRequest: () => void;
    onImportTickets: () => void;
    onStatusChange: (requestId: string, newStatus: Status) => void;
    onDelete: (id: string) => void;
    onDeleteBulk: (ids: string[]) => void;
    catalogos: CatalogoItem[];
    onUpdateCatalogoOrder?: (newOrder: string[]) => void;
    onUpdateRequest: (id: string, data: Partial<ITRequest>) => Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({ requests, domains, onEditRequest, onNewRequest, onImportTickets, onStatusChange, onDelete, onDeleteBulk, catalogos, onUpdateCatalogoOrder, onUpdateRequest }) => {
    const [viewMode, setViewMode] = useState<DashboardView>('Kanban');
    const [filters, setFilters] = useState<FilterState>({
        domain: [],
        type: [],
        urgency: [],
        status: [],
        direction: [],
        requester: [],
        search: ''
    });

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            if (filters.search && !req.title.toLowerCase().includes(filters.search.toLowerCase()) && !req.id.toLowerCase().includes(filters.search.toLowerCase())) return false;
            if (filters.domain.length > 0 && !filters.domain.includes(req.domain)) return false;
            if (filters.type.length > 0 && !filters.type.includes(req.type)) return false;
            if (filters.urgency.length > 0 && !filters.urgency.includes(req.urgency)) return false;
            if (filters.status.length > 0 && !filters.status.includes(req.status)) return false;

            // Nuevos filtros
            if (filters.direction.length > 0 && (!req.direccionSolicitante || !filters.direction.includes(req.direccionSolicitante))) return false;
            if (filters.requester.length > 0 && (!req.requester || !filters.requester.includes(req.requester))) return false;

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

    // Helper para obtener opciones únicas de catálogos
    const uniqueDirections = useMemo(() =>
        Array.from(new Set(catalogos.filter(c => c.tipo === 'direccion_solicitante' && c.esta_activo).map(c => c.valor))),
        [catalogos]);

    const uniqueRequesters = useMemo(() =>
        Array.from(new Set(catalogos.filter(c => c.tipo === 'usuario_solicitante' && c.esta_activo).map(c => c.valor))),
        [catalogos]);



    // --- Lógica de Filtros Guardados ---
    const [savedFilters, setSavedFilters] = useState<{ id: string, name: string, config: FilterState }[]>([]);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [newFilterName, setNewFilterName] = useState('');
    const [showSaveInput, setShowSaveInput] = useState(false);

    // Cargar filtros al inicio
    React.useEffect(() => {
        const fetchFilters = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('saved_filters')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (data) setSavedFilters(data);
        };
        fetchFilters();
    }, []);

    const handleSaveFilter = async () => {
        if (!newFilterName.trim()) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase.from('saved_filters').insert({
            user_id: user.id,
            name: newFilterName,
            config: filters
        }).select().single();

        if (data) {
            setSavedFilters([data, ...savedFilters]);
            setNewFilterName('');
            setShowSaveInput(false);
        }
    };

    const handleLoadFilter = (filter: { config: FilterState }) => {
        setFilters(filter.config);
        setIsFilterMenuOpen(false);
    };

    const handleDeleteFilter = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const { error } = await supabase.from('saved_filters').delete().eq('id', id);
        if (!error) {
            setSavedFilters(prev => prev.filter(f => f.id !== id));
        }
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

                    {/* Filtros Guardados */}
                    <div className="relative">
                        <button
                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Filter size={16} />
                            Mis Filtros
                        </button>

                        {isFilterMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2">
                                <div className="mb-2 pb-2 border-b border-slate-100">
                                    {!showSaveInput ? (
                                        <button
                                            onClick={() => setShowSaveInput(true)}
                                            className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md font-medium flex items-center gap-2"
                                        >
                                            <Plus size={14} /> Guardar filtro actual
                                        </button>
                                    ) : (
                                        <div className="flex gap-2 p-1">
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Nombre del filtro..."
                                                className="flex-1 text-sm border rounded px-2 py-1"
                                                value={newFilterName}
                                                onChange={e => setNewFilterName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSaveFilter()}
                                            />
                                            <button onClick={handleSaveFilter} className="text-blue-600 hover:text-blue-800"><Save size={16} /></button>
                                            <button onClick={() => setShowSaveInput(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                                        </div>
                                    )}
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {savedFilters.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-2">No tienes filtros guardados</p>
                                    ) : (
                                        savedFilters.map(filter => (
                                            <div key={filter.id}
                                                onClick={() => handleLoadFilter(filter)}
                                                className="group flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md cursor-pointer"
                                            >
                                                <span>{filter.name}</span>
                                                <button
                                                    onClick={(e) => handleDeleteFilter(filter.id, e)}
                                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

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
                    className="border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white max-w-[150px]"
                    onChange={(e) => e.target.value && handleFilterChange('domain', e.target.value)}
                    value=""
                >
                    <option value="">Dominio</option>
                    {domains.filter(d => d.isActive).map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                </select>

                <select
                    className="border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white max-w-[150px]"
                    onChange={(e) => e.target.value && handleFilterChange('type', e.target.value)}
                    value=""
                >
                    <option value="">Tipo</option>
                    {Array.from(new Set(catalogos.filter(c => c.tipo === 'tipo_requerimiento' && c.esta_activo).map(c => c.valor))).sort().map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                <select
                    className="border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white max-w-[150px]"
                    onChange={(e) => e.target.value && handleFilterChange('urgency', e.target.value)}
                    value=""
                >
                    <option value="">Urgencia</option>
                    {Array.from(new Set(catalogos.filter(c => c.tipo === 'urgencia' && c.esta_activo).map(c => c.valor))).sort().map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                {/* Nuevos Filtros */}
                <select
                    className="border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white max-w-[150px]"
                    onChange={(e) => e.target.value && handleFilterChange('status', e.target.value)}
                    value=""
                >
                    <option value="">Estado</option>
                    {Array.from(new Set(catalogos.filter(c => c.tipo === 'estado' && c.esta_activo).map(c => c.valor))).sort().map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select
                    className="border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white max-w-[150px]"
                    onChange={(e) => e.target.value && handleFilterChange('direction', e.target.value)}
                    value=""
                >
                    <option value="">Dirección</option>
                    {uniqueDirections.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                <select
                    className="border border-slate-300 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white max-w-[150px]"
                    onChange={(e) => e.target.value && handleFilterChange('requester', e.target.value)}
                    value=""
                >
                    <option value="">Solicitante</option>
                    {uniqueRequesters.map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                {/* Active Filters Display */}
                <div className="flex flex-wrap gap-2 ml-auto">
                    {[
                        ...filters.domain.map(f => ({ key: 'domain', val: f })),
                        ...filters.type.map(f => ({ key: 'type', val: f })),
                        ...filters.urgency.map(f => ({ key: 'urgency', val: f })),
                        ...filters.status.map(f => ({ key: 'status', val: f })),
                        ...filters.direction.map(f => ({ key: 'direction', val: f })),
                        ...filters.requester.map(f => ({ key: 'requester', val: f }))
                    ].map((item, i) => (
                        <span key={i} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs flex items-center gap-1 border border-blue-100">
                            {item.val}
                            <button
                                onClick={() => handleFilterChange(item.key as keyof FilterState, item.val)}
                                className="hover:bg-blue-200 rounded-full p-0.5"
                            >
                                <Plus size={10} className="rotate-45" />
                            </button>
                        </span>
                    ))}
                    {(filters.domain.length || filters.type.length || filters.urgency.length || filters.status.length || filters.direction.length || filters.requester.length) ? (
                        <button
                            onClick={() => setFilters({ domain: [], type: [], urgency: [], status: [], direction: [], requester: [], search: '' })}
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
                        catalogosUrgencia={catalogos.filter(c => c.tipo === 'urgencia')}
                        catalogos={catalogos}
                        onColumnOrderChange={onUpdateCatalogoOrder}
                    />
                ) : (
                    <RequestTable
                        requests={filteredRequests}
                        onEdit={onEditRequest}
                        onDelete={onDelete}
                        onDeleteBulk={onDeleteBulk}
                        catalogosUrgencia={catalogos.filter(c => c.tipo === 'urgencia')}
                        onUpdateRequest={onUpdateRequest}
                        domains={domains}
                        catalogos={catalogos}
                    />
                )}
            </div>
        </div>
    );
};