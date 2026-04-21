import React, { useState, useEffect } from 'react';
import { X, Sparkles, Send, SkipForward, CheckCircle } from 'lucide-react';
import { useAIAssistant } from '../../hooks/useAIAssistant';
import { apuntesApi } from '../../lib/api/apuntes';

interface AIReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    tipo: 'tarea' | 'iniciativa';
    items: any[];
    onProcessAction: (item: any, actionResult: any) => Promise<void>;
}

export const AIReviewModal: React.FC<AIReviewModalProps> = ({
    isOpen,
    onClose,
    tipo,
    items,
    onProcessAction
}) => {
    const { cargando, error, callAIFunction } = useAIAssistant();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [preguntaIA, setPreguntaIA] = useState<string>('');
    const [respuestaUsuario, setRespuestaUsuario] = useState('');
    const [estadoFlujo, setEstadoFlujo] = useState<'generando' | 'esperando_usuario' | 'procesando' | 'completado'>('generando');

    const currentItem = items[currentIndex];

    // Reinicia al abrir
    useEffect(() => {
        if (isOpen && items.length > 0) {
            setCurrentIndex(0);
            iniciarCicloPara(items[0]);
        }
    }, [isOpen, items]);

    const iniciarCicloPara = async (item: any) => {
        if (!item) return;
        setEstadoFlujo('generando');
        setRespuestaUsuario('');
        setPreguntaIA('');

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

        // Timer de seguridad: si en 10 segundos no ha pasado nada, forzamos el estado a listo
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
        if (currentIndex < items.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            iniciarCicloPara(items[nextIndex]);
        } else {
            setEstadoFlujo('completado');
        }
    };

    const handleEnviarRespuesta = async () => {
        if (!respuestaUsuario.trim()) return;

        setEstadoFlujo('procesando');
        
        // El usuario solicitó no usar IA para leer las respuestas, 
        // simplemente insertarlo directo.
        const result = {
            accion: 'actualizar',
            estado_nuevo: currentItem.estado,
            mover_a: null,
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
        iniciarCicloPara(items[index]);
    };

    const handleOmitirIndividual = (index: number) => {
        if (index === currentIndex) {
            handleSiguiente();
        } else {
            // Si omitimos una que no es la actual, simplemente la removemos de la lista visual 
            // (esto es complejo con el index, mejor solo saltar a la siguiente si es la actual)
            // Por simplicidad para el usuario: Al dar clic a omitir en cualquier tarjeta, 
            // si es la actual pasa a la siguiente. Si es una futura, pasamos a esa y luego a la siguiente?
            // El usuario pidió "pasar por otra y avanzar".
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

                <div className="p-6">
                    {items.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                            <p>No hay elementos pendientes para revisar.</p>
                            <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium">Volver</button>
                        </div>
                    ) : estadoFlujo === 'completado' ? (
                        <div className="text-center py-8">
                            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-800 mb-2">¡Revisión Finalizada!</h3>
                            <p className="text-slate-500 mb-6">Has revisado todos los elementos pendientes.</p>
                            <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm">Cerrar</button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Progeso */}
                            <div className="flex justify-between items-center text-xs text-slate-500 mb-2 font-medium">
                                <span>Elemento {currentIndex + 1} de {items.length}</span>
                                <span className="uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{tipo}</span>
                            </div>

                             <div className="relative h-48 overflow-hidden mb-2">
                                <div 
                                    className="flex transition-transform duration-500 ease-out h-full"
                                    style={{ transform: `translateX(-${currentIndex * 32}%)` }}
                                >
                                    {items.map((item, index) => {
                                        const dist = index - currentIndex;
                                        // Renderizamos un rango mayor para el carrusel
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
                                                    ${dist === 0 ? 'border-blue-400 ring-2 ring-blue-500/20 bg-white' : 'border-slate-200 hover:border-blue-300'}`}>
                                                    <div>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h3 className={`font-bold text-slate-800 text-sm leading-tight line-clamp-2 ${dist !== 0 && 'text-slate-400'}`}>
                                                                {item?.titulo || 'Sin título'}
                                                            </h3>
                                                        </div>
                                                        <p className={`text-[11px] line-clamp-3 ${dist === 0 ? 'text-slate-600' : 'text-slate-300'}`}>
                                                            {item?.descripcion || 'Sin descripción.'}
                                                        </p>
                                                    </div>
                                                    <div className="mt-2 flex items-center justify-between">
                                                         <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                                                             {tipo === 'tarea' ? (item?.nombre_columna || 'Tarea') : (item?.estado || 'Iniciativa')}
                                                         </span>
                                                         {dist === 0 && <Sparkles className="h-3 w-3 text-blue-400 animate-pulse" />}
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

                                {/* El bloque de error técnico ha sido eliminado para unificar en el chat bubble */}
                                
                                {/* Entrada de Texto */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Dicta o escribe tu instrucción..."
                                    className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white text-slate-800 shadow-inner"
                                    value={respuestaUsuario}
                                    onChange={e => setRespuestaUsuario(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleEnviarRespuesta()}
                                    disabled={estadoFlujo !== 'esperando_usuario'}
                                />
                                <button
                                    onClick={handleEnviarRespuesta}
                                    disabled={estadoFlujo !== 'esperando_usuario' || !respuestaUsuario.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white h-10 w-10 flex items-center justify-center rounded-xl transition-colors shadow-sm"
                                >
                                    {estadoFlujo === 'procesando' ? (
                                       <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                       <Send className="h-4 w-4" />
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
