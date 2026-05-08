import React, { useState, useEffect } from 'react';
import { CatalogItem, CatalogoItem, CatalogType, User, ITRequest } from '../../types';
import { Shield, Trash2, UserPlus, FolderPlus, AlertTriangle, Edit2, Save, X, Plus, Tag, LayoutGrid, List, GripVertical, ChevronDown, Users, Settings, Briefcase } from 'lucide-react';
import { useUsuarios } from '../../hooks/useUsuarios';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface AdminPanelProps {
    domains: CatalogItem[];
    users: User[];
    onUpdateDomain: (domain: CatalogItem) => void;
    onAddDomain: (name: string) => void;
    onDeleteDomain?: (id: string) => void;
    catalogos: CatalogoItem[];
    onAddCatalogo: (tipo: CatalogType, valor: string) => void;
    onUpdateCatalogo: (id: string, cambios: Partial<Pick<CatalogoItem, 'valor' | 'esta_activo' | 'color' | 'abreviatura' | 'orden'>>) => void;
    onDeleteCatalogo: (id: string) => void;
    getModo: (tipo: CatalogType) => 'desplegable' | 'cuadros';
    setModo: (tipo: CatalogType, modo: 'desplegable' | 'cuadros') => void;
    requests: ITRequest[];
}

type AdminTab = 'catalogs' | 'users' | 'workspaces' | 'settings';

const CATALOG_SECTIONS: { tipo: CatalogType; label: string }[] = [
    { tipo: 'dominios', label: 'Dominios TI' },
    { tipo: 'tipo_requerimiento', label: 'Tipo de Requerimiento' },
    { tipo: 'urgencia', label: 'Urgencia' },
    { tipo: 'prioridad', label: 'Prioridad' },
    { tipo: 'estado', label: 'Estado' },
    { tipo: 'usuario_solicitante', label: 'Usuario Solicitante' },
    { tipo: 'direccion_solicitante', label: 'Dirección Solicitante' },
    { tipo: 'asignado_a', label: 'Asignado A' },
    { tipo: 'brm', label: 'BRM' },
    { tipo: 'institucion', label: 'Institución' },
    { tipo: 'tipo_tarea', label: 'Tipo de Tarea' },
    { tipo: 'complejidad', label: 'Complejidad' },
    { tipo: 'ingresado_gestion_demanda', label: 'Ingresado en Gestión de la Demanda' },
    { tipo: 'tipo_actividad_calendario', label: 'Tipo de Actividad Calendario' },
];

