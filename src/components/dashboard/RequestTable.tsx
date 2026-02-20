import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ITRequest, CatalogoItem, Urgency, RequestType, Status, CatalogItem } from '../../types';
import { MoreHorizontal, Trash2, CheckSquare, Square, MinusSquare, ArrowUpDown, ArrowUp, ArrowDown, Settings, Eye, EyeOff, Download, GripVertical, Calendar } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as XLSX from 'xlsx';

interface RequestTableProps {
    requests: ITRequest[];
    onEdit: (request: ITRequest) => void;
    onDelete: (id: string) => void;
    onDeleteBulk: (ids: string[]) => void;
    catalogosUrgencia?: CatalogoItem[];
    // New props for inline editing
    onUpdateRequest?: (id: string, data: Partial<ITRequest>) => Promise<void>;
    domains?: CatalogItem[];
    catalogos?: CatalogoItem[];
}

const PriorityBadge: React.FC<{ priority: string; catalogos?: CatalogoItem[] }> = ({ priority, catalogos }) => {
    const cat = catalogos?.find(c => c.valor === priority && c.esta_activo);
    const color = cat?.color;

    if (color) {
        return (
            <span
                className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold"
                style={{
                    backgroundColor: `${color}20`,
                    color: color,
                    boxShadow: `inset 0 0 0 1px ${color}40`,
                }}
            >
                {priority}
            </span>
        );
    }

    const fallbackMap: Record<string, string> = {
        'Crítica': '#ef4444',
        'Alta': '#f97316',
        'Media': '#eab308',
        'Baja': '#22c55e',
    };
    const fallback = fallbackMap[priority] || '#94a3b8';
    return (
        <span
            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold"
            style={{
                backgroundColor: `${fallback}20`,
                color: fallback,
                boxShadow: `inset 0 0 0 1px ${fallback}40`,
            }}
        >
            {priority}
        </span>
    );
};

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
    key: keyof ITRequest | 'urgencyValue'; // urgencyValue is a virtual key for custom sorting
    direction: SortDirection;
}

interface ColumnConfig {
    key: keyof ITRequest;
    label: string;
    sortable?: boolean;
    render?: (req: ITRequest) => React.ReactNode;
    editable?: boolean;
    inputType?: 'text' | 'date' | 'select' | 'number';
    options?: { value: string; label: string }[];
}

interface SortableHeaderProps {
    id: string;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    width?: number;
    onResize?: (width: number) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ id, children, onClick, className, width, onResize }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 100 : 'auto',
        position: 'relative',
        touchAction: 'none',
        width: width,
        minWidth: width, // Asegurar que respete el ancho
        maxWidth: width  // Asegurar que respete el ancho
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!onResize) return;
        e.preventDefault();
        e.stopPropagation(); // Evitar drag del sortable

        const startX = e.pageX;
        const startWidth = width || 100; // Fallback width

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const currentX = moveEvent.pageX;
            const diff = currentX - startX;
            onResize(startWidth + diff);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
    };

    return (
        <th ref={setNodeRef} style={style} className={`${className} whitespace-nowrap group/th relative`} scope="col">
            <div className="flex items-center gap-1 group/header w-full overflow-hidden">
                <button {...attributes} {...listeners} className="cursor-grab text-slate-300 hover:text-slate-500 opacity-0 group-hover/header:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-200 shrink-0">
                    <GripVertical size={14} />
                </button>
                <div onClick={onClick} className="flex-1 flex items-center gap-1 cursor-pointer select-none overflow-hidden text-ellipsis">
                    {children}
                </div>
            </div>
            {onResize && (
                <div
                    onMouseDown={handleMouseDown}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover/th:opacity-100 z-50 transition-colors"
                />
            )}
        </th>
    );
};

