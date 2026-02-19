import React, { useState, useMemo, useEffect } from 'react';
import { ITRequest, Status, Priority, CatalogoItem } from '../../types';
import { MOCK_USERS } from '../../data/constants';
import { AlertCircle, GripVertical } from 'lucide-react';
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
    MeasuringStrategy,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanBoardProps {
    requests: ITRequest[];
    onEdit: (request: ITRequest) => void;
    onStatusChange: (requestId: string, newStatus: string) => void;
    onDelete?: (id: string) => void;
    catalogosPrioridad?: CatalogoItem[];
    catalogos: CatalogoItem[];
    onColumnOrderChange?: (newOrder: string[]) => void;
}

const getPriorityStyle = (priority: Priority, catalogos?: CatalogoItem[]) => {
    const cat = catalogos?.find(c => c.valor === priority && c.esta_activo);
    if (cat?.color) {
        return {
            backgroundColor: `${cat.color}20`,
            color: cat.color,
            borderColor: `${cat.color}30`,
        };
    }

    switch (priority) {
        case Priority.Critical: return { backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' };
        case Priority.High: return { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fed7aa' };
        case Priority.Medium: return { backgroundColor: '#fef9c3', color: '#a16207', borderColor: '#fde047' };
        case Priority.Low: return { backgroundColor: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' };
        default: return { backgroundColor: '#f1f5f9', color: '#475569', borderColor: '#e2e8f0' };
    }
};

// --- Sortable Item Component ---
interface SortableItemProps {
    req: ITRequest;
    onEdit: (request: ITRequest) => void;
    onDelete?: (id: string) => void;
    catalogosPrioridad?: CatalogoItem[];
}

const RequestCard: React.FC<SortableItemProps & { isOverlay?: boolean }> = ({ req, onEdit, onDelete, catalogosPrioridad, isOverlay }) => {
    const assignee = MOCK_USERS.find(u => u.id === req.assigneeId);

    return (
        <div
            onClick={() => onEdit(req)}
            className={`bg-white p-3 rounded-lg border border-slate-200 shadow-sm transition-all group select-none
        ${isOverlay ? 'shadow-xl rotate-2 scale-105 cursor-grabbing' : 'hover:shadow-md cursor-grab active:cursor-grabbing'}
      `}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-mono text-slate-400">{req.id}</span>
                <div className="flex gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('¿Eliminar solicitud?')) {
                                onDelete?.(req.id);
                            }
                        }}
                        className="text-slate-400 hover:text-red-500 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar"
                    >
                        <AlertCircle size={14} />
                    </button>
                    <span
                        className="text-[10px] px-2 py-0.5 rounded border font-medium"
                        style={getPriorityStyle(req.priority, catalogosPrioridad)}
                    >
                        {req.priority}
                    </span>
                </div>
            </div>

            <h4 className="text-sm font-semibold text-slate-800 mb-1 leading-snug group-hover:text-blue-600">
                {req.title}
            </h4>

            <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                {req.description}
            </p>

            <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-50 pt-2">
                <div className="flex items-center gap-1.5" title="Domain">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                        {req.domain}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {req.externalId && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1 rounded" title={`Linked to ${req.externalId}`}>Linked</span>
                    )}
                    {assignee ? (
                        <img src={assignee.avatarUrl} alt={assignee.name} className="w-5 h-5 rounded-full" title={assignee.name} />
                    ) : (
                        <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200" title="Dirección Solicitante">
                            {req.direccionSolicitante || '-'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const SortableRequestItem: React.FC<SortableItemProps> = (props) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.req.id, data: { type: 'Task', status: props.req.status } });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="mb-2 touch-none">
            <RequestCard {...props} />
        </div>
    );
};

