import React, { useState, useEffect, useRef } from 'react';
import { ITRequest, RequestType, Urgency, Status, CatalogItem, CatalogoItem, CatalogType } from '../../types';
import type { SolicitudFecha, SolicitudApunte } from '../../lib/supabase/tipos-bd';
import { apuntesApi } from '../../lib/api/apuntes';
import { useAuth } from '../../hooks/useAuth';
import { X, Save, Calendar, Hash, FileText, History, User, Grid, Star, Plus, Trash2, Copy } from 'lucide-react';

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
import { ConfirmModal } from '../shared/ConfirmModal';

const inputClass = "mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm border p-2 bg-white text-slate-900 placeholder-slate-400";
const labelClass = "block text-xs font-semibold text-slate-600 uppercase tracking-wide";

export const RequestModal: React.FC<RequestModalProps> = ({
    isOpen, onClose, request, onSave, onDelete, domains, catalogos, historialFechas = [], getModo
}) => {
    const { perfil, user, esAdministrador } = useAuth();
    
    // Verificamos si el usuario actual tiene permisos para editar la solicitud actual
    // Si no hay request (es una nueva), sí puede editar.
    const canEdit = esAdministrador || !request || request.creadorId === user?.id;
    const isReadOnly = !canEdit;

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
    const ingresadoGestionDemanda = getCats('ingresado_gestion_demanda');

    // Modos
    const getM = (t: CatalogType) => getModo?.(t) ?? 'desplegable';

    const [formData, setFormData] = useState<Partial<ITRequest>>({});
    const [isSavingRequest, setIsSavingRequest] = useState(false);
    const savingRef = useRef(false); // Bloqueo 100% sincrónico
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
                direccionSolicitante: '', brm: '', institucion: '', tipoTarea: '', complejidad: '',
                ingresadoGestionDemanda: 'No'
            });
            setApuntes([]);
        }
    }, [request, isOpen]);

    useEffect(() => {
        if (!isOpen || !request?.id) return;
        const handleApuntesUpdate = (e: CustomEvent) => {
            if (e.detail?.requestId === request.id && e.detail?.source !== 'RequestModal') {
                apuntesApi.obtenerPorSolicitud(request.id)
                    .then(setApuntes)
                    .catch(console.error);
            }
        };
        window.addEventListener('apuntes-actualizados', handleApuntesUpdate as EventListener);
        return () => window.removeEventListener('apuntes-actualizados', handleApuntesUpdate as EventListener);
    }, [isOpen, request?.id]);

    // --- Lógica de Selecciones Favoritas ---
    const [savedFavorites, setSavedFavorites] = useState<{ id: string, name: string, data: Partial<ITRequest> }[]>([]);
    const [isFavoriteMenuOpen, setIsFavoriteMenuOpen] = useState(false);
    const [newFavoriteName, setNewFavoriteName] = useState('');
    const [showSaveFavInput, setShowSaveFavInput] = useState(false);
    const favoriteMenuRef = useRef<HTMLDivElement>(null);
    const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
    const [deleteApunteConfirmId, setDeleteApunteConfirmId] = useState<string | null>(null);

    useEffect(() => {
        if (user && isOpen) {
            const favs = localStorage.getItem(`favorite_requests_${user.id}`);
            if (favs) {
                try {
                    setSavedFavorites(JSON.parse(favs));
                } catch (e) {
                    console.error("Error parsing favorites", e);
                }
            }
        }
    }, [user, isOpen]);

    const saveFavoritesToStorage = (favs: { id: string, name: string, data: Partial<ITRequest> }[]) => {
        if (user) {
            localStorage.setItem(`favorite_requests_${user.id}`, JSON.stringify(favs));
            setSavedFavorites(favs);
        }
    };

    const handleSaveFavorite = () => {
        if (!newFavoriteName.trim()) return;
        // Solo guardar campos que no sean ID, createdAt, apuntes, etc.
        // También ignoramos Título, Descripción, Tarea SN, Ticket RIT, Fechas, Prioridad y Usuario Solicitante
        const { 
            id, createdAt, creadorId, creadorNombre, externalId, 
            title, description, priority, tareaSN, ticketRIT, fechaInicio, fechaFin, requester,
            ...dataToSave 
        } = formData as any;
        
        const newFav = {
            id: Date.now().toString(),
            name: newFavoriteName,
            data: dataToSave
        };
        const updatedFavs = [newFav, ...savedFavorites];
        saveFavoritesToStorage(updatedFavs);
        setNewFavoriteName('');
        setShowSaveFavInput(false);
    };

    const handleLoadFavorite = (fav: { data: Partial<ITRequest> }) => {
        setFormData(prev => ({ 
            ...prev, 
            ...fav.data, 
            // Restauramos los valores actuales que no deben ser sobreescritos por la plantilla
            id: prev.id, 
            createdAt: prev.createdAt,
            title: prev.title,
            description: prev.description,
            priority: prev.priority,
            tareaSN: prev.tareaSN,
            ticketRIT: prev.ticketRIT,
            fechaInicio: prev.fechaInicio,
            fechaFin: prev.fechaFin,
            requester: prev.requester
        }));
        setIsFavoriteMenuOpen(false);
    };

    const handleDeleteFavorite = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedFavs = savedFavorites.filter(f => f.id !== id);
        saveFavoritesToStorage(updatedFavs);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (favoriteMenuRef.current && !favoriteMenuRef.current.contains(event.target as Node)) {
                setIsFavoriteMenuOpen(false);
                setShowSaveFavInput(false);
            }
        };

        if (isFavoriteMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFavoriteMenuOpen]);

    const handleGuardarApunte = async () => {
        if (!nuevoApunte.trim() || !request?.id) return;
        setGuardandoApunte(true);
        try {
            const userName = perfil?.nombre_completo || 'Usuario Desconocido';
            const apunte = await apuntesApi.crear(request.id, nuevoApunte, userName);
            setApuntes(prev => [apunte, ...prev]);
            setNuevoApunte('');
            window.dispatchEvent(new CustomEvent('apuntes-actualizados', { detail: { requestId: request.id, source: 'RequestModal' } }));
        } catch (error) {
            console.error("Error al guardar apunte:", error);
            alert("No se pudo guardar el apunte.");
        } finally {
            setGuardandoApunte(false);
        }
    };

    const handleDuplicate = () => {
        setShowDuplicateConfirm(true);
    };

    const confirmDuplicate = () => {
        setFormData(prev => ({
            ...prev,
            id: '',
            createdAt: '',
            creadorId: '',
            creadorNombre: '',
            externalId: '',
            title: prev.title ? `${prev.title} - Copia` : 'Copia',
        }));
        setApuntes([]);
        setShowDuplicateConfirm(false);
    };

    const handleEliminarApunte = (id: string) => {
        setDeleteApunteConfirmId(id);
    };

    const confirmEliminarApunte = async () => {
        if (!deleteApunteConfirmId) return;
        try {
            await apuntesApi.eliminar(deleteApunteConfirmId);
            setApuntes(prev => prev.filter(a => a.id !== deleteApunteConfirmId));
            window.dispatchEvent(new CustomEvent('apuntes-actualizados', { detail: { requestId: request?.id, source: 'RequestModal' } }));
        } catch (error) {
            console.error("Error al eliminar apunte:", error);
            alert("No se pudo eliminar el apunte.");
        }
        setDeleteApunteConfirmId(null);
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
            window.dispatchEvent(new CustomEvent('apuntes-actualizados', { detail: { requestId: request?.id, source: 'RequestModal' } }));
        } catch (error) {
            console.error("Error al actualizar apunte:", error);
            alert("No se pudo actualizar el apunte.");
        }
    };

    if (!isOpen) return null;

    const set = (field: keyof ITRequest, value: unknown) =>
        setFormData(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (savingRef.current) return;
        savingRef.current = true;
        setIsSavingRequest(true);
        const newRequest = {
            ...formData,
            id: formData.id || `BRM-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            createdAt: formData.createdAt || new Date().toISOString(),
        } as ITRequest;
        await onSave(newRequest);
        savingRef.current = false;
        setIsSavingRequest(false); // Por si se mantiene abierto, restauramos.
    };
    
    // Función ayudante para mostrar fecha en DD/MM/YYYY
    const formatearFecha = (fechaStr: string) => {
        if (!fechaStr) return '';
        const partes = fechaStr.split('-');
        return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fechaStr;
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
                            {request?.creadorNombre && (
                                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                    <User size={10} /> Registrada por: {request.creadorNombre}
                                </p>
                            )}
                            <p className="text-xs text-slate-500 mt-0.5">
                                {request ? 'Modifica los campos necesarios.' : 'Completa la información.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Menú de Favoritos */}
                            {canEdit && (
                                <div className="relative" ref={favoriteMenuRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsFavoriteMenuOpen(!isFavoriteMenuOpen)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        <Star size={14} className={savedFavorites.length > 0 ? "fill-yellow-500" : ""} />
                                        Selección Favorita
                                    </button>

                                    {isFavoriteMenuOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2">
                                            <div className="mb-2 pb-2 border-b border-slate-100">
                                                {!showSaveFavInput ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowSaveFavInput(true)}
                                                        className="w-full text-left px-3 py-2 text-sm text-yellow-600 hover:bg-yellow-50 rounded-md font-medium flex items-center gap-2"
                                                    >
                                                        <Plus size={14} /> Guardar selección actual
                                                    </button>
                                                ) : (
                                                    <div className="flex gap-2 p-1">
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            placeholder="Nombre favorito..."
                                                            className="flex-1 text-sm border rounded px-2 py-1"
                                                            value={newFavoriteName}
                                                            onChange={e => setNewFavoriteName(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && handleSaveFavorite()}
                                                        />
                                                        <button type="button" onClick={handleSaveFavorite} className="text-yellow-600 hover:text-yellow-800"><Save size={16} /></button>
                                                        <button type="button" onClick={() => setShowSaveFavInput(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                {savedFavorites.length === 0 ? (
                                                    <p className="text-xs text-slate-400 text-center py-2">No tienes selecciones favoritas</p>
                                                ) : (
                                                    savedFavorites.map(fav => (
                                                        <div key={fav.id}
                                                            onClick={() => handleLoadFavorite(fav)}
                                                            className="group flex items-center justify-between px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md cursor-pointer"
                                                        >
                                                            <span className="truncate pr-2">{fav.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleDeleteFavorite(fav.id, e)}
                                                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity flex-shrink-0"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {request?.id && (
                                <button
                                    type="button"
                                    onClick={handleDuplicate}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium transition-colors"
                                    title="Duplicar Solicitud"
                                >
                                    <Copy size={14} />
                                    Duplicar
                                </button>
                            )}

                            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
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
                                                disabled={isReadOnly}
                                                placeholder="Ej: Migración de Servidor..." />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Descripción</label>
                                            <textarea rows={4} className={inputClass}
                                                value={formData.description || ''}
                                                onChange={e => set('description', e.target.value)}
                                                disabled={isReadOnly}
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
                                                            {editingApunteId !== apunte.id && canEdit && (
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
                                    {canEdit && (
                                        <>
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
                                        </>
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
                                                <button type="button" onClick={() => !isReadOnly && set('domain', '')} disabled={isReadOnly}
                                                    className={`px-2.5 py-1 rounded-md text-xs font-medium border ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''} ${!formData.domain ? 'bg-slate-700 text-white' : 'bg-white text-slate-400'}`}>
                                                    -- Selecciona --
                                                </button>
                                                {domains.filter(d => d.isActive).map(d => (
                                                    <button key={d.id} type="button" onClick={() => !isReadOnly && set('domain', d.name)} disabled={isReadOnly}
                                                        className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''} ${formData.domain === d.name ? 'bg-blue-600 text-white shadow-sm scale-105' : 'bg-white text-slate-600 hover:border-blue-400'}`}>
                                                        {d.name}
                                                    </button>
                                                ))}
                                                {!formData.domain && <input type="text" required readOnly value="" className="sr-only" />}
                                            </div>
                                        ) : (
                                            <select required disabled={isReadOnly} className={`${inputClass} ${isReadOnly ? 'bg-slate-50 opacity-70 cursor-not-allowed' : ''}`} value={formData.domain || ''} onChange={e => set('domain', e.target.value)}>
                                                <option value="">-- Selecciona --</option>
                                                {domains.filter(d => d.isActive).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                            </select>
                                        )}
                                    </div>

                                    <SelectorCampo label="Tipo Requerimiento" required
                                        valor={formData.type || ''} onChange={v => set('type', v)} disabled={isReadOnly}
                                        opciones={tiposReq} modo={getM('tipo_requerimiento')} />

                                    <SelectorCampo label="Urgencia" required
                                        valor={formData.urgency || ''} onChange={v => set('urgency', v)} disabled={isReadOnly}
                                        opciones={urgencias} modo={getM('urgencia')} />

                                    <SelectorCampo label="Estado" required
                                        valor={formData.status || ''} onChange={v => set('status', v)} disabled={isReadOnly}
                                        opciones={estados} modo={getM('estado')} />

                                    <SelectorCampo label="Complejidad"
                                        valor={formData.complejidad || ''} onChange={v => set('complejidad', v)} disabled={isReadOnly}
                                        opciones={complejidades} modo={getM('complejidad')} />

                                    <SelectorCampo label="Tipo de Tarea"
                                        valor={formData.tipoTarea || ''} onChange={v => set('tipoTarea', v)} disabled={isReadOnly}
                                        opciones={tiposTarea} modo={getM('tipo_tarea')} />

                                    <SelectorCampo label="Ingresado en Gestión de la Demanda"
                                        valor={formData.ingresadoGestionDemanda || ''} onChange={v => set('ingresadoGestionDemanda', v)} disabled={isReadOnly}
                                        opciones={ingresadoGestionDemanda} modo={getM('ingresado_gestion_demanda')} />
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
                                        valor={formData.requester || ''} onChange={v => set('requester', v)} disabled={isReadOnly}
                                        opciones={usuarios} modo={getM('usuario_solicitante')}
                                        placeholder={usuarios.length === 0 ? "Escribe nombre..." : "-- Selecciona --"} />

                                    {/* Input fallback manual si no hay catálogo de usuarios (comportamiento anterior) */}
                                    {usuarios.length === 0 && getM('usuario_solicitante') === 'desplegable' && (
                                        <div className="-mt-14 opacity-0 pointer-events-none absolute"><input required disabled={isReadOnly} /> {/* Hack validación HTML5 si hidden */} </div>
                                    )}

                                    <SelectorCampo label="Dirección Solicitante"
                                        valor={formData.direccionSolicitante || ''} onChange={v => set('direccionSolicitante', v)} disabled={isReadOnly}
                                        opciones={direcciones} modo={getM('direccion_solicitante')} />

                                    <SelectorCampo label="Institución"
                                        valor={formData.institucion || ''} onChange={v => set('institucion', v)} disabled={isReadOnly}
                                        opciones={instituciones} modo={getM('institucion')} />

                                    <SelectorCampo label="BRM"
                                        valor={formData.brm || ''} onChange={v => set('brm', v)} disabled={isReadOnly}
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
                                        valor={formData.assigneeId || ''} onChange={v => set('assigneeId', v || null)} disabled={isReadOnly}
                                        opciones={asignados} modo={getM('asignado_a')} placeholder="-- Sin asignar --" />

                                    <div className="col-span-6 sm:col-span-2">
                                        <label className={labelClass}>Prioridad</label>
                                        <input type="text" className={inputClass} disabled={isReadOnly}
                                            value={formData.priority || ''} onChange={e => set('priority', e.target.value)}
                                            placeholder="P-001" />
                                    </div>
                                    <div className="col-span-6 sm:col-span-2">
                                        <label className={labelClass}>Tarea SN</label>
                                        <input type="text" className={inputClass} disabled={isReadOnly}
                                            value={formData.tareaSN || ''} onChange={e => set('tareaSN', e.target.value)}
                                            placeholder="SN-..." />
                                    </div>
                                    <div className="col-span-6 sm:col-span-2">
                                        <label className={labelClass}>Ticket RIT</label>
                                        <input type="text" className={inputClass} disabled={isReadOnly}
                                            value={formData.ticketRIT || ''} onChange={e => set('ticketRIT', e.target.value)}
                                            placeholder="RIT-..." />
                                    </div>

                                    <div className="col-span-6 sm:col-span-3">
                                        <label className={labelClass}>Fecha Inicio</label>
                                        <input type="date" className={inputClass} disabled={isReadOnly}
                                            value={formData.fechaInicio || ''} 
                                            max={formData.fechaFin || undefined}
                                            onChange={e => set('fechaInicio', e.target.value)} />
                                    </div>
                                    <div className="col-span-6 sm:col-span-3">
                                        <label className={labelClass}>Fecha Fin</label>
                                        <input type="date" className={inputClass} disabled={isReadOnly}
                                            value={formData.fechaFin || ''} 
                                            min={formData.fechaInicio || undefined}
                                            onChange={e => set('fechaFin', e.target.value)} />
                                    </div>
                                </div>

                                {/* Historial Fechas */}
                                {request && historialFechas.length > 0 && (
                                    <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <History size={11} /> Historial Fechas
                                        </h5>
                                        <ul className="space-y-2">
                                            {historialFechas.map(h => (
                                                <li key={h.id} className="text-xs flex flex-col text-slate-600 bg-white p-1.5 rounded border border-slate-100">
                                                    <div className="flex justify-between w-full">
                                                        <span>
                                                            <span className={`font-semibold ${h.tipo === 'inicio' ? 'text-blue-600' : 'text-orange-600'}`}>
                                                                {h.tipo === 'inicio' ? 'Inicio' : 'Fin'}:
                                                            </span> {formatearFecha(h.fecha)}
                                                        </span>
                                                        <span className="text-slate-400 opacity-75">{new Date(h.fecha_registro).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 mt-0.5">
                                                        Por: {h.cambiado_por === user?.id ? (perfil?.nombre_completo || 'Tú') : 'Usuario Colaborador'}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-between gap-3">
                            {request && canEdit && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onDelete?.(request.id);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                    Eliminar
                                </button>
                            )}
                            <div className="flex gap-3 ml-auto">
                                <button type="button" onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                                    {canEdit ? 'Cancelar' : 'Cerrar'}
                                </button>
                                {canEdit && (
                                    <button type="submit"
                                        disabled={isSavingRequest}
                                        className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm ${isSavingRequest ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                        <Save size={15} /> {isSavingRequest ? 'Guardando...' : 'Guardar Solicitud'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <ConfirmModal
                isOpen={showDuplicateConfirm}
                title="Duplicar Solicitud"
                message={<p>¿Estás seguro de que deseas crear una copia en borrador de esta solicitud? Todos los campos serán clonados, pero se te permitirá revisarlos y guardarlos como una nueva solicitud.</p>}
                confirmText="Clonar"
                cancelText="Cancelar"
                type="info"
                onConfirm={confirmDuplicate}
                onCancel={() => setShowDuplicateConfirm(false)}
            />

            <ConfirmModal
                isOpen={!!deleteApunteConfirmId}
                title="Eliminar Apunte"
                message={<p>¿Estás seguro de que deseas eliminar este apunte permanentemente?</p>}
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
                onConfirm={confirmEliminarApunte}
                onCancel={() => setDeleteApunteConfirmId(null)}
            />
        </div>
    );
};