import React, { useState, useMemo } from 'react';
import { ITRequest } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';

interface ReportsProps {
    requests: ITRequest[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#6366F1'];

export const Reports: React.FC<ReportsProps> = ({ requests }) => {
    // Filters for charts
    const [statusFilter, setStatusFilter] = useState<string>('Todos');
    const [domainFilter, setDomainFilter] = useState<string>('Todos');

    // Filters for footer cards
    const [footerStatusFilter, setFooterStatusFilter] = useState<string>('Todos');
    const [footerDomainFilter, setFooterDomainFilter] = useState<string>('Todos');

    // Filter for Chart 4
    const [criticalDomainFilter, setCriticalDomainFilter] = useState<string>('Todos');

    const allStatuses = useMemo(() => Array.from(new Set(requests.map(r => r.status).filter(Boolean))), [requests]);
    const allDomains = useMemo(() => Array.from(new Set(requests.map(r => r.domain).filter(Boolean))), [requests]);

    // 1. Total por Dirección
    const dataDireccion = useMemo(() => {
        const counts: Record<string, number> = {};
        requests.forEach(r => {
            const dir = r.direccionSolicitante || 'Sin Dirección';
            counts[dir] = (counts[dir] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    }, [requests]);

    // 2. Total por Estado (filtrable)
    const dataEstado = useMemo(() => {
        const counts: Record<string, number> = {};
        requests.forEach(r => {
            const st = r.status || 'Sin Estado';
            if (statusFilter !== 'Todos' && st !== statusFilter) return;
            counts[st] = (counts[st] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    }, [requests, statusFilter]);

    // 3. Total por Dominio (filtrable)
    const dataDominio = useMemo(() => {
        const counts: Record<string, number> = {};
        requests.forEach(r => {
            const dom = r.domain || 'Sin Dominio';
            if (domainFilter !== 'Todos' && dom !== domainFilter) return;
            counts[dom] = (counts[dom] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    }, [requests, domainFilter]);

    // 4. Alta/Muy Alta en Ejecución/Pendiente
    const requestsPrioridad = useMemo(() => {
        const validStatuses = ['En ejecución', 'Pendiente'];

        return requests.filter(r => {
            const st = r.status as string;
            const urg = (r.urgency as string)?.toLowerCase() || '';

            if (validStatuses.includes(st)) {
                if (urg === 'alta' || urg === 'muy alta' || urg === 'crítica' || urg === 'critica' || urg === 'muyalta') {
                    return true;
                }
            }
            return false;
        }).sort((a, b) => {
            const getPrioWeight = (u: string) => {
                const lower = (u || '').toLowerCase();
                if (lower === 'crítica' || lower === 'critica' || lower === 'muy alta' || lower === 'muyalta') return 2;
                if (lower === 'alta') return 1;
                return 0;
            };
            const weightA = getPrioWeight(a.urgency);
            const weightB = getPrioWeight(b.urgency);
            if (weightA !== weightB) return weightB - weightA;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [requests]);

    const criticalDomains = useMemo(() => Array.from(new Set(requestsPrioridad.map(r => r.domain).filter(Boolean))), [requestsPrioridad]);

    const filteredRequestsPrioridad = useMemo(() => {
        if (criticalDomainFilter === 'Todos') return requestsPrioridad;
        return requestsPrioridad.filter(r => r.domain === criticalDomainFilter);
    }, [requestsPrioridad, criticalDomainFilter]);

    // Footer aggregations
    const totalFooterStatus = useMemo(() => {
        if (footerStatusFilter === 'Todos') return requests.length;
        return requests.filter(r => r.status === footerStatusFilter).length;
    }, [requests, footerStatusFilter]);

    const totalFooterDomain = useMemo(() => {
        if (footerDomainFilter === 'Todos') return requests.length;
        return requests.filter(r => r.domain === footerDomainFilter).length;
    }, [requests, footerDomainFilter]);

    return (
        <div className="space-y-6 overflow-y-auto h-full pr-2 pb-8">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Reportes de Portafolio</h2>
                    <p className="text-sm text-slate-500">Métricas principales de las iniciativas de TI.</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* 1. Dirección */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col h-[350px]">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">1. Iniciativas por Dirección</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dataDireccion} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} width={120} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                                    <LabelList dataKey="count" position="right" style={{ fontSize: '10px', fill: '#64748b', fontWeight: 600 }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Estado */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col h-[350px]">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">2. Iniciativas por Estado</h3>
                        <select
                            className="text-xs border border-slate-300 rounded px-2 py-1 bg-slate-50 outline-none"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="Todos">Todos los Estados</option>
                            {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 w-full min-h-0 relative">
                        {dataEstado.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">Sin datos</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={dataEstado} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="count" nameKey="name" label={({ name, value }) => `${name} (${value})`} labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }} style={{ fontSize: '10px', fontWeight: 500 }}>
                                        {dataEstado.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* 3. Dominio */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col h-[350px]">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">3. Iniciativas por Dominio</h3>
                        <select
                            className="text-xs border border-slate-300 rounded px-2 py-1 bg-slate-50 outline-none max-w-[150px] truncate"
                            value={domainFilter}
                            onChange={(e) => setDomainFilter(e.target.value)}
                        >
                            <option value="Todos">Todos los Dominios</option>
                            {allDomains.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 w-full min-h-0 relative">
                        {dataDominio.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">Sin datos</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dataDominio} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24}>
                                        <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fill: '#64748b', fontWeight: 600 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* 4. Alta/Muy Alta */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col h-[350px]">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide leading-tight">
                            4. Detalle Iniciativas Críticas<br /><span className="text-[10px] text-slate-400 normal-case">(Prioridad Alta/Muy Alta | En ejecución/Pendiente)</span>
                        </h3>
                        <div className="flex flex-col items-end gap-2">
                            <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-100">{filteredRequestsPrioridad.length} detectadas</span>
                            {criticalDomains.length > 0 && (
                                <select
                                    className="text-[10px] border border-slate-300 rounded px-1.5 py-0.5 bg-slate-50 outline-none max-w-[120px] truncate"
                                    value={criticalDomainFilter}
                                    onChange={(e) => setCriticalDomainFilter(e.target.value)}
                                >
                                    <option value="Todos">Todos los dominios</option>
                                    {criticalDomains.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-0 overflow-y-auto pr-2 scrollbar-thin">
                        {filteredRequestsPrioridad.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-slate-400">No hay iniciativas con esta prioridad y estado.</div>
                        ) : (
                            <div className="space-y-3">
                                {filteredRequestsPrioridad.map(req => (
                                    <div key={req.id} className="p-3 border border-slate-200 rounded-lg shrink-0 flex flex-col gap-1.5 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-xs font-medium text-slate-800 line-clamp-2">{req.title}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${req.urgency === 'Crítica' || req.urgency === 'Muy Alta' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{req.urgency}</span>
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{req.status}</span>
                                            <span className="text-[10px] text-slate-400 ml-auto truncate max-w-[120px]" title={req.domain}>{req.domain}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="text-slate-500 text-xs font-medium uppercase mb-2">Total de Iniciativas (Global)</div>
                    <div className="text-3xl font-bold text-blue-600">{requests.length}</div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex flex-col mb-3">
                        <div className="text-slate-500 text-xs font-medium uppercase mb-2">Total por Estado</div>
                        <div className="flex flex-wrap gap-1">
                            <button
                                onClick={() => setFooterStatusFilter('Todos')}
                                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors border ${footerStatusFilter === 'Todos' ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                            >
                                Todos
                            </button>
                            {allStatuses.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFooterStatusFilter(s)}
                                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors border ${footerStatusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{totalFooterStatus}</div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-slate-500 text-xs font-medium uppercase">Total por Dominio</div>
                        <select
                            className="text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-slate-50 outline-none max-w-[100px] truncate"
                            value={footerDomainFilter}
                            onChange={(e) => setFooterDomainFilter(e.target.value)}
                        >
                            <option value="Todos">Todos</option>
                            {allDomains.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="text-3xl font-bold text-slate-800">{totalFooterDomain}</div>
                </div>
            </div>
        </div>
    );
};