import React from 'react';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

export const Integrations: React.FC = () => {
    return (
        <div className="space-y-6">
             <div className="border-b border-slate-200 pb-4">
                <h2 className="text-xl font-bold text-slate-800">Integraciones Externas</h2>
                <p className="text-sm text-slate-500 mt-1">Gestiona conexiones con herramientas ITSM (ServiceNow, Jira).</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* ServiceNow Card */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-900 rounded-lg flex items-center justify-center text-white font-bold text-xs">NOW</div>
                        <div>
                            <h3 className="font-semibold text-lg">ServiceNow</h3>
                            <p className="text-sm text-slate-500">Sincronizar Incidentes y Solicitudes</p>
                            <div className="flex items-center gap-2 mt-1">
                                <CheckCircle2 size={14} className="text-green-500" />
                                <span className="text-xs text-green-600 font-medium">Conectado</span>
                                <span className="text-xs text-slate-400">| Última sinc: hace 10 min</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium hover:bg-slate-50">Configuración</button>
                        <button className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 flex items-center gap-2">
                            <RefreshCw size={14} /> Sincronizar Ahora
                        </button>
                    </div>
                </div>

                {/* Jira Card */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">JIRA</div>
                        <div>
                            <h3 className="font-semibold text-lg">Atlassian Jira</h3>
                            <p className="text-sm text-slate-500">Sincronizar Tareas de Ingeniería (No BAU)</p>
                            <div className="flex items-center gap-2 mt-1">
                                <XCircle size={14} className="text-red-500" />
                                <span className="text-xs text-red-600 font-medium">Desconectado</span>
                                <span className="text-xs text-slate-400">| Token API Inválido</span>
                            </div>
                        </div>
                    </div>
                     <div className="flex gap-2">
                        <button className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50">Reconectar</button>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-sm">
                <h4 className="font-semibold mb-2">Registro de Sincronización</h4>
                <div className="font-mono text-xs text-slate-500 space-y-1">
                    <p>[2025-02-15 10:00:01] Iniciando auto-sincronización con ServiceNow...</p>
                    <p>[2025-02-15 10:00:03] 2 nuevos incidentes importados.</p>
                    <p>[2025-02-15 10:00:03] Estado actualizado para BRM-2025-0001.</p>
                    <p className="text-green-600">[2025-02-15 10:00:04] Sincronización completada exitosamente.</p>
                </div>
            </div>
        </div>
    );
};