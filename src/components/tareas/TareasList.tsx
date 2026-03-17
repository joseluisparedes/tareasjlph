import React, { useState } from 'react';
import { useTareas } from '../../hooks/useTareas';
import { Loader2, Search, ArrowUpDown, Trash2, RotateCcw } from 'lucide-react';

export const TareasList: React.FC = () => {
    const { tareas, cargando, eliminarTarea, actualizarTarea } = useTareas();
    const [searchTerm, setSearchTerm] = useState('');
    const [urgencyFilter, setUrgencyFilter] = useState<string>('Todas');

    const tareasTerminadas = tareas.filter(t => t.estado === 'Terminada');

    const filteredTareas = tareasTerminadas.filter(t => {
        const matchesSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (t.descripcion?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesUrgency = urgencyFilter === 'Todas' || t.urgencia === urgencyFilter;
        return matchesSearch && matchesUrgency;
    }).sort((a,b) => new Date(b.fecha_actualizacion).getTime() - new Date(a.fecha_actualizacion).getTime());

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
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tarea</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Descripción</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Urgencia</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha Terminación</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
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
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getUrgencyBadge(tarea.urgencia)}
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