export const RequestTable: React.FC<RequestTableProps> = ({ requests, onEdit, onDelete, onDeleteBulk, catalogosUrgencia, onUpdateRequest, domains, catalogos }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const STORAGE_KEY = 'requestTableConfig';
    const WIDTHS_STORAGE_KEY = 'requestTableWidths';

    // Estado para anchos de columnas
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
        try {
            const saved = localStorage.getItem(WIDTHS_STORAGE_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error('Error loading widths', e);
            return {};
        }
    });

    // Persistir anchos
    useEffect(() => {
        localStorage.setItem(WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
    }, [columnWidths]);

    const handleColumnResize = (colId: string, newWidth: number) => {
        setColumnWidths(prev => ({
            ...prev,
            [colId]: Math.max(50, newWidth) // Mínimo 50px
        }));
    };

    // Estado para edición en línea
    const [editingCell, setEditingCell] = useState<{ id: string, field: string, value: any } | null>(null);
    const editInputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

    // Configuración de Ordenamiento
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt' as keyof ITRequest, direction: 'desc' });

    // Focus input on edit
    useEffect(() => {
        if (editingCell && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [editingCell]);

    const startEditing = (req: ITRequest, field: string, value: any) => {
        if (!onUpdateRequest) return;
        setEditingCell({ id: req.id, field, value: value ?? '' });
    };

    const cancelEditing = () => {
        setEditingCell(null);
    };

    const saveEditing = async () => {
        if (!editingCell || !onUpdateRequest) return;

        // Find original request to check if value actually changed
        const originalReq = requests.find(r => r.id === editingCell.id);
        if (originalReq) {
            const originalValue = originalReq[editingCell.field as keyof ITRequest];
            // Simple equality check, can be improved for dates/complex objects
            if (originalValue == editingCell.value) { // using loose equality for null/undefined/string match
                setEditingCell(null);
                return;
            }
        }

        try {
            await onUpdateRequest(editingCell.id, { [editingCell.field]: editingCell.value });
        } catch (error) {
            console.error("Error updating request:", error);
            // Optionally show error to user
        }
        setEditingCell(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveEditing();
        } else if (e.key === 'Escape') {
            cancelEditing();
        }
    };

    // Helper to get options for selects
    const getOptions = (key: string): { value: string, label: string }[] => {
        if (key === 'domain') {
            return domains?.filter(d => d.isActive).map(d => ({ value: d.name, label: d.name })) || [];
        }
        if (key === 'type') {
            return catalogos?.filter(c => c.tipo === 'tipo_requerimiento' && c.esta_activo).map(c => ({ value: c.valor, label: c.valor })) || [];
        }
        if (key === 'urgency') {
            return catalogos?.filter(c => c.tipo === 'urgencia' && c.esta_activo).map(c => ({ value: c.valor, label: c.valor })) || [];
        }
        if (key === 'status') {
            return catalogos?.filter(c => c.tipo === 'estado' && c.esta_activo).map(c => ({ value: c.valor, label: c.valor })) || [];
        }
        if (key === 'requester') {
            return catalogos?.filter(c => c.tipo === 'usuario_solicitante' && c.esta_activo).map(c => ({ value: c.valor, label: c.valor })) || [];
        }
        if (key === 'direccionSolicitante') {
            return catalogos?.filter(c => c.tipo === 'direccion_solicitante' && c.esta_activo).map(c => ({ value: c.valor, label: c.valor })) || [];
        }
        return [];
    };

    // Render Editable Cell
    const renderCellContent = (req: ITRequest, col: ColumnConfig & { id: string }) => {
        const isEditing = editingCell?.id === req.id && editingCell?.field === col.key;
        const value = isEditing ? editingCell.value : req[col.key];

        if (isEditing) {
            if (col.inputType === 'select') {
                const options = getOptions(col.key as string);
                return (
                    <select
                        ref={editInputRef as React.RefObject<HTMLSelectElement>}
                        value={value}
                        onChange={(e) => setEditingCell({ ...editingCell!, value: e.target.value })}
                        onBlur={saveEditing}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-xs p-1 border border-blue-500 rounded bg-white focus:outline-none shadow-sm"
                    >
                        <option value="">Seleccionar...</option>
                        {options.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );
            }
            if (col.inputType === 'date') {
                return (
                    <input
                        ref={editInputRef as React.RefObject<HTMLInputElement>}
                        type="date"
                        value={value ? value.split('T')[0] : ''} // Ensure format YYYY-MM-DD
                        onChange={(e) => setEditingCell({ ...editingCell!, value: e.target.value })}
                        onBlur={saveEditing}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-xs p-1 border border-blue-500 rounded bg-white focus:outline-none shadow-sm"
                    />
                );
            }
            return (
                <input
                    ref={editInputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={value}
                    onChange={(e) => setEditingCell({ ...editingCell!, value: e.target.value })}
                    onBlur={saveEditing}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs p-1 border border-blue-500 rounded bg-white focus:outline-none shadow-sm"
                />
            );
        }

        // Standard Render
        return (
            <div
                className={`w-full h-full min-h-[24px] flex items-center ${col.editable ? 'cursor-text hover:bg-slate-50 px-1 -mx-1 rounded border border-transparent hover:border-slate-200' : ''}`}
                onClick={(e) => {
                    if (col.editable && onUpdateRequest) {
                        e.stopPropagation();
                        startEditing(req, col.key as string, req[col.key]);
                    }
                }}
                title={col.editable ? "Clic para editar" : undefined}
            >
                {col.render ? col.render(req) : (req[col.key] as React.ReactNode || <span className="text-gray-300 italic text-xs">Vacío</span>)}
            </div>
        );
    };



    // ... inside RequestTable ...
    // Definición de todas las columnas posibles
    const allColumns: (ColumnConfig & { id: string })[] = [
        { id: 'id', key: 'id' as keyof ITRequest, label: 'ID', sortable: true, editable: false },
        {
            id: 'title', key: 'title', label: 'Título', sortable: true, editable: true, inputType: 'text',
            render: (req) => (
                editingCell?.id === req.id && editingCell.field === 'title' ? null : // Don't render custom if editing
                    <div className="flex flex-col w-full">
                        <span className="font-medium text-gray-900 break-words">{req.title}</span>
                        {req.externalId && <span className="text-[10px] text-indigo-500 truncate">🔗 {req.externalId}</span>}
                    </div>
            )
        },
        { id: 'domain', key: 'domain', label: 'Dominio TI', sortable: true, editable: true, inputType: 'select' },
        { id: 'type', key: 'type', label: 'Tipo', sortable: true, editable: true, inputType: 'select' },
        {
            id: 'status', key: 'status', label: 'Estado', sortable: true, editable: true, inputType: 'select',
            render: (req) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${req.status === 'En ejecución' ? 'bg-blue-50 text-blue-700 ring-blue-700/10' :
                    req.status === 'Pendiente' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
                        req.status === 'Cerrado' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                            'bg-gray-50 text-gray-600 ring-gray-500/10'
                    }`}>
                    {req.status}
                </span>
            )
        },
        {
            id: 'urgency', key: 'urgency', label: 'Urgencia', sortable: true, editable: true, inputType: 'select',
            render: (req) => <PriorityBadge priority={req.urgency} catalogos={catalogosUrgencia} />
        },
        // Nueva columna N° Prioridad (priority)
        { id: 'priority', key: 'priority' as keyof ITRequest, label: 'Prioridad', sortable: true, editable: true, inputType: 'text' },
        { id: 'tareaSN', key: 'tareaSN' as keyof ITRequest, label: 'Tarea SN', sortable: true, editable: true, inputType: 'text' },
        { id: 'ticketRIT', key: 'ticketRIT' as keyof ITRequest, label: 'Ticket RIT', sortable: true, editable: true, inputType: 'text' },
        { id: 'fechaInicio', key: 'fechaInicio' as keyof ITRequest, label: 'Fecha Inicio', sortable: true, editable: true, inputType: 'date' },
        { id: 'fechaFin', key: 'fechaFin' as keyof ITRequest, label: 'Fecha Fin', sortable: true, editable: true, inputType: 'date' },
        { id: 'requester', key: 'requester', label: 'Solicitante', sortable: true, editable: true, inputType: 'select' },
        { id: 'direccionSolicitante', key: 'direccionSolicitante', label: 'Dirección de Solicitante', sortable: true, editable: true, inputType: 'select' },
        {
            id: 'assigneeId', key: 'assigneeId', label: 'Asignado', sortable: true, editable: false, // Could be select if we had users list
            render: (req) => req.assigneeId ? <span className="text-xs text-slate-700">{req.assigneeId}</span> : <span className="text-gray-400 italic">Sin asignar</span>
        },
    ];

    // Configuración de Visibilidad de Columnas
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.visibleColumns && Array.isArray(parsed.visibleColumns)) {
                    return new Set(parsed.visibleColumns);
                }
            }
        } catch (e) {
            console.error('Error loading table config', e);
        }
        // Default visibility (including new columns by default?)
        return new Set([
            'id', 'title', 'domain', 'type', 'status', 'urgency', 'priority',
            'tareaSN', 'ticketRIT', 'fechaInicio', 'fechaFin',
            'requester', 'direccionSolicitante', 'assigneeId', 'actions'
        ]);
    });

    // Configuración de Orden de Columnas
    const [columnOrder, setColumnOrder] = useState<string[]>(() => {
        const defaultOrder = allColumns.map(c => c.id);
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.columnOrder && Array.isArray(parsed.columnOrder)) {
                    // Merge saved order with any new columns that might have been added to code
                    const savedOrder = parsed.columnOrder as string[];
                    const newColumns = defaultOrder.filter(colId => !savedOrder.includes(colId));
                    return [...savedOrder, ...newColumns];
                }
            }
        } catch (e) {
            console.error('Error loading table config', e);
        }
        return defaultOrder;
    });

    const [showColumnSelector, setShowColumnSelector] = useState(false);

    // Persistencia
    React.useEffect(() => {
        const config = {
            visibleColumns: Array.from(visibleColumns),
            columnOrder
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }, [visibleColumns, columnOrder]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setColumnOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over?.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleExport = () => {
        // Filtrar datos visibles (solo columnas visibles y orden actual)
        // Usamos sortedRequests que ya tiene el filtro de ordenamiento de filas
        const dataToExport = sortedRequests.map(req => {
            const row: Record<string, any> = {};
            columnOrder.forEach(colId => {
                if (visibleColumns.has(colId)) {
                    // Mapeo simple para exportación
                    const colDef = allColumns.find(c => c.id === colId);
                    if (colDef) {
                        // Usar etiqueta como header? O key? Usaremos Key.
                        // Para valores complejos (como objetos), simplificar.
                        const val = req[colDef.key];
                        row[colDef.label] = val;
                    }
                }
            });
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Solicitudes");
        XLSX.writeFile(workbook, "solicitudes_export.xlsx");
    };



    const toggleSelectAll = () => {
        if (selectedIds.size === requests.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(requests.map(r => r.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleDeleteBulk = () => {
        if (window.confirm(`¿Estás seguro de eliminar ${selectedIds.size} solicitudes?`)) {
            onDeleteBulk(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const handleSort = (key: keyof ITRequest) => {
        let direction: SortDirection = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getUrgencyValue = (urgency: string): number => {
        // Urgencia numérica normalizada: Menor valor = Mayor urgencia
        // TBD o desconocida = Valor muy alto para ir al final
        const map: Record<string, number> = {
            [Urgency.Critical]: 1,
            [Urgency.High]: 2,
            [Urgency.Medium]: 3,
            [Urgency.Low]: 4
        };
        // Si no está en el mapa, asumimos que es "TBD" o similar (baja urgencia/final)
        return map[urgency] || 999;
    };

    const sortedRequests = useMemo(() => {
        if (!sortConfig.key || !sortConfig.direction) return requests;

        return [...requests].sort((a, b) => {
            const aValue = a[sortConfig.key as keyof ITRequest];
            const bValue = b[sortConfig.key as keyof ITRequest];

            // Custom sorting logic for Priority (priority)
            if (sortConfig.key === 'priority') {
                const sA = (a.priority || '').toString().toUpperCase();
                const sB = (b.priority || '').toString().toUpperCase();

                const isTbdA = sA === 'TBD' || sA === '';
                const isTbdB = sB === 'TBD' || sB === '';

                if (isTbdA && isTbdB) return 0;

                // "always must come out at the end"
                // Si A es TBD, queremos que vaya al FINAL. 
                if (isTbdA) return 1;
                if (isTbdB) return -1;

                // Comparación normal para no-TBD
                // Use localeCompare with numeric option for natural sort order (1, 2, 10 instead of 1, 10, 2)
                const comparison = sA.localeCompare(sB, undefined, { numeric: true, sensitivity: 'base' });
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            }

            // Custom sorting logic for Urgency Enum
            if (sortConfig.key === 'urgency') {
                const pA = getUrgencyValue(a.urgency);
                const pB = getUrgencyValue(b.urgency);

                // Si ambos son TBD (999), mantener orden relativo original (stable sort effect)
                if (pA === 999 && pB === 999) return 0;

                // Lógica requerida: "valores TBD siempre al final"
                // Si pA es TBD, debe ir DESPUÉS de cualquier otro valor no-TBD, sin importar si es ASC o DESC
                if (pA === 999) return 1;
                if (pB === 999) return -1;

                // Ordenamiento normal para valores conocidos
                if (sortConfig.direction === 'asc') {
                    return pA - pB;
                } else {
                    return pB - pA;
                }
            }

            if (aValue === bValue) return 0;

            const comparison = aValue > bValue ? 1 : -1;
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }, [requests, sortConfig]);

    const toggleColumnVisibility = (columnId: string) => {
        const newVisible = new Set(visibleColumns);
        if (newVisible.has(columnId)) {
            newVisible.delete(columnId);
        } else {
            newVisible.add(columnId);
        }
        setVisibleColumns(newVisible);
    };

    const isAllSelected = requests.length > 0 && selectedIds.size === requests.length;
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < requests.length;

    return (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg h-full flex flex-col overflow-hidden">
            {selectedIds.size > 0 ? (
                <div className="bg-blue-50 p-2 flex items-center justify-between px-4 border-b border-blue-100">
                    <span className="text-sm text-blue-700 font-medium">{selectedIds.size} seleccionados</span>
                    <button
                        onClick={handleDeleteBulk}
                        className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1 bg-white border border-red-200 px-3 py-1 rounded shadow-sm hover:bg-red-50 transition-colors"
                    >
                        <Trash2 size={14} /> Eliminar Seleccionados
                    </button>
                </div>
            ) : (
                // Toolbar con Selector de Columnas
                <div className="p-2 flex justify-end px-4 border-b border-slate-100 bg-slate-50/50 gap-2">
                    <button
                        onClick={handleExport}
                        className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 shadow-sm transition-all"
                    >
                        <Download size={14} /> Exportar
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setShowColumnSelector(!showColumnSelector)}
                            className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-800 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 shadow-sm transition-all"
                        >
                            <Settings size={14} /> Columnas
                        </button>

                        {showColumnSelector && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowColumnSelector(false)} />
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-20 p-2 animate-in fade-in zoom-in-95 duration-100">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Mostrar Columnas</h4>
                                    <div className="space-y-1 max-h-60 overflow-y-auto">
                                        {allColumns.map(col => (
                                            <label key={col.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm text-slate-700 select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={visibleColumns.has(col.id)}
                                                    onChange={() => toggleColumnVisibility(col.id)}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                />
                                                {col.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="flex-1 w-full overflow-auto relative">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="w-10 py-3.5 pl-4 pr-3 text-left" style={{ width: '48px' }}>
                                <button
                                    onClick={toggleSelectAll}
                                    className="text-slate-500 hover:text-slate-700 focus:outline-none"
                                >
                                    {isAllSelected ? (
                                        <CheckSquare size={18} className="text-blue-600" />
                                    ) : isIndeterminate ? (
                                        <MinusSquare size={18} className="text-blue-600" />
                                    ) : (
                                        <Square size={18} />
                                    )}
                                </button>
                            </th>

                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={columnOrder}
                                    strategy={horizontalListSortingStrategy}
                                >
                                    {columnOrder.map(colId => {
                                        if (!visibleColumns.has(colId)) return null;
                                        const col = allColumns.find(c => c.id === colId);
                                        if (!col) return null;

                                        return (
                                            <SortableHeader
                                                key={col.id}
                                                id={col.id}
                                                width={columnWidths[col.id] || 150} // Default width
                                                onResize={(w) => handleColumnResize(col.id, w)}
                                                onClick={() => col.sortable && handleSort(col.key)}
                                                className={`px-3 py-3.5 text-left text-sm font-semibold text-gray-900 ${col.sortable ? 'cursor-pointer hover:bg-slate-100 transition-colors select-none group' : ''}`}
                                            >
                                                {col.label}
                                                {col.sortable && sortConfig.key === col.key && (
                                                    <span className="text-blue-600 ml-1">
                                                        {sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                                    </span>
                                                )}
                                                {col.sortable && sortConfig.key !== col.key && (
                                                    <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                                )}
                                            </SortableHeader>
                                        );
                                    })}
                                </SortableContext>
                            </DndContext>

                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6" style={{ width: '80px' }}>
                                <span className="sr-only">Acciones</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {sortedRequests.map((req) => {
                            const isSelected = selectedIds.has(req.id);
                            return (
                                <tr
                                    key={req.id}
                                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/50' : ''}`}
                                    onClick={() => onEdit(req)}
                                >
                                    <td className="py-4 pl-4 pr-3 text-sm sm:pl-6" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => toggleSelect(req.id)}
                                            className="text-slate-400 hover:text-blue-600 focus:outline-none"
                                        >
                                            {isSelected ? (
                                                <CheckSquare size={18} className="text-blue-600" />
                                            ) : (
                                                <Square size={18} />
                                            )}
                                        </button>
                                    </td>

                                    {columnOrder.map(colId => {
                                        if (!visibleColumns.has(colId)) return null;
                                        const col = allColumns.find(c => c.id === colId);
                                        if (!col) return null;
                                        const width = columnWidths[col.id] || 150;

                                        return (
                                            <td key={col.id} className="px-3 py-4 text-sm text-gray-500 break-words" style={{ width }}>
                                                {renderCellContent(req, col)}
                                            </td>
                                        );
                                    })}

                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                className="text-gray-400 hover:text-red-600 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm('¿Eliminar esta solicitud?')) {
                                                        onDelete(req.id);
                                                    }
                                                }}
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <button className="text-gray-400 hover:text-blue-600" onClick={e => { e.stopPropagation(); onEdit(req); }}>
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};