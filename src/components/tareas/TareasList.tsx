import React, { useState } from 'react';
import { useTareas } from '../../hooks/useTareas';
import { useUsuarios } from '../../hooks/useUsuarios';
import { Loader2, Search, ArrowUpDown, Trash2, RotateCcw } from 'lucide-react';

type SortableField = 'titulo' | 'descripcion' | 'responsable' | 'urgencia' | 'fecha_creacion' | 'fecha_actualizacion';

export const TareasList: React.FC = () => {
    const { tareas, cargando, eliminarTarea, actualizarTarea } = useTareas();
    const { usuarios } = useUsuarios();
    const [searchTerm, setSearchTerm] = useState('');
    const [urgencyFilter, setUrgencyFilter] = useState<string>('Todas');
    const [responsableFilter, setResponsableFilter] = useState<string>('Todos');

    // Estado para ordenación
    const [sortField, setSortField] = useState<SortableField>('fecha_actualizacion');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const tareasTerminadas = tareas.filter(t => t.estado === 'Terminada');

    const handleSort = (field: SortableField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const filteredTareas = tareasTerminadas.filter(t => {
        const matchesSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (t.descripcion?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesUrgency = urgencyFilter === 'Todas' || t.urgencia === urgencyFilter;
        const matchesResponsable = responsableFilter === 'Todos' || t.responsable_id === responsableFilter;
        return matchesSearch && matchesUrgency && matchesResponsable;
    }).sort((a, b) => {
        let comparison = 0;
        if (sortField === 'titulo') {
            comparison = a.titulo.localeCompare(b.titulo);
        } else if (sortField === 'descripcion') {
            comparison = (a.descripcion || '').localeCompare(b.descripcion || '');
        } else if (sortField === 'responsable') {
            const nameA = usuarios.find(u => u.id === a.responsable_id)?.nombre_completo || '';
            const nameB = usuarios.find(u => u.id === b.responsable_id)?.nombre_completo || '';
            comparison = nameA.localeCompare(nameB);
        } else if (sortField === 'urgencia') {
            const urgencyWeight = { 'Verde': 1, 'Amarillo': 2, 'Rojo': 3 };
            const weightA = urgencyWeight[a.urgencia as 'Verde' | 'Amarillo' | 'Rojo'] || 0;
            const weightB = urgencyWeight[b.urgencia as 'Verde' | 'Amarillo' | 'Rojo'] || 0;
            comparison = weightA - weightB;
        } else if (sortField === 'fecha_creacion') {
            const timeA = new Date(a.fecha_creacion || 0).getTime();
            const timeB = new Date(b.fecha_creacion || 0).getTime();
            comparison = timeA - timeB;
        } else if (sortField === 'fecha_actualizacion') {
            const timeA = new Date(a.fecha_actualizacion).getTime();
            const timeB = new Date(b.fecha_actualizacion).getTime();
            comparison = timeA - timeB;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    const getUrgencyBadge = (urgencia: string) => {
        switch (urgencia) {
            case 'Verde': return <span className="bg-green-100 text-green-800 border-green-200 px-2 py-1 rounded text-xs font-medium">Normal</span>;
            case 'Amarillo': return <span className="bg-yellow-100 text-yellow-800 border-yellow-200 px-2 py-1 rounded text-xs font-medium">Medio</span>;
            case 'Rojo': return <span className="bg-red-100 text-red-800 border-red-200 px-2 py-1 rounded text-xs font-medium">Alto</span>;
            default: return null;
        }
    };

    if (cargando && tareas.length === 0) {
        return <div className="p-10 flex justify-center text-slate-400"><Loader2 className="animate-spin" /></div>;
    }

    const reactivarTarea = async (id: string) => {
        if(window.confirm('¿Devolver esta tarea al tablero como Activa?')) {
            await actualizarTarea(id, { estado: 'Activa' });
        }
    };

    const borrarTarea = async (id: string) => {
        if(window.confirm('¿Eliminar esta tarea definitivamente?')) {
            await eliminarTarea(id);
        }
    };

    const getHeaderClass = (field: SortableField) => {
        return `px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none ${
            sortField === field ? 'text-blue-600 bg-slate-50/80' : 'text-slate-500'
        }`;
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-4 items-center flex-wrap">
                <div className="relative flex-1 min-w-[250px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar tareas terminadas..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                </div>
                
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 font-medium">Responsable:</span>
                    <select
                        value={responsableFilter}
                        onChange={e => setResponsableFilter(e.target.value)}
                        className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-[200px] truncate"
                    >
                        <option value="Todos">Todos</option>
                        {usuarios.map(u => (
                            <option key={u.id} value={u.id}>{u.nombre_completo}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 font-medium">Urgencia:</span>
                    <select
                        value={urgencyFilter}
                        onChange={e => setUrgencyFilter(e.target.value)}
                        className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="Todas">Todas</option>
                        <option value="Verde">Normal</option>
                        <option value="Amarillo">Medio</option>
                        <option value="Rojo">Alto</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {filteredTareas.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 flex flex-col items-center">
                        <CheckCircleIcon size={48} className="text-slate-200 mb-3" />
                        <p>No se encontraron tareas terminadas.</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th scope="col" onClick={() => handleSort('titulo')} className={getHeaderClass('titulo')}>
                                    <div className="flex items-center gap-1.5">
                                        Tarea
                                        <ArrowUpDown size={13} className={`transition-transform duration-200 ${sortField === 'titulo' ? (sortDirection === 'desc' ? 'rotate-180 text-blue-600' : 'text-blue-600') : 'text-slate-400 opacity-60'}`} />
                                    </div>
                                </th>
                                <th scope="col" onClick={() => handleSort('descripcion')} className={getHeaderClass('descripcion')}>
                                    <div className="flex items-center gap-1.5">
                                        Descripción
                                        <ArrowUpDown size={13} className={`transition-transform duration-200 ${sortField === 'descripcion' ? (sortDirection === 'desc' ? 'rotate-180 text-blue-600' : 'text-blue-600') : 'text-slate-400 opacity-60'}`} />
                                    </div>
                                </th>
                                <th scope="col" onClick={() => handleSort('responsable')} className={getHeaderClass('responsable')}>
                                    <div className="flex items-center gap-1.5">
                                        Responsable
                                        <ArrowUpDown size={13} className={`transition-transform duration-200 ${sortField === 'responsable' ? (sortDirection === 'desc' ? 'rotate-180 text-blue-600' : 'text-blue-600') : 'text-slate-400 opacity-60'}`} />
                                    </div>
                                </th>
                                <th scope="col" onClick={() => handleSort('urgencia')} className={getHeaderClass('urgencia')}>
                                    <div className="flex items-center gap-1.5">
                                        Urgencia
                                        <ArrowUpDown size={13} className={`transition-transform duration-200 ${sortField === 'urgencia' ? (sortDirection === 'desc' ? 'rotate-180 text-blue-600' : 'text-blue-600') : 'text-slate-400 opacity-60'}`} />
                                    </div>
                                </th>
                                <th scope="col" onClick={() => handleSort('fecha_creacion')} className={getHeaderClass('fecha_creacion')}>
                                    <div className="flex items-center gap-1.5">
                                        Fecha Creación
                                        <ArrowUpDown size={13} className={`transition-transform duration-200 ${sortField === 'fecha_creacion' ? (sortDirection === 'desc' ? 'rotate-180 text-blue-600' : 'text-blue-600') : 'text-slate-400 opacity-60'}`} />
                                    </div>
                                </th>
                                <th scope="col" onClick={() => handleSort('fecha_actualizacion')} className={getHeaderClass('fecha_actualizacion')}>
                                    <div className="flex items-center gap-1.5">
                                        Fecha Terminación
                                        <ArrowUpDown size={13} className={`transition-transform duration-200 ${sortField === 'fecha_actualizacion' ? (sortDirection === 'desc' ? 'rotate-180 text-blue-600' : 'text-blue-600') : 'text-slate-400 opacity-60'}`} />
                                    </div>
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider select-none">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {filteredTareas.map(tarea => (
                                <tr key={tarea.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{tarea.titulo}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-500 line-clamp-2 max-w-md">{tarea.descripcion || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {usuarios.find(u => u.id === tarea.responsable_id)?.nombre_completo || 'Sin asignar'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getUrgencyBadge(tarea.urgencia)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {tarea.fecha_creacion ? new Date(tarea.fecha_creacion).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {new Date(tarea.fecha_actualizacion).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => reactivarTarea(tarea.id)}
                                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                                title="Reactivar Tarea"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                            <button 
                                                onClick={() => borrarTarea(tarea.id)}
                                                className="text-slate-400 hover:text-red-600 transition-colors"
                                                title="Eliminar permanentemente"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

const CheckCircleIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
