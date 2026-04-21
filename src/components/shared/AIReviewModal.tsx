import React, { useState, useEffect } from 'react';
import { X, Sparkles, Send, SkipForward, CheckCircle, Check, ListChecks, Eraser, Eye } from 'lucide-react';
import { useAIAssistant } from '../../hooks/useAIAssistant';
import { apuntesApi } from '../../lib/api/apuntes';

interface AIReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    tipo: 'tarea' | 'iniciativa';
    items: any[];
    opcionesFiltrado: string[];
    onOpenDetails?: (item: any) => void;
    onProcessAction: (item: any, actionResult: any) => Promise<void>;
}

export const AIReviewModal: React.FC<AIReviewModalProps> = ({
    isOpen,
    onClose,
    tipo,
    items,
    opcionesFiltrado,
    onOpenDetails,
    onProcessAction
}) => {
    const { cargando, error, callAIFunction } = useAIAssistant();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [preguntaIA, setPreguntaIA] = useState<string>('');
    const [respuestaUsuario, setRespuestaUsuario] = useState('');
    const [estadoFlujo, setEstadoFlujo] = useState<'seleccion' | 'generando' | 'esperando_usuario' | 'procesando' | 'completado'>('seleccion');
    const [opcionesSeleccionadas, setOpcionesSeleccionadas] = useState<string[]>([]);
    const [itemsVisibles, setItemsVisibles] = useState<any[]>([]);
    const [nuevoEstado, setNuevoEstado] = useState<string>('');

    // Reinicia al abrir
    useEffect(() => {
        if (isOpen) {
            setEstadoFlujo('seleccion');
            setOpcionesSeleccionadas([]);
            setItemsVisibles([]);
            setCurrentIndex(0);
        }
    }, [isOpen]);

    const handleIniciarRevision = () => {
        const filtrados = items.filter(item => {
            const valor = tipo === 'tarea' ? item.nombre_columna : item.estado;
            return opcionesSeleccionadas.includes(valor);
        });

        if (filtrados.length > 0) {
            setItemsVisibles(filtrados);
            setEstadoFlujo('generando');
            iniciarCicloPara(filtrados[0]);
        }
    };

    const toggleOpcion = (opcion: string) => {
        setOpcionesSeleccionadas(prev => 
            prev.includes(opcion) 
                ? prev.filter(o => o !== opcion)
                : [...prev, opcion]
        );
    };

    const seleccionarTodo = () => setOpcionesSeleccionadas(opcionesFiltradas);
    const limpiarSeleccion = () => setOpcionesSeleccionadas([]);

    const opcionesFiltradas = opcionesFiltrado.filter(o => o && o.trim() !== '');

    const currentItem = itemsVisibles[currentIndex];

    const iniciarCicloPara = async (item: any) => {
        if (!item) return;
        setEstadoFlujo('generando');
        setRespuestaUsuario('');
        setPreguntaIA('');
        setNuevoEstado(tipo === 'tarea' ? (item.nombre_columna || '') : (item.estado || ''));

        let contextNotas = '';
        
        if (tipo === 'iniciativa' && item.id) {
            try {
                const apuntes = await apuntesApi.obtenerPorSolicitud(item.id);
                if (apuntes && apuntes.length > 0) {
                    contextNotas = apuntes.map(a => a.nota).join(' | ');
                }
            } catch (err) {
                console.error("Error cargando apuntes para IA:", err);
            }
        }

        const tieneDescripcion = (item.descripcion || '').trim().length > 0;
        const tieneNotas = contextNotas.length > 0;
        const necesitaIA = tieneDescripcion || tieneNotas;

        if (!necesitaIA) {
            setPreguntaIA(`Esta ${tipo === 'tarea' ? 'tarea' : 'iniciativa'} no tiene descripción ni apuntes previos. ¿Qué deseas registrar?`);
            setEstadoFlujo('esperando_usuario');
            return;
        }

        const safetyTimer = setTimeout(() => {
            setEstadoFlujo(prev => prev === 'generando' ? 'esperando_usuario' : prev);
            if (!preguntaIA) setPreguntaIA("La IA está tardando más de lo habitual. ¿Qué deseas hacer con este elemento?");
        }, 10000);

        try {
            const res = await callAIFunction({
                tipo,
                modo: 'generar_pregunta',
                itemData: { ...item, notas: contextNotas }
            });

            if (res && res.mensaje) {
                setPreguntaIA(res.mensaje);
            } else {
                setPreguntaIA(`Por favor indica qué hacer con esta ${tipo === 'tarea' ? 'tarea' : 'iniciativa'}.`);
            }
        } catch (err) {
            setPreguntaIA("Ocurrió un error. ¿Qué deseas hacer con este elemento?");
        } finally {
            clearTimeout(safetyTimer);
            setEstadoFlujo('esperando_usuario');
        }
    };

    const handleSiguiente = () => {
        setRespuestaUsuario('');
        if (currentIndex < itemsVisibles.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            iniciarCicloPara(itemsVisibles[nextIndex]);
        } else {
            setEstadoFlujo('completado');
        }
    };

    const handleEnviarRespuesta = async () => {
        if (!respuestaUsuario.trim()) return;

        setEstadoFlujo('procesando');
        
        // El usuario solicitó desactivar el "cerebro" IA para cambios de estado automáticos.
        // Ahora simplemente registramos la nota y el estado que el usuario seleccionó manualmente.
        const result = {
            accion: 'actualizar',
            estado_nuevo: nuevoEstado, // Usar el estado seleccionado manualmente en el selector UI
            mover_a: nuevoEstado,       // Para tareas (columnas)
            agregar_nota: respuestaUsuario,
            agregar_descripcion: respuestaUsuario
        };

        await onProcessAction(currentItem, result);
        handleSiguiente();
    };

    const handleOmitir = () => {
        handleSiguiente();
    };

    const handleGoTo = (index: number) => {
        setRespuestaUsuario('');
        setCurrentIndex(index);
        iniciarCicloPara(itemsVisibles[index]);
    };

    const handleOmitirIndividual = (index: number) => {
        if (index === currentIndex) {
            handleSiguiente();
        } else {
            handleGoTo(index);
            setTimeout(() => handleSiguiente(), 100);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 transition-all duration-300">
                {/* Cabecera */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2 font-semibold">
                        <Sparkles className="h-5 w-5 text-blue-200" />
                        Revisión Asistida por IA
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-8">
                    {estadoFlujo === 'seleccion' ? (
                        <div className="py-4 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mb-6">
                                <ListChecks className="h-8 w-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Configurar Revisión</h3>
                            <p className="text-slate-500 mb-8 max-w-md mx-auto text-base leading-relaxed">
                                Selecciona qué <span className="font-semibold text-slate-700">{tipo === 'tarea' ? 'Verticales' : 'Estados'}</span> deseas revisar hoy con el asistente para optimizar tu flujo.
                            </p>
                            
                            <div className="flex justify-center gap-4 mb-4">
                                <button 
                                    onClick={seleccionarTodo}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                >
                                    <ListChecks className="h-3.5 w-3.5" />
                                    Seleccionar Todo
                                </button>
                                <button 
                                    onClick={limpiarSeleccion}
                                    className="text-xs font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    <Eraser className="h-3.5 w-3.5" />
                                    Limpiar
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12 max-w-2xl mx-auto">
                                {opcionesFiltradas.map(opcion => {
                                    const isSelected = opcionesSeleccionadas.includes(opcion);
                                    return (
                                        <button
                                            key={opcion}
                                            onClick={() => toggleOpcion(opcion)}
                                            className={`group relative px-5 py-5 rounded-2xl border-2 transition-all duration-300 text-sm font-bold shadow-sm
                                                ${isSelected 
                                                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-indigo-200 transform scale-[1.03] z-10' 
                                                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:bg-white hover:shadow-md'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="truncate pr-2">{opcion}</span>
                                                <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all
                                                    ${isSelected ? 'bg-white text-indigo-600' : 'bg-slate-200 text-transparent group-hover:bg-slate-300'}`}>
                                                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex justify-center items-center gap-8 pt-6 border-t border-slate-100">
                                <button 
                                    onClick={onClose}
                                    className="px-6 py-2.5 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors"
                                >
                                    Cancelar revisión
                                </button>
                                <button
                                    onClick={handleIniciarRevision}
                                    disabled={opcionesSeleccionadas.length === 0}
                                    className="px-12 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed font-black text-base shadow-2xl shadow-indigo-500/40 transition-all transform active:scale-95 flex items-center gap-3"
                                >
                                    <Sparkles className="h-5 w-5 fill-current" />
                                    INICIAR REVISIÓN ({opcionesSeleccionadas.length})
                                </button>
                            </div>
                        </div>
                    ) : itemsVisibles.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                            <p>No hay elementos que coincidan con tu selección.</p>
                            <button onClick={() => setEstadoFlujo('seleccion')} className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium">Cambiar Filtros</button>
                        </div>
                    ) : estadoFlujo === 'completado' ? (
                        <div className="text-center py-8">
                            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-800 mb-2">¡Revisión Finalizada!</h3>
                            <p className="text-slate-500 mb-6">Has revisado todos los elementos seleccionados.</p>
                            <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm">Cerrar</button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Progeso */}
                            <div className="flex justify-between items-center text-xs text-slate-500 mb-2 font-medium">
                                <span>Elemento {currentIndex + 1} de {itemsVisibles.length}</span>
                                <div className="flex gap-2">
                                    <span className="uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{tipo}</span>
                                    <button 
                                        onClick={() => setEstadoFlujo('seleccion')}
                                        className="text-slate-400 hover:text-blue-600 transition-colors"
                                        title="Cambiar filtros"
                                    >
                                        Ajustar Filtros
                                    </button>
                                </div>
                            </div>

                             <div className="relative h-44 overflow-hidden mb-2">
                                <div 
                                    className="flex transition-transform duration-500 ease-out h-full"
                                    style={{ transform: `translateX(-${currentIndex * 32}%)` }}
                                >
                                    {itemsVisibles.map((item, index) => {
                                        const dist = index - currentIndex;
                                        if (dist < -1 || dist > 5) return <div key={item.id || index} className="min-w-[32%] h-full"></div>;

                                        return (
                                            <div 
                                                key={item.id || index}
                                                onClick={() => dist !== 0 && handleGoTo(index)}
                                                className={`min-w-[32%] px-2 transition-all duration-500 ease-in-out h-full relative group
                                                    ${dist === 0 ? 'opacity-100 scale-100 z-10' : 
                                                      dist >= 1 && dist <= 2 ? 'opacity-70 scale-95 cursor-pointer hover:opacity-90' : 
                                                      dist >= 3 ? 'opacity-30 scale-90 blur-[1px]' : 'opacity-0 scale-50'}`}
                                            >
                                                {/* Botón Omitir Individual */}
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOmitirIndividual(index);
                                                    }}
                                                    className={`absolute top-4 right-4 z-20 p-1 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-slate-200 
                                                        text-slate-400 hover:text-red-500 hover:border-red-200 transition-all
                                                        ${dist === 0 ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}
                                                    title="Omitir este elemento"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>

                                                <div className={`h-full bg-slate-50 border rounded-xl p-4 flex flex-col justify-between shadow-sm transition-colors
                                                    ${dist === 0 ? 'border-indigo-400 ring-2 ring-indigo-500/20 bg-white' : 'border-slate-200 hover:border-indigo-300'}`}>
                                                    <div>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h3 className={`font-bold text-slate-800 text-sm leading-tight line-clamp-2 ${dist !== 0 && 'text-slate-400'}`}>
                                                                {item?.titulo || 'Sin título'}
                                                            </h3>
                                                        </div>
                                                        <p className={`text-[11px] line-clamp-3 ${dist === 0 ? 'text-slate-600' : 'text-slate-300'}`}>
                                                            {item?.descripcion || 'Sin descripción.'}
                                                        </p>
                                                    </div>
                                                    
                                                    {dist === 0 && onOpenDetails && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onOpenDetails(item); }}
                                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mt-1 transition-colors"
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                            Ver/Editar detalles
                                                        </button>
                                                    )}

                                                    <div className="mt-1 flex items-center justify-between">
                                                         <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                                                             {tipo === 'tarea' ? (item?.nombre_columna || 'Tarea') : (item?.estado || 'Iniciativa')}
                                                         </span>
                                                         {dist === 0 && <Sparkles className="h-3 w-3 text-indigo-400 animate-pulse" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Conversación IA */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                                        <Sparkles className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="bg-indigo-50 text-indigo-900 text-sm p-3 rounded-2xl rounded-tl-sm border border-indigo-100 shadow-sm relative">
                                        {estadoFlujo === 'generando' ? (
                                            <div className="flex items-center gap-1 h-5">
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                            </div>
                                        ) : (
                                            <p>{preguntaIA}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Controles manuales de estado */}
                                <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex flex-col gap-1 flex-1">
                                        <div className="flex items-center justify-between pl-1 mb-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ">Mover a / Nuevo Estado</label>
                                            <span className="text-[10px] font-medium text-indigo-600 italic">Selección manual activa</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {opcionesFiltradas.map(opc => (
                                                <button
                                                    key={opc}
                                                    onClick={() => setNuevoEstado(opc)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                                                        ${nuevoEstado === opc 
                                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                                                            : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}`}
                                                >
                                                    {opc}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Entrada de Texto */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Dicta o escribe tu respuesta aquí..."
                                        className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800 shadow-inner"
                                        value={respuestaUsuario}
                                        onChange={e => setRespuestaUsuario(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleEnviarRespuesta()}
                                        disabled={estadoFlujo !== 'esperando_usuario'}
                                    />
                                    <button
                                        onClick={handleEnviarRespuesta}
                                        disabled={estadoFlujo !== 'esperando_usuario' || !respuestaUsuario.trim()}
                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white h-11 w-11 flex items-center justify-center rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
                                    >
                                        {estadoFlujo === 'procesando' ? (
                                           <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                           <Send className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>

                                {/* Omitir */}
                                <div className="flex justify-center mt-2">
                                    <button
                                        onClick={handleOmitir}
                                        disabled={estadoFlujo === 'procesando' || estadoFlujo === 'generando'}
                                        className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 font-medium transition-colors"
                                    >
                                        <SkipForward className="h-3 w-3" />
                                        Omitir este elemento
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
