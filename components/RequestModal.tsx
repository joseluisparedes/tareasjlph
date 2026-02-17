import React, { useState, useEffect } from 'react';
import { ITRequest, Priority, RequestType, Status, CatalogItem } from '../types';
import { MOCK_USERS } from '../constants';
import { X, Save, Trash2, Calendar } from 'lucide-react';

interface RequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: ITRequest | null;
    onSave: (req: ITRequest) => void;
    domains: CatalogItem[];
}

export const RequestModal: React.FC<RequestModalProps> = ({ isOpen, onClose, request, onSave, domains }) => {
    const [formData, setFormData] = useState<Partial<ITRequest>>({});

    useEffect(() => {
        if (request) {
            setFormData({ ...request });
        } else {
            setFormData({
                title: '',
                description: '',
                type: RequestType.BAU,
                domain: domains.find(d => d.isActive)?.name || '',
                priority: Priority.Medium,
                status: Status.Pending,
                requester: '',
                assigneeId: null,
            });
        }
    }, [request, isOpen, domains]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newRequest = {
            ...formData,
            id: formData.id || `BRM-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
            createdAt: formData.createdAt || new Date().toISOString(),
        } as ITRequest;
        onSave(newRequest);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <form onSubmit={handleSubmit}>
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div className="flex justify-between items-start mb-5 pb-2 border-b border-gray-100">
                                <div>
                                    <h3 className="text-lg leading-6 font-semibold text-gray-900" id="modal-title">
                                        {request ? `Editar Solicitud: ${request.id}` : 'Nueva Solicitud TI'}
                                    </h3>
                                    {request?.externalId && <p className="text-xs text-indigo-600 mt-1">Vinculado a {request.externalId}</p>}
                                </div>
                                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500 focus:outline-none">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-6 gap-6">
                                <div className="col-span-6">
                                    <label className="block text-sm font-medium text-gray-700">Título <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        required
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white text-gray-900"
                                        value={formData.title || ''}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                    />
                                </div>

                                <div className="col-span-6">
                                    <label className="block text-sm font-medium text-gray-700">Descripción</label>
                                    <textarea 
                                        rows={3}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white text-gray-900"
                                        value={formData.description || ''}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>

                                <div className="col-span-6 sm:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700">Dominio</label>
                                    <select 
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white text-gray-900"
                                        value={formData.domain}
                                        onChange={e => setFormData({...formData, domain: e.target.value})}
                                    >
                                        {domains.filter(d => d.isActive).map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-6 sm:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700">Tipo</label>
                                    <select 
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white text-gray-900"
                                        value={formData.type}
                                        onChange={e => setFormData({...formData, type: e.target.value as RequestType})}
                                    >
                                        {Object.values(RequestType).map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-6 sm:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700">Prioridad</label>
                                    <select 
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white text-gray-900"
                                        value={formData.priority}
                                        onChange={e => setFormData({...formData, priority: e.target.value as Priority})}
                                    >
                                        {Object.values(Priority).map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-6 sm:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700">Estado</label>
                                    <select 
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white text-gray-900"
                                        value={formData.status}
                                        onChange={e => setFormData({...formData, status: e.target.value as Status})}
                                    >
                                        {Object.values(Status).map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-6 sm:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700">Solicitante</label>
                                    <input 
                                        type="text" 
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white text-gray-900"
                                        value={formData.requester || ''}
                                        onChange={e => setFormData({...formData, requester: e.target.value})}
                                        placeholder="e.j. Dpto Ventas"
                                    />
                                </div>

                                <div className="col-span-6 sm:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700">Asignado a</label>
                                    <select 
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 bg-white text-gray-900"
                                        value={formData.assigneeId || ''}
                                        onChange={e => setFormData({...formData, assigneeId: e.target.value || null})}
                                    >
                                        <option value="">Sin asignar</option>
                                        {MOCK_USERS.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                            <button 
                                type="submit" 
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm flex items-center gap-2"
                            >
                                <Save size={16} /> Guardar Solicitud
                            </button>
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};