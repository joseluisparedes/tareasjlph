import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { History, X, Save, MessageSquareMore, Send, Edit2, Trash2, Calendar } from 'lucide-react';
import { apuntesApi } from '../../lib/api/apuntes';
import type { SolicitudApunte } from '../../lib/supabase/tipos-bd';

interface NotesCellProps {
    requestId: string;
}

export const NotesCell: React.FC<NotesCellProps> = ({ requestId }) => {
    const [apuntes, setApuntes] = useState<SolicitudApunte[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    // States for Popover
    const [nuevoApunte, setNuevoApunte] = useState('');
    const [guardandoApunte, setGuardandoApunte] = useState(false);
    const [editingApunteId, setEditingApunteId] = useState<string | null>(null);
    const [editNota, setEditNota] = useState('');

    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        cargarApuntes();
    }, [requestId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Check if click was outside the popover and outside the trigger
            if (
                popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            // Use capture phase to ensure we catch the click before other handlers might stop propagation
            document.addEventListener('mousedown', handleClickOutside, true);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside, true);
        };
    }, [isOpen]);

    const cargarApuntes = async () => {
        try {
            setIsLoading(true);
            const data = await apuntesApi.obtenerPorSolicitud(requestId);
            setApuntes(data);
        } catch (error) {
            console.error("Error al cargar apuntes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleOpen = () => {
        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let left = rect.right - 320; // 320px = w-80
            if (left < 10) left = 10;

            let top = rect.bottom + 8;
            if (top + 400 > window.innerHeight) {
                top = rect.top - 408; // Open upwards
                if (top < 10) top = 10;
            }

            setPopoverStyle({
                top: `${top}px`,
                left: `${left}px`,
            });
        }
        setIsOpen(!isOpen);
    };

    const handleGuardarApunte = async () => {
        if (!nuevoApunte.trim() || !requestId) return;
        setGuardandoApunte(true);
        try {
            const apunte = await apuntesApi.crear(requestId, nuevoApunte, 'Usuario Actual');
            setApuntes(prev => [apunte, ...prev]);
            setNuevoApunte('');
        } catch (error) {
            console.error("Error al guardar apunte:", error);
            alert("No se pudo guardar el apunte.");
        } finally {
            setGuardandoApunte(false);
        }
    };

    const handleEliminarApunte = async (id: string) => {
        if (!window.confirm('¿Eliminar este apunte?')) return;
        try {
            await apuntesApi.eliminar(id);
            setApuntes(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error("Error al eliminar apunte:", error);
            alert("No se pudo eliminar el apunte.");
        }
    };

    const handleIniciarEdicion = (apunte: SolicitudApunte) => {
        setEditingApunteId(apunte.id);
        setEditNota(apunte.nota);
    };

    const handleGuardarEdicion = async () => {
        if (!editingApunteId || !editNota.trim()) return;
        try {
            const actualizado = await apuntesApi.actualizar(editingApunteId, editNota);
            setApuntes(prev => prev.map(a => a.id === editingApunteId ? actualizado : a));
            setEditingApunteId(null);
            setEditNota('');
        } catch (error) {
            console.error("Error al actualizar apunte:", error);
            alert("No se pudo actualizar el apunte.");
        }
    };

    if (isLoading) {
        return <div className="animate-pulse h-4 bg-slate-200 rounded w-16"></div>;
    }

    const ultimoApunte = apuntes.length > 0 ? apuntes[0] : null;

    return (
        <div className="relative flex items-center h-full w-full group/notes" onClick={(e) => e.stopPropagation()}>
            {/* Cell Trigger */}
            <div
                ref={triggerRef}
                className="flex items-center justify-center gap-2 cursor-pointer w-full group-hover/notes:bg-slate-50 p-1.5 rounded transition-colors"
                onClick={handleToggleOpen}
                title="Ver/Editar apuntes"
            >
                <div className="flex-shrink-0 relative">
                    <MessageSquareMore size={16} className={apuntes.length > 0 ? 'text-blue-500' : 'text-slate-400 group-hover/notes:text-blue-400 transition-colors'} />
                    {apuntes.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full shadow-sm">
                            {apuntes.length}
                        </span>
                    )}
                </div>

                <div className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-600">
                    {ultimoApunte ? ultimoApunte.nota : <span className="text-slate-400 italic">Escribir apunte...</span>}
                </div>
            </div>

            {/* Popover */}
            {isOpen && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed z-[9999] w-80 bg-white rounded-lg shadow-xl border border-slate-200 flex flex-col"
                    style={{ ...popoverStyle, maxHeight: '400px', minHeight: '300px' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/80 rounded-t-lg">
                        <div className="flex items-center gap-2 text-blue-700">
                            <History size={16} />
                            <h4 className="font-semibold text-sm">Apuntes y Actualizaciones</h4>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                            className="text-slate-400 hover:text-slate-700 hover:bg-slate-200 p-1 rounded transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Lista */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50 scrollbar-thin">
                        {apuntes.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-80 pt-8">
                                <MessageSquareMore size={32} className="mb-2" />
                                <p className="text-xs text-center">No hay apuntes.<br />Comienza agregando uno abajo.</p>
                            </div>
                        ) : (
                            apuntes.map(apunte => (
                                <div key={apunte.id} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-xs group/item relative">
                                    <div className="flex justify-between items-start mb-1.5">
                                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                                            <Calendar size={10} className="opacity-70" />
                                            {new Date(apunte.fecha_creacion).toLocaleString()}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                {apunte.creado_por || 'Sistema'}
                                            </span>
                                            {editingApunteId !== apunte.id && (
                                                <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex gap-1 bg-white pl-1">
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleIniciarEdicion(apunte); }} className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded">
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); handleEliminarApunte(apunte.id); }} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {editingApunteId === apunte.id ? (
                                        <div className="space-y-2 mt-2">
                                            <textarea
                                                autoFocus
                                                className="w-full text-xs rounded border border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2 outline-none resize-none"
                                                rows={3}
                                                value={editNota}
                                                onChange={e => setEditNota(e.target.value)}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setEditingApunteId(null); }} className="text-[10px] text-slate-500 hover:text-slate-700 px-2 py-1">Cancelar</button>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleGuardarEdicion(); }} className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1 shadow-sm">
                                                    <Save size={10} /> Guardar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{apunte.nota}</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer / Input */}
                    <div className="p-3 border-t border-slate-200 bg-white rounded-b-lg">
                        <div className="flex items-end gap-2 relative">
                            <textarea
                                rows={2}
                                className="flex-1 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-2 pr-9 outline-none resize-none bg-slate-50 focus:bg-white transition-colors"
                                placeholder="Nuevo apunte..."
                                value={nuevoApunte}
                                onChange={e => setNuevoApunte(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleGuardarApunte();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleGuardarApunte(); }}
                                disabled={!nuevoApunte.trim() || guardandoApunte}
                                className="absolute right-2 bottom-2 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                title="Enviar apunte"
                            >
                                <Send size={12} className={guardandoApunte ? 'opacity-0' : 'opacity-100'} />
                                {guardandoApunte && <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div></div>}
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
};