// ─── Componente Sortable para un Item de Catálogo ────────────────────────────
const SortableCatalogItemRow: React.FC<{
    item: CatalogoItem;
    tipo: CatalogType;
    editId: string | null;
    editVal: string;
    editAbrev: string;
    setEditId: (id: string | null) => void;
    setEditVal: (val: string) => void;
    setEditAbrev: (abrev: string) => void;
    handleSaveEdit: (id: string) => void;
    onUpdate: (id: string, cambios: Partial<CatalogoItem>) => void;
    handleDeleteClick: (item: CatalogoItem) => void;
}> = ({ item, tipo, editId, editVal, editAbrev, setEditId, setEditVal, setEditAbrev, handleSaveEdit, onUpdate, handleDeleteClick }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 'auto',
        position: 'relative'
    };

    return (
        <div ref={setNodeRef} style={style} className={`flex items-center justify-between px-4 py-2.5 group ${!item.esta_activo ? 'bg-slate-50' : 'bg-white'}`}>
            {editId === item.id ? (
                <div className="flex items-center gap-2 flex-1">
                    <input autoFocus type="text" placeholder="Valor"
                        className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                        value={editVal} onChange={e => setEditVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(item.id); if (e.key === 'Escape') setEditId(null); }} />
                    <input type="text" placeholder="Abrev."
                        className="w-20 border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-violet-500 outline-none"
                        value={editAbrev} onChange={e => setEditAbrev(e.target.value)} />
                    <button onClick={() => handleSaveEdit(item.id)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save size={13} /></button>
                    <button onClick={() => setEditId(null)} className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={13} /></button>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2">
                        <button {...attributes} {...listeners} className="cursor-grab text-slate-300 hover:text-slate-500 p-0.5 rounded hover:bg-slate-200 shrink-0">
                            <GripVertical size={14} />
                        </button>
                        <div className={`w-1.5 h-1.5 rounded-full ${item.esta_activo ? 'bg-green-500' : 'bg-slate-300'}`} />
                        {(tipo === 'urgencia' || tipo === 'tipo_actividad_calendario') && (
                            <label className="cursor-pointer" title="Cambiar color">
                                <div className="w-5 h-5 rounded border border-slate-300 shadow-sm flex-shrink-0"
                                    style={{ backgroundColor: item.color || '#94a3b8' }} />
                                <input type="color" className="sr-only"
                                    value={item.color || '#94a3b8'}
                                    onChange={e => onUpdate(item.id, { color: e.target.value })} />
                            </label>
                        )}
                        <span className={`text-sm ${!item.esta_activo ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.valor}</span>
                        {item.abreviatura && (
                            <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded font-mono font-medium">
                                {item.abreviatura}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditId(item.id); setEditVal(item.valor); setEditAbrev(item.abreviatura || ''); }}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded" title="Editar"><Edit2 size={12} /></button>
                        <button onClick={() => onUpdate(item.id, { esta_activo: !item.esta_activo })}
                            className={`text-xs px-2 py-0.5 rounded border transition-colors ${item.esta_activo ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                            {item.esta_activo ? 'Desact.' : 'Activar'}
                        </button>
                        <button onClick={() => handleDeleteClick(item)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Eliminar"><Trash2 size={12} /></button>
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Sub-componente: lista de un catálogo ───────────────────────────────────
const CatalogSection: React.FC<{
    tipo: CatalogType;
    label: string;
    items: CatalogoItem[];
    modo: 'desplegable' | 'cuadros';
    onAdd: (tipo: CatalogType, valor: string) => void;
    onUpdate: (id: string, cambios: Partial<Pick<CatalogoItem, 'valor' | 'esta_activo' | 'color' | 'abreviatura' | 'orden'>>) => void;
    onDelete: (id: string) => void;
    onToggleModo: () => void;
    requests: ITRequest[];
}> = ({ tipo, label, items, modo, onAdd, onUpdate, onDelete, onToggleModo, requests }) => {
    const [adding, setAdding] = useState(false);
    const [newVal, setNewVal] = useState('');
    const [newAbrev, setNewAbrev] = useState('');
    const [editId, setEditId] = useState<string | null>(null);
    const [editVal, setEditVal] = useState('');
    const [editAbrev, setEditAbrev] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleAdd = () => {
        if (newVal.trim()) {
            onAdd(tipo, newVal.trim());
            // Guardar abreviatura si se ingresó — se hace en un segundo paso tras crear
            setNewVal(''); setNewAbrev(''); setAdding(false);
        }
    };
    const handleSaveEdit = (id: string) => {
        if (editVal.trim()) {
            onUpdate(id, { valor: editVal.trim(), abreviatura: editAbrev.trim() || null });
            setEditId(null);
        }
    };

    const handleDeleteClick = (item: CatalogoItem) => {
        if (tipo === 'estado') {
            const count = requests.filter(r => r.status === item.valor).length;
            if (count > 0) {
                if (confirm(`ADVERTENCIA CRÍTICA:\n\nEl estado "${item.valor}" contiene ${count} solicitudes.\nSi lo eliminas, SE ELIMINARÁN TODAS ESTAS SOLICITUDES permanentemente.\n\n¿Estás realmente seguro de continuar?`)) {
                    onDelete(item.id);
                }
                return;
            }
        }

        if (confirm(`¿Eliminar "${item.valor}"?`)) onDelete(item.id);
    };

    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div 
                className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    <Tag size={14} className="text-blue-500" />
                    <span className="text-sm font-semibold text-slate-700 select-none">{label}</span>
                    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Toggle modo visualización */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleModo(); }}
                        title={modo === 'desplegable' ? 'Cambiar a cuadros de selección rápida' : 'Cambiar a lista desplegable'}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${modo === 'cuadros'
                            ? 'bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100'
                            : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'
                            }`}
                    >
                        {modo === 'cuadros' ? <LayoutGrid size={11} /> : <List size={11} />}
                        {modo === 'cuadros' ? 'Cuadros' : 'Desplegable'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setAdding(true); setIsExpanded(true); }}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                        <Plus size={12} /> Agregar
                    </button>
                </div>
            </div>

            {isExpanded && (
                <>
                    {adding && (
                        <div className="px-4 py-3 bg-blue-50 border-b border-slate-200 space-y-2">
                            <div className="flex items-center gap-2">
                                <input autoFocus type="text" placeholder="Valor completo (ej: Análisis)"
                                    className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={newVal} onChange={e => setNewVal(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }} />
                                <input type="text" placeholder="Abrev. (ej: ANL)"
                                    className="w-24 border border-slate-300 rounded px-2 py-1 text-sm bg-white text-slate-900 focus:ring-1 focus:ring-violet-500 outline-none"
                                    value={newAbrev} onChange={e => setNewAbrev(e.target.value)} />
                                <button onClick={handleAdd} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"><Save size={13} /></button>
                                <button onClick={() => { setAdding(false); setNewVal(''); setNewAbrev(''); }} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded"><X size={13} /></button>
                            </div>
                            <p className="text-xs text-slate-400">La abreviatura se muestra en modo "Cuadros" en el formulario.</p>
                        </div>
                    )}

                    {items.length === 0 && !adding ? (
                        <p className="text-xs text-slate-400 text-center py-4">Sin valores. Agrega el primero.</p>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={({ active, over }) => {
                                    if (active.id !== over?.id) {
                                        const oldIndex = items.findIndex(i => i.id === active.id);
                                        const newIndex = items.findIndex(i => i.id === over?.id);
                                        const sorted = arrayMove(items, oldIndex, newIndex) as CatalogoItem[];
                                        // Actualizar todos los órdenes
                                        sorted.forEach((item, index) => {
                                            if (item.orden !== index) {
                                                onUpdate(item.id, { orden: index });
                                            }
                                        });
                                    }
                                }}
                            >
                                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                    {items.sort((a, b) => (a.orden || 0) - (b.orden || 0)).map(item => (
                                        <SortableCatalogItemRow
                                            key={item.id}
                                            item={item}
                                            tipo={tipo}
                                            editId={editId}
                                            editVal={editVal}
                                            editAbrev={editAbrev}
                                            setEditId={setEditId}
                                            setEditVal={setEditVal}
                                            setEditAbrev={setEditAbrev}
                                            handleSaveEdit={handleSaveEdit}
                                            onUpdate={onUpdate}
                                            handleDeleteClick={handleDeleteClick}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}
                </>
            )}
            <div className="bg-slate-50/50 px-4 py-1.5 border-t border-slate-100 flex items-center justify-end">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight italic">
                    Valores aislados por Ecosistema
                </span>
            </div>
        </div>
    );
};

// ─── Componente principal ────────────────────────────────────────────────────
export const AdminPanel: React.FC<AdminPanelProps> = ({
    domains, users: initialUsers, onUpdateDomain, onAddDomain, onDeleteDomain,
    catalogos, onAddCatalogo, onUpdateCatalogo, onDeleteCatalogo,
    getModo, setModo, requests
}) => {
    const { 
        workspaces, 
        currentWorkspace, 
        crearWorkspace, 
        obtenerMiembros, 
        agregarMiembro, 
        actualizarMiembro, 
        removerMiembro 
    } = useWorkspaces();
    const { usuarios, cargando: cargandoUsuarios, actualizarUsuario, eliminarUsuario } = useUsuarios({ global: true });
    const { permitirRegistro, actualizarPermisoRegistro, umbrales, actualizarUmbrales, cargando: cargandoSettings } = useAppSettings(currentWorkspace?.id);
    const [activeTab, setActiveTab] = useState<AdminTab>('catalogs');
    const [isThresholdsOpen, setIsThresholdsOpen] = useState(false);
    
    // Estados para umbrales temporales en el formulario
    const [tempYellow, setTempYellow] = useState<number>(umbrales.yellow);
    const [tempRed, setTempRed] = useState<number>(umbrales.red);

    useEffect(() => {
        setTempYellow(umbrales.yellow);
        setTempRed(umbrales.red);
    }, [umbrales]);

    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editUserName, setEditUserName] = useState('');
    const [editUserRole, setEditUserRole] = useState('');

    const [wsMembers, setWsMembers] = useState<any[]>([]);
    const [cargandoMembers, setCargandoMembers] = useState(false);
    const [isAddingWs, setIsAddingWs] = useState(false);
    const [newWsName, setNewWsName] = useState('');
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [selectedUserForWs, setSelectedUserForWs] = useState('');

    const handleUpdateMember = async (memberId: string, cambios: Partial<WorkspaceMember>) => {
        // 1. Actualización optimista local para respuesta instantánea
        setWsMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...cambios } : m));
        
        try {
            // 2. Persistir en DB
            await actualizarMiembro(memberId, cambios);
        } catch (e) {
            console.error(e);
            alert("No se pudo actualizar el permiso en el servidor.");
            // 3. Revertir si hay error (recargando de la DB)
            cargarMiembros();
        }
    };

    const cargarMiembros = async (showLoader = true) => {
        if (!currentWorkspace) return;
        if (showLoader) setCargandoMembers(true);
        try {
            const data = await obtenerMiembros(currentWorkspace.id);
            setWsMembers(data);
        } catch (e) {
            console.error(e);
        } finally {
            if (showLoader) setCargandoMembers(false);
        }
    };

    React.useEffect(() => {
        if (activeTab === 'workspaces' && currentWorkspace) {
            cargarMiembros();
        }
    }, [activeTab, currentWorkspace]);

    const handleSaveUser = async (id: string) => {
        if (editUserName.trim() && editUserRole.trim()) {
            await actualizarUsuario(id, { nombre_completo: editUserName.trim(), rol: editUserRole });
            setEditingUserId(null);
        }
    };

    const handleDeleteUser = async (id: string, name: string) => {
        if (confirm(`Alerta: Eliminar a un usuario podría afectar registros históricos si el usuario ha creado o tiene solicitudes asignadas.\n\n¿Estás seguro que deseas intentar eliminar permanentemente a "${name}"?`)) {
            const { error } = await eliminarUsuario(id);
            if (error) {
                alert(`No se pudo eliminar al usuario. Es posible que tenga solicitudes asociadas.\nDetalles: ${error.message}`);
            }
        }
    };



    const tabs: { id: AdminTab; label: string }[] = [
        { id: 'catalogs', label: 'Catálogos' },
        { id: 'users', label: 'Usuarios Globales' },
        { id: 'workspaces', label: 'Espacios de Trabajo' },
        { id: 'settings', label: 'Configuración' },
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="border-b border-slate-200 px-6 py-5 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Shield className="text-blue-600" size={22} /> Panel de Administración
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Gestiona dominios, catálogos de valores y usuarios del sistema.</p>
                    </div>
                    {currentWorkspace && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl shadow-lg">
                            <div className="flex flex-col items-end text-right">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter leading-none mb-1">Espacio de Trabajo</span>
                                <span className="text-xs font-extrabold text-blue-400 uppercase tracking-widest leading-none">
                                    {currentWorkspace.nombre}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Sidebar nav */}
                <div className="w-56 border-r border-slate-200 p-4 space-y-1 flex-shrink-0 overflow-y-auto">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-y-auto">

                    {/* ── TAB: Catálogos (Incluye Dominios y Listas de Valores) ── */}
                    {activeTab === 'catalogs' && (
                        <div className="space-y-4">
                            {CATALOG_SECTIONS.map(({ tipo, label }) => {
                                // Mapeo especial para Dominios TI
                                if (tipo === 'dominios') {
                                    const domainItems: CatalogoItem[] = domains.map(d => ({
                                        id: d.id,
                                        valor: d.name,
                                        tipo: 'dominios',
                                        esta_activo: d.isActive,
                                        orden: d.orden || 0
                                    }));

                                    return (
                                        <CatalogSection
                                            key="dominios"
                                            tipo="dominios"
                                            label="Dominios TI"
                                            items={domainItems}
                                            modo={getModo('dominios')}
                                            onAdd={(_, val) => onAddDomain(val)}
                                            onUpdate={(id, cambios) => {
                                                const d = domains.find(x => x.id === id);
                                                if (!d) return;
                                                onUpdateDomain({
                                                    ...d,
                                                    name: cambios.valor !== undefined ? cambios.valor : d.name,
                                                    isActive: cambios.esta_activo !== undefined ? cambios.esta_activo : d.isActive,
                                                    orden: cambios.orden !== undefined ? cambios.orden : d.orden
                                                });
                                            }}
                                            onDelete={onDeleteDomain || (() => {})}
                                            onToggleModo={() => setModo('dominios', getModo('dominios') === 'desplegable' ? 'cuadros' : 'desplegable')}
                                            requests={requests}
                                        />
                                    );
                                }

                                // Renderizado normal para el resto de catálogos
                                return (
                                    <CatalogSection
                                        key={tipo}
                                        tipo={tipo}
                                        label={label}
                                        items={catalogos.filter(c => c.tipo === tipo)}
                                        modo={getModo(tipo)}
                                        onAdd={onAddCatalogo}
                                        onUpdate={onUpdateCatalogo}
                                        onDelete={onDeleteCatalogo}
                                        onToggleModo={() => setModo(tipo, getModo(tipo) === 'desplegable' ? 'cuadros' : 'desplegable')}
                                        requests={requests}
                                    />
                                );
                            })}

                            {/* ── Sección Umbrales del Semáforo (Configuración por Espacio) ── */}
                            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                                <button
                                    onClick={() => setIsThresholdsOpen(!isThresholdsOpen)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                            <AlertTriangle size={20} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-slate-800">Umbrales del Semáforo de Tiempo</h3>
                                            <p className="text-xs text-slate-500">Define cuándo cambian de color las iniciativas según su antigüedad en el mismo estado.</p>
                                        </div>
                                    </div>
                                    <ChevronDown size={20} className={`text-slate-400 transition-transform ${isThresholdsOpen ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {isThresholdsOpen && (
                                    <div className="p-6 border-t border-slate-100 bg-slate-50/30">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                                                    Días para Alerta Amarilla
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    value={tempYellow}
                                                    onChange={e => setTempYellow(parseInt(e.target.value) || 0)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                                    Días para Alerta Roja (Crítica)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    value={tempRed}
                                                    onChange={e => setTempRed(parseInt(e.target.value) || 0)}
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-6 flex justify-end">
                                            <button
                                                onClick={async () => {
                                                    await actualizarUmbrales(tempYellow, tempRed);
                                                    alert('Umbrales actualizados correctamente para este espacio.');
                                                }}
                                                className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                                            >
                                                <Save size={16} /> Guardar Configuración
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="bg-slate-50/50 px-4 py-1.5 border-t border-slate-100 flex items-center justify-end">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight italic">
                                        Configuración local del Ecosistema
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: Usuarios ── */}
                    {activeTab === 'users' && (
                        <div>
                            {/* Panel de Configuración de Acceso */}
                            <div className="mb-6 p-5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                                <div>
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <Shield size={18} className="text-violet-600" />
                                        Control de Registro Público
                                    </h4>
                                    <p className="text-sm text-slate-500 mt-1 max-w-xl">
                                        Si está desactivado, se ocultará el formulario de "Crear Cuenta" en la pantalla de inicio de sesión.
                                        Los nuevos usuarios no podrán auto-registrarse.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-medium ${permitirRegistro ? 'text-green-600' : 'text-slate-500'}`}>
                                        {cargandoSettings ? 'Cargando...' : permitirRegistro ? 'Habilitado' : 'Deshabilitado'}
                                    </span>
                                    <button
                                        disabled={cargandoSettings}
                                        onClick={() => actualizarPermisoRegistro(!permitirRegistro)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${permitirRegistro ? 'bg-green-500' : 'bg-slate-300'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${permitirRegistro ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold text-lg text-slate-800">Miembros del Equipo</h3>
                                <button className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
                                    <UserPlus size={15} /> Invitar Usuario
                                </button>
                            </div>
                            {cargandoUsuarios ? (
                                <div className="text-center py-16 text-slate-400">
                                    <p className="font-medium animate-pulse">Cargando usuarios...</p>
                                </div>
                            ) : usuarios.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <p className="font-medium">No hay usuarios registrados aún.</p>
                                    <p className="text-sm mt-1">Los usuarios aparecerán aquí cuando se registren en el sistema.</p>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-slate-200 overflow-hidden">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {usuarios.map(user => (
                                                <tr key={user.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4">
                                                        {editingUserId === user.id ? (
                                                            <div className="flex flex-col gap-1">
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    className="border border-slate-300 rounded px-2 py-1 text-sm bg-white focus:ring-1 focus:ring-blue-500 outline-none w-full max-w-[200px]"
                                                                    value={editUserName}
                                                                    onChange={e => setEditUserName(e.target.value)}
                                                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveUser(user.id); if (e.key === 'Escape') setEditingUserId(null); }}
                                                                />
                                                                <div className="text-xs text-slate-500">{user.correo_electronico}</div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="text-sm font-medium text-slate-900">{user.nombre_completo}</div>
                                                                <div className="text-xs text-slate-500">{user.correo_electronico}</div>
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {editingUserId === user.id ? (
                                                            <select
                                                                className="border border-slate-300 rounded px-2 py-1 text-sm bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                                                                value={editUserRole}
                                                                onChange={e => setEditUserRole(e.target.value)}
                                                            >
                                                                <option value="Colaborador">Colaborador</option>
                                                                <option value="Administrador">Administrador</option>
                                                            </select>
                                                        ) : (
                                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${user.rol === 'Administrador' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                {user.rol}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {editingUserId === user.id ? (
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button onClick={() => handleSaveUser(user.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Guardar"><Save size={16} /></button>
                                                                <button onClick={() => setEditingUserId(null)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Cancelar"><X size={16} /></button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    onClick={() => { setEditingUserId(user.id); setEditUserName(user.nombre_completo); setEditUserRole(user.rol); }}
                                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded" title="Editar"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteUser(user.id, user.nombre_completo)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="Eliminar"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB: Espacios de Trabajo ── */}
                    {activeTab === 'workspaces' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold text-lg text-slate-800">Grupos de Trabajo</h3>
                                    <p className="text-sm text-slate-500 mt-0.5">Crea espacios aislados y gestiona quién tiene acceso a cada uno.</p>
                                </div>
                                <button 
                                    onClick={() => setIsAddingWs(true)}
                                    className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm"
                                >
                                    <Briefcase size={15} /> Nuevo Grupo
                                </button>
                            </div>

                            {isAddingWs && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Nombre del Grupo</label>
                                        <input 
                                            autoFocus
                                            type="text"
                                            placeholder="Ej. Frente Comercial"
                                            className="w-full border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newWsName}
                                            onChange={e => setNewWsName(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-end gap-2 pt-5">
                                        <button 
                                            onClick={async () => {
                                                if (newWsName.trim()) {
                                                    await crearWorkspace(newWsName.trim());
                                                    setNewWsName('');
                                                    setIsAddingWs(false);
                                                }
                                            }}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                                        >
                                            Crear
                                        </button>
                                        <button onClick={() => setIsAddingWs(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                    </div>
                                </div>
                            )}

                            {/* Gestión de Miembros del Workspace Activo */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-200 bg-white flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800">Miembros de: {currentWorkspace?.nombre}</h4>
                                            <p className="text-xs text-slate-500">Define roles de Lectura o Edición para este grupo específico.</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsAddingMember(true)}
                                        className="text-sm flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-medium transition-colors"
                                    >
                                        <UserPlus size={15} /> Añadir Miembro
                                    </button>
                                </div>

                                {isAddingMember && (
                                    <div className="p-4 border-b border-slate-200 bg-white flex items-end gap-3 animate-in fade-in">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seleccionar Usuario</label>
                                            <select 
                                                className="w-full border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={selectedUserForWs}
                                                onChange={e => setSelectedUserForWs(e.target.value)}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {usuarios.filter(u => !wsMembers.some(m => m.usuario_id === u.id)).map(u => (
                                                    <option key={u.id} value={u.id}>{u.nombre_completo} ({u.correo_electronico})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                disabled={!selectedUserForWs}
                                                onClick={async () => {
                                                    if (selectedUserForWs && currentWorkspace) {
                                                        await agregarMiembro(currentWorkspace.id, selectedUserForWs, 'lectura', 'lectura');
                                                        setSelectedUserForWs('');
                                                        setIsAddingMember(false);
                                                        cargarMiembros();
                                                    }
                                                }}
                                                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
                                            >
                                                Añadir
                                            </button>
                                            <button onClick={() => setIsAddingMember(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 rounded-lg">Cerrar</button>
                                        </div>
                                    </div>
                                )}

                                <div className="p-0">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-100/50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Miembro</th>
                                                <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Iniciativas</th>
                                                <th className="px-6 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Tareas</th>
                                                <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {cargandoMembers ? (
                                                <tr><td colSpan={4} className="py-8 text-center text-slate-400 text-sm">Cargando miembros...</td></tr>
                                            ) : wsMembers.length === 0 ? (
                                                <tr><td colSpan={4} className="py-8 text-center text-slate-400 text-sm">No hay miembros en este grupo aún.</td></tr>
                                            ) : wsMembers.map(m => (
                                                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-700 text-sm">{m.usuarios?.nombre_completo}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono">{m.usuarios?.correo_electronico}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <select 
                                                            className={`text-xs font-semibold rounded-full px-3 py-1 border outline-none transition-colors cursor-pointer ${m.rol_iniciativas === 'edicion' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                                                            value={m.rol_iniciativas}
                                                            onChange={(e) => handleUpdateMember(m.id, { rol_iniciativas: e.target.value as any })}
                                                        >
                                                            <option value="lectura">Lectura</option>
                                                            <option value="edicion">Edición</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <select 
                                                            className={`text-xs font-semibold rounded-full px-3 py-1 border outline-none transition-colors cursor-pointer ${m.rol_tareas === 'edicion' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                                                            value={m.rol_tareas}
                                                            onChange={(e) => handleUpdateMember(m.id, { rol_tareas: e.target.value as any })}
                                                        >
                                                            <option value="lectura">Lectura</option>
                                                            <option value="edicion">Edición</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button 
                                                            onClick={async () => {
                                                                if(confirm('¿Remover a este usuario del grupo?')) {
                                                                    await removerMiembro(m.id);
                                                                    cargarMiembros();
                                                                }
                                                            }}
                                                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: Configuración ── */}
                    {activeTab === 'settings' && (
                        <div className="space-y-8">
                            <div className="mb-5">
                                <h3 className="font-semibold text-lg text-slate-800">Configuración General del Sistema</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Ajusta parámetros globales que afectan el comportamiento y alertas de la aplicación.
                                </p>
                            </div>

                            {/* Control de Registro Público */}
                            <div className="p-5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                                <div>
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <Shield size={18} className="text-violet-600" />
                                        Control de Registro Público
                                    </h4>
                                    <p className="text-sm text-slate-500 mt-1 max-w-xl">
                                        Si está desactivado, se ocultará el formulario de "Crear Cuenta" en la pantalla de inicio de sesión.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-medium ${permitirRegistro ? 'text-green-600' : 'text-slate-500'}`}>
                                        {cargandoSettings ? 'Cargando...' : permitirRegistro ? 'Habilitado' : 'Deshabilitado'}
                                    </span>
                                    <button
                                        disabled={cargandoSettings}
                                        onClick={() => actualizarPermisoRegistro(!permitirRegistro)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${permitirRegistro ? 'bg-green-500' : 'bg-slate-300'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${permitirRegistro ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};