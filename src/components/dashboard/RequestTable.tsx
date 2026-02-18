import React from 'react';
import { ITRequest, Priority } from '../../types';
import { MoreHorizontal } from 'lucide-react';
import { MOCK_USERS } from '../../data/constants';

interface RequestTableProps {
    requests: ITRequest[];
    onEdit: (request: ITRequest) => void;
}

const getPriorityBadge = (priority: Priority) => {
    let classes = '';
    switch (priority) {
        case Priority.Critical: classes = 'bg-red-50 text-red-700 ring-red-600/20'; break;
        case Priority.High: classes = 'bg-orange-50 text-orange-700 ring-orange-600/20'; break;
        case Priority.Medium: classes = 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'; break;
        case Priority.Low: classes = 'bg-green-50 text-green-700 ring-green-600/20'; break;
    }
    return (
        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${classes}`}>
            {priority}
        </span>
    );
};

export const RequestTable: React.FC<RequestTableProps> = ({ requests, onEdit }) => {
    return (
        <div className="flow-root overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-lg h-full flex flex-col">
            <div className="overflow-x-auto flex-1">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">ID</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Título</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Dominio</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tipo</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Estado</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Prioridad</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Solicitante</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Asignado</th>
                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                <span className="sr-only">Editar</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {requests.map((req) => {
                            const assignee = MOCK_USERS.find(u => u.id === req.assigneeId);
                            return (
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
                                        {getPriorityBadge(req.priority)}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{req.requester}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {assignee ? (
                                            <div className="flex items-center gap-2">
                                                <img src={assignee.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
                                                <span className="text-xs">{assignee.name.split(' ')[0]}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 italic">Sin asignar</span>
                                        )}
                                    </td>
                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                        <button className="text-gray-400 hover:text-gray-600">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};