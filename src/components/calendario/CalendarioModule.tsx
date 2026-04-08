import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Filter, User as UserIcon, Tag } from 'lucide-react';
import { useCalendario } from '../../hooks/useCalendario';
import { useCatalogos } from '../../hooks/useCatalogos';
import { useAuth } from '../../hooks/useAuth';
import { ActividadModal } from './ActividadModal';
import { ActividadCalendario, CatalogoItem } from '../../types';

export const CalendarioModule: React.FC = () => {
    const { user } = useAuth();
    const { actividades, cargando, error, crearActividad, actualizarActividad, eliminarActividad } = useCalendario();
    const { catalogos, crearItem, actualizarItem } = useCatalogos();

    const tiposActividad = useMemo(() => 
        catalogos.filter(c => c.tipo === 'tipo_actividad_calendario'), 
    [catalogos]);

    const colors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-red-600', 'bg-indigo-600', 'bg-teal-600', 'bg-pink-600'];
    const getColor = (tipo: string) => {
        const item = tiposActividad.find(t => t.valor === tipo);
        if (item?.color) return item.color;
        const hash = tipo.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    // Filtros
    const currentDate = new Date();
    const [mes, setMes] = useState(currentDate.getMonth()); // 0-11
    const [anio, setAnio] = useState(currentDate.getFullYear());
    
    const [filtroTipo, setFiltroTipo] = useState('');
    const [filtroRegistrador, setFiltroRegistrador] = useState('');
    const [soloMisActividades, setSoloMisActividades] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedActividad, setSelectedActividad] = useState<ActividadCalendario | null>(null);
    const [selectedDateStr, setSelectedDateStr] = useState<string>('');

    // Array unico de registradores para el combo
    const registradores = useMemo(() => {
        const mapeo = new Map<string, string>();
        actividades.forEach(a => mapeo.set(a.creado_por, a.creado_por_nombre || 'Usuario'));
        return Array.from(mapeo.entries()).map(([id, nombre]) => ({ id, nombre }));
    }, [actividades]);

    // Array único de tipos de actividad usados para el combo
    const tiposUsados = useMemo(() => {
        const set = new Set<string>();
        actividades.forEach(a => {
            if (a.tipo_actividad) set.add(a.tipo_actividad);
        });
        return Array.from(set).map(valor => {
            const cat = tiposActividad.find(t => t.valor === valor);
            return {
                id: cat ? cat.id : valor,
                valor: valor
            };
        });
    }, [actividades, tiposActividad]);

    // Lógica Calendario Grid
    const diasDelMes = new Date(anio, mes + 1, 0).getDate();
    const primerDiaMes = new Date(anio, mes, 1).getDay(); // 0(Dom) a 6(Sab)
    
    // Nombres
    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const handlePrevMonth = () => {
        if (mes === 0) { setMes(11); setAnio(anio - 1); } else setMes(mes - 1);
    };
    const handleNextMonth = () => {
        if (mes === 11) { setMes(0); setAnio(anio + 1); } else setMes(mes + 1);
    };

    const dateToStr = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    // Aplicar Filtros
    const actividadesFiltradas = useMemo(() => {
        return actividades.filter(act => {
            if (soloMisActividades && act.creado_por !== user?.id) return false;
            if (filtroTipo && act.tipo_actividad !== filtroTipo) return false;
            if (filtroRegistrador && act.creado_por !== filtroRegistrador) return false;
            return true;
        });
    }, [actividades, soloMisActividades, filtroTipo, filtroRegistrador, user]);

    // Filtrar actividades por dia (incluye cruce)
    const getActividadesDelDia = (fechaStr: string) => {
        return actividadesFiltradas.filter(act => {
            return fechaStr >= act.fecha_inicio && fechaStr <= act.fecha_fin;
        });
    };

    const openNewModal = (fecha?: string) => {
        setSelectedActividad(null);
        setSelectedDateStr(fecha || '');
        setIsModalOpen(true);
    };

    const handleSaveActividad = async (act: Partial<ActividadCalendario>, colorConfig?: string) => {
        // Auto-crear catálogo si no existe
        let catId = '';
        const itemCat = tiposActividad.find(t => t.valor === act.tipo_actividad);
        
        if (act.tipo_actividad && !itemCat) {
            const nuevoItem = await crearItem('tipo_actividad_calendario', act.tipo_actividad);
            catId = nuevoItem.id;
        } else if (itemCat) {
            catId = itemCat.id;
        }
        
        if (catId && colorConfig && colorConfig !== itemCat?.color) {
            await actualizarItem(catId, { color: colorConfig });
        }
        
        if (selectedActividad) {
            await actualizarActividad(selectedActividad.id, act);
        } else {
            await crearActividad({
                ...act,
                creado_por: user!.id,
            } as any);
        }
    };

    const grid: Date[][] = [];
    const startDate = new Date(anio, mes, 1);
    startDate.setDate(startDate.getDate() - primerDiaMes);
    let currentDateIter = new Date(startDate);
    
    for (let row = 0; row < 6; row++) {
        const filaDias = [];
        for (let col = 0; col < 7; col++) {
            filaDias.push(new Date(currentDateIter));
            currentDateIter.setDate(currentDateIter.getDate() + 1);
        }
        grid.push(filaDias);
    }

    if (cargando) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="bg-red-50 text-red-600 p-4 rounded-lg flex gap-2 items-center">
                    <span className="font-bold">Error al cargar: </span> {error}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header / Filtros */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex bg-white rounded-lg border border-slate-300 overflow-hidden shadow-sm">
                        <button onClick={handlePrevMonth} className="px-3 py-1.5 hover:bg-slate-100 text-slate-600"><ChevronLeft size={18}/></button>
                        <div className="px-4 py-1.5 font-bold text-slate-800 border-l border-r border-slate-300 min-w-[140px] text-center">
                            {nombresMeses[mes]} {anio}
                        </div>
                        <button onClick={handleNextMonth} className="px-3 py-1.5 hover:bg-slate-100 text-slate-600"><ChevronRight size={18}/></button>
                    </div>
                    
                    <button 
                        onClick={() => {
                            const hoy = new Date();
                            setMes(hoy.getMonth());
                            setAnio(hoy.getFullYear());
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                    >
                        Hoy
                    </button>
                    
                    <button
                        onClick={() => openNewModal(dateToStr(currentDate))}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                    >
                        <Plus size={16} /> Nueva Actividad
                    </button>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Filtros avanzados */}
                    <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-slate-300 w-full sm:w-auto">
                        <Tag size={14} className="text-slate-400" />
                        <select 
                            className="bg-transparent text-sm outline-none cursor-pointer text-slate-700 w-28 text-ellipsis"
                            value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                        >
                            <option value="">Todos los Tipos</option>
                            {tiposUsados.map(t => <option key={t.id} value={t.valor}>{t.valor}</option>)}
                        </select>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-slate-300 w-full sm:w-auto">
                        <UserIcon size={14} className="text-slate-400" />
                        <select 
                            className="bg-transparent text-sm outline-none cursor-pointer text-slate-700 w-28 text-ellipsis"
                            value={filtroRegistrador} onChange={e => setFiltroRegistrador(e.target.value)}
                            disabled={soloMisActividades}
                        >
                            <option value="">Todo el Equipo</option>
                            {registradores.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-slate-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={soloMisActividades} 
                            onChange={e => {
                                setSoloMisActividades(e.target.checked);
                                if(e.target.checked) setFiltroRegistrador('');
                            }}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="font-medium">Solo mis act.</span>
                    </label>
                </div>
            </div>

            {/* Calendario Grid */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-100 p-4 overflow-auto">
                <div className="min-w-[800px] flex-1 flex flex-col border border-slate-300 bg-white shadow-sm rounded-lg overflow-hidden">
                    {/* Header Dias */}
                    <div className="grid grid-cols-7 border-b border-slate-300 bg-slate-50 shrink-0">
                        {nombresDias.map(d => (
                            <div key={d} className="py-2 text-center text-sm font-bold text-slate-600 uppercase tracking-wide border-r border-slate-200 last:border-r-0">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Filas: Cada celda debe poder crecer o tener scroll interno */}
                    <div className="flex-1 flex flex-col">
                        {grid.map((fila, i) => (
                            <div key={i} className="grid grid-cols-7 flex-1 border-b border-slate-200 last:border-b-0 min-h-[120px]">
                                {fila.map((diaObj, j) => {
                                    const fechaStr = dateToStr(diaObj);
                                    const acts = getActividadesDelDia(fechaStr);
                                    
                                    const esHoy = fechaStr === dateToStr(currentDate);
                                    const esOtroMes = diaObj.getMonth() !== mes;

                                    return (
                                        <div 
                                            key={j} 
                                            className={`pt-1.5 pb-1 border-r border-slate-200 last:border-r-0 transition-colors flex flex-col group cursor-default relative ${esOtroMes ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
                                            onDoubleClick={() => openNewModal(fechaStr)}
                                        >
                                            <div className="flex justify-between items-start mb-1 px-1.5 shrink-0">
                                                <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${esHoy ? 'bg-blue-600 text-white' : (esOtroMes ? 'text-slate-400' : 'text-slate-700')}`}>
                                                    {diaObj.getDate()}
                                                </span>
                                                <button onClick={() => openNewModal(fechaStr)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-all">
                                                    <Plus size={14}/>
                                                </button>
                                            </div>
                                            
                                            <div className="flex-1 overflow-y-auto mt-0.5 custom-scrollbar flex flex-col gap-[2px]">
                                                {acts.map(act => {
                                                    let isStart = act.fecha_inicio === fechaStr;
                                                    let isEnd = act.fecha_fin === fechaStr;
                                                    
                                                    const colorVal = getColor(act.tipo_actividad);
                                                    const isHex = colorVal.startsWith('#');
                                                    const style = isHex ? { backgroundColor: colorVal, color: '#fff' } : {};
                                                    const classColor = isHex ? '' : colorVal;

                                                    return (
                                                        <div 
                                                            key={act.id} 
                                                            onClick={e => { e.stopPropagation(); setSelectedActividad(act); setIsModalOpen(true); }}
                                                            className={`text-[13px] px-2 py-1 leading-tight cursor-pointer truncate shadow-sm transition-opacity hover:opacity-80
                                                                ${classColor} font-medium ${isHex ? '' : 'text-white'}
                                                                ${isStart ? 'rounded-l-md ml-1.5' : 'ml-0'} 
                                                                ${isEnd ? 'rounded-r-md mr-1.5' : 'mr-0'}
                                                            `}
                                                            style={style}
                                                            title={`${act.descripcion} (${act.tipo_actividad})`}
                                                        >
                                                            {isStart && act.hora_inicio && (
                                                                <span className="font-bold mr-1 bg-black/10 px-1 rounded text-xs">{act.hora_inicio.substring(0,5)}</span>
                                                            )}
                                                            <span className={!isStart && !isEnd ? 'opacity-90' : ''}>
                                                                {act.descripcion}
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <ActividadModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                actividad={selectedActividad}
                onSave={handleSaveActividad}
                onDelete={selectedActividad?.creado_por === user?.id ? eliminarActividad : undefined}
                tiposActividad={tiposActividad}
                fechaPreseleccionada={selectedDateStr}
            />

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
};