// --- Column Component ---
interface KanbanColumnProps {
    status: string;
    requests: ITRequest[];
    onEdit: (req: ITRequest) => void;
    onDelete?: (id: string) => void;
    catalogosPrioridad?: CatalogoItem[];
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, requests, onEdit, onDelete, catalogosPrioridad }) => {
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
        id: status,
        data: { type: 'Column', status },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="min-w-[300px] flex-1 flex flex-col rounded-xl border transition-colors duration-200 h-full bg-slate-100/50 border-slate-200"
        >
            <div
                {...attributes}
                {...listeners}
                className="p-3 border-b border-slate-200 bg-slate-50 rounded-t-xl flex justify-between items-center sticky top-0 z-10 cursor-grab active:cursor-grabbing"
            >
                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status === 'Cerrado' || status === 'Closed' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                    {status}
                </h3>
                <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {requests.length}
                </span>
            </div>

            <div className="p-2 flex-1 overflow-y-auto min-h-[100px]">
                <SortableContext items={requests.map(r => r.id)} strategy={verticalListSortingStrategy}>
                    {requests.map((req) => (
                        <SortableRequestItem
                            key={req.id}
                            req={req}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            catalogosPrioridad={catalogosPrioridad}
                        />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
};


export const KanbanBoard: React.FC<KanbanBoardProps> = ({ requests, onEdit, onStatusChange, onDelete, catalogosPrioridad, catalogos, onColumnOrderChange }) => {
    // Local state to handle visual reordering immediately
    const [localRequests, setLocalRequests] = useState<ITRequest[]>(requests);
    const [columns, setColumns] = useState<string[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeType, setActiveType] = useState<'Task' | 'Column' | null>(null);

    // Initial column load
    useEffect(() => {
        const estados = catalogos.filter(c => c.tipo === 'estado' && c.esta_activo)
            .sort((a, b) => (a.orden || 0) - (b.orden || 0));
        // Sort by order if available, otherwise fallback (already sorted by API usually)
        if (estados.length > 0) {
            setColumns(estados.map(e => e.valor));
        } else {
            setColumns(Object.values(Status));
        }
    }, [catalogos]);

    useEffect(() => {
        setLocalRequests(requests);
    }, [requests]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Prevent accidental drags
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        setActiveType(active.data.current?.type || 'Task');
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveType = active.data.current?.type;
        const isOverType = over.data.current?.type;

        // Column Sorting handled in DragEnd usually for horizontal lists, 
        // but for smooth visual we can do it here too if strict
        // For simplified implementation, we mostly care about Task over Task/Column here.

        if (isActiveType === 'Task') {
            const isActiveTask = active.data.current?.status;
            const isOverTask = over.data.current?.status || over.id; // If over column, status is id

            // Implements optimistic UI updates for dragging between columns
            // If dragging over a column directly
            const isOverColumn = columns.includes(overId as string);

            // If dragging over another task
            const overTask = localRequests.find(r => r.id === overId);
            const overTaskStatus = overTask?.status;

            const newStatus = isOverColumn ? (overId as string) : overTaskStatus;

            if (isActiveTask && newStatus && isActiveTask !== newStatus) {
                setLocalRequests((items) => {
                    const activeIndex = items.findIndex((t) => t.id === activeId);

                    // Clone to avoid mutation
                    const newItems = [...items];
                    if (newItems[activeIndex]) {
                        newItems[activeIndex] = { ...newItems[activeIndex], status: newStatus };
                    }

                    // If moving to an empty column, put it at the end (or implicitly handled by just changing status)
                    // If over a task, we might want to reorder too, but just status change is key for now.

                    return arrayMove(newItems, activeIndex, activeIndex); // Just trigger update
                });
            }
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveType(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        if (active.data.current?.type === 'Column') {
            if (activeId !== overId) {
                setColumns((items) => {
                    const oldIndex = items.indexOf(activeId);
                    const newIndex = items.indexOf(overId);
                    const newOrder = arrayMove(items, oldIndex, newIndex);
                    // Notify parent to persist
                    onColumnOrderChange?.(newOrder);
                    return newOrder;
                });
            }
            return;
        }

        // Task handling
        const originalRequest = requests.find(r => r.id === activeId);
        let newStatus: string | undefined;

        if (columns.includes(overId)) {
            newStatus = overId;
        } else {
            const overTask = localRequests.find(r => r.id === overId);
            newStatus = overTask?.status;
        }

        if (originalRequest && newStatus && originalRequest.status !== newStatus) {
            onStatusChange(activeId, newStatus);
        } else {
            // Reorder within same column (not persisted yet in backend, but visual)
            const oldIndex = localRequests.findIndex((item) => item.id === activeId);
            const newIndex = localRequests.findIndex((item) => item.id === overId);
            if (oldIndex !== newIndex) {
                setLocalRequests((items) => arrayMove(items, oldIndex, newIndex));
            }
        }
    };

    const activeItem = useMemo(() => {
        if (activeType === 'Task') return localRequests.find(r => r.id === activeId);
        return null;
    }, [localRequests, activeId, activeType]);

    const activeColumn = useMemo(() => {
        if (activeType === 'Column') return activeId;
        return null;
    }, [activeId, activeType]);


    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            measuring={{
                droppable: {
                    strategy: MeasuringStrategy.Always,
                },
            }}
        >
            <div className="flex h-full gap-4 overflow-x-auto pb-4 items-start px-2">
                <SortableContext items={columns} strategy={horizontalListSortingStrategy}>
                    {columns.map((status) => (
                        <KanbanColumn
                            key={status}
                            status={status}
                            requests={localRequests.filter(r => r.status === status)}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            catalogosPrioridad={catalogosPrioridad}
                        />
                    ))}
                </SortableContext>
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeItem ? (
                    <div className="rotate-2 cursor-grabbing w-[300px]">
                        <RequestCard
                            req={activeItem as ITRequest}
                            onEdit={() => { }}
                            onDelete={undefined}
                            catalogosPrioridad={catalogosPrioridad}
                            isOverlay
                        />
                    </div>
                ) : activeColumn ? (
                    <div className="opacity-80 rotate-2 cursor-grabbing w-[300px] h-full bg-slate-50 border-2 border-blue-500 rounded-xl">
                        {/* Simplified overlay for column */}
                        <div className="p-3 border-b border-slate-200 bg-blue-100 rounded-t-xl flex justify-between items-center">
                            <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">
                                {activeColumn}
                            </h3>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};