import React, { useState } from 'react';
import { useTareas } from '../../hooks/useTareas';
import { Columna } from './Columna';
import { TarjetaTarea } from './TarjetaTarea';
import { Plus, Loader2 } from 'lucide-react';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    horizontalListSortingStrategy,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Tarea } from '../../lib/supabase/tipos-bd';

export const TareasBoard: React.FC = () => {
    const {
        tareas,
        columnas,
        cargando,
        crearColumna,
        actualizarColumna,
        eliminarColumna,
        crearTarea,
        actualizarTarea,
        eliminarTarea,
        moverTarea,
        duplicarTarea
    } = useTareas();

    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeType, setActiveType] = useState<'Tarea' | 'Columna' | null>(null);

    // Edit Modal State
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editingTarea, setEditingTarea] = useState<Tarea | null>(null);
    const [editForm, setEditForm] = useState({ titulo: '', descripcion: '', urgencia: 'Verde' as any });

    // Modals for Create
    const [isCreateColModalOpen, setCreateColModalOpen] = useState(false);
    const [newColName, setNewColName] = useState('');
    
    const [isCreateTareaModalOpen, setCreateTareaModalOpen] = useState(false);
    const [targetColId, setTargetColId] = useState<string | null>(null);

    const tareasActivas = tareas.filter(t => t.estado === 'Activa');
    
    const [localTareas, setLocalTareas] = useState<Tarea[]>(tareasActivas);
    
    // Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [urgencyFilter, setUrgencyFilter] = useState<string>('Todas');

    React.useEffect(() => {
        // Enforce filters on local mapping without destroying real positions
        const filtered = tareasActivas.filter(t => {
            const matchesSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  (t.descripcion?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            const matchesUrgency = urgencyFilter === 'Todas' || t.urgencia === urgencyFilter;
            return matchesSearch && matchesUrgency;
        });
        setLocalTareas(filtered);
    }, [tareas, searchTerm, urgencyFilter]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleAddColumna = async () => {
        setNewColName('');
        setCreateColModalOpen(true);
    };

    const submitCreateColumna = async () => {
        if (newColName.trim()) {
            await crearColumna(newColName.trim());
            setCreateColModalOpen(false);
        }
    };

    const handleAddTarea = (columnaId: string) => {
        setTargetColId(columnaId);
        setEditForm({ titulo: '', descripcion: '', urgencia: 'Verde' });
        setCreateTareaModalOpen(true);
    };

    const submitCreateTarea = async () => {
        if (editForm.titulo.trim() && targetColId) {
            await crearTarea(editForm.titulo.trim(), editForm.descripcion, targetColId, editForm.urgencia);
            setCreateTareaModalOpen(false);
        }
    };

    const handleFinalizeTarea = async (id: string) => {
        await actualizarTarea(id, { estado: 'Terminada' });
    };

    const abrirEditModal = (tarea: Tarea) => {
        setEditingTarea(tarea);
        setEditForm({ titulo: tarea.titulo, descripcion: tarea.descripcion || '', urgencia: tarea.urgencia });
        setEditModalOpen(true);
    };

    const handleDeleteTarea = async () => {
        if (editingTarea && window.confirm('¿Eliminar esta tarea definitivamente?')) {
            await eliminarTarea(editingTarea.id);
            setEditModalOpen(false);
        }
    };

    const guardarEdicion = async () => {
        if (editingTarea && editForm.titulo.trim()) {
            await actualizarTarea(editingTarea.id, {
                titulo: editForm.titulo.trim(),
                descripcion: editForm.descripcion,
                urgencia: editForm.urgencia
            });
            setEditModalOpen(false);
        }
    };

    const urgencies = [
        { value: 'Rojo', label: 'Alto' },
        { value: 'Amarillo', label: 'Medio' },
        { value: 'Verde', label: 'Normal' }
    ] as const;

    // Componente reutilizable para el Toggle de Urgencia
    const UrgencyToggle = ({ selected, onChange }: { selected: string, onChange: (val: any) => void }) => (
        <div className="flex bg-slate-100 p-1 rounded-lg">
            {urgencies.map(({value, label}) => (
                <button
                    key={value}
                    onClick={() => onChange(value)}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        selected === value 
                            ? value === 'Verde' ? 'bg-green-500 text-white shadow-sm' 
                            : value === 'Amarillo' ? 'bg-yellow-500 text-white shadow-sm'
                            : 'bg-red-500 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );

    const activeItem = activeType === 'Tarea' ? localTareas.find(t => t.id === activeId) : null;

    if (cargando && columnas.length === 0) {
        return <div className="p-10 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>;
    }

    // Drag and Drop Handlers
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        setActiveType(active.data.current?.type || 'Tarea');
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveTarea = active.data.current?.type === 'Tarea';
        const isOverTarea = over.data.current?.type === 'Tarea';
        const isOverColumna = over.data.current?.type === 'Columna';

        if (!isActiveTarea) return;

        // Dropping a Task over another Task
        if (isActiveTarea && isOverTarea) {
            setLocalTareas((prev) => {
                const activeIndex = prev.findIndex((t) => t.id === activeId);
                const overIndex = prev.findIndex((t) => t.id === overId);

                if (prev[activeIndex].columna_id !== prev[overIndex].columna_id) {
                    // Moving to a different column
                    const activeTarea = prev[activeIndex];
                    const newArray = [
                        ...prev.slice(0, activeIndex),
                        ...prev.slice(activeIndex + 1),
                    ];
                    newArray.splice(overIndex, 0, { ...activeTarea, columna_id: prev[overIndex].columna_id });
                    return newArray;
                }

                // Sorting within same column
                return arrayMove(prev, activeIndex, overIndex);
            });
        }

        // Dropping a Task over an empty Column area
        if (isActiveTarea && isOverColumna) {
            setLocalTareas((prev) => {
                const activeIndex = prev.findIndex((t) => t.id === activeId);
                const activeTarea = prev[activeIndex];
                
                if (activeTarea.columna_id === overId) return prev;

                return [
                    ...prev.slice(0, activeIndex),
                    ...prev.slice(activeIndex + 1),
                    { ...activeTarea, columna_id: overId as string },
                ];
            });
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveType(null);

        if (!over) return;

        if (active.data.current?.type === 'Tarea') {
            const originalTarea = tareasActivas.find(t => t.id === active.id);
            if (!originalTarea) return;

            // Find current state from localTareas (already visually moved)
            const finalIndex = localTareas.findIndex(t => t.id === active.id);
            if (finalIndex === -1) return;

            const finalTarea = localTareas[finalIndex];
            const nuevaColumnaId = finalTarea.columna_id;
            
            // Collect order of tasks in the target column
            const tareasEnColumna = localTareas.filter(t => t.columna_id === nuevaColumnaId);
            const nuevoOrden = tareasEnColumna.findIndex(t => t.id === active.id);

            // Did it really change?
            if (originalTarea.columna_id !== nuevaColumnaId || originalTarea.orden !== nuevoOrden) {
                // Prepare final objects representing the new state
                const tareasAfectadasObj = localTareas.map(t => {
                    if (t.columna_id === nuevaColumnaId) {
                        return { ...t, orden: tareasEnColumna.findIndex(x => x.id === t.id) };
                    }
                    return t;
                });

                // Blend with globals
                const optTareasFinal = tareas.map(t => {
                    const localMatch = tareasAfectadasObj.find(lt => lt.id === t.id);
                    return localMatch ? localMatch : t;
                });

                await moverTarea(originalTarea.id, nuevaColumnaId, nuevoOrden, optTareasFinal);
            }
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
            
            {/* Barra de Filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[250px] relative">
                    <input
                        type="text"
                        placeholder="Buscar tareas en el tablero..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500">Filtrar por urgencia:</span>
                    <select
                        value={urgencyFilter}
                        onChange={e => setUrgencyFilter(e.target.value)}
                        className="text-sm border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                        <option value="Todas">Mostrar Todas</option>
                        <option value="Rojo">Solo Altas (Rojo)</option>
                        <option value="Amarillo">Solo Medias (Amarillo)</option>
                        <option value="Verde">Solo Normales (Verde)</option>
                    </select>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex h-full gap-4 overflow-x-auto pb-4 items-start px-2">
                    <SortableContext items={columnas.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                        {columnas.map((col) => (
                            <Columna
                                key={col.id}
                                columna={col}
                                tareas={localTareas.filter(t => t.columna_id === col.id).sort((a,b) => a.orden - b.orden)}
                                onFinalizeTarea={handleFinalizeTarea}
                                onEditColumna={actualizarColumna}
                                onDeleteColumna={eliminarColumna}
                                onAddTarea={handleAddTarea}
                                onEditTarea={abrirEditModal}
                                onDuplicateTarea={duplicarTarea}
                            />
                        ))}
                    </SortableContext>
                    
                    <button 
                        onClick={handleAddColumna}
                        className="min-w-[320px] h-[60px] flex items-center justify-center gap-2 rounded-xl bg-slate-100/50 border-2 border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-300 transition-all flex-shrink-0"
                    >
                        <Plus size={20} /> Añadir Vertical
                    </button>
                </div>

                <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                    {activeItem && <div className="w-[320px]"><TarjetaTarea tarea={activeItem} onFinalize={() => {}} isOverlay /></div>}
                </DragOverlay>
            </DndContext>

            {/* Modal de edición */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                            <h3 className="font-semibold text-slate-800">Editar Tarea</h3>
                            <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                                <input 
                                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border" 
                                    value={editForm.titulo}
                                    onChange={e => setEditForm({...editForm, titulo: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                <textarea 
                                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border min-h-[100px]" 
                                    rows={4}
                                    value={editForm.descripcion}
                                    onChange={e => setEditForm({...editForm, descripcion: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Urgencia</label>
                                <UrgencyToggle selected={editForm.urgencia} onChange={(u) => setEditForm({...editForm, urgencia: u})} />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                            <button onClick={handleDeleteTarea} className="text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
                                Eliminar Tarea
                            </button>
                            <div className="flex gap-3">
                                <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                <button onClick={guardarEdicion} disabled={!editForm.titulo.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm">Guardar Cambios</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear Columna */}
            {isCreateColModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-800">Nueva Vertical</h3>
                            <button onClick={() => setCreateColModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la columna</label>
                            <input 
                                autoFocus
                                className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border" 
                                value={newColName}
                                onChange={e => setNewColName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && submitCreateColumna()}
                                placeholder="Ej. En Revisión"
                            />
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setCreateColModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                            <button onClick={submitCreateColumna} disabled={!newColName.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm">Crear</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear Tarea */}
            {isCreateTareaModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
                            <h3 className="font-semibold text-slate-800">Nueva Tarea</h3>
                            <button onClick={() => setCreateTareaModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                                <input 
                                    autoFocus
                                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border" 
                                    value={editForm.titulo}
                                    placeholder="Ej. Revisar cotizaciones"
                                    onChange={e => setEditForm({...editForm, titulo: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                <textarea 
                                    className="w-full border-slate-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border min-h-[80px]" 
                                    rows={3}
                                    placeholder="(Opcional) Agrega detalles sobre la tarea..."
                                    value={editForm.descripcion}
                                    onChange={e => setEditForm({...editForm, descripcion: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Urgencia</label>
                                <UrgencyToggle selected={editForm.urgencia} onChange={(u) => setEditForm({...editForm, urgencia: u})} />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
                            <button onClick={() => setCreateTareaModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                            <button onClick={submitCreateTarea} disabled={!editForm.titulo.trim()} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm">Crear Tarea</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
