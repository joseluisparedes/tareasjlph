import React, { useState, useMemo, useRef } from 'react';
import { ITRequest, DashboardView, FilterState, RequestType, Urgency, Status, CatalogItem, CatalogoItem } from '../../types';
import { KanbanBoard } from './KanbanBoard';
import { RequestTable } from './RequestTable';
import { TimelineBoard } from './TimelineBoard';
import { LayoutGrid, List, Search, Filter, Plus, DownloadCloud, Save, Trash2, X, Sparkles, CalendarDays } from 'lucide-react';
import { supabase } from '../../lib/supabase/cliente';
import { MultiSelectDropdown } from '../shared/MultiSelectDropdown';
import { useAuth } from '../../hooks/useAuth';
import { AIReviewModal } from '../shared/AIReviewModal';
import { apuntesApi } from '../../lib/api/apuntes';

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
    const { user } = useAuth();
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<DashboardView>('Kanban');
    const [filters, setFilters] = useState<FilterState>({
        domain: [],
        type: [],
        urgency: [],
        status: [],
        direction: [],
        requester: [],
        ingresadoGestionDemanda: [],
        brm: [],
        search: '',
        onlyMine: false
    });

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            if (filters.search) {
                const term = filters.search.toLowerCase();
                // Búsqueda global (en todas las columnas) re-ubicada aquí
                const matches = Object.values(req).some(val => {
                    if (val === null || val === undefined) return false;
                    return String(val).toLowerCase().includes(term);
                });
                if (!matches) return false;
            }

            if (filters.domain.length > 0 && !filters.domain.includes(req.domain)) return false;
            if (filters.type.length > 0 && !filters.type.includes(req.type)) return false;
            if (filters.urgency.length > 0 && !filters.urgency.includes(req.urgency)) return false;
            if (filters.status.length > 0 && !filters.status.includes(req.status)) return false;

            // Nuevos filtros
            if (filters.direction.length > 0 && (!req.direccionSolicitante || !filters.direction.includes(req.direccionSolicitante))) return false;
            if (filters.requester.length > 0 && (!req.requester || !filters.requester.includes(req.requester))) return false;
            if (filters.ingresadoGestionDemanda.length > 0 && (!req.ingresadoGestionDemanda || !filters.ingresadoGestionDemanda.includes(req.ingresadoGestionDemanda))) return false;
            if (filters.brm.length > 0 && (!req.brm || !filters.brm.includes(req.brm))) return false;
            
            // Filtro "Mis Iniciativas"
            if (filters.onlyMine && user && req.creadorId !== user.id) return false;

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

    const handleFilterArrayChange = (key: keyof FilterState, values: string[]) => {
        setFilters(prev => ({ ...prev, [key]: values }));
    };

    // Calculate available options for cascading filters
    const availableOptions = useMemo(() => {
        const getOptions = (keyToIgnore: keyof FilterState) => {
            return requests.filter(req => {
                if (filters.search) {
                    const term = filters.search.toLowerCase();
                    const matches = Object.values(req).some(val => val !== null && val !== undefined && String(val).toLowerCase().includes(term));
                    if (!matches) return false;
                }
                if (keyToIgnore !== 'domain' && filters.domain.length > 0 && !filters.domain.includes(req.domain)) return false;
                if (keyToIgnore !== 'type' && filters.type.length > 0 && !filters.type.includes(req.type)) return false;
                if (keyToIgnore !== 'urgency' && filters.urgency.length > 0 && !filters.urgency.includes(req.urgency)) return false;
                if (keyToIgnore !== 'status' && filters.status.length > 0 && !filters.status.includes(req.status)) return false;
                if (keyToIgnore !== 'direction' && filters.direction.length > 0 && (!req.direccionSolicitante || !filters.direction.includes(req.direccionSolicitante))) return false;
                if (keyToIgnore !== 'requester' && filters.requester.length > 0 && (!req.requester || !filters.requester.includes(req.requester))) return false;
                if (keyToIgnore !== 'ingresadoGestionDemanda' && filters.ingresadoGestionDemanda.length > 0 && (!req.ingresadoGestionDemanda || !filters.ingresadoGestionDemanda.includes(req.ingresadoGestionDemanda))) return false;
                if (keyToIgnore !== 'brm' && filters.brm.length > 0 && (!req.brm || !filters.brm.includes(req.brm))) return false;
                return true;
            });
        };

        const sortAndFilter = (arr: any[]) => Array.from(new Set(arr.filter(Boolean))).sort() as string[];

        return {
            domain: sortAndFilter(getOptions('domain').map(r => r.domain)),
            type: sortAndFilter(getOptions('type').map(r => r.type)),
            urgency: sortAndFilter(getOptions('urgency').map(r => r.urgency)),
            status: sortAndFilter(getOptions('status').map(r => r.status)),
            direction: sortAndFilter(getOptions('direction').map(r => r.direccionSolicitante)),
            requester: sortAndFilter(getOptions('requester').map(r => r.requester)),
            ingresadoGestionDemanda: sortAndFilter(getOptions('ingresadoGestionDemanda').map(r => r.ingresadoGestionDemanda)),
            brm: sortAndFilter(getOptions('brm').map(r => r.brm))
        };
    }, [requests, filters]);



    // --- Lógica de Filtros Guardados ---
    const [savedFilters, setSavedFilters] = useState<{ id: string, name: string, config: FilterState }[]>([]);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [newFilterName, setNewFilterName] = useState('');
    const [showSaveInput, setShowSaveInput] = useState(false);
    const filterMenuRef = useRef<HTMLDivElement>(null);

    // Close "Mis Filtros" on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
                setIsFilterMenuOpen(false);
                setShowSaveInput(false);
            }
        };

        if (isFilterMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFilterMenuOpen]);

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
        setFilters({ 
            ...filter.config, 
            direction: filter.config.direction || [], 
            requester: filter.config.requester || [], 
            ingresadoGestionDemanda: filter.config.ingresadoGestionDemanda || [],
            brm: filter.config.brm || [] 
        });
        setIsFilterMenuOpen(false);
    };

    const handleDeleteFilter = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const { error } = await supabase.from('saved_filters').delete().eq('id', id);
        if (!error) {
            setSavedFilters(prev => prev.filter(f => f.id !== id));
        }
    };

    const availableStatuses = useMemo(() => {
        const unique = Array.from(new Set(filteredRequests.map(r => r.status)));
        const statusOrder = catalogos
            .filter(c => c.categoria === 'status')
            .map(c => c.valor);
        
        return unique.sort((a, b) => {
            const indexA = statusOrder.indexOf(a);
            const indexB = statusOrder.indexOf(b);
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [filteredRequests, catalogos]);

    const handleProcessAIAction = async (item: ITRequest, actionResult: any) => {
        if (actionResult.accion === 'actualizar') {
            if (actionResult.estado_nuevo && actionResult.estado_nuevo !== item.status) {
                 await onUpdateRequest(item.id, { status: actionResult.estado_nuevo as Status });
            }
            if (actionResult.agregar_nota) {
                 await apuntesApi.crear(item.id, `[IA] ${actionResult.agregar_nota}`, user?.id || null);
            }
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
            <AIReviewModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                tipo="iniciativa"
                items={filteredRequests.map(req => ({
                    ...req,
                    titulo: req.title,
                    descripcion: req.description,
                    estado: req.status
                }))}
                opcionesFiltrado={availableStatuses}
                onOpenDetails={onEditRequest}
                onProcessAction={handleProcessAIAction}
            />
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                        <Search className="absolute left-3 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar solicitudes..."
                            className="pl-10 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none w-64 bg-white text-gray-900"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                        {filters.search && (
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                                className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-1"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="h-8 w-px bg-slate-200 mx-2"></div>

                    {/* Filtros Guardados */}
                    <div className="relative" ref={filterMenuRef}>
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
                        <button
                            onClick={() => setViewMode('Timeline')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'Timeline' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Vista Cronograma"
                        >
                            <CalendarDays size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAIModalOpen(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <Sparkles size={18} />
                        Revisar con IA
                    </button>
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

                <MultiSelectDropdown
                    label="Dominio"
                    options={availableOptions.domain}
                    selected={filters.domain}
                    onChange={(vals) => handleFilterArrayChange('domain', vals)}
                    placeholder="Todos"
                    className="w-[150px]"
                />

                <MultiSelectDropdown
                    label="Tipo"
                    options={availableOptions.type}
                    selected={filters.type}
                    onChange={(vals) => handleFilterArrayChange('type', vals)}
                    placeholder="Todos"
                    className="w-[150px]"
                />

                <MultiSelectDropdown
                    label="Urgencia"
                    options={availableOptions.urgency}
                    selected={filters.urgency}
                    onChange={(vals) => handleFilterArrayChange('urgency', vals)}
                    placeholder="Todas"
                    className="w-[150px]"
                />

                <MultiSelectDropdown
                    label="Estado"
                    options={availableOptions.status}
                    selected={filters.status}
                    onChange={(vals) => handleFilterArrayChange('status', vals)}
                    placeholder="Todos"
                    className="w-[150px]"
                />

                <MultiSelectDropdown
                    label="Dirección"
                    options={availableOptions.direction}
                    selected={filters.direction}
                    onChange={(vals) => handleFilterArrayChange('direction', vals)}
                    placeholder="Todas"
                    className="w-[150px]"
                />

                <MultiSelectDropdown
                    label="Solicitante"
                    options={availableOptions.requester}
                    selected={filters.requester}
                    onChange={(vals) => handleFilterArrayChange('requester', vals)}
                    placeholder="Todos"
                    className="w-[150px]"
                />

                <MultiSelectDropdown
                    label="Gestión de Demanda"
                    options={availableOptions.ingresadoGestionDemanda}
                    selected={filters.ingresadoGestionDemanda}
                    onChange={(vals) => handleFilterArrayChange('ingresadoGestionDemanda', vals)}
                    placeholder="Todos"
                    className="w-[180px]"
                />

                <MultiSelectDropdown
                    label="BRM"
                    options={availableOptions.brm}
                    selected={filters.brm}
                    onChange={(vals) => handleFilterArrayChange('brm', vals)}
                    placeholder="Todos"
                    className="w-[150px]"
                />

                <div className="flex items-center gap-2 ml-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    <label className="text-xs font-bold text-slate-600 cursor-pointer flex items-center gap-2">
                        <input
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            checked={filters.onlyMine}
                            onChange={(e) => setFilters(prev => ({ ...prev, onlyMine: e.target.checked }))}
                        />
                        Mis Iniciativas
                    </label>
                </div>


                {/* Active Filters Display */}
                <div className="flex flex-wrap gap-2 ml-auto">
                    {[
                        ...filters.domain.map(f => ({ key: 'domain', val: f })),
                        ...filters.type.map(f => ({ key: 'type', val: f })),
                        ...filters.urgency.map(f => ({ key: 'urgency', val: f })),
                        ...filters.status.map(f => ({ key: 'status', val: f })),
                        ...filters.direction.map(f => ({ key: 'direction', val: f })),
                        ...filters.requester.map(f => ({ key: 'requester', val: f })),
                        ...filters.ingresadoGestionDemanda.map(f => ({ key: 'ingresadoGestionDemanda', val: f })),
                        ...filters.brm.map(f => ({ key: 'brm', val: f }))
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
                    {(filters.domain.length || filters.type.length || filters.urgency.length || filters.status.length || filters.direction.length || filters.requester.length || filters.ingresadoGestionDemanda.length || filters.brm.length || filters.onlyMine) ? (
                        <button
                            onClick={() => setFilters({ domain: [], type: [], urgency: [], status: [], direction: [], requester: [], ingresadoGestionDemanda: [], brm: [], search: '', onlyMine: false })}
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
                        catalogosUrgencia={catalogos.filter(c => c.tipo === 'urgencia').sort((a, b) => (a.orden || 0) - (b.orden || 0))}
                        catalogos={catalogos}
                        onColumnOrderChange={onUpdateCatalogoOrder}
                    />
                ) : viewMode === 'Timeline' ? (
                    <TimelineBoard
                        requests={filteredRequests}
                        onEdit={onEditRequest}
                    />
                ) : (
                    <RequestTable
                        requests={filteredRequests}
                        onEdit={onEditRequest}
                        onDelete={onDelete}
                        onDeleteBulk={onDeleteBulk}
                        catalogosUrgencia={catalogos.filter(c => c.tipo === 'urgencia').sort((a, b) => (a.orden || 0) - (b.orden || 0))}
                        onUpdateRequest={onUpdateRequest}
                        domains={domains}
                        catalogos={catalogos}
                    />
                )}
            </div>
        </div>
    );
};