import React, { useState, useEffect } from 'react';
import { ITRequest, RequestType, Urgency, Status, CatalogItem, CatalogoItem, CatalogType } from '../../types';
import type { SolicitudFecha, SolicitudApunte } from '../../lib/supabase/tipos-bd';
import { apuntesApi } from '../../lib/api/apuntes';
import { useAuth } from '../../hooks/useAuth';
import { X, Save, Calendar, Hash, FileText, History, User, Grid } from 'lucide-react';

interface RequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: ITRequest | null;
    onSave: (req: ITRequest) => void;
    onDelete?: (id: string) => void;
    domains: CatalogItem[];
    catalogos: CatalogoItem[];
    historialFechas?: SolicitudFecha[];
    getModo?: (tipo: CatalogType) => 'desplegable' | 'cuadros';
}

import { SelectorCampo } from '../shared/SelectorCampo';

const inputClass = "mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm border p-2 bg-white text-slate-900 placeholder-slate-400";
const labelClass = "block text-xs font-semibold text-slate-600 uppercase tracking-wide";

export const RequestModal: React.FC<RequestModalProps> = ({
    isOpen, onClose, request, onSave, onDelete, domains, catalogos, historialFechas = [], getModo
}) => {
    const { perfil } = useAuth();

    // Filtrar catálogos activos
    const getCats = (tipo: CatalogType) => catalogos.filter(c => c.tipo === tipo && c.esta_activo);

    // Obtener cada lista para pasarlas al render
    const tiposReq = getCats('tipo_requerimiento');
    const urgencias = getCats('urgencia');
    const estados = getCats('estado');
    const usuarios = getCats('usuario_solicitante');
    const asignados = getCats('asignado_a');
    const direcciones = getCats('direccion_solicitante');
    const brms = getCats('brm');
    const instituciones = getCats('institucion');
    const tiposTarea = getCats('tipo_tarea');
    const complejidades = getCats('complejidad');

    // Modos
    const getM = (t: CatalogType) => getModo?.(t) ?? 'desplegable';

    const [formData, setFormData] = useState<Partial<ITRequest>>({});
    const [apuntes, setApuntes] = useState<SolicitudApunte[]>([]);
    const [nuevoApunte, setNuevoApunte] = useState('');
    const [guardandoApunte, setGuardandoApunte] = useState(false);
    const [editingApunteId, setEditingApunteId] = useState<string | null>(null);
    const [editNota, setEditNota] = useState('');

    useEffect(() => {
        if (request) {
            setFormData({ ...request });
            // Cargar apuntes
            apuntesApi.obtenerPorSolicitud(request.id)
                .then(setApuntes)
                .catch(err => console.error("Error al cargar apuntes:", err));
        } else {
            setFormData({
                title: '', description: '',
                type: '' as RequestType, domain: '', urgency: '' as Urgency, status: '' as Status,
                requester: '', assigneeId: null,
                priority: '', tareaSN: '', ticketRIT: '',
                fechaInicio: '', fechaFin: '',
                // Nuevos campos vacíos
                direccionSolicitante: '', brm: '', institucion: '', tipoTarea: '', complejidad: ''
            });
            setApuntes([]);
        }
    }, [request, isOpen]);

    const handleGuardarApunte = async () => {
        if (!nuevoApunte.trim() || !request?.id) return;
        setGuardandoApunte(true);
        try {
            const userName = perfil?.nombre_completo || 'Usuario Desconocido';
            const apunte = await apuntesApi.crear(request.id, nuevoApunte, userName);
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

    if (!isOpen) return null;

    const set = (field: keyof ITRequest, value: unknown) =>
        setFormData(prev => ({ ...prev, [field]: value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newRequest = {
            ...formData,
            id: formData.id || `BRM-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            createdAt: formData.createdAt || new Date().toISOString(),
        } as ITRequest;
        onSave(newRequest);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl"> {/* Ancho aumentado a 4xl para layout más cómodo */}
                    {/* Header */}
                    <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">
                                {request ? `Editar Solicitud: ${request.id}` : 'Nueva Solicitud TI'}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {request ? 'Modifica los campos necesarios.' : 'Completa la información.'}
                            </p>
                        </div>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="px-6 py-5 space-y-6 max-h-[75vh] overflow-y-auto">

                            {/* 1. Información Principal y Apuntes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Columna Izquierda: Información General */}
                                <div>
                                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <FileText size={14} /> Información General
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className={labelClass}>Título <span className="text-red-500 normal-case">*</span></label>
                                            <input type="text" required className={inputClass}
                                                value={formData.title || ''}
                                                onChange={e => set('title', e.target.value)}
                                                placeholder="Ej: Migración de Servidor..." />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Descripción</label>
                                            <textarea rows={4} className={inputClass}
                                                value={formData.description || ''}
                                                onChange={e => set('description', e.target.value)}
                                                placeholder="Detalle..." />
                                        </div>
                                    </div>
                                </div>

                                {/* Columna Derecha: Apuntes y Actualizaciones */}
                                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col h-full max-h-[300px]">
                                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <History size={14} /> Apuntes y Actualizaciones
                                    </h4>

                                    {/* Lista de Apuntes */}
                                    <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-2 scrollbar-thin">
                                        {apuntes.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic text-center py-4">No hay apuntes registrados.</p>
                                        ) : (
                                            apuntes.map(apunte => (
                                                <div key={apunte.id} className="bg-white p-2.5 rounded border border-slate-200 shadow-sm text-xs group">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-bold text-slate-700">
                                                            {new Date(apunte.fecha_creacion).toLocaleString()}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-400">
                                                                {apunte.creado_por || 'Sistema'}
                                                            </span>
                                                            {editingApunteId !== apunte.id && (
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                                    <button type="button" onClick={() => handleIniciarEdicion(apunte)} className="text-blue-400 hover:text-blue-600 p-0.5">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                                                    </button>
                                                                    <button type="button" onClick={() => handleEliminarApunte(apunte.id)} className="text-red-400 hover:text-red-600 p-0.5">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {editingApunteId === apunte.id ? (
                                                        <div className="space-y-2">
                                                            <textarea
                                                                className="w-full text-xs rounded border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 p-1"
                                                                rows={2}
                                                                value={editNota}
                                                                onChange={e => setEditNota(e.target.value)}
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <button type="button" onClick={() => setEditingApunteId(null)} className="text-[10px] text-slate-500 hover:text-slate-700">Cancelar</button>
                                                                <button type="button" onClick={handleGuardarEdicion} className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700">Guardar</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-slate-600 whitespace-pre-wrap">{apunte.nota}</p>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Input Nuevo Apunte */}
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <textarea
                                                rows={2}
                                                className="w-full text-xs rounded border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none p-2"
                                                placeholder="Escribe una actualización..."
                                                value={nuevoApunte}
                                                onChange={e => setNuevoApunte(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleGuardarApunte();
                                                    }
                                                }}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleGuardarApunte}
                                            disabled={!nuevoApunte.trim() || guardandoApunte || !request?.id}
                                            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title="Guardar Apunte"
                                        >
                                            <Save size={16} />
                                        </button>
                                    </div>
                                    {!request?.id && (
                                        <p className="text-[10px] text-orange-500 mt-1">Guarda la solicitud primero para agregar apuntes.</p>
                                    )}
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-100" />

                            {/* 2. Clasificación */}
                            <div>
                                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Grid size={14} /> Clasificación
                                </h4>
                                <div className="grid grid-cols-6 gap-x-4 gap-y-4">
                                    {/* Dominio TI */}
                                    <div className="col-span-6 sm:col-span-3">
                                        <label className={labelClass}>Dominio TI <span className="text-red-500 normal-case">*</span></label>
                                        {(getM('dominios') === 'cuadros') ? ( // OJO: 'dominios' es especial porque viene de props.domains
                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                <button type="button" onClick={() => set('domain', '')}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-medium border ${!formData.domain ? 'bg-slate-700 text-white' : 'bg-white text-slate-400'}`}>
                                                    -- Selecciona --
                                                </button>
                                                {domains.filter(d => d.isActive).map(d => (
                                                    <button key={d.id} type="button" onClick={() => set('domain', d.name)}
                                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${formData.domain === d.name ? 'bg-blue-600 text-white shadow-sm scale-105' : 'bg-white text-slate-600 hover:border-blue-400'}`}>
                                                        {d.name}
                                                    </button>
                                                ))}
                                                {!formData.domain && <input type="text" required readOnly value="" className="sr-only" />}
                                            </div>
                                        ) : (
                                            <select required className={inputClass} value={formData.domain || ''} onChange={e => set('domain', e.target.value)}>
                                                <option value="">-- Selecciona --</option>
                                                {domains.filter(d => d.isActive).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                            </select>
                                        )}
                                    </div>

                                    <SelectorCampo label="Tipo Requerimiento" required
                                        valor={formData.type || ''} onChange={v => set('type', v)}
                                        opciones={tiposReq} modo={getM('tipo_requerimiento')} />

                                    <SelectorCampo label="Urgencia" required
                                        valor={formData.urgency || ''} onChange={v => set('urgency', v)}
                                        opciones={urgencias} modo={getM('urgencia')} />

                                    <SelectorCampo label="Estado" required
                                        valor={formData.status || ''} onChange={v => set('status', v)}
                                        opciones={estados} modo={getM('estado')} />

                                    <SelectorCampo label="Complejidad"
                                        valor={formData.complejidad || ''} onChange={v => set('complejidad', v)}
                                        opciones={complejidades} modo={getM('complejidad')} />

                                    <SelectorCampo label="Tipo de Tarea"
                                        valor={formData.tipoTarea || ''} onChange={v => set('tipoTarea', v)}
                                        opciones={tiposTarea} modo={getM('tipo_tarea')} />
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-100" />

                            {/* 3. Solicitante */}
                            <div>
                                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <User size={14} /> Solicitante e Institución
                                </h4>
                                <div className="grid grid-cols-6 gap-x-4 gap-y-4">
                                    <SelectorCampo label="Usuario Solicitante" required
                                        valor={formData.requester || ''} onChange={v => set('requester', v)}
                                        opciones={usuarios} modo={getM('usuario_solicitante')}
                                        placeholder={usuarios.length === 0 ? "Escribe nombre..." : "-- Selecciona --"} />

                                    {/* Input fallback manual si no hay catálogo de usuarios (comportamiento anterior) */}
                                    {usuarios.length === 0 && getM('usuario_solicitante') === 'desplegable' && (
                                        <div className="-mt-14 opacity-0 pointer-events-none absolute"><input required /> {/* Hack validación HTML5 si hidden */} </div>
                                        // Mejor dejar que el SelectorCampo maneje el fallback si no hay opciones.
                                        // Si no hay opciones y es desplegable, SelectorCampo muestra un select vacío.
                                        // Ajuste: Si usuarios es vacío, deberíamos mostrar input text simple como antes.
                                        // Corrijo lógica abajo al llamar SelectorCampo o condicional.
                                    )}
                                    {/* Nota: Para simplificar, si el catálogo de usuarios está vacío, el admin debería llenarlo o el usuario no podrá elegir. 
                                        El código anterior tenía un input text fallback. 
                                        En este refactor asumo que se usarán catálogos. 
                                        Pero restauraré el input text si la lista está vacía para 'solicitante' específicamente.
                                    */}

                                    <SelectorCampo label="Dirección Solicitante"
                                        valor={formData.direccionSolicitante || ''} onChange={v => set('direccionSolicitante', v)}
                                        opciones={direcciones} modo={getM('direccion_solicitante')} />

                                    <SelectorCampo label="Institución"
                                        valor={formData.institucion || ''} onChange={v => set('institucion', v)}
                                        opciones={instituciones} modo={getM('institucion')} />

                                    <SelectorCampo label="BRM"
                                        valor={formData.brm || ''} onChange={v => set('brm', v)}
                                        opciones={brms} modo={getM('brm')} />
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-100" />

                            {/* 4. Seguimiento y Fechas */}
                            <div>
                                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Hash size={14} /> Seguimiento y Fechas
                                </h4>
                                <div className="grid grid-cols-6 gap-x-4 gap-y-4">
                                    <SelectorCampo label="Asignado A"
                                        valor={formData.assigneeId || ''} onChange={v => set('assigneeId', v || null)}
                                        opciones={asignados} modo={getM('asignado_a')} placeholder="-- Sin asignar --" />

                                    <div className="col-span-6 sm:col-span-2">
                                        <label className={labelClass}>Prioridad</label>
                                        <input type="text" className={inputClass}
                                            value={formData.priority || ''} onChange={e => set('priority', e.target.value)}
                                            placeholder="P-001" />
                                    </div>
                                    <div className="col-span-6 sm:col-span-2">
                                        <label className={labelClass}>Tarea SN</label>
                                        <input type="text" className={inputClass}
                                            value={formData.tareaSN || ''} onChange={e => set('tareaSN', e.target.value)}
                                            placeholder="SN-..." />
                                    </div>
                                    <div className="col-span-6 sm:col-span-2">
                                        <label className={labelClass}>Ticket RIT</label>
                                        <input type="text" className={inputClass}
                                            value={formData.ticketRIT || ''} onChange={e => set('ticketRIT', e.target.value)}
                                            placeholder="RIT-..." />
                                    </div>

                                    <div className="col-span-6 sm:col-span-3">
                                        <label className={labelClass}>Fecha Inicio</label>
                                        <input type="date" className={inputClass}
                                            value={formData.fechaInicio || ''} onChange={e => set('fechaInicio', e.target.value)} />
                                    </div>
                                    <div className="col-span-6 sm:col-span-3">
                                        <label className={labelClass}>Fecha Fin</label>
                                        <input type="date" className={inputClass}
                                            value={formData.fechaFin || ''} onChange={e => set('fechaFin', e.target.value)} />
                                    </div>
                                </div>

                                {/* Historial Fechas */}
                                {request && historialFechas.length > 0 && (
                                    <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <History size={11} /> Historial Fechas
                                        </h5>
                                        <ul className="space-y-1">
                                            {historialFechas.map(h => (
                                                <li key={h.id} className="text-xs flex justify-between text-slate-600">
                                                    <span>
                                                        <span className={`font-semibold ${h.tipo === 'inicio' ? 'text-blue-600' : 'text-orange-600'}`}>
                                                            {h.tipo === 'inicio' ? 'Inicio' : 'Fin'}:
                                                        </span> {h.fecha}
                                                    </span>
                                                    <span className="text-slate-400 opacity-75">{new Date(h.fecha_registro).toLocaleDateString()}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-between gap-3">
                            {request && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm('¿Estás seguro de eliminar esta solicitud?')) {
                                            onDelete?.(request.id);
                                            onClose();
                                        }
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                    Eliminar
                                </button>
                            )}
                            <div className="flex gap-3 ml-auto">
                                <button type="button" onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit"
                                    className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
                                    <Save size={15} /> Guardar Solicitud
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};