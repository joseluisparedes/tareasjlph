import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, Calendar, Clock, AlertTriangle, Tag, AlignLeft } from 'lucide-react';
import { ActividadCalendario, CatalogoItem } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface ActividadModalProps {
    isOpen: boolean;
    onClose: () => void;
    actividad: ActividadCalendario | null;
    onSave: (actividad: Partial<ActividadCalendario>, colorConfigurado?: string) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    tiposActividad: CatalogoItem[];
    fechaPreseleccionada?: string; // YYYY-MM-DD
}

export const ActividadModal: React.FC<ActividadModalProps> = ({
    isOpen,
    onClose,
    actividad,
    onSave,
    onDelete,
    tiposActividad,
    fechaPreseleccionada
}) => {
    const { user } = useAuth();
    
    const esSoloLectura = actividad ? (actividad.creado_por !== user?.id) : false;

    const [descripcion, setDescripcion] = useState('');
    const [tipoActividad, setTipoActividad] = useState('');
    const [tipoPersonalizado, setTipoPersonalizado] = useState(false);
    const [nuevoTipo, setNuevoTipo] = useState('');
    
    // Fechas en formato YYYY-MM-DD
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    
    // Horas en formato HH:mm (opcionales)
    const [usarHoras, setUsarHoras] = useState(false);
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFin, setHoraFin] = useState('');
    
    // Color selector for the Activity Type
    const [colorLocal, setColorLocal] = useState<string>('#94a3b8');
    
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            if (actividad) {
                setDescripcion(actividad.descripcion);
                
                // Verificar si el tipo de actividad está en el catálogo
                const existeTipo = tiposActividad.find(t => t.valor === actividad.tipo_actividad);
                if (existeTipo || !actividad.tipo_actividad) {
                    setTipoActividad(actividad.tipo_actividad || (tiposActividad[0]?.valor ?? ''));
                    setTipoPersonalizado(false);
                    setNuevoTipo('');
                    setColorLocal(existeTipo?.color || '#94a3b8');
                } else {
                    setTipoActividad('__nuevo__');
                    setTipoPersonalizado(true);
                    setNuevoTipo(actividad.tipo_actividad);
                    setColorLocal('#3b82f6');
                }

                setFechaInicio(actividad.fecha_inicio);
                setFechaFin(actividad.fecha_fin);
                
                if (actividad.hora_inicio || actividad.hora_fin) {
                    setUsarHoras(true);
                    setHoraInicio(actividad.hora_inicio ? actividad.hora_inicio.substring(0, 5) : '');
                    setHoraFin(actividad.hora_fin ? actividad.hora_fin.substring(0, 5) : '');
                } else {
                    setUsarHoras(false);
                    setHoraInicio('');
                    setHoraFin('');
                }
            } else {
                setDescripcion('');
                setTipoActividad(tiposActividad[0]?.valor ?? '');
                setTipoPersonalizado(false);
                setNuevoTipo('');
                setColorLocal(tiposActividad[0]?.color || '#94a3b8');
                
                const hoy = fechaPreseleccionada || new Date().toISOString().split('T')[0];
                setFechaInicio(hoy);
                setFechaFin(hoy);
                
                setUsarHoras(false);
                setHoraInicio('');
                setHoraFin('');
            }
        }
    }, [isOpen, actividad, tiposActividad, fechaPreseleccionada]);

    if (!isOpen) return null;

    const handleSave = async () => {
        try {
            setError(null);
            
            // Validaciones
            if (!descripcion.trim()) {
                setError('La descripción es obligatoria.');
                return;
            }
            if (!fechaInicio || !fechaFin) {
                setError('Las fechas de inicio y fin son obligatorias.');
                return;
            }
            if (fechaFin < fechaInicio) {
                setError('La fecha de fin no puede ser menor a la fecha de inicio.');
                return;
            }
            
            const tipoFinal = tipoPersonalizado ? nuevoTipo.trim() : tipoActividad;
            if (!tipoFinal) {
                setError('Debes especificar un tipo de actividad.');
                return;
            }
            
            if (usarHoras && horaFin && horaInicio && fechaInicio === fechaFin) {
                if (horaFin < horaInicio) {
                    setError('La hora de fin no puede ser menor a la hora de inicio el mismo día.');
                    return;
                }
            }

            setIsSaving(true);
            
            const guardado: Partial<ActividadCalendario> = {
                descripcion: descripcion.trim(),
                tipo_actividad: tipoFinal,
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                hora_inicio: usarHoras && horaInicio ? horaInicio : null,
                hora_fin: usarHoras && horaFin ? horaFin : null,
            };

            await onSave(guardado, colorLocal);
            onClose();
        } catch (e: any) {
            setError(e.message || 'Error al guardar la actividad');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800">
                        {esSoloLectura ? 'Detalle de Actividad' : (actividad ? 'Editar Actividad Crítica' : 'Nueva Actividad Crítica')}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    
                    {esSoloLectura && (
                        <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-lg flex items-start gap-2">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <span>No eres el creador de esta actividad, por lo que solo puedes visualizarla. Creado por: {actividad?.creado_por_nombre}</span>
                        </div>
                    )}

                    {/* Descripción */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                            <AlignLeft size={16} className="text-slate-400" />
                            Descripción de la Actividad
                        </label>
                        <textarea 
                            value={descripcion}
                            onChange={e => setDescripcion(e.target.value)}
                            disabled={esSoloLectura}
                            className={`w-full border rounded-lg px-3 py-2 outline-none transition-all ${esSoloLectura ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                            rows={3}
                            placeholder="Describe la actividad crítica..."
                        />
                    </div>

                    {/* Tipo de Actividad con Selector de Color Integrado */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                            <Tag size={16} className="text-slate-400" />
                            Tipo y Color
                        </label>
                        <div className="flex items-center gap-2">
                            <label className={`cursor-pointer shrink-0 ${esSoloLectura ? 'opacity-70 pointer-events-none' : ''}`} title="Cambiar color del tipo de actividad">
                                <div 
                                    className="w-10 h-[42px] rounded-lg border border-slate-300 shadow-sm flex items-center justify-center transition-all bg-white"
                                    style={{ backgroundColor: colorLocal }}
                                />
                                <input 
                                    type="color" 
                                    className="sr-only" 
                                    value={colorLocal} 
                                    onChange={e => setColorLocal(e.target.value)} 
                                    disabled={esSoloLectura}
                                />
                            </label>

                            {!tipoPersonalizado ? (
                                <select
                                    value={tipoActividad}
                                    onChange={(e) => {
                                        if (e.target.value === '__nuevo__') {
                                            setTipoPersonalizado(true);
                                            setColorLocal('#3b82f6');
                                        } else {
                                            setTipoActividad(e.target.value);
                                            const match = tiposActividad.find(t => t.valor === e.target.value);
                                            if (match) setColorLocal(match.color || '#94a3b8');
                                        }
                                    }}
                                    disabled={esSoloLectura}
                                    className={`flex-1 border rounded-lg px-3 py-2 outline-none transition-all ${esSoloLectura ? 'bg-slate-50 border-slate-200 text-slate-500 appearance-none' : 'bg-white border-slate-300 focus:border-blue-500'}`}
                                >
                                    <option value="" disabled>Seleccione un tipo...</option>
                                    {tiposActividad.filter(t => t.esta_activo).map(t => (
                                        <option key={t.id} value={t.valor}>{t.valor}</option>
                                    ))}
                                    <option value="__nuevo__">+ Agregar Nuevo Tipo...</option>
                                </select>
                            ) : (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={nuevoTipo}
                                    onChange={e => setNuevoTipo(e.target.value)}
                                    placeholder="Nombre del nuevo tipo de actividad"
                                    disabled={esSoloLectura}
                                    className={`flex-1 border rounded-lg px-3 py-2 outline-none transition-all ${esSoloLectura ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white border-slate-300 focus:border-blue-500'}`}
                                    autoFocus
                                />
                                {!esSoloLectura && (
                                    <button 
                                        onClick={() => {
                                            setTipoPersonalizado(false);
                                            const defecto = tiposActividad[0];
                                            setTipoActividad(defecto?.valor || '');
                                            setColorLocal(defecto?.color || '#94a3b8');
                                        }}
                                        className="text-sm text-slate-500 hover:text-slate-700 underline"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        )}
                        </div>
                        {!esSoloLectura && <p className="text-xs text-slate-500 mt-1">El color elegido reemplazará el color base de la actividad.</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Fecha Inicio */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                                <Calendar size={16} className="text-slate-400" />
                                Fecha de Inicio
                            </label>
                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={e => setFechaInicio(e.target.value)}
                                disabled={esSoloLectura}
                                className={`w-full border rounded-lg px-3 py-2 outline-none transition-all ${esSoloLectura ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white border-slate-300 focus:border-blue-500'}`}
                            />
                        </div>

                        {/* Fecha Fin */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                                <Calendar size={16} className="text-slate-400" />
                                Fecha de Fin
                            </label>
                            <input
                                type="date"
                                value={fechaFin}
                                onChange={e => setFechaFin(e.target.value)}
                                min={fechaInicio}
                                disabled={esSoloLectura}
                                className={`w-full border rounded-lg px-3 py-2 outline-none transition-all ${esSoloLectura ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-white border-slate-300 focus:border-blue-500'}`}
                            />
                        </div>
                    </div>

                    {/* Horas */}
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                        <label className="flex items-center gap-2 cursor-pointer mb-3">
                            <input 
                                type="checkbox" 
                                checked={usarHoras}
                                onChange={e => setUsarHoras(e.target.checked)}
                                disabled={esSoloLectura}
                                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <span className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                <Clock size={16} className="text-slate-500" />
                                Especificar Horario (si no, será "Todo el Día")
                            </span>
                        </label>

                        {usarHoras && (
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Hora Inicio</label>
                                    <input
                                        type="time"
                                        value={horaInicio}
                                        onChange={e => setHoraInicio(e.target.value)}
                                        disabled={esSoloLectura}
                                        className={`w-full border rounded-lg px-3 py-1.5 outline-none text-sm transition-all ${esSoloLectura ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white border-slate-300 focus:border-blue-500'}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Hora Fin</label>
                                    <input
                                        type="time"
                                        value={horaFin}
                                        onChange={e => setHoraFin(e.target.value)}
                                        disabled={esSoloLectura}
                                        className={`w-full border rounded-lg px-3 py-1.5 outline-none text-sm transition-all ${esSoloLectura ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white border-slate-300 focus:border-blue-500'}`}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                    <div>
                        {actividad && !esSoloLectura && onDelete && (
                            <button
                                onClick={() => {
                                    if(confirm('¿Eliminar esta actividad?')) {
                                        onDelete(actividad.id);
                                        onClose();
                                    }
                                }}
                                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} /> Eliminar
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            {esSoloLectura ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {!esSoloLectura && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? 'Guardando...' : <><Save size={16} /> Guardar</>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
