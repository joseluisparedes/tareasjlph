import React, { useRef } from 'react';
import { Calendar, AlertCircle, Clock, ChevronRight, User, Tag, ArrowRight, Zap, CheckCircle2, Timer, AlertTriangle, TrendingUp, BarChart, ExternalLink } from 'lucide-react';
import { ActividadCalendario, ITRequest } from '../../types';

interface CriticalAlertsProps {
    actividades: ActividadCalendario[];
    requests: ITRequest[];
    onActivityClick?: (actividad: ActividadCalendario) => void;
    onIniciativaClick?: (iniciativa: ITRequest) => void;
    umbrales?: { yellow: number, red: number };
}

export const CriticalAlerts: React.FC<CriticalAlertsProps> = ({ 
    actividades, 
    requests, 
    onActivityClick,
    onIniciativaClick,
    umbrales
}) => {
    const iniciativasRef = useRef<HTMLDivElement>(null);
    const calendarioRef = useRef<HTMLDivElement>(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const afterTomorrow = new Date(today);
    afterTomorrow.setDate(afterTomorrow.getDate() + 2);

    const parseDate = (dateStr?: string) => {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return null;
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        d.setHours(0,0,0,0);
        return d;
    };

    const isSameDay = (d1: Date | null, d2: Date) => {
        if (!d1) return false;
        return d1.getTime() === d2.getTime();
    };

    const isPastDate = (d1: Date | null, d2: Date) => {
        if (!d1) return false;
        return d1.getTime() < d2.getTime();
    };

    // --- LÓGICA DE CALENDARIO ---
    const hoyCal = actividades.filter(a => {
        const start = parseDate(a.fecha_inicio);
        const end = parseDate(a.fecha_fin);
        return (start && end && today >= start && today <= end) || isSameDay(start, today);
    });

    const proximosCal = actividades.filter(a => {
        const start = parseDate(a.fecha_inicio);
        return start && (isSameDay(start, tomorrow) || isSameDay(start, afterTomorrow));
    });

    // --- LÓGICA DE INICIATIVAS ---
    const iniciativasActivas = requests.filter(r => !r.status.toLowerCase().includes('cerrad') && !r.status.toLowerCase().includes('completad'));
    
    const atrasadas = iniciativasActivas.filter(r => {
        const end = parseDate(r.fechaFin);
        return end && isPastDate(end, today);
    });

    const vencenPronto = iniciativasActivas.filter(r => {
        const end = parseDate(r.fechaFin);
        return end && (isSameDay(end, today) || isSameDay(end, tomorrow));
    });

    const thresholdYellow = umbrales?.yellow ?? 7;
    const thresholdRed = umbrales?.red ?? 14;

    const estancadas = iniciativasActivas.filter(r => {
        if (!r.ultimoCambioEstado) return false;
        const start = new Date(r.ultimoCambioEstado).getTime();
        const diff = new Date().getTime() - start;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return days >= thresholdYellow;
    });

    const estancadasRojo = estancadas.filter(r => {
        const start = new Date(r.ultimoCambioEstado!).getTime();
        const days = Math.floor((new Date().getTime() - start) / (1000 * 60 * 60 * 24));
        return days >= thresholdRed;
    });

    const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <header className="flex flex-col gap-1">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
                    <Zap className="text-blue-600" size={32} />
                    Centro de Alertas
                </h2>
                <p className="text-slate-500 text-sm md:text-base">Control táctico de procesos críticos y compromisos TI.</p>
            </header>

            {/* Hero Metrics (Clickable) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <MetricCard 
                    title="Atrasadas" 
                    value={atrasadas.length} 
                    icon={<AlertTriangle size={24} />} 
                    color="from-red-500 to-rose-600"
                    label="Hacer clic para ver detalle"
                    onClick={() => scrollTo(iniciativasRef)}
                />
                <MetricCard 
                    title="Vencen Pronto" 
                    value={vencenPronto.length} 
                    icon={<Timer size={24} />} 
                    color="from-orange-500 to-amber-600"
                    label="Hacer clic para ver detalle"
                    onClick={() => scrollTo(iniciativasRef)}
                />
                <MetricCard 
                    title="En Curso" 
                    value={hoyCal.length} 
                    icon={<TrendingUp size={24} />} 
                    color="from-blue-600 to-indigo-700"
                    label="Hacer clic para ver calendario"
                    onClick={() => scrollTo(calendarioRef)}
                />
                <MetricCard 
                    title="Próximos Inicios" 
                    value={proximosCal.length} 
                    icon={<Calendar size={24} />} 
                    color="from-emerald-500 to-teal-600"
                    label="Ver nuevas actividades"
                    onClick={() => scrollTo(calendarioRef)}
                />
                <MetricCard 
                    title="Estancadas" 
                    value={estancadas.length} 
                    icon={<Timer size={24} />} 
                    color="from-amber-500 to-orange-600"
                    label="Hacer clic para ver detalle"
                    onClick={() => scrollTo(iniciativasRef)}
                />
            </div>

            {/* Panel de Resumen de Salud (Executive View) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                        <BarChart size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800">Salud del Portafolio TI</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Resumen de Cumplimiento</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <HealthBar label="Iniciativas Atrasadas" count={atrasadas.length} total={iniciativasActivas.length} color="bg-red-500" />
                    <HealthBar label="Iniciativas en Riesgo (48h)" count={vencenPronto.length} total={iniciativasActivas.length} color="bg-orange-500" />
                    <HealthBar label="Iniciativas Estancadas" count={estancadas.length} total={iniciativasActivas.length} color="bg-amber-500" />
                </div>
            </div>

            {/* DETALLE DE CALENDARIO */}
            <div ref={calendarioRef} className="space-y-6 pt-4">
                <SectionHeader title="Detalle de Procesos Críticos" icon={<Calendar className="text-indigo-600" />} type="Calendario" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hoyCal.map(act => (
                        <ActivityCard key={act.id} act={act} onClick={() => onActivityClick?.(act)} status="active" />
                    ))}
                    {proximosCal.map(act => (
                        <ActivityCard key={act.id} act={act} onClick={() => onActivityClick?.(act)} status="upcoming" />
                    ))}
                    {[...hoyCal, ...proximosCal].length === 0 && (
                        <div className="col-span-full py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400 italic">
                            No hay actividades críticas en el calendario.
                        </div>
                    )}
                </div>
            </div>

            {/* DETALLE DE INICIATIVAS (LO QUE SOLICITASTE) */}
            <div ref={iniciativasRef} className="space-y-6 pt-4">
                <SectionHeader title="Listado Detallado de Alertas TI" icon={<Zap className="text-orange-600" />} type="Iniciativas" />
                
                {/* Agrupación: Atrasadas */}
                {atrasadas.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <h4 className="text-xs font-black text-red-600 uppercase tracking-widest">Atrasadas e Incumplidas</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {atrasadas.map(req => (
                                <IniciativaCard key={req.id} req={req} onClick={() => onIniciativaClick?.(req)} critical={true} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Agrupación: Vencen Pronto */}
                {vencenPronto.length > 0 && (
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-2 px-1">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest">Próximas a Vencer (48h)</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {vencenPronto.map(req => (
                                <IniciativaCard key={req.id} req={req} onClick={() => onIniciativaClick?.(req)} critical={false} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Agrupación: Estancadas */}
                {estancadas.length > 0 && (
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-2 px-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest">Estancadas en el Estado Actual</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {estancadas.map(req => {
                                const start = new Date(req.ultimoCambioEstado!).getTime();
                                const days = Math.floor((new Date().getTime() - start) / (1000 * 60 * 60 * 24));
                                return (
                                    <IniciativaCard 
                                        key={req.id} 
                                        req={req} 
                                        onClick={() => onIniciativaClick?.(req)} 
                                        critical={days >= thresholdRed} 
                                        customLabel={`Lleva ${days} días en este estado`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {[...atrasadas, ...vencenPronto].length === 0 && (
                    <div className="py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400 italic">
                        No hay iniciativas en estado de alerta.
                    </div>
                )}
            </div>
        </div>
    );
};

/* --- COMPONENTES ATÓMICOS --- */

const MetricCard = ({ title, value, icon, color, label, onClick }: any) => (
    <div 
        onClick={onClick}
        className={`bg-gradient-to-br ${color} rounded-3xl p-5 text-white shadow-lg hover:scale-[1.03] active:scale-95 transition-all cursor-pointer group`}
    >
        <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{title}</span>
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md group-hover:bg-white/30 transition-colors">{icon}</div>
        </div>
        <div className="text-3xl font-black">{value}</div>
        <p className="text-[10px] mt-1 opacity-70 font-medium flex items-center gap-1">
            {label} <ChevronRight size={10} />
        </p>
    </div>
);

const HealthBar = ({ label, count, total, color }: any) => (
    <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600 font-bold">{label}</span>
            <span className="text-slate-800 font-black">{count} <span className="text-slate-400 font-medium text-xs">/ {total}</span></span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div className={`${color} h-full transition-all duration-1000 ease-out`} style={{ width: `${(count / total || 0) * 100}%` }}></div>
        </div>
    </div>
);

const SectionHeader = ({ title, icon, type }: any) => (
    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h3 className="text-lg md:text-xl font-black text-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-slate-200 shadow-sm">
                {icon}
            </div>
            {title}
        </h3>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{type}</span>
    </div>
);

const ActivityCard = ({ act, onClick, status }: any) => (
    <div 
        onClick={onClick}
        className={`group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between min-h-[140px] ${status === 'active' ? 'ring-2 ring-indigo-50 border-indigo-200' : ''}`}
    >
        <div className="space-y-2">
            <div className="flex justify-between items-start">
                <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Tag size={14} />
                </div>
                <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${status === 'active' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {status === 'active' ? 'En Curso' : 'Próximo'}
                </div>
            </div>
            <h4 className="font-bold text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-tight">{act.descripcion}</h4>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
            <div className="flex flex-col text-[10px] text-slate-500 font-bold">
                <span className="flex items-center gap-1"><Clock size={12} /> {act.fecha_inicio}</span>
                <span className="flex items-center gap-1 mt-0.5"><User size={12} /> {act.creado_por_nombre}</span>
            </div>
            <ArrowRight size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </div>
    </div>
);

const IniciativaCard = ({ req, onClick, critical, customLabel }: any) => (
    <div 
        onClick={onClick}
        className={`group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between min-h-[160px] ${critical ? 'border-l-4 border-l-red-500 hover:border-red-300' : 'hover:border-orange-300 border-l-4 border-l-orange-400'}`}
    >
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${critical ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>{req.id}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase">{req.status}</span>
            </div>
            <h4 className={`font-bold text-slate-800 transition-colors line-clamp-2 leading-tight ${critical ? 'group-hover:text-red-600' : 'group-hover:text-orange-600'}`}>
                {req.title}
            </h4>
        </div>
        <div className="pt-3 flex flex-col gap-2">
            <div className={`flex items-center gap-1.5 text-xs font-black ${critical ? 'text-red-500' : 'text-slate-500'}`}>
                {critical ? <AlertCircle size={14} /> : <Timer size={14} />}
                {customLabel ? customLabel : (critical ? 'ENTREGA HOY' : `Vence el ${req.fechaFin}`)}
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span className="truncate max-w-[150px]">{req.requester}</span>
                <ExternalLink size={14} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
            </div>
        </div>
    </div>
);
