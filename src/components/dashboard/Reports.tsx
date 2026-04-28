import React, { useState, useMemo } from 'react';
import { ITRequest } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { AlertCircle, Flame, ShieldAlert, CheckCircle } from 'lucide-react';

interface ReportsProps {
    requests: ITRequest[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4'];

export const Reports: React.FC<ReportsProps> = ({ requests }) => {
    // Filters for domain vs direction
    const [domainFilter, setDomainFilter] = useState<string>('Todos');

    const allDomains = useMemo(() => Array.from(new Set(requests.map(r => r.domain).filter(Boolean))), [requests]);
    const allDirections = useMemo(() => Array.from(new Set(requests.map(r => r.direccionSolicitante).filter(Boolean))), [requests]);

    // 1. Incidentes Activos
    const activeIncidents = useMemo(() => {
        return requests.filter(r => {
            const isIncident = r.type === 'Incidente' || r.type === 'Incident';
            const isActive = r.status !== 'Cerrado' && r.status !== 'Finalizado' && r.status !== 'Completado';
            return isIncident && isActive;
        });
    }, [requests]);

    const incidentsByStatus = useMemo(() => {
        const counts: Record<string, number> = {};
        activeIncidents.forEach(r => {
            const st = r.status || 'Sin Estado';
            counts[st] = (counts[st] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    }, [activeIncidents]);

    // 2. Reportes por Dirección y Dominio (Stacked)
    const dataDireccionDominio = useMemo(() => {
        const grouped: Record<string, Record<string, number>> = {};
        requests.forEach(r => {
            const dir = r.direccionSolicitante || 'Sin Dirección';
            const dom = r.domain || 'Sin Dominio';
            
            if (domainFilter !== 'Todos' && dom !== domainFilter) return;

            if (!grouped[dir]) grouped[dir] = {};
            grouped[dir][dom] = (grouped[dir][dom] || 0) + 1;
            grouped[dir]['total'] = (grouped[dir]['total'] || 0) + 1;
        });

        return Object.entries(grouped)
            .map(([dir, domains]) => ({ name: dir, ...domains }))
            .sort((a, b) => (b.total as number) - (a.total as number));
    }, [requests, domainFilter]);

    const uniqueDomains = useMemo(() => {
        const s = new Set<string>();
        requests.forEach(r => {
            if (domainFilter !== 'Todos' && r.domain !== domainFilter) return;
            if (r.domain) s.add(r.domain);
            else s.add('Sin Dominio');
        });
        return Array.from(s);
    }, [requests, domainFilter]);

    // 3. Requerimientos Muy Altos
    const requestsMuyAltos = useMemo(() => {
        return requests.filter(r => {
            const st = r.status as string;
            const urg = (r.urgency as string)?.toLowerCase() || '';

            // Solo los activos y con prioridad muy alta o crítica
            if (st !== 'Cerrado' && st !== 'Finalizado' && st !== 'Completado') {
                if (urg === 'crítica' || urg === 'critica' || urg === 'muy alta' || urg === 'muyalta') {
                    return true;
                }
            }
            return false;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [requests]);

    return (
        <div className="space-y-6 overflow-y-auto h-full pr-2 pb-8">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Reportes Ejecutivos</h2>
                    <p className="text-sm text-slate-500">Métricas en tiempo real de incidentes y requerimientos de alta prioridad.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 p-5 rounded-xl border border-red-100 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-red-500 text-xs font-bold uppercase tracking-wider mb-1">Incidentes Activos</p>
                        <h3 className="text-3xl font-extrabold text-red-700">{activeIncidents.length}</h3>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                        <ShieldAlert size={24} />
                    </div>
                </div>

                <div className="bg-orange-50 p-5 rounded-xl border border-orange-100 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-orange-500 text-xs font-bold uppercase tracking-wider mb-1">Req. Muy Altos</p>
                        <h3 className="text-3xl font-extrabold text-orange-700">{requestsMuyAltos.length}</h3>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                        <Flame size={24} />
                    </div>
                </div>

                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-blue-500 text-xs font-bold uppercase tracking-wider mb-1">Total Iniciativas</p>
                        <h3 className="text-3xl font-extrabold text-blue-700">{requests.length}</h3>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <CheckCircle size={24} />
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* 1. Incidentes Activos por Estado */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col h-[380px]">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                            <ShieldAlert size={16} className="text-red-500" /> 
                            Distribución de Incidentes Activos
                        </h3>
                    </div>
                    <div className="flex-1 w-full min-h-0 relative">
                        {incidentsByStatus.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">Sin incidentes activos</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={incidentsByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="count" nameKey="name" label={({ name, value }) => `${name} (${value})`} labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }} style={{ fontSize: '11px', fontWeight: 600 }}>
                                        {incidentsByStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* 2. Lista de Incidentes Activos */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col h-[380px]">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                            <ShieldAlert size={16} className="text-red-500" />
                            Detalle de Incidentes Activos
                        </h3>
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200">{activeIncidents.length} Activos</span>
                    </div>

                    <div className="flex-1 w-full min-h-0 overflow-y-auto pr-2 scrollbar-thin">
                        {activeIncidents.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-slate-400">Excelente, no hay incidentes activos.</div>
                        ) : (
                            <div className="space-y-3">
                                {activeIncidents.map(req => (
                                    <div key={req.id} className="p-3 border-l-4 border-red-500 border-y border-r border-slate-200 rounded-r-lg rounded-l-sm bg-red-50/30 hover:bg-red-50/80 transition-colors flex flex-col gap-1.5">
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-sm font-bold text-slate-800 line-clamp-2">{req.title}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-100 text-red-700 uppercase">{req.urgency}</span>
                                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium border border-slate-200">{req.status}</span>
                                            <span className="text-[10px] text-slate-500 ml-auto font-medium">{req.domain}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Requerimientos Muy Altos (Lista) */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col h-[380px]">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                            <Flame size={16} className="text-orange-500" />
                            Requerimientos Críticos / Muy Altos
                        </h3>
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold border border-orange-200">{requestsMuyAltos.length} Pendientes</span>
                    </div>

                    <div className="flex-1 w-full min-h-0 overflow-y-auto pr-2 scrollbar-thin">
                        {requestsMuyAltos.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-slate-400">Excelente, no hay requerimientos muy altos pendientes.</div>
                        ) : (
                            <div className="space-y-3">
                                {requestsMuyAltos.map(req => (
                                    <div key={req.id} className="p-3 border-l-4 border-orange-500 border-y border-r border-slate-200 rounded-r-lg rounded-l-sm bg-orange-50/30 hover:bg-orange-50/80 transition-colors flex flex-col gap-1.5">
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-sm font-bold text-slate-800 line-clamp-2">{req.title}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-orange-100 text-orange-700 uppercase">{req.urgency}</span>
                                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium border border-slate-200">{req.status}</span>
                                            <span className="text-[10px] text-slate-500 ml-auto font-medium">{req.domain}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Reportes por Dirección y Dominio (Stacked Bar) */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col h-[380px]">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                            Cantidad de Reportes por Dirección y Dominio
                        </h3>
                        <select
                            className="text-xs border border-slate-300 rounded-md px-3 py-1.5 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            value={domainFilter}
                            onChange={(e) => setDomainFilter(e.target.value)}
                        >
                            <option value="Todos">Todos los Dominios</option>
                            {allDomains.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        {dataDireccionDominio.length === 0 ? (
                             <div className="h-full flex items-center justify-center text-sm text-slate-400">Sin datos para mostrar</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dataDireccionDominio} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={{ stroke: '#cbd5e1' }} 
                                        tickLine={false} 
                                        tick={{ fontSize: 11, fill: '#475569', angle: -45, textAnchor: 'end' }} 
                                        interval={0}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#475569' }} />
                                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', fontSize: '13px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                                    
                                    {uniqueDomains.map((domain, index) => (
                                        <Bar 
                                            key={domain} 
                                            dataKey={domain} 
                                            stackId="a" 
                                            fill={COLORS[index % COLORS.length]} 
                                            radius={index === uniqueDomains.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};