import React, { useState } from 'react';
import { ITRequest, Status, Priority } from '../../types';
import { MOCK_USERS } from '../../data/constants';
import { Calendar, User, AlertCircle, CheckCircle2, Clock, Code, TestTube } from 'lucide-react';

interface KanbanBoardProps {
    requests: ITRequest[];
    onEdit: (request: ITRequest) => void;
    onStatusChange: (requestId: string, newStatus: Status) => void;
}

const getPriorityColor = (priority: Priority) => {
    switch (priority) {
        case Priority.Critical: return 'bg-red-100 text-red-700 border-red-200';
        case Priority.High: return 'bg-orange-100 text-orange-700 border-orange-200';
        case Priority.Medium: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case Priority.Low: return 'bg-green-100 text-green-700 border-green-200';
        default: return 'bg-slate-100 text-slate-600';
    }
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ requests, onEdit, onStatusChange }) => {
    const columns = Object.values(Status);
    const [dragOverColumn, setDragOverColumn] = useState<Status | null>(null);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDragEnter = (status: Status) => {
        setDragOverColumn(status);
    };

    const handleDragLeave = () => {
        // setDragOverColumn(null);
    };

    const handleDrop = (e: React.DragEvent, status: Status) => {
        e.preventDefault();
        setDragOverColumn(null);
        const id = e.dataTransfer.getData('text/plain');
        if (id) {
            onStatusChange(id, status);
        }
    };

    return (
        <div className="flex h-full gap-4 overflow-x-auto pb-4">
            {columns.map((status) => {
                const columnRequests = requests.filter(r => r.status === status);
                const isDragOver = dragOverColumn === status;

                return (
                    <div
                        key={status}
                        className={`min-w-[300px] flex-1 flex flex-col rounded-xl border transition-colors duration-200
                            ${isDragOver ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-slate-100/50 border-slate-200'}
                        `}
                        onDragOver={handleDragOver}
                        onDragEnter={() => handleDragEnter(status)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, status)}
                    >
                        <div className={`p-3 border-b rounded-t-xl flex justify-between items-center sticky top-0
                            ${isDragOver ? 'bg-blue-100 border-blue-200' : 'bg-slate-50 border-slate-200'}
                        `}>
                            <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${status === Status.Closed ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                                {status}
                            </h3>
                            <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                {columnRequests.length}
                            </span>
                        </div>

                        <div className="p-2 flex-1 overflow-y-auto space-y-2 max-h-[calc(100vh-220px)]">
                            {columnRequests.map((req) => {
                                const assignee = MOCK_USERS.find(u => u.id === req.assigneeId);

                                return (
                                    <div
                                        key={req.id}
                                        onClick={() => onEdit(req)}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, req.id)}
                                        className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group active:rotate-1"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-mono text-slate-400">{req.id}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${getPriorityColor(req.priority)}`}>
                                                {req.priority}
                                            </span>
                                        </div>

                                        <h4 className="text-sm font-semibold text-slate-800 mb-1 leading-snug group-hover:text-blue-600 select-none">
                                            {req.title}
                                        </h4>

                                        <p className="text-xs text-slate-500 line-clamp-2 mb-3 select-none">
                                            {req.description}
                                        </p>

                                        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-50 pt-2">
                                            <div className="flex items-center gap-1.5" title="Domain">
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium select-none">
                                                    {req.domain}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {req.externalId && (
                                                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1 rounded select-none" title={`Linked to ${req.externalId}`}>Linked</span>
                                                )}
                                                {assignee ? (
                                                    <img src={assignee.avatarUrl} alt={assignee.name} className="w-5 h-5 rounded-full select-none" title={assignee.name} />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-500 select-none">?</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};