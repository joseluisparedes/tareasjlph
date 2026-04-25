import React, { useMemo, useState } from 'react';
import { ITRequest, Status } from '../../types';
import { Clock, CheckCircle2, ChevronLeft, CalendarX2 } from 'lucide-react';

interface TimelineBoardProps {
    requests: ITRequest[];
    onEdit: (req: ITRequest) => void;
}

export const TimelineBoard: React.FC<TimelineBoardProps> = ({ requests, onEdit }) => {
    const [showUnscheduled, setShowUnscheduled] = useState(true);

    const { scheduled, unscheduled } = useMemo(() => {
        const sched: ITRequest[] = [];
        const unsched: ITRequest[] = [];
        requests.forEach(req => {
            if (!req.fechaInicio && !req.fechaFin) {
                unsched.push(req);
            } else {
                sched.push(req);
            }
        });
        return { scheduled: sched, unscheduled: unsched };
    }, [requests]);

    // calculate min and max dates
    const { minDate, maxDate } = useMemo(() => {
        if (scheduled.length === 0) {
            return { minDate: new Date().getTime(), maxDate: new Date().getTime() };
        }
        
        const firstStart = scheduled[0].fechaInicio || scheduled[0].fechaFin!;
        let min = new Date(firstStart).getTime();
        let max = new Date(firstStart).getTime();

        scheduled.forEach(req => {
            const start = req.fechaInicio || req.fechaFin!;
            const end = req.fechaFin || req.fechaInicio!;
            
            const cDate = new Date(start).getTime();
            const dDate = new Date(end).getTime();
            
            if (!isNaN(cDate) && cDate < min) min = cDate;
            if (!isNaN(dDate) && dDate < min) min = dDate;
            if (!isNaN(cDate) && cDate > max) max = cDate;
            if (!isNaN(dDate) && dDate > max) max = dDate;
        });

        // Add 7 days to max and sub 7 from min for padding
        min -= 7 * 24 * 60 * 60 * 1000;
        max += 14 * 24 * 60 * 60 * 1000;
        
        // ensure minimum range of 30 days
        if ((max - min) < 30 * 24 * 60 * 60 * 1000) {
            max = min + 30 * 24 * 60 * 60 * 1000;
        }

        return { minDate: min, maxDate: max };
    }, [scheduled]);

    const getPosition = (dateStr: string) => {
        const d = new Date(dateStr).getTime();
        if (isNaN(d)) return 0;
        const percent = ((d - minDate) / (maxDate - minDate)) * 100;
        return Math.max(0, Math.min(100, percent));
    };

    // Sort requests by fechaInicio
    const sortedRequests = [...scheduled].sort((a, b) => {
        const tA = new Date(a.fechaInicio || a.fechaFin!).getTime();
        const tB = new Date(b.fechaInicio || b.fechaFin!).getTime();
        return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
    });

    // generate month markers
    const months = [];
    let current = new Date(minDate);
    current.setDate(1);
    while (current.getTime() <= maxDate) {
        months.push({
            date: new Date(current),
            pos: getPosition(current.toISOString())
        });
        current.setMonth(current.getMonth() + 1);
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Clock size={18} className="text-blue-600" />
                    Cronograma de Requerimientos
                </h3>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rotate-45 bg-blue-500"></div> Solo Inicio o Fin
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-1.5 rounded-full bg-blue-500"></div> En curso
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-1.5 rounded-full bg-slate-300"></div> Cerrado
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-hidden flex relative">
                
                {/* Backlog / Unscheduled Panel */}
                {unscheduled.length > 0 && (
                    <div className={`flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col transition-all duration-300 ease-in-out ${showUnscheduled ? 'w-64' : 'w-12'}`}>
                       <div className={`p-3 border-b border-slate-200 flex ${showUnscheduled ? 'justify-between' : 'justify-center'} items-center bg-white shadow-sm z-10`}>
                           {showUnscheduled && <span className="font-bold text-[11px] text-slate-600 uppercase tracking-wider flex items-center gap-1"><CalendarX2 size={14} className="text-orange-500"/> Sin Planificar ({unscheduled.length})</span>}
                           <button 
                               onClick={() => setShowUnscheduled(!showUnscheduled)} 
                               className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
                               title={showUnscheduled ? "Ocultar panel" : `Ver ${unscheduled.length} requerimientos sin fecha`}
                            >
                               {showUnscheduled ? <ChevronLeft size={16}/> : <div className="relative"><CalendarX2 size={18} className="text-slate-500"/><span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] font-bold px-1 rounded-full">{unscheduled.length}</span></div>}
                           </button>
                       </div>
                       
                       {showUnscheduled && (
                           <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50">
                               {unscheduled.map(req => (
                                   <div key={req.id} onClick={() => onEdit(req)} className="bg-white p-2.5 text-xs border border-slate-200 rounded-lg shadow-sm hover:shadow-md cursor-pointer hover:border-blue-300 transition-all group">
                                       <div className="font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">{req.title}</div>
                                       <div className="text-slate-400 mt-2 flex justify-between items-center">
                                            <span className="font-mono text-[10px]">{req.externalId || req.id.slice(0,8)}</span>
                                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{req.status}</span>
                                       </div>
                                   </div>
                               ))}
                           </div>
                       )}
                   </div>
                )}

                {/* Timeline Axis & Rows */}
                <div className="flex-1 overflow-auto flex flex-col">
                    <div className="min-w-[800px] w-full flex flex-col relative h-full">
                        {/* Header: Months timeline */}
                        <div className="sticky top-0 z-20 flex border-b border-slate-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                            <div className="w-[300px] flex-shrink-0 border-r border-slate-200 p-3 font-bold text-[11px] text-slate-500 uppercase tracking-widest bg-slate-50/90 backdrop-blur-sm">
                                Requerimiento Planificado
                            </div>
                            <div className="flex-1 relative min-h-[44px] bg-slate-50/90 backdrop-blur-sm">
                                {months.map((m, i) => (
                                    <div 
                                        key={i} 
                                        className="absolute top-0 bottom-0 border-l border-slate-200 pl-2 pt-2 text-[10px] text-slate-600 font-bold uppercase tracking-wider whitespace-nowrap"
                                        style={{ left: `${m.pos}%` }}
                                    >
                                        {m.date.toLocaleString('es-ES', { month: 'short', year: 'numeric' })}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Body: Rows */}
                        <div className="flex-1 relative bg-white">
                            {/* Background grid lines */}
                            <div className="absolute inset-0 pointer-events-none">
                                {months.map((m, i) => (
                                    <div key={i} className="absolute top-0 bottom-0 border-l border-slate-100" style={{ left: `calc(300px + ${m.pos} * calc(100% - 300px) / 100)` }} />
                                ))}
                            </div>

                            {sortedRequests.map(req => {
                                const start = req.fechaInicio || req.fechaFin!;
                                const end = req.fechaFin || req.fechaInicio!;
                                const startPos = getPosition(start);
                                const endPos = getPosition(end);
                                const isSingleDate = start === end && (!req.fechaInicio || !req.fechaFin);
                                const isClosed = req.status === Status.Closed;

                                const titleStyles = isClosed ? "text-slate-400 line-through" : "text-slate-800";
                                const barColor = isClosed ? "bg-slate-300" : "bg-blue-500";

                                return (
                                    <div key={req.id} className="flex border-b border-slate-100 hover:bg-blue-50/30 group cursor-pointer transition-colors" onClick={() => onEdit(req)}>
                                        <div className="w-[300px] flex-shrink-0 border-r border-slate-200/50 p-2.5 bg-white z-10 flex flex-col justify-center">
                                            <div className={`text-sm font-medium truncate ${titleStyles}`} title={req.title}>{req.title}</div>
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-tight">{req.externalId || req.id.slice(0,8)}</span>
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{req.status}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 relative min-h-[56px] flex items-center py-2">
                                            {isSingleDate ? (
                                                /* Milestone / Single Date */
                                                <div 
                                                    className={`absolute w-3.5 h-3.5 rotate-45 transform -translate-x-1.5 z-10 ${barColor} shadow-sm group-hover:scale-110 transition-transform`}
                                                    style={{ left: `${startPos}%` }}
                                                    title={`Fecha: ${new Date(start).toLocaleDateString()}`}
                                                ></div>
                                            ) : (
                                                /* Range Bar */
                                                <div 
                                                    className={`absolute h-3.5 rounded-full ${barColor} shadow-md z-10 opacity-90 transition-all group-hover:opacity-100 hover:h-4`}
                                                    style={{ left: `${startPos}%`, width: `${Math.max(0.3, endPos - startPos)}%` }}
                                                    title={`Inicio: ${new Date(start).toLocaleDateString()} - Fin: ${new Date(end).toLocaleDateString()}`}
                                                ></div>
                                            )}

                                            {isClosed && !isSingleDate && (
                                                <div className="absolute text-slate-400 -mt-0.5 z-20 group-hover:text-slate-600 transition-colors" style={{ left: `calc(${endPos}% + 8px)` }}>
                                                    <CheckCircle2 size={16} />
                                                </div>
                                            )}
                                            {isClosed && isSingleDate && (
                                                <div className="absolute text-slate-400 -mt-0.5 z-20 group-hover:text-slate-600 transition-colors" style={{ left: `calc(${startPos}% + 12px)` }}>
                                                    <CheckCircle2 size={16} />
                                                </div>
                                            )}
                                            {!isClosed && !isSingleDate && (
                                                <div className="absolute font-semibold text-[10px] text-slate-600 bg-white/90 backdrop-blur px-1.5 py-0.5 rounded shadow-sm border border-slate-200 z-20 whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" style={{ left: `calc(${endPos}% + 8px)` }}>
                                                    {new Date(end).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                                </div>
                                            )}
                                            {!isClosed && isSingleDate && (
                                                <div className="absolute font-semibold text-[10px] text-slate-600 bg-white/90 backdrop-blur px-1.5 py-0.5 rounded shadow-sm border border-slate-200 z-20 whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" style={{ left: `calc(${startPos}% + 16px)` }}>
                                                    {new Date(start).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {sortedRequests.length === 0 && (
                                <div className="p-10 text-center flex flex-col items-center gap-3">
                                    <Clock size={48} className="text-slate-200" />
                                    <div className="text-slate-500 font-medium">No hay requerimientos planificados.</div>
                                </div>
                            )}
                            
                            <div className="h-10"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
