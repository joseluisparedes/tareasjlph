import React, { useState } from 'react';
import { Tarea } from '../../lib/supabase/tipos-bd';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle2, Copy, Mail, FileText } from 'lucide-react';
import { ConfirmModal } from '../shared/ConfirmModal';

interface TarjetaTareaProps {
    tarea: Tarea;
    onEdit?: (tarea: Tarea) => void;
    onFinalize: (id: string) => void;
    onDuplicate?: (tarea: Tarea) => void;
    onRegisterInitiative?: (tarea: Tarea) => void;
    isOverlay?: boolean;
}

const urgenciaColors = {
    'Verde': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', label: 'Normal' },
    'Amarillo': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', label: 'Medio' },
    'Rojo': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', label: 'Alto' }
} as const;

export const TarjetaTarea: React.FC<TarjetaTareaProps> = ({ tarea, onEdit, onFinalize, onDuplicate, onRegisterInitiative, isOverlay }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: tarea.id, data: { type: 'Tarea', columna_id: tarea.columna_id } });

    const [isFinalizeModalOpen, setFinalizeModalOpen] = useState(false);

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const colors = urgenciaColors[tarea.urgencia] || urgenciaColors['Verde'];

    const content = (
        <div 
            className={`bg-white p-3 rounded-lg border shadow-sm transition-all group select-none relative
                ${colors.border}
                ${isOverlay ? 'shadow-xl rotate-2 scale-105 cursor-grabbing' : 'hover:shadow-md cursor-grab active:cursor-grabbing'}
            `}
            onDoubleClick={() => onEdit && onEdit(tarea)}
        >
            <div className="flex justify-between items-start mb-2">
                <div 
                    {...attributes} 
                    {...listeners} 
                    className="flex-1 flex flex-wrap items-center gap-2"
                >
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${colors.bg} ${colors.text}`}>
                        {colors.label}
                    </span>
                    {tarea.origen === 'integracion' && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-indigo-100 text-indigo-700 flex items-center gap-1" title="Creada por integración (API)">
                            <Mail size={10} /> Integración
                        </span>
                    )}
                    {tarea.iniciativa_id && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-teal-100 text-teal-700 flex items-center gap-1" title="Iniciativa Vinculada">
                            <FileText size={10} /> Iniciativa vinculada
                        </span>
                    )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/80 rounded-md backdrop-blur-sm">
                    {onDuplicate && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDuplicate(tarea);
                            }}
                            className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md transition-colors hover:bg-blue-50"
                            title="Duplicar tarea"
                        >
                            <Copy size={14} />
                        </button>
                    )}
                    {onRegisterInitiative && !tarea.iniciativa_id && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRegisterInitiative(tarea);
                            }}
                            className="text-slate-400 hover:text-teal-600 p-1.5 rounded-md transition-colors hover:bg-teal-50"
                            title="Registrar Iniciativa"
                        >
                            <FileText size={14} />
                        </button>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setFinalizeModalOpen(true);
                        }}
                        className="text-slate-400 hover:text-green-600 p-1.5 rounded-md transition-colors hover:bg-green-50"
                        title="Tarea terminada"
                    >
                        <CheckCircle2 size={16} />
                    </button>
                </div>
            </div>
            
            <div 
                {...attributes} 
                {...listeners} 
            >
                <h4 className="text-sm font-semibold text-slate-800 mb-1 leading-snug">
                    {tarea.titulo}
                </h4>

                {tarea.descripcion && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                        {tarea.descripcion}
                    </p>
                )}
            </div>
            
            <ConfirmModal 
                isOpen={isFinalizeModalOpen}
                title="¿Marcar tarea como Terminada?"
                message="¿Estás seguro de que deseas marcar esta tarea como terminada?"
                confirmText="Sí, terminar"
                cancelText="Cancelar"
                type="success"
                onConfirm={() => onFinalize(tarea.id)}
                onCancel={() => setFinalizeModalOpen(false)}
            />
        </div>
    );

    if (isOverlay) return content;

    return (
        <div ref={setNodeRef} style={style} className="mb-2 touch-none">
            {content}
        </div>
    );
};
