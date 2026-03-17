import React, { useState } from 'react';
import { Tarea, TareaColumna } from '../../lib/supabase/tipos-bd';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TarjetaTarea } from './TarjetaTarea';
import { MoreVertical, Edit2, Trash2, Plus } from 'lucide-react';

interface ColumnaProps {
    columna: TareaColumna;
    tareas: Tarea[];
    onFinalizeTarea: (id: string) => void;
    onEditColumna: (id: string, nombre: string) => void;
    onDeleteColumna: (id: string) => void;
    onAddTarea: (columnaId: string) => void;
    onEditTarea: (tarea: Tarea) => void;
    onDuplicateTarea: (tarea: Tarea) => void;
}

export const Columna: React.FC<ColumnaProps> = ({ 
    columna, 
    tareas, 
    onFinalizeTarea, 
    onEditColumna, 
    onDeleteColumna,
    onAddTarea,
    onEditTarea,
    onDuplicateTarea
}) => {
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
        id: columna.id,
        data: { type: 'Columna', status: columna.id },
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(columna.nombre);
    const [showMenu, setShowMenu] = useState(false);

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const handleSaveEdit = () => {
        if (editName.trim() && editName !== columna.nombre) {
            onEditColumna(columna.id, editName.trim());
        }
        setIsEditing(false);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="min-w-[320px] w-[320px] flex flex-col rounded-xl border border-slate-200 bg-slate-100/50 h-full flex-shrink-0"
        >
            <div
                {...attributes}
                {...listeners}
                className="p-3 border-b border-slate-200 bg-slate-50 rounded-t-xl flex justify-between items-center group cursor-grab active:cursor-grabbing"
            >
                {isEditing ? (
                    <input 
                        type="text"
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                        className="text-sm font-semibold text-slate-700 bg-white border border-blue-400 rounded px-2 py-1 w-full mr-2"
                        onPointerDown={e => e.stopPropagation()}
                    />
                ) : (
                    <h3 className="font-semibold text-slate-700 text-sm tracking-wide flex items-center gap-2 flex-1">
                        {columna.nombre}
                        <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
                            {tareas.length}
                        </span>
                    </h3>
                )}

                <div className="relative" onPointerDown={e => e.stopPropagation()}>
                    <button 
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                    >
                        <MoreVertical size={16} />
                    </button>
                    
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-36 z-20">
                            <button 
                                onClick={() => { setIsEditing(true); setShowMenu(false); }}
                                className="w-full text-left px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <Edit2 size={14} /> Editar
                            </button>
                            <button 
                                onClick={() => {
                                    if(window.confirm('¿Eliminar esta columna y sus tareas?')) {
                                        onDeleteColumna(columna.id);
                                    }
                                    setShowMenu(false);
                                }}
                                className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                                <Trash2 size={14} /> Eliminar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-2 flex-1 overflow-y-auto min-h-[100px]">
                <SortableContext items={tareas.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tareas.map(tarea => (
                        <TarjetaTarea 
                            key={tarea.id} 
                            tarea={tarea} 
                            onFinalize={onFinalizeTarea}
                            onEdit={onEditTarea}
                            onDuplicate={onDuplicateTarea}
                        />
                    ))}
                </SortableContext>
                
                <button 
                    onClick={() => onAddTarea(columna.id)}
                    className="w-full mt-2 flex items-center justify-center gap-1 py-2 text-sm text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent border-dashed hover:border-blue-200"
                >
                    <Plus size={16} /> Añadir Tarjeta
                </button>
            </div>
        </div>
    );
};
