import React, { useState, useMemo, useRef } from 'react';
import { ITRequest, DashboardView, FilterState, RequestType, Urgency, Status, CatalogItem, CatalogoItem } from '../../types';
import { KanbanBoard } from './KanbanBoard';
import { RequestTable } from './RequestTable';
import { TimelineBoard } from './TimelineBoard';
import { LayoutGrid, List, Search, Filter, Plus, DownloadCloud, Save, Trash2, X, Sparkles, CalendarDays, Globe, Tag, AlertCircle, Activity, MapPin, User, FileSearch, Briefcase, Target, Hash, Building2, ClipboardList, BarChart, Users, ChevronDown, ChevronUp, Settings2, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../../lib/supabase/cliente';
import { MultiSelectDropdown } from '../shared/MultiSelectDropdown';
import { useAuth } from '../../hooks/useAuth';
import { useUsuarios } from '../../hooks/useUsuarios';
import { AIReviewModal } from '../shared/AIReviewModal';
import { apuntesApi } from '../../lib/api/apuntes';

interface DashboardProps {
    requests: ITRequest[];
    domains: CatalogItem[];
    onEditRequest: (req: ITRequest) => void;
    onNewRequest: () => void;
    onDuplicateRequest?: (req: ITRequest) => void;
    onImportTickets: () => void;
    onStatusChange: (requestId: string, newStatus: Status) => void;
    onDelete: (id: string) => void;
    onDeleteBulk: (ids: string[]) => void;
    catalogos: CatalogoItem[];
    onUpdateCatalogoOrder?: (newOrder: string[]) => void;
    onUpdateSolicitudesOrder?: (updates: { id: string, orden: number }[]) => Promise<void>;
    onUpdateRequest: (id: string, data: Partial<ITRequest>) => Promise<void>;
    umbrales?: { yellow: number, red: number };
    canEdit?: boolean;
    getVisible?: (tipo: string) => boolean;
    exportFields?: string[];
}

const INITIAL_FILTER_STATE: FilterState = {
    domain: [],
    type: [],
    urgency: [],
    status: [],
    direction: [],
    requester: [],
    brm: [],
    ingresadoGestionDemanda: [],
    esProyectoSpo: [],
    idDemanda: [],
    institucion: [],
    tipoTarea: [],
    complejidad: [],
    assigneeIds: [],
    search: '',
    onlyMine: false
};

export const Dashboard: React.FC<DashboardProps> = ({ requests, domains, onEditRequest, onNewRequest, onDuplicateRequest, onImportTickets, onStatusChange, onDelete, onDeleteBulk, catalogos, onUpdateCatalogoOrder, onUpdateSolicitudesOrder, onUpdateRequest, umbrales, canEdit = false, getVisible, exportFields }) => {
    const { user } = useAuth();
    const { usuarios } = useUsuarios();
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isFiltersVisibleMobile, setIsFiltersVisibleMobile] = useState(false);
    const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const advancedFiltersRef = useRef<HTMLDivElement>(null);

    // Close advanced filters on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (advancedFiltersRef.current && !advancedFiltersRef.current.contains(event.target as Node)) {
                setShowAdvancedFilters(false);
            }
        };

        if (showAdvancedFilters) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAdvancedFilters]);
    const [viewMode, setViewMode] = useState<DashboardView>('Kanban');
    const [filters, setFilters] = useState<FilterState>(INITIAL_FILTER_STATE);

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

            if (filters.status?.length > 0 && !filters.status.includes(req.status || '(Vacío)')) return false;
            if (filters.domain?.length > 0 && !filters.domain.includes(req.domain || '(Vacío)')) return false;
            if (filters.type?.length > 0 && !filters.type.includes(req.type || '(Vacío)')) return false;
            if (filters.urgency?.length > 0 && !filters.urgency.includes(req.urgency || '(Vacío)')) return false;

            // Nuevos filtros
            if (filters.direction?.length > 0 && !filters.direction.includes(req.direccionSolicitante || '(Vacío)')) return false;
            if (filters.requester?.length > 0 && !filters.requester.includes(req.requester || '(Vacío)')) return false;
            if (filters.ingresadoGestionDemanda?.length > 0 && !filters.ingresadoGestionDemanda.includes(req.ingresadoGestionDemanda || '(Vacío)')) return false;
            if (filters.brm?.length > 0 && !filters.brm.includes(req.brm || '(Vacío)')) return false;
            if (filters.esProyectoSpo?.length > 0 && !filters.esProyectoSpo.includes(req.esProyectoSpo || '(Vacío)')) return false;
            if (filters.idDemanda?.length > 0 && !filters.idDemanda.includes(req.idDemanda || '(Vacío)')) return false;
            if (filters.institucion?.length > 0 && !filters.institucion.includes(req.institucion || '(Vacío)')) return false;
            if (filters.tipoTarea?.length > 0 && !filters.tipoTarea.includes(req.tipoTarea || '(Vacío)')) return false;
            if (filters.complejidad?.length > 0 && !filters.complejidad.includes(req.complejidad || '(Vacío)')) return false;
            
            // Filtro "Mis Iniciativas"
            if (filters.onlyMine && user && req.creadorId !== user.id) return false;

            // Filtro por Responsables
            if (filters.assigneeIds && filters.assigneeIds.length > 0 && !filters.assigneeIds.includes(req.assigneeId || '(Vacío)')) return false;

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
                if (keyToIgnore !== 'domain' && filters.domain.length > 0 && !filters.domain.includes(req.domain || '(Vacío)')) return false;
                if (keyToIgnore !== 'type' && filters.type.length > 0 && !filters.type.includes(req.type || '(Vacío)')) return false;
                if (keyToIgnore !== 'urgency' && filters.urgency.length > 0 && !filters.urgency.includes(req.urgency || '(Vacío)')) return false;
                if (keyToIgnore !== 'status' && filters.status.length > 0 && !filters.status.includes(req.status || '(Vacío)')) return false;
                if (keyToIgnore !== 'direction' && filters.direction.length > 0 && !filters.direction.includes(req.direccionSolicitante || '(Vacío)')) return false;
                if (keyToIgnore !== 'requester' && filters.requester.length > 0 && !filters.requester.includes(req.requester || '(Vacío)')) return false;
                if (keyToIgnore !== 'ingresadoGestionDemanda' && filters.ingresadoGestionDemanda.length > 0 && !filters.ingresadoGestionDemanda.includes(req.ingresadoGestionDemanda || '(Vacío)')) return false;
                if (keyToIgnore !== 'brm' && filters.brm.length > 0 && !filters.brm.includes(req.brm || '(Vacío)')) return false;
                if (keyToIgnore !== 'esProyectoSpo' && filters.esProyectoSpo.length > 0 && !filters.esProyectoSpo.includes(req.esProyectoSpo || '(Vacío)')) return false;
                if (keyToIgnore !== 'idDemanda' && filters.idDemanda.length > 0 && !filters.idDemanda.includes(req.idDemanda || '(Vacío)')) return false;
                if (keyToIgnore !== 'institucion' && filters.institucion.length > 0 && !filters.institucion.includes(req.institucion || '(Vacío)')) return false;
                if (keyToIgnore !== 'tipoTarea' && filters.tipoTarea.length > 0 && !filters.tipoTarea.includes(req.tipoTarea || '(Vacío)')) return false;
                if (keyToIgnore !== 'complejidad' && filters.complejidad.length > 0 && !filters.complejidad.includes(req.complejidad || '(Vacío)')) return false;
                return true;
            });
        };

        const sortAndFilter = (arr: any[]) => Array.from(new Set(arr.filter(Boolean))).sort() as string[];

        return {
            domain: sortAndFilter(getOptions('domain').map(r => r.domain || '(Vacío)')),
            type: sortAndFilter(getOptions('type').map(r => r.type || '(Vacío)')),
            urgency: sortAndFilter(getOptions('urgency').map(r => r.urgency || '(Vacío)')),
            status: sortAndFilter(getOptions('status').map(r => r.status || '(Vacío)')),
            direction: sortAndFilter(getOptions('direction').map(r => r.direccionSolicitante || '(Vacío)')),
            requester: sortAndFilter(getOptions('requester').map(r => r.requester || '(Vacío)')),
            ingresadoGestionDemanda: sortAndFilter(getOptions('ingresadoGestionDemanda').map(r => r.ingresadoGestionDemanda || '(Vacío)')),
            brm: sortAndFilter(getOptions('brm').map(r => r.brm || '(Vacío)')),
            esProyectoSpo: sortAndFilter(getOptions('esProyectoSpo').map(r => r.esProyectoSpo || '(Vacío)')),
            idDemanda: sortAndFilter(getOptions('idDemanda').map(r => r.idDemanda || '(Vacío)')),
            institucion: sortAndFilter(getOptions('institucion').map(r => r.institucion || '(Vacío)')),
            tipoTarea: sortAndFilter(getOptions('tipoTarea').map(r => r.tipoTarea || '(Vacío)')),
            complejidad: sortAndFilter(getOptions('complejidad').map(r => r.complejidad || '(Vacío)'))
        };
    }, [requests, filters]);



    const countAdvancedActive = useMemo(() => {
        const advancedKeys: (keyof FilterState)[] = [
            'type', 'urgency', 'direction', 'requester', 
            'ingresadoGestionDemanda', 'brm', 'esProyectoSpo', 
            'idDemanda', 'institucion', 'tipoTarea', 'complejidad', 'onlyMine'
        ];
        return advancedKeys.reduce((acc, key) => {
            const val = filters[key];
            if (Array.isArray(val) && val.length > 0) return acc + 1;
            if (typeof val === 'boolean' && val === true) return acc + 1;
            return acc;
        }, 0);
    }, [filters]);

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

            {/* Header & Main Actions - Compact Version */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-4">
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100 flex-shrink-0">
                        <LayoutGrid size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                            Gestión de Iniciativas
                        </h1>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                            Seguimiento Estratégico
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-full pl-9 pr-8 py-2 bg-slate-100/50 border border-transparent focus:bg-white focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5 rounded-xl outline-none transition-all text-xs font-semibold text-slate-700 placeholder:text-slate-400"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                        {filters.search && (
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 p-1"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                        <button
                            onClick={() => setViewMode('Kanban')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'Kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Kanban"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('Table')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'Table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Tabla"
                        >
                            <List size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('Timeline')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'Timeline' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Cronograma"
                        >
                            <CalendarDays size={16} />
                        </button>
                    </div>
                    
                    <button
                        onClick={() => setIsAIModalOpen(true)}
                        className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-[11px] font-bold transition-all shadow-sm"
                        title="Revisar con IA"
                    >
                        <Sparkles size={14} className="text-blue-400" />
                        <span className="hidden md:inline">IA</span>
                    </button>
                    
                    <button
                        onClick={onImportTickets}
                        className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-[11px] font-bold transition-all"
                        title="Importar Datos"
                    >
                        <DownloadCloud size={14} className="text-slate-400" />
                        <span className="hidden md:inline">Importar</span>
                    </button>
                    
                    <button
                        onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                            isFiltersCollapsed 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title={isFiltersCollapsed ? "Mostrar Filtros" : "Minimizar Filtros"}
                    >
                        {isFiltersCollapsed ? <Filter size={14} /> : <ChevronUp size={14} />}
                        <span className="hidden md:inline">{isFiltersCollapsed ? 'Filtros' : 'Minimizar'}</span>
                        {isFiltersCollapsed && countAdvancedActive > 0 && (
                            <span className="bg-white text-blue-600 text-[9px] w-4 h-4 flex items-center justify-center rounded-full ml-1">
                                {countAdvancedActive}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={onNewRequest}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[11px] font-bold transition-all shadow-md shadow-blue-100"
                    >
                        <Plus size={16} strokeWidth={3} />
                        Nuevo
                    </button>
                </div>
            </div>

            {!isFiltersCollapsed && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Navigation & Toolbar Row - Premium High Density */}
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="relative" ref={filterMenuRef}>
                        <button
                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0 h-10 ${
                                isFilterMenuOpen 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 shadow-sm'
                            }`}
                        >
                            <Save size={13} />
                            <span>Mis Filtros</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${isFilterMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isFilterMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-2">
                                <div className="mb-2 pb-2 border-b border-slate-100">
                                    {!showSaveInput ? (
                                        <button
                                            onClick={() => setShowSaveInput(true)}
                                            className="w-full text-left px-3 py-2 text-[11px] text-blue-600 hover:bg-blue-50 rounded-lg font-bold flex items-center gap-2"
                                        >
                                            <Plus size={14} /> Guardar actual
                                        </button>
                                    ) : (
                                        <div className="flex gap-2 p-1">
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Nombre..."
                                                className="flex-1 text-[11px] border-slate-200 border rounded-lg px-2 py-1 outline-none"
                                                value={newFilterName}
                                                onChange={e => setNewFilterName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleSaveFilter()}
                                            />
                                            <button onClick={handleSaveFilter} className="bg-blue-600 text-white p-1.5 rounded-lg"><Save size={14} /></button>
                                        </div>
                                    )}
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                    {savedFilters.length === 0 ? (
                                        <div className="text-center py-4 text-slate-400 text-[10px] italic">No hay filtros</div>
                                    ) : (
                                        savedFilters.map(filter => (
                                            <div
                                                key={filter.id}
                                                onClick={() => {
                                                    setFilters({ ...INITIAL_FILTER_STATE, ...filter.config });
                                                    setIsFilterMenuOpen(false);
                                                }}
                                                className="group flex items-center justify-between px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer"
                                            >
                                                <span className="font-bold">{filter.name}</span>
                                                <button onClick={(e) => handleDeleteFilter(filter.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                        <div className="hidden lg:flex items-center gap-2 border-l border-slate-100 pl-2">
                            <MultiSelectDropdown
                                icon={<Globe size={12} />}
                                label="Dominio"
                                options={availableOptions.domain}
                                selected={filters.domain}
                                onChange={(vals) => handleFilterArrayChange('domain', vals)}
                                placeholder="Todos"
                                className="w-[125px]"
                            />
                            <MultiSelectDropdown
                                icon={<Activity size={12} />}
                                label="Estado"
                                options={availableOptions.status}
                                selected={filters.status}
                                onChange={(vals) => handleFilterArrayChange('status', vals)}
                                placeholder="Todos"
                                className="w-[125px]"
                            />
                        </div>

                    <div className="flex items-center gap-2 border-l border-slate-100 pl-2">
                        <MultiSelectDropdown
                            icon={<Users size={12} />}
                            label="Responsable"
                            options={['(Vacío)', ...usuarios.map(u => u.nombre_completo)]}
                            selected={[
                                ...(filters.assigneeIds.includes('(Vacío)') ? ['(Vacío)'] : []),
                                ...usuarios.filter(u => filters.assigneeIds?.includes(u.id)).map(u => u.nombre_completo)
                            ]}
                            onChange={(vals) => {
                                const newIds = [
                                    ...(vals.includes('(Vacío)') ? ['(Vacío)'] : []),
                                    ...usuarios.filter(u => vals.includes(u.nombre_completo)).map(u => u.id)
                                ];
                                handleFilterArrayChange('assigneeIds', newIds);
                            }}
                            placeholder="Todos"
                            className="w-[145px]"
                        />

                        <div className="relative" ref={advancedFiltersRef}>
                            <button 
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                    countAdvancedActive > 0 
                                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 shadow-sm'
                                } h-10`}
                            >
                                <SlidersHorizontal size={14} />
                                <span>Filtros</span>
                                {countAdvancedActive > 0 && (
                                    <span className="bg-blue-600 text-white text-[9px] min-w-[16px] h-4 flex items-center justify-center rounded-full px-1">
                                        {countAdvancedActive}
                                    </span>
                                )}
                                <ChevronDown size={12} className={`transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                            </button>

                            {showAdvancedFilters && (
                                <div className="absolute right-0 top-full mt-2 w-[550px] bg-white rounded-xl shadow-2xl border border-slate-200 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                    <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Settings2 size={16} className="text-blue-600" />
                                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Filtros Avanzados</h3>
                                        </div>
                                        <button onClick={() => setShowAdvancedFilters(false)} className="text-slate-400 hover:text-slate-600">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    
                                    <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 max-h-[450px] overflow-y-auto custom-scrollbar bg-white">
                                        <MultiSelectDropdown
                                            icon={<Briefcase size={12} />}
                                            label="BRM"
                                            options={availableOptions.brm}
                                            selected={filters.brm}
                                            onChange={(vals) => handleFilterArrayChange('brm', vals)}
                                            placeholder="Cualquiera"
                                        />
                                        <MultiSelectDropdown
                                            icon={<Globe size={12} />}
                                            label="Dirección"
                                            options={availableOptions.direction}
                                            selected={filters.direction}
                                            onChange={(vals) => handleFilterArrayChange('direction', vals)}
                                            placeholder="Cualquiera"
                                        />
                                        <MultiSelectDropdown
                                            icon={<User size={12} />}
                                            label="Solicitante"
                                            options={availableOptions.requester}
                                            selected={filters.requester}
                                            onChange={(vals) => handleFilterArrayChange('requester', vals)}
                                            placeholder="Cualquiera"
                                        />
                                        <MultiSelectDropdown
                                            icon={<Target size={12} />}
                                            label="G. Demanda"
                                            options={availableOptions.ingresadoGestionDemanda}
                                            selected={filters.ingresadoGestionDemanda}
                                            onChange={(vals) => handleFilterArrayChange('ingresadoGestionDemanda', vals)}
                                            placeholder="Cualquiera"
                                        />
                                        <MultiSelectDropdown
                                            icon={<Hash size={12} />}
                                            label="ID Demanda"
                                            options={availableOptions.idDemanda}
                                            selected={filters.idDemanda}
                                            onChange={(vals) => handleFilterArrayChange('idDemanda', vals)}
                                            placeholder="Cualquiera"
                                        />
                                        <MultiSelectDropdown
                                            icon={<Building2 size={12} />}
                                            label="Institución"
                                            options={availableOptions.institucion}
                                            selected={filters.institucion}
                                            onChange={(vals) => handleFilterArrayChange('institucion', vals)}
                                            placeholder="Cualquiera"
                                        />
                                        <MultiSelectDropdown
                                            icon={<ClipboardList size={12} />}
                                            label="Tipo Tarea"
                                            options={availableOptions.tipoTarea}
                                            selected={filters.tipoTarea}
                                            onChange={(vals) => handleFilterArrayChange('tipoTarea', vals)}
                                            placeholder="Cualquiera"
                                        />
                                        <MultiSelectDropdown
                                            icon={<Activity size={12} />}
                                            label="Complejidad"
                                            options={availableOptions.complejidad}
                                            selected={filters.complejidad}
                                            onChange={(vals) => handleFilterArrayChange('complejidad', vals)}
                                            placeholder="Cualquiera"
                                        />
                                        <MultiSelectDropdown
                                            icon={<AlertCircle size={12} />}
                                            label="Urgencia"
                                            options={availableOptions.urgency}
                                            selected={filters.urgency}
                                            onChange={(vals) => handleFilterArrayChange('urgency', vals)}
                                            placeholder="Cualquiera"
                                        />
                                        <MultiSelectDropdown
                                            icon={<Tag size={12} />}
                                            label="Tipo"
                                            options={availableOptions.type}
                                            selected={filters.type}
                                            onChange={(vals) => handleFilterArrayChange('type', vals)}
                                            placeholder="Cualquiera"
                                        />
                                        
                                        <div className="col-span-2 pt-3 mt-1 border-t border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-2 cursor-pointer group">
                                                    <div className="relative inline-block w-8 h-4 align-middle select-none transition duration-200 ease-in">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={filters.onlyMine}
                                                            onChange={(e) => setFilters(prev => ({ ...prev, onlyMine: e.target.checked }))}
                                                            className="absolute block w-4 h-4 rounded-full bg-white border-2 border-slate-300 appearance-none cursor-pointer checked:right-0 checked:border-blue-600 transition-all duration-200"
                                                            style={{ right: filters.onlyMine ? '0' : '16px' }}
                                                        />
                                                        <div className={`block overflow-hidden h-4 rounded-full cursor-pointer transition-colors ${filters.onlyMine ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight group-hover:text-blue-600 transition-colors">Solo mis iniciativas</span>
                                                </label>
                                            </div>

                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        setFilters(INITIAL_FILTER_STATE);
                                                        setShowAdvancedFilters(false);
                                                    }}
                                                    className="px-4 py-2 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition-all uppercase tracking-wider"
                                                >
                                                    Limpiar
                                                </button>
                                                <button 
                                                    onClick={() => setShowAdvancedFilters(false)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg text-[10px] font-bold shadow-lg shadow-blue-200 transition-all uppercase tracking-wider"
                                                >
                                                    Listo
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filter Chips - Inline */}
                    <div className="hidden xl:flex items-center gap-1.5 ml-2 border-l border-slate-100 pl-2">
                        {[
                            ...filters.domain.map(f => ({ key: 'domain', val: f })),
                            ...filters.status.map(f => ({ key: 'status', val: f })),
                            ...filters.assigneeIds.map(f => ({ 
                                key: 'assigneeIds', 
                                val: f === '(Vacío)' ? '(Sin Resp.)' : (usuarios.find(u => u.id === f)?.nombre_completo.split(' ')[0] || f) 
                            }))
                        ].slice(0, 3).map((item, i) => (
                            <span key={i} className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold rounded border border-blue-100 uppercase tracking-tight">
                                {item.val}
                                <button onClick={() => handleFilterChange(item.key as keyof FilterState, item.val)} className="hover:text-blue-900">
                                    <X size={8} />
                                </button>
                            </span>
                        ))}
                        {(filters.domain?.length > 0 || filters.status?.length > 0 || filters.assigneeIds?.length > 0) && (
                            <button 
                                onClick={() => setFilters(INITIAL_FILTER_STATE)}
                                className="text-[9px] font-bold text-red-500 hover:text-red-700 ml-1 uppercase"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>



            {/* Mobile Filter Toggle */}
            <div className="md:hidden flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-blue-600" />
                    <span className="text-sm font-semibold text-slate-700">Filtros Avanzados</span>
                    {countAdvancedActive > 0 && (
                        <span className="bg-blue-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                            {countAdvancedActive}
                        </span>
                    )}
                </div>
                <button 
                    onClick={() => setIsFiltersVisibleMobile(!isFiltersVisibleMobile)}
                    className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-bold transition-all hover:bg-blue-100"
                >
                    {isFiltersVisibleMobile ? 'Ocultar' : 'Mostrar'}
                </button>
            </div>


                        </div>
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {viewMode === 'Kanban' ? (
                    <KanbanBoard
                        requests={filteredRequests}
                        onEdit={onEditRequest}
                        onDuplicate={onDuplicateRequest}
                        onStatusChange={onStatusChange}
                        catalogosUrgencia={catalogos.filter(c => c.tipo === 'urgencia').sort((a, b) => (a.orden || 0) - (b.orden || 0))}
                        catalogos={catalogos}
                        onColumnOrderChange={onUpdateCatalogoOrder}
                        onUpdateSolicitudesOrder={onUpdateSolicitudesOrder}
                        umbrales={umbrales}
                        canEdit={canEdit}
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
                        canEdit={canEdit}
                        getVisible={getVisible}
                        exportFields={exportFields}
                    />
                )}
            </div>
        </div>
    );
};