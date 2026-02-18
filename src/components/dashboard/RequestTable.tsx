import React from 'react';
import { ITRequest, CatalogoItem } from '../../types';
import { MoreHorizontal } from 'lucide-react';

interface RequestTableProps {
    requests: ITRequest[];
    onEdit: (request: ITRequest) => void;
    catalogosPrioridad?: CatalogoItem[];
}

const PriorityBadge: React.FC<{ priority: string; catalogos?: CatalogoItem[] }> = ({ priority, catalogos }) => {
    const cat = catalogos?.find(c => c.valor === priority && c.esta_activo);
    const color = cat?.color;

    if (color) {
        // Color dinámico desde catálogo
        return (
            <span
                className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold"
                style={{
                    backgroundColor: `${color}20`,   // 12% opacity background
                    color: color,
                    boxShadow: `inset 0 0 0 1px ${color}40`,
                }}
            >
                {priority}
            </span>
        );
    }

    // Fallback: colores hardcodeados por nombre
    const fallbackMap: Record<string, string> = {
        'Crítica': '#ef4444',
        'Alta': '#f97316',
        'Media': '#eab308',
        'Baja': '#22c55e',
    };
    const fallback = fallbackMap[priority] || '#94a3b8';
    return (
        <span
            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold"
            style={{
                backgroundColor: `${fallback}20`,
                color: fallback,
                boxShadow: `inset 0 0 0 1px ${fallback}40`,
            }}
        >
            {priority}
        </span>
    );
};

export const RequestTable: React.FC<RequestTableProps> = ({ requests, onEdit, catalogosPrioridad }) => {
    return (
        <div className="flow-root overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg h-full flex flex-col">
            <div className="overflow-x-auto flex-1">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">ID</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Título</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Dominio TI</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tipo</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Estado</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Prioridad del Negocio</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Solicitante</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Asignado</th>
                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                <span className="sr-only">Editar</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onEdit(req)}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-mono text-gray-500 sm:pl-6">{req.id}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                                    <div className="truncate max-w-xs" title={req.title}>{req.title}</div>
                                    {req.externalId && <span className="text-[10px] text-indigo-500">🔗 {req.externalId}</span>}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{req.domain}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{req.type}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                        {req.status}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    <PriorityBadge priority={req.priority} catalogos={catalogosPrioridad} />
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{req.requester}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    {req.assigneeId ? (
                                        <span className="text-xs text-slate-700">{req.assigneeId}</span>
                                    ) : (
                                        <span className="text-gray-400 italic">Sin asignar</span>
                                    )}
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                    <button className="text-gray-400 hover:text-gray-600" onClick={e => { e.stopPropagation(); onEdit(req); }}>
                                        <MoreHorizontal size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};