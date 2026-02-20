import React from 'react';
import { ITRequest, Urgency, Status, RequestType } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download } from 'lucide-react';

interface ReportsProps {
    requests: ITRequest[];
}

export const Reports: React.FC<ReportsProps> = ({ requests }) => {
    const statusData = Object.values(Status).map(status => ({
        name: status,
        value: requests.filter(r => r.status === status).length
    }));

    const typeData = Object.values(RequestType).map(type => ({
        name: type,
        count: requests.filter(r => r.type === type).length
    }));

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="space-y-6 overflow-y-auto h-full pr-2">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Análisis de Rendimiento</h2>
                    <p className="text-sm text-slate-500">Información en tiempo real sobre la salud del portafolio.</p>
                </div>
                <button className="flex items-center gap-2 text-sm border border-slate-300 px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700">
                    <Download size={16} /> Exportar PDF
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-[400px] flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">Distribución por Estado</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-[400px] flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">Volumen por Tipo de Solicitud</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={typeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-xs font-medium uppercase">Total Solicitudes</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{requests.length}</div>
                    <div className="text-xs text-green-600 mt-2">↑ 12% vs mes anterior</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-xs font-medium uppercase">Tiempo Promedio Resolución</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">4.2 Días</div>
                    <div className="text-xs text-red-600 mt-2">↑ 0.5 días más lento</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-xs font-medium uppercase">Críticas Abiertas</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{requests.filter(r => r.urgency === 'Crítica').length}</div>
                    <div className="text-xs text-slate-400 mt-2">Requiere atención inmediata</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <div className="text-slate-500 text-xs font-medium uppercase">Riesgo SLA</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">3</div>
                    <div className="text-xs text-orange-600 mt-2">Acción requerida</div>
                </div>
            </div>
        </div>
    );
};